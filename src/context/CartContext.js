import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { Alert } from 'react-native';
import { orderService } from '../services/orderService';

const CartContext = createContext({});

// Clé d'une ligne du panier : un même plat avec des options différentes = deux lignes
const lineKey = (item) => {
  const opts = item.selected_options && Object.keys(item.selected_options).length
    ? JSON.stringify(item.selected_options) : '';
  return `${item.id}|${opts}`;
};

export const CartProvider = ({ children }) => {
  const [items, setItems]               = useState([]);
  const [restaurant, setRestaurant]     = useState(null); // restaurant actuel du panier
  const [coupon, setCoupon]             = useState(null);
  const [discount, setDiscount]         = useState(0);

  // Ajouter un article (vérifie que c'est le même restaurant)
  const addItem = useCallback((item, quantity = 1, itemRestaurant = null) => {
    // Si un restaurant est fourni et qu'il diffère du panier actuel
    if (itemRestaurant && restaurant && itemRestaurant.id !== restaurant.id) {
      return new Promise((resolve) => {
        Alert.alert(
          'Changer de restaurant ?',
          `Votre panier contient des articles de "${restaurant.name}". Voulez-vous vider le panier et commander chez "${itemRestaurant.name}" ?`,
          [
            { text: 'Annuler', style: 'cancel', onPress: () => resolve(false) },
            {
              text: 'Vider et ajouter',
              style: 'destructive',
              onPress: () => {
                setItems([{ ...item, cart_key: lineKey(item), quantity }]);
                setRestaurant(itemRestaurant);
                setCoupon(null);
                setDiscount(0);
                resolve(true);
              },
            },
          ]
        );
      });
    }

    // Mettre à jour le restaurant si pas encore défini
    if (itemRestaurant && !restaurant) {
      setRestaurant(itemRestaurant);
    }

    const key = item.cart_key || lineKey(item);
    setItems(prev => {
      const existing = prev.find(i => i.cart_key === key);
      if (existing) {
        return prev.map(i => i.cart_key === key ? { ...i, quantity: i.quantity + quantity } : i);
      }
      return [...prev, { ...item, cart_key: key, quantity }];
    });
    return Promise.resolve(true);
  }, [restaurant]);

  // Décrémenter ou supprimer
  const matches = (i, keyOrId) => i.cart_key === keyOrId || (typeof keyOrId === 'number' && i.id === keyOrId);

  const removeItem = useCallback((keyOrId) => {
    setItems(prev => {
      const existing = prev.find(i => matches(i, keyOrId));
      if (existing?.quantity > 1) {
        return prev.map(i => i === existing ? { ...i, quantity: i.quantity - 1 } : i);
      }
      const newItems = prev.filter(i => i !== existing);
      if (newItems.length === 0) setRestaurant(null);
      return newItems;
    });
  }, []);

  // Supprimer complètement
  const deleteItem = useCallback((keyOrId) => {
    setItems(prev => {
      const newItems = prev.filter(i => !matches(i, keyOrId));
      if (newItems.length === 0) setRestaurant(null);
      return newItems;
    });
  }, []);

  // Vider le panier
  const clearCart = useCallback(() => {
    setItems([]);
    setRestaurant(null);
    setCoupon(null);
    setDiscount(0);
  }, []);

  const subtotal = items.reduce((sum, i) => sum + (Number(i.effective_price ?? i.price) || 0) * i.quantity, 0);

  // Un coupon validé pour un ancien montant doit être revalidé si le panier change.
  useEffect(() => {
    setCoupon(null);
    setDiscount(0);
  }, [items]);

  // Appliquer un coupon
  const applyCoupon = useCallback(async (code) => {
    const restaurantId = restaurant?.id || 1;
    const data = await orderService.validateCoupon(code, subtotal, restaurantId);
    setCoupon(data.coupon);
    setDiscount(Number(data.discount ?? data.discount_amount) || 0); // le serveur renvoie « discount »
    return data;
  }, [restaurant, subtotal]);

  const removeCoupon = useCallback(() => {
    setCoupon(null);
    setDiscount(0);
  }, []);

  // Calculs
  const deliveryFee = subtotal > 0 ? (coupon?.type === 'free_delivery' ? 0 : Number(restaurant?.delivery_fee ?? 500)) : 0;
  const total       = Math.max(0, subtotal + deliveryFee - discount);
  const totalItems  = items.reduce((sum, i) => sum + i.quantity, 0);

  return (
    <CartContext.Provider value={{
      items, subtotal, deliveryFee, discount, total, totalItems,
      coupon, restaurant,
      addItem, removeItem, deleteItem, clearCart,
      applyCoupon, removeCoupon,
    }}>
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => useContext(CartContext);
