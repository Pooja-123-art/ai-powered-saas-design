/**
 * VectorElement.jsx — Reusable Canvas Vector Element Renderer
 * Handles: geometry shapes, text labels, context interactions, property binding
 */

import React, { memo, useMemo } from 'react';
import { useAppContext } from '../context/AppContext';

// ─── Shape Renderers ──────────────────────────────────────────────────

const RectangleShape = memo(({ element, isSelected, isHovered }) => {
  const { x, y, width, height, fill, stroke, strokeWidth, opacity, radius = 0 } = element;
  
  const style = useMemo(() => ({
    left: `${x}px`,
    top: `${y}px`,
    width: `${width}px`,
    height: `${height}px`,
    backgroundColor: fill,
    opacity,
    borderRadius: `${radius}px`,
    border: isSelected 
      ? '2px solid #6366f1' 
      : stroke && stroke !== 'transparent' 
        ? `${strokeWidth}px solid ${stroke}` 
        : 'none',
    boxShadow: isSelected 
      ? '0 0 0 4px rgba(99, 102, 241, 0.2), 0 4px 20px rgba(0,0,0,0.3)' 
      : isHovered 
        ? '0 0 0 2px rgba(99, 102, 241, 0.3)' 
        : '0 2px 8px rgba(0,0,0,0.2)',
    cursor: element.locked ? 'not-allowed' : 'move',
    transition: 'box-shadow 0.15s ease',
  }), [x, y, width, height, fill, stroke, strokeWidth, opacity, radius, isSelected, isHovered, element.locked]);

  return (
    <div
      className="absolute pointer-events-none"
      style={style}
    />
  );
});

const CircleShape = memo(({ element, isSelected, isHovered }) => {
  const { x, y, width, height, fill, stroke, strokeWidth, opacity } = element;
  const radius = element.radius || Math.min(width, height) / 2;
  
  const style = useMemo(() => ({
    left: `${x + width / 2 - radius}px`,
    top: `${y + height / 2 - radius}px`,
    width: `${radius * 2}px`,
    height: `${radius * 2}px`,
    backgroundColor: fill,
    opacity,
    borderRadius: '50%',
    border: isSelected 
      ? '2px solid #6366f1' 
      : stroke && stroke !== 'transparent' 
        ? `${strokeWidth}px solid ${stroke}` 
        : 'none',
    boxShadow: isSelected 
      ? '0 0 0 4px rgba(99, 102, 241, 0.2), 0 4px 20px rgba(0,0,0,0.3)' 
      : isHovered 
        ? '0 0 0 2px rgba(99, 102, 241, 0.3)' 
        : '0 2px 8px rgba(0,0,0,0.2)',
    cursor: element.locked ? 'not-allowed' : 'move',
  }), [x, y, width, height, fill, stroke, strokeWidth, opacity, radius, isSelected, isHovered, element.locked]);

  return (
    <div
      className="absolute pointer-events-none"
      style={style}
    />
  );
});

const TriangleShape = memo(({ element, isSelected, isHovered }) => {
  const { x, y, width, height, fill, stroke, strokeWidth, opacity } = element;
  
  const clipPath = useMemo(() => {
    const points = element.points || [0, height, width / 2, 0, width, height];
    const normalized = points.map((p, i) => 
      i % 2 === 0 ? `${(p / width) * 100}%` : `${(p / height) * 100}%`
    );
    return `polygon(${normalized.join(', ')})`;
  }, [element.points, width, height]);

  const style = useMemo(() => ({
    left: `${x}px`,
    top: `${y}px`,
    width: `${width}px`,
    height: `${height}px`,
    backgroundColor: fill,
    opacity,
    clipPath,
    border: isSelected 
      ? '2px solid #6366f1' 
      : stroke && stroke !== 'transparent' 
        ? `${strokeWidth}px solid ${stroke}` 
        : 'none',
    filter: isSelected 
      ? 'drop-shadow(0 0 4px rgba(99, 102, 241, 0.5))' 
      : isHovered 
        ? 'drop-shadow(0 0 2px rgba(99, 102, 241, 0.3))' 
        : 'drop-shadow(0 2px 4px rgba(0,0,0,0.2))',
    cursor: element.locked ? 'not-allowed' : 'move',
  }), [x, y, width, height, fill, stroke, strokeWidth, opacity, clipPath, isSelected, isHovered, element.locked]);

  return (
    <div
      className="absolute pointer-events-none"
      style={style}
    />
  );
});

