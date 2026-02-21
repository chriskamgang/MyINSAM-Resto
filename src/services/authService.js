import api from './api';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const authService = {
  async login(email, password) {
    const response = await api.post('/auth/login', { email, password });
    const { token, user } = response.data;
    await AsyncStorage.setItem('token', token);
    await AsyncStorage.setItem('user', JSON.stringify(user));
    return { token, user };
  },

  async register(name, email, phone, password) {
    const response = await api.post('/auth/register', { name, email, phone, password, password_confirmation: password });
    const { token, user } = response.data;
    await AsyncStorage.setItem('token', token);
    await AsyncStorage.setItem('user', JSON.stringify(user));
    return { token, user };
  },

  async logout() {
    try {
      await api.post('/auth/logout');
    } catch (_) {}
    await AsyncStorage.multiRemove(['token', 'user']);
  },

  async me() {
    const response = await api.get('/auth/me');
    return response.data;
  },

  async getStoredUser() {
    const user = await AsyncStorage.getItem('user');
    const token = await AsyncStorage.getItem('token');
    return { user: user ? JSON.parse(user) : null, token };
  },
};
