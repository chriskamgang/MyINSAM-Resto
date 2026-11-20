// Composants UI partagés Estuaire Eat. Tous les écrans s'appuient dessus
// pour garder un design cohérent (voir src/theme).
import React, { useEffect, useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, Image, ActivityIndicator,
  StyleSheet, StatusBar, Pressable,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONTS, TYPE, RADIUS, SHADOWS, GRADIENTS, SCREEN_PADDING } from '../../theme';
import { getImageUrl } from '../../services/api';

// ── Screen : conteneur d'écran avec safe area et fond crème ──
// edges : quels bords protéger ('top', 'bottom'). Par défaut seulement le haut,
// la barre d'onglets gère le bas.
export function Screen({ children, style, edges = ['top'], bg = COLORS.bg, statusBar = 'dark-content' }) {
  const insets = useSafeAreaInsets();
  return (
    <View
      style={[
        { flex: 1, backgroundColor: bg },
        edges.includes('top') && { paddingTop: insets.top },
        edges.includes('bottom') && { paddingBottom: insets.bottom },
        style,
      ]}
    >
      <StatusBar barStyle={statusBar} backgroundColor="transparent" translucent />
      {children}
    </View>
  );
}

// ── En-tête d'écran secondaire : retour + titre + action à droite ──
export function ScreenHeader({ title, subtitle, onBack, right, style }) {
  return (
    <View style={[styles.header, style]}>
      {onBack ? (
        <IconButton icon="chevron-back" onPress={onBack} />
      ) : <View style={styles.headerSide} />}
      <View style={styles.headerCenter}>
        <Text style={styles.headerTitle} numberOfLines={1}>{title}</Text>
        {subtitle ? <Text style={styles.headerSubtitle} numberOfLines={1}>{subtitle}</Text> : null}
      </View>
      <View style={styles.headerSide}>{right}</View>
    </View>
  );
}

// ── Bouton rond blanc avec icône (retour, notifications, filtres…) ──
export function IconButton({ icon, onPress, badge, size = 44, color = COLORS.text, bg = COLORS.surface, style, iconSize = 22 }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.8}
      style={[styles.iconBtn, { width: size, height: size, borderRadius: size / 2, backgroundColor: bg }, style]}
      hitSlop={6}
    >
      <Ionicons name={icon} size={iconSize} color={color} />
      {badge ? (
        <View style={styles.iconBadge}>
          <Text style={styles.iconBadgeText}>{badge > 99 ? '99+' : badge}</Text>
        </View>
      ) : null}
    </TouchableOpacity>
  );
}

// ── Bouton principal / secondaire ──
// variant : 'primary' (orange dégradé), 'outline', 'ghost', 'dark', 'danger'
export function Button({ title, onPress, variant = 'primary', icon, iconRight, loading, disabled, style, textStyle, size = 'lg' }) {
  const isDisabled = disabled || loading;
  const radius = StyleSheet.flatten(style)?.borderRadius;
  const height = size === 'sm' ? 40 : size === 'md' ? 48 : 56;
  const fg = variant === 'primary' || variant === 'dark' || variant === 'danger' ? COLORS.white
    : variant === 'outline' ? COLORS.text : COLORS.primary;

  const content = (
    <View style={[styles.btnInner, { height }]}>
      {loading ? <ActivityIndicator color={fg} /> : (
        <>
          {icon ? <Ionicons name={icon} size={20} color={fg} /> : null}
          <Text style={[TYPE.button, { color: fg }, size === 'sm' && { fontSize: 14 }, textStyle]}>{title}</Text>
          {iconRight ? <Ionicons name={iconRight} size={20} color={fg} /> : null}
        </>
      )}
    </View>
  );

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={isDisabled}
      activeOpacity={0.85}
      style={[
        styles.btn,
        variant === 'primary' && !isDisabled && SHADOWS.primary,
        variant === 'outline' && styles.btnOutline,
        variant === 'dark' && { backgroundColor: COLORS.dark },
        variant === 'danger' && { backgroundColor: COLORS.danger },
        variant === 'ghost' && { backgroundColor: COLORS.primarySoft },
        isDisabled && { opacity: 0.6 },
        style,
      ]}
    >
      {variant === 'primary' ? (
        <LinearGradient
          colors={GRADIENTS.primary}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          // le dégradé suit l'arrondi passé dans style (ex. bouton pilule)
          style={[styles.btnGradient, radius != null && { borderRadius: radius }]}
        >
          {content}
        </LinearGradient>
      ) : content}
    </TouchableOpacity>
  );
}

