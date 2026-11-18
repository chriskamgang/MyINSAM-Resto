// Mises à jour EAS Update : l'app vérifie au démarrage (réglage app.json) ET à chaque
// retour au premier plan. La mise à jour est téléchargée en arrière-plan et s'applique
// à la prochaine ouverture, sans couper ce que fait le client.
import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import * as Updates from 'expo-updates';

const MIN_INTERVAL_MS = 10 * 60 * 1000; // pas plus d'une vérification toutes les 10 min

export function useOtaUpdates() {
  const lastCheck = useRef(0);

  useEffect(() => {
    if (__DEV__ || !Updates.isEnabled) return undefined;

    const check = async () => {
      if (Date.now() - lastCheck.current < MIN_INTERVAL_MS) return;
      lastCheck.current = Date.now();
      try {
        const res = await Updates.checkForUpdateAsync();
        if (res.isAvailable) await Updates.fetchUpdateAsync();
      } catch (_) {
        // hors ligne ou serveur indisponible : on réessaiera plus tard
      }
    };

    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') check();
    });
    return () => sub.remove();
  }, []);
}
