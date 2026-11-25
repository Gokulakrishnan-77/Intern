import api from './axios';

// ================= AUTH API =================
export const authApi = {
  login: async (email, password) => {
    const res = await api.post('/auth/login', { email, password });
    if (res.data.token) {
      localStorage.setItem('rideshare_access_token', res.data.token);
      localStorage.setItem('rideshare_user', JSON.stringify(res.data.user));
    }
    return res.data;
  },

  register: async (userData) => {
    const res = await api.post('/auth/register', userData);
    if (res.data.token) {
      localStorage.setItem('rideshare_access_token', res.data.token);
      localStorage.setItem('rideshare_user', JSON.stringify(res.data.user));
    }
    return res.data;
  },

  getMe: async () => {
    const res = await api.get('/auth/me');
    return res.data;
  },

  logout: () => {
    localStorage.removeItem('rideshare_access_token');
    localStorage.removeItem('rideshare_user');
  },
};

// ================= RIDES API =================
export const ridesApi = {
  getRides: async (params = {}) => {
    const res = await api.get('/rides', { params });
    return res.data;
  },

  publishRide: async (rideData) => {
    const res = await api.post('/rides', rideData);
    return res.data;
  },

  getMyRides: async () => {
    const res = await api.get('/rides/my-rides');
    return res.data;
  },
};

// ================= BOOKINGS API =================
export const bookingsApi = {
  bookSeat: async (bookingData) => {
    const res = await api.post('/bookings', bookingData);
    return res.data;
  },

  getMyBookings: async () => {
    const res = await api.get('/bookings/my-bookings');
    return res.data;
  },

  getDriverBookings: async () => {
    const res = await api.get('/bookings/driver-bookings');
    return res.data;
  },
};

// ================= DRIVER API =================
export const driverApi = {
  submitVerification: async (verificationData) => {
    const res = await api.post('/driver/verify', verificationData);
    return res.data;
  },

  getVerificationStatus: async () => {
    const res = await api.get('/driver/status');
    return res.data;
  },
};

// ================= ADMIN API (KRISH) =================
export const adminApi = {
  getPendingDrivers: async () => {
    const res = await api.get('/admin/pending-drivers');
    return res.data;
  },

  approveDriver: async (id) => {
    const res = await api.put(`/admin/drivers/${id}/approve`);
    return res.data;
  },

  rejectDriver: async (id) => {
    const res = await api.put(`/admin/drivers/${id}/reject`);
    return res.data;
  },

  getAllUsers: async () => {
    const res = await api.get('/admin/users');
    return res.data;
  },

  toggleUserStatus: async (userId) => {
    const res = await api.put(`/admin/users/${userId}/toggle-status`);
    return res.data;
  },

  getSafetyReports: async () => {
    const res = await api.get('/admin/reports');
    return res.data;
  },

  createSafetyReport: async (reportData) => {
    const res = await api.post('/admin/reports', reportData);
    return res.data;
  },

  resolveSafetyReport: async (reportId) => {
    const res = await api.put(`/admin/reports/${reportId}/resolve`);
    return res.data;
  },
};

export default {
  auth: authApi,
  rides: ridesApi,
  bookings: bookingsApi,
  driver: driverApi,
  admin: adminApi,
};
