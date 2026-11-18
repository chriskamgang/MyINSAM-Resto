import api from './api';

export const restoDashboardService = {
  async getDashboard() {
    const response = await api.get('/restaurant/dashboard');
    return response.data;
  },

  async getOrders(status = null, page = 1) {
    const params = { page };
    if (status) params.status = status;
    const response = await api.get('/restaurant/orders', { params });
    return response.data;
  },

  async getOrder(id) {
    const response = await api.get(`/restaurant/orders/${id}`);
    return response.data;
  },

  async updateOrderStatus(id, status) {
    const response = await api.post(`/restaurant/orders/${id}/status`, { status });
    return response.data;
  },

  async toggleOpen(isOpen) {
    const response = await api.post('/restaurant/toggle-open', { is_open: isOpen });
    return response.data;
  },
};
