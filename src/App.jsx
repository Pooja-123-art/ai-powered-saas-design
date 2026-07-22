/**
 * Axios API Client Configuration
 */

import axios from 'axios';

// Fallback to empty string or relative path if deployed on same host, or local fallback
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor
api.interceptors.request.use(
  (config) => {
    console.log(`🌐 API Request: ${config.method?.toUpperCase()} ${config.url}`);
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor
api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    const message = error.response?.data?.error || error.message || 'Network error';
    console.error('❌ API Error:', message);
    
    // Return empty array/data structure gracefully instead of breaking React rendering loops
    return Promise.resolve({ success: false, data: [], error: message });
  }
);

// ─── API Methods ────────────────────────────────────────────────────────
export const generateLayout = async (prompt, options = {}) => {
  return api.post('/generate-layout', {
    prompt,
    canvasWidth: options.canvasWidth || 1200,
    canvasHeight: options.canvasHeight || 800,
    style: options.style || 'modern',
    elementCount: options.elementCount || 10,
  });
};

export const fetchProjects = async (params = {}) => {
  return api.get('/projects', { params });
};

export const fetchProject = async (id) => {
  return api.get(`/projects/${id}`);
};

export const createProject = async (data) => {
  return api.post('/projects', data);
};

export const updateProject = async (id, data) => {
  return api.put(`/projects/${id}`, data);
};

export const updateElements = async (id, elements) => {
  return api.patch(`/projects/${id}/elements`, { elements });
};

export const deleteProject = async (id) => {
  return api.delete(`/projects/${id}`);
};

export const duplicateProject = async (id) => {
  return api.post(`/projects/${id}/duplicate`);
};

export const getStyles = async () => {
  return api.get('/generate-layout/styles');
};

export default api;
