import React, { useState, useRef } from 'react';
import {
  View, Text, StyleSheet, FlatList, Dimensions,
  TouchableOpacity, Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width } = Dimensions.get('window');

const slides = [
  {
    id: '1', iconName: 'storefront',
    title: 'Tous vos restos favoris',
    description: 'Explorez les meilleurs restaurants de Bafoussam et trouvez ce qui vous fait envie.',
    bg: '#FF6B35',
  },
  {
    id: '2', iconName: 'cart',
    title: 'Commandez en 2 clics',
    description: 'Choisissez vos plats, personnalisez vos options et commandez en quelques secondes.',
    bg: '#FF8C42',
  },
  {
    id: '3', iconName: 'bicycle',
    title: 'Livraison express',
    description: 'Suivez votre livreur en temps reel et recevez vos plats chauds a votre porte.',
    bg: '#FF6B35',
  },
];

export default function OnboardingScreen({ navigation }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef(null);

  const next = async () => {
    if (currentIndex < slides.length - 1) {
      flatListRef.current?.scrollToIndex({ index: currentIndex + 1 });
      setCurrentIndex(currentIndex + 1);
    } else {
      await AsyncStorage.setItem('@onboarding_done', 'true');
      navigation.replace('Login');
    }
  };

  const renderItem = ({ item }) => (
    <View style={[styles.slide, { width, backgroundColor: item.bg }]}>
      <Ionicons name={item.iconName} size={100} color="#fff" style={styles.emoji} />
      <Text style={styles.title}>{item.title}</Text>
      <Text style={styles.description}>{item.description}</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <FlatList
        ref={flatListRef}
        data={slides}
        renderItem={renderItem}
        keyExtractor={item => item.id}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={e => {
          const idx = Math.round(e.nativeEvent.contentOffset.x / width);
          setCurrentIndex(idx);
        }}
      />

      {/* Dots */}
      <View style={styles.dotsContainer}>
        {slides.map((_, i) => (
          <View
            key={i}
            style={[styles.dot, currentIndex === i && styles.dotActive]}
          />
        ))}
      </View>

      {/* Boutons */}
      <View style={styles.footer}>
        <TouchableOpacity onPress={async () => {
          await AsyncStorage.setItem('@onboarding_done', 'true');
          navigation.replace('Login');
        }}>
          <Text style={styles.skip}>Passer</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.nextBtn} onPress={next}>
          <Text style={styles.nextText}>
            {currentIndex === slides.length - 1 ? 'Commencer' : 'Suivant →'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FF6B35' },
  slide: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    paddingBottom: 100,
  },
  emoji:       { fontSize: 100, marginBottom: 32 },
  title:       { fontSize: 28, fontWeight: 'bold', color: '#fff', textAlign: 'center', marginBottom: 16 },
  description: { fontSize: 16, color: 'rgba(255,255,255,0.85)', textAlign: 'center', lineHeight: 24 },
  dotsContainer: {
    position: 'absolute',
    bottom: 100,
    flexDirection: 'row',
    alignSelf: 'center',
    gap: 8,
  },
  dot:       { width: 8, height: 8, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.4)' },
  dotActive: { width: 24, backgroundColor: '#fff' },
  footer: {
    position: 'absolute',
    bottom: 40,
    left: 30,
    right: 30,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  skip:    { color: 'rgba(255,255,255,0.7)', fontSize: 16 },
  nextBtn: {
    backgroundColor: '#fff',
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 30,
  },
  nextText: { color: '#FF6B35', fontWeight: 'bold', fontSize: 16 },
});
