import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { orderService } from '../services/orderService';

const CartContext = createContext({});
const lineKey = (item, restaurantId) => `${restaurantId}|${item.id}|${item.selected_options && Object.keys(item.selected_options).length ? JSON.stringify(item.selected_options) : ''}`;
const priceOf = (item) => (Number(item.effective_price ?? item.price) || 0) * item.quantity;

export const CartProvider = ({ children }) => {
  const [items, setItems] = useState([]);
  const [coupon, setCoupon] = useState(null);
  const [couponRestaurantId, setCouponRestaurantId] = useState(null);
  const [discount, setDiscount] = useState(0);

  const addItem = useCallback((item, quantity = 1, itemRestaurant = null) => {
    const restaurant = itemRestaurant || item._cartRestaurant || item._restaurant;
    const restaurantId = restaurant?.id ?? item.restaurant_id;
    if (!restaurantId) return Promise.resolve(false);
    const key = lineKey(item, restaurantId);
    setItems((previous) => {
      const existing = previous.find((entry) => entry.cart_key === key);
      if (existing) return previous.map((entry) => entry.cart_key === key ? { ...entry, quantity: entry.quantity + quantity } : entry);
      return [...previous, { ...item, _cartRestaurant: restaurant, cart_key: key, quantity }];
    });
    return Promise.resolve(true);
  }, []);

  const matches = (item, keyOrId) => item.cart_key === keyOrId || (typeof keyOrId === 'number' && item.id === keyOrId);
  const removeItem = useCallback((keyOrId) => setItems((previous) => {
    const item = previous.find((entry) => matches(entry, keyOrId));
    if (!item) return previous;
    return item.quantity > 1
      ? previous.map((entry) => entry === item ? { ...entry, quantity: entry.quantity - 1 } : entry)
      : previous.filter((entry) => entry !== item);
  }), []);
  const deleteItem = useCallback((keyOrId) => setItems((previous) => previous.filter((entry) => !matches(entry, keyOrId))), []);
  const clearCart = useCallback(() => { setItems([]); setCoupon(null); setCouponRestaurantId(null); setDiscount(0); }, []);
  const clearRestaurant = useCallback((restaurantId) => {
    setItems((previous) => previous.filter((entry) => String(entry._cartRestaurant?.id ?? entry.restaurant_id) !== String(restaurantId)));
    setCoupon(null); setCouponRestaurantId(null); setDiscount(0);
  }, []);

  const groupMap = new Map();
  items.forEach((item) => {
    const restaurant = item._cartRestaurant || item._restaurant;
    const id = String(restaurant?.id ?? item.restaurant_id);
    if (!groupMap.has(id)) groupMap.set(id, { restaurant, items: [], subtotal: 0, deliveryFee: Number(restaurant?.delivery_fee ?? 500) });
    const group = groupMap.get(id);
    group.items.push(item);
    group.subtotal += priceOf(item);
  });
  const groups = [...groupMap.values()];
  const restaurant = groups[0]?.restaurant || null;
  const subtotal = groups.reduce((sum, group) => sum + group.subtotal, 0);
  const deliveryFee = groups.reduce((sum, group) => sum + (coupon?.type === 'free_delivery' && String(group.restaurant?.id) === String(couponRestaurantId) ? 0 : group.deliveryFee), 0);
  const total = Math.max(0, subtotal + deliveryFee - discount);
  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);

  useEffect(() => { setCoupon(null); setCouponRestaurantId(null); setDiscount(0); }, [items]);
  const applyCoupon = useCallback(async (code, restaurantId) => {
    const group = groups.find((entry) => String(entry.restaurant?.id) === String(restaurantId));
    if (!group) throw new Error('Choisissez un restaurant pour ce code promo.');
    const data = await orderService.validateCoupon(code, group.subtotal, group.restaurant.id);
    setCoupon(data.coupon);
    setCouponRestaurantId(group.restaurant.id);
    setDiscount(Number(data.discount ?? data.discount_amount) || 0);
    return data;
  }, [groups]);
  const removeCoupon = useCallback(() => { setCoupon(null); setCouponRestaurantId(null); setDiscount(0); }, []);

  return <CartContext.Provider value={{ items, groups, restaurant, subtotal, deliveryFee, discount, total, totalItems,
    coupon, couponRestaurantId, addItem, removeItem, deleteItem, clearCart, clearRestaurant, applyCoupon, removeCoupon }}>
    {children}
  </CartContext.Provider>;
};

export const useCart = () => useContext(CartContext);
