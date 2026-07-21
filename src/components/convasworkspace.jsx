/**
 * CanvasWorkspace.jsx — Interactive HTML5 Canvas Workspace
 * Dark-theme vector sandbox with grid, rulers, zoom/pan, and element rendering
 */

import React, { useRef, useEffect, useCallback, useState } from 'react';
import { motion } from 'framer-motion';
import { useAppContext, TOOLS } from '../context/AppContext';
import { useCanvas } from '../hooks/useCanvas';
import VectorElement from './VectorElement';

// ─── Ruler Component ────────────────────────────────────────────────────
const Ruler = ({ orientation, canvasSize, zoom, pan }) => {
  const marks = [];
  const size = orientation === 'horizontal' ? canvasSize.width : canvasSize.height;
  const step = 100;
  
  for (let i = 0; i <= size; i += step) {
    const pos = i * zoom + (orientation === 'horizontal' ? pan.x : pan.y);
    if (pos < 0) continue;
    
    marks.push(
      <div
        key={i}
        className="absolute text-[9px] text-slate-500 font-mono select-none"
        style={
          orientation === 'horizontal'
            ? { left: `${pos}px`, top: '2px', transform: 'translateX(-50%)' }
            : { top: `${pos}px`, left: '2px', transform: 'translateY(-50%) rotate(-90deg)' }
        }
      >
        {i}
      </div>
    );
  }
  
  return (
    <div
      className={`absolute bg-slate-900 border-slate-800 ${
        orientation === 'horizontal'
          ? 'h-6 left-6 right-0 top-0 border-b'
          : 'w-6 top-6 bottom-0 left-0 border-r'
      }`}
    >
      {marks}
    </div>
  );
};

// ─── Canvas Grid Background ───────────────────────────────────────────
const GridBackground = ({ zoom, pan, showGrid, gridSize }) => {
  if (!showGrid) return null;
  
  return (
    <div
      className="absolute inset-0 pointer-events-none"
      style={{
        backgroundImage: `
          linear-gradient(rgba(51, 65, 85, 0.2) 1px, transparent 1px),
          linear-gradient(90deg, rgba(51, 65, 85, 0.2) 1px, transparent 1px)
        `,
        backgroundSize: `${gridSize * zoom}px ${gridSize * zoom}px`,
        backgroundPosition: `${pan.x}px ${pan.y}px`,
      }}
    />
  );
};

// ─── Main CanvasWorkspace ───────────────────────────────────────────────

