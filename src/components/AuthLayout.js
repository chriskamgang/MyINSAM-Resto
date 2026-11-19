// Mise en page des écrans Connexion / Inscription (maquette « Bon retour ! »):
// photo sombre en haut avec la marque, carte blanche arrondie par-dessus.
import React from 'react';
import {
  View, Text, StyleSheet, ScrollView, KeyboardAvoidingView, Platform,
  TouchableOpacity, ActivityIndicator, Dimensions, Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { COLORS, FONTS, TYPE, RADIUS, SHADOWS } from '../theme';
import { IMAGES } from '../theme/images';
import { SmartImage } from './ui';

const { height } = Dimensions.get('window');
const LOGIN_BACKGROUND = require('../../assets/images/auth-login-bg-v2.jpg');
const LOGIN_LEAVES = require('../../assets/images/auth-login-leaves.webp');

export function BrandMark({ size = 56, style }) {
  return (
    <View style={[styles.mark, { width: size, height: size }, style]}>
      <MaterialCommunityIcons name="silverware-variant" size={size * 0.95} color={COLORS.primary} />
    </View>
  );
}

export default function AuthLayout({ title, titleIcon, subtitle, children, footer, onBack, compactHero, loginStyle = false }) {
  const insets = useSafeAreaInsets();
  const heroHeight = loginStyle ? Math.min(height * 0.265, 260) : compactHero ? height * 0.24 : height * 0.33;

  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      {loginStyle ? (
        <>
          <Image source={LOGIN_BACKGROUND} style={styles.loginBackground} resizeMode="cover" />
          <LinearGradient colors={['rgba(7,10,13,0.2)', 'rgba(7,10,13,0.1)', 'rgba(7,10,13,0.45)']} style={StyleSheet.absoluteFill} />
          <View style={[styles.orangeRibbon, { top: heroHeight - 9 }]} />
        </>
      ) : null}
      {/* Fond photo (image fournie) ou dégradé sombre en attendant */}
      <View style={[styles.hero, { height: heroHeight + 60 }]}>
        {!loginStyle && IMAGES.authBackground ? (
          <SmartImage source={IMAGES.authBackground} style={StyleSheet.absoluteFill} />
        ) : !loginStyle ? (
          <LinearGradient colors={['#2A1A12', '#14141F']} style={StyleSheet.absoluteFill} />
        ) : null}
        <LinearGradient colors={loginStyle ? ['rgba(7,10,13,0.03)', 'rgba(7,10,13,0.08)'] : ['rgba(20,20,31,0.65)', 'rgba(20,20,31,0.2)']} style={StyleSheet.absoluteFill} />
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' && !Platform.isPad ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={{ flexGrow: 1 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={[styles.heroContent, loginStyle && styles.loginHeroContent, { paddingTop: insets.top + 12, minHeight: heroHeight }]}>
            {onBack ? (
              <TouchableOpacity style={[styles.back, { top: insets.top + 8 }]} onPress={onBack} hitSlop={8}>
                <Ionicons name="chevron-back" size={22} color={COLORS.white} />
              </TouchableOpacity>
            ) : null}
            <Text style={[styles.slogan, loginStyle && styles.loginSlogan, { top: insets.top + (loginStyle ? 29 : 14) }]}><Text style={{ color: COLORS.primary }}>Manger bien,</Text>{'\n'}c'est la vie !</Text>
            <View style={[styles.brandRow, loginStyle && styles.loginBrandRow]}>
              <BrandMark size={loginStyle ? 64 : 56} style={loginStyle && styles.loginBrandMark} />
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

          <View style={[styles.card, loginStyle && styles.loginCard, { paddingBottom: loginStyle ? 24 : insets.bottom + 24 }]}>
            <View style={[styles.cardBar, loginStyle && styles.loginCardBar]} />
            <View style={[{ flexDirection: 'row', alignItems: 'center', gap: 8 }, loginStyle && styles.loginTitleRow]}>
              <Text style={TYPE.h1}>{title}</Text>
              {titleIcon ? loginStyle ? <Text style={styles.waveEmoji}>👋</Text> : <Ionicons name={titleIcon} size={24} color={COLORS.primary} style={{ transform: [{ rotate: '-20deg' }] }} /> : null}
            </View>
            {subtitle ? <Text style={[TYPE.bodyMuted, { marginTop: 4, marginBottom: 20 }, loginStyle && styles.loginSubtitle]}>{subtitle}</Text> : null}
            {children}
            {footer}
          </View>
          {loginStyle ? (
            <View style={[styles.loginBottom, { paddingBottom: Math.max(insets.bottom, 13) }]}>
              <View style={styles.bottomOrangeShape} />
              <Image source={LOGIN_LEAVES} style={styles.bottomLeaves} resizeMode="contain" />
              <View style={styles.bottomBrandRow}>
                <View style={styles.bottomBrandLine} />
                <BrandMark size={34} />
                <View style={styles.bottomBrandLine} />
              </View>
            </View>
          ) : null}
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
export function OrDivider({ loginStyle = false }) {
  return (
    <View style={[styles.or, loginStyle && styles.loginOr]}>
      <View style={styles.orLine} />
      <Text style={styles.orText}>ou</Text>
      <View style={styles.orLine} />
    </View>
  );
}

function GoogleGlyph() {
  const parts = [
    { top: 0, left: 0, color: '#4285F4' },
    { top: 0, left: 12, color: '#EA4335' },
    { top: 12, left: 0, color: '#34A853' },
    { top: 12, left: 12, color: '#FBBC05' },
  ];
  return (
    <View style={styles.googleGlyph}>
      {parts.map((part) => (
        <View key={`${part.top}-${part.left}`} style={[styles.googleGlyphPart, { top: part.top, left: part.left }]}>
          <Text style={[styles.googleGlyphLetter, { color: part.color, top: -part.top, left: -part.left }]}>G</Text>
        </View>
      ))}
    </View>
  );
}

// Boutons Google (+ Apple sur iOS)
export function SocialButtons({ social, loginStyle = false }) {
  return (
    <View style={{ gap: 12 }}>
      <TouchableOpacity
        style={[styles.social, loginStyle && styles.socialLogin]}
        onPress={social.signInWithGoogle}
        disabled={!social.googleReady || social.googleLoading}
        activeOpacity={0.85}
      >
        {social.googleLoading ? <ActivityIndicator color={COLORS.text} /> : (
          <>
            {loginStyle ? <GoogleGlyph /> : <Ionicons name="logo-google" size={20} color="#EA4335" />}
            <Text style={[styles.socialText, loginStyle && styles.socialTextLogin]}>Continuer avec Google</Text>
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
  root: { flex: 1, backgroundColor: COLORS.dark },
  loginBackground: { position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' },
  hero: { position: 'absolute', top: 0, left: 0, right: 0, overflow: 'hidden' },
  heroContent: { paddingHorizontal: 28, paddingBottom: 28, justifyContent: 'flex-end' },
  loginHeroContent: { paddingHorizontal: 32, paddingBottom: 20 },
  back: {
    position: 'absolute', left: 20, width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center',
  },
  slogan: {
    position: 'absolute', right: 24, fontFamily: FONTS.semibold, fontSize: 13, lineHeight: 17,
    color: COLORS.primary, textAlign: 'right', transform: [{ rotate: '-8deg' }],
  },
  loginSlogan: { right: 26, fontStyle: 'italic', color: COLORS.white, lineHeight: 16 },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  loginBrandRow: { gap: 16 },
  loginBrandMark: { transform: [{ translateY: -10 }] },
  brandName: { fontFamily: FONTS.bold, fontSize: 28, lineHeight: 34, color: COLORS.white },
  tagline: { fontFamily: FONTS.regular, fontSize: 13, lineHeight: 19, color: 'rgba(255,255,255,0.9)', marginTop: 12 },
  taglineBar: { width: 44, height: 3, borderRadius: 2, backgroundColor: COLORS.primary, marginTop: 10 },
  mark: { alignItems: 'center', justifyContent: 'center' },

  card: {
    flexGrow: 1, backgroundColor: COLORS.surface, paddingHorizontal: 24, paddingTop: 26,
    borderTopLeftRadius: 36, borderTopRightRadius: 72,
    borderTopWidth: 3, borderColor: COLORS.primary,
  },
  cardBar: { width: 36, height: 3, borderRadius: 2, backgroundColor: COLORS.primary, marginBottom: 14 },
  loginCardBar: { marginLeft: 7, marginBottom: 11 },
  loginCard: {
    flexGrow: 0, paddingHorizontal: 32, paddingTop: 25,
    borderTopWidth: 0, borderTopLeftRadius: 66, borderTopRightRadius: 108,
    borderBottomLeftRadius: 44, borderBottomRightRadius: 66,
  },
  loginTitleRow: { marginLeft: 7 },
  waveEmoji: { fontSize: 23, lineHeight: 30 },
  loginSubtitle: { marginLeft: 7, maxWidth: 305, fontSize: 13, lineHeight: 18, marginBottom: 20 },
  orangeRibbon: { position: 'absolute', left: -30, width: 230, height: 64, borderRadius: 60, backgroundColor: '#FF680D', transform: [{ rotate: '7deg' }] },
  loginBottom: { flexGrow: 1, minHeight: 108, justifyContent: 'flex-start', alignItems: 'center', paddingTop: 14, overflow: 'hidden' },
  bottomOrangeShape: { position: 'absolute', left: -40, bottom: -75, width: 164, height: 150, borderRadius: 80, backgroundColor: '#FF680D', transform: [{ rotate: '25deg' }] },
  bottomLeaves: { position: 'absolute', right: -18, bottom: -8, width: 180, height: 180 },
  bottomBrandRow: { flexDirection: 'row', alignItems: 'center', gap: 17 },
  bottomBrandLine: { width: 63, height: 1.5, backgroundColor: COLORS.primary },

  error: {
    flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: COLORS.dangerSoft,
    borderRadius: RADIUS.md, padding: 12, marginBottom: 14,
  },
  errorText: { flex: 1, fontFamily: FONTS.medium, fontSize: 13, color: COLORS.danger },

  or: { flexDirection: 'row', alignItems: 'center', marginVertical: 20 },
  loginOr: { marginBottom: 6 },
  orLine: { flex: 1, height: 1, backgroundColor: COLORS.border },
  orText: { marginHorizontal: 14, fontFamily: FONTS.regular, fontSize: 13, color: COLORS.textMuted },

  social: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12, height: 54,
    borderRadius: RADIUS.lg, borderWidth: 1.5, borderColor: COLORS.border, backgroundColor: COLORS.surface,
  },
  socialLogin: { borderRadius: 28, height: 56, borderColor: '#D9DDE0', backgroundColor: '#FFFFFF' },
  socialText: { fontFamily: FONTS.semibold, fontSize: 15, color: COLORS.text },
  socialTextLogin: { fontSize: 14 },
  socialChevron: { position: 'absolute', right: 18 },
  googleGlyph: { width: 24, height: 24 },
  googleGlyphPart: { position: 'absolute', width: 12, height: 12, overflow: 'hidden' },
  googleGlyphLetter: { position: 'absolute', width: 24, height: 24, fontFamily: FONTS.bold, fontSize: 26, lineHeight: 27, textAlign: 'center' },
});
