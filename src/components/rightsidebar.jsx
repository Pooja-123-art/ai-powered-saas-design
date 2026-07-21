import React, { useState } from 'react';
import { 
  Wand2, 
  Sparkles, 
  Settings, 
  Palette, 
  Layout,
  Loader2,
  Image as ImageIcon,
  Type,
  MousePointer
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { useAppStore } from '../context/AppContext';
import { generateLayout } from '../utils/api';

const RightSidebar = () => {
  const [prompt, setPrompt] = useState('');
  const [style, setStyle] = useState('modern');
  const [elementCount, setElementCount] = useState(10);
  const [activeTab, setActiveTab] = useState('ai');
  
  const { 
    isGenerating, 
    setIsGenerating, 
    addElements, 
    setElements,
    canvasSize,
    selectedIds,
    elements
  } = useAppStore();

  const styles = [
    { id: 'minimal', label: 'Minimal', color: 'bg-slate-200' },
    { id: 'modern', label: 'Modern', color: 'bg-primary-500' },
    { id: 'colorful', label: 'Colorful', color: 'bg-accent-magenta' },
    { id: 'dark', label: 'Dark', color: 'bg-slate-800' },
    { id: 'light', label: 'Light', color: 'bg-amber-100' },
  ];

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      toast.error('Please enter a design prompt');
      return;
    }

    setIsGenerating(true);
    const toastId = toast.loading('Generating your design...');

    try {
      const response = await generateLayout(prompt, {
        canvasWidth: canvasSize.width,
        canvasHeight: canvasSize.height,
        style,
        elementCount
      });

      if (response.success && response.data.elements) {
        // Clear existing and add new, or append
        const existingIds = new Set(elements.map(e => e.id));
        const newElements = response.data.elements.filter(e => !existingIds.has(e.id));
        
        addElements(newElements);
        toast.success(`Generated ${newElements.length} elements!`, { id: toastId });
      } else {
        toast.error('No elements generated', { id: toastId });
      }
    } catch (error) {
      toast.error(error.message || 'Generation failed', { id: toastId });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleGenerate();
    }
  };

  const selectedElement = selectedIds.length === 1 
    ? elements.find(e => e.id === selectedIds[0]) 
    : null;

  const updateSelected = (updates) => {
    if (selectedElement) {
      const { updateElement } = useAppStore.getState();
      updateElement(selectedElement.id, updates);
    }
  };

  return (
    <motion.aside
      initial={{ x: 320 }}
      animate={{ x: 0 }}
      className="w-80 glass-panel border-l border-slate-800/60 flex flex-col z-40"
    >
      {/* Tabs */}
      <div className="flex border-b border-slate-800/60">
        {[
          { id: 'ai', icon: Sparkles, label: 'AI Generate' },
          { id: 'properties', icon: Settings, label: 'Properties' },
          { id: 'styles', icon: Palette, label: 'Styles' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 flex items-center justify-center gap-2 py-3 text-xs font-medium transition-all ${
              activeTab === tab.id
                ? 'text-primary-400 border-b-2 border-primary-500 bg-primary-500/5'
                : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            <tab.icon className="w-3.5 h-3.5" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        <AnimatePresence mode="wait">
          {activeTab === 'ai' && (
            <motion.div
              key="ai"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              {/* Prompt Input */}
              <div>
                <label className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-2 block">
                  Design Prompt
                </label>
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Describe your design... e.g., 'A modern dashboard with sidebar, header, and three stat cards'"
                  className="input-field min-h-[100px] resize-none text-sm"
                  disabled={isGenerating}
                />
                <p className="text-xs text-slate-500 mt-1">
                  Press Enter to generate, Shift+Enter for new line
                </p>
              </div>

              {/* Style Selector */}
              <div>
                <label className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-2 block">
                  Style Theme
                </label>
                <div className="grid grid-cols-5 gap-2">
                  {styles.map((s) => (
                    <button
                      key={s.id}
                      onClick={() => setStyle(s.id)}
                      className={`flex flex-col items-center gap-1 p-2 rounded-lg border transition-all ${
                        style === s.id
                          ? 'border-primary-500 bg-primary-500/10'
                          : 'border-slate-700 hover:border-slate-600'
                      }`}
                    >
                      <div className={`w-6 h-6 rounded-full ${s.color} border border-slate-600`} />
                      <span className="text-[10px] text-slate-400">{s.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Element Count */}
              <div>
                <label className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-2 block">
                  Element Count: {elementCount}
                </label>
                <input
                  type="range"
                  min="1"
                  max="50"
                  value={elementCount}
                  onChange={(e) => setElementCount(Number(e.target.value))}
                  className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-primary-500"
                />
                <div className="flex justify-between text-[10px] text-slate-500 mt-1">
                  <span>Minimal</span>
                  <span>Complex</span>
                </div>
              </div>

              {/* Generate Button */}
              <button
                onClick={handleGenerate}
                disabled={isGenerating || !prompt.trim()}
                className="w-full btn-primary flex items-center justify-center gap-2 py-3"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Generating
                  </>
                ) : (
                  <>
                    <Wand2 className="w-4 h-4" />
                    Generate
                  </>
                )}
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.aside>
  );
};

export default RightSidebar;
