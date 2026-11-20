import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, RefreshControl, Image, StatusBar } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { restaurantService } from '../../services/restaurantService';
import { useFavorites } from '../../context/FavoritesContext';
import { COLORS, FONTS, SCREEN_PADDING } from '../../theme';
import { SearchBar, EmptyState } from '../../components/ui';
import RestaurantFeatureCard from '../../components/RestaurantFeatureCard';
const HEADER_IMAGE = require('../../../assets/images/home-grill-hero.png');

export default function RestaurantListScreen({ navigation, isTab = false }) {
  const insets = useSafeAreaInsets();
  const { isFavorite, toggleFavorite } = useFavorites();
  const [search, setSearch] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);
  const [restaurants, setRestaurants] = useState([]);
  const [total, setTotal] = useState(0);
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
        setTotal(Number(response?.total) || (Array.isArray(response) ? response.length : response?.data?.length || 0));
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
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <Image source={HEADER_IMAGE} style={styles.headerImage} resizeMode="cover" />
        <LinearGradient colors={['rgba(12,6,3,0.93)', 'rgba(20,8,2,0.72)', 'rgba(12,6,3,0.16)']} start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }} style={StyleSheet.absoluteFill} />
        <View style={styles.headerTop}>
          {!isTab ? <TouchableOpacity style={styles.back} onPress={() => navigation.goBack()} accessibilityLabel="Retour"><Ionicons name="arrow-back" size={21} color={COLORS.text} /></TouchableOpacity>
            : <View style={styles.brandIcon}><MaterialCommunityIcons name="chef-hat" size={23} color="#fff" /></View>}
          <Text style={styles.brand}>ESTUAIRE <Text style={styles.brandEat}>EAT_</Text></Text>
        </View>
        <Text style={styles.headerTitle}>Nos restaurants</Text>
        <Text style={styles.headerSub}>Découvrez les saveurs près de vous</Text>
      </View>
      <View style={styles.searchWrap}><SearchBar value={search} onChangeText={setSearch} placeholder="Rechercher un restaurant..." style={styles.search} /></View>
      <View style={styles.sectionHeader}>
        <View style={styles.sectionMark} />
        <Text style={styles.sectionTitle}>À découvrir</Text>
        {!loading && <Text style={styles.count}>{total} restaurant{total > 1 ? 's' : ''}</Text>}
      </View>
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
  root: { flex: 1, backgroundColor: '#FFF8F3' },
  header: { height: 188, paddingHorizontal: SCREEN_PADDING, overflow: 'hidden', backgroundColor: '#1B0D05' },
  headerImage: { position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' },
  headerTop: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  brandIcon: { width: 39, height: 39, borderRadius: 20, borderWidth: 1.5, borderColor: '#FF9A14', alignItems: 'center', justifyContent: 'center', backgroundColor: '#160B08' },
  brand: { fontFamily: FONTS.extrabold, fontStyle: 'italic', fontSize: 15, color: COLORS.white },
  brandEat: { color: '#FFA91A' },
  back: { width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.white, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontFamily: FONTS.extrabold, fontSize: 24, lineHeight: 29, color: COLORS.white, marginTop: 17 },
  headerSub: { fontFamily: FONTS.medium, fontSize: 11, color: '#FFE8D3', marginTop: 2 },
  searchWrap: { marginHorizontal: SCREEN_PADDING, marginTop: -17, zIndex: 2, ...{ elevation: 3 } },
  search: { height: 48, borderRadius: 25, borderWidth: 1, borderColor: '#F4D8C7', backgroundColor: COLORS.white },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', marginHorizontal: SCREEN_PADDING, marginTop: 16, marginBottom: 10 },
  sectionMark: { width: 5, height: 20, borderRadius: 3, backgroundColor: COLORS.primary, marginRight: 8 },
  sectionTitle: { flex: 1, fontFamily: FONTS.bold, fontSize: 16, color: '#171C2D' },
  count: { fontFamily: FONTS.medium, fontSize: 11, color: COLORS.primary },
  list: { alignItems: 'center', paddingBottom: 28, gap: 12, flexGrow: 1 },
  card: { alignSelf: 'center' },
});
