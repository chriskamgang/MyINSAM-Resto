import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, ScrollView,
  RefreshControl, Dimensions, Image, ActivityIndicator, Share,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useIsFocused } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { Easing, cancelAnimation, scrollTo, useAnimatedRef, useAnimatedStyle, useDerivedValue, useSharedValue, withTiming } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { restaurantService } from '../../services/restaurantService';
import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';
import { useDeliveryLocation } from '../../context/DeliveryLocationContext';
import { useFavorites } from '../../context/FavoritesContext';
import { COLORS, FONTS, TYPE, RADIUS, SHADOWS, SCREEN_PADDING, formatPrice } from '../../theme';
import { useTabBarSpace } from '../../hooks/useTabBarSpace';
import { getDishUnavailableLabel, isDishFeaturedForDay, isDishOrderableToday } from '../../hooks/useMenuDay';
import { useMenuDaySelection } from '../../context/MenuDayContext';
import MenuDaySelector from '../../components/MenuDaySelector';
import { categoryImage, categoryIcon, dishFallbackImage } from '../../theme/images';
import {
  Screen, SearchBar, SectionHeader, SmartImage, Rating, MetaItem, EmptyState, LoadingView, IconButton,
} from '../../components/ui';
import DeliveryLocationSheet from '../../components/DeliveryLocationSheet';
import RestaurantFeatureCard from '../../components/RestaurantFeatureCard';
const HERO_IMAGE = require('../../../assets/images/home-grill-hero.png');
const CLOCHE_IMAGE = require('../../../assets/images/home-cloche-banner.png');
const PROMO_GIFT = require('../../../assets/images/restaurant-promo-gift.png');

const { width } = Dimensions.get('window');
const BANNER_WIDTH = width;
const CATEGORY_SPRITE = require('../../../assets/images/home-categories.png');
const CAMEROON_DISH_IMAGE = require('../../../assets/images/category-cameroon-ndole.png');
const GRILLADES_IMAGE = require('../../../assets/images/category-grillades.png');
const PIZZA_IMAGE = require('../../../assets/images/category-pizza.png');
const dishCategoryText = (dish) => `${dish.name || ''} ${dish.description || ''} ${dish._menuCategory || ''} ${dish.category?.name || ''} ${dish.category_name || ''}`;
const dishTypeText = (dish) => `${dish.name || ''} ${dish._menuCategory || ''} ${dish.category?.name || ''} ${dish.category_name || ''}`;
const FOOD_CATEGORIES = [
  { id: 'all', name: 'Tous', image: CAMEROON_DISH_IMAGE, matcher: null },
  { id: 'chicken', name: 'Poulet', imageIndex: 1, matcher: /poulet|chicken|wings?|tenders?/i },
  { id: 'pizza', name: 'Pizza', image: PIZZA_IMAGE, matcher: /pizza/i },
  { id: 'grillades', name: 'Grillades', image: GRILLADES_IMAGE, matcher: /grill|brais|brochette|soya|barbecue|bbq/i },
  { id: 'fries', name: 'Frites', imageIndex: 3, matcher: /frite|chips/i },
  { id: 'drinks', name: 'Boissons', imageIndex: 4, matcher: /boisson|soda|\bjus\b|cola|\beau\b|café|cafe|\bthé\b|smoothie|limonade|milkshake/i },
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
      <View style={[styles.catTile, active && styles.catTileActive]}>
        {category.id === 'all' ? <MaterialCommunityIcons name="room-service-outline" size={38} color={active ? '#fff' : COLORS.primary} style={{ marginTop: 6 }} /> : category.image ? <Image source={category.image} resizeMode="cover" style={styles.catImage} /> : category.imageIndex != null ? <Image source={CATEGORY_SPRITE} resizeMode="stretch" style={{ position: 'absolute', width: 250, height: 84, left: -category.imageIndex * 50, top: -5 }} /> : img ? <Image source={img} style={styles.catImage} /> : <Ionicons name={categoryIcon(category.name)} size={25} color={COLORS.primary} />}
        <Text style={[styles.catLabel, active && styles.catLabelActive]} numberOfLines={1}>{category.name}</Text>
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
function DishRow({ item, onPress, onAdd, day }) {
  const hasPromo = item.discount_price && Number(item.discount_price) < Number(item.price);
  const orderable = isDishOrderableToday(item, day);
  return (
    <TouchableOpacity style={styles.nearCard} onPress={onPress} activeOpacity={0.9}>
      <SmartImage uri={item.image} style={styles.nearImage} iconSize={24} />
      <View style={{ flex: 1 }}>
        <Text style={TYPE.title} numberOfLines={1}>{item.name}</Text>
        <Text style={TYPE.caption} numberOfLines={1}>{item._restaurant?.name}</Text>
        {!orderable && <Text style={styles.notToday} numberOfLines={2}>{getDishUnavailableLabel(item, day)}</Text>}
        <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6, marginTop: 4 }}>
          <Text style={TYPE.price}>{formatPrice(hasPromo ? item.discount_price : item.price)}</Text>
          {hasPromo && <Text style={styles.oldPrice}>{formatPrice(item.price)}</Text>}
        </View>
      </View>
      <TouchableOpacity style={[styles.addBtn, !orderable && { backgroundColor: '#B8B8B8' }]} onPress={onAdd} accessibilityLabel={orderable ? `Ajouter ${item.name} au panier` : `Voir la disponibilité de ${item.name}`} hitSlop={6}>
        <Ionicons name="add" size={20} color={COLORS.white} />
      </TouchableOpacity>
    </TouchableOpacity>
  );
}

