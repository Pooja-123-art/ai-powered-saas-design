/**
 * AI Layout Generation Route
 * POST /api/generate-layout
 * Integrates with Hugging Face Inference API for prompt-to-layout parsing
 */

import express from 'express';
import axios from 'axios';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';

const router = express.Router();

// ─── Input Validation Schema ────────────────────────────────────────────
const generateSchema = z.object({
  prompt: z.string().min(3, 'Prompt must be at least 3 characters').max(1000, 'Prompt too long'),
  canvasWidth: z.number().min(100).max(4000).optional().default(1200),
  canvasHeight: z.number().min(100).max(4000).optional().default(800),
  style: z.enum(['minimal', 'modern', 'colorful', 'dark', 'light']).optional().default('modern'),
  elementCount: z.number().min(1).max(50).optional().default(10)
});

// ─── Color Palettes by Style ────────────────────────────────────────────
const colorPalettes = {
  minimal: ['#ffffff', '#f3f4f6', '#d1d5db', '#9ca3af', '#6b7280', '#374151'],
  modern: ['#6366f1', '#8b5cf6', '#ec4899', '#06b6d4', '#10b981', '#f59e0b'],
  colorful: ['#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#a855f7'],
  dark: ['#0f172a', '#1e293b', '#334155', '#475569', '#64748b', '#94a3b8'],
  light: ['#fef3c7', '#dbeafe', '#fce7f3', '#d1fae5', '#e0e7ff', '#fef9c3']
};

