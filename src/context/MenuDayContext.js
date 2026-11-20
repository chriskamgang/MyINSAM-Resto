import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import useMenuDay, { menuDayFromKey } from '../hooks/useMenuDay';

const MenuDayContext = createContext(null);

export function MenuDayProvider({ children }) {
  const today = useMenuDay();
  const [chosenKey, setChosenKey] = useState(null);
  useEffect(() => { if (chosenKey === today.key) setChosenKey(null); }, [chosenKey, today.key]);
  const selectedDay = chosenKey ? menuDayFromKey(chosenKey) : today;
  const value = useMemo(() => ({
    today,
    selectedDay,
    isTodaySelected: selectedDay.key === today.key,
    selectDay: (key) => setChosenKey(key === today.key ? null : key),
    resetDay: () => setChosenKey(null),
  }), [today, selectedDay]);
  return <MenuDayContext.Provider value={value}>{children}</MenuDayContext.Provider>;
}

export function useMenuDaySelection() {
  const value = useContext(MenuDayContext);
  if (!value) throw new Error('useMenuDaySelection requires MenuDayProvider');
  return value;
}
