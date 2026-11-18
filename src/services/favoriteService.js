import api from './api';

export const favoriteService = {
  // { restaurants: [...], items: [...] }
  async getFavorites() {
    const response = await api.get('/favorites');
    return response.data;
  },

  // type : 'restaurant' | 'item' → { favorited: bool }
  async toggle(type, id) {
    const response = await api.post('/favorites/toggle', { type, id });
    return response.data;
  },
};
