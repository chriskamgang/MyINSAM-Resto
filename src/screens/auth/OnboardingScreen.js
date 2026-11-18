import React, { useState, useRef } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { COLORS, FONTS, TYPE, SHADOWS, RADIUS } from '../../theme';
import { IMAGES } from '../../theme/images';
import { Button, SmartImage } from '../../components/ui';
import { BrandMark } from '../../components/AuthLayout';

// image : clé optionnelle dans IMAGES (ex. IMAGES.onboarding1). Repli : grande icône.
const slides = [
  {
    id: '1', iconName: 'storefront', image: 'onboarding1',
    title: 'Tous vos restos favoris',
    description: 'Explorez les meilleurs restaurants de Bafoussam et trouvez ce qui vous fait envie.',
  },
  {
    id: '2', iconName: 'fast-food', image: 'onboarding2',
    title: 'Commandez en 2 clics',
    description: 'Choisissez vos plats, personnalisez vos options et commandez en quelques secondes.',
  },
  {
    id: '3', iconName: 'bicycle', image: 'onboarding3',
    title: 'Livraison express',
    description: 'Suivez votre livreur en temps réel et recevez vos plats chauds à votre porte.',
  },
];

export default function OnboardingScreen({ navigation }) {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef(null);
  const isLast = currentIndex === slides.length - 1;
  const illoSize = Math.min(width * 0.7, height * 0.36, 300);

  const finish = async () => {
    try {
      await AsyncStorage.setItem('@onboarding_done', 'true');
    } catch {}
    navigation.replace('Login');
  };

  const next = async () => {
    if (currentIndex < slides.length - 1) {
      flatListRef.current?.scrollToIndex({ index: currentIndex + 1 });
      setCurrentIndex(currentIndex + 1);
    } else {
      await finish();
    }
  };

  const renderItem = ({ item }) => {
    const img = IMAGES[item.image] || null;
    return (
      <View style={[styles.slide, { width }]}>
        <View style={[styles.illoOuter, { width: illoSize, height: illoSize, borderRadius: illoSize / 2 }]}>
          {img ? (
            <SmartImage source={img} style={{ width: illoSize * 0.86, height: illoSize * 0.86, borderRadius: illoSize * 0.43 }} />
          ) : (
            <View style={[styles.illoInner, { width: illoSize * 0.66, height: illoSize * 0.66, borderRadius: illoSize * 0.33 }]}>
              <Ionicons name={item.iconName} size={illoSize * 0.3} color={COLORS.white} />
            </View>
          )}
        </View>
        <Text style={styles.title}>{item.title}</Text>
        <Text style={styles.description}>{item.description}</Text>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <LinearGradient colors={['#2A1A12', COLORS.dark]} style={StyleSheet.absoluteFill} />
      <View style={styles.glow} />

      {/* En-tête : marque + Passer */}
      <View style={[styles.top, { paddingTop: insets.top + 12 }]}>
        <View style={styles.brandRow}>
          <BrandMark size={38} />
          <Text style={styles.brandName}>Estuaire <Text style={{ color: COLORS.primary }}>Eat</Text></Text>
        </View>
        {!isLast ? (
          <TouchableOpacity onPress={finish} hitSlop={10} style={styles.skipBtn}>
            <Text style={styles.skip}>Passer</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      <FlatList
        ref={flatListRef}
        data={slides}
        renderItem={renderItem}
        keyExtractor={item => item.id}
        horizontal
        pagingEnabled
        bounces={false}
        showsHorizontalScrollIndicator={false}
        getItemLayout={(_, index) => ({ length: width, offset: width * index, index })}
        onMomentumScrollEnd={e => {
          const idx = Math.round(e.nativeEvent.contentOffset.x / width);
          setCurrentIndex(idx);
        }}
        style={{ flex: 1 }}
      />

      {/* Points + bouton */}
      <View style={[styles.footer, { paddingBottom: insets.bottom + 24 }]}>
        <View style={styles.dotsContainer}>
          {slides.map((_, i) => (
            <View key={i} style={[styles.dot, currentIndex === i && styles.dotActive]} />
          ))}
        </View>
        <Button
          title={isLast ? 'Commencer' : 'Suivant'}
          iconRight={isLast ? 'checkmark' : 'arrow-forward'}
          onPress={next}
          style={{ alignSelf: 'stretch' }}
        />
        <Text style={styles.tagline}>Le goût de vos plats préférés, à portée de main.</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.dark },
  glow: {
    position: 'absolute', width: 360, height: 360, borderRadius: 180, top: -140, right: -120,
    backgroundColor: COLORS.primary, opacity: 0.12,
  },
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 24 },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  brandName: { fontFamily: FONTS.bold, fontSize: 18, lineHeight: 24, color: COLORS.white },
  skipBtn: {
    paddingHorizontal: 14, height: 34, borderRadius: RADIUS.pill, justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  skip: { fontFamily: FONTS.medium, fontSize: 14, color: 'rgba(255,255,255,0.85)' },

  slide: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 36 },
  illoOuter: {
    backgroundColor: 'rgba(255,107,53,0.14)', alignItems: 'center', justifyContent: 'center',
    marginBottom: 36, overflow: 'hidden',
  },
  illoInner: { backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center', ...SHADOWS.primary },
  title: { ...TYPE.h1, fontSize: 28, lineHeight: 36, color: COLORS.white, textAlign: 'center', marginBottom: 12 },
  description: {
    fontFamily: FONTS.regular, fontSize: 15, lineHeight: 23, color: 'rgba(255,255,255,0.75)', textAlign: 'center',
  },

  footer: { paddingHorizontal: 24, paddingTop: 12 },
  dotsContainer: { flexDirection: 'row', alignSelf: 'center', gap: 8, marginBottom: 24 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.3)' },
  dotActive: { width: 28, backgroundColor: COLORS.primary },
  tagline: {
    fontFamily: FONTS.regular, fontSize: 12, color: 'rgba(255,255,255,0.45)', textAlign: 'center', marginTop: 16,
  },
});
