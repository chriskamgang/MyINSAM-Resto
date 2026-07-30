import React, { createContext, useContext, useState, useCallback } from 'react';

const MarketContext = createContext();

export function MarketProvider({ children }) {
  const [items, setItems] = useState([]);
  // Each item: { id (uuid), name, quantity, estimatedPrice, note }

  const addItem = useCallback((item) => {
    setItems(prev => [...prev, { ...item, id: Date.now().toString() }]);
  }, []);

  const updateItem = useCallback((id, updates) => {
    setItems(prev => prev.map(item => item.id === id ? { ...item, ...updates } : item));
  }, []);

  const removeItem = useCallback((id) => {
    setItems(prev => prev.filter(item => item.id !== id));
  }, []);

  const clearList = useCallback(() => {
    setItems([]);
  }, []);

  const totalEstimated = items.reduce((sum, item) => sum + (Number(item.estimatedPrice) || 0), 0);
  const totalItems = items.length;

  return (
    <MarketContext.Provider value={{
      items,
      totalItems,
      totalEstimated,
      addItem,
      updateItem,
      removeItem,
      clearList,
    }}>
      {children}
    </MarketContext.Provider>
  );
}

export function useMarket() {
  const context = useContext(MarketContext);
  if (!context) throw new Error('useMarket must be used within MarketProvider');
  return context;
}
