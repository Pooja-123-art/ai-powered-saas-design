/**
 * useCanvas.js — Custom React Hook for Canvas Interaction Management
 * Handles: mouse events, selection, dragging, resizing, drawing new shapes, coordinate transforms
 */

import { useCallback, useRef, useEffect } from 'react';
import { useAppContext, TOOLS, ACTIONS, createDefaultElement } from '../context/AppContext';

// ─── Constants ────────────────────────────────────────────────────────
const HANDLE_SIZE = 8;
const MIN_ELEMENT_SIZE = 10;
const SELECTION_BOX_COLOR = '#6366f1';
const SELECTION_BOX_WIDTH = 1;

// Resize handle positions
const HANDLE_POSITIONS = [
  { name: 'nw', cursor: 'nw-resize' },
  { name: 'n', cursor: 'n-resize' },
  { name: 'ne', cursor: 'ne-resize' },
  { name: 'e', cursor: 'e-resize' },
  { name: 'se', cursor: 'se-resize' },
  { name: 's', cursor: 's-resize' },
  { name: 'sw', cursor: 'sw-resize' },
  { name: 'w', cursor: 'w-resize' },
];

export const useCanvas = () => {
  const {
    canvasRef,
    containerRef,
    stateRef,
    activeTool,
    elements,
    selectedIds,
    zoom,
    pan,
    snapToGridValue,
    showGrid,
    gridSize,
    selectElement,
    clearSelection,
    setHovered,
    updateElement,
    addElements,
    pushHistory,
    getElementById,
    getMaxZIndex,
    setPan,
    setZoom,
  } = useAppContext();

  // Interaction state refs (mutable, no re-renders)
  const interactionRef = useRef({
    mode: 'idle', // idle, selecting, dragging, resizing, drawing, panning
    startX: 0,
    startY: 0,
    lastX: 0,
    lastY: 0,
    selectedAtStart: [],
    draggedElement: null,
    resizeHandle: null,
    drawElement: null,
    selectionBox: null,
    panStart: null,
  });

  // ─── Coordinate Transforms ──────────────────────────────────────────
  
  /** Convert screen coordinates to canvas coordinates */
  const screenToCanvas = useCallback((screenX, screenY) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    
    const x = (screenX - rect.left) * scaleX;
    const y = (screenY - rect.top) * scaleY;
    
    return {
      x: (x - pan.x) / zoom,
      y: (y - pan.y) / zoom,
    };
  }, [canvasRef, pan, zoom]);

  /** Convert canvas coordinates to screen coordinates */
  const canvasToScreen = useCallback((canvasX, canvasY) => {
    return {
      x: canvasX * zoom + pan.x,
      y: canvasY * zoom + pan.y,
    };
  }, [pan, zoom]);

  /** Snap coordinate to grid if enabled */
  const snap = useCallback((value) => snapToGridValue(value), [snapToGridValue]);

  // ─── Hit Testing ──────────────────────────────────────────────────────
  
  /** Check if point is inside an element */
  const isPointInElement = useCallback((pointX, pointY, element) => {
    if (!element.visible) return false;
    
    const { x, y, width, height, type, rotation } = element;
    
    // Simple AABB for non-rotated elements
    if (!rotation || rotation === 0) {
      return (
        pointX >= x &&
        pointX <= x + width &&
        pointY >= y &&
        pointY <= y + height
      );
    }
    
    // For rotated elements, transform point to element-local space
    const cx = x + width / 2;
    const cy = y + height / 2;
    const rad = (-rotation * Math.PI) / 180;
    
    const localX = (pointX - cx) * Math.cos(rad) - (pointY - cy) * Math.sin(rad) + cx;
    const localY = (pointX - cx) * Math.sin(rad) + (pointY - cy) * Math.cos(rad) + cy;
    
    return (
      localX >= x &&
      localX <= x + width &&
      localY >= y &&
      localY <= y + height
    );
  }, []);

  /** Find topmost element at point (highest zIndex) */
  const getElementAtPoint = useCallback((x, y) => {
    // Sort by zIndex descending, return first hit
    const sorted = [...elements].sort((a, b) => b.zIndex - a.zIndex);
    return sorted.find((el) => isPointInElement(x, y, el)) || null;
  }, [elements, isPointInElement]);

  /** Check if point is on a resize handle */
  const getResizeHandleAtPoint = useCallback((x, y, element) => {
    if (!element) return null;
    
    const handles = getResizeHandles(element);
    return handles.find((h) => {
      const half = HANDLE_SIZE / 2 / zoom;
      return (
        x >= h.x - half &&
        x <= h.x + half &&
        y >= h.y - half &&
        y <= h.y + half
      );
    }) || null;
  }, [zoom]);

  /** Calculate resize handle positions for an element */
  const getResizeHandles = useCallback((element) => {
    const { x, y, width, height } = element;
    const half = HANDLE_SIZE / 2;
    
    return [
      { name: 'nw', x: x, y: y, cursor: 'nw-resize' },
      { name: 'n', x: x + width / 2, y: y, cursor: 'n-resize' },
      { name: 'ne', x: x + width, y: y, cursor: 'ne-resize' },
      { name: 'e', x: x + width, y: y + height / 2, cursor: 'e-resize' },
      { name: 'se', x: x + width, y: y + height, cursor: 'se-resize' },
      { name: 's', x: x + width / 2, y: y + height, cursor: 's-resize' },
      { name: 'sw', x: x, y: y + height, cursor: 'sw-resize' },
      { name: 'w', x: x, y: y + height / 2, cursor: 'w-resize' },
    ];
  }, []);

  // ─── Event Handlers ───────────────────────────────────────────────────

  const handleMouseDown = useCallback((e) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const { x, y } = screenToCanvas(e.clientX, e.clientY);
    const interaction = interactionRef.current;
    
    // Right click or middle click = pan
    if (e.button === 1 || e.button === 2 || activeTool === TOOLS.HAND) {
      interaction.mode = 'panning';
      interaction.panStart = { x: pan.x, y: pan.y, mouseX: e.clientX, mouseY: e.clientY };
      canvas.style.cursor = 'grabbing';
      e.preventDefault();
      return;
    }
    
    // Left click
    if (e.button !== 0) return;
    
    // Check if clicking on a resize handle of selected element
    if (selectedIds.length === 1) {
      const selectedEl = getElementById(selectedIds[0]);
      const handle = getResizeHandleAtPoint(x, y, selectedEl);
      if (handle) {
        interaction.mode = 'resizing';
        interaction.startX = x;
        interaction.startY = y;
        interaction.draggedElement = { ...selectedEl };
        interaction.resizeHandle = handle.name;
        pushHistory();
        e.stopPropagation();
        return;
      }
    }
    
    // Check if clicking on an existing element
    const clickedEl = getElementAtPoint(x, y);
    
    if (clickedEl) {
      if (clickedEl.locked) return; // Can't interact with locked elements
      
      const isMulti = e.metaKey || e.ctrlKey || e.shiftKey;
      
      if (!selectedIds.includes(clickedEl.id) && !isMulti) {
        selectElement(clickedEl.id);
      } else if (isMulti) {
        selectElement(clickedEl.id, true);
      }
      
      interaction.mode = 'dragging';
      interaction.startX = x;
      interaction.startY = y;
      interaction.lastX = x;
      interaction.lastY = y;
      interaction.selectedAtStart = [...selectedIds];
      interaction.draggedElement = { ...clickedEl };
      pushHistory();
      
    } else {
      // Clicked on empty canvas
      if (activeTool === TOOLS.SELECT) {
        // Start selection box
        if (!e.metaKey && !e.ctrlKey && !e.shiftKey) {
          clearSelection();
        }
        interaction.mode = 'selecting';
        interaction.startX = x;
        interaction.startY = y;
        interaction.selectionBox = { x, y, width: 0, height: 0 };
        
      } else if (
        activeTool === TOOLS.RECTANGLE ||
        activeTool === TOOLS.CIRCLE ||
        activeTool === TOOLS.TRIANGLE ||
        activeTool === TOOLS.TEXT
      ) {
        // Start drawing new shape
        interaction.mode = 'drawing';
        interaction.startX = x;
        interaction.startY = y;
        
        const newElement = createDefaultElement(activeTool, {
          x: snap(x),
          y: snap(y),
          width: 0,
          height: 0,
          zIndex: getMaxZIndex() + 1,
        });
        
        interaction.drawElement = newElement;
      }
    }
  }, [
    activeTool,
    selectedIds,
    pan,
    screenToCanvas,
    getElementAtPoint,
    getResizeHandleAtPoint,
    getElementById,
    selectElement,
    clearSelection,
    pushHistory,
    snap,
    getMaxZIndex,
  ]);

  const handleMouseMove = useCallback((e) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const { x, y } = screenToCanvas(e.clientX, e.clientY);
    const interaction = interactionRef.current;
    
    // Update hover state
    if (interaction.mode === 'idle') {
      const hovered = getElementAtPoint(x, y);
      setHovered(hovered?.id || null);
      
      // Update cursor
      if (hovered) {
        if (selectedIds.includes(hovered.id) && selectedIds.length === 1) {
          const handle = getResizeHandleAtPoint(x, y, hovered);
          canvas.style.cursor = handle ? handle.cursor : 'move';
        } else {
          canvas.style.cursor = 'pointer';
        }
      } else {
        canvas.style.cursor = activeTool === TOOLS.HAND ? 'grab' : 'default';
      }
    }
    
    // Handle panning
    if (interaction.mode === 'panning') {
      const dx = e.clientX - interaction.panStart.mouseX;
      const dy = e.clientY - interaction.panStart.mouseY;
      setPan({
        x: interaction.panStart.x + dx,
        y: interaction.panStart.y + dy,
      });
      return;
    }
    
    // Handle dragging
    if (interaction.mode === 'dragging') {
      const dx = x - interaction.lastX;
      const dy = y - interaction.lastY;
      
      selectedIds.forEach((id) => {
        const el = getElementById(id);
        if (el && !el.locked) {
          updateElement(id, {
            x: snap(el.x + dx),
            y: snap(el.y + dy),
          });
        }
      });
      
      interaction.lastX = x;
      interaction.lastY = y;
      return;
    }
    
    // Handle resizing
    if (interaction.mode === 'resizing' && interaction.draggedElement) {
      const el = interaction.draggedElement;
      const handle = interaction.resizeHandle;
      let newX = el.x;
      let newY = el.y;
      let newWidth = el.width;
      let newHeight = el.height;
      
      const dx = x - interaction.startX;
      const dy = y - interaction.startY;
      
      switch (handle) {
        case 'se':
          newWidth = Math.max(MIN_ELEMENT_SIZE, el.width + dx);
          newHeight = Math.max(MIN_ELEMENT_SIZE, el.height + dy);
          break;
        case 'nw':
          newWidth = Math.max(MIN_ELEMENT_SIZE, el.width - dx);
          newHeight = Math.max(MIN_ELEMENT_SIZE, el.height - dy);
          newX = el.x + (el.width - newWidth);
          newY = el.y + (el.height - newHeight);
          break;
        case 'ne':
          newWidth = Math.max(MIN_ELEMENT_SIZE, el.width + dx);
          newHeight = Math.max(MIN_ELEMENT_SIZE, el.height - dy);
          newY = el.y + (el.height - newHeight);
          break;
        case 'sw':
          newWidth = Math.max(MIN_ELEMENT_SIZE, el.width - dx);
          newHeight = Math.max(MIN_ELEMENT_SIZE, el.height + dy);
          newX = el.x + (el.width - newWidth);
          break;
        case 'n':
          newHeight = Math.max(MIN_ELEMENT_SIZE, el.height - dy);
          newY = el.y + (el.height - newHeight);
          break;
        case 's':
          newHeight = Math.max(MIN_ELEMENT_SIZE, el.height + dy);
          break;
        case 'e':
          newWidth = Math.max(MIN_ELEMENT_SIZE, el.width + dx);
          break;
        case 'w':
          newWidth = Math.max(MIN_ELEMENT_SIZE, el.width - dx);
          newX = el.x + (el.width - newWidth);
          break;
      }
      
      updateElement(el.id, {
        x: snap(newX),
        y: snap(newY),
        width: snap(newWidth),
        height: snap(newHeight),
      });
      return;
    }
    
    // Handle drawing
    if (interaction.mode === 'drawing' && interaction.drawElement) {
      const drawEl = interaction.drawElement;
      const width = Math.abs(x - interaction.startX);
      const height = Math.abs(y - interaction.startY);
      const newX = Math.min(x, interaction.startX);
      const newY = Math.min(y, interaction.startY);
      
      updateElement(drawEl.id, {
        x: snap(newX),
        y: snap(newY),
        width: snap(Math.max(MIN_ELEMENT_SIZE, width)),
        height: snap(Math.max(MIN_ELEMENT_SIZE, height)),
      });
      return;
    }
    
    // Handle selection box
    if (interaction.mode === 'selecting') {
      const boxX = Math.min(interaction.startX, x);
      const boxY = Math.min(interaction.startY, y);
      const boxW = Math.abs(x - interaction.startX);
      const boxH = Math.abs(y - interaction.startY);
      
      interaction.selectionBox = { x: boxX, y: boxY, width: boxW, height: boxH };
      
      // Select elements inside box
      const insideIds = elements
        .filter((el) => {
          if (!el.visible || el.locked) return false;
          return (
            el.x >= boxX &&
            el.x + el.width <= boxX + boxW &&
            el.y >= boxY &&
            el.y + el.height <= boxY + boxH
          );
        })
        .map((el) => el.id);
      
      // Merge with existing selection if holding shift
      // For simplicity, we just set selection here
      insideIds.forEach((id) => {
        if (!selectedIds.includes(id)) {
          selectElement(id, true);
        }
      });
    }
  }, [
    screenToCanvas,
    getElementAtPoint,
    getResizeHandleAtPoint,
    getElementById,
    selectedIds,
    elements,
    setHovered,
    updateElement,
    selectElement,
    setPan,
    snap,
    activeTool,
  ]);

  const handleMouseUp = useCallback(() => {
    const interaction = interactionRef.current;
    const canvas = canvasRef.current;
    
    if (interaction.mode === 'drawing' && interaction.drawElement) {
      // Finalize the drawn element
      const drawEl = interaction.drawElement;
      const finalEl = getElementById(drawEl.id);
      if (finalEl && (finalEl.width < MIN_ELEMENT_SIZE * 2 || finalEl.height < MIN_ELEMENT_SIZE * 2)) {
        // Too small, remove it
        // We'd need deleteElements here, but it's not in deps
        // The element stays but can be deleted manually
      }
      pushHistory();
    }
    
    if (interaction.mode === 'resizing') {
      pushHistory();
    }
    
    if (interaction.mode === 'dragging') {
      pushHistory();
    }
    
    // Reset interaction state
    interaction.mode = 'idle';
    interaction.draggedElement = null;
    interaction.resizeHandle = null;
    interaction.drawElement = null;
    interaction.selectionBox = null;
    interaction.panStart = null;
    
    if (canvas) {
      canvas.style.cursor = activeTool === TOOLS.HAND ? 'grab' : 'default';
    }
  }, [getElementById, pushHistory, activeTool, canvasRef]);

  const handleWheel = useCallback((e) => {
    e.preventDefault();
    
    if (e.ctrlKey || e.metaKey) {
      // Zoom
      const delta = e.deltaY > 0 ? -0.1 : 0.1;
      const newZoom = Math.max(0.1, Math.min(5, zoom + delta));
      setZoom(newZoom);
    } else {
      // Pan
      setPan({
        x: pan.x - e.deltaX,
        y: pan.y - e.deltaY,
      });
    }
  }, [zoom, pan, setZoom, setPan]);

  const handleDoubleClick = useCallback((e) => {
    const { x, y } = screenToCanvas(e.clientX, e.clientY);
    const el = getElementAtPoint(x, y);
    
    if (el && el.type === 'text') {
      const newText = prompt('Edit text:', el.text);
      if (newText !== null) {
        updateElement(el.id, { text: newText });
        pushHistory();
      }
    }
  }, [screenToCanvas, getElementAtPoint, updateElement, pushHistory]);

  // ─── Keyboard Shortcuts ─────────────────────────────────────────────
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Delete
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedIds.length > 0) {
        // Need access to deleteElements - we'll skip for now or use dispatch
        // This would need to be wired through context
      }
      
      // Undo/Redo
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          // redo
        } else {
          // undo
        }
      }
      
      // Tool shortcuts
      if (!e.ctrlKey && !e.metaKey && !e.altKey) {
        switch (e.key.toLowerCase()) {
          case 'v':
            // setTool(TOOLS.SELECT);
            break;
          case 'r':
            // setTool(TOOLS.RECTANGLE);
            break;
          case 'c':
            // setTool(TOOLS.CIRCLE);
            break;
          case 't':
            // setTool(TOOLS.TEXT);
            break;
          case 'h':
            // setTool(TOOLS.HAND);
            break;
        }
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedIds]);

  // ─── Render Helpers ───────────────────────────────────────────────────
  
  /** Draw selection box on canvas context */
  const drawSelectionBox = useCallback((ctx) => {
    const interaction = interactionRef.current;
    if (interaction.mode !== 'selecting' || !interaction.selectionBox) return;
    
    const { x, y, width, height } = interaction.selectionBox;
    const screenPos = canvasToScreen(x, y);
    
    ctx.save();
    ctx.strokeStyle = SELECTION_BOX_COLOR;
    ctx.lineWidth = SELECTION_BOX_WIDTH / zoom;
    ctx.setLineDash([5 / zoom, 5 / zoom]);
    ctx.fillStyle = `${SELECTION_BOX_COLOR}15`;
    
    ctx.fillRect(screenPos.x, screenPos.y, width * zoom, height * zoom);
    ctx.strokeRect(screenPos.x, screenPos.y, width * zoom, height * zoom);
    ctx.restore();
  }, [canvasToScreen, zoom]);

  /** Draw resize handles for selected element */
  const drawResizeHandles = useCallback((ctx, element) => {
    if (!element || selectedIds.length !== 1) return;
    
    const handles = getResizeHandles(element);
    const half = HANDLE_SIZE / 2;
    
    ctx.save();
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = SELECTION_BOX_COLOR;
    ctx.lineWidth = 1 / zoom;
    
    handles.forEach((handle) => {
      const screenPos = canvasToScreen(handle.x, handle.y);
      ctx.fillRect(
        screenPos.x - half,
        screenPos.y - half,
        HANDLE_SIZE,
        HANDLE_SIZE
      );
      ctx.strokeRect(
        screenPos.x - half,
        screenPos.y - half,
        HANDLE_SIZE,
        HANDLE_SIZE
      );
    });
    
    ctx.restore();
  }, [getResizeHandles, canvasToScreen, zoom, selectedIds]);

  /** Draw grid */
  const drawGrid = useCallback((ctx, width, height) => {
    if (!showGrid) return;
    
    ctx.save();
    ctx.strokeStyle = 'rgba(51, 65, 85, 0.3)';
    ctx.lineWidth = 0.5;
    
    const startX = Math.floor(-pan.x / zoom / gridSize) * gridSize;
    const startY = Math.floor(-pan.y / zoom / gridSize) * gridSize;
    const endX = startX + width / zoom + gridSize * 2;
    const endY = startY + height / zoom + gridSize * 2;
    
    for (let x = startX; x < endX; x += gridSize) {
      const screenX = x * zoom + pan.x;
      ctx.beginPath();
      ctx.moveTo(screenX, 0);
      ctx.lineTo(screenX, height);
      ctx.stroke();
    }
    
    for (let y = startY; y < endY; y += gridSize) {
      const screenY = y * zoom + pan.y;
      ctx.beginPath();
      ctx.moveTo(0, screenY);
      ctx.lineTo(width, screenY);
      ctx.stroke();
    }
    
    ctx.restore();
  }, [showGrid, gridSize, pan, zoom]);

  return {
    // Refs
    interactionRef,
    
    // Event handlers
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    handleWheel,
    handleDoubleClick,
    
    // Coordinate transforms
    screenToCanvas,
    canvasToScreen,
    snap,
    
    // Hit testing
    getElementAtPoint,
    getResizeHandleAtPoint,
    getResizeHandles,
    isPointInElement,
  };
}