const CanvasWorkspace = () => {
  const {
    canvasRef,
    containerRef,
    elements,
    selectedIds,
    zoom,
    pan,
    canvasSize,
    showGrid,
    showRulers,
    snapToGrid,
    gridSize,
    activeTool,
    isGenerating,
    setPan,
    setZoom,
    clearSelection,
  } = useAppContext();

  const {
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    handleWheel,
    handleDoubleClick,
    screenToCanvas,
    drawSelectionBox,
    drawGrid,
  } = useCanvas();

  const [canvasDimensions, setCanvasDimensions] = useState({ width: 0, height: 0 });
  const animationFrameRef = useRef(null);

  // ─── Canvas Setup ─────────────────────────────────────────────────────
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        setCanvasDimensions({ width, height });
      }
    });

    resizeObserver.observe(container);
    return () => resizeObserver.disconnect();
  }, [containerRef]);

  // ─── Canvas Rendering Loop ────────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const { width, height } = canvasDimensions;
    
    canvas.width = width;
    canvas.height = height;

    const render = () => {
      // Clear canvas
      ctx.clearRect(0, 0, width, height);
      
      // Draw grid
      drawGrid(ctx, width, height);
      
      // Draw selection box
      drawSelectionBox(ctx);
      
      // Draw crosshair cursor position (optional)
      // ...
    };

    render();
  }, [canvasRef, canvasDimensions, drawGrid, drawSelectionBox]);

  // ─── Mouse Event Wiring ───────────────────────────────────────────────
  const onMouseDown = useCallback((e) => {
    if (e.button === 0 && activeTool === TOOLS.SELECT) {
      // Only clear selection if clicking on empty canvas
      const { x, y } = screenToCanvas(e.clientX, e.clientY);
      const clickedOnElement = elements.some((el) => {
        if (!el.visible || el.locked) return false;
        return (
          x >= el.x && x <= el.x + el.width &&
          y >= el.y && y <= el.y + el.height
        );
      });
      
      if (!clickedOnElement && !e.metaKey && !e.ctrlKey && !e.shiftKey) {
        clearSelection();
      }
    }
    
    handleMouseDown(e);
  }, [handleMouseDown, screenToCanvas, elements, activeTool, clearSelection]);

  const onMouseMove = useCallback((e) => {
    handleMouseMove(e);
  }, [handleMouseMove]);

  const onMouseUp = useCallback(() => {
    handleMouseUp();
  }, [handleMouseUp]);

  const onWheel = useCallback((e) => {
    handleWheel(e);
  }, [handleWheel]);

  const onDoubleClick = useCallback((e) => {
    handleDoubleClick(e);
  }, [handleDoubleClick]);

  // ─── Zoom to Fit ──────────────────────────────────────────────────────
  const zoomToFit = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;
    
    const containerWidth = container.clientWidth - (showRulers ? 48 : 0);
    const containerHeight = container.clientHeight - (showRulers ? 48 : 0);
    
    const scaleX = containerWidth / canvasSize.width;
    const scaleY = containerHeight / canvasSize.height;
    const newZoom = Math.min(scaleX, scaleY, 1) * 0.9;
    
    setZoom(newZoom);
    setPan({
      x: (containerWidth - canvasSize.width * newZoom) / 2 + (showRulers ? 24 : 0),
      y: (containerHeight - canvasSize.height * newZoom) / 2 + (showRulers ? 24 : 0),
    });
  }, [containerRef, canvasSize, showRulers, setZoom, setPan]);

  // ─── Canvas Content Transform ─────────────────────────────────────────
  const canvasTransform = {
    transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
    transformOrigin: '0 0',
    width: canvasSize.width,
    height: canvasSize.height,
  };

  return (
    <div
      ref={containerRef}
      className="flex-1 relative overflow-hidden bg-slate-950 select-none"
      style={{ cursor: activeTool === TOOLS.HAND ? 'grab' : 'default' }}
    >
      {/* Rulers */}
      {showRulers && (
        <>
          <Ruler orientation="horizontal" canvasSize={canvasSize} zoom={zoom} pan={pan} />
          <Ruler orientation="vertical" canvasSize={canvasSize} zoom={zoom} pan={pan} />
          {/* Corner square */}
          <div className="absolute top-0 left-0 w-6 h-6 bg-slate-900 border-r border-b border-slate-800 z-20" />
        </>
      )}

      {/* Canvas Container */}
      <div
        className={`absolute ${showRulers ? 'top-6 left-6 right-0 bottom-0' : 'inset-0'} overflow-hidden`}
      >
        {/* HTML5 Canvas for grid/selection overlays */}
        <canvas
          ref={canvasRef}
          className="absolute inset-0 z-10 pointer-events-none"
        />

        {/* Interactive Canvas Area */}
        <div
          className="absolute"
          style={canvasTransform}
          onMouseDown={onMouseDown}
          onMouseMove={onMouseMove}
          onMouseUp={onMouseUp}
          onMouseLeave={onMouseUp}
          onWheel={onWheel}
          onDoubleClick={onDoubleClick}
        >
          {/* Grid Background (CSS-based for performance) */}
          <GridBackground zoom={zoom} pan={{ x: 0, y: 0 }} showGrid={showGrid} gridSize={gridSize} />

          {/* Canvas Background */}
          <div
            className="absolute inset-0 rounded-lg"
            style={{
              backgroundColor: '#0f172a',
              boxShadow: '0 0 0 1px rgba(51, 65, 85, 0.5), 0 20px 60px rgba(0,0,0,0.5)',
            }}
          />

          {/* Vector Elements */}
          {elements
            .filter((el) => el.visible)
            .sort((a, b) => a.zIndex - b.zIndex)
            .map((element) => (
              <VectorElement key={element.id} element={element} />
            ))}

          {/* Empty State */}
          {elements.length === 0 && !isGenerating && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="absolute inset-0 flex flex-col items-center justify-center text-slate-600"
            >
              <div className="w-16 h-16 rounded-2xl bg-slate-800/50 border border-slate-700/50 flex items-center justify-center mb-4">
                <svg className="w-8 h-8 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
                </svg>
              </div>
              <p className="text-sm font-medium">Your canvas is empty</p>
              <p className="text-xs mt-1 opacity-60">Use the AI panel to generate a design</p>
            </motion.div>
          )}

          {/* Generating Overlay */}
          {isGenerating && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm flex flex-col items-center justify-center z-30"
            >
              <div className="relative">
                <div className="w-12 h-12 border-3 border-primary-500/20 border-t-primary-500 rounded-full animate-spin" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <SparklesIcon className="w-5 h-5 text-primary-400 animate-pulse" />
                </div>
              </div>
              <p className="mt-4 text-sm font-medium text-primary-400">Generating Design...</p>
              <p className="text-xs text-slate-500 mt-1">AI is parsing your prompt</p>
            </motion.div>
          )}
        </div>
      </div>

      {/* Zoom/Pan Controls Overlay */}
      <div className="absolute bottom-4 right-4 flex flex-col gap-2 z-30">
        <button
          onClick={zoomToFit}
          className="w-8 h-8 rounded-lg bg-slate-800/80 backdrop-blur border border-slate-700/50 text-slate-400 hover:text-white hover:bg-slate-700 flex items-center justify-center transition-all"
          title="Zoom to Fit"
        >
          <FitIcon className="w-4 h-4" />
        </button>
        <div className="flex flex-col rounded-lg bg-slate-800/80 backdrop-blur border border-slate-700/50 overflow-hidden">
          <button
            onClick={() => setZoom(zoom + 0.1)}
            className="w-8 h-8 text-slate-400 hover:text-white hover:bg-slate-700 flex items-center justify-center transition-all border-b border-slate-700/50"
          >
            <PlusIcon className="w-4 h-4" />
          </button>
          <button
            onClick={() => setZoom(zoom - 0.1)}
            className="w-8 h-8 text-slate-400 hover:text-white hover:bg-slate-700 flex items-center justify-center transition-all"
          >
            <MinusIcon className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Info Bar */}
      <div className="absolute bottom-4 left-4 flex items-center gap-4 px-3 py-1.5 rounded-lg bg-slate-800/80 backdrop-blur border border-slate-700/50 z-30">
        <span className="text-[10px] text-slate-400 font-mono">
          {canvasSize.width} × {canvasSize.height}px
        </span>
        <span className="text-[10px] text-slate-500">|</span>
        <span className="text-[10px] text-slate-400 font-mono">
          {Math.round(zoom * 100)}%
        </span>
        <span className="text-[10px] text-slate-500">|</span>
        <span className="text-[10px] text-slate-400 font-mono">
          {elements.length} elements
        </span>
        {snapToGrid && (
          <>
            <span className="text-[10px] text-slate-500">|</span>
            <span className="text-[10px] text-primary-400 font-mono flex items-center gap-1">
              <MagnetIcon className="w-3 h-3" />
              Snap
            </span>
          </>
        )}
      </div>
    </div>
  );
};

// ─── Inline Icons (to avoid extra imports) ──────────────────────────────
const SparklesIcon = ({ className }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
  </svg>
);

const FitIcon = ({ className }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
  </svg>
);

const PlusIcon = ({ className }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
  </svg>
);

const MinusIcon = ({ className }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
  </svg>
);

const MagnetIcon = ({ className }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
  </svg>
);

export default CanvasWorkspace;