// ─── Layout Templates ───────────────────────────────────────────────────
const layoutTemplates = {
  'dashboard': (w, h, palette) => [
    { type: 'rectangle', x: 0, y: 0, width: w, height: 60, fill: palette[0], zIndex: 1 },
    { type: 'rectangle', x: 0, y: 60, width: 250, height: h - 60, fill: palette[1], zIndex: 1 },
    { type: 'rectangle', x: 280, y: 90, width: (w - 310) / 2, height: 200, fill: palette[2], radius: 12, zIndex: 2 },
    { type: 'rectangle', x: 280 + (w - 310) / 2 + 30, y: 90, width: (w - 310) / 2, height: 200, fill: palette[3], radius: 12, zIndex: 2 },
    { type: 'rectangle', x: 280, y: 320, width: w - 310, height: h - 350, fill: palette[4], radius: 12, zIndex: 2 },
    { type: 'circle', x: 30, y: 15, width: 30, height: 30, fill: palette[5], zIndex: 3 },
    { type: 'text', x: 280, y: 110, text: 'Analytics Overview', fontSize: 20, fill: '#ffffff', zIndex: 3 },
    { type: 'text', x: 280, y: 340, text: 'Recent Activity', fontSize: 18, fill: '#ffffff', zIndex: 3 },
  ],
  'landing page': (w, h, palette) => [
    { type: 'rectangle', x: 0, y: 0, width: w, height: h, fill: palette[0], zIndex: 0 },
    { type: 'rectangle', x: 0, y: 0, width: w, height: 80, fill: palette[1], zIndex: 1 },
    { type: 'circle', x: w / 2 - 150, y: h / 2 - 150, width: 300, height: 300, fill: palette[2], opacity: 0.3, zIndex: 1 },
    { type: 'rectangle', x: w / 2 - 200, y: h / 2 - 40, width: 400, height: 60, fill: palette[3], radius: 30, zIndex: 2 },
    { type: 'text', x: w / 2 - 180, y: h / 2 - 25, text: 'Get Started Today', fontSize: 24, fill: '#ffffff', zIndex: 3 },
    { type: 'rectangle', x: 100, y: h - 200, width: (w - 300) / 3, height: 120, fill: palette[4], radius: 16, zIndex: 2 },
    { type: 'rectangle', x: 100 + (w - 300) / 3 + 50, y: h - 200, width: (w - 300) / 3, height: 120, fill: palette[4], radius: 16, zIndex: 2 },
    { type: 'rectangle', x: 100 + 2 * ((w - 300) / 3 + 50), y: h - 200, width: (w - 300) / 3, height: 120, fill: palette[4], radius: 16, zIndex: 2 },
  ],
  'card': (w, h, palette) => [
    { type: 'rectangle', x: w / 2 - 200, y: h / 2 - 250, width: 400, height: 500, fill: palette[0], radius: 24, zIndex: 1 },
    { type: 'rectangle', x: w / 2 - 200, y: h / 2 - 250, width: 400, height: 200, fill: palette[1], radius: 24, zIndex: 2 },
    { type: 'circle', x: w / 2 - 50, y: h / 2 - 150, width: 100, height: 100, fill: palette[2], zIndex: 3 },
    { type: 'text', x: w / 2 - 180, y: h / 2 + 20, text: 'Card Title', fontSize: 24, fill: '#ffffff', zIndex: 3 },
    { type: 'text', x: w / 2 - 180, y: h / 2 + 60, text: 'Description text goes here...', fontSize: 14, fill: palette[5], zIndex: 3 },
    { type: 'rectangle', x: w / 2 - 180, y: h / 2 + 120, width: 360, height: 50, fill: palette[3], radius: 12, zIndex: 3 },
    { type: 'text', x: w / 2 - 50, y: h / 2 + 137, text: 'Action', fontSize: 16, fill: '#ffffff', zIndex: 4 },
  ],
  'form': (w, h, palette) => [
    { type: 'rectangle', x: w / 2 - 250, y: h / 2 - 300, width: 500, height: 600, fill: palette[0], radius: 20, zIndex: 1 },
    { type: 'text', x: w / 2 - 220, y: h / 2 - 270, text: 'Sign Up', fontSize: 28, fill: '#ffffff', zIndex: 2 },
    { type: 'rectangle', x: w / 2 - 220, y: h / 2 - 200, width: 440, height: 50, fill: palette[1], radius: 8, zIndex: 2 },
    { type: 'text', x: w / 2 - 210, y: h / 2 - 180, text: 'Email', fontSize: 14, fill: palette[5], zIndex: 3 },
    { type: 'rectangle', x: w / 2 - 220, y: h / 2 - 120, width: 440, height: 50, fill: palette[1], radius: 8, zIndex: 2 },
    { type: 'text', x: w / 2 - 210, y: h / 2 - 100, text: 'Password', fontSize: 14, fill: palette[5], zIndex: 3 },
    { type: 'rectangle', x: w / 2 - 220, y: h / 2 - 20, width: 440, height: 50, fill: palette[2], radius: 8, zIndex: 2 },
    { type: 'text', x: w / 2 - 30, y: h / 2, text: 'Submit', fontSize: 16, fill: '#ffffff', zIndex: 3 },
  ],
  'gallery': (w, h, palette) => [
    { type: 'rectangle', x: 0, y: 0, width: w, height: h, fill: palette[0], zIndex: 0 },
    { type: 'text', x: 50, y: 50, text: 'Gallery', fontSize: 36, fill: '#ffffff', zIndex: 1 },
    { type: 'rectangle', x: 50, y: 120, width: (w - 150) / 3, height: (w - 150) / 3, fill: palette[1], radius: 16, zIndex: 2 },
    { type: 'rectangle', x: 50 + (w - 150) / 3 + 25, y: 120, width: (w - 150) / 3, height: (w - 150) / 3, fill: palette[2], radius: 16, zIndex: 2 },
    { type: 'rectangle', x: 50 + 2 * ((w - 150) / 3 + 25), y: 120, width: (w - 150) / 3, height: (w - 150) / 3, fill: palette[3], radius: 16, zIndex: 2 },
    { type: 'rectangle', x: 50, y: 120 + (w - 150) / 3 + 25, width: (w - 150) / 3, height: (w - 150) / 3, fill: palette[4], radius: 16, zIndex: 2 },
    { type: 'rectangle', x: 50 + (w - 150) / 3 + 25, y: 120 + (w - 150) / 3 + 25, width: (w - 150) / 3, height: (w - 150) / 3, fill: palette[5], radius: 16, zIndex: 2 },
    { type: 'rectangle', x: 50 + 2 * ((w - 150) / 3 + 25), y: 120 + (w - 150) / 3 + 25, width: (w - 150) / 3, height: (w - 150) / 3, fill: palette[1], radius: 16, zIndex: 2 },
  ]
};

