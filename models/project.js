/**
 * Project Schema - MongoDB Model for Canvas Designs
 */

import mongoose from 'mongoose';

const VectorElementSchema = new mongoose.Schema({
  id: { type: String, required: true },
  type: { 
    type: String, 
    required: true,
    enum: ['rectangle', 'circle', 'triangle', 'text', 'line', 'path', 'image']
  },
  x: { type: Number, required: true, default: 0 },
  y: { type: Number, required: true, default: 0 },
  width: { type: Number, default: 100 },
  height: { type: Number, default: 100 },
  rotation: { type: Number, default: 0 },
  fill: { type: String, default: '#6366f1' },
  stroke: { type: String, default: 'transparent' },
  strokeWidth: { type: Number, default: 0 },
  opacity: { type: Number, default: 1, min: 0, max: 1 },
  zIndex: { type: Number, default: 0 },
  text: { type: String, default: '' },
  fontSize: { type: Number, default: 16 },
  fontFamily: { type: String, default: 'Inter' },
  radius: { type: Number, default: 0 },
  points: [{ type: Number }], // For custom paths/polygons
  locked: { type: Boolean, default: false },
  visible: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now }
});

const ProjectSchema = new mongoose.Schema({
  name: { 
    type: String, 
    required: [true, 'Project name is required'],
    trim: true,
    maxlength: [100, 'Project name cannot exceed 100 characters']
  },
  description: { 
    type: String, 
    trim: true,
    maxlength: [500, 'Description cannot exceed 500 characters']
  },
  canvasWidth: { type: Number, default: 1200 },
  canvasHeight: { type: Number, default: 800 },
  backgroundColor: { type: String, default: '#0f172a' },
  backgroundImage: { type: String, default: '' },
  elements: [VectorElementSchema],
  tags: [{ type: String }],
  isPublic: { type: Boolean, default: false },
  version: { type: Number, default: 1 },
  lastModified: { type: Date, default: Date.now }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Index for performance
ProjectSchema.index({ name: 'text', tags: 'text' });
ProjectSchema.index({ lastModified: -1 });

// Pre-save middleware to update lastModified
ProjectSchema.pre('save', function(next) {
  this.lastModified = Date.now();
  next();
});

export default mongoose.model('Project', ProjectSchema);