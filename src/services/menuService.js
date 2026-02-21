import api from './api';

// ID du restaurant (toujours 1 car app dédiée à un seul restaurant)
const RESTAURANT_ID = 1;

export const menuService = {
  async getRestaurant() {
    const response = await api.get(`/restaurants/${RESTAURANT_ID}`);
    return response.data;
  },

  async getMenu() {
    const response = await api.get(`/restaurants/${RESTAURANT_ID}/menu`);
    return response.data; // { restaurant, menu: [{ id, name, items: [] }] }
  },
};
