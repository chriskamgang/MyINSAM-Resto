import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFavorites } from '../../context/FavoritesContext';
import { COLORS, FONTS, TYPE, RADIUS, SHADOWS, SCREEN_PADDING, formatPrice } from '../../theme';
import { Screen, ScreenHeader, Chip, SmartImage, Rating, EmptyState, LoadingView } from '../../components/ui';

export default function FavoritesScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { restaurants, items, loading, refresh, toggleFavorite } = useFavorites();
  const [tab, setTab] = useState('restaurants');
  const [refreshing, setRefreshing] = useState(false);

  const data = tab === 'restaurants' ? restaurants : items;

  const onRefresh = async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  };

  const renderRestaurant = ({ item: r }) => (
    <TouchableOpacity style={styles.card} activeOpacity={0.9} onPress={() => navigation.navigate('Restaurant', { restaurant: r })}>
      <SmartImage uri={r.cover_image || r.logo} style={styles.image} fallbackIcon="storefront-outline" iconSize={24} />
      <View style={{ flex: 1 }}>
        <Text style={TYPE.title} numberOfLines={1}>{r.name?.trim()}</Text>
        <Text style={TYPE.caption} numberOfLines={1}>{r.category?.name || 'Restaurant'}</Text>
        <Rating value={r.rating} count={r.ratings_count} size={11} style={{ marginTop: 4 }} />
      </View>
      <TouchableOpacity onPress={() => toggleFavorite('restaurant', r)} hitSlop={10} style={styles.heart}>
        <Ionicons name="heart" size={20} color={COLORS.danger} />
      </TouchableOpacity>
    </TouchableOpacity>
  );

  const renderItem = ({ item: d }) => {
    const promo = Number(d.discount_price) > 0 && Number(d.discount_price) < Number(d.price);
    return (
      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.9}
        onPress={() => navigation.navigate('ItemDetail', { item: d, restaurant: d.restaurant })}
      >
        <SmartImage uri={d.image} style={styles.image} iconSize={24} />
        <View style={{ flex: 1 }}>
          <Text style={TYPE.title} numberOfLines={1}>{d.name?.trim()}</Text>
          <Text style={TYPE.caption} numberOfLines={1}>{d.restaurant?.name?.trim()}</Text>
          <Text style={[TYPE.price, { marginTop: 4 }]}>{formatPrice(promo ? d.discount_price : d.price)}</Text>
        </View>
        <TouchableOpacity onPress={() => toggleFavorite('item', d)} hitSlop={10} style={styles.heart}>
          <Ionicons name="heart" size={20} color={COLORS.danger} />
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  return (
    <Screen>
      <ScreenHeader title="Mes favoris" onBack={() => navigation.goBack()} />
      <View style={styles.tabs}>
        <Chip label="Restaurants" count={restaurants.length} active={tab === 'restaurants'} onPress={() => setTab('restaurants')} />
        <Chip label="Plats" count={items.length} active={tab === 'items'} onPress={() => setTab('items')} />
      </View>

      {loading && !refreshing && data.length === 0 ? <LoadingView /> : (
        <FlatList
          data={data}
          keyExtractor={(x) => `${tab}-${x.id}`}
          renderItem={tab === 'restaurants' ? renderRestaurant : renderItem}
          contentContainerStyle={{ paddingHorizontal: SCREEN_PADDING, gap: 12, paddingBottom: insets.bottom + 24, flexGrow: 1 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
          ListEmptyComponent={(
            <EmptyState
              icon="heart-outline"
              title={tab === 'restaurants' ? 'Aucun restaurant favori' : 'Aucun plat favori'}
              message="Touchez le cœur sur un restaurant ou un plat pour le retrouver ici."
              actionLabel="Découvrir les restaurants"
              onAction={() => navigation.navigate('Main', { screen: 'Accueil' })}
            />
          )}
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  tabs: { flexDirection: 'row', gap: 10, paddingHorizontal: SCREEN_PADDING, paddingTop: 4, paddingBottom: 16 },
  card: {
    flexDirection: 'row', alignItems: 'center', gap: 12, padding: 10,
    backgroundColor: COLORS.surface, borderRadius: RADIUS.lg, ...SHADOWS.sm,
  },
  image: { width: 76, height: 76, borderRadius: RADIUS.md },
  heart: {
    width: 38, height: 38, borderRadius: 19, backgroundColor: COLORS.dangerSoft,
    alignItems: 'center', justifyContent: 'center',
  },
});
