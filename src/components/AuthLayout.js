// Mise en page des écrans Connexion / Inscription (maquette « Bon retour ! »):
// photo sombre en haut avec la marque, carte blanche arrondie par-dessus.
import React from 'react';
import {
  View, Text, StyleSheet, ScrollView, KeyboardAvoidingView, Platform,
  TouchableOpacity, ActivityIndicator, Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { COLORS, FONTS, TYPE, RADIUS, SHADOWS } from '../theme';
import { IMAGES } from '../theme/images';
import { SmartImage } from './ui';

const { height } = Dimensions.get('window');

export function BrandMark({ size = 56 }) {
  return (
    <View style={[styles.mark, { width: size, height: size, borderRadius: size / 2 }]}>
      <Ionicons name="restaurant" size={size * 0.52} color={COLORS.white} />
    </View>
  );
}

export default function AuthLayout({ title, titleIcon, subtitle, children, footer, onBack, compactHero }) {
  const insets = useSafeAreaInsets();
  const heroHeight = compactHero ? height * 0.24 : height * 0.33;

  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      {/* Fond photo (image fournie) ou dégradé sombre en attendant */}
      <View style={[styles.hero, { height: heroHeight + 60 }]}>
        {IMAGES.authBackground ? (
          <SmartImage source={IMAGES.authBackground} style={StyleSheet.absoluteFill} />
        ) : (
          <LinearGradient colors={['#2A1A12', '#14141F']} style={StyleSheet.absoluteFill} />
        )}
        <LinearGradient colors={['rgba(20,20,31,0.65)', 'rgba(20,20,31,0.2)']} style={StyleSheet.absoluteFill} />
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' && !Platform.isPad ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={{ flexGrow: 1 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={[styles.heroContent, { paddingTop: insets.top + 12, minHeight: heroHeight }]}>
            {onBack ? (
              <TouchableOpacity style={[styles.back, { top: insets.top + 8 }]} onPress={onBack} hitSlop={8}>
                <Ionicons name="chevron-back" size={22} color={COLORS.white} />
              </TouchableOpacity>
            ) : null}
            <Text style={[styles.slogan, { top: insets.top + 14 }]}>Manger bien,{'\n'}c'est la vie !</Text>
            <View style={styles.brandRow}>
              <BrandMark />
              <View>
                <Text style={styles.brandName}>Estuaire</Text>
                <Text style={[styles.brandName, { color: COLORS.primary, marginTop: -8 }]}>Eat</Text>
              </View>
            </View>
            {!compactHero && (
              <>
                <Text style={styles.tagline}>Le goût de vos plats préférés,{'\n'}à portée de main.</Text>
                <View style={styles.taglineBar} />
              </>
            )}
          </View>

          <View style={[styles.card, { paddingBottom: insets.bottom + 24 }]}>
            <View style={styles.cardBar} />
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Text style={TYPE.h1}>{title}</Text>
              {titleIcon ? <Ionicons name={titleIcon} size={24} color={COLORS.primary} style={{ transform: [{ rotate: '-20deg' }] }} /> : null}
            </View>
            {subtitle ? <Text style={[TYPE.bodyMuted, { marginTop: 4, marginBottom: 20 }]}>{subtitle}</Text> : null}
            {children}
            {footer}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Bande sombre fixe sous la barre d'état : le texte qui défile passe dessous
          au lieu de se mélanger à l'heure et aux icônes */}
      <LinearGradient
        pointerEvents="none"
        colors={['rgba(20,20,31,0.95)', 'rgba(20,20,31,0.75)', 'rgba(20,20,31,0)']}
        locations={[0, 0.7, 1]}
        style={[styles.statusScrim, { height: insets.top + 14 }]}
      />
    </View>
  );
}

// Message d'erreur en encadré rouge
export function AuthError({ message }) {
  if (!message) return null;
  return (
    <View style={styles.error}>
      <Ionicons name="alert-circle" size={18} color={COLORS.danger} />
      <Text style={styles.errorText}>{message}</Text>
    </View>
  );
}

