import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Animated, ScrollView, Pressable,
  RefreshControl, Dimensions, Modal, StatusBar, FlatList, Linking, Share,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { restaurantService } from '../../services/restaurantService';
import { useCart } from '../../context/CartContext';
import { useFavorites } from '../../context/FavoritesContext';
import { COLORS, FONTS, TYPE, RADIUS, SHADOWS, GRADIENTS, SCREEN_PADDING, formatPrice } from '../../theme';
import { IconButton, SmartImage, EmptyState, LoadingView } from '../../components/ui';

const { width, height: SCREEN_H } = Dimensions.get('window');
const HERO_HEIGHT = 270;
const SHEET_OVERLAP = 34;
const TOP_BAR_H = 56;
const GRID_GAP = 12;
const CARD_W = (width - SCREEN_PADDING * 2 - GRID_GAP) / 2;
const POPULAR_LIMIT = 6;

// ── Utilitaires ──
const clean = (s) => (typeof s === 'string' ? s.trim().replace(/\s+/g, ' ') : s);
// Libellés de catégories cohérents : espaces nettoyés + majuscule initiale
const labelize = (s) => {
  const t = clean(s) || '';
  return t ? t.charAt(0).toUpperCase() + t.slice(1) : t;
};
// « 12 500 » → « 12,5k »
const formatCount = (n) => {
  const v = Number(n) || 0;
  if (v >= 1000) return `${(v / 1000).toFixed(v >= 10000 ? 0 : 1).replace('.', ',').replace(',0', '')}k`;
  return String(v);
};

// Prix effectif d'un plat (les prix peuvent arriver en chaîne depuis l'API)
const pricing = (item) => {
  const price = Number(item.price) || 0;
  const promo = Number(item.discount_price) || 0;
  const hasPromo = promo > 0 && promo < price;
  return {
    price,
    effective: hasPromo ? promo : price,
    hasPromo,
    percent: hasPromo ? Math.round(((price - promo) / price) * 100) : 0,
  };
};

const deliveryTime = (r) => {
  if (r.delivery_time_min && r.delivery_time_max) return `${r.delivery_time_min}-${r.delivery_time_max} min`;
  if (r.delivery_time_min) return `${r.delivery_time_min} min`;
  return '20-40 min';
};
const deliveryFeeLabel = (r) => (Number(r.delivery_fee) > 0 ? formatPrice(r.delivery_fee) : 'Offerte');

// Icône de catégorie déduite du nom (pas d'emoji : rendu « ? » sur certains appareils)
const CATEGORY_ICONS = [
  [/sp[ée]cialit/i, 'star-outline'],
  [/entr[ée]e|ap[ée]ritif|tapas/i, 'restaurant-outline'],
  [/grill|brais|bbq|barbec|brochette|soya/i, 'flame-outline'],
  [/boisson|jus|drink|cocktail|bi[èe]re|soda|vin\b/i, 'wine-outline'],
  [/caf[ée]|th[ée]\b|petit[- ]d[ée]j|breakfast/i, 'cafe-outline'],
  [/dessert|g[âa]teau|glace|sucr|p[âa]tisserie/i, 'ice-cream-outline'],
  [/pizza/i, 'pizza-outline'],
  [/poisson|fish|fruits? de mer/i, 'fish-outline'],
  [/salade|v[ée]g[ée]/i, 'leaf-outline'],
  [/pan[ée]|poulet|chicken|ailes?/i, 'nutrition-outline'],
  [/burger|sandwich|snack|fast/i, 'fast-food-outline'],
  [/plat|menu|principal|repas|africain|local/i, 'fast-food-outline'],
];
const categoryIcon = (name) => (CATEGORY_ICONS.find(([re]) => re.test(name || '')) || [null, 'grid-outline'])[1];

// ── Horaires d'ouverture (format backend : { mon: { open, close }, … } — rendu défensif) ──
const DAYS = [
  ['mon', 'Lundi'], ['tue', 'Mardi'], ['wed', 'Mercredi'], ['thu', 'Jeudi'],
  ['fri', 'Vendredi'], ['sat', 'Samedi'], ['sun', 'Dimanche'],
];
const DAY_ALIASES = {
  mon: ['mon', 'monday', 'lundi', '1'], tue: ['tue', 'tuesday', 'mardi', '2'],
  wed: ['wed', 'wednesday', 'mercredi', '3'], thu: ['thu', 'thursday', 'jeudi', '4'],
  fri: ['fri', 'friday', 'vendredi', '5'], sat: ['sat', 'saturday', 'samedi', '6'],
  sun: ['sun', 'sunday', 'dimanche', '0', '7'],
};
const slotClose = (v) => {
  if (!v || typeof v !== 'object' || Array.isArray(v) || v.closed || v.is_closed) return null;
  const close = v.close || v.closes || v.to || v.end;
  return close ? String(close).slice(0, 5) : null;
};
const formatSlot = (v) => {
  if (v == null || v === false) return 'Fermé';
  if (typeof v === 'string') return clean(v) || 'Fermé';
  if (Array.isArray(v)) return v.map(formatSlot).join(', ');
  if (typeof v === 'object') {
    if (v.closed || v.is_closed) return 'Fermé';
    const open = v.open || v.opens || v.from || v.start;
    const close = v.close || v.closes || v.to || v.end;
    if (open && close) return `${String(open).slice(0, 5)} – ${String(close).slice(0, 5)}`;
  }
  return '—';
};
function parseOpeningHours(raw) {
  let data = raw;
  if (typeof data === 'string') {
    try { data = JSON.parse(data); } catch (e) { return [{ key: 'txt', label: 'Horaires', value: clean(data), close: null }]; }
  }
  if (!data || typeof data !== 'object') return [];
  if (Array.isArray(data)) {
    return data.map((d, i) => {
      if (typeof d === 'string') return { key: String(i), label: '', value: clean(d), close: null };
      const dayKey = Object.keys(DAY_ALIASES).find(k => DAY_ALIASES[k].includes(String(d?.day ?? '').toLowerCase()));
      const label = dayKey ? DAYS.find(x => x[0] === dayKey)[1] : labelize(String(d?.day ?? ''));
      return { key: dayKey || String(i), label, value: formatSlot(d), close: slotClose(d) };
    }).filter(r => r.value);
  }
  const rows = [];
  const lowered = Object.fromEntries(Object.entries(data).map(([k, v]) => [k.toLowerCase(), v]));
  DAYS.forEach(([key, label]) => {
    const found = DAY_ALIASES[key].find(a => a in lowered);
    if (found) rows.push({ key, label, value: formatSlot(lowered[found]), close: slotClose(lowered[found]) });
  });
  return rows;
}
const TODAY_KEY = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'][new Date().getDay()];
// « 23:00 » → « 23h », « 22:30 » → « 22h30 »
const hourLabel = (hhmm) => {
  if (!hhmm) return null;
  const [h, m] = hhmm.split(':');
  if (h == null || isNaN(Number(h))) return null;
  return `${Number(h)}h${m && m !== '00' ? m : ''}`;
};

