// Adresse de livraison choisie par l'utilisateur (« Livrer à … » de l'accueil).
// Persistée localement ; utilisée par l'accueil (restaurants proches) et le checkout.
import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';

const STORAGE_KEY = '@delivery_location';
const DEFAULT_CITY = 'Bafoussam';

const DeliveryLocationContext = createContext({});

// location : { label, address, latitude, longitude, addressId, source: 'gps' | 'address' }
export function DeliveryLocationProvider({ children }) {
  const [location, setLocationState] = useState(null);
  const [locating, setLocating] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => { if (raw) setLocationState(JSON.parse(raw)); })
      .catch(() => {});
  }, []);

  const setLocation = useCallback(async (loc) => {
    setLocationState(loc);
    try {
      if (loc) await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(loc));
      else await AsyncStorage.removeItem(STORAGE_KEY);
    } catch (_) {}
  }, []);

  // Choisit une adresse enregistrée du profil
  const selectSavedAddress = useCallback((addr) => setLocation({
    label: addr.label || addr.name || 'Adresse',
    address: addr.address || addr.street || '',
    latitude: addr.latitude ? Number(addr.latitude) : null,
    longitude: addr.longitude ? Number(addr.longitude) : null,
    addressId: addr.id,
    source: 'address',
  }), [setLocation]);

  // Localise l'appareil et remplit l'adresse par géocodage inverse.
  // Renvoie la location, ou lève une erreur lisible.
  const useCurrentPosition = useCallback(async () => {
    setLocating(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') throw new Error("Autorisez l'accès à la position pour vous localiser.");
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const { latitude, longitude } = pos.coords;
      let address = '';
      let city = DEFAULT_CITY;
      try {
        const [geo] = await Location.reverseGeocodeAsync({ latitude, longitude });
        if (geo) {
          city = geo.city || geo.subregion || DEFAULT_CITY;
          address = [geo.name, geo.street, geo.district, city].filter(Boolean)
            .filter((v, i, a) => a.indexOf(v) === i).join(', ');
        }
      } catch (_) {}
      const loc = { label: city, address: address || city, latitude, longitude, addressId: null, source: 'gps' };
      await setLocation(loc);
      return loc;
    } finally {
      setLocating(false);
    }
  }, [setLocation]);

  return (
    <DeliveryLocationContext.Provider
      value={{
        location,
        locating,
        displayLabel: location?.label || DEFAULT_CITY,
        setLocation,
        selectSavedAddress,
        useCurrentPosition,
      }}
    >
      {children}
    </DeliveryLocationContext.Provider>
  );
}

export const useDeliveryLocation = () => useContext(DeliveryLocationContext);

// Distance en km (formule de haversine)
export function distanceKm(a, b) {
  if (!a?.latitude || !b?.latitude) return null;
  const toRad = (d) => (Number(d) * Math.PI) / 180;
  const dLat = toRad(b.latitude - a.latitude);
  const dLon = toRad(b.longitude - a.longitude);
  const h = Math.sin(dLat / 2) ** 2
    + Math.cos(toRad(a.latitude)) * Math.cos(toRad(b.latitude)) * Math.sin(dLon / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}
