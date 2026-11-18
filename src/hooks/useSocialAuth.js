// Connexion Google / Apple partagée par les écrans Connexion et Inscription.
import { useEffect, useState } from 'react';
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import * as AppleAuthentication from 'expo-apple-authentication';
import { useAuth } from '../context/AuthContext';

WebBrowser.maybeCompleteAuthSession();

const GOOGLE_CLIENT_IDS = {
  androidClientId: '1070472586568-3vfffqq2tcc9kbed4vas1okjnvnal5hm.apps.googleusercontent.com',
  iosClientId: '1070472586568-q700duhak98lua5h6ug6kgpve3dkq3rm.apps.googleusercontent.com',
  webClientId: '1070472586568-njjtn28ulh40e32gd5hslhdckd3a20p0.apps.googleusercontent.com',
};

// onSuccess : appelé après une connexion réussie ; onError(message)
export function useSocialAuth({ onSuccess, onError }) {
  const { googleLogin, appleLogin } = useAuth();
  const [googleLoading, setGoogleLoading] = useState(false);
  const [appleLoading, setAppleLoading] = useState(false);

  // Pas de responseType : sur iOS/Android, Google impose le flux "code" (PKCE),
  // échangé automatiquement contre un id_token par expo-auth-session.
  const [request, response, promptAsync] = Google.useAuthRequest(GOOGLE_CLIENT_IDS);

  useEffect(() => {
    if (response?.type !== 'success') return;
    const idToken = response.params?.id_token || response.authentication?.idToken;
    if (!idToken) {
      onError('Impossible de récupérer le token Google. Réessayez.');
      return;
    }
    (async () => {
      setGoogleLoading(true);
      try {
        await googleLogin(idToken);
        onSuccess();
      } catch (error) {
        onError(error.response?.data?.message || 'Erreur de connexion avec Google.');
      } finally {
        setGoogleLoading(false);
      }
    })();
  }, [response]);

  const signInWithGoogle = () => promptAsync();

  const signInWithApple = async () => {
    setAppleLoading(true);
    try {
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });
      const fullName = credential.fullName
        ? `${credential.fullName.givenName || ''} ${credential.fullName.familyName || ''}`.trim()
        : null;
      await appleLogin({ identityToken: credential.identityToken, fullName, email: credential.email });
      onSuccess();
    } catch (error) {
      if (error.code !== 'ERR_REQUEST_CANCELED') {
        onError(error.response?.data?.message || 'Erreur de connexion avec Apple.');
      }
    } finally {
      setAppleLoading(false);
    }
  };

  return {
    googleReady: !!request,
    googleLoading,
    appleLoading,
    signInWithGoogle,
    signInWithApple,
  };
}

// Message d'erreur lisible pour les appels réseau
export function networkErrorMessage(error, fallback) {
  return error.response?.data?.message
    || (error.code === 'ECONNABORTED' ? 'Le serveur met trop de temps à répondre. Vérifiez votre connexion.'
      : error.message?.includes('Network Error') ? 'Impossible de se connecter au serveur. Vérifiez votre connexion internet.'
        : fallback);
}