function HomeDishCard({ item, liked, onLike, onPress, onAdd, previewOnly }) {
  const base = Number(item.price) || 0;
  const promo = Number(item.discount_price) || 0;
  const hasPromo = promo > 0 && promo < base;
  const badge = hasPromo ? `−${Math.round((1 - promo / base) * 100)}%` : item.is_featured ? 'Spécialité' : null;
  return (
    <TouchableOpacity style={styles.dishCard} onPress={onPress} activeOpacity={0.9} accessibilityLabel={`Voir ${item.name}`}>
      <SmartImage uri={item.image} fallbackSource={dishFallbackImage(item)} style={styles.dishPhoto}>
        <LinearGradient colors={['rgba(0,0,0,0.24)', 'transparent']} style={StyleSheet.absoluteFill} />
        {badge && <View style={[styles.dishBadge, hasPromo && { backgroundColor: '#13A75B' }]}><Ionicons name={hasPromo ? 'pricetag' : 'star'} size={10} color="#fff" /><Text style={styles.dishBadgeText}>{badge}</Text></View>}
        <TouchableOpacity style={styles.dishHeart} onPress={onLike} accessibilityLabel={liked ? 'Retirer des favoris' : 'Ajouter aux favoris'} hitSlop={6}>
          <Ionicons name={liked ? 'heart' : 'heart-outline'} size={17} color={liked ? COLORS.primary : '#171B22'} />
        </TouchableOpacity>
      </SmartImage>
      <View style={styles.dishBody}>
        <Text style={styles.dishName} numberOfLines={1}>{item.name}</Text>
        <Text style={styles.dishDescription} numberOfLines={1}>{item.description || item._restaurant?.name || 'Plat du jour'}</Text>
        <View style={styles.dishBottom}>
          <View style={{ flex: 1 }}><Text style={styles.dishPrice} numberOfLines={1}>{formatPrice(hasPromo ? promo : base)}</Text>{hasPromo && <Text style={styles.dishOldPrice}>{formatPrice(base)}</Text>}</View>
          <TouchableOpacity style={styles.dishAdd} onPress={onAdd} accessibilityLabel={previewOnly ? `Voir quand ${item.name} est disponible` : `Ajouter ${item.name} au panier`}><Ionicons name={previewOnly ? 'calendar-outline' : 'cart-outline'} size={17} color="#fff" /></TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );
}

