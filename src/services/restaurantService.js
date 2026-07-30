import api from './api';

export const restaurantService = {
  // Liste tous les restaurants (paginé, filtrable)
  async getRestaurants({ search, category, sort, page = 1 } = {}) {
    const params = { page };
    if (search) params.search = search;
    if (category) params.category = category;
    if (sort) params.sort = sort;
    const response = await api.get('/restaurants', { params });
    return response.data;
  },

  // Restaurants en vedette
  async getFeatured() {
    const response = await api.get('/restaurants/featured');
    return response.data;
  },

  // Catégories de restaurants
  async getCategories() {
    const response = await api.get('/restaurants/categories');
    return response.data;
  },

  // Détails d'un restaurant
  async getRestaurant(id) {
    const response = await api.get(`/restaurants/${id}`);
    return response.data;
  },

  // Menu d'un restaurant
  async getMenu(restaurantId) {
    const response = await api.get(`/restaurants/${restaurantId}/menu`);
    return response.data;
  },
};