// ── Champ de saisie avec pastille d'icône à gauche (style maquette connexion) ──
export function Input({ label, icon, error, right, style, inputStyle, multiline, compact = false, ...props }) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={style}>
      <View style={[
        styles.inputBox,
        compact && styles.inputBoxCompact,
        multiline && { alignItems: 'flex-start', paddingVertical: 12 },
        focused && styles.inputFocused,
        error && styles.inputError,
      ]}>
        {icon ? (
          <View style={[styles.inputIcon, compact && styles.inputIconCompact]}>
            <Ionicons name={icon} size={compact ? 16 : 18} color={compact ? COLORS.text : COLORS.primary} />
          </View>
        ) : null}
        <View style={{ flex: 1 }}>
          {label ? <Text style={[styles.inputLabel, compact && styles.inputLabelCompact]}>{label}</Text> : null}
          <TextInput
            placeholderTextColor={COLORS.textLight}
            style={[styles.input, compact && styles.inputCompact, multiline && { minHeight: 70, textAlignVertical: 'top' }, inputStyle]}
            onFocus={(e) => { setFocused(true); props.onFocus?.(e); }}
            onBlur={(e) => { setFocused(false); props.onBlur?.(e); }}
            multiline={multiline}
            {...props}
          />
        </View>
        {right}
      </View>
      {error ? <Text style={styles.inputErrorText}>{error}</Text> : null}
    </View>
  );
}

// ── Barre de recherche ──
export function SearchBar({ value, onChangeText, placeholder = 'Rechercher un plat ou un restaurant', onFilterPress, onSubmit, autoFocus, style, editable = true, onPress }) {
  const Wrapper = onPress ? TouchableOpacity : View;
  return (
    <Wrapper style={[styles.search, style]} onPress={onPress} activeOpacity={0.9}>
      <Ionicons name="search" size={18} color={COLORS.primary} />
      <TextInput
        style={styles.searchInput}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={COLORS.textLight}
        returnKeyType="search"
        onSubmitEditing={onSubmit}
        autoFocus={autoFocus}
        editable={editable && !onPress}
        pointerEvents={onPress ? 'none' : 'auto'}
      />
      {value ? (
        <TouchableOpacity onPress={() => onChangeText?.('')} hitSlop={8}>
          <Ionicons name="close-circle" size={20} color={COLORS.textLight} />
        </TouchableOpacity>
      ) : onFilterPress ? (
        <TouchableOpacity style={styles.searchFilter} onPress={onFilterPress}>
          <Ionicons name="options-outline" size={17} color={COLORS.primary} />
        </TouchableOpacity>
      ) : null}
    </Wrapper>
  );
}

// ── Carte blanche arrondie ──
export function Card({ children, style, onPress, padded = true }) {
  const Wrapper = onPress ? TouchableOpacity : View;
  return (
    <Wrapper onPress={onPress} activeOpacity={0.9} style={[styles.card, padded && { padding: 16 }, style]}>
      {children}
    </Wrapper>
  );
}

// ── Pastille / filtre ──
export function Chip({ label, active, onPress, icon, style, count }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.85}
      style={[styles.chip, active ? styles.chipActive : styles.chipIdle, style]}
    >
      {icon ? <Ionicons name={icon} size={15} color={active ? COLORS.white : COLORS.textMuted} /> : null}
      <Text style={[styles.chipText, { color: active ? COLORS.white : COLORS.text }]}>{label}</Text>
      {count != null ? (
        <View style={[styles.chipCount, active && { backgroundColor: 'rgba(255,255,255,0.25)' }]}>
          <Text style={[styles.chipCountText, active && { color: COLORS.white }]}>{count}</Text>
        </View>
      ) : null}
    </TouchableOpacity>
  );
}

