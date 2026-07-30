import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function SplashScreen({ navigation }) {
  const opacity = new Animated.Value(0);
  const scale   = new Animated.Value(0.8);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 800, useNativeDriver: true }),
      Animated.spring(scale,   { toValue: 1, friction: 5,   useNativeDriver: true }),
    ]).start();

    const checkOnboarding = async () => {
      try {
        const seen = await AsyncStorage.getItem('@onboarding_done');
        setTimeout(() => {
          if (seen) {
            navigation.replace('Login');
          } else {
            navigation.replace('Onboarding');
          }
        }, 2500);
      } catch {
        setTimeout(() => navigation.replace('Onboarding'), 2500);
      }
    };
    checkOnboarding();
  }, []);

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.logoBox, { opacity, transform: [{ scale }] }]}>
        <Ionicons name="restaurant" size={80} color="#fff" style={{ marginBottom: 16 }} />
        <Text style={styles.title}>Estuaire Eat</Text>
        <Text style={styles.subtitle}>Commandez et faites-vous livrer</Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FF6B35',
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoBox: {
    alignItems: 'center',
  },
  emoji: {
    fontSize: 80,
    marginBottom: 16,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
    letterSpacing: 1,
  },
  subtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 8,
    letterSpacing: 0.5,
  },
});
