import api from './api';

export const orderService = {
  async createOrder(orderData) {
    const response = await api.post('/orders', orderData);
    return response.data;
  },

  async getOrders(page = 1) {
    const response = await api.get('/orders', { params: { page } });
    return response.data;
  },

  async getOrder(id) {
    const response = await api.get(`/orders/${id}`);
    return response.data;
  },

  async trackOrder(id) {
    const response = await api.get(`/orders/${id}/track`);
    return response.data;
  },

  async cancelOrder(id, reason = '') {
    const response = await api.post(`/orders/${id}/cancel`, { reason });
    return response.data;
  },

  async validateCoupon(code, subtotal, restaurantId = 1) {
    const response = await api.post('/coupons/validate', { code, subtotal, restaurant_id: restaurantId });
    return response.data;
  },

  async rateOrder(id, restaurantRating, driverRating, comment = '') {
    const response = await api.post(`/orders/${id}/rate`, {
      restaurant_rating: restaurantRating,
      driver_rating: driverRating,
      restaurant_comment: comment || null, // le backend attend restaurant_comment
    });
    return response.data;
  },
};
