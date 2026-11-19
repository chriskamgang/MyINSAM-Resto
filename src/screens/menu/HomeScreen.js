import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, ScrollView,
  RefreshControl, Dimensions, Image, ActivityIndicator, Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useIsFocused } from '@react-navigation/native';
import Animated, { Easing, cancelAnimation, scrollTo, useAnimatedRef, useDerivedValue, useSharedValue, withTiming } from 'react-native-reanimated';
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
const CAMPAIGN = require('../../../assets/images/home-campaign.jpg');

const { width } = Dimensions.get('window');
const BANNER_WIDTH = width - SCREEN_PADDING * 2;
const POPULAR_CARD_W = Math.min(150, (width - SCREEN_PADDING * 2 - 24) / 2.3);
const CATEGORY_SPRITE = require('../../../assets/images/home-categories.jpg');
const DESSERT_IMAGE = require('../../../assets/images/home-dessert.jpg');
const CAMEROON_DISH_IMAGE = require('../../../assets/images/category-cameroon-ndole.jpg');
const GRILLADES_IMAGE = require('../../../assets/images/category-grillades.jpg');
const dishCategoryText = (dish) => `${dish.name || ''} ${dish.description || ''} ${dish._menuCategory || ''} ${dish.category?.name || ''} ${dish.category_name || ''}`;
const dishTypeText = (dish) => `${dish.name || ''} ${dish._menuCategory || ''} ${dish.category?.name || ''} ${dish.category_name || ''}`;
const FOOD_CATEGORIES = [
  { id: 'all', name: 'Tous', image: CAMEROON_DISH_IMAGE, matcher: null },
  { id: 'chicken', name: 'Poulet', imageIndex: 1, matcher: /poulet|chicken|wings?|tenders?/i },
  { id: 'grillades', name: 'Grillades', image: GRILLADES_IMAGE, matcher: /grill|brais|brochette|soya|barbecue|bbq/i },
  { id: 'sides', name: 'Accompagnements', imageIndex: 3, matcher: /frite|riz|plantain|accompagn|garniture|légume|legume/i },
  { id: 'drinks', name: 'Boissons', imageIndex: 4, matcher: /boisson|soda|\bjus\b|cola|\beau\b|café|cafe|\bthé\b|smoothie|limonade|milkshake/i },
  { id: 'desserts', name: 'Desserts', imageIndex: null, matcher: /dessert|glace|gâteau|gateau|pâtisserie|patisserie/i },
];

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
        {category.image ? <Image source={category.image} resizeMode="cover" style={[styles.catImage, category.id === 'all' && styles.catImageAll]} /> : category.imageIndex != null ? <Image source={CATEGORY_SPRITE} resizeMode="stretch" style={{ position: 'absolute', width: 270, height: 90, left: -category.imageIndex * 54, top: -18 }} /> : category.id === 'desserts' ? <Image source={DESSERT_IMAGE} style={styles.catImage} /> : img ? <Image source={img} style={styles.catImage} /> : <Ionicons name={categoryIcon(category.name)} size={25} color={COLORS.primary} />}
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
        {restaurant.is_open != null && !Boolean(restaurant.is_open) && (
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
function DishRow({ item, onPress, onAdd }) {
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
      <TouchableOpacity style={styles.addBtn} onPress={onAdd} accessibilityLabel={`Ajouter ${item.name} au panier`} hitSlop={6}>
        <Ionicons name="add" size={20} color={COLORS.white} />
      </TouchableOpacity>
    </TouchableOpacity>
  );
}

function ComboCard({ item, index, onPress, onAdd, liked, onLike }) {
  const price = item.discount_price && Number(item.discount_price) < Number(item.price) ? item.discount_price : item.price;
  const badge = Number(item.discount_price) > 0 && Number(item.discount_price) < Number(item.price)
    ? 'OFFRE SPÉCIALE' : item.is_bestseller || item.is_popular ? 'BEST-SELLER' : null;
  return (
    <TouchableOpacity style={styles.comboCard} onPress={onPress} activeOpacity={0.9}>
      <View style={styles.comboImageWrap}>
        <SmartImage uri={item.image} style={styles.comboImage} iconSize={36} />
        {badge && <Text style={styles.comboBadge}>{badge}</Text>}
        <TouchableOpacity style={styles.comboHeart} onPress={onLike} hitSlop={8}>
          <Ionicons name={liked ? 'heart' : 'heart-outline'} size={19} color={liked ? COLORS.primary : '#666'} />
        </TouchableOpacity>
      </View>
      <View style={styles.comboBody}>
        <Text style={styles.comboTitle} numberOfLines={1}>{item.name}</Text>
        <Text style={styles.comboSubtitle} numberOfLines={1}>{item._restaurant?.name}</Text>
        <View style={styles.comboRating}><Ionicons name="star" size={13} color="#FFB400" /><Text style={styles.comboRatingText}>{Number(item._restaurant?.rating) > 0 ? Number(item._restaurant.rating).toFixed(1) : 'Nouveau'}</Text></View>
        <View style={styles.comboBottom}><Text style={styles.comboPrice} numberOfLines={1}>{formatPrice(price)}</Text><TouchableOpacity style={styles.comboAdd} onPress={onAdd} accessibilityLabel={`Ajouter ${item.name} au panier`} hitSlop={6}><Ionicons name="add" size={19} color="#fff" /></TouchableOpacity></View>
      </View>
    </TouchableOpacity>
  );
}

export default function HomeScreen({ navigation }) {
  const isFocused = useIsFocused();
  const tabSpace = useTabBarSpace();
  const { user } = useAuth();
  const { totalItems, addItem } = useCart();
  const { location, displayLabel } = useDeliveryLocation();
  const { isFavorite, toggleFavorite } = useFavorites();

  const [restaurants, setRestaurants] = useState([]);
  const [dishes, setDishes]           = useState([]);
  const [remoteRestaurants, setRemoteRestaurants] = useState([]);
  const [remoteSearching, setRemoteSearching] = useState(false);
  const [activeCat, setActiveCat]     = useState(null);
  const [showAllDishes, setShowAllDishes] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
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
  const categoryYRef = useRef(0);
  const bannerRef = useAnimatedRef();
  const bannerOffset = useSharedValue(0);
  const bannerDraggingRef = useRef(false);
  const bannerAutoRef = useRef(false);
  const bannerAutoEndRef = useRef(null);
  const bannerIndexRef = useRef(0);
  const [bannerIndex, setBannerIndex] = useState(0);
  const [nearbyY, setNearbyY] = useState(0);

  // Plats de tous les restaurants, chargés en arrière-plan pour la recherche
  const loadDishes = useCallback(async (list, reset) => {
    if (reset) loadedMenus.current = new Set();
    const todo = list.filter((r) => !loadedMenus.current.has(r.id));
    todo.forEach((r) => loadedMenus.current.add(r.id));
    const menus = await Promise.all(todo.map(async (r) => {
      try {
        const data = await restaurantService.getMenu(r.id);
        return (data.menu || []).flatMap((cat) => (cat.items || []).map((it) => ({ ...it, _restaurant: r, _menuCategory: cat.name })));
      } catch { return []; }
    }));
    setDishes((prev) => (reset ? menus.flat() : [...prev, ...menus.flat()]));
  }, []);

  const loadData = useCallback(async () => {
    setError(false);
    try {
      const restData = await restaurantService.getRestaurants();
      const list = restData?.data || restData || [];
      setRestaurants(list);
      setPage(restData?.current_page || 1);
      setHasMore(!!restData?.last_page && restData.current_page < restData.last_page);
      await loadDishes(list, true);
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
      await loadDishes(next);
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
    () => (typeof activeCat === 'number' ? restaurants.filter((r) => r.category_id === activeCat) : restaurants),
    [restaurants, activeCat],
  );

  const activeRestaurants = useMemo(() => [...restaurants]
    .filter((r) => r.is_open == null || Boolean(r.is_open))
    .sort((a, b) => (Number(b.orders_count) || 0) - (Number(a.orders_count) || 0)
      || (b.is_pinned ? 1 : 0) - (a.is_pinned ? 1 : 0)
      || (Number(b.rating) || 0) - (Number(a.rating) || 0))
    .slice(0, 10), [restaurants]);

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
  const categoryMatcher = FOOD_CATEGORIES.find((c) => c.id === activeCat)?.matcher;
  const selectCategory = (id) => { setActiveCat(id === 'all' ? null : id); setShowAllDishes(false); };
  useEffect(() => {
    if ((q.length >= 2 || showAllDishes) && hasMore && !loadingMore) loadMore();
  }, [q, showAllDishes, hasMore, loadingMore, loadMore]);
  useEffect(() => {
    setRemoteRestaurants([]);
    if (q.length < 2) { setRemoteSearching(false); return undefined; }
    let cancelled = false;
    setRemoteSearching(true);
    const timer = setTimeout(async () => {
      try {
        const response = await restaurantService.getRestaurants({ search: q });
        if (!cancelled) setRemoteRestaurants(Array.isArray(response) ? response : response?.data || []);
      } catch {
        if (!cancelled) setRemoteRestaurants([]);
      } finally {
        if (!cancelled) setRemoteSearching(false);
      }
    }, 350);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [q]);
  useEffect(() => {
    if (remoteRestaurants.length > 0) loadDishes(remoteRestaurants, false);
  }, [remoteRestaurants, loadDishes]);
  const searchDishes = useMemo(() => (q
    ? dishes.filter((d) => d.is_available !== false && dishCategoryText(d).toLowerCase().includes(q) && (!categoryMatcher || categoryMatcher.test(dishTypeText(d))))
    : []), [q, dishes, categoryMatcher]);
  // Restaurants dont le nom correspond, puis ceux qui proposent un plat correspondant
  const searchRestaurants = useMemo(() => {
    if (!q) return [];
    const allRestaurants = [...restaurants, ...remoteRestaurants.filter((r) => !restaurants.some((local) => local.id === r.id))];
    const byName = allRestaurants.filter((r) => r.name?.toLowerCase().includes(q) || r.category?.name?.toLowerCase().includes(q));
    const dishCount = {};
    searchDishes.forEach((d) => { if (d._restaurant) dishCount[d._restaurant.id] = (dishCount[d._restaurant.id] || 0) + 1; });
    const byDish = allRestaurants.filter((r) => dishCount[r.id] && !byName.includes(r));
    return [...byName, ...byDish].map((r) => ({ r, matches: dishCount[r.id] || 0 }));
  }, [q, restaurants, remoteRestaurants, searchDishes]);

  const openRestaurant = (restaurant) => navigation.navigate('Restaurant', { restaurant });
  const openDish = (item) => navigation.navigate('ItemDetail', { item, restaurant: item._restaurant });
  const openMenuDestination = (screen) => {
    setMenuOpen(false);
    if (screen === 'restaurants') {
      requestAnimationFrame(() => scrollRef.current?.scrollTo({ y: nearbyY, animated: true }));
    } else {
      navigation.navigate('Main', { screen });
    }
  };
  const addDish = (item) => {
    if ((item.option_groups || []).some((group) => group.is_required)) return openDish(item);
    const price = Number(item.price) || 0;
    const promo = Number(item.discount_price) || 0;
    return addItem({ ...item, effective_price: promo > 0 && promo < price ? promo : price }, 1, item._restaurant);
  };

  const comboDishes = useMemo(() => {
    const matcher = FOOD_CATEGORIES.find((c) => c.id === activeCat)?.matcher;
    return dishes.filter((d) => d.is_available !== false && (!matcher || matcher.test(dishTypeText(d))))
      .map((item, index) => ({ item, index, date: Date.parse(item.created_at || item.createdAt || item.published_at || '') || 0 }))
      .sort((a, b) => b.date - a.date || a.index - b.index)
      .map(({ item }) => item);
  }, [dishes, activeCat]);

  const recentDishes = useMemo(() => dishes
    .filter((item) => item.id && item.is_available !== false)
    .map((item, index) => ({ item, index, date: Date.parse(item.created_at || item.createdAt || item.published_at || '') || 0 }))
    .sort((a, b) => b.date - a.date || a.index - b.index)
    .slice(0, 5)
    .map(({ item }) => item), [dishes]);

  useDerivedValue(() => {
    scrollTo(bannerRef, bannerOffset.value, 0, false);
  });

  useEffect(() => {
    if (bannerAutoEndRef.current) clearTimeout(bannerAutoEndRef.current);
    bannerAutoRef.current = false;
    cancelAnimation(bannerOffset);
    bannerOffset.value = 0;
    bannerIndexRef.current = 0;
    setBannerIndex(0);
  }, [recentDishes, bannerOffset]);

  useEffect(() => {
    if (!isFocused || recentDishes.length < 2 || q) return undefined;
    const timer = setInterval(() => {
      if (bannerDraggingRef.current) return;
      const next = bannerIndexRef.current + 1;
      bannerIndexRef.current = next % recentDishes.length;
      bannerAutoRef.current = true;
      bannerOffset.value = withTiming(next * BANNER_WIDTH, {
        duration: 2300,
        easing: Easing.inOut(Easing.sin),
      }, (finished) => {
        if (finished && next === recentDishes.length) bannerOffset.value = 0;
      });
      setBannerIndex(next % recentDishes.length);
      bannerAutoEndRef.current = setTimeout(() => { bannerAutoRef.current = false; }, 2400);
    }, 7200);
    return () => {
      clearInterval(timer);
      if (bannerAutoEndRef.current) clearTimeout(bannerAutoEndRef.current);
      bannerAutoRef.current = false;
      cancelAnimation(bannerOffset);
    };
  }, [isFocused, recentDishes.length, q, bannerOffset]);

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
          <IconButton icon="menu" size={42} color={COLORS.text} onPress={() => setMenuOpen(true)} />
          <View style={styles.brand}><View style={styles.brandSeal}><Text style={styles.brandSealE}>e</Text><Text style={styles.brandSealName}>ESTUAIRE</Text><Text style={styles.brandSealEat}>EAT</Text></View><View><Text style={styles.brandTop}>ESTUAIRE</Text><Text style={styles.brandMain}>EAT_</Text><Text style={styles.brandSub}>Bon goût, toujours !</Text></View></View>
          <View style={styles.headerRight}>
            <IconButton icon="notifications-outline" size={42} badge={0} onPress={() => (user ? navigation.navigate('Notifications') : navigation.navigate('Auth', { screen: 'Login' }))} />
            <IconButton icon="bag-handle-outline" size={42} badge={totalItems} onPress={() => navigation.navigate('Main', { screen: 'Panier' })} />
          </View>
        </View>

        {/* ── Recherche ── */}
        <View style={styles.homeSearchRow}>
          <SearchBar
            value={search}
            onChangeText={setSearch}
            placeholder="Rechercher un plat ou un restaurant..."
            style={styles.homeSearchInput}
          />
          <TouchableOpacity accessibilityLabel="Filtrer les plats" style={styles.searchFilterButton} onPress={() => scrollRef.current?.scrollTo({ y: categoryYRef.current, animated: true })}>
            <Ionicons name="options-outline" size={21} color={COLORS.text} />
          </TouchableOpacity>
        </View>

        {q ? (
          // ── Résultats de recherche ──
          <View style={{ marginTop: 8 }}>
            <View onLayout={(e) => { categoryYRef.current = e.nativeEvent.layout.y; }}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.catRow}>
                {FOOD_CATEGORIES.map((c) => <CategoryItem key={c.id} category={c} active={(activeCat || 'all') === c.id} onPress={() => selectCategory(c.id)} />)}
              </ScrollView>
            </View>
            {(remoteSearching || loadingMore) && <ActivityIndicator color={COLORS.primary} style={{ marginVertical: 12 }} />}
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
                  {searchDishes.map((d, i) => <DishRow key={`d${d.id}-${i}`} item={d} onPress={() => openDish(d)} onAdd={() => addDish(d)} />)}
                </View>
              </>
            )}
            {!remoteSearching && !loadingMore && (q.length < 2 || !hasMore) && searchRestaurants.length === 0 && searchDishes.length === 0 && (
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
            {/* ── Bannière ── */}
            <View style={styles.banner}>
              {recentDishes.length > 0 ? (
                <>
                  <Animated.ScrollView
                    ref={bannerRef}
                    horizontal
                    pagingEnabled
                    scrollEnabled={recentDishes.length > 1}
                    showsHorizontalScrollIndicator={false}
                    onScrollBeginDrag={() => { bannerDraggingRef.current = true; bannerAutoRef.current = false; cancelAnimation(bannerOffset); }}
                    onScrollEndDrag={() => { bannerDraggingRef.current = false; }}
                    onMomentumScrollEnd={(event) => {
                      if (bannerAutoRef.current) return;
                      const page = Math.min(recentDishes.length, Math.max(0, Math.round(event.nativeEvent.contentOffset.x / BANNER_WIDTH)));
                      const index = page % recentDishes.length;
                      bannerOffset.value = index * BANNER_WIDTH;
                      bannerIndexRef.current = index;
                      setBannerIndex(index);
                    }}
                  >
                    {(recentDishes.length > 1 ? [...recentDishes, recentDishes[0]] : recentDishes).map((item, slideIndex) => (
                      <TouchableOpacity key={`${item._restaurant?.id}-${item.id}-${slideIndex}`} style={styles.bannerSlide} activeOpacity={0.95} onPress={() => openDish(item)}>
                        <SmartImage uri={item.image} source={item.image ? null : CAMPAIGN} style={StyleSheet.absoluteFill} iconSize={1} />
                        <LinearGradient colors={['rgba(0,0,0,0.96)', 'rgba(0,0,0,0.7)', 'rgba(0,0,0,0.04)']} start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }} style={StyleSheet.absoluteFill} />
                        <View style={styles.bannerContent}>
                          <View style={styles.bannerTag}><Text style={styles.bannerTagText}>À DÉCOUVRIR</Text></View>
                          <Text style={styles.bannerTitle} numberOfLines={2}>{item.name}</Text>
                          <Text style={styles.bannerSub} numberOfLines={2}>{item.description || item._restaurant?.name || 'Découvrez ce plat'}</Text>
                          <Text style={styles.bannerPrice}>{formatPrice(item.discount_price && Number(item.discount_price) < Number(item.price) ? item.discount_price : item.price)}</Text>
                          <View style={styles.bannerCta}><Text style={styles.bannerCtaText}>Voir le plat</Text><Ionicons name="arrow-forward-circle" size={20} color={COLORS.white} /></View>
                        </View>
                      </TouchableOpacity>
                    ))}
                  </Animated.ScrollView>
                  {recentDishes.length > 1 && <View pointerEvents="none" style={styles.bannerDots}>{recentDishes.map((item, index) => <View key={`${item._restaurant?.id}-${item.id}`} style={[styles.bannerDot, index === bannerIndex && styles.bannerDotActive]} />)}</View>}
                </>
              ) : (
                <View style={styles.bannerSlide}>
                  <Image source={CAMPAIGN} style={StyleSheet.absoluteFill} resizeMode="cover" />
                  <View style={styles.bannerContent}><Text style={styles.bannerTitle}>ESTUAIRE EAT_</Text><Text style={styles.bannerSub}>Le menu sera bientôt disponible.</Text></View>
                </View>
              )}
            </View>

            {/* ── Catégories ── */}
            <View onLayout={(e) => { categoryYRef.current = e.nativeEvent.layout.y; }}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.catRow}>
                {FOOD_CATEGORIES.map((c) => (
                  <CategoryItem key={c.id} category={c} active={(activeCat || 'all') === c.id} onPress={() => selectCategory(c.id)} />
                ))}
              </ScrollView>
            </View>

            {activeRestaurants.length > 0 && (
              <View style={styles.activeSection}>
                <SectionHeader title="Restaurants actifs" onAction={() => scrollRef.current?.scrollTo({ y: nearbyY, animated: true })} />
                <FlatList
                  data={activeRestaurants}
                  horizontal
                  keyExtractor={(r) => `active-${r.id}`}
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ paddingHorizontal: SCREEN_PADDING, gap: 12, paddingBottom: 8 }}
                  renderItem={({ item }) => <PopularCard restaurant={item} onPress={() => openRestaurant(item)} liked={isFavorite('restaurant', item.id)} onLike={async () => { const ok = await toggleFavorite('restaurant', item); if (!ok) navigation.navigate('Auth', { screen: 'Login' }); }} />}
                />
              </View>
            )}

            <View style={styles.comboSection}>
              <View style={styles.comboHeader}><View style={styles.comboMark} /><Text style={styles.comboHeading}>{activeCat ? FOOD_CATEGORIES.find((c) => c.id === activeCat)?.name || 'Plats' : 'Nouveaux plats'}</Text>{comboDishes.length > 3 && <TouchableOpacity onPress={() => setShowAllDishes((value) => !value)}><Text style={styles.comboSeeAll}>{showAllDishes ? 'Voir moins ↑' : 'Voir tout  →'}</Text></TouchableOpacity>}</View>
              {comboDishes.length > 0 ? showAllDishes ? <View style={styles.listPad}>
                {comboDishes.map((item, index) => <DishRow key={`all-${item._restaurant?.id}-${item.id}-${index}`} item={item} onPress={() => openDish(item)} onAdd={() => addDish(item)} />)}
                {loadingMore && <ActivityIndicator color={COLORS.primary} style={{ marginVertical: 10 }} />}
              </View> : <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.comboRow}>
                {comboDishes.slice(0, 12).map((item, index) => <ComboCard key={`${item._restaurant?.id}-${item.id}-${index}`} item={item} index={index} onPress={() => openDish(item)} onAdd={() => addDish(item)} liked={isFavorite('item', item.id)} onLike={async () => { const ok = await toggleFavorite('item', item); if (!ok) navigation.navigate('Auth', { screen: 'Login' }); }} />)}
              </ScrollView> : <Text style={styles.comboEmpty}>{activeCat ? `Aucun plat dans « ${FOOD_CATEGORIES.find((c) => c.id === activeCat)?.name || 'cette catégorie'} » pour le moment.` : 'Les plats apparaîtront dès que le menu sera disponible.'}</Text>}
            </View>

            {error && (
              <EmptyState
                icon="cloud-offline-outline"
                title="Connexion impossible"
                message="Vérifiez votre connexion internet puis réessayez."
                actionLabel="Réessayer"
                onAction={() => { setLoading(true); loadData(); }}
              />
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
                    message="Revenez un peu plus tard."
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

      <Modal visible={menuOpen} transparent animationType="fade" onRequestClose={() => setMenuOpen(false)}>
        <View style={styles.menuModal}>
          <TouchableOpacity style={StyleSheet.absoluteFill} onPress={() => setMenuOpen(false)} accessibilityLabel="Fermer le menu" />
          <View style={styles.menuPanel}>
            <View style={styles.menuHeader}>
              <Text style={styles.menuTitle}>ESTUAIRE EAT</Text>
              <IconButton icon="close" size={34} onPress={() => setMenuOpen(false)} />
            </View>
            {[
              ['restaurant-outline', 'Restaurants', 'restaurants'],
              ['basket-outline', 'Marché', 'Marché'],
              ['cart-outline', 'Panier', 'Panier'],
              ['receipt-outline', 'Commandes', 'Commandes'],
              ['person-outline', 'Profil', 'Profil'],
            ].map(([icon, label, destination]) => (
              <TouchableOpacity key={label} style={styles.menuLink} onPress={() => openMenuDestination(destination)}>
                <Ionicons name={icon} size={20} color={COLORS.primary} />
                <Text style={styles.menuLinkText}>{label}</Text>
                <Ionicons name="chevron-forward" size={18} color={COLORS.textMuted} />
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </Modal>
      <DeliveryLocationSheet visible={sheetOpen} onClose={() => setSheetOpen(false)} navigation={navigation} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  menuModal: { flex: 1, backgroundColor: 'rgba(0,0,0,0.42)', justifyContent: 'flex-start' },
  menuPanel: { width: '78%', maxWidth: 320, height: '100%', backgroundColor: '#FFF9F6', paddingTop: 48, paddingHorizontal: 18, ...SHADOWS.md },
  menuHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingBottom: 22 },
  menuTitle: { fontFamily: FONTS.extrabold, fontSize: 18, color: COLORS.primary },
  menuLink: { height: 51, flexDirection: 'row', alignItems: 'center', gap: 13, borderBottomWidth: 1, borderBottomColor: COLORS.divider },
  menuLinkText: { flex: 1, fontFamily: FONTS.semibold, fontSize: 14, color: COLORS.text },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: SCREEN_PADDING, paddingTop: 5, height: 68, gap: 6, backgroundColor: '#FFF4EB' },
  brand: { flex: 1, marginLeft: 3, flexDirection: 'row', alignItems: 'center', gap: 5 },
  brandSeal: { width: 45, height: 45, borderRadius: 23, borderWidth: 2, borderColor: '#B41818', backgroundColor: '#C61E16', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  brandSealE: { position: 'absolute', top: -6, fontFamily: FONTS.extrabold, fontSize: 28, color: '#FFD44D' },
  brandSealName: { position: 'absolute', top: 19, backgroundColor: '#fff', color: '#B41818', fontFamily: FONTS.extrabold, fontSize: 6, width: 46, textAlign: 'center' },
  brandSealEat: { position: 'absolute', bottom: 1, color: '#FFD44D', fontFamily: FONTS.extrabold, fontSize: 8 },
  brandTop: { fontFamily: FONTS.extrabold, fontSize: 11, lineHeight: 13, color: '#161616', fontStyle: 'italic' },
  brandMain: { fontFamily: FONTS.extrabold, fontSize: 22, lineHeight: 23, color: COLORS.primary, fontStyle: 'italic' },
  brandSub: { fontFamily: FONTS.semibold, fontSize: 7, color: '#181818', fontStyle: 'italic' },
  helloRow: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6 },
  wave: { transform: [{ rotate: '-20deg' }] },
  hello: { fontFamily: FONTS.medium, fontSize: 15, color: COLORS.text },
  heroTitle: { fontFamily: FONTS.bold, fontSize: 26, lineHeight: 33, color: COLORS.text, marginTop: 6, paddingHorizontal: SCREEN_PADDING },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  homeSearchRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginHorizontal: SCREEN_PADDING, marginTop: 7, marginBottom: 9 },
  homeSearchInput: { flex: 1, height: 43, borderWidth: 0, paddingRight: 12 },
  searchFilterButton: { width: 43, height: 43, borderRadius: 22, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', ...SHADOWS.sm },
  locationPill: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: COLORS.surface, borderRadius: RADIUS.pill,
    paddingHorizontal: 12, paddingVertical: 7, ...SHADOWS.sm,
  },
  locationHint: { fontFamily: FONTS.regular, fontSize: 10, color: COLORS.textMuted, lineHeight: 13 },
  locationValue: { fontFamily: FONTS.semibold, fontSize: 13, color: COLORS.text, lineHeight: 17 },

  catRow: { paddingHorizontal: SCREEN_PADDING, gap: 9, paddingTop: 12, paddingBottom: 8 },
  catItem: { alignItems: 'center', width: 61 },
  catCircle: {
    width: 54, height: 54, borderRadius: 27, backgroundColor: COLORS.white,
    alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
    borderWidth: 2, borderColor: 'transparent',
  },
  catCircleActive: { borderColor: COLORS.primary, backgroundColor: COLORS.white },
  catImage: { width: '100%', height: '100%' },
  catImageAll: { position: 'absolute', width: 58, height: 58, left: -2, top: -5 },
  catLabel: { fontFamily: FONTS.semibold, fontSize: 9, color: COLORS.text, marginTop: 4, textAlign: 'center' },

  banner: {
    marginHorizontal: SCREEN_PADDING, marginTop: 4, height: 166, borderRadius: RADIUS.xl,
    overflow: 'hidden', backgroundColor: COLORS.dark, ...SHADOWS.md,
  },
  bannerSlide: { width: BANNER_WIDTH, height: 166 },
  bannerContent: { flex: 1, padding: 14, justifyContent: 'center', maxWidth: '63%' },
  bannerTag: {
    flexDirection: 'row', alignItems: 'center', gap: 5, alignSelf: 'flex-start',
    backgroundColor: COLORS.primary, borderRadius: RADIUS.pill, paddingHorizontal: 8, paddingVertical: 3,
  },
  bannerTagText: { fontFamily: FONTS.bold, fontSize: 9, color: COLORS.white },
  bannerTitle: { fontFamily: FONTS.extrabold, fontSize: 19, lineHeight: 23, color: COLORS.white, marginTop: 6, fontStyle: 'italic' },
  bannerSub: { fontFamily: FONTS.medium, fontSize: 10, lineHeight: 14, color: '#fff', marginTop: 2 },
  bannerPrice: { fontFamily: FONTS.bold, fontSize: 13, color: '#fff', marginTop: 5 },
  bannerCta: {
    flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start',
    backgroundColor: COLORS.primary, borderRadius: RADIUS.pill, paddingHorizontal: 9, paddingVertical: 5, marginTop: 7,
  },
  bannerCtaText: { fontFamily: FONTS.semibold, fontSize: 9, color: COLORS.white },
  bannerDots: { position: 'absolute', bottom: 8, left: 0, right: 0, flexDirection: 'row', justifyContent: 'center', gap: 5 },
  bannerDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#fff' },
  bannerDotActive: { width: 13, backgroundColor: COLORS.primary },
  activeSection: { marginTop: 4, marginBottom: 13 },
  comboSection: { marginTop: 1 },
  comboHeader: { marginHorizontal: SCREEN_PADDING, marginBottom: 9, flexDirection: 'row', alignItems: 'center' },
  comboMark: { width: 4, height: 21, borderRadius: 2, backgroundColor: COLORS.primary, marginRight: 9 },
  comboHeading: { flex: 1, fontFamily: FONTS.bold, fontSize: 18, color: '#111' },
  comboSeeAll: { fontFamily: FONTS.semibold, fontSize: 11, color: COLORS.primary },
  comboRow: { paddingHorizontal: SCREEN_PADDING, gap: 10, paddingBottom: 8 },
  comboCard: { width: Math.max(104, (width - 60) / 3), borderRadius: 13, backgroundColor: '#fff', overflow: 'hidden', ...SHADOWS.sm },
  comboImageWrap: { height: 91 },
  comboImage: { width: '100%', height: '100%' },
  comboBadge: { position: 'absolute', top: 6, left: 6, backgroundColor: COLORS.primary, color: '#fff', fontFamily: FONTS.bold, fontSize: 7, borderRadius: 10, overflow: 'hidden', paddingHorizontal: 6, paddingVertical: 2 },
  comboHeart: { position: 'absolute', top: 5, right: 5, width: 24, height: 24, borderRadius: 12, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  comboBody: { paddingHorizontal: 8, paddingBottom: 6 },
  comboTitle: { fontFamily: FONTS.bold, fontSize: 11, color: '#111' },
  comboSubtitle: { fontFamily: FONTS.regular, fontSize: 9, color: '#333' },
  comboRating: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 1 },
  comboRatingText: { fontFamily: FONTS.medium, fontSize: 9, color: '#555' },
  comboBottom: { flexDirection: 'row', alignItems: 'center', marginTop: 2 },
  comboPrice: { flex: 1, fontFamily: FONTS.bold, fontSize: 11, color: '#111' },
  comboAdd: { width: 24, height: 24, borderRadius: 12, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center' },
  comboEmpty: { marginHorizontal: SCREEN_PADDING, marginBottom: 10, fontFamily: FONTS.regular, color: COLORS.textMuted, fontSize: 12 },
  promoBanner: { marginHorizontal: SCREEN_PADDING, marginTop: 5, height: 100, borderRadius: 18, overflow: 'hidden', backgroundColor: '#111', flexDirection: 'row', alignItems: 'center' },
  promoCopy: { flex: 1, marginLeft: 16 },
  promoLead: { fontFamily: FONTS.semibold, fontStyle: 'italic', color: '#fff', fontSize: 13 },
  promoBig: { fontFamily: FONTS.extrabold, fontStyle: 'italic', color: COLORS.primary, fontSize: 20, lineHeight: 24 },
  promoSmall: { fontFamily: FONTS.medium, color: '#fff', fontSize: 8 },
  promoAction: { marginRight: 8, marginTop: 38, borderRadius: 16, backgroundColor: '#fff', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, height: 29 },
  promoActionText: { fontFamily: FONTS.bold, color: '#111', fontSize: 8 },

  popCard: { width: POPULAR_CARD_W, backgroundColor: COLORS.surface, borderRadius: RADIUS.lg, ...SHADOWS.md },
  popImage: { width: '100%', height: POPULAR_CARD_W * 0.64, borderTopLeftRadius: RADIUS.lg, borderTopRightRadius: RADIUS.lg },
  popBody: { padding: 8 },
  popName: { fontFamily: FONTS.semibold, fontSize: 12, color: COLORS.text },
  popCuisine: { fontFamily: FONTS.regular, fontSize: 10, color: COLORS.textMuted },
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
