import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const API = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
});

// Attach JWT token automatically
API.interceptors.request.use((config) => {
  const token = localStorage.getItem('sip_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Handle 401 globally
API.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('sip_token');
      localStorage.removeItem('sip_user');
      window.location.hash = '#/login';
    }
    return Promise.reject(error);
  }
);

// Auth
export const register = (data) => API.post('/auth/register', data);
export const login = (data) => API.post('/auth/login', data);
export const getMe = () => API.get('/auth/me');

// Questions
export const getQuestions = (type, params = {}) => API.get(`/questions/${type}`, { params });
export const getQuestionsSummary = () => API.get('/questions/summary');
export const getAllQuestions = () => API.get('/questions');
export const addQuestion = (data) => API.post('/questions', data);
export const updateQuestion = (id, data) => API.put(`/questions/${id}`, data);
export const deleteQuestion = (id) => API.delete(`/questions/${id}`);

// Admin
export const getAdminUsers = (params = {}) => API.get('/admin/users', { params });
export const deleteAdminUser = (id) => API.delete(`/admin/users/${id}`);

// Interview
export const startInterview = (data) => API.post('/interview/start', data);
export const submitAnswer = (data) => API.post('/interview/submit-answer', data);
export const completeInterview = (data) => API.post('/interview/complete', data);
export const getSessions = () => API.get('/interview/sessions');
export const getSession = (id) => API.get(`/interview/session/${id}`);

// Dashboard
export const getDashboardStats = () => API.get('/dashboard/stats');

export default API;
