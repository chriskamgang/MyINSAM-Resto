import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';

export default function SplashScreen({ navigation }) {
  const opacity = new Animated.Value(0);
  const scale   = new Animated.Value(0.8);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 800, useNativeDriver: true }),
      Animated.spring(scale,   { toValue: 1, friction: 5,   useNativeDriver: true }),
    ]).start();

    const timer = setTimeout(() => {
      navigation.replace('Onboarding');
    }, 2500);

    return () => clearTimeout(timer);
  }, []);

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.logoBox, { opacity, transform: [{ scale }] }]}>
        <Text style={styles.emoji}>🍔</Text>
        <Text style={styles.title}>Mon Restaurant</Text>
        <Text style={styles.subtitle}>Commandez. Savourez. Profitez.</Text>
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
