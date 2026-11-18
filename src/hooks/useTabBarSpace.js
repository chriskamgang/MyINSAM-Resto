// Hauteur réelle de la barre d'onglets : elle dépend de la zone système du bas
// (boutons de navigation Android, barre d'accueil iPhone). Les barres d'onglets
// et les écrans à onglets doivent utiliser ces valeurs plutôt qu'une hauteur fixe.
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export const TAB_BAR_CONTENT_HEIGHT = 62;

export const tabBarHeight = (insets) => TAB_BAR_CONTENT_HEIGHT + Math.max(insets.bottom, 10);

// Espace à laisser en bas d'un écran à onglets pour que rien ne passe sous la barre
export function useTabBarSpace(extra = 24) {
  const insets = useSafeAreaInsets();
  return tabBarHeight(insets) + extra;
}
