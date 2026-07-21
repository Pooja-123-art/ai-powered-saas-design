import React from 'react';
import { 
  Sparkles, 
  Save, 
  Download, 
  Undo2, 
  Redo2, 
  ZoomIn, 
  ZoomOut, 
  Grid3X3,
  Ruler,
  Magnet,
  MousePointer,
  Square,
  Circle,
  Type,
  Hand
} from 'lucide-react';
import { useAppStore } from '../context/AppContext';
import { motion } from 'framer-motion';

const Header = () => {
  const {
    zoom,
    setZoom,
    showGrid,
    setShowGrid,
    showRulers,
    setShowRulers,
    snapToGrid,
    setSnapToGrid,
    currentTool,
    setCurrentTool,
    undo,
    redo,
    elementsHistory,
    historyIndex,
    currentProject,
    isGenerating
  } = useAppStore();

  const tools = [
    { id: 'select', icon: MousePointer, label: 'Select (V)' },
    { id: 'rectangle', icon: Square, label: 'Rectangle (R)' },
    { id: 'circle', icon: Circle, label: 'Circle (C)' },
    { id: 'text', icon: Type, label: 'Text (T)' },
    { id: 'hand', icon: Hand, label: 'Pan (H)' },
  ];

  return (
    <motion.header 
      initial={{ y: -60 }}
      animate={{ y: 0 }}
      className="h-14 glass-panel border-b border-slate-800/60 flex items-center justify-between px-4 z-50 relative"
    >
      {/* Logo & Project Info */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary-500 to-accent-cyan flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <span className="font-bold text-lg tracking-tight">
            AI<span className="text-primary-400">Design</span>
          </span>
        </div>
        
        {currentProject && (
          <div className="flex items-center gap-2 px-3 py-1 rounded-md bg-slate-800/50 border border-slate-700/50">
            <span className="text-sm text-slate-300 font-medium truncate max-w-[200px]">
              {currentProject.name}
            </span>
            <span className="text-xs text-slate-500">v{currentProject.version}</span>
          </div>
        )}
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-1">
        {/* Tools */}
        <div className="flex items-center gap-0.5 p-1 rounded-lg bg-slate-800/50 border border-slate-700/50 mr-4">
          {tools.map((tool) => (
            <button
              key={tool.id}
              onClick={() => setCurrentTool(tool.id)}
              className={`p-2 rounded-md transition-all ${
                currentTool === tool.id
                  ? 'bg-primary-500/20 text-primary-400'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/50'
              }`}
              title={tool.label}
            >
              <tool.icon className="w-4 h-4" />
            </button>
          ))}
        </div>

        {/* History */}
        <div className="flex items-center gap-0.5 p-1 rounded-lg bg-slate-800/50 border border-slate-700/50 mr-4">
          <button
            onClick={undo}
            disabled={historyIndex <= 0}
            className="p-2 rounded-md text-slate-400 hover:text-slate-200 hover:bg-slate-700/50 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            title="Undo (Ctrl+Z)"
          >
            <Undo2 className="w-4 h-4" />
          </button>
          <button
            onClick={redo}
            disabled={historyIndex >= elementsHistory.length - 1}
            className="p-2 rounded-md text-slate-400 hover:text-slate-200 hover:bg-slate-700/50 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            title="Redo (Ctrl+Y)"
          >
            <Redo2 className="w-4 h-4" />
          </button>
        </div>

        {/* View Controls */}
        <div className="flex items-center gap-0.5 p-1 rounded-lg bg-slate-800/50 border border-slate-700/50 mr-4">
          <button
            onClick={() => setZoom(zoom - 0.1)}
            className="p-2 rounded-md text-slate-400 hover:text-slate-200 hover:bg-slate-700/50 transition-all"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <span className="text-xs text-slate-400 w-12 text-center font-mono">
            {Math.round(zoom * 100)}%
          </span>
          <button
            onClick={() => setZoom(zoom + 0.1)}
            className="p-2 rounded-md text-slate-400 hover:text-slate-200 hover:bg-slate-700/50 transition-all"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
        </div>

        {/* Toggles */}
        <div className="flex items-center gap-0.5 p-1 rounded-lg bg-slate-800/50 border border-slate-700/50 mr-4">
          <button
            onClick={() => setShowGrid(!showGrid)}
            className={`p-2 rounded-md transition-all ${showGrid ? 'text-primary-400 bg-primary-500/10' : 'text-slate-400 hover:text-slate-200'}`}
            title="Toggle Grid"
          >
            <Grid3X3 className="w-4 h-4" />
          </button>
          <button
            onClick={() => setShowRulers(!showRulers)}
            className={`p-2 rounded-md transition-all ${showRulers ? 'text-primary-400 bg-primary-500/10' : 'text-slate-400 hover:text-slate-200'}`}
            title="Toggle Rulers"
          >
            <Ruler className="w-4 h-4" />
          </button>
          <button
            onClick={() => setSnapToGrid(!snapToGrid)}
            className={`p-2 rounded-md transition-all ${snapToGrid ? 'text-primary-400 bg-primary-500/10' : 'text-slate-400 hover:text-slate-200'}`}
            title="Snap to Grid"
          >
            <Magnet className="w-4 h-4" />
          </button>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <button
            className="btn-secondary flex items-center gap-2 text-sm"
            disabled={isGenerating}
          >
            <Save className="w-4 h-4" />
            Save
          </button>
          <button className="btn-primary flex items-center gap-2 text-sm">
            <Download className="w-4 h-4" />
            Export
          </button>
        </div>
      </div>
    </motion.header>
  );
};

export default Header;