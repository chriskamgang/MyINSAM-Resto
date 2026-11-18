// Favoris (restaurants et plats) synchronisés avec le serveur.
// Mise à jour optimiste : le cœur change tout de suite, et revient en arrière si l'appel échoue.
import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { useAuth } from './AuthContext';
import { favoriteService } from '../services/favoriteService';

const FavoritesContext = createContext({});

export function FavoritesProvider({ children }) {
  const { user } = useAuth();
  const [restaurants, setRestaurants] = useState([]);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!user) { setRestaurants([]); setItems([]); return; }
    setLoading(true);
    try {
      const data = await favoriteService.getFavorites();
      setRestaurants(data?.restaurants || []);
      setItems(data?.items || []);
    } catch (_) {
      // On garde l'état courant si le serveur ne répond pas
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { refresh(); }, [refresh]);

  const isFavorite = useCallback((type, id) => (
    type === 'restaurant' ? restaurants.some((r) => r.id === id) : items.some((i) => i.id === id)
  ), [restaurants, items]);

  // entity : l'objet restaurant ou plat (pour l'afficher dans « Mes favoris » sans recharger)
  // Renvoie false si l'utilisateur n'est pas connecté (l'écran doit alors proposer la connexion)
  const toggleFavorite = useCallback(async (type, entity) => {
    if (!user || !entity?.id) return false;
    const setList = type === 'restaurant' ? setRestaurants : setItems;
    const wasFav = isFavorite(type, entity.id);
    setList((prev) => (wasFav ? prev.filter((x) => x.id !== entity.id) : [entity, ...prev]));
    try {
      const res = await favoriteService.toggle(type, entity.id);
      if (res?.favorited === wasFav) refresh(); // état serveur différent : on resynchronise
    } catch (_) {
      setList((prev) => (wasFav ? [entity, ...prev] : prev.filter((x) => x.id !== entity.id)));
    }
    return true;
  }, [user, isFavorite, refresh]);

  return (
    <FavoritesContext.Provider value={{ restaurants, items, loading, refresh, isFavorite, toggleFavorite }}>
      {children}
    </FavoritesContext.Provider>
  );
}

export const useFavorites = () => useContext(FavoritesContext);