// Séparateur « ou »
export function OrDivider() {
  return (
    <View style={styles.or}>
      <View style={styles.orLine} />
      <Text style={styles.orText}>ou</Text>
      <View style={styles.orLine} />
    </View>
  );
}

// Boutons Google (+ Apple sur iOS)
export function SocialButtons({ social }) {
  return (
    <View style={{ gap: 12 }}>
      <TouchableOpacity
        style={styles.social}
        onPress={social.signInWithGoogle}
        disabled={!social.googleReady || social.googleLoading}
        activeOpacity={0.85}
      >
        {social.googleLoading ? <ActivityIndicator color={COLORS.text} /> : (
          <>
            <Ionicons name="logo-google" size={20} color="#EA4335" />
            <Text style={styles.socialText}>Continuer avec Google</Text>
            <Ionicons name="chevron-forward" size={18} color={COLORS.text} style={styles.socialChevron} />
          </>
        )}
      </TouchableOpacity>
      {Platform.OS === 'ios' && (
        <TouchableOpacity
          style={[styles.social, { backgroundColor: COLORS.black, borderColor: COLORS.black }]}
          onPress={social.signInWithApple}
          disabled={social.appleLoading}
          activeOpacity={0.85}
        >
          {social.appleLoading ? <ActivityIndicator color={COLORS.white} /> : (
            <>
              <Ionicons name="logo-apple" size={20} color={COLORS.white} />
              <Text style={[styles.socialText, { color: COLORS.white }]}>Continuer avec Apple</Text>
              <Ionicons name="chevron-forward" size={18} color={COLORS.white} style={styles.socialChevron} />
            </>
          )}
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  statusScrim: { position: 'absolute', top: 0, left: 0, right: 0 },
  root: { flex: 1, backgroundColor: COLORS.bg },
  hero: { position: 'absolute', top: 0, left: 0, right: 0, overflow: 'hidden' },
  heroContent: { paddingHorizontal: 28, paddingBottom: 28, justifyContent: 'flex-end' },
  back: {
    position: 'absolute', left: 20, width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center',
  },
  slogan: {
    position: 'absolute', right: 24, fontFamily: FONTS.semibold, fontSize: 13, lineHeight: 17,
    color: COLORS.primary, textAlign: 'right', transform: [{ rotate: '-8deg' }],
  },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  brandName: { fontFamily: FONTS.bold, fontSize: 28, lineHeight: 34, color: COLORS.white },
  tagline: { fontFamily: FONTS.regular, fontSize: 13, lineHeight: 19, color: 'rgba(255,255,255,0.9)', marginTop: 12 },
  taglineBar: { width: 44, height: 3, borderRadius: 2, backgroundColor: COLORS.primary, marginTop: 10 },
  mark: { backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center', ...SHADOWS.primary },

  card: {
    flexGrow: 1, backgroundColor: COLORS.surface, paddingHorizontal: 24, paddingTop: 26,
    borderTopLeftRadius: 36, borderTopRightRadius: 72,
    borderTopWidth: 3, borderColor: COLORS.primary,
  },
  cardBar: { width: 36, height: 3, borderRadius: 2, backgroundColor: COLORS.primary, marginBottom: 14 },

  error: {
    flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: COLORS.dangerSoft,
    borderRadius: RADIUS.md, padding: 12, marginBottom: 14,
  },
  errorText: { flex: 1, fontFamily: FONTS.medium, fontSize: 13, color: COLORS.danger },

  or: { flexDirection: 'row', alignItems: 'center', marginVertical: 20 },
  orLine: { flex: 1, height: 1, backgroundColor: COLORS.border },
  orText: { marginHorizontal: 14, fontFamily: FONTS.regular, fontSize: 13, color: COLORS.textMuted },

  social: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12, height: 54,
    borderRadius: RADIUS.lg, borderWidth: 1.5, borderColor: COLORS.border, backgroundColor: COLORS.surface,
  },
  socialText: { fontFamily: FONTS.semibold, fontSize: 15, color: COLORS.text },
  socialChevron: { position: 'absolute', right: 18 },
});
