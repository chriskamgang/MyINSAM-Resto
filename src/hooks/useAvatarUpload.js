import { showAlert } from '../utils/showAlert';
// Choix (galerie ou appareil photo) puis envoi de la photo de profil.
import { useState } from 'react';
import { Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../context/AuthContext';
import { profileService } from '../services/profileService';

export function useAvatarUpload() {
  const { user, updateUser } = useAuth();
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState(null); // affichage immédiat pendant l'envoi

  const upload = async (uri) => {
    setPreview(uri);
    setUploading(true);
    try {
      const res = await profileService.uploadAvatar(uri);
      await updateUser({ ...user, avatar: res.avatar });
    } catch (error) {
      setPreview(null);
      const msg = error.response?.status === 422
        ? 'Image refusée : choisissez une photo de moins de 3 Mo.'
        : "La photo n'a pas pu être envoyée. Vérifiez votre connexion et réessayez.";
      showAlert('Photo de profil', msg);
    } finally {
      setUploading(false);
    }
  };

  const pick = async (source) => {
    const perm = source === 'camera'
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      showAlert('Autorisation requise', source === 'camera'
        ? "Autorisez l'accès à l'appareil photo dans les réglages du téléphone."
        : "Autorisez l'accès à vos photos dans les réglages du téléphone.");
      return;
    }
    const options = { mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 0.6 };
    const result = source === 'camera'
      ? await ImagePicker.launchCameraAsync(options)
      : await ImagePicker.launchImageLibraryAsync(options);
    if (!result.canceled && result.assets?.[0]?.uri) upload(result.assets[0].uri);
  };

  // Propose galerie ou appareil photo
  const chooseAvatar = () => {
    showAlert('Photo de profil', 'Choisissez une source', [
      { text: 'Galerie', onPress: () => pick('library') },
      { text: 'Appareil photo', onPress: () => pick('camera') },
      { text: 'Annuler', style: 'cancel' },
    ]);
  };

  return { chooseAvatar, uploading, preview };
}
