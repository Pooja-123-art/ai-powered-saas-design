/**
 * Global Application State Management with Zustand
 */

import { create } from 'zustand';

export const useAppStore = create((set, get) => ({
  // ─── Canvas State ─────────────────────────────────────────────────────
  canvasSize: { width: 1200, height: 800 },
  zoom: 1,
  pan: { x: 0, y: 0 },
  selectedIds: [],
  hoveredId: null,
  
  // ─── Elements State ───────────────────────────────────────────────────
  elements: [],
  elementsHistory: [],
  historyIndex: -1,
  
  // ─── UI State ─────────────────────────────────────────────────────────
  isGenerating: false,
  showGrid: true,
  showRulers: true,
  snapToGrid: true,
  currentTool: 'select', // select, rectangle, circle, text, hand
  
  // ─── Project State ────────────────────────────────────────────────────
  currentProject: null,
  projects: [],
  
  // ─── Actions ──────────────────────────────────────────────────────────
  
  setCanvasSize: (width, height) => set({ canvasSize: { width, height } }),
  
  setZoom: (zoom) => set({ zoom: Math.max(0.1, Math.min(5, zoom)) }),
  
  setPan: (pan) => set({ pan }),
  
  setElements: (elements) => {
    const state = get();
    const newHistory = state.elementsHistory.slice(0, state.historyIndex + 1);
    newHistory.push([...elements]);
    set({
      elements: [...elements],
      elementsHistory: newHistory.slice(-50), // Keep last 50 states
      historyIndex: newHistory.length - 1,
    });
  },
  
  addElements: (newElements) => {
    const state = get();
    const updated = [...state.elements, ...newElements];
    get().setElements(updated);
  },
  
  updateElement: (id, updates) => {
    const state = get();
    const updated = state.elements.map(el => 
      el.id === id ? { ...el, ...updates } : el
    );
    get().setElements(updated);
  },
  
  deleteElements: (ids) => {
    const state = get();
    const updated = state.elements.filter(el => !ids.includes(el.id));
    get().setElements(updated);
    set({ selectedIds: [] });
  },
  
  selectElement: (id, multi = false) => {
    const state = get();
    if (multi) {
      const selected = state.selectedIds.includes(id)
        ? state.selectedIds.filter(sid => sid !== id)
        : [...state.selectedIds, id];
      set({ selectedIds: selected });
    } else {
      set({ selectedIds: [id] });
    }
  },
  
  clearSelection: () => set({ selectedIds: [] }),
  
  setHoveredId: (id) => set({ hoveredId: id }),
  
  undo: () => {
    const state = get();
    if (state.historyIndex > 0) {
      set({
        historyIndex: state.historyIndex - 1,
        elements: [...state.elementsHistory[state.historyIndex - 1]],
      });
    }
  },
  
  redo: () => {
    const state = get();
    if (state.historyIndex < state.elementsHistory.length - 1) {
      set({
        historyIndex: state.historyIndex + 1,
        elements: [...state.elementsHistory[state.historyIndex + 1]],
      });
    }
  },
  
  setIsGenerating: (isGenerating) => set({ isGenerating }),
  
  setShowGrid: (show) => set({ showGrid: show }),
  setShowRulers: (show) => set({ showRulers: show }),
  setSnapToGrid: (snap) => set({ snapToGrid: snap }),
  setCurrentTool: (tool) => set({ currentTool: tool }),
  
  setCurrentProject: (project) => set({ currentProject: project }),
  setProjects: (projects) => set({ projects }),
  
  bringToFront: (id) => {
    const state = get();
    const maxZ = Math.max(...state.elements.map(e => e.zIndex), 0);
    get().updateElement(id, { zIndex: maxZ + 1 });
  },
  
  sendToBack: (id) => {
    const state = get();
    const minZ = Math.min(...state.elements.map(e => e.zIndex), 0);
    get().updateElement(id, { zIndex: minZ - 1 });
  },
}));