const directionsUrl = (r) => {
  const lat = Number(r.latitude); const lng = Number(r.longitude);
  if (lat && lng) return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
  const q = [r.address, r.city].filter(Boolean).join(', ');
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q || r.name || '')}`;
};

// ── Petit toast de confirmation (remplace l'Alert après ajout) ──
function useToast() {
  const anim = useRef(new Animated.Value(0)).current;
  const [message, setMessage] = useState('');
  const timer = useRef(null);
  const show = useCallback((msg) => {
    setMessage(msg);
    clearTimeout(timer.current);
    Animated.spring(anim, { toValue: 1, useNativeDriver: true, friction: 8 }).start();
    timer.current = setTimeout(() => {
      Animated.timing(anim, { toValue: 0, duration: 220, useNativeDriver: true }).start();
    }, 1600);
  }, [anim]);
  useEffect(() => () => clearTimeout(timer.current), []);
  return { anim, message, show };
}

// ── Bouton « + » rond orange, avec retour visuel et coche après ajout ──
function AddButton({ onPress, disabled, size = 34 }) {
  const scale = useRef(new Animated.Value(1)).current;
  const [done, setDone] = useState(false);
  const timer = useRef(null);
  useEffect(() => () => clearTimeout(timer.current), []);

  const press = async () => {
    const ok = await onPress();
    if (ok) {
      setDone(true);
      clearTimeout(timer.current);
      timer.current = setTimeout(() => setDone(false), 1200);
    }
  };

  return (
    <Pressable
      onPress={press}
      disabled={disabled}
      hitSlop={8}
      onPressIn={() => Animated.spring(scale, { toValue: 0.88, useNativeDriver: true, speed: 40 }).start()}
      onPressOut={() => Animated.spring(scale, { toValue: 1, useNativeDriver: true, friction: 4 }).start()}
    >
      <Animated.View
        style={[
          styles.addBtn,
          { width: size, height: size, borderRadius: size / 2 },
          done && styles.addBtnDone,
          disabled && { opacity: 0.4 },
          { transform: [{ scale }] },
        ]}
      >
        <Ionicons name={done ? 'checkmark' : 'add'} size={20} color={COLORS.white} />
      </Animated.View>
    </Pressable>
  );
}

// ── Tuile de catégorie (icône au-dessus, libellé dessous) ──
function CategoryTile({ label, icon, active, onPress }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.85}
      style={[styles.tile, active ? styles.tileActive : styles.tileIdle]}
    >
      <Ionicons name={icon} size={22} color={active ? COLORS.white : COLORS.text} />
      <Text style={[styles.tileLabel, active && { color: COLORS.white }]} numberOfLines={1}>{label}</Text>
    </TouchableOpacity>
  );
}

// ── Carte de plat (grille 2 colonnes) ──
function DishCard({ item, liked, onLike, onPress, onAdd }) {
  const { price, effective, hasPromo, percent } = pricing(item);
  const desc = clean(item.description);
  const unavailable = item.is_available === false;

  return (
    <TouchableOpacity style={styles.dishCard} onPress={() => onPress(item)} activeOpacity={0.9}>
      <SmartImage uri={item.image} style={styles.dishImage} iconSize={30}>
        {unavailable ? (
          <View style={styles.dishUnavailable}><Text style={styles.dishUnavailableText}>Indisponible</Text></View>
        ) : null}
        {hasPromo ? (
          <View style={[styles.dishTag, { backgroundColor: COLORS.success }]}>
            <Text style={styles.dishTagText}>-{percent}%</Text>
          </View>
        ) : item.is_featured ? (
          <View style={[styles.dishTag, { backgroundColor: COLORS.primary }]}>
            <Ionicons name="flame" size={11} color={COLORS.white} />
            <Text style={styles.dishTagText}>Populaire</Text>
          </View>
        ) : null}
        <TouchableOpacity style={styles.dishHeart} onPress={() => onLike(item)} hitSlop={8} activeOpacity={0.8}>
          <Ionicons name={liked ? 'heart' : 'heart-outline'} size={16} color={liked ? COLORS.danger : COLORS.text} />
        </TouchableOpacity>
      </SmartImage>

      <View style={styles.dishBody}>
        <Text style={styles.dishName} numberOfLines={2}>{clean(item.name)}</Text>
        <Text style={styles.dishDesc} numberOfLines={2}>{desc || ' '}</Text>
        <View style={styles.dishFooter}>
          <View style={{ flex: 1 }}>
            {hasPromo ? <Text style={styles.oldPrice}>{formatPrice(price)}</Text> : null}
            <Text style={styles.dishPrice} numberOfLines={1}>{formatPrice(effective)}</Text>
          </View>
          <AddButton onPress={() => onAdd(item)} disabled={unavailable} />
        </View>
      </View>
    </TouchableOpacity>
  );
}

export default function RestaurantScreen({ route, navigation }) {
  const { restaurant: routeRestaurant } = route.params;
  const { addItem, totalItems, subtotal } = useCart();
  const { isFavorite, toggleFavorite } = useFavorites();
  const toast = useToast();
  const insets = useSafeAreaInsets();

  const [restaurant, setRestaurant] = useState(routeRestaurant);
  const [categories, setCategories] = useState([]);
  const [filter, setFilter] = useState('all'); // 'all' | 'promos' | id de catégorie
  const [showAll, setShowAll] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(false);
  const [showFullDesc, setShowFullDesc] = useState(false);
  const [showHours, setShowHours] = useState(false);
  const [photoModalVisible, setPhotoModalVisible] = useState(false);
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState(0);
  const [stickY, setStickY] = useState(0);

  const scrollY = useRef(new Animated.Value(0)).current;
  const scrollRef = useRef(null);
  const lastY = useRef(0);
  const topBarH = insets.top + TOP_BAR_H;

  const liked = isFavorite('restaurant', routeRestaurant.id);
  const onLike = async () => {
    const ok = await toggleFavorite('restaurant', restaurant);
    if (!ok) navigation.navigate('Auth', { screen: 'Login' });
  };
  const onLikeItem = async (item) => {
    const ok = await toggleFavorite('item', { ...item, restaurant: item.restaurant || restaurant });
    if (!ok) navigation.navigate('Auth', { screen: 'Login' });
  };

  const loadMenu = useCallback(async () => {
    try {
      setError(false);
      // Le menu ne renvoie qu'un sous-ensemble du restaurant : on charge aussi la fiche
      // complète (adresse, téléphone, horaires, coordonnées) sans bloquer si elle échoue.
      const [menuRes, detailRes] = await Promise.allSettled([
        restaurantService.getMenu(routeRestaurant.id),
        restaurantService.getRestaurant(routeRestaurant.id),
      ]);
      if (detailRes.status === 'fulfilled' && detailRes.value && typeof detailRes.value === 'object') {
        const detail = detailRes.value.data && detailRes.value.data.id ? detailRes.value.data : detailRes.value;
        setRestaurant(prev => ({ ...prev, ...detail }));
      }
      if (menuRes.status === 'rejected') throw menuRes.reason;
      const data = menuRes.value || {};
      if (data.restaurant) setRestaurant(prev => ({ ...prev, ...data.restaurant }));
      setCategories(data.menu || []);
    } catch (e) {
      console.error('Erreur chargement menu:', e);
      setError(true);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [routeRestaurant.id]);

  useEffect(() => { loadMenu(); }, []);
  const onRefresh = () => { setRefreshing(true); loadMenu(); };

  // Les catégories sans plat ne sont jamais affichées
  const visibleCategories = useMemo(
    () => categories.filter(c => Array.isArray(c.items) && c.items.length > 0),
    [categories]
  );
  const allItems = useMemo(() => visibleCategories.flatMap(c => c.items), [visibleCategories]);
  const promoItems = useMemo(() => allItems.filter(i => pricing(i).hasPromo), [allItems]);
  const maxPercent = promoItems.reduce((m, i) => Math.max(m, pricing(i).percent), 0);

  // Filtre courant (retombe sur « Tous » si la catégorie n'existe plus)
  const currentCategory = visibleCategories.find(c => c.id === filter);
  const activeFilter = filter === 'promos' ? (promoItems.length ? 'promos' : 'all') : (currentCategory ? filter : 'all');

  const popularSorted = useMemo(
    () => [...allItems].sort((a, b) => (b.is_featured ? 1 : 0) - (a.is_featured ? 1 : 0)),
    [allItems]
  );
  let gridItems; let sectionTitle;
  if (activeFilter === 'promos') { gridItems = promoItems; sectionTitle = 'Promotions'; }
  else if (activeFilter === 'all') {
    gridItems = showAll ? popularSorted : popularSorted.slice(0, POPULAR_LIMIT);
    sectionTitle = 'Nos plats populaires';
  } else { gridItems = currentCategory.items; sectionTitle = labelize(currentCategory.name); }
  const canExpand = activeFilter === 'all' && popularSorted.length > POPULAR_LIMIT;

  const isOpen = restaurant.is_open == null ? true : !!restaurant.is_open;
  const photos = Array.isArray(restaurant.photos) ? restaurant.photos : [];
  const hours = useMemo(() => parseOpeningHours(restaurant.opening_hours), [restaurant.opening_hours]);
  const todayHours = hours.find(h => h.key === TODAY_KEY);
  const closeLabel = hourLabel(todayHours?.close);
  const addressLine = [clean(restaurant.address), clean(restaurant.city)].filter(Boolean).join(', ');
  const hasPracticalInfo = addressLine || restaurant.phone || hours.length > 0 || Number(restaurant.minimum_order) > 0;
  const desc = clean(restaurant.description) || '';
  const cuisine = clean(restaurant.category?.name) || clean(restaurant.cuisine) || 'Restaurant';
  const rating = Number(restaurant.rating) || 0;
  const ratingCount = Number(restaurant.ratings_count || restaurant.reviews_count) || 0;

  const openItem = (item) => navigation.navigate('ItemDetail', { item, restaurant });

  // Ajout rapide : pas de connexion exigée (panier invité, connexion demandée au paiement)
  const handleAdd = async (item) => {
    // Un plat avec options obligatoires doit passer par la fiche pour les choisir
    const needsChoice = (item.option_groups || []).some(g => g.is_required);
    if (needsChoice) { openItem(item); return false; }
    const added = await addItem({ ...item, effective_price: pricing(item).effective }, 1, restaurant);
    if (added === false) return false;
    toast.show(`${clean(item.name)} ajouté au panier`);
    return true;
  };

  // Changement de filtre : on remonte en douceur au début de la grille si on l'a dépassée
  const selectFilter = (id) => {
    setFilter(id);
    setShowAll(false);
    const target = Math.max(0, stickY - topBarH);
    if (stickY > 0 && lastY.current > target) {
      scrollRef.current?.scrollTo({ y: target, animated: true });
    }
  };

  const openDirections = () => Linking.openURL(directionsUrl(restaurant)).catch(() => {});
  const callRestaurant = () => Linking.openURL(`tel:${restaurant.phone}`).catch(() => {});
  const handleShare = () => {
    Share.share({
      message: `Découvrez ${restaurant.name} sur Estuaire Eat${restaurant.address ? ` — ${restaurant.address}` : ''}`,
    }).catch(() => {});
  };

  // Barre compacte (nom) qui apparaît une fois la couverture dépassée
  const topBarOpacity = scrollY.interpolate({
    inputRange: [HERO_HEIGHT - topBarH - 40, HERO_HEIGHT - topBarH],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });
  // Les tuiles collantes s'arrêtent sous la barre compacte au lieu de passer sous la barre d'état
  const tilesTranslate = stickY > 0
    ? scrollY.interpolate({
        inputRange: [stickY - topBarH, stickY],
        outputRange: [0, topBarH],
        extrapolate: 'clamp',
      })
    : 0;

  const showCart = totalItems > 0;
  const cartSpace = showCart ? 96 : 24;

  const renderMenu = () => {
    if (loading) return <View style={{ height: 240 }}><LoadingView label="Chargement du menu…" /></View>;
    if (error && visibleCategories.length === 0) {
      return (
        <EmptyState
          icon="cloud-offline-outline"
          title="Menu indisponible"
          message="Impossible de charger le menu. Vérifiez votre connexion."
          actionLabel="Réessayer"
          onAction={() => { setLoading(true); loadMenu(); }}
        />
      );
    }
    if (visibleCategories.length === 0) {
      return (
        <EmptyState
          icon="restaurant-outline"
          title="Menu bientôt disponible"
          message="Ce restaurant n'a pas encore publié ses plats. Revenez très vite !"
        />
      );
    }
    return (
      <View style={[styles.menuSection, { minHeight: SCREEN_H - topBarH - 90 }]}>
        {/* Bannière promo : uniquement s'il existe de vraies réductions */}
        {promoItems.length > 0 && activeFilter !== 'promos' ? (
          <LinearGradient colors={GRADIENTS.primary} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.promo}>
            <View style={styles.promoIcon}><Ionicons name="gift" size={30} color={COLORS.primary} /></View>
            <View style={{ flex: 1 }}>
              <Text style={styles.promoBig}>Jusqu'à -{maxPercent}%</Text>
              <Text style={styles.promoSub} numberOfLines={2}>
                sur une sélection de {promoItems.length} plat{promoItems.length > 1 ? 's' : ''}
              </Text>
            </View>
            <TouchableOpacity style={styles.promoBtn} onPress={() => selectFilter('promos')} activeOpacity={0.85}>
              <Text style={styles.promoBtnText}>Voir</Text>
              <Ionicons name="arrow-forward" size={15} color={COLORS.text} />
            </TouchableOpacity>
          </LinearGradient>
        ) : null}

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle} numberOfLines={1}>{sectionTitle}</Text>
          {canExpand ? (
            <TouchableOpacity style={styles.sectionAction} onPress={() => setShowAll(v => !v)} hitSlop={8}>
              <Text style={styles.sectionActionText}>{showAll ? 'Voir moins' : 'Voir tout'}</Text>
              <Ionicons name={showAll ? 'arrow-up' : 'arrow-forward'} size={15} color={COLORS.primary} />
            </TouchableOpacity>
          ) : (
            <Text style={TYPE.caption}>{gridItems.length} plat{gridItems.length > 1 ? 's' : ''}</Text>
          )}
        </View>

        <View style={styles.grid}>
          {gridItems.map(item => (
            <DishCard
              key={item.id}
              item={item}
              liked={isFavorite('item', item.id)}
              onLike={onLikeItem}
              onPress={openItem}
              onAdd={handleAdd}
            />
          ))}
        </View>

        {canExpand && !showAll ? (
          <TouchableOpacity style={styles.moreBtn} onPress={() => setShowAll(true)} activeOpacity={0.85}>
            <Text style={styles.moreBtnText}>Voir les {popularSorted.length} plats</Text>
            <Ionicons name="chevron-down" size={16} color={COLORS.primary} />
          </TouchableOpacity>
        ) : null}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      <Animated.ScrollView
        ref={scrollRef}
        showsVerticalScrollIndicator={false}
        stickyHeaderIndices={[1]}
        scrollEventThrottle={16}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: true, listener: e => { lastY.current = e.nativeEvent.contentOffset.y; } }
        )}
        contentContainerStyle={{ paddingBottom: insets.bottom + cartSpace }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.white} progressViewOffset={insets.top} />
        }
      >
        {/* ── Couverture + identité + bandeau d'infos ── */}
        <View onLayout={e => setStickY(e.nativeEvent.layout.height)}>
          <SmartImage uri={restaurant.cover_image || restaurant.logo} style={styles.hero} fallbackIcon="restaurant" iconSize={56}>
            <LinearGradient colors={['rgba(0,0,0,0.45)', 'transparent']} style={styles.heroTopFade} pointerEvents="none" />
            {photos.length > 0 ? (
              <TouchableOpacity
                style={styles.photoCountBtn}
                onPress={() => { setSelectedPhotoIndex(0); setPhotoModalVisible(true); }}
                activeOpacity={0.85}
              >
                <Ionicons name="images-outline" size={14} color={COLORS.white} />
                <Text style={styles.photoCountText}>{photos.length}</Text>
              </TouchableOpacity>
            ) : null}
          </SmartImage>

          {/* Feuille blanche au bord arrondi qui recouvre le bas de la photo */}
          <View style={styles.sheet}>
            <View style={styles.identity}>
              <View style={styles.logoWrap}>
                <SmartImage uri={restaurant.logo} style={styles.logo} fallbackIcon="storefront-outline" iconSize={30} />
              </View>
              <View style={styles.identityText}>
                <View style={styles.nameRow}>
                  <Text style={styles.name} numberOfLines={2}>{clean(restaurant.name)}</Text>
                </View>
                <Text style={styles.cuisine} numberOfLines={1}>{cuisine}</Text>
                <View style={styles.ratingRow}>
                  <Ionicons name="star" size={15} color={COLORS.primary} />
                  {rating > 0 ? (
                    <>
                      <Text style={styles.ratingValue}>{rating.toFixed(1).replace('.', ',')}</Text>
                      {ratingCount > 0 ? <Text style={styles.ratingCount}>({formatCount(ratingCount)} avis)</Text> : null}
                    </>
                  ) : (
                    <Text style={styles.ratingValue}>Nouveau</Text>
                  )}
                </View>
              </View>
            </View>

            {/* Bandeau 3 colonnes */}
            <View style={styles.strip}>
              <View style={styles.stripCell}>
                <Ionicons name="time-outline" size={20} color={COLORS.text} />
                <View style={styles.stripText}>
                  <Text style={styles.stripValue} numberOfLines={1}>{deliveryTime(restaurant)}</Text>
                  <Text style={styles.stripLabel} numberOfLines={1}>Livraison</Text>
                </View>
              </View>
              <View style={styles.stripDivider} />
              <View style={styles.stripCell}>
                <Ionicons name="bicycle-outline" size={20} color={COLORS.text} />
                <View style={styles.stripText}>
                  <Text style={styles.stripValue} numberOfLines={1}>{deliveryFeeLabel(restaurant)}</Text>
                  <Text style={styles.stripLabel} numberOfLines={1}>Frais livraison</Text>
                </View>
              </View>
              <View style={styles.stripDivider} />
              <View style={[styles.openPill, { backgroundColor: isOpen ? COLORS.successSoft : COLORS.dangerSoft }]}>
                <View style={styles.openRow}>
                  <View style={[styles.openDot, { backgroundColor: isOpen ? COLORS.success : COLORS.danger }]} />
                  <Text style={[styles.openText, { color: isOpen ? COLORS.success : COLORS.danger }]}>
                    {isOpen ? 'Ouvert' : 'Fermé'}
                  </Text>
                </View>
                {isOpen && closeLabel ? <Text style={styles.openSub}>Jusqu'à {closeLabel}</Text> : null}
              </View>
            </View>
          </View>
        </View>

        {/* ── Tuiles de catégories collantes (seulement les catégories non vides) ── */}
        <Animated.View style={[styles.stickyWrap, { transform: [{ translateY: tilesTranslate }] }]}>
          {visibleCategories.length > 0 ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tilesContent}>
              <CategoryTile label="Tous" icon="restaurant" active={activeFilter === 'all'} onPress={() => selectFilter('all')} />
              {promoItems.length > 0 ? (
                <CategoryTile label="Promos" icon="pricetag-outline" active={activeFilter === 'promos'} onPress={() => selectFilter('promos')} />
              ) : null}
              {visibleCategories.map(cat => (
                <CategoryTile
                  key={cat.id}
                  label={labelize(cat.name)}
                  icon={categoryIcon(cat.name)}
                  active={activeFilter === cat.id}
                  onPress={() => selectFilter(cat.id)}
                />
              ))}
            </ScrollView>
          ) : null}
        </Animated.View>

        {/* ── Menu ── */}
        {renderMenu()}

        {/* ── À propos + infos pratiques ── */}
        {(desc || hasPracticalInfo) ? (
          <View style={styles.aboutCard}>
            <View style={styles.aboutHeader}>
              <View style={styles.sectionBar} />
              <Text style={TYPE.h3}>Infos pratiques</Text>
            </View>

            {desc ? (
              <TouchableOpacity onPress={() => setShowFullDesc(!showFullDesc)} activeOpacity={0.8} style={{ marginBottom: 6 }}>
                <Text style={TYPE.bodyMuted} numberOfLines={showFullDesc ? undefined : 3}>{desc}</Text>
                {desc.length > 120 ? (
                  <Text style={styles.readMore}>{showFullDesc ? 'Voir moins' : 'Voir plus'}</Text>
                ) : null}
              </TouchableOpacity>
            ) : null}

            {addressLine ? (
              <View style={styles.infoRow}>
                <View style={styles.infoIcon}><Ionicons name="location-outline" size={16} color={COLORS.primary} /></View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.infoLabel}>Adresse</Text>
                  <Text style={styles.infoValue} numberOfLines={2}>{addressLine}</Text>
                </View>
                <TouchableOpacity style={styles.infoAction} onPress={openDirections} activeOpacity={0.8}>
                  <Ionicons name="navigate" size={14} color={COLORS.primary} />
                  <Text style={styles.infoActionText}>Itinéraire</Text>
                </TouchableOpacity>
              </View>
            ) : null}

            {restaurant.phone ? (
              <View style={styles.infoRow}>
                <View style={styles.infoIcon}><Ionicons name="call-outline" size={16} color={COLORS.primary} /></View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.infoLabel}>Téléphone</Text>
                  <Text style={styles.infoValue}>{clean(restaurant.phone)}</Text>
                </View>
                <TouchableOpacity style={styles.infoAction} onPress={callRestaurant} activeOpacity={0.8}>
                  <Ionicons name="call" size={14} color={COLORS.primary} />
                  <Text style={styles.infoActionText}>Appeler</Text>
                </TouchableOpacity>
              </View>
            ) : null}

            {hours.length > 0 ? (
              <View>
                <TouchableOpacity style={styles.infoRow} onPress={() => setShowHours(v => !v)} activeOpacity={0.8}>
                  <View style={styles.infoIcon}><Ionicons name="time-outline" size={16} color={COLORS.primary} /></View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.infoLabel}>Horaires</Text>
                    <Text style={styles.infoValue}>
                      {todayHours ? `Aujourd'hui : ${todayHours.value}` : 'Voir les horaires'}
                    </Text>
                  </View>
                  <Ionicons name={showHours ? 'chevron-up' : 'chevron-down'} size={18} color={COLORS.textMuted} />
                </TouchableOpacity>
                {showHours ? (
                  <View style={styles.hoursList}>
                    {hours.map(h => (
                      <View key={h.key} style={styles.hoursRow}>
                        <Text style={[styles.hoursDay, h.key === TODAY_KEY && styles.hoursToday]}>{h.label}</Text>
                        <Text style={[styles.hoursValue, h.key === TODAY_KEY && styles.hoursToday]}>{h.value}</Text>
                      </View>
                    ))}
                  </View>
                ) : null}
              </View>
            ) : null}

            {Number(restaurant.minimum_order) > 0 ? (
              <View style={styles.infoRow}>
                <View style={styles.infoIcon}><Ionicons name="wallet-outline" size={16} color={COLORS.primary} /></View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.infoLabel}>Commande minimum</Text>
                  <Text style={styles.infoValue}>{formatPrice(restaurant.minimum_order)}</Text>
                </View>
              </View>
            ) : null}
          </View>
        ) : null}
      </Animated.ScrollView>

      {/* ── Barre compacte au défilement ── */}
      <Animated.View
        pointerEvents="none"
        style={[styles.topBar, { height: topBarH, paddingTop: insets.top, opacity: topBarOpacity }]}
      >
        <Text style={styles.topBarTitle} numberOfLines={1}>{clean(restaurant.name)}</Text>
      </Animated.View>

      {/* ── Boutons d'en-tête (toujours visibles) ── */}
      <View style={[styles.headerBtns, { top: insets.top + 6 }]} pointerEvents="box-none">
        <IconButton icon="arrow-back" onPress={() => navigation.goBack()} size={42} />
        <View style={styles.headerBtnsRight}>
          <IconButton
            icon={liked ? 'heart' : 'heart-outline'}
            color={COLORS.danger}
            onPress={onLike}
            size={42}
            iconSize={20}
          />
          <IconButton icon="share-social-outline" onPress={handleShare} size={42} iconSize={19} />
        </View>
      </View>

      {/* ── Galerie photos ── */}
      <Modal visible={photoModalVisible} transparent animationType="fade" onRequestClose={() => setPhotoModalVisible(false)}>
        <View style={styles.photoModal}>
          <TouchableOpacity style={[styles.photoModalClose, { top: insets.top + 10 }]} onPress={() => setPhotoModalVisible(false)}>
            <Ionicons name="close" size={26} color={COLORS.white} />
          </TouchableOpacity>
          <Text style={[styles.photoModalCounter, { top: insets.top + 20 }]}>
            {selectedPhotoIndex + 1} / {photos.length}
          </Text>
          <FlatList
            data={photos}
            horizontal pagingEnabled showsHorizontalScrollIndicator={false}
            initialScrollIndex={selectedPhotoIndex}
            getItemLayout={(_, index) => ({ length: width, offset: width * index, index })}
            onMomentumScrollEnd={e => setSelectedPhotoIndex(Math.round(e.nativeEvent.contentOffset.x / width))}
            keyExtractor={(_, i) => String(i)}
            renderItem={({ item }) => (
              <SmartImage
                uri={item}
                style={{ width, height: '100%', backgroundColor: 'transparent' }}
                resizeMode="contain"
                fallbackIcon="image-outline"
                iconSize={48}
              />
            )}
          />
        </View>
      </Modal>

      {/* ── Confirmation d'ajout ── */}
      <Animated.View
        pointerEvents="none"
        style={[
          styles.toast,
          { bottom: insets.bottom + (showCart ? 92 : 24) },
          {
            opacity: toast.anim,
            transform: [{ translateY: toast.anim.interpolate({ inputRange: [0, 1], outputRange: [16, 0] }) }],
          },
        ]}
      >
        <Ionicons name="checkmark-circle" size={18} color={COLORS.success} />
        <Text style={styles.toastText} numberOfLines={1}>{toast.message}</Text>
      </Animated.View>

      {/* ── Barre panier ── */}
      {showCart ? (
        <View style={[styles.cartBar, { bottom: insets.bottom + 12 }]}>
          <View style={styles.cartIconWrap}>
            <Ionicons name="cart-outline" size={26} color={COLORS.text} />
            <View style={styles.cartBadge}><Text style={styles.cartBadgeText}>{totalItems > 99 ? '99+' : totalItems}</Text></View>
          </View>
          <Text style={styles.cartSummary} numberOfLines={1}>
            {totalItems} article{totalItems > 1 ? 's' : ''} • {formatPrice(subtotal)}
          </Text>
          <TouchableOpacity
            style={styles.cartBtn}
            onPress={() => navigation.navigate('Main', { screen: 'Panier' })}
            activeOpacity={0.9}
          >
            <Text style={styles.cartBtnText}>Voir le panier</Text>
            <Ionicons name="arrow-forward" size={16} color={COLORS.white} />
          </TouchableOpacity>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },

  // ── Couverture ──
  hero: { width: '100%', height: HERO_HEIGHT },
  heroTopFade: { position: 'absolute', top: 0, left: 0, right: 0, height: 120 },
  photoCountBtn: {
    position: 'absolute', right: SCREEN_PADDING, bottom: SHEET_OVERLAP + 12,
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: 'rgba(20,20,31,0.6)', borderRadius: RADIUS.pill,
    paddingHorizontal: 10, paddingVertical: 5,
  },
  photoCountText: { fontFamily: FONTS.medium, fontSize: 12, color: COLORS.white },

  headerBtns: {
    position: 'absolute', left: SCREEN_PADDING, right: SCREEN_PADDING,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  headerBtnsRight: { flexDirection: 'row', gap: 10 },

  topBar: {
    position: 'absolute', top: 0, left: 0, right: 0,
    backgroundColor: COLORS.bg, justifyContent: 'center',
    paddingHorizontal: SCREEN_PADDING + 108,
    borderBottomWidth: 1, borderBottomColor: COLORS.divider,
  },
  topBarTitle: { fontFamily: FONTS.semibold, fontSize: 16, color: COLORS.text, textAlign: 'center' },

  // ── Feuille / identité ──
  sheet: {
    marginTop: -SHEET_OVERLAP,
    backgroundColor: COLORS.bg,
    borderTopLeftRadius: 40, borderTopRightRadius: 40,
    paddingHorizontal: SCREEN_PADDING, paddingBottom: 6,
  },
  identity: { flexDirection: 'row', alignItems: 'flex-end', gap: 14 },
  logoWrap: { marginTop: -54 },
  logo: {
    width: 100, height: 100, borderRadius: 50,
    borderWidth: 4, borderColor: COLORS.surface,
    ...SHADOWS.md,
  },
  verified: {
    position: 'absolute', right: 4, bottom: 4,
    width: 24, height: 24, borderRadius: 12, backgroundColor: COLORS.primary,
    alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: COLORS.surface,
  },
  identityText: { flex: 1, paddingTop: 10 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  name: { fontFamily: FONTS.bold, fontSize: 22, lineHeight: 28, color: COLORS.text, flexShrink: 1 },
  cuisine: { fontFamily: FONTS.regular, fontSize: 13, color: COLORS.textMuted, marginTop: 1 },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 3 },
  ratingValue: { fontFamily: FONTS.bold, fontSize: 15, color: COLORS.primary },
  ratingCount: { fontFamily: FONTS.regular, fontSize: 13, color: COLORS.textMuted },

  strip: {
    flexDirection: 'row', alignItems: 'center', marginTop: 14,
    backgroundColor: COLORS.surface, borderRadius: RADIUS.lg,
    paddingVertical: 10, paddingHorizontal: 10, ...SHADOWS.md,
  },
  stripCell: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 4 },
  stripText: { flex: 1 },
  stripValue: { fontFamily: FONTS.semibold, fontSize: 13, lineHeight: 18, color: COLORS.text },
  stripLabel: { fontFamily: FONTS.regular, fontSize: 10, lineHeight: 14, color: COLORS.textMuted },
  stripDivider: { width: 1, height: 30, backgroundColor: COLORS.divider, marginHorizontal: 4 },
  openPill: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    borderRadius: RADIUS.md, paddingVertical: 6, paddingHorizontal: 6, marginLeft: 4,
  },
  openRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  openDot: { width: 7, height: 7, borderRadius: 4 },
  openText: { fontFamily: FONTS.semibold, fontSize: 13, lineHeight: 18 },
  openSub: { fontFamily: FONTS.regular, fontSize: 10, lineHeight: 14, color: COLORS.textMuted },

  // ── Tuiles catégories ──
  stickyWrap: { backgroundColor: COLORS.bg, zIndex: 2 },
  tilesContent: { paddingHorizontal: SCREEN_PADDING, paddingVertical: 12, gap: 8 },
  tile: {
    width: 70, height: 70, borderRadius: RADIUS.lg,
    alignItems: 'center', justifyContent: 'center', gap: 4, paddingHorizontal: 4,
  },
  tileIdle: { backgroundColor: COLORS.surface, ...SHADOWS.sm },
  tileActive: { backgroundColor: COLORS.primary, ...SHADOWS.primary },
  tileLabel: { fontFamily: FONTS.medium, fontSize: 11, color: COLORS.text, textAlign: 'center' },

  // ── Menu ──
  menuSection: { paddingHorizontal: SCREEN_PADDING, paddingTop: 4 },
  promo: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    borderRadius: RADIUS.xl, padding: 14, marginBottom: 20, ...SHADOWS.primary,
  },
  promoIcon: {
    width: 56, height: 56, borderRadius: 18, backgroundColor: COLORS.white,
    alignItems: 'center', justifyContent: 'center',
  },
  promoBig: { fontFamily: FONTS.extrabold, fontSize: 22, lineHeight: 28, color: COLORS.white },
  promoSub: { fontFamily: FONTS.medium, fontSize: 12, lineHeight: 16, color: 'rgba(255,255,255,0.92)' },
  promoBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: COLORS.white, borderRadius: RADIUS.pill, paddingHorizontal: 14, height: 38,
  },
  promoBtnText: { fontFamily: FONTS.semibold, fontSize: 13, color: COLORS.text },

  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  sectionTitle: { fontFamily: FONTS.bold, fontSize: 19, lineHeight: 26, color: COLORS.text, flex: 1 },
  sectionAction: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  sectionActionText: { fontFamily: FONTS.semibold, fontSize: 13, color: COLORS.primary },
  sectionBar: { width: 4, height: 22, borderRadius: 2, backgroundColor: COLORS.primary },

  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: GRID_GAP },
  dishCard: { width: CARD_W, backgroundColor: COLORS.surface, borderRadius: RADIUS.lg, ...SHADOWS.md },
  dishImage: {
    width: '100%', height: CARD_W * 0.72,
    borderTopLeftRadius: RADIUS.lg, borderTopRightRadius: RADIUS.lg,
  },
  dishTag: {
    position: 'absolute', top: 8, left: 8,
    flexDirection: 'row', alignItems: 'center', gap: 3,
    borderRadius: RADIUS.pill, paddingHorizontal: 8, paddingVertical: 3,
  },
  dishTagText: { fontFamily: FONTS.semibold, fontSize: 10, lineHeight: 14, color: COLORS.white },
  dishHeart: {
    position: 'absolute', top: 8, right: 8,
    width: 28, height: 28, borderRadius: 14, backgroundColor: COLORS.white,
    alignItems: 'center', justifyContent: 'center', ...SHADOWS.sm,
  },
  dishUnavailable: {
    ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(20,20,31,0.45)',
    alignItems: 'center', justifyContent: 'center',
  },
  dishUnavailableText: { fontFamily: FONTS.semibold, fontSize: 12, color: COLORS.white },
  dishBody: { padding: 10, paddingTop: 8, flex: 1 },
  dishName: { fontFamily: FONTS.semibold, fontSize: 13, lineHeight: 18, color: COLORS.text },
  dishDesc: { fontFamily: FONTS.regular, fontSize: 11, lineHeight: 15, color: COLORS.textMuted, marginTop: 2 },
  dishFooter: { flexDirection: 'row', alignItems: 'flex-end', gap: 6, marginTop: 8 },
  dishPrice: { fontFamily: FONTS.bold, fontSize: 14, lineHeight: 19, color: COLORS.primary },
  oldPrice: { fontFamily: FONTS.regular, fontSize: 11, lineHeight: 14, color: COLORS.textLight, textDecorationLine: 'line-through' },
  addBtn: {
    backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center',
    ...SHADOWS.primary,
  },
  addBtnDone: { backgroundColor: COLORS.success },
  moreBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    marginTop: 16, height: 46, borderRadius: RADIUS.pill,
    backgroundColor: COLORS.primarySoft,
  },
  moreBtnText: { fontFamily: FONTS.semibold, fontSize: 14, color: COLORS.primary },

  // ── Infos pratiques ──
  aboutCard: {
    marginTop: 24, marginHorizontal: SCREEN_PADDING,
    backgroundColor: COLORS.surface, borderRadius: RADIUS.xl, paddingHorizontal: 16, paddingVertical: 14,
    ...SHADOWS.sm,
  },
  aboutHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  readMore: { fontFamily: FONTS.semibold, fontSize: 13, color: COLORS.primary, marginTop: 2 },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 9 },
  infoIcon: {
    width: 34, height: 34, borderRadius: 17, backgroundColor: COLORS.primarySoft,
    alignItems: 'center', justifyContent: 'center',
  },
  infoLabel: { fontFamily: FONTS.regular, fontSize: 11, lineHeight: 15, color: COLORS.textMuted },
  infoValue: { fontFamily: FONTS.medium, fontSize: 13, lineHeight: 18, color: COLORS.text },
  infoAction: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    height: 32, paddingHorizontal: 12, borderRadius: RADIUS.pill, backgroundColor: COLORS.primarySoft,
  },
  infoActionText: { fontFamily: FONTS.semibold, fontSize: 12, color: COLORS.primary },
  hoursList: { marginLeft: 46, marginBottom: 6, gap: 4 },
  hoursRow: { flexDirection: 'row', justifyContent: 'space-between' },
  hoursDay: { fontFamily: FONTS.regular, fontSize: 13, color: COLORS.textMuted },
  hoursValue: { fontFamily: FONTS.regular, fontSize: 13, color: COLORS.text },
  hoursToday: { fontFamily: FONTS.semibold, color: COLORS.primary },

  // ── Barre panier ──
  cartBar: {
    position: 'absolute', left: SCREEN_PADDING, right: SCREEN_PADDING,
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: COLORS.surface, borderRadius: RADIUS.xl,
    paddingVertical: 10, paddingLeft: 16, paddingRight: 10, ...SHADOWS.lg,
  },
  cartIconWrap: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center' },
  cartBadge: {
    position: 'absolute', top: -6, right: -8, minWidth: 20, height: 20, borderRadius: 10,
    backgroundColor: COLORS.danger, alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 5, borderWidth: 2, borderColor: COLORS.surface,
  },
  cartBadgeText: { fontFamily: FONTS.bold, fontSize: 10, color: COLORS.white },
  cartSummary: { flex: 1, fontFamily: FONTS.semibold, fontSize: 13, color: COLORS.text },
  cartBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: COLORS.primary, borderRadius: RADIUS.pill, paddingHorizontal: 16, height: 44,
    ...SHADOWS.primary,
  },
  cartBtnText: { fontFamily: FONTS.semibold, fontSize: 14, color: COLORS.white },

  toast: {
    position: 'absolute', alignSelf: 'center', maxWidth: width - SCREEN_PADDING * 2,
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: COLORS.dark, borderRadius: RADIUS.pill, paddingHorizontal: 16, paddingVertical: 10,
    ...SHADOWS.md,
  },
  toastText: { fontFamily: FONTS.medium, fontSize: 13, color: COLORS.white, flexShrink: 1 },

  // ── Galerie ──
  photoModal: { flex: 1, backgroundColor: COLORS.black, justifyContent: 'center' },
  photoModalClose: {
    position: 'absolute', right: 20, zIndex: 10,
    width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center', alignItems: 'center',
  },
  photoModalCounter: {
    position: 'absolute', left: 0, right: 0, zIndex: 10,
    textAlign: 'center', fontFamily: FONTS.medium, fontSize: 14, color: COLORS.white,
  },
});
