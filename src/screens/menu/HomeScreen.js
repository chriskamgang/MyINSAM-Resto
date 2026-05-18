import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ScrollView, RefreshControl, ActivityIndicator, Image,
  SafeAreaView, TextInput, Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { restaurantService } from '../../services/restaurantService';
import { getImageUrl } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';

const { width } = Dimensions.get('window');

const COLORS = {
  primary:   '#FF6B35',
  secondary: '#FF8E53',
  bg:        '#F5F5F5',
  card:      '#fff',
  text:      '#1F2937',
  gray:      '#6B7280',
  lightGray: '#9CA3AF',
  border:    '#E5E7EB',
  success:   '#10B981',
  orange:    '#F59E0B',
  lightBg:   '#FFF7ED',
};

// ── Carte restaurant ──
function RestaurantCard({ restaurant, onPress }) {
  const coverUrl = getImageUrl(restaurant.cover_image || restaurant.logo);
  const [imgError, setImgError] = useState(false);

  return (
    <TouchableOpacity style={styles.restaurantCard} onPress={() => onPress(restaurant)} activeOpacity={0.85}>
      <View style={styles.cardImageBox}>
        {coverUrl && !imgError ? (
          <Image source={{ uri: coverUrl }} style={styles.cardImage} resizeMode="cover" onError={() => setImgError(true)} />
        ) : (
          <View style={styles.cardImagePlaceholder}>
            <Ionicons name="restaurant-outline" size={40} color={COLORS.lightGray} />
          </View>
        )}
        {restaurant.is_featured && (
          <View style={styles.featuredBadge}>
            <Ionicons name="star" size={10} color="#fff" />
            <Text style={styles.featuredText}>Populaire</Text>
          </View>
        )}
        {restaurant.delivery_fee === 0 && (
          <View style={styles.freeDeliveryBadge}>
            <Text style={styles.freeDeliveryText}>Livraison gratuite</Text>
          </View>
        )}
      </View>

      <View style={styles.cardInfo}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardName} numberOfLines={1}>{restaurant.name}</Text>
          {restaurant.rating > 0 && (
            <View style={styles.ratingChip}>
              <Ionicons name="star" size={12} color={COLORS.orange} />
              <Text style={styles.ratingText}>{Number(restaurant.rating).toFixed(1)}</Text>
            </View>
          )}
        </View>

        {restaurant.description ? (
          <Text style={styles.cardDesc} numberOfLines={1}>{restaurant.description}</Text>
        ) : null}

        <View style={styles.cardMeta}>
          <View style={styles.metaItem}>
            <Ionicons name="time-outline" size={14} color={COLORS.lightGray} />
            <Text style={styles.metaText}>{restaurant.delivery_time_min || 20}-{restaurant.delivery_time_max || 40} min</Text>
          </View>
          <View style={styles.metaDot} />
          <View style={styles.metaItem}>
            <Ionicons name="bicycle-outline" size={14} color={COLORS.lightGray} />
            <Text style={styles.metaText}>
              {restaurant.delivery_fee === 0 ? 'Gratuit' : `${Number(restaurant.delivery_fee).toLocaleString('fr-FR')} XAF`}
            </Text>
          </View>
          {restaurant.minimum_order > 0 && (
            <>
              <View style={styles.metaDot} />
              <Text style={styles.metaText}>Min {Number(restaurant.minimum_order).toLocaleString('fr-FR')} XAF</Text>
            </>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}

// ── Carte catégorie ──
function CategoryChip({ category, isActive, onPress }) {
  const iconName = category.icon || 'restaurant-outline';
  const isIonicon = iconName.includes('-');

  return (
    <TouchableOpacity
      style={[styles.categoryChip, isActive && styles.categoryChipActive]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      {isIonicon ? (
        <Ionicons name={iconName} size={18} color={isActive ? '#fff' : COLORS.primary} />
      ) : (
        <Text style={[styles.categoryIcon, isActive && { color: '#fff' }]}>{iconName}</Text>
      )}
      <Text style={[styles.categoryText, isActive && styles.categoryTextActive]}>{category.name}</Text>
    </TouchableOpacity>
  );
}

// ── Carte restaurant en vedette (horizontal) ──
function FeaturedCard({ restaurant, onPress }) {
  const coverUrl = getImageUrl(restaurant.cover_image || restaurant.logo);
  const [imgError, setImgError] = useState(false);

  return (
    <TouchableOpacity style={styles.featuredCard} onPress={() => onPress(restaurant)} activeOpacity={0.85}>
      {coverUrl && !imgError ? (
        <Image source={{ uri: coverUrl }} style={styles.featuredImage} resizeMode="cover" onError={() => setImgError(true)} />
      ) : (
        <View style={[styles.featuredImage, styles.featuredImagePlaceholder]}>
          <Ionicons name="restaurant" size={30} color={COLORS.lightGray} />
        </View>
      )}
      <View style={styles.featuredOverlay}>
        <Text style={styles.featuredName} numberOfLines={1}>{restaurant.name}</Text>
        <View style={styles.featuredMeta}>
          <Ionicons name="time-outline" size={12} color="#fff" />
          <Text style={styles.featuredMetaText}>{restaurant.delivery_time_min || 20} min</Text>
          {restaurant.rating > 0 && (
            <>
              <Ionicons name="star" size={12} color="#FFD700" style={{ marginLeft: 8 }} />
              <Text style={styles.featuredMetaText}>{Number(restaurant.rating).toFixed(1)}</Text>
            </>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}

export default function HomeScreen({ navigation }) {
  const { user } = useAuth();
  const { totalItems, restaurant: cartRestaurant } = useCart();

  const [restaurants, setRestaurants]   = useState([]);
  const [featured, setFeatured]         = useState([]);
  const [categories, setCategories]     = useState([]);
  const [activeCategory, setActiveCategory] = useState(null);
  const featuredRef = useRef(null);
  const featuredIndex = useRef(0);

  // Auto-scroll populaires
  useEffect(() => {
    if (featured.length <= 1) return;
    const interval = setInterval(() => {
      featuredIndex.current = (featuredIndex.current + 1) % featured.length;
      featuredRef.current?.scrollToIndex({
        index: featuredIndex.current,
        animated: true,
      });
    }, 3000);
    return () => clearInterval(interval);
  }, [featured]);
  const [loading, setLoading]           = useState(true);
  const [refreshing, setRefreshing]     = useState(false);
  const [search, setSearch]             = useState('');

  const loadData = useCallback(async () => {
    try {
      const [restData, featData, catData] = await Promise.all([
        restaurantService.getRestaurants({ category: activeCategory }),
        restaurantService.getFeatured(),
        restaurantService.getCategories(),
      ]);
      setRestaurants(restData.data || restData || []);
      setFeatured(featData.data || featData || []);
      setCategories(catData.data || catData || []);
    } catch (e) {
      console.error('Erreur chargement restaurants:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [activeCategory]);

  useEffect(() => { loadData(); }, [loadData]);

  const onRefresh = () => { setRefreshing(true); loadData(); };

  const handleSearch = useCallback(async () => {
    if (!search.trim()) { loadData(); return; }
    try {
      setLoading(true);
      const data = await restaurantService.getRestaurants({ search: search.trim() });
      setRestaurants(data.data || data || []);
    } catch (e) {
      console.error('Erreur recherche:', e);
    } finally {
      setLoading(false);
    }
  }, [search, loadData]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (search.length > 0) handleSearch();
      else loadData();
    }, 500);
    return () => clearTimeout(timer);
  }, [search]);

  const handleCategoryPress = (catId) => {
    setActiveCategory(prev => prev === catId ? null : catId);
  };

  const openRestaurant = (restaurant) => {
    navigation.navigate('Restaurant', { restaurant });
  };

  const firstName = user?.name?.split(' ')[0] || '';

  if (loading && !refreshing) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loaderText}>Chargement des restaurants...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        data={restaurants}
        keyExtractor={item => String(item.id)}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
        ListHeaderComponent={() => (
          <View>
            {/* ── Header ── */}
            <View style={styles.header}>
              <View>
                <Text style={styles.greeting}>{firstName ? `Bonjour, ${firstName}` : 'Bienvenue'}</Text>
                <Text style={styles.heroTitle}>Qu'est-ce qui vous ferait plaisir ?</Text>
              </View>
              {totalItems > 0 && cartRestaurant && (
                <TouchableOpacity
                  style={styles.cartFloatBtn}
                  onPress={() => navigation.navigate('Main', { screen: 'Panier' })}
                >
                  <Ionicons name="cart" size={20} color="#fff" />
                  <View style={styles.cartFloatBadge}>
                    <Text style={styles.cartFloatBadgeText}>{totalItems}</Text>
                  </View>
                </TouchableOpacity>
              )}
            </View>

            {/* ── Barre de recherche ── */}
            <View style={styles.searchSection}>
              <View style={styles.searchBox}>
                <Ionicons name="search-outline" size={20} color={COLORS.lightGray} />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Rechercher un restaurant..."
                  value={search}
                  onChangeText={setSearch}
                  placeholderTextColor={COLORS.lightGray}
                />
                {search.length > 0 && (
                  <TouchableOpacity onPress={() => setSearch('')}>
                    <Ionicons name="close-circle" size={20} color={COLORS.lightGray} />
                  </TouchableOpacity>
                )}
              </View>
            </View>

            {/* ── Catégories ── */}
            {categories.length > 0 && search.length === 0 && (
              <View style={styles.categoriesSection}>
                <Text style={styles.sectionTitle}>Catégories</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoriesScroll}>
                  {categories.map(cat => (
                    <CategoryChip
                      key={cat.id}
                      category={cat}
                      isActive={activeCategory === cat.id}
                      onPress={() => handleCategoryPress(cat.id)}
                    />
                  ))}
                </ScrollView>
              </View>
            )}

            {/* ── Restaurants en vedette ── */}
            {featured.length > 0 && search.length === 0 && (
              <View style={styles.featuredSection}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>Populaires</Text>
                  <Text style={styles.sectionCount}>{featured.length} restaurant{featured.length > 1 ? 's' : ''}</Text>
                </View>
                <FlatList
                  ref={featuredRef}
                  data={featured}
                  keyExtractor={item => String(item.id)}
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.featuredScroll}
                  snapToInterval={width * 0.65 + 14}
                  decelerationRate="fast"
                  getItemLayout={(_, index) => ({
                    length: width * 0.65 + 14,
                    offset: (width * 0.65 + 14) * index,
                    index,
                  })}
                  onScrollBeginDrag={() => { featuredIndex.current = -1; }}
                  renderItem={({ item }) => (
                    <FeaturedCard restaurant={item} onPress={openRestaurant} />
                  )}
                />
              </View>
            )}

            {/* ── Titre liste ── */}
            <View style={styles.listHeader}>
              <Text style={styles.sectionTitle}>
                {search ? 'Résultats' : activeCategory ? 'Restaurants' : 'Tous les restaurants'}
              </Text>
              <Text style={styles.listCount}>{restaurants.length} restaurant{restaurants.length > 1 ? 's' : ''}</Text>
            </View>
          </View>
        )}
        renderItem={({ item }) => <RestaurantCard restaurant={item} onPress={openRestaurant} />}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={() => (
          <View style={styles.emptyState}>
            <Ionicons name="search" size={56} color={COLORS.lightGray} style={{ opacity: 0.4, marginBottom: 12 }} />
            <Text style={styles.emptyTitle}>Aucun restaurant trouvé</Text>
            <Text style={styles.emptyDesc}>Essayez avec un autre mot-clé ou catégorie</Text>
          </View>
        )}
        ListFooterComponent={<View style={{ height: 100 }} />}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  loader:    { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.bg },
  loaderText: { marginTop: 12, color: COLORS.gray, fontSize: 14 },

  // ── Header ──
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    paddingTop: 12,
    paddingBottom: 16,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 4,
  },
  greeting:  { fontSize: 14, color: COLORS.gray, marginBottom: 4 },
  heroTitle: { fontSize: 22, fontWeight: '800', color: COLORS.text },
  cartFloatBtn: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: COLORS.primary,
    justifyContent: 'center', alignItems: 'center',
    shadowColor: COLORS.primary, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 8, elevation: 6,
  },
  cartFloatBadge: {
    position: 'absolute', top: -2, right: -2,
    backgroundColor: '#EF4444', borderRadius: 10,
    minWidth: 18, height: 18,
    justifyContent: 'center', alignItems: 'center',
  },
  cartFloatBadgeText: { color: '#fff', fontSize: 10, fontWeight: 'bold' },

  // ── Search ──
  searchSection: { paddingHorizontal: 20, marginTop: 20 },
  searchBox: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: COLORS.card, borderRadius: 16,
    paddingHorizontal: 16, paddingVertical: 14,
    borderWidth: 1.5, borderColor: COLORS.border,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04, shadowRadius: 8, elevation: 2,
  },
  searchInput: { flex: 1, fontSize: 15, color: COLORS.text },

  // ── Categories ──
  categoriesSection: { marginTop: 20 },
  categoriesScroll: { paddingHorizontal: 20, gap: 10 },
  categoryChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: COLORS.card,
    paddingHorizontal: 16, paddingVertical: 10,
    borderRadius: 24, borderWidth: 1.5, borderColor: COLORS.border,
  },
  categoryChipActive: {
    backgroundColor: COLORS.primary, borderColor: COLORS.primary,
  },
  categoryIcon: { fontSize: 16 },
  categoryText: { fontSize: 13, fontWeight: '600', color: COLORS.gray },
  categoryTextActive: { color: '#fff', fontWeight: '700' },

  // ── Featured ──
  featuredSection: { marginTop: 20 },
  featuredScroll: { paddingHorizontal: 20, gap: 14 },
  featuredCard: {
    width: width * 0.65, height: 160,
    borderRadius: 20, overflow: 'hidden',
    backgroundColor: COLORS.card,
    shadowColor: '#000', shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1, shadowRadius: 10, elevation: 4,
  },
  featuredImage: { width: '100%', height: '100%' },
  featuredImagePlaceholder: {
    backgroundColor: COLORS.border, justifyContent: 'center', alignItems: 'center',
  },
  featuredOverlay: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: 'rgba(0,0,0,0.55)',
    paddingHorizontal: 14, paddingVertical: 10,
  },
  featuredName: { fontSize: 15, fontWeight: '700', color: '#fff', marginBottom: 4 },
  featuredMeta: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  featuredMetaText: { fontSize: 12, color: 'rgba(255,255,255,0.9)', fontWeight: '600' },
  featuredBadge: {
    position: 'absolute', top: 10, left: 10,
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: COLORS.primary, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8,
  },
  featuredText: { fontSize: 10, fontWeight: '700', color: '#fff' },
  freeDeliveryBadge: {
    position: 'absolute', top: 10, right: 10,
    backgroundColor: COLORS.success, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8,
  },
  freeDeliveryText: { fontSize: 10, fontWeight: '700', color: '#fff' },

  // ── Section titles ──
  sectionHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingRight: 20, marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 18, fontWeight: '800', color: COLORS.text,
    paddingHorizontal: 20,
  },
  sectionCount: { fontSize: 13, color: COLORS.lightGray, fontWeight: '600' },

  // ── List ──
  listHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingRight: 20, marginTop: 24,
  },
  listCount: { fontSize: 13, color: COLORS.lightGray, fontWeight: '600' },
  listContent: { paddingBottom: 20 },

  // ── Restaurant card ──
  restaurantCard: {
    backgroundColor: COLORS.card,
    borderRadius: 20, marginHorizontal: 20, marginBottom: 14,
    overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08, shadowRadius: 10, elevation: 3,
  },
  cardImageBox: { width: '100%', height: 150, position: 'relative' },
  cardImage: { width: '100%', height: '100%' },
  cardImagePlaceholder: {
    width: '100%', height: '100%',
    backgroundColor: '#F3F4F6', justifyContent: 'center', alignItems: 'center',
  },
  cardInfo: { padding: 14 },
  cardHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4,
  },
  cardName: { flex: 1, fontSize: 17, fontWeight: '700', color: COLORS.text, marginRight: 8 },
  ratingChip: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    backgroundColor: COLORS.lightBg, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 12,
  },
  ratingText: { fontSize: 13, fontWeight: '700', color: COLORS.orange },
  cardDesc: { fontSize: 13, color: COLORS.gray, marginBottom: 8 },
  cardMeta: { flexDirection: 'row', alignItems: 'center' },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { fontSize: 12, color: COLORS.lightGray, fontWeight: '600' },
  metaDot: { width: 3, height: 3, borderRadius: 1.5, backgroundColor: COLORS.lightGray, marginHorizontal: 8 },

  // ── Empty ──
  emptyState: { paddingVertical: 60, alignItems: 'center', paddingHorizontal: 40 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: COLORS.text, marginBottom: 6 },
  emptyDesc: { fontSize: 14, color: COLORS.gray, textAlign: 'center' },
});
