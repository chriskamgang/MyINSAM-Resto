import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, ScrollView,
  RefreshControl, Dimensions, Image, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { restaurantService } from '../../services/restaurantService';
import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';
import { useDeliveryLocation, distanceKm } from '../../context/DeliveryLocationContext';
import { useFavorites } from '../../context/FavoritesContext';
import { COLORS, FONTS, TYPE, RADIUS, SHADOWS, SCREEN_PADDING, formatPrice } from '../../theme';
import { useTabBarSpace } from '../../hooks/useTabBarSpace';
import { IMAGES, categoryImage, categoryIcon } from '../../theme/images';
import {
  Screen, SearchBar, SectionHeader, SmartImage, Rating, MetaItem, EmptyState, LoadingView, IconButton,
} from '../../components/ui';
import DeliveryLocationSheet from '../../components/DeliveryLocationSheet';

const { width } = Dimensions.get('window');
const POPULAR_CARD_W = Math.min(170, (width - SCREEN_PADDING * 2 - 24) / 2.3);

const deliveryTime = (r) => {
  if (r.delivery_time_min && r.delivery_time_max) return `${r.delivery_time_min}–${r.delivery_time_max} min`;
  if (r.delivery_time_min) return `${r.delivery_time_min} min`;
  return '20–40 min';
};
const deliveryFee = (r) => (Number(r.delivery_fee) > 0 ? `Dès ${formatPrice(r.delivery_fee)}` : 'Livraison offerte');
const formatKm = (km) => (km == null ? null : km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(1).replace('.', ',')} km`);

// ── Vignette catégorie (image ronde ou emoji) ──
function CategoryItem({ category, active, onPress }) {
  const img = categoryImage(category.slug);
  return (
    <TouchableOpacity style={styles.catItem} onPress={onPress} activeOpacity={0.8}>
      <View style={[styles.catCircle, active && styles.catCircleActive]}>
        {img ? <Image source={img} style={styles.catImage} /> : <Ionicons name={categoryIcon(category.name)} size={28} color={COLORS.primary} />}
      </View>
      <Text style={[styles.catLabel, active && { color: COLORS.primary, fontFamily: FONTS.semibold }]} numberOfLines={1}>
        {category.name}
      </Text>
    </TouchableOpacity>
  );
}

// ── Carte restaurant populaire (défilement horizontal) ──
function PopularCard({ restaurant, onPress, liked, onLike }) {
  return (
    <TouchableOpacity style={styles.popCard} onPress={onPress} activeOpacity={0.9}>
      <SmartImage uri={restaurant.cover_image || restaurant.logo} style={styles.popImage} fallbackIcon="storefront-outline">
        <TouchableOpacity style={styles.popHeart} onPress={onLike} hitSlop={8} activeOpacity={0.8}>
          <Ionicons name={liked ? 'heart' : 'heart-outline'} size={16} color={liked ? COLORS.danger : COLORS.text} />
        </TouchableOpacity>
        {!restaurant.is_open && (
          <View style={styles.closedOverlay}><Text style={styles.closedText}>Fermé</Text></View>
        )}
      </SmartImage>
      <View style={styles.popBody}>
        <Text style={styles.popName} numberOfLines={1}>{restaurant.name}</Text>
        <Text style={styles.popCuisine} numberOfLines={1}>{restaurant.category?.name || 'Restaurant'}</Text>
        <Rating value={restaurant.rating} count={restaurant.ratings_count} size={11} style={{ marginTop: 4 }} />
        <View style={styles.popMeta}>
          <MetaItem icon="time-outline" label={deliveryTime(restaurant)} size={10} />
          <MetaItem icon="bicycle-outline" label={Number(restaurant.delivery_fee) > 0 ? formatPrice(restaurant.delivery_fee) : 'Offerte'} size={10} />
        </View>
      </View>
    </TouchableOpacity>
  );
}

// ── Ligne restaurant (« Près de vous ») ──
function NearbyRow({ restaurant, km, onPress }) {
  return (
    <TouchableOpacity style={styles.nearCard} onPress={onPress} activeOpacity={0.9}>
      <SmartImage uri={restaurant.cover_image || restaurant.logo} style={styles.nearImage} fallbackIcon="storefront-outline" iconSize={24} />
      <View style={{ flex: 1 }}>
        <Text style={TYPE.title} numberOfLines={1}>{restaurant.name}</Text>
        <Text style={TYPE.caption} numberOfLines={1}>{restaurant.category?.name || 'Restaurant'}</Text>
        <Rating value={restaurant.rating} count={restaurant.ratings_count} size={11} style={{ marginTop: 3 }} />
        <View style={[styles.popMeta, { marginTop: 6, gap: 12 }]}>
          <MetaItem icon="time-outline" label={deliveryTime(restaurant)} />
          {km != null ? <MetaItem icon="location-outline" label={formatKm(km)} /> : <MetaItem icon="bicycle-outline" label={deliveryFee(restaurant)} />}
        </View>
      </View>
      <Ionicons name="chevron-forward" size={20} color={COLORS.primary} />
    </TouchableOpacity>
  );
}

// ── Résultat plat (recherche) ──
function DishRow({ item, onPress }) {
  const hasPromo = item.discount_price && Number(item.discount_price) < Number(item.price);
  return (
    <TouchableOpacity style={styles.nearCard} onPress={onPress} activeOpacity={0.9}>
      <SmartImage uri={item.image} style={styles.nearImage} iconSize={24} />
      <View style={{ flex: 1 }}>
        <Text style={TYPE.title} numberOfLines={1}>{item.name}</Text>
        <Text style={TYPE.caption} numberOfLines={1}>{item._restaurant?.name}</Text>
        <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6, marginTop: 4 }}>
          <Text style={TYPE.price}>{formatPrice(hasPromo ? item.discount_price : item.price)}</Text>
          {hasPromo && <Text style={styles.oldPrice}>{formatPrice(item.price)}</Text>}
        </View>
      </View>
      <View style={styles.addBtn}><Ionicons name="add" size={20} color={COLORS.white} /></View>
    </TouchableOpacity>
  );
}

export default function HomeScreen({ navigation }) {
  const tabSpace = useTabBarSpace();
  const { user } = useAuth();
  const { totalItems } = useCart();
  const { location, displayLabel } = useDeliveryLocation();
  const { isFavorite, toggleFavorite } = useFavorites();

  const [restaurants, setRestaurants] = useState([]);
  const [featured, setFeatured]       = useState([]);
  const [categories, setCategories]   = useState([]);
  const [dishes, setDishes]           = useState([]);
  const [activeCat, setActiveCat]     = useState(null);
  const [search, setSearch]           = useState('');
  const [loading, setLoading]         = useState(true);
  const [refreshing, setRefreshing]   = useState(false);
  const [error, setError]             = useState(false);
  const [sheetOpen, setSheetOpen]     = useState(false);
  const [page, setPage]               = useState(1);
  const [hasMore, setHasMore]         = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const loadedMenus = useRef(new Set());
  const scrollRef = useRef(null);
  const [nearbyY, setNearbyY] = useState(0);

  // Plats de tous les restaurants, chargés en arrière-plan pour la recherche
  const loadDishes = useCallback(async (list, reset) => {
    if (reset) loadedMenus.current = new Set();
    const todo = list.filter((r) => !loadedMenus.current.has(r.id));
    todo.forEach((r) => loadedMenus.current.add(r.id));
    const menus = await Promise.all(todo.map(async (r) => {
      try {
        const data = await restaurantService.getMenu(r.id);
        return (data.menu || []).flatMap((cat) => (cat.items || []).map((it) => ({ ...it, _restaurant: r })));
      } catch { return []; }
    }));
    setDishes((prev) => (reset ? menus.flat() : [...prev, ...menus.flat()]));
  }, []);

  const loadData = useCallback(async () => {
    setError(false);
    try {
      const [restData, featData, catData] = await Promise.all([
        restaurantService.getRestaurants(),
        restaurantService.getFeatured().catch(() => []),
        restaurantService.getCategories().catch(() => []),
      ]);
      const list = restData?.data || restData || [];
      setRestaurants(list);
      setPage(restData?.current_page || 1);
      setHasMore(!!restData?.last_page && restData.current_page < restData.last_page);
      setFeatured(Array.isArray(featData) ? featData : featData?.data || []);
      // On ne garde que les catégories qui ont au moins un restaurant
      const cats = (Array.isArray(catData) ? catData : catData?.data || [])
        .filter((c) => list.some((r) => r.category_id === c.id));
      setCategories(cats);
      loadDishes(list, true);
    } catch (e) {
      setError(true);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [loadDishes]);

  useEffect(() => { loadData(); }, [loadData]);

  // Pagination : charge la page suivante quand on arrive en bas de la liste
  const loadMore = useCallback(async () => {
    if (!hasMore || loadingMore) return;
    setLoadingMore(true);
    try {
      const res = await restaurantService.getRestaurants({ page: page + 1 });
      const next = res?.data || [];
      setRestaurants((prev) => [...prev, ...next.filter((n) => !prev.some((p) => p.id === n.id))]);
      setPage(res?.current_page || page + 1);
      setHasMore(!!res?.last_page && res.current_page < res.last_page);
      loadDishes(next);
    } catch (_) {
      setHasMore(false);
    } finally {
      setLoadingMore(false);
    }
  }, [hasMore, loadingMore, page, loadDishes]);

  const onScroll = ({ nativeEvent: { layoutMeasurement, contentOffset, contentSize } }) => {
    if (layoutMeasurement.height + contentOffset.y >= contentSize.height - 400) loadMore();
  };

  const filtered = useMemo(
    () => (activeCat ? restaurants.filter((r) => r.category_id === activeCat) : restaurants),
    [restaurants, activeCat],
  );

  const popular = useMemo(() => {
    const base = activeCat ? filtered : (featured.length ? featured : restaurants);
    return [...base]
      .sort((a, b) => (b.is_pinned ? 1 : 0) - (a.is_pinned ? 1 : 0) || (Number(b.rating) || 0) - (Number(a.rating) || 0))
      .slice(0, 10);
  }, [featured, restaurants, filtered, activeCat]);

  // Trie par distance quand on connaît la position de livraison
  const nearby = useMemo(() => {
    const withKm = filtered.map((r) => ({
      r,
      km: location?.latitude && r.latitude
        ? distanceKm(location, { latitude: Number(r.latitude), longitude: Number(r.longitude) })
        : null,
    }));
    if (withKm.some((x) => x.km != null)) withKm.sort((a, b) => (a.km ?? 9999) - (b.km ?? 9999));
    // Les restaurants mis en avant par l'admin restent en tête
    withKm.sort((a, b) => (b.r.is_pinned ? 1 : 0) - (a.r.is_pinned ? 1 : 0));
    return withKm;
  }, [filtered, location]);

  const q = search.trim().toLowerCase();
  const searchDishes = useMemo(() => (q
    ? dishes.filter((d) => d.name?.toLowerCase().includes(q) || d.description?.toLowerCase().includes(q))
    : []), [q, dishes]);
  // Restaurants dont le nom correspond, puis ceux qui proposent un plat correspondant
  const searchRestaurants = useMemo(() => {
    if (!q) return [];
    const byName = restaurants.filter((r) => r.name?.toLowerCase().includes(q) || r.category?.name?.toLowerCase().includes(q));
    const dishCount = {};
    searchDishes.forEach((d) => { if (d._restaurant) dishCount[d._restaurant.id] = (dishCount[d._restaurant.id] || 0) + 1; });
    const byDish = restaurants.filter((r) => dishCount[r.id] && !byName.includes(r));
    return [...byName, ...byDish].map((r) => ({ r, matches: dishCount[r.id] || 0 }));
  }, [q, restaurants, searchDishes]);

  const openRestaurant = (restaurant) => navigation.navigate('Restaurant', { restaurant });
  const openDish = (item) => navigation.navigate('ItemDetail', { item, restaurant: item._restaurant });

  const firstName = user?.name?.split(' ')[0];
  const bannerImage = IMAGES.homeBanner;
  const bannerFallback = featured[0]?.cover_image || restaurants.find((r) => r.cover_image)?.cover_image;

  if (loading) return <Screen><LoadingView label="Chargement des restaurants…" /></Screen>;

  return (
    <Screen>
      <ScrollView
        ref={scrollRef}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingBottom: tabSpace + (totalItems > 0 ? 70 : 0) }}
        onScroll={onScroll}
        scrollEventThrottle={200}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadData(); }} tintColor={COLORS.primary} />}
      >
        {/* ── En-tête ── */}
        <View style={styles.header}>
          <View style={styles.helloRow}>
            <Text style={styles.hello} numberOfLines={1}>{firstName ? `Bonjour ${firstName}` : 'Bonjour'}</Text>
            <Ionicons name="hand-left" size={17} color={COLORS.primary} style={styles.wave} />
          </View>
          <View style={styles.headerRight}>
            <TouchableOpacity style={styles.locationPill} onPress={() => setSheetOpen(true)} activeOpacity={0.85}>
              <Ionicons name="location" size={18} color={COLORS.primary} />
              <View style={{ maxWidth: 96 }}>
                <Text style={styles.locationHint}>Livrer à •</Text>
                <Text style={styles.locationValue} numberOfLines={1}>{displayLabel}</Text>
              </View>
              <Ionicons name="chevron-down" size={16} color={COLORS.text} />
            </TouchableOpacity>
            <IconButton
              icon="notifications-outline"
              onPress={() => (user ? navigation.navigate('Notifications') : navigation.navigate('Auth', { screen: 'Login' }))}
              size={42}
              iconSize={21}
              bg="transparent"
              style={{ shadowOpacity: 0, elevation: 0 }}
            />
          </View>
        </View>
        <Text style={styles.heroTitle}>Qu'est-ce qui vous{'\n'}ferait plaisir ?</Text>

        {/* ── Recherche ── */}
        <SearchBar
          value={search}
          onChangeText={setSearch}
          placeholder="Rechercher un plat ou un restaurant"
          onFilterPress={() => scrollRef.current?.scrollTo({ y: nearbyY, animated: true })}
          style={{ marginHorizontal: SCREEN_PADDING, marginTop: 16 }}
        />

        {q ? (
          // ── Résultats de recherche ──
          <View style={{ marginTop: 24 }}>
            {searchRestaurants.length > 0 && (
              <>
                <SectionHeader title={`Restaurants (${searchRestaurants.length})`} />
                <View style={styles.listPad}>
                  {searchRestaurants.map(({ r, matches }) => (
                    <View key={`r${r.id}`}>
                      <NearbyRow restaurant={r} onPress={() => openRestaurant(r)} />
                      {matches > 0 && (
                        <Text style={styles.matchHint}>
                          {matches} plat{matches > 1 ? 's' : ''} correspondant à « {search.trim()} »
                        </Text>
                      )}
                    </View>
                  ))}
                </View>
              </>
            )}
            {searchDishes.length > 0 && (
              <>
                <SectionHeader title={`Plats (${searchDishes.length})`} style={{ marginTop: 12 }} />
                <View style={styles.listPad}>
                  {searchDishes.slice(0, 40).map((d, i) => <DishRow key={`d${d.id}-${i}`} item={d} onPress={() => openDish(d)} />)}
                </View>
              </>
            )}
            {searchRestaurants.length === 0 && searchDishes.length === 0 && (
              <EmptyState
                icon="search"
                title="Aucun résultat"
                message={`Rien ne correspond à « ${search.trim()} ». Essayez un autre mot.`}
                actionLabel="Effacer la recherche"
                onAction={() => setSearch('')}
              />
            )}
          </View>
        ) : (
          <>
            {/* ── Catégories ── */}
            {categories.length > 0 && (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.catRow}>
                {categories.map((c) => (
                  <CategoryItem
                    key={c.id}
                    category={c}
                    active={activeCat === c.id}
                    onPress={() => setActiveCat((prev) => (prev === c.id ? null : c.id))}
                  />
                ))}
              </ScrollView>
            )}

            {/* ── Bannière ── */}
            <TouchableOpacity
              activeOpacity={0.95}
              style={styles.banner}
              onPress={() => scrollRef.current?.scrollTo({ y: nearbyY, animated: true })}
            >
              <SmartImage source={bannerImage} uri={bannerImage ? null : bannerFallback} style={StyleSheet.absoluteFill} fallbackIcon="restaurant" iconSize={1} />
              <LinearGradient
                colors={['rgba(20,20,31,0.95)', 'rgba(20,20,31,0.7)', 'rgba(20,20,31,0.05)']}
                start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }}
                style={StyleSheet.absoluteFill}
              />
              <View style={styles.bannerContent}>
                <View style={styles.bannerTag}>
                  <Ionicons name="restaurant" size={11} color={COLORS.white} />
                  <Text style={styles.bannerTagText}>Cuisine camerounaise</Text>
                </View>
                <Text style={styles.bannerTitle}>Vos saveurs préférées,{'\n'}livrées chez vous</Text>
                <Text style={styles.bannerSub}>Découvrez les restaurants près de vous</Text>
                <View style={styles.bannerCta}>
                  <Text style={styles.bannerCtaText}>Explorer les menus</Text>
                  <Ionicons name="chevron-forward" size={14} color={COLORS.white} />
                </View>
              </View>
            </TouchableOpacity>

            {error && (
              <EmptyState
                icon="cloud-offline-outline"
                title="Connexion impossible"
                message="Vérifiez votre connexion internet puis réessayez."
                actionLabel="Réessayer"
                onAction={() => { setLoading(true); loadData(); }}
              />
            )}

            {/* ── Restaurants populaires ── */}
            {popular.length > 0 && (
              <View style={{ marginTop: 28 }}>
                <SectionHeader
                  title="Restaurants populaires"
                  onAction={() => scrollRef.current?.scrollTo({ y: nearbyY, animated: true })}
                />
                <FlatList
                  data={popular}
                  horizontal
                  keyExtractor={(r) => `p${r.id}`}
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ paddingHorizontal: SCREEN_PADDING, gap: 12, paddingBottom: 8 }}
                  snapToInterval={POPULAR_CARD_W + 12}
                  snapToAlignment="start"
                  decelerationRate="fast"
                  renderItem={({ item }) => (
                    <PopularCard
                      restaurant={item}
                      onPress={() => openRestaurant(item)}
                      liked={isFavorite('restaurant', item.id)}
                      onLike={async () => {
                        const ok = await toggleFavorite('restaurant', item);
                        if (!ok) navigation.navigate('Auth', { screen: 'Login' });
                      }}
                    />
                  )}
                />
              </View>
            )}

            {/* ── Près de vous / tous les restaurants ── */}
            <View style={{ marginTop: 20 }} onLayout={(e) => setNearbyY(e.nativeEvent.layout.y)}>
              <SectionHeader
                title={location?.latitude ? 'Près de vous' : 'Tous les restaurants'}
                icon={location?.latitude ? 'location' : undefined}
                actionLabel={location?.latitude ? 'Changer' : 'Me localiser'}
                onAction={() => setSheetOpen(true)}
              />
              <View style={styles.listPad}>
                {nearby.map(({ r, km }) => <NearbyRow key={`n${r.id}`} restaurant={r} km={km} onPress={() => openRestaurant(r)} />)}
                {loadingMore && <ActivityIndicator color={COLORS.primary} style={{ marginVertical: 16 }} />}
                {!error && nearby.length === 0 && (
                  <EmptyState
                    icon="storefront-outline"
                    title="Aucun restaurant pour le moment"
                    message={activeCat ? 'Aucun restaurant ouvert dans cette catégorie.' : 'Revenez un peu plus tard.'}
                    actionLabel={activeCat ? 'Voir toutes les catégories' : undefined}
                    onAction={() => setActiveCat(null)}
                  />
                )}
              </View>
            </View>
          </>
        )}
      </ScrollView>

      {/* ── Panier flottant ── */}
      {totalItems > 0 && (
        <TouchableOpacity
          style={[styles.floatingCart, { bottom: tabSpace - 12 }]}
          onPress={() => navigation.navigate('Main', { screen: 'Panier' })}
          activeOpacity={0.9}
        >
          <View style={styles.floatingCartIcon}><Ionicons name="bag-handle" size={18} color={COLORS.primary} /></View>
          <Text style={styles.floatingCartText}>Voir le panier</Text>
          <View style={styles.floatingCartCount}><Text style={styles.floatingCartCountText}>{totalItems}</Text></View>
        </TouchableOpacity>
      )}

      <DeliveryLocationSheet visible={sheetOpen} onClose={() => setSheetOpen(false)} navigation={navigation} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: SCREEN_PADDING, paddingTop: 12, gap: 8 },
  helloRow: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6 },
  wave: { transform: [{ rotate: '-20deg' }] },
  hello: { fontFamily: FONTS.medium, fontSize: 15, color: COLORS.text },
  heroTitle: { fontFamily: FONTS.bold, fontSize: 26, lineHeight: 33, color: COLORS.text, marginTop: 6, paddingHorizontal: SCREEN_PADDING },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  locationPill: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: COLORS.surface, borderRadius: RADIUS.pill,
    paddingHorizontal: 12, paddingVertical: 7, ...SHADOWS.sm,
  },
  locationHint: { fontFamily: FONTS.regular, fontSize: 10, color: COLORS.textMuted, lineHeight: 13 },
  locationValue: { fontFamily: FONTS.semibold, fontSize: 13, color: COLORS.text, lineHeight: 17 },

  catRow: { paddingHorizontal: SCREEN_PADDING, gap: 14, paddingTop: 22, paddingBottom: 4 },
  catItem: { alignItems: 'center', width: 70 },
  catCircle: {
    width: 64, height: 64, borderRadius: 20, backgroundColor: COLORS.primarySoft,
    alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
    borderWidth: 2, borderColor: 'transparent',
  },
  catCircleActive: { borderColor: COLORS.primary, backgroundColor: COLORS.primaryLight },
  catImage: { width: '100%', height: '100%' },
  catLabel: { fontFamily: FONTS.medium, fontSize: 12, color: COLORS.text, marginTop: 6, textAlign: 'center' },

  banner: {
    marginHorizontal: SCREEN_PADDING, marginTop: 22, height: 170, borderRadius: RADIUS.xl,
    overflow: 'hidden', backgroundColor: COLORS.dark, ...SHADOWS.md,
  },
  bannerContent: { flex: 1, padding: 18, justifyContent: 'center', maxWidth: '78%' },
  bannerTag: {
    flexDirection: 'row', alignItems: 'center', gap: 5, alignSelf: 'flex-start',
    backgroundColor: COLORS.primary, borderRadius: RADIUS.pill, paddingHorizontal: 10, paddingVertical: 4,
  },
  bannerTagText: { fontFamily: FONTS.medium, fontSize: 11, color: COLORS.white },
  bannerTitle: { fontFamily: FONTS.bold, fontSize: 19, lineHeight: 25, color: COLORS.white, marginTop: 10 },
  bannerSub: { fontFamily: FONTS.regular, fontSize: 12, color: 'rgba(255,255,255,0.85)', marginTop: 4 },
  bannerCta: {
    flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start',
    backgroundColor: COLORS.primary, borderRadius: RADIUS.pill, paddingHorizontal: 16, paddingVertical: 9, marginTop: 12,
  },
  bannerCtaText: { fontFamily: FONTS.semibold, fontSize: 13, color: COLORS.white },

  popCard: { width: POPULAR_CARD_W, backgroundColor: COLORS.surface, borderRadius: RADIUS.lg, ...SHADOWS.md },
  popImage: { width: '100%', height: POPULAR_CARD_W * 0.72, borderTopLeftRadius: RADIUS.lg, borderTopRightRadius: RADIUS.lg },
  popBody: { padding: 10 },
  popName: { fontFamily: FONTS.semibold, fontSize: 14, color: COLORS.text },
  popCuisine: { fontFamily: FONTS.regular, fontSize: 11, color: COLORS.textMuted },
  popMeta: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6, flexWrap: 'wrap' },
  popHeart: {
    position: 'absolute', top: 8, right: 8, zIndex: 2, width: 30, height: 30, borderRadius: 15,
    backgroundColor: 'rgba(255,255,255,0.92)', alignItems: 'center', justifyContent: 'center',
  },
  closedOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.45)', alignItems: 'center', justifyContent: 'center' },
  closedText: { fontFamily: FONTS.semibold, color: COLORS.white, fontSize: 13 },

  listPad: { paddingHorizontal: SCREEN_PADDING, gap: 12 },
  nearCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12, padding: 10,
    backgroundColor: COLORS.surface, borderRadius: RADIUS.lg, ...SHADOWS.sm,
  },
  nearImage: { width: 84, height: 84, borderRadius: RADIUS.md },
  matchHint: { fontFamily: FONTS.medium, fontSize: 11, color: COLORS.primary, marginTop: 4, marginLeft: 6 },
  oldPrice: { fontFamily: FONTS.regular, fontSize: 12, color: COLORS.textLight, textDecorationLine: 'line-through' },
  addBtn: { width: 34, height: 34, borderRadius: 17, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center' },

  floatingCart: {
    position: 'absolute', left: SCREEN_PADDING, right: SCREEN_PADDING,
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: COLORS.primary, borderRadius: RADIUS.lg, paddingVertical: 12, paddingHorizontal: 14,
    ...SHADOWS.primary,
  },
  floatingCartIcon: { width: 34, height: 34, borderRadius: 10, backgroundColor: COLORS.white, alignItems: 'center', justifyContent: 'center' },
  floatingCartText: { flex: 1, fontFamily: FONTS.semibold, fontSize: 15, color: COLORS.white },
  floatingCartCount: { backgroundColor: 'rgba(255,255,255,0.25)', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 3 },
  floatingCartCountText: { fontFamily: FONTS.bold, fontSize: 14, color: COLORS.white },
});
