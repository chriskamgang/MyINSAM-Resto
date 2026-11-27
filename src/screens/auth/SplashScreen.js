import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createThemedStyles, COLORS, FONTS } from '../../theme';
import { BrandMark } from '../../components/AuthLayout';

export default function SplashScreen({ navigation }) {
  const insets  = useSafeAreaInsets();
  // useRef : les valeurs animées ne doivent pas être recréées à chaque rendu
  const opacity = useRef(new Animated.Value(0)).current;
  const scale   = useRef(new Animated.Value(0.8)).current;
  const lift    = useRef(new Animated.Value(16)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 800, useNativeDriver: true }),
      Animated.spring(scale,   { toValue: 1, friction: 5,   useNativeDriver: true }),
      Animated.timing(lift,    { toValue: 0, duration: 800, useNativeDriver: true }),
    ]).start();

    let timer;
    const checkOnboarding = async () => {
      try {
        const seen = await AsyncStorage.getItem('@onboarding_done');
        timer = setTimeout(() => {
          if (seen) {
            navigation.replace('Login');
          } else {
            navigation.replace('Onboarding');
          }
        }, 2500);
      } catch {
        timer = setTimeout(() => navigation.replace('Onboarding'), 2500);
      }
    };
    checkOnboarding();
    return () => clearTimeout(timer);
  }, []);

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <LinearGradient colors={['#2A1A12', COLORS.dark]} style={StyleSheet.absoluteFill} />
      {/* Halos orange décoratifs */}
      <View style={[styles.glow, styles.glowTop]} />
      <View style={[styles.glow, styles.glowBottom]} />

      <Animated.View style={[styles.logoBox, { opacity, transform: [{ scale }, { translateY: lift }] }]}>
        <BrandMark size={96} />
        <View style={styles.nameRow}>
          <Text style={styles.title}>Estuaire </Text>
          <Text style={[styles.title, { color: COLORS.primary }]}>Eat</Text>
        </View>
        <Text style={styles.subtitle}>Le goût de vos plats préférés,{'\n'}à portée de main.</Text>
        <View style={styles.bar} />
      </Animated.View>

      <Animated.Text style={[styles.footer, { opacity, bottom: insets.bottom + 28 }]}>
        Bafoussam · Livraison de repas
      </Animated.Text>
    </View>
  );
}

const styles = createThemedStyles({
  container: { flex: 1, backgroundColor: COLORS.dark, justifyContent: 'center', alignItems: 'center' },
  glow: { position: 'absolute', borderRadius: 999, backgroundColor: COLORS.primary, opacity: 0.12 },
  glowTop: { width: 320, height: 320, top: -120, right: -100 },
  glowBottom: { width: 260, height: 260, bottom: -90, left: -90, opacity: 0.08 },
  logoBox: { alignItems: 'center', paddingHorizontal: 32 },
  nameRow: { flexDirection: 'row', alignItems: 'baseline', marginTop: 22 },
  title: { fontFamily: FONTS.bold, fontSize: 34, lineHeight: 42, color: COLORS.white },
  subtitle: {
    fontFamily: FONTS.regular, fontSize: 14, lineHeight: 21, color: 'rgba(255,255,255,0.8)',
    textAlign: 'center', marginTop: 8,
  },
  bar: { width: 44, height: 3, borderRadius: 2, backgroundColor: COLORS.primary, marginTop: 16 },
  footer: {
    position: 'absolute', fontFamily: FONTS.medium, fontSize: 12, color: 'rgba(255,255,255,0.45)', letterSpacing: 0.5,
  },
});
