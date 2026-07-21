/**
 * Project CRUD Routes
 * Database State Management for Canvas Designs
 */

import express from 'express';
import { z } from 'zod';
import Project from '../models/Project.js';

const router = express.Router();

// ─── Validation Schemas ─────────────────────────────────────────────────
const createProjectSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  canvasWidth: z.number().min(100).max(4000).optional().default(1200),
  canvasHeight: z.number().min(100).max(4000).optional().default(800),
  backgroundColor: z.string().optional().default('#0f172a'),
  elements: z.array(z.any()).optional().default([]),
  tags: z.array(z.string()).optional().default([]),
  isPublic: z.boolean().optional().default(false)
});

const updateProjectSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
  canvasWidth: z.number().min(100).max(4000).optional(),
  canvasHeight: z.number().min(100).max(4000).optional(),
  backgroundColor: z.string().optional(),
  backgroundImage: z.string().optional(),
  elements: z.array(z.any()).optional(),
  tags: z.array(z.string()).optional(),
  isPublic: z.boolean().optional()
});

// ─── GET /api/projects ──────────────────────────────────────────────────
router.get('/', async (req, res, next) => {
  try {
    const { page = 1, limit = 20, search = '', sort = '-lastModified' } = req.query;
    
    const query = search 
      ? { $text: { $search: search } } 
      : {};
    
    const projects = await Project.find(query)
      .sort(sort)
      .limit(limit * 1)
      .skip((page - 1) * limit);
    
    const count = await Project.countDocuments(query);

    res.status(200).json({
      success: true,
      data: {
        projects,
        totalPages: Math.ceil(count / limit),
        currentPage: page,
        total: count
      }
    });
  } catch (error) {
    next(error);
  }
});

// ─── GET /api/projects/:id ──────────────────────────────────────────────
router.get('/:id', async (req, res, next) => {
  try {
    const project = await Project.findById(req.params.id);
    
    if (!project) {
      return res.status(404).json({ success: false, error: 'Project not found' });
    }
    
    res.status(200).json({ success: true, data: project });
  } catch (error) {
    next(error);
  }
});

// ─── POST /api/projects ─────────────────────────────────────────────────
router.post('/', async (req, res, next) => {
  try {
    const validated = createProjectSchema.parse(req.body);
    const project = await Project.create(validated);
    
    res.status(201).json({
      success: true,
      data: project,
      message: 'Project created successfully'
    });
  } catch (error) {
    next(error);
  }
});

// ─── PUT /api/projects/:id ──────────────────────────────────────────────
router.put('/:id', async (req, res, next) => {
  try {
    const validated = updateProjectSchema.parse(req.body);
    
    const project = await Project.findByIdAndUpdate(
      req.params.id,
      { ...validated, lastModified: Date.now() },
      { new: true, runValidators: true }
    );
    
    if (!project) {
      return res.status(404).json({ success: false, error: 'Project not found' });
    }
    
    res.status(200).json({
      success: true,
      data: project,
      message: 'Project updated successfully'
    });
  } catch (error) {
    next(error);
  }
});

// ─── PATCH /api/projects/:id/elements ───────────────────────────────────
router.patch('/:id/elements', async (req, res, next) => {
  try {
    const { elements } = req.body;
    
    if (!Array.isArray(elements)) {
      return res.status(400).json({ success: false, error: 'Elements must be an array' });
    }
    
    const project = await Project.findByIdAndUpdate(
      req.params.id,
      { elements, lastModified: Date.now(), $inc: { version: 1 } },
      { new: true }
    );
    
    if (!project) {
      return res.status(404).json({ success: false, error: 'Project not found' });
    }
    
    res.status(200).json({
      success: true,
      data: project,
      message: 'Elements updated successfully'
    });
  } catch (error) {
    next(error);
  }
});

// ─── DELETE /api/projects/:id ───────────────────────────────────────────
router.delete('/:id', async (req, res, next) => {
  try {
    const project = await Project.findByIdAndDelete(req.params.id);
    
    if (!project) {
      return res.status(404).json({ success: false, error: 'Project not found' });
    }
    
    res.status(200).json({
      success: true,
      message: 'Project deleted successfully'
    });
  } catch (error) {
    next(error);
  }
});

// ─── POST /api/projects/:id/duplicate ─────────────────────────────────
router.post('/:id/duplicate', async (req, res, next) => {
  try {
    const original = await Project.findById(req.params.id);
    
    if (!original) {
      return res.status(404).json({ success: false, error: 'Project not found' });
    }
    
    const duplicated = await Project.create({
      name: `${original.name} (Copy)`,
      description: original.description,
      canvasWidth: original.canvasWidth,
      canvasHeight: original.canvasHeight,
      backgroundColor: original.backgroundColor,
      backgroundImage: original.backgroundImage,
      elements: original.elements,
      tags: original.tags,
      isPublic: false
    });
    
    res.status(201).json({
      success: true,
      data: duplicated,
      message: 'Project duplicated successfully'
    });
  } catch (error) {
    next(error);
  }
});

export default router;