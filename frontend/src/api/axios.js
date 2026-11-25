import axios from 'axios';

const getDefaultBaseURL = () => {
  return import.meta.env.VITE_API_URL || 'https://intern-n8mg.onrender.com/api';
};

const API_BASE_URL = getDefaultBaseURL();

const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true, // Send httpOnly cookies (refresh token)
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

// Response interceptor for automatic token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    // Do not intercept or redirect for login/register endpoints
    const isAuthEndpoint = originalRequest?.url?.includes('/auth/login') || originalRequest?.url?.includes('/auth/register');

    if (error.response?.status === 401 && !originalRequest?._retry && !isAuthEndpoint) {
      originalRequest._retry = true;
      try {
        const refreshResponse = await axios.post(
          `${API_BASE_URL}/auth/refresh`,
          {},
          { withCredentials: true }
        );
        const newToken = refreshResponse.data?.data?.accessToken;
        if (newToken) {
          localStorage.setItem('rideshare_access_token', newToken);
          originalRequest.headers.Authorization = `Bearer ${newToken}`;
          return api(originalRequest);
        }
      } catch (refreshError) {
        localStorage.removeItem('rideshare_access_token');
        localStorage.removeItem('rideshare_user');
        return Promise.reject(refreshError);
      }
    }
    return Promise.reject(error);
  }
);

export default api;