// ─── Smart Layout Generator ───────────────────────────────────────────
const generateSmartLayout = (prompt, canvasWidth, canvasHeight, style, elementCount) => {
  const palette = colorPalettes[style];
  const lowerPrompt = prompt.toLowerCase();
  
  // Determine layout type from prompt keywords
  let layoutType = 'dashboard';
  if (lowerPrompt.includes('landing') || lowerPrompt.includes('hero') || lowerPrompt.includes('homepage')) {
    layoutType = 'landing page';
  } else if (lowerPrompt.includes('card') || lowerPrompt.includes('profile')) {
    layoutType = 'card';
  } else if (lowerPrompt.includes('form') || lowerPrompt.includes('login') || lowerPrompt.includes('signup')) {
    layoutType = 'form';
  } else if (lowerPrompt.includes('gallery') || lowerPrompt.includes('grid') || lowerPrompt.includes('portfolio')) {
    layoutType = 'gallery';
  }

  // Get base template
  let elements = layoutTemplates[layoutType](canvasWidth, canvasHeight, palette);

  // Add extra decorative elements based on elementCount
  const extraCount = Math.max(0, elementCount - elements.length);
  for (let i = 0; i < extraCount; i++) {
    const shapes = ['circle', 'rectangle', 'triangle'];
    const shape = shapes[Math.floor(Math.random() * shapes.length)];
    elements.push({
      type: shape,
      x: Math.random() * (canvasWidth - 100),
      y: Math.random() * (canvasHeight - 100),
      width: 20 + Math.random() * 80,
      height: 20 + Math.random() * 80,
      fill: palette[Math.floor(Math.random() * palette.length)],
      opacity: 0.2 + Math.random() * 0.3,
      radius: shape === 'rectangle' ? Math.random() * 20 : 0,
      zIndex: 0
    });
  }

  // Assign unique IDs and ensure all required fields
  return elements.map((el, index) => ({
    id: uuidv4(),
    ...el,
    zIndex: el.zIndex || index,
    stroke: el.stroke || 'transparent',
    strokeWidth: el.strokeWidth || 0,
    rotation: el.rotation || 0,
    opacity: el.opacity || 1,
    locked: false,
    visible: true,
    createdAt: new Date().toISOString()
  }));
};

// ─── Hugging Face AI Integration ────────────────────────────────────────
const callHuggingFaceAPI = async (prompt) => {
  const HF_API_KEY = process.env.HUGGINGFACE_API_KEY;
  
  if (!HF_API_KEY || HF_API_KEY === 'hf_your_api_key_here') {
    // Fallback: return null to trigger smart layout generation
    return null;
  }

  try {
    const response = await axios.post(
      'https://api-inference.huggingface.co/models/mistralai/Mistral-7B-Instruct-v0.2',
      {
        inputs: `<s>[INST] You are a UI/UX design AI. Given this design prompt, generate a JSON array of layout elements with properties: type (rectangle/circle/text), x, y, width, height, fill (hex color). Prompt: "${prompt}" [/INST]`,
        parameters: {
          max_new_tokens: 512,
          temperature: 0.3,
          return_full_text: false
        }
      },
      {
        headers: {
          'Authorization': `Bearer ${HF_API_KEY}`,
          'Content-Type': 'application/json'
        },
        timeout: 15000
      }
    );

    // Parse AI response
    const aiText = response.data[0]?.generated_text || '';
    const jsonMatch = aiText.match(/\[.*\]/s);
    
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return parsed.map(el => ({
        id: uuidv4(),
        ...el,
        stroke: 'transparent',
        strokeWidth: 0,
        rotation: 0,
        opacity: 1,
        locked: false,
        visible: true,
        zIndex: 0,
        createdAt: new Date().toISOString()
      }));
    }
    
    return null;
  } catch (error) {
    console.warn('Hugging Face API call failed, falling back to smart layout:', error.message);
    return null;
  }
};

// ─── POST /api/generate-layout ──────────────────────────────────────────
router.post('/', async (req, res, next) => {
  try {
    // Validate input
    const validated = generateSchema.parse(req.body);
    const { prompt, canvasWidth, canvasHeight, style, elementCount } = validated;

    console.log(`🎨 Generating layout for: "${prompt}"`);

    // Attempt AI generation first
    let elements = await callHuggingFaceAPI(prompt);

    // Fallback to smart layout generator
    if (!elements || elements.length === 0) {
      console.log('🧠 Using smart layout generator');
      elements = generateSmartLayout(prompt, canvasWidth, canvasHeight, style, elementCount);
    }

    // Response
    res.status(200).json({
      success: true,
      data: {
        prompt,
        style,
        canvasWidth,
        canvasHeight,
        elementCount: elements.length,
        elements,
        generatedAt: new Date().toISOString()
      }
    });

  } catch (error) {
    next(error);
  }
});

// ─── GET /api/generate-layout/styles ─────────────────────────────────────
router.get('/styles', (req, res) => {
  res.status(200).json({
    success: true,
    data: Object.keys(colorPalettes)
  });
});

export default router;