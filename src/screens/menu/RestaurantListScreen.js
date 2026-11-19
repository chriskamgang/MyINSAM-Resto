import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { restaurantService } from '../../services/restaurantService';
import { useFavorites } from '../../context/FavoritesContext';
import { COLORS, FONTS, SCREEN_PADDING } from '../../theme';
import { SearchBar, EmptyState } from '../../components/ui';
import RestaurantFeatureCard from '../../components/RestaurantFeatureCard';

export default function RestaurantListScreen({ navigation, isTab = false }) {
  const insets = useSafeAreaInsets();
  const { isFavorite, toggleFavorite } = useFavorites();
  const [search, setSearch] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);
  const [restaurants, setRestaurants] = useState([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(false);
  const requestId = useRef(0);

  useEffect(() => {
    const id = ++requestId.current;
    const timer = setTimeout(async () => {
      setLoading(true);
      setError(false);
      try {
        const response = await restaurantService.getRestaurants({ search: search.trim() || undefined });
        if (id !== requestId.current) return;
        setRestaurants(Array.isArray(response) ? response : response?.data || []);
        setPage(response?.current_page || 1);
        setHasMore(!!response?.last_page && response.current_page < response.last_page);
      } catch {
        if (id === requestId.current) { setError(true); setRestaurants([]); }
      } finally {
        if (id === requestId.current) { setLoading(false); setRefreshing(false); }
      }
    }, search.trim() ? 300 : 0);
    return () => { clearTimeout(timer); requestId.current += 1; };
  }, [search, refreshKey]);

  const loadMore = useCallback(async () => {
    if (loading || loadingMore || !hasMore) return;
    const id = requestId.current;
    setLoadingMore(true);
    try {
      const response = await restaurantService.getRestaurants({ search: search.trim() || undefined, page: page + 1 });
      if (id !== requestId.current) return;
      const next = Array.isArray(response) ? response : response?.data || [];
      setRestaurants((current) => [...current, ...next.filter((item) => !current.some((existing) => existing.id === item.id))]);
      setPage(response?.current_page || page + 1);
      setHasMore(!!response?.last_page && response.current_page < response.last_page);
    } catch {
      if (id === requestId.current) setHasMore(false);
    } finally {
      if (id === requestId.current) setLoadingMore(false);
    }
  }, [loading, loadingMore, hasMore, search, page]);

  const likeRestaurant = async (item) => {
    const ok = await toggleFavorite('restaurant', item);
    if (!ok) navigation.navigate('Auth', { screen: 'Login' });
  };

  return (
    <View style={styles.root}>
      <LinearGradient colors={['#211007', '#8B3309', '#FF710D']} style={[styles.header, { paddingTop: insets.top + 12 }]}>
        {!isTab && <TouchableOpacity style={styles.back} onPress={() => navigation.goBack()} accessibilityLabel="Retour">
          <Ionicons name="arrow-back" size={21} color={COLORS.text} />
        </TouchableOpacity>}
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Tous les restaurants</Text>
          <Text style={styles.headerSub}>Découvrez les menus près de vous</Text>
        </View>
      </LinearGradient>
      <SearchBar value={search} onChangeText={setSearch} placeholder="Rechercher un restaurant..." style={styles.search} />
      <FlatList
        data={restaurants}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item }) => <RestaurantFeatureCard restaurant={item} onPress={() => navigation.navigate('Restaurant', { restaurant: item })} liked={isFavorite('restaurant', item.id)} onLike={() => likeRestaurant(item)} style={styles.card} />}
        contentContainerStyle={[styles.list, isTab && { paddingBottom: 105 }]}
        showsVerticalScrollIndicator={false}
        onEndReached={loadMore}
        onEndReachedThreshold={0.5}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); setRefreshKey((value) => value + 1); }} tintColor={COLORS.primary} />}
        ListEmptyComponent={loading ? <ActivityIndicator color={COLORS.primary} style={{ marginTop: 40 }} /> : <EmptyState icon={error ? 'cloud-offline-outline' : 'restaurant-outline'} title={error ? 'Connexion impossible' : 'Aucun restaurant trouvé'} message={error ? 'Vérifiez votre connexion puis réessayez.' : 'Essayez une autre recherche.'} actionLabel={error ? 'Réessayer' : undefined} onAction={() => setRefreshKey((value) => value + 1)} />}
        ListFooterComponent={loadingMore ? <ActivityIndicator color={COLORS.primary} style={{ marginVertical: 16 }} /> : null}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#FFF9F5' },
  header: { minHeight: 113, paddingHorizontal: SCREEN_PADDING, paddingBottom: 17, flexDirection: 'row', alignItems: 'center', gap: 12 },
  back: { width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.white, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontFamily: FONTS.bold, fontSize: 20, color: COLORS.white },
  headerSub: { fontFamily: FONTS.regular, fontSize: 11, color: '#FFE8D3' },
  search: { marginHorizontal: SCREEN_PADDING, marginTop: 12, marginBottom: 14, borderWidth: 0 },
  list: { alignItems: 'center', paddingBottom: 28, gap: 12, flexGrow: 1 },
  card: { alignSelf: 'center' },
});