export default function HomeScreen({ navigation }) {
  const isFocused = useIsFocused();
  const { today, selectedDay: menuDay } = useMenuDaySelection();
  const tabSpace = useTabBarSpace();
  const { user } = useAuth();
  const { addItem } = useCart();
  const { displayLabel } = useDeliveryLocation();
  const insets = useSafeAreaInsets();
  const { isFavorite, toggleFavorite } = useFavorites();

  const [restaurants, setRestaurants] = useState([]);
  const [dishes, setDishes]           = useState([]);
  const [remoteRestaurants, setRemoteRestaurants] = useState([]);
  const [remoteSearching, setRemoteSearching] = useState(false);
  const [activeCat, setActiveCat]     = useState(null);
  const [search, setSearch]           = useState('');
  const [loading, setLoading]         = useState(true);
  const [menusLoading, setMenusLoading] = useState(false);
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
  const brandIntro = useSharedValue(0);
  const bannerDraggingRef = useRef(false);
  const bannerAutoRef = useRef(false);
  const bannerAutoEndRef = useRef(null);
  const bannerIndexRef = useRef(0);
  const [bannerIndex, setBannerIndex] = useState(0);
  const [featureIndex, setFeatureIndex] = useState(0);
  const [showAllPopular, setShowAllPopular] = useState(false);
  const brandAnimatedStyle = useAnimatedStyle(() => ({
    opacity: brandIntro.value,
    transform: [{ translateY: (1 - brandIntro.value) * 8 }],
  }));
  useEffect(() => {
    brandIntro.value = withTiming(1, { duration: 450, easing: Easing.out(Easing.cubic) });
  }, [brandIntro]);

  // Plats de tous les restaurants, chargés en arrière-plan pour la recherche
  const loadDishes = useCallback(async (list, reset) => {
    if (reset) loadedMenus.current = new Set();
    const todo = list.filter((r) => !loadedMenus.current.has(r.id));
    todo.forEach((r) => loadedMenus.current.add(r.id));
    const menus = [];
    // Limite les requêtes simultanées quand une recherche parcourt plusieurs restaurants.
    for (let offset = 0; offset < todo.length; offset += 4) {
      const batch = await Promise.all(todo.slice(offset, offset + 4).map(async (r) => {
        try {
          const data = await restaurantService.getMenu(r.id);
          return (data.menu || []).flatMap((cat) => (cat.items || []).map((it) => ({ ...it, _restaurant: r, _menuCategory: cat.name })));
        } catch { return []; }
      }));
      menus.push(...batch);
    }
    setDishes((prev) => {
      const next = reset ? menus.flat() : [...prev, ...menus.flat()];
      const signature = (item) => `${item._restaurant?.id}:${item.id}:${item.updated_at}:${item.is_available}:${item.effective_price ?? item.price}:${JSON.stringify(item.available_days)}`;
      if (next.length === prev.length && next.every((item, index) => signature(item) === signature(prev[index]))) return prev;
      return next;
    });
  }, []);

  const loadData = useCallback(async () => {
    setError(false);
    try {
      const restData = await restaurantService.getRestaurants();
      const list = restData?.data || restData || [];
      setRestaurants(list);
      setPage(restData?.current_page || 1);
      setHasMore(!!restData?.last_page && restData.current_page < restData.last_page);
      setMenusLoading(true);
      loadDishes(list, true).catch(() => setError(true)).finally(() => setMenusLoading(false));
    } catch (e) {
      setError(true);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [loadDishes]);

  useEffect(() => {
    if (!isFocused) return undefined;
    loadData();
    const timer = setInterval(loadData, 120000);
    return () => clearInterval(timer);
  }, [isFocused, loadData, today.key]);

  // Les autres pages sont chargées seulement lorsqu'une recherche ou un filtre le demande.
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

  const q = search.trim().toLowerCase();
  const categoryMatcher = FOOD_CATEGORIES.find((c) => c.id === activeCat)?.matcher;
  const selectCategory = (id) => { setActiveCat(id === 'all' ? null : id); setFeatureIndex(0); setShowAllPopular(false); };
  useEffect(() => {
    if ((q.length >= 2 || activeCat) && !loading && hasMore && !loadingMore) loadMore();
  }, [q, activeCat, loading, hasMore, loadingMore, loadMore]);
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
    ? dishes.filter((d) => dishCategoryText(d).toLowerCase().includes(q) && (!categoryMatcher || categoryMatcher.test(dishTypeText(d))))
    : []), [q, dishes, categoryMatcher]);
  // Restaurants dont le nom correspond, puis ceux qui proposent un plat correspondant
  const searchRestaurants = useMemo(() => {
    if (!q) return [];
    const allRestaurants = [...restaurants, ...remoteRestaurants.filter((r) => !restaurants.some((local) => local.id === r.id))];
    const hasSelectedCategory = (restaurant) => !categoryMatcher || dishes.some((dish) => dish._restaurant?.id === restaurant.id && categoryMatcher.test(dishTypeText(dish)));
    const byName = allRestaurants.filter((r) => hasSelectedCategory(r) && (r.name?.toLowerCase().includes(q) || r.category?.name?.toLowerCase().includes(q)));
    const dishCount = {};
    searchDishes.forEach((d) => { if (d._restaurant) dishCount[d._restaurant.id] = (dishCount[d._restaurant.id] || 0) + 1; });
    const byDish = allRestaurants.filter((r) => hasSelectedCategory(r) && dishCount[r.id] && !byName.includes(r));
    return [...byName, ...byDish].map((r) => ({ r, matches: dishCount[r.id] || 0 }));
  }, [q, restaurants, remoteRestaurants, searchDishes, dishes, categoryMatcher]);

  const openRestaurant = (restaurant) => navigation.navigate('Restaurant', { restaurant });
  const openDish = (item) => navigation.navigate('ItemDetail', { item, restaurant: item._restaurant });
  const openAllRestaurants = () => navigation.navigate('RestaurantList');
  const addDish = (item) => {
    if (!isDishOrderableToday(item, today)) return openDish(item);
    if ((item.option_groups || []).some((group) => group.is_required)) return openDish(item);
    const price = Number(item.price) || 0;
    const promo = Number(item.discount_price) || 0;
    return addItem({ ...item, effective_price: promo > 0 && promo < price ? promo : price }, 1, item._restaurant);
  };

  const visibleMenuDishes = useMemo(() => dishes
    .filter((item) => isDishFeaturedForDay(item, menuDay, today) && (!categoryMatcher || categoryMatcher.test(dishTypeText(item)))),
    [dishes, menuDay, today, categoryMatcher]);

  const recentDishes = useMemo(() => visibleMenuDishes
    .map((item, index) => ({ item, index, date: Date.parse(item.created_at || item.createdAt || item.published_at || '') || 0 }))
    .sort((a, b) => b.date - a.date || a.index - b.index)
    .slice(0, 3)
    .map(({ item }) => item), [visibleMenuDishes]);

  const popularDishes = useMemo(() => {
    const sorted = visibleMenuDishes
    .map((item, index) => ({ item, index, date: Date.parse(item.created_at || item.createdAt || '') || 0 }))
    .sort((a, b) => Number(!!b.item.is_featured) - Number(!!a.item.is_featured) || b.date - a.date || a.index - b.index)
    .map(({ item }) => item);
    const seenRestaurants = new Set();
    const first = sorted.filter((item) => {
      const id = item._restaurant?.id;
      if (!id || seenRestaurants.has(id)) return false;
      seenRestaurants.add(id);
      return true;
    }).slice(0, 4);
    return [...first, ...sorted.filter((item) => !first.includes(item))];
  }, [visibleMenuDishes]);

  const recentRestaurants = useMemo(() => {
    const latestMenuDate = new Map();
    visibleMenuDishes.forEach((dish) => {
      const restaurantId = dish._restaurant?.id;
      if (!restaurantId) return;
      const date = Date.parse(dish.created_at || dish.createdAt || dish.published_at || dish.updated_at || '') || 0;
      latestMenuDate.set(restaurantId, Math.max(latestMenuDate.get(restaurantId) || 0, date));
    });
    return restaurants
      .filter((restaurant) => latestMenuDate.has(restaurant.id))
      .map((restaurant) => ({ restaurant, date: latestMenuDate.get(restaurant.id) || Date.parse(restaurant.updated_at || '') || 0 }))
      .sort((a, b) => b.date - a.date || Number(b.restaurant.id) - Number(a.restaurant.id))
      .slice(0, 3)
      .map(({ restaurant }) => restaurant);
  }, [restaurants, visibleMenuDishes]);

  const promoDish = useMemo(() => visibleMenuDishes.find((dish) => Number(dish.discount_price) > 0 && Number(dish.discount_price) < Number(dish.price)), [visibleMenuDishes]);
  const promoPercent = promoDish ? Math.round((1 - Number(promoDish.discount_price) / Number(promoDish.price)) * 100) : 0;

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
        duration: 1400,
        easing: Easing.inOut(Easing.sin),
      }, (finished) => {
        if (finished && next === recentDishes.length) bannerOffset.value = 0;
      });
      setBannerIndex(next % recentDishes.length);
      bannerAutoEndRef.current = setTimeout(() => { bannerAutoRef.current = false; }, 1500);
    }, 6500);
    return () => {
      clearInterval(timer);
      if (bannerAutoEndRef.current) clearTimeout(bannerAutoEndRef.current);
      bannerAutoRef.current = false;
      cancelAnimation(bannerOffset);
    };
  }, [isFocused, recentDishes.length, q, bannerOffset]);

  const showSearch = q.length > 0;
  const heroSlides = recentDishes.length > 1 ? [...recentDishes, recentDishes[0]] : recentDishes;
  const toggleRestaurantFavorite = async (restaurant) => {
    const ok = await toggleFavorite('restaurant', restaurant);
    if (!ok) navigation.navigate('Auth', { screen: 'Login' });
  };
  const shareApp = () => Share.share({ message: 'Découvrez Estuaire Eat et ses restaurants !' });

  if (loading) return <Screen><LoadingView label="Chargement des restaurants…" /></Screen>;

  return (
    <Screen edges={[]} bg="#FFF8F3" statusBar="light-content">
      <ScrollView
        ref={scrollRef}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingBottom: tabSpace + 20 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadData(); }} tintColor={COLORS.primary} />}
      >
        <View style={[styles.hero, { height: showSearch ? insets.top + 90 : insets.top + 285 }]}>
          {!showSearch && (heroSlides.length ? (
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
                const pageNumber = Math.min(recentDishes.length, Math.max(0, Math.round(event.nativeEvent.contentOffset.x / BANNER_WIDTH)));
                const index = pageNumber % recentDishes.length;
                bannerOffset.value = index * BANNER_WIDTH;
                bannerIndexRef.current = index;
                setBannerIndex(index);
              }}
            >
              {heroSlides.map((item, slideIndex) => (
                <TouchableOpacity key={`${item._restaurant?.id}-${item.id}-${slideIndex}`} style={[styles.heroSlide, { height: insets.top + 285 }]} activeOpacity={0.96} onPress={() => openDish(item)}>
                  <SmartImage uri={item.image} fallbackSource={dishFallbackImage(item)} style={StyleSheet.absoluteFill} />
                  <LinearGradient colors={['transparent', 'rgba(0,0,0,0.12)', 'rgba(0,0,0,0.88)']} locations={[0.35, 0.58, 1]} style={StyleSheet.absoluteFill} />
                  <View style={styles.heroCopy}>
                    <View style={styles.heroCopyText}>
                      <Text style={styles.heroDishName} numberOfLines={1}>{item.name}</Text>
                      <Text style={styles.heroRestaurant} numberOfLines={1}>{item._restaurant?.name || 'Estuaire Eat'}</Text>
                    </View>
                    <View style={styles.heroCtaIcon}><Ionicons name="arrow-forward" size={18} color={COLORS.primary} /></View>
                  </View>
                </TouchableOpacity>
              ))}
            </Animated.ScrollView>
          ) : (
            <View style={[styles.heroSlide, { height: insets.top + 285 }]}>
              <Image source={HERO_IMAGE} style={styles.fillImage} resizeMode="cover" />
              <LinearGradient colors={['transparent', 'rgba(0,0,0,0.82)']} style={StyleSheet.absoluteFill} />
              <View style={styles.heroCopy}><View style={styles.heroCopyText}><Text style={styles.heroDishName}>Le vrai goût</Text><Text style={styles.heroRestaurant}>de la bonne cuisine !</Text></View></View>
            </View>
          ))}
          <View pointerEvents="box-none" style={[styles.heroTop, { top: insets.top + 8 }]}>
            <TouchableOpacity style={styles.locationTouch} onPress={() => setSheetOpen(true)} accessibilityLabel="Choisir une adresse de livraison">
              <Ionicons name="location" color="#FFC400" size={13} /><Text style={styles.locationText} numberOfLines={1}>{displayLabel || 'Douala'}</Text><Ionicons name="chevron-down" color="#fff" size={11} />
            </TouchableOpacity>
            <View style={styles.heroActions}>
              <IconButton icon="notifications-outline" size={39} onPress={() => (user ? navigation.navigate('Notifications') : navigation.navigate('Auth', { screen: 'Login' }))} />
              <IconButton icon="share-social-outline" size={39} onPress={shareApp} />
            </View>
          </View>
          {!showSearch && <Animated.View style={[styles.brandBlock, brandAnimatedStyle, { top: insets.top + 49 }]}>
            <TouchableOpacity style={styles.brandTap} onPress={openAllRestaurants} accessibilityLabel="Voir les restaurants Estuaire Eat">
              <View style={styles.brandIcon}>
                <MaterialCommunityIcons name="chef-hat" size={29} color="#fff" style={{ position: 'absolute', top: 7 }} />
                <MaterialCommunityIcons name="silverware-fork-knife" size={27} color="#FF8A00" style={{ position: 'absolute', bottom: 7 }} />
              </View>
              <View><Text style={styles.brandName}>ESTUAIRE</Text><Text style={styles.brandEat}>EAT_</Text><Text style={styles.brandTagline}>Bon goût, toujours !</Text></View>
            </TouchableOpacity>
          </Animated.View>}
          {!showSearch && recentDishes.length > 1 && <View pointerEvents="none" style={styles.heroDots}>{recentDishes.map((item, index) => <View key={`${item._restaurant?.id}-${item.id}`} style={[styles.heroDot, index === bannerIndex && styles.heroDotActive]} />)}</View>}
        </View>

        <View style={styles.searchRow}>
          <SearchBar value={search} onChangeText={setSearch} placeholder="Rechercher un plat ou un restaurant..." style={styles.searchInput} />
          <TouchableOpacity style={styles.filterButton} onPress={() => scrollRef.current?.scrollTo({ y: categoryYRef.current, animated: true })} accessibilityLabel="Voir les catégories">
            <Ionicons name="options-outline" size={24} color="#fff" />
          </TouchableOpacity>
        </View>
        {!showSearch && <MenuDaySelector />}

        {showSearch ? (
          <View style={styles.results}>
            <View onLayout={(event) => { categoryYRef.current = event.nativeEvent.layout.y; }}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.catRow}>
                {FOOD_CATEGORIES.map((category) => <CategoryItem key={category.id} category={category} active={(activeCat || 'all') === category.id} onPress={() => selectCategory(category.id)} />)}
              </ScrollView>
            </View>
            {(remoteSearching || loadingMore) && <ActivityIndicator color={COLORS.primary} style={{ marginVertical: 12 }} />}
            {searchRestaurants.length > 0 && <><SectionHeader title={`Restaurants (${searchRestaurants.length})`} /><View style={styles.listPad}>{searchRestaurants.map(({ r, matches }) => <View key={`r${r.id}`}><NearbyRow restaurant={r} onPress={() => openRestaurant(r)} />{matches > 0 && <Text style={styles.matchHint}>{matches} plat{matches > 1 ? 's' : ''} correspondant à « {search.trim()} »</Text>}</View>)}</View></>}
            {searchDishes.length > 0 && <><SectionHeader title={`Plats (${searchDishes.length})`} style={{ marginTop: 12 }} /><View style={styles.listPad}>{searchDishes.map((dish, index) => <DishRow key={`d${dish.id}-${index}`} item={dish} day={today} onPress={() => openDish(dish)} onAdd={() => addDish(dish)} />)}</View></>}
            {!remoteSearching && !loadingMore && (q.length < 2 || !hasMore) && searchRestaurants.length === 0 && searchDishes.length === 0 && <EmptyState icon="search" title="Aucun résultat" message={`Rien ne correspond à « ${search.trim()} ». Essayez un autre mot.`} actionLabel="Effacer la recherche" onAction={() => setSearch('')} />}
          </View>
        ) : (
          <>
            <View onLayout={(event) => { categoryYRef.current = event.nativeEvent.layout.y; }}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.catRow}>
                {FOOD_CATEGORIES.map((category) => <CategoryItem key={category.id} category={category} active={(activeCat || 'all') === category.id} onPress={() => selectCategory(category.id)} />)}
              </ScrollView>
            </View>

            <TouchableOpacity style={styles.promoBanner} onPress={() => promoDish ? openDish(promoDish) : openAllRestaurants()} activeOpacity={0.9}>
              <LinearGradient colors={['#1D0D09', '#5E1904', '#FF7100']} start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }} style={StyleSheet.absoluteFill} />
              <Image source={PROMO_GIFT} style={styles.promoGift} resizeMode="contain" />
              <View style={styles.promoCopy}><Text style={styles.promoLead}>{promoDish ? 'Profitez de' : 'Découvrez nos'}</Text><Text style={styles.promoBig}>{promoDish ? `−${promoPercent}%` : 'saveurs'}</Text><Text style={styles.promoSmall}>{promoDish ? `sur ${promoDish.name}` : 'Préparées pour vous'}</Text></View>
              <View style={styles.promoAction}><Text style={styles.promoActionText}>Commander</Text><Ionicons name="arrow-forward" color="#111" size={14} /></View>
            </TouchableOpacity>

            <View style={styles.sectionHeader}><View style={styles.sectionMark} /><Text style={styles.sectionTitle}>🔥 Nos Plats Populaires</Text>{popularDishes.length > 4 && <TouchableOpacity onPress={() => setShowAllPopular((value) => !value)} style={styles.seeAll}><Text style={styles.seeAllText}>{showAllPopular ? 'Voir moins' : 'Voir tout'}</Text><Ionicons name={showAllPopular ? 'chevron-up' : 'arrow-forward'} size={16} color={COLORS.primary} /></TouchableOpacity>}</View>
            {popularDishes.length > 0 ? <View style={styles.dishGrid}>{popularDishes.slice(0, showAllPopular ? undefined : 4).map((dish) => <HomeDishCard key={`${dish._restaurant?.id}-${dish.id}`} item={dish} previewOnly={!isDishOrderableToday(dish, today)} liked={isFavorite('item', dish.id)} onLike={async () => { const ok = await toggleFavorite('item', { ...dish, restaurant: dish._restaurant }); if (!ok) navigation.navigate('Auth', { screen: 'Login' }); }} onPress={() => openDish(dish)} onAdd={() => addDish(dish)} />)}</View> : menusLoading ? <ActivityIndicator color={COLORS.primary} style={styles.featureLoading} /> : <Text style={styles.emptyText}>Aucun plat prévu ce {menuDay.label}.</Text>}

            <View style={styles.sectionHeader}><View style={styles.sectionMark} /><Text style={styles.sectionTitle}>Restaurants récents</Text><TouchableOpacity onPress={openAllRestaurants} style={styles.seeAll}><Text style={styles.seeAllText}>Voir tout</Text><Ionicons name="chevron-forward" size={17} color={COLORS.primary} /></TouchableOpacity></View>
            {recentRestaurants.length > 0 ? (
              <>
                <FlatList
                  key={`${menuDay.key}-${activeCat || 'all'}`}
                  data={recentRestaurants}
                  horizontal
                  pagingEnabled
                  keyExtractor={(restaurant) => `recent-${restaurant.id}`}
                  showsHorizontalScrollIndicator={false}
                  onMomentumScrollEnd={(event) => setFeatureIndex(Math.round(event.nativeEvent.contentOffset.x / width))}
                  renderItem={({ item }) => <View style={styles.featurePage}><RestaurantFeatureCard restaurant={item} onPress={() => openRestaurant(item)} liked={isFavorite('restaurant', item.id)} onLike={() => toggleRestaurantFavorite(item)} /></View>}
                />
                {recentRestaurants.length > 1 && <View style={styles.featureDots}>{recentRestaurants.map((restaurant, index) => <View key={restaurant.id} style={[styles.featureDot, featureIndex === index && styles.featureDotActive]} />)}</View>}
              </>
            ) : menusLoading || loadingMore || hasMore ? <ActivityIndicator color={COLORS.primary} style={styles.featureLoading} /> : <Text style={styles.emptyText}>{activeCat ? 'Aucun restaurant ne propose encore cette catégorie.' : 'Les nouveaux menus apparaîtront ici bientôt.'}</Text>}

            <TouchableOpacity style={styles.clocheBanner} onPress={openAllRestaurants} activeOpacity={0.9}>
              <Image source={CLOCHE_IMAGE} style={styles.fillImage} resizeMode="cover" />
              <LinearGradient colors={['rgba(0,0,0,0.76)', 'rgba(0,0,0,0.2)']} start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }} style={StyleSheet.absoluteFill} />
              <Text style={styles.clocheText}>Commande facile,{"\n"}<Text style={styles.clocheAccent}>rapide et savoureuse !</Text></Text>
              <View style={styles.clocheAction}><Text style={styles.clocheActionText}>Commander</Text><Ionicons name="arrow-forward" size={15} color={COLORS.primary} /></View>
            </TouchableOpacity>
            {error && <EmptyState icon="cloud-offline-outline" title="Connexion impossible" message="Vérifiez votre connexion internet puis réessayez." actionLabel="Réessayer" onAction={() => { setLoading(true); loadData(); }} />}
          </>
        )}
      </ScrollView>
      <DeliveryLocationSheet visible={sheetOpen} onClose={() => setSheetOpen(false)} navigation={navigation} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  fillImage: { position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' },
  hero: { width, overflow: 'hidden', backgroundColor: '#160B08' },
  heroSlide: { width },
  heroTop: { position: 'absolute', left: 17, right: 15, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  locationTouch: { flexDirection: 'row', alignItems: 'center', maxWidth: 170, gap: 3, paddingVertical: 6 },
  locationText: { fontFamily: FONTS.semibold, color: '#fff', fontSize: 11 },
  heroActions: { flexDirection: 'row', gap: 8 },
  brandBlock: { position: 'absolute', left: 13, borderRadius: 18, padding: 5, paddingRight: 11, backgroundColor: 'rgba(8,6,4,0.62)' },
  brandTap: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  brandIcon: { width: 73, height: 67, borderRadius: 36, borderWidth: 2, borderColor: '#FF8C00', backgroundColor: '#100B08', alignItems: 'center', justifyContent: 'center' },
  brandName: { fontFamily: FONTS.extrabold, fontStyle: 'italic', color: '#fff', fontSize: 20, lineHeight: 22 },
  brandEat: { fontFamily: FONTS.extrabold, fontStyle: 'italic', color: '#FFAA1A', fontSize: 31, lineHeight: 31 },
  brandTagline: { fontFamily: FONTS.semibold, fontStyle: 'italic', color: '#fff', fontSize: 11, lineHeight: 15 },
  heroCopy: { position: 'absolute', left: 17, right: 17, bottom: 30, flexDirection: 'row', alignItems: 'center', gap: 12 },
  heroCopyText: { flex: 1 },
  heroDishName: { color: '#fff', fontFamily: FONTS.extrabold, fontStyle: 'italic', fontSize: 20, lineHeight: 24 },
  heroRestaurant: { color: '#fff', fontFamily: FONTS.medium, fontSize: 11, marginTop: 1 },
  heroCtaIcon: { width: 31, height: 31, borderRadius: 16, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  heroDots: { position: 'absolute', bottom: 12, left: 0, right: 0, flexDirection: 'row', justifyContent: 'center', gap: 6 },
  heroDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.8)' },
  heroDotActive: { backgroundColor: COLORS.primary, width: 13 },
  searchRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: -18, marginHorizontal: 14, marginBottom: 12, zIndex: 5 },
  searchInput: { flex: 1, height: 48, borderRadius: 25, borderWidth: 1, borderColor: '#FCE2D4', backgroundColor: '#fff', ...SHADOWS.sm },
  filterButton: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.primary, borderWidth: 2, borderColor: '#FF8D23', ...SHADOWS.primary },
  catRow: { paddingHorizontal: 12, gap: 6, paddingTop: 5, paddingBottom: 10 },
  catItem: { width: Math.max(56, (width - 28 - 5 * 6) / 6) },
  catTile: { height: 79, borderRadius: 14, backgroundColor: '#fff', overflow: 'hidden', alignItems: 'center', justifyContent: 'flex-end', ...SHADOWS.sm },
  catTileActive: { backgroundColor: COLORS.primary },
  catImage: { position: 'absolute', width: '100%', height: 57, top: 0 },
  catLabel: { fontFamily: FONTS.semibold, fontSize: 9, color: '#172034', textAlign: 'center', paddingBottom: 5 },
  catLabelActive: { color: '#fff' },
  promoBanner: { marginHorizontal: 12, marginTop: 3, height: 85, borderRadius: 17, overflow: 'hidden', flexDirection: 'row', alignItems: 'center', ...SHADOWS.sm },
  promoGift: { width: 93, height: 87, marginLeft: -4 },
  promoCopy: { flex: 1, marginLeft: 3 },
  promoLead: { color: '#fff', fontFamily: FONTS.semibold, fontStyle: 'italic', fontSize: 12 },
  promoBig: { color: '#FFB900', fontFamily: FONTS.extrabold, fontStyle: 'italic', fontSize: 26, lineHeight: 28 },
  promoSmall: { color: '#fff', fontFamily: FONTS.medium, fontSize: 8 },
  promoAction: { height: 31, backgroundColor: '#fff', borderRadius: 17, paddingHorizontal: 9, marginRight: 8, flexDirection: 'row', alignItems: 'center', gap: 3 },
  promoActionText: { fontFamily: FONTS.bold, fontSize: 9, color: '#111' },
  sectionHeader: { marginHorizontal: 14, marginTop: 17, marginBottom: 9, flexDirection: 'row', alignItems: 'center' },
  sectionMark: { width: 5, height: 20, borderRadius: 3, backgroundColor: COLORS.primary, marginRight: 8 },
  sectionTitle: { flex: 1, fontFamily: FONTS.bold, fontSize: 16, color: '#131B31' },
  dishGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginHorizontal: 12, rowGap: 8 },
  dishCard: { width: (width - 32) / 2, backgroundColor: '#fff', borderRadius: 15, overflow: 'hidden', borderWidth: 1, borderColor: '#F6E5D9', ...SHADOWS.sm },
  dishPhoto: { width: '100%', height: 97 },
  dishBadge: { position: 'absolute', top: 7, left: 7, borderRadius: 11, paddingHorizontal: 6, height: 19, backgroundColor: COLORS.primary, flexDirection: 'row', alignItems: 'center', gap: 3 },
  dishBadgeText: { color: '#fff', fontFamily: FONTS.semibold, fontSize: 9 },
  dishHeart: { position: 'absolute', right: 6, top: 6, width: 25, height: 25, borderRadius: 13, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  dishBody: { paddingHorizontal: 8, paddingTop: 5, paddingBottom: 6 },
  dishName: { color: '#121723', fontFamily: FONTS.bold, fontSize: 10, lineHeight: 14 },
  dishDescription: { color: '#566070', fontFamily: FONTS.regular, fontSize: 8, lineHeight: 12 },
  dishBottom: { flexDirection: 'row', alignItems: 'center', minHeight: 30 },
  dishPrice: { color: COLORS.primary, fontFamily: FONTS.bold, fontSize: 11 },
  dishOldPrice: { color: '#84909C', fontFamily: FONTS.regular, fontSize: 8, textDecorationLine: 'line-through' },
  dishAdd: { width: 29, height: 29, borderRadius: 15, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center' },
  seeAll: { flexDirection: 'row', alignItems: 'center', gap: 1 },
  seeAllText: { fontFamily: FONTS.semibold, color: COLORS.primary, fontSize: 11 },
  featurePage: { width, alignItems: 'center', paddingBottom: 4 },
  featureDots: { flexDirection: 'row', justifyContent: 'center', gap: 5, marginTop: 3 },
  featureDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#D1C4BA' },
  featureDotActive: { width: 14, backgroundColor: COLORS.primary },
  featureLoading: { height: 158 },
  emptyText: { marginHorizontal: 15, padding: 20, color: COLORS.textMuted, textAlign: 'center' },
  clocheBanner: { marginHorizontal: 12, marginTop: 12, height: 80, borderRadius: 17, overflow: 'hidden', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 17, ...SHADOWS.sm },
  clocheText: { flex: 1, color: '#fff', fontFamily: FONTS.bold, fontStyle: 'italic', fontSize: 15, lineHeight: 19 },
  clocheAccent: { color: '#FFCB31' },
  clocheAction: { height: 31, borderRadius: 17, backgroundColor: '#fff', paddingHorizontal: 10, flexDirection: 'row', alignItems: 'center', gap: 3 },
  clocheActionText: { fontFamily: FONTS.bold, color: '#111', fontSize: 9 },
  results: { paddingBottom: 20 },
  listPad: { paddingHorizontal: SCREEN_PADDING, gap: 12 },
  nearCard: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 10, backgroundColor: COLORS.surface, borderRadius: RADIUS.lg, ...SHADOWS.sm },
  nearImage: { width: 84, height: 84, borderRadius: RADIUS.md },
  popMeta: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6, flexWrap: 'wrap' },
  matchHint: { fontFamily: FONTS.medium, fontSize: 11, color: COLORS.primary, marginTop: 4, marginLeft: 6 },
  notToday: { fontFamily: FONTS.medium, fontSize: 10, color: '#A85D34', marginTop: 2 },
  oldPrice: { fontFamily: FONTS.regular, fontSize: 12, color: COLORS.textLight, textDecorationLine: 'line-through' },
  addBtn: { width: 34, height: 34, borderRadius: 17, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center' },
});
