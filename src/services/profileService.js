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

  // Envoie la photo de profil (multipart). uri = fichier local choisi par l'utilisateur
  async uploadAvatar(uri) {
    const name = uri.split('/').pop() || 'avatar.jpg';
    const ext = (name.split('.').pop() || 'jpg').toLowerCase();
    const form = new FormData();
    form.append('avatar', { uri, name, type: `image/${ext === 'jpg' ? 'jpeg' : ext}` });
    const response = await api.post('/profile/avatar', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 60000,
    });
    return response.data; // { message, avatar }
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

  async deleteAccount() {
    const response = await api.delete('/account');
    return response.data;
  },
};
