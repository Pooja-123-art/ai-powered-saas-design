import React from 'react';
import { 
  Layers, 
  Eye, 
  EyeOff, 
  Lock, 
  Unlock, 
  Trash2, 
  ChevronUp, 
  ChevronDown,
  Type,
  Square,
  Circle,
  Image,
  Minus
} from 'lucide-react';
import { useAppStore } from '../context/AppContext';
import { motion, AnimatePresence } from 'framer-motion';

const iconMap = {
  rectangle: Square,
  circle: Circle,
  triangle: ChevronUp,
  text: Type,
  line: Minus,
  path: Minus,
  image: Image,
};

const LeftSidebar = () => {
  const {
    elements,
    selectedIds,
    selectElement,
    deleteElements,
    updateElement,
    bringToFront,
    sendToBack,
    hoveredId,
    setHoveredId
  } = useAppStore();

  const toggleVisibility = (e, id) => {
    e.stopPropagation();
    const el = elements.find(e => e.id === id);
    updateElement(id, { visible: !el.visible });
  };

  const toggleLock = (e, id) => {
    e.stopPropagation();
    const el = elements.find(e => e.id === id);
    updateElement(id, { locked: !el.locked });
  };

  const handleDelete = (e, id) => {
    e.stopPropagation();
    deleteElements([id]);
  };

  const sortedElements = [...elements].sort((a, b) => b.zIndex - a.zIndex);

  return (
    <motion.aside
      initial={{ x: -280 }}
      animate={{ x: 0 }}
      className="w-72 glass-panel border-r border-slate-800/60 flex flex-col z-40"
    >
      {/* Header */}
      <div className="h-12 flex items-center px-4 border-b border-slate-800/60">
        <Layers className="w-4 h-4 text-primary-400 mr-2" />
        <span className="font-semibold text-sm text-slate-200">Layers</span>
        <span className="ml-auto text-xs text-slate-500 font-mono">
          {elements.length} items
        </span>
      </div>

      {/* Layer List */}
      <div className="flex-1 overflow-y-auto py-2">
        <AnimatePresence>
          {sortedElements.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center justify-center h-40 text-slate-500"
            >
              <Layers className="w-8 h-8 mb-2 opacity-30" />
              <p className="text-xs">No layers yet</p>
              <p className="text-xs opacity-50">Generate or create elements</p>
            </motion.div>
          ) : (
            sortedElements.map((element, index) => {
              const Icon = iconMap[element.type] || Square;
              const isSelected = selectedIds.includes(element.id);
              const isHovered = hoveredId === element.id;

              return (
                <motion.div
                  key={element.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ delay: index * 0.02 }}
                  onClick={() => selectElement(element.id)}
                  onMouseEnter={() => setHoveredId(element.id)}
                  onMouseLeave={() => setHoveredId(null)}
                  className={`layer-item group ${isSelected ? 'active' : ''} ${
                    isHovered && !isSelected ? 'bg-slate-800/40' : ''
                  } ${!element.visible ? 'opacity-40' : ''}`}
                >
                  <Icon className="w-4 h-4 flex-shrink-0" />
                  
                  <span className="flex-1 truncate">
                    {element.type.charAt(0).toUpperCase() + element.type.slice(1)}
                    {element.text && ` — "${element.text.slice(0, 15)}${element.text.length > 15 ? '...' : ''}"`}
                  </span>

                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => toggleVisibility(e, element.id)}
                      className="p-1 rounded hover:bg-slate-700/50 text-slate-400 hover:text-slate-200"
                    >
                      {element.visible ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                    </button>
                    <button
                      onClick={(e) => toggleLock(e, element.id)}
                      className="p-1 rounded hover:bg-slate-700/50 text-slate-400 hover:text-slate-200"
                    >
                      {element.locked ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
                    </button>
                    <button
                      onClick={(e) => handleDelete(e, element.id)}
                      className="p-1 rounded hover:bg-red-500/20 text-slate-400 hover:text-red-400"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </motion.div>
              );
            })
          )}
        </AnimatePresence>
      </div>

      {/* Layer Controls */}
      <div className="h-12 flex items-center justify-between px-4 border-t border-slate-800/60">
        <button
          onClick={() => {
            selectedIds.forEach(id => sendToBack(id));
          }}
          disabled={selectedIds.length === 0}
          className="p-2 rounded hover:bg-slate-800 text-slate-400 hover:text-slate-200 disabled:opacity-30 transition-all"
          title="Send to Back"
        >
          <ChevronDown className="w-4 h-4" />
        </button>
        <button
          onClick={() => {
            selectedIds.forEach(id => bringToFront(id));
          }}
          disabled={selectedIds.length === 0}
          className="p-2 rounded hover:bg-slate-800 text-slate-400 hover:text-slate-200 disabled:opacity-30 transition-all"
          title="Bring to Front"
        >
          <ChevronUp className="w-4 h-4" />
        </button>
        <button
          onClick={() => deleteElements(selectedIds)}
          disabled={selectedIds.length === 0}
          className="p-2 rounded hover:bg-red-500/20 text-slate-400 hover:text-red-400 disabled:opacity-30 transition-all"
          title="Delete Selected"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </motion.aside>
  );
};

export default LeftSidebar;