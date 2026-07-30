import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

// URL de base — toujours production
export const SERVER_URL = 'https://estuaireeat.com';

const BASE_URL = `${SERVER_URL}/api`;

export function getImageUrl(image) {
  if (!image) return null;
  if (image.startsWith('http://') || image.startsWith('https://')) return image;
  return `${SERVER_URL}/storage/${image}`;
}

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
});

// Intercepteur requête : ajoute le token automatiquement
api.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Callback pour notifier l'app d'une deconnexion forcee
let onUnauthorized = null;
export function setOnUnauthorized(callback) {
  onUnauthorized = callback;
}

// Intercepteur reponse : gere les erreurs globalement
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      // Token expire — supprimer les credentials et notifier l'app
      await AsyncStorage.multiRemove(['token', 'user']);
      if (onUnauthorized) onUnauthorized();
    }
    return Promise.reject(error);
  }
);

export default api;