// ── Petit badge (statut, promo…) ──
export function Badge({ label, color = COLORS.primary, bg = COLORS.primarySoft, icon, style }) {
  return (
    <View style={[styles.badge, { backgroundColor: bg }, style]}>
      {icon ? <Ionicons name={icon} size={12} color={color} /> : null}
      <Text style={[styles.badgeText, { color }]}>{label}</Text>
    </View>
  );
}

// ── Titre de section avec barre orange + « Voir tout » ──
export function SectionHeader({ title, icon, actionLabel = 'Voir tout', onAction, style }) {
  return (
    <View style={[styles.section, style]}>
      <View style={styles.sectionLeft}>
        {icon ? <Ionicons name={icon} size={20} color={COLORS.primary} /> : <View style={styles.sectionBar} />}
        <Text style={TYPE.h2}>{title}</Text>
      </View>
      {onAction ? (
        <TouchableOpacity onPress={onAction} style={styles.sectionAction} hitSlop={8}>
          <Text style={styles.sectionActionText}>{actionLabel}</Text>
          <Ionicons name="chevron-forward" size={14} color={COLORS.primary} />
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

// ── Image distante avec repli propre (fond dégradé + icône discrète) ──
// Évite les gros blocs gris vides quand un plat n'a pas de photo.
export function SmartImage({ uri, source, fallbackSource, style, fallbackIcon = 'restaurant-outline', iconSize = 28, resizeMode = 'cover', children }) {
  const [failed, setFailed] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const url = source ? null : getImageUrl(uri);
  useEffect(() => { setFailed(false); setLoaded(false); }, [url, source]);
  const hasImage = source || (url && !failed);
  const fillImage = { position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' };
  return (
    <View style={[{ overflow: 'hidden', backgroundColor: COLORS.surfaceAlt }, style]}>
      {fallbackSource && (!hasImage || !loaded) ? (
        <Image source={fallbackSource} style={fillImage} resizeMode={resizeMode} />
      ) : !hasImage ? (
        <LinearGradient colors={['#FFF4EC', '#FFE6D6']} style={[StyleSheet.absoluteFill, styles.fallback]}>
          <Ionicons name={fallbackIcon} size={iconSize} color="#F3B79A" />
        </LinearGradient>
      ) : null}
      {hasImage ? (
        <Image
          source={source || { uri: url }}
          style={[fillImage, fallbackSource && !loaded && { opacity: 0 }]}
          resizeMode={resizeMode}
          onError={() => setFailed(true)}
          onLoad={() => setLoaded(true)}
        />
      ) : null}
      {children}
    </View>
  );
}

// ── Note étoilée « ★ 4,8 (320 avis) » ──
export function Rating({ value, count, size = 12, style }) {
  const v = Number(value) || 0;
  return (
    <View style={[{ flexDirection: 'row', alignItems: 'center', gap: 3 }, style]}>
      <Ionicons name="star" size={size + 1} color={COLORS.star} />
      <Text style={{ fontFamily: FONTS.semibold, fontSize: size, color: COLORS.text }}>
        {v > 0 ? v.toFixed(1).replace('.', ',') : 'Nouveau'}
      </Text>
      {count ? <Text style={{ fontFamily: FONTS.regular, fontSize: size, color: COLORS.textMuted }}>({count} avis)</Text> : null}
    </View>
  );
}

// ── Info compacte icône + texte (temps, frais de livraison…) ──
export function MetaItem({ icon, label, color = COLORS.textMuted, size = 11 }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
      <Ionicons name={icon} size={size + 2} color={color} />
      <Text style={{ fontFamily: FONTS.regular, fontSize: size, color }} numberOfLines={1}>{label}</Text>
    </View>
  );
}

// ── État vide / erreur ──
export function EmptyState({ icon = 'fast-food-outline', title, message, actionLabel, onAction, style }) {
  return (
    <View style={[styles.empty, style]}>
      <View style={styles.emptyIcon}>
        <Ionicons name={icon} size={36} color={COLORS.primary} />
      </View>
      <Text style={[TYPE.h3, { textAlign: 'center' }]}>{title}</Text>
      {message ? <Text style={[TYPE.bodyMuted, { textAlign: 'center', marginTop: 6 }]}>{message}</Text> : null}
      {actionLabel ? <Button title={actionLabel} onPress={onAction} size="md" style={{ marginTop: 20, alignSelf: 'stretch' }} /> : null}
    </View>
  );
}

// ── Chargement plein écran ──
export function LoadingView({ label }) {
  return (
    <View style={styles.loading}>
      <ActivityIndicator size="large" color={COLORS.primary} />
      {label ? <Text style={[TYPE.bodyMuted, { marginTop: 12 }]}>{label}</Text> : null}
    </View>
  );
}

// ── Sélecteur de quantité − 1 + ──
export function QuantityStepper({ value, onChange, min = 1, max = 99, size = 'md' }) {
  const s = size === 'sm' ? 30 : 40;
  return (
    <View style={styles.stepper}>
      <Pressable
        onPress={() => value > min && onChange(value - 1)}
        style={[styles.stepBtn, { width: s, height: s, borderRadius: s / 2 }, value <= min && { opacity: 0.4 }]}
        hitSlop={6}
      >
        <Ionicons name="remove" size={size === 'sm' ? 16 : 20} color={COLORS.text} />
      </Pressable>
      <Text style={[styles.stepValue, size === 'sm' && { fontSize: 14, minWidth: 22 }]}>{value}</Text>
      <Pressable
        onPress={() => value < max && onChange(value + 1)}
        style={[styles.stepBtn, styles.stepBtnPlus, { width: s, height: s, borderRadius: s / 2 }]}
        hitSlop={6}
      >
        <Ionicons name="add" size={size === 'sm' ? 16 : 20} color={COLORS.white} />
      </Pressable>
    </View>
  );
}

// ── Ligne de menu (profil, paramètres) ──
export function ListRow({ icon, iconColor = COLORS.primary, iconBg = COLORS.primarySoft, title, subtitle, right, onPress, danger, showChevron = true }) {
  return (
    <TouchableOpacity style={styles.row} onPress={onPress} activeOpacity={0.7} disabled={!onPress}>
      {icon ? (
        <View style={[styles.rowIcon, { backgroundColor: danger ? COLORS.dangerSoft : iconBg }]}>
          <Ionicons name={icon} size={19} color={danger ? COLORS.danger : iconColor} />
        </View>
      ) : null}
      <View style={{ flex: 1 }}>
        <Text style={[TYPE.title, { fontFamily: FONTS.medium }, danger && { color: COLORS.danger }]}>{title}</Text>
        {subtitle ? <Text style={TYPE.caption} numberOfLines={2}>{subtitle}</Text> : null}
      </View>
      {right}
      {showChevron && onPress ? <Ionicons name="chevron-forward" size={18} color={COLORS.textLight} /> : null}
    </TouchableOpacity>
  );
}

export function Divider({ style }) {
  return <View style={[{ height: 1, backgroundColor: COLORS.divider }, style]} />;
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: SCREEN_PADDING, paddingVertical: 10, gap: 12,
  },
  headerSide: { width: 44, alignItems: 'flex-end' },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerTitle: { fontFamily: FONTS.semibold, fontSize: 17, color: COLORS.text },
  headerSubtitle: { ...TYPE.caption, marginTop: -2 },

  iconBtn: { justifyContent: 'center', alignItems: 'center', ...SHADOWS.sm },
  iconBadge: {
    position: 'absolute', top: -2, right: -2, minWidth: 18, height: 18, borderRadius: 9,
    backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 4, borderWidth: 2, borderColor: COLORS.surface,
  },
  iconBadgeText: { fontFamily: FONTS.bold, fontSize: 9, color: COLORS.white },

  btn: { borderRadius: RADIUS.lg, overflow: 'visible', backgroundColor: COLORS.primary },
  btnGradient: { borderRadius: RADIUS.lg },
  btnInner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingHorizontal: 20 },
  btnOutline: { backgroundColor: COLORS.surface, borderWidth: 1.5, borderColor: COLORS.border },

  inputBox: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#FBF8F6', borderRadius: RADIUS.lg,
    borderWidth: 1.5, borderColor: COLORS.border,
    paddingHorizontal: 12, minHeight: 62,
  },
  inputFocused: { borderColor: COLORS.primary, backgroundColor: COLORS.surface },
  inputError: { borderColor: COLORS.danger },
  inputBoxCompact: { minHeight: 55, borderRadius: 14, gap: 11, paddingHorizontal: 9, backgroundColor: '#F9FAFB', borderColor: '#E7E8EA' },
  inputIcon: {
    width: 38, height: 38, borderRadius: 19, backgroundColor: COLORS.primarySoft,
    alignItems: 'center', justifyContent: 'center',
  },
  inputIconCompact: { width: 32, height: 32, borderRadius: 12, backgroundColor: '#FFE9DC' },
  inputLabel: { fontFamily: FONTS.medium, fontSize: 12, color: COLORS.text, marginBottom: -2 },
  inputLabelCompact: { fontSize: 10, marginBottom: -1 },
  input: { fontFamily: FONTS.regular, fontSize: 14, color: COLORS.text, paddingVertical: 4, paddingHorizontal: 0 },
  inputCompact: { fontSize: 11, paddingVertical: 2 },
  inputErrorText: { fontFamily: FONTS.regular, fontSize: 12, color: COLORS.danger, marginTop: 4, marginLeft: 6 },

  search: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: COLORS.surface, borderRadius: RADIUS.pill,
    borderWidth: 1.5, borderColor: COLORS.primaryLight,
    paddingLeft: 14, paddingRight: 4, height: 46, ...SHADOWS.sm,
  },
  searchInput: { flex: 1, fontFamily: FONTS.regular, fontSize: 14, color: COLORS.text, paddingVertical: 0 },
  searchFilter: {
    width: 36, height: 36, borderRadius: 18, backgroundColor: COLORS.primarySoft,
    alignItems: 'center', justifyContent: 'center',
  },

  card: { backgroundColor: COLORS.surface, borderRadius: RADIUS.xl, ...SHADOWS.md },

  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 16, height: 40, borderRadius: RADIUS.pill,
  },
  chipIdle: { backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border },
  chipActive: { backgroundColor: COLORS.primary, ...SHADOWS.primary },
  chipText: { fontFamily: FONTS.medium, fontSize: 13 },
  chipCount: { backgroundColor: COLORS.bg, borderRadius: 10, paddingHorizontal: 6, minWidth: 20, alignItems: 'center' },
  chipCountText: { fontFamily: FONTS.semibold, fontSize: 11, color: COLORS.textMuted },

  badge: {
    flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start',
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: RADIUS.pill,
  },
  badgeText: { fontFamily: FONTS.semibold, fontSize: 11 },

  section: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: SCREEN_PADDING, marginBottom: 14,
  },
  sectionLeft: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  sectionBar: { width: 4, height: 22, borderRadius: 2, backgroundColor: COLORS.primary },
  sectionAction: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  sectionActionText: { fontFamily: FONTS.medium, fontSize: 13, color: COLORS.primary },

  fallback: { alignItems: 'center', justifyContent: 'center' },

  empty: { alignItems: 'center', paddingHorizontal: 32, paddingVertical: 48 },
  emptyIcon: {
    width: 84, height: 84, borderRadius: 42, backgroundColor: COLORS.primarySoft,
    alignItems: 'center', justifyContent: 'center', marginBottom: 16,
  },

  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.bg },

  stepper: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  stepBtn: { alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border },
  stepBtnPlus: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  stepValue: { fontFamily: FONTS.semibold, fontSize: 17, color: COLORS.text, minWidth: 26, textAlign: 'center' },

  row: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 12 },
  rowIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
});
