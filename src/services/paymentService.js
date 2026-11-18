import api from './api';

export const paymentService = {
  /**
   * Initialiser un paiement mobile money
   * @param {Object} data - { order_id, phone, payment_method }
   * @returns {Promise}
   */
  async initiateMobilePayment(data) {
    const response = await api.post('/payments/initiate-mobile', data);
    return response.data;
  },

  /**
   * Vérifier le statut d'un paiement
   * @param {number} paymentId
   * @returns {Promise}
   */
  async initiateGfsPayment(orderId) {
    // Crée le lien de paiement GFS (le client valide avec son N° client + PIN)
    const response = await api.post('/payments/initiate-gfs', { order_id: orderId });
    return response.data;
  },

  async checkPaymentStatus(paymentId) {
    const response = await api.get(`/payments/${paymentId}/status`);
    return response.data;
  },
};
