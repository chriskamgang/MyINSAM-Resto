import api from './api';

export const marketService = {
  // Get market service fee (from admin config)
  async getServiceFee() {
    const response = await api.get('/market/service-fee');
    return response.data;
  },

  // Create a market order
  async createOrder(orderData) {
    // orderData: { items: [{name, quantity, estimated_price, note}], delivery_address, delivery_address_id, payment_method ('mobile_money'|'on_delivery'), phone }
    const response = await api.post('/market-orders', orderData);
    return response.data;
  },

  // Get all market orders for current user
  async getOrders() {
    const response = await api.get('/market-orders');
    return response.data;
  },

  // Get single market order detail
  async getOrder(id) {
    const response = await api.get(`/market-orders/${id}`);
    return response.data;
  },

  // Track a market order
  async trackOrder(id) {
    const response = await api.get(`/market-orders/${id}/track`);
    return response.data;
  },

  // Client validates courier photos (approve or request changes)
  async validatePhotos(id, { approved, note }) {
    // approved: boolean, note: string (if changes requested)
    const response = await api.post(`/market-orders/${id}/validate`, { approved, note });
    return response.data;
  },

  // Cancel a market order
  async cancelOrder(id, reason = '') {
    const response = await api.post(`/market-orders/${id}/cancel`, { reason });
    return response.data;
  },

  // Initiate mobile money payment for a market order
  async initiatePayment(orderId, { phone, method }) {
    const response = await api.post(`/market-orders/${orderId}/pay`, { phone, method });
    return response.data;
  },

  // Check payment status
  async checkPaymentStatus(orderId) {
    const response = await api.get(`/market-orders/${orderId}/payment-status`);
    return response.data;
  },
};
