// Design system Estuaire Eat — source unique des couleurs, polices, ombres et espacements.
import { Platform } from 'react-native';

export const COLORS = {
  primary:      '#FF6B35',
  primaryDark:  '#E8541C',
  primarySoft:  '#FFF1EA', // fonds de pastilles / icônes
  primaryLight: '#FFE2D3',
  secondary:    '#FF8E53',

  bg:         '#FFF9F5', // fond crème des écrans
  surface:    '#FFFFFF', // cartes
  surfaceAlt: '#FFF4EC',

  text:      '#1B1B29',
  textMuted: '#6B6B7B',
  textLight: '#A3A3B2',
  border:    '#F1E7E0',
  divider:   '#F4EEE9',

  dark: '#14141F', // fonds sombres (connexion, bannières)

  success:     '#16A34A',
  successSoft: '#E8F7EE',
  warning:     '#F59E0B',
  warningSoft: '#FFF6E0',
  danger:      '#E53935',
  dangerSoft:  '#FDECEC',
  info:        '#2563EB',
  infoSoft:    '#EAF1FE',
  star:        '#FFB020',

  white:   '#FFFFFF',
  black:   '#000000',
  overlay: 'rgba(20,20,31,0.55)',
};

export const GRADIENTS = {
  primary:  ['#FF7A45', '#FF5A1F'],
  darkFade: ['transparent', 'rgba(0,0,0,0.75)'],
};

// Poppins est chargée dans App.js. Toujours utiliser fontFamily (pas fontWeight) :
// sur Android, fontWeight + police custom retombe sur la police système.
export const FONTS = {
  regular:   'Poppins_400Regular',
  medium:    'Poppins_500Medium',
  semibold:  'Poppins_600SemiBold',
  bold:      'Poppins_700Bold',
  extrabold: 'Poppins_800ExtraBold',
};

export const TYPE = {
  h1:        { fontFamily: FONTS.bold, fontSize: 26, lineHeight: 34, color: COLORS.text },
  h2:        { fontFamily: FONTS.bold, fontSize: 20, lineHeight: 28, color: COLORS.text },
  h3:        { fontFamily: FONTS.semibold, fontSize: 17, lineHeight: 24, color: COLORS.text },
  title:     { fontFamily: FONTS.semibold, fontSize: 15, lineHeight: 22, color: COLORS.text },
  body:      { fontFamily: FONTS.regular, fontSize: 14, lineHeight: 21, color: COLORS.text },
  bodyMuted: { fontFamily: FONTS.regular, fontSize: 14, lineHeight: 21, color: COLORS.textMuted },
  caption:   { fontFamily: FONTS.regular, fontSize: 12, lineHeight: 17, color: COLORS.textMuted },
  label:     { fontFamily: FONTS.medium, fontSize: 13, lineHeight: 18, color: COLORS.text },
  button:    { fontFamily: FONTS.semibold, fontSize: 16, lineHeight: 22 },
  price:     { fontFamily: FONTS.bold, fontSize: 16, lineHeight: 22, color: COLORS.primary },
};

export const SPACING = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 24, xxxl: 32 };
export const SCREEN_PADDING = 20;

// Espace sous les écrans à onglets : voir useTabBarSpace() (src/hooks/useTabBarSpace.js)

export const RADIUS = { sm: 10, md: 14, lg: 18, xl: 24, xxl: 32, pill: 999 };

const shadow = (elevation, opacity, radius, offsetY, color = '#5A3A28') =>
  Platform.select({
    ios: { shadowColor: color, shadowOpacity: opacity, shadowRadius: radius, shadowOffset: { width: 0, height: offsetY } },
    android: { elevation, shadowColor: color },
    default: {},
  });

export const SHADOWS = {
  sm: shadow(2, 0.06, 6, 2),
  md: shadow(4, 0.08, 12, 4),
  lg: shadow(8, 0.12, 20, 8),
  primary: shadow(8, 0.35, 14, 6, '#FF6B35'),
};

// Formatage monétaire unique : « 2 500 FCFA »
export function formatPrice(value) {
  const n = Math.round(Number(value) || 0);
  return `${n.toLocaleString('fr-FR').replace(/[  ]/g, ' ')} FCFA`;
}
