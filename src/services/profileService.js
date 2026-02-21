import api from './api';

export const profileService = {
  async getProfile() {
    const response = await api.get('/profile');
    return response.data;
  },

  async updateProfile(data) {
    const response = await api.put('/profile', data);
    return response.data;
  },

  async getAddresses() {
    const response = await api.get('/profile/addresses');
    return response.data;
  },

  async addAddress(data) {
    const response = await api.post('/profile/addresses', data);
    return response.data;
  },

  async updateAddress(id, data) {
    const response = await api.put(`/profile/addresses/${id}`, data);
    return response.data;
  },

  async deleteAddress(id) {
    const response = await api.delete(`/profile/addresses/${id}`);
    return response.data;
  },

  async getNotifications() {
    const response = await api.get('/notifications');
    return response.data;
  },

  async markNotificationRead(id) {
    const response = await api.post(`/notifications/${id}/read`);
    return response.data;
  },

  async markAllNotificationsRead() {
    const response = await api.post('/notifications/read-all');
    return response.data;
  },

  async setDefaultAddress(id) {
    const response = await api.post(`/profile/addresses/${id}/default`);
    return response.data;
  },
};