const TextShape = memo(({ element, isSelected, isHovered }) => {
  const { x, y, width, height, text, fontSize, fontFamily, fontWeight, color, opacity } = element;
  
  const style = useMemo(() => ({
    left: `${x}px`,
    top: `${y}px`,
    width: `${width}px`,
    minHeight: `${height}px`,
    color: color || '#ffffff',
    fontSize: `${fontSize}px`,
    fontFamily: fontFamily || 'Inter, sans-serif',
    fontWeight: fontWeight || '400',
    opacity,
    lineHeight: 1.4,
    wordWrap: 'break-word',
    border: isSelected 
      ? '2px solid #6366f1' 
      : '1px dashed transparent',
    boxShadow: isSelected 
      ? '0 0 0 4px rgba(99, 102, 241, 0.2)' 
      : isHovered 
        ? '0 0 0 1px rgba(99, 102, 241, 0.3)' 
        : 'none',
    cursor: element.locked ? 'not-allowed' : 'text',
    padding: '4px',
    userSelect: 'none',
  }), [x, y, width, height, text, fontSize, fontFamily, fontWeight, color, opacity, isSelected, isHovered, element.locked]);

  return (
    <div
      className="absolute pointer-events-none"
      style={style}
    >
      {text}
    </div>
  );
});

const LineShape = memo(({ element, isSelected, isHovered }) => {
  const { x, y, x2, y2, stroke, strokeWidth, opacity } = element;
  
  const length = Math.sqrt(Math.pow(x2 - x, 2) + Math.pow(y2 - y, 2));
  const angle = (Math.atan2(y2 - y, x2 - x) * 180) / Math.PI;
  
  const style = useMemo(() => ({
    left: `${x}px`,
    top: `${y}px`,
    width: `${length}px`,
    height: `${strokeWidth}px`,
    backgroundColor: stroke,
    opacity,
    transform: `rotate(${angle}deg)`,
    transformOrigin: '0 50%',
    boxShadow: isSelected 
      ? '0 0 0 2px rgba(99, 102, 241, 0.5)' 
      : isHovered 
        ? '0 0 0 1px rgba(99, 102, 241, 0.3)' 
        : 'none',
    cursor: element.locked ? 'not-allowed' : 'move',
  }), [x, y, x2, y2, stroke, strokeWidth, opacity, length, angle, isSelected, isHovered, element.locked]);

  return (
    <div
      className="absolute pointer-events-none"
      style={style}
    />
  );
});

// ─── Main VectorElement Component ───────────────────────────────────────

const VectorElement = memo(({ element }) => {
  const { selectedIds, hoveredId, selectElement } = useAppContext();
  
  const isSelected = selectedIds.includes(element.id);
  const isHovered = hoveredId === element.id;
  
  // Don't render invisible elements (unless selected for editing)
  if (!element.visible && !isSelected) return null;

  const handleClick = (e) => {
    if (element.locked) return;
    e.stopPropagation();
    const multi = e.metaKey || e.ctrlKey || e.shiftKey;
    selectElement(element.id, multi);
  };

  const renderShape = () => {
    const props = { element, isSelected, isHovered };
    
    switch (element.type) {
      case 'rectangle':
        return <RectangleShape {...props} />;
      case 'circle':
        return <CircleShape {...props} />;
      case 'triangle':
        return <TriangleShape {...props} />;
      case 'text':
        return <TextShape {...props} />;
      case 'line':
        return <LineShape {...props} />;
      default:
        return <RectangleShape {...props} />;
    }
  };

  return (
    <div
      className="absolute"
      style={{
        left: 0,
        top: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'auto',
        zIndex: element.zIndex,
      }}
      onClick={handleClick}
      data-element-id={element.id}
    >
      {/* Locked indicator */}
      {element.locked && (
        <div
          className="absolute pointer-events-none z-10"
          style={{
            left: `${element.x - 4}px`,
            top: `${element.y - 4}px`,
            width: `${element.width + 8}px`,
            height: `${element.height + 8}px`,
            border: '1px dashed rgba(239, 68, 68, 0.4)',
            borderRadius: '4px',
          }}
        >
          <div className="absolute -top-2 left-2 px-1 bg-red-500/20 text-red-400 text-[10px] rounded">
            Locked
          </div>
        </div>
      )}
      
      {renderShape()}
    </div>
  );
});

VectorElement.displayName = 'VectorElement';

export default VectorElement;