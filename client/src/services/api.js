import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL;
console.log('API Base URL:', API_BASE_URL);

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests
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

// Handle authentication errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  login: (username, password) => 
    api.post('/auth/login', { username, password }),
  
  init: () => 
    api.post('/auth/init'),
};

// Students API
export const studentsAPI = {
  getAll: () => 
    api.get('/students'),
  
  getByBarcode: (barcode) => 
    api.get(`/students/barcode/${barcode}`),
  
  getById: (id) => 
    api.get(`/students/${id}`),
  
  create: (studentData) => 
    api.post('/students', studentData),
  
  update: (id, studentData) => 
    api.put(`/students/${id}`, studentData),
  
  delete: (id) => 
    api.delete(`/students/${id}`),
  
  getClasses: () => 
    api.get('/students/classes/available'),
  
  getByClass: (className) => 
    api.get(`/students/class/${className}`),
  
  search: (name) => 
    api.get(`/students/search/${name}`),
  
  uploadCSV: (formData) => 
    api.post('/students/upload-csv', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    }),

  uploadPhoto: (id, formData) =>
    api.post(`/students/${id}/photo`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    }),

  deletePhoto: (id) =>
    api.delete(`/students/${id}/photo`),

  getPhotoUrl: (filename) =>
    `${API_BASE_URL}/students/photo/${filename}`,

  uploadSound: (id, formData) =>
    api.post(`/students/${id}/sound`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    }),

  deleteSound: (id) =>
    api.delete(`/students/${id}/sound`),

  getSoundUrl: (filename) =>
    `${API_BASE_URL}/students/sound/${filename}`,
};

  
// Dismissal API
export const dismissalAPI = {
  checkIn: (barcode) => 
    api.post('/dismissal/check-in', { barcode }),
  
  checkOut: (barcode) => 
    api.post('/dismissal/check-out', { barcode }),
  
  getActive: () => 
    api.get('/dismissal/active'),
  
  getLogs: (limit = 50) => 
    api.get(`/dismissal/logs?limit=${limit}`),
  
  getToday: () => 
    api.get('/dismissal/today'),
  
  getHistory: (studentId, limit = 20) => 
    api.get(`/dismissal/history/${studentId}?limit=${limit}`),
  
  clearActive: () => 
    api.delete('/dismissal/active/clear'),
  
  getStatus: (barcode) => 
    api.get(`/dismissal/status/${barcode}`),
};

// Users API
export const usersAPI = {
  getAll: () => 
    api.get('/users'),
  
  getById: (id) => 
    api.get(`/users/${id}`),
  
  create: (userData) => 
    api.post('/auth/create-user', userData),
  
  delete: (id) => 
    api.delete(`/users/${id}`),
};


export default api;
