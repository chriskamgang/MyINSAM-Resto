// Design system Estuaire Eat — source unique des couleurs, polices, ombres et espacements.
import { Appearance, Platform, StyleSheet } from 'react-native';

const LIGHT_COLORS = {
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

const DARK_COLORS = {
  ...LIGHT_COLORS,
  primarySoft: '#382117',
  primaryLight: '#56301E',
  bg: '#101014',
  surface: '#1C1C23',
  surfaceAlt: '#28242A',
  text: '#F7F4F1',
  textMuted: '#B9B5BE',
  textLight: '#918D98',
  border: '#39343A',
  divider: '#312D33',
  dark: '#101014',
  successSoft: '#153A29',
  warningSoft: '#403018',
  dangerSoft: '#442322',
  infoSoft: '#1E2C47',
};

export const isDarkMode = () => Appearance.getColorScheme() === 'dark';
export const COLORS = new Proxy(LIGHT_COLORS, {
  get: (_, name) => (isDarkMode() ? DARK_COLORS : LIGHT_COLORS)[name],
});

// Les styles historiques ont été créés à partir de la palette claire. On calcule
// leur variante sombre une fois, puis on choisit celle du système à chaque rendu.
const lightToDark = Object.fromEntries(
  Object.keys(LIGHT_COLORS).map((key) => [LIGHT_COLORS[key].toLowerCase(), DARK_COLORS[key]])
);
const hexRgb = (value) => {
  const hex = value.replace('#', '');
  if (![3, 6].includes(hex.length)) return null;
  const parts = hex.length === 3 ? hex.split('').map((v) => v + v) : hex.match(/.{2}/g);
  return parts.map((v) => parseInt(v, 16));
};
function darkColor(value, property) {
  if (typeof value !== 'string' || !value.startsWith('#')) return value;
  const lower = value.toLowerCase();
  if (property === 'color' && (lower === '#fff' || lower === '#ffffff')) return value;
  if (lower === '#fff' || lower === '#ffffff') {
    return property === 'borderColor' ? DARK_COLORS.border : DARK_COLORS.surface;
  }
  if (lightToDark[lower] && lightToDark[lower] !== value) return lightToDark[lower];
  const rgb = hexRgb(value);
  if (!rgb) return value;
  const [r, g, b] = rgb;
  const min = Math.min(r, g, b);
  const max = Math.max(r, g, b);
  if (property === 'backgroundColor' || property === 'borderColor') {
    if (property === 'borderColor' && min >= 185 && max - min < 85) return DARK_COLORS.border;
    if (min >= 225) return property === 'borderColor' ? DARK_COLORS.border : DARK_COLORS.surface;
    if (min >= 195 && max - min < 30) return DARK_COLORS.surfaceAlt;
  }
  if (property === 'color') {
    if (max <= 75) return DARK_COLORS.text;
    if (max <= 155 && max - min < 60) return DARK_COLORS.textMuted;
  }
  return value;
}
function darkStyle(style) {
  if (!style || typeof style !== 'object') return style;
  return Object.fromEntries(Object.entries(style).map(([key, value]) => [
    key,
    ['color', 'backgroundColor', 'borderColor', 'borderTopColor', 'borderBottomColor', 'borderLeftColor', 'borderRightColor', 'textDecorationColor'].includes(key)
      ? darkColor(value, key === 'color' ? 'color' : key.includes('border') || key.includes('Border') ? 'borderColor' : 'backgroundColor')
      : value,
  ]));
}
export function createThemedStyles(definitions) {
  const light = StyleSheet.create(definitions);
  const dark = StyleSheet.create(Object.fromEntries(
    Object.entries(definitions).map(([name, style]) => [name, darkStyle(style)])
  ));
  return new Proxy(light, { get: (_, name) => (isDarkMode() ? dark : light)[name] });
}

export function themedScreenBackground(value) {
  return isDarkMode() && value !== COLORS.bg ? darkColor(value, 'backgroundColor') : value;
}

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

const LIGHT_TYPE = {
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
export const TYPE = new Proxy(LIGHT_TYPE, {
  get: (_, name) => {
    const type = LIGHT_TYPE[name];
    if (!type || !isDarkMode()) return type;
    return { ...type, color: darkColor(type.color, 'color') };
  },
});

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
