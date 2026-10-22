import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:5000/api';

export const api = axios.create({ baseURL: API_BASE, withCredentials: true });

// The access token lives in memory only (never localStorage) and is attached here
// rather than read from storage on every request.
let accessToken = null;
export function setAccessToken(token) {
  accessToken = token;
}

api.interceptors.request.use((config) => {
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  return config;
});

// On a 401, try one silent refresh (using the httpOnly refresh cookie) and retry the
// original request. Concurrent 401s share the same refresh call instead of each
// firing their own.
let refreshPromise = null;

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const { config, response } = error;
    if (response?.status !== 401 || config._retried || config.url?.includes('/auth/')) {
      return Promise.reject(error);
    }
    config._retried = true;

    if (!refreshPromise) {
      refreshPromise = api
        .post('/auth/refresh')
        .then((res) => {
          setAccessToken(res.data.accessToken);
          return res.data.accessToken;
        })
        .finally(() => {
          refreshPromise = null;
        });
    }

    try {
      const newToken = await refreshPromise;
      config.headers.Authorization = `Bearer ${newToken}`;
      return api(config);
    } catch (refreshErr) {
      return Promise.reject(refreshErr);
    }
  }
);

export const register = (name, email, password) =>
  api.post('/auth/register', { name, email, password }).then((r) => r.data);
export const login = (email, password) => api.post('/auth/login', { email, password }).then((r) => r.data);
export const verifyEmail = (email, otp) => api.post('/auth/verify-email', { email, otp }).then((r) => r.data);
export const resendVerification = (email) => api.post('/auth/resend-verification', { email }).then((r) => r.data);
export const forgotPassword = (email) => api.post('/auth/forgot-password', { email }).then((r) => r.data);
export const verifyResetOtp = (email, otp) => api.post('/auth/verify-reset-otp', { email, otp }).then((r) => r.data);
export const resetPassword = (resetToken, newPassword) =>
  api.post('/auth/reset-password', { resetToken, newPassword }).then((r) => r.data);
export const refreshSession = () => api.post('/auth/refresh').then((r) => r.data);
export const logout = () => api.post('/auth/logout');
export const getMe = () => api.get('/auth/me').then((r) => r.data);

export const getSummary = (project) => api.get('/analytics/summary', { params: { project } }).then((r) => r.data);
export const getTrend = (project, limit = 30) => api.get('/analytics/trend', { params: { project, limit } }).then((r) => r.data);
export const getFlaky = (project) => api.get('/analytics/flaky', { params: { project } }).then((r) => r.data);
export const getRuns = (page = 1, limit = 15, project) =>
  api.get('/runs', { params: { page, limit, project } }).then((r) => r.data);
export const getRun = (id) => api.get(`/runs/${id}`).then((r) => r.data);

export const getTestCases = (params = {}) => api.get('/testcases', { params }).then((r) => r.data);
export const getTestCase = (id) => api.get(`/testcases/${id}`).then((r) => r.data);
export const createTestCase = (payload) => api.post('/testcases', payload).then((r) => r.data);
export const validateGherkin = (gherkin) => api.post('/testcases/validate-gherkin', { gherkin }).then((r) => r.data);
export const updateTestCase = (id, payload) => api.patch(`/testcases/${id}`, payload).then((r) => r.data);
