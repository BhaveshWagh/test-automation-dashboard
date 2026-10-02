import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:5000/api';

export const api = axios.create({ baseURL: API_BASE });

export const getSummary = (project) => api.get('/analytics/summary', { params: { project } }).then((r) => r.data);
export const getTrend = (project, limit = 30) => api.get('/analytics/trend', { params: { project, limit } }).then((r) => r.data);
export const getFlaky = (project) => api.get('/analytics/flaky', { params: { project } }).then((r) => r.data);
export const getRuns = (page = 1, limit = 15, project) =>
  api.get('/runs', { params: { page, limit, project } }).then((r) => r.data);
export const getRun = (id) => api.get(`/runs/${id}`).then((r) => r.data);
