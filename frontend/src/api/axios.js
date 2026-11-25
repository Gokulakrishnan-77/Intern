import axios from 'axios';

const getDefaultBaseURL = () => {
  return import.meta.env.VITE_API_URL || 'https://intern-n8mg.onrender.com';
};

const API_BASE_URL = getDefaultBaseURL();

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to attach access token if stored in memory/storage
api.interceptors.request.use(
  (config) => {
    let token = localStorage.getItem('rideshare_access_token');
    const userStr = localStorage.getItem('rideshare_user');
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        if (user.email) {
          config.headers['x-user-email'] = user.email;
        }
        if (!token) {
          if (user.role === 'admin') {
            token = 'admin_krish_token';
            localStorage.setItem('rideshare_access_token', token);
          } else if (user.role === 'driver') {
            token = 'driver_harish_token';
            localStorage.setItem('rideshare_access_token', token);
          }
        }
      } catch (e) {}
    }
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor for handling auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // If token expired or unauthorized on protected routes, clear session
    if (error.response?.status === 401) {
      const isAuthEndpoint =
        error.config?.url?.includes('/auth/login') ||
        error.config?.url?.includes('/auth/register');
      if (!isAuthEndpoint) {
        localStorage.removeItem('rideshare_access_token');
        localStorage.removeItem('rideshare_user');
      }
    }
    return Promise.reject(error);
  }
);

export default api;
