import axios from 'axios';

// Create axios instance
const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  login: (credentials) => api.post('/auth/login', credentials),
  getMe: () => api.get('/auth/me'),
  changePassword: (data) => api.post('/auth/change-password', data),
};

// Items API
export const itemsAPI = {
  getAll: (params) => api.get('/items', { params }),
  getById: (id) => api.get(`/items/${id}`),
  create: (data) => api.post('/items', data),
  update: (id, data) => api.put(`/items/${id}`, data),
  delete: (id) => api.delete(`/items/${id}`),
  getStats: () => api.get('/items/stats/overview'),
};

// Transactions API
export const transactionsAPI = {
  getAll: (params) => api.get('/transactions', { params }),
  getMyHistory: (params) => api.get('/transactions/my-history', { params }),
  checkout: (data) => api.post('/transactions/checkout', data),
  checkin: (data) => api.post('/transactions/checkin', data),
  getStats: () => api.get('/transactions/stats'),
};

// Labels API
export const labelsAPI = {
  getAll: (params) => api.get('/labels', { params }),
  getByItem: (itemId) => api.get(`/labels/item/${itemId}`),
  generate: (itemId, data) => api.post(`/labels/generate/${itemId}`, data),
  download: (filename) => api.get(`/labels/download/${filename}`, { responseType: 'blob' }),
  delete: (id) => api.delete(`/labels/${id}`),
  getQRPreview: (qrCode) => api.get(`/labels/qr-preview/${qrCode}`, { responseType: 'blob' }),
};

// Users API
export const usersAPI = {
  getAll: (params) => api.get('/users', { params }),
  getById: (id) => api.get(`/users/${id}`),
  create: (data) => api.post('/users', data),
  update: (id, data) => api.put(`/users/${id}`, data),
  delete: (id) => api.delete(`/users/${id}`),
  resetPassword: (id, data) => api.post(`/users/${id}/reset-password`, data),
  getStats: () => api.get('/users/stats/overview'),
};

// Health check
export const healthAPI = {
  check: () => api.get('/health'),
};

export default api; 