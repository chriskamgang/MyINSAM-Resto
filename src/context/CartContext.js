import React, { createContext, useContext, useState, useCallback } from 'react';
import { orderService } from '../services/orderService';

const CartContext = createContext({});

export const CartProvider = ({ children }) => {
  const [items, setItems]           = useState([]);
  const [coupon, setCoupon]         = useState(null);
  const [discount, setDiscount]     = useState(0);

  // Ajouter ou incrémenter un article
  const addItem = useCallback((item, quantity = 1) => {
    setItems(prev => {
      const existing = prev.find(i => i.id === item.id);
      if (existing) {
        return prev.map(i => i.id === item.id ? { ...i, quantity: i.quantity + quantity } : i);
      }
      return [...prev, { ...item, quantity }];
    });
  }, []);

  // Décrémenter ou supprimer
  const removeItem = useCallback((itemId) => {
    setItems(prev => {
      const existing = prev.find(i => i.id === itemId);
      if (existing?.quantity > 1) {
        return prev.map(i => i.id === itemId ? { ...i, quantity: i.quantity - 1 } : i);
      }
      return prev.filter(i => i.id !== itemId);
    });
  }, []);

  // Supprimer complètement
  const deleteItem = useCallback((itemId) => {
    setItems(prev => prev.filter(i => i.id !== itemId));
  }, []);

  // Vider le panier
  const clearCart = useCallback(() => {
    setItems([]);
    setCoupon(null);
    setDiscount(0);
  }, []);

  // Appliquer un coupon (appel API)
  const applyCoupon = useCallback(async (code) => {
    const data = await orderService.validateCoupon(code, subtotal);
    setCoupon(data.coupon);
    setDiscount(data.discount_amount || 0);
    return data;
  }, [subtotal]);

  const removeCoupon = useCallback(() => {
    setCoupon(null);
    setDiscount(0);
  }, []);

  // Calculs
  const subtotal    = items.reduce((sum, i) => sum + (i.effective_price ?? i.price) * i.quantity, 0);
  const deliveryFee = subtotal > 0 ? (coupon?.type === 'free_delivery' ? 0 : 500) : 0;
  const total       = Math.max(0, subtotal + deliveryFee - discount);
  const totalItems  = items.reduce((sum, i) => sum + i.quantity, 0);

  return (
    <CartContext.Provider value={{
      items, subtotal, deliveryFee, discount, total, totalItems,
      coupon, addItem, removeItem, deleteItem, clearCart,
      applyCoupon, removeCoupon,
    }}>
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => useContext(CartContext);
