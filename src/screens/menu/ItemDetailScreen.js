import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Pressable,
  ScrollView, Alert, FlatList, Dimensions, StatusBar, Share, Animated,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useCart } from '../../context/CartContext';
import { useFavorites } from '../../context/FavoritesContext';
import { useDeliveryLocation, distanceKm } from '../../context/DeliveryLocationContext';
import { restaurantService } from '../../services/restaurantService';
import { COLORS, FONTS, TYPE, RADIUS, SHADOWS, GRADIENTS, SCREEN_PADDING, formatPrice } from '../../theme';
import { IconButton, Badge, SmartImage, QuantityStepper } from '../../components/ui';
import { dishFallbackImage } from '../../theme/images';
import useMenuDay, { isDishOrderableToday, isDishServedToday } from '../../hooks/useMenuDay';

const { width, height } = Dimensions.get('window');
const HEADER_H = Math.max(420, Math.min(Math.round(height * 0.68), 680));
const SHEET_OVERLAP = 42;
const SUGGEST_W = 150;
const OPTION_W = 128;

const clean = (s) => (typeof s === 'string' ? s.trim().replace(/[ \t]+/g, ' ') : s);
// « 12 500 » → « 12,5k »
const formatCount = (n) => {
  const v = Number(n) || 0;
  if (v >= 1000) return `${(v / 1000).toFixed(v >= 10000 ? 0 : 1).replace('.', ',').replace(',0', '')}k`;
  return String(v);
};
const formatKm = (km) => (km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(1).replace('.', ',')} km`);
const deliveryTime = (r) => {
  if (r.delivery_time_min && r.delivery_time_max) return `${r.delivery_time_min}-${r.delivery_time_max} min`;
  if (r.delivery_time_min) return `${r.delivery_time_min} min`;
  return null;
};
const pricing = (item) => {
  const price = Number(item.price) || 0;
  const promo = Number(item.discount_price) || 0;
  const hasPromo = promo > 0 && promo < price;
  return { price, effective: hasPromo ? promo : price, hasPromo };
};

// Icône d'option déduite du nom (pas d'emoji : rendu « ? » sur certains appareils)
const OPTION_ICONS = [
  [/boisson|jus|soda|coca|fanta|eau|bi[èe]re|drink/i, 'wine-outline'],
  [/salade|l[ée]gume|crudit/i, 'leaf-outline'],
  [/frite|plantain|pomme|miondo|b[âa]ton|riz|accompagnement/i, 'restaurant-outline'],
  [/sauce|piment|ketchup|mayo/i, 'flame-outline'],
  [/fromage|cheese|oeuf|œuf/i, 'egg-outline'],
  [/poulet|viande|b[œo]e?uf|poisson|suppl/i, 'add-circle-outline'],
  [/taille|grand|petit|moyen|xl|portion/i, 'resize-outline'],
];
const optionIcon = (name) => (OPTION_ICONS.find(([re]) => re.test(name || '')) || [null, 'ellipse-outline'])[1];

// Mention de disponibilité dans la description (ex. « disponible chaque jour »)
function availabilityHint(description) {
  if (!description) return null;
  const m = description.match(/(?:^|[.!\n])\s*([^.!\n]*\bdisponib[^.!\n]*)/i);
  if (!m) return null;
  const t = m[1].trim();
  if (!t || t.length > 42) return null;
  return t.charAt(0).toUpperCase() + t.slice(1);
}

function getAllImages(item) {
  const imgs = [];
  if (item.image) imgs.push(item.image);
  if (Array.isArray(item.images)) {
    item.images.forEach(img => {
      if (img && !imgs.includes(img)) imgs.push(img);
    });
  }
  return imgs;
}

// ── En-tête photo plein écran (sous la barre d'état) ──
function ImageCarousel({ images, fallbackSource, onBack, liked, onLike, onShare, topInset, rating, ratingCount }) {
  const [activeIndex, setActiveIndex] = useState(0);

  const onScroll = (e) => {
    const idx = Math.round(e.nativeEvent.contentOffset.x / width);
    if (idx !== activeIndex) setActiveIndex(idx);
  };

  return (
    <View style={styles.imageContainer}>
      {images.length === 0 ? (
        <SmartImage style={styles.carouselImage} fallbackSource={fallbackSource} fallbackIcon="restaurant-outline" iconSize={72} />
      ) : (
        <FlatList
          data={images}
          keyExtractor={(_, i) => String(i)}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onScroll={onScroll}
          scrollEventThrottle={16}
          renderItem={({ item: img }) => (
            <SmartImage uri={img} fallbackSource={fallbackSource} style={styles.carouselImage} fallbackIcon="restaurant-outline" iconSize={72} />
          )}
        />
      )}

      {images.length > 0 ? (
        <LinearGradient colors={['rgba(0,0,0,0.4)', 'transparent']} style={styles.topOverlay} pointerEvents="none" />
      ) : null}

      <View style={[styles.topActions, { top: topInset + 8 }]} pointerEvents="box-none">
        <IconButton icon="arrow-back" onPress={onBack} size={42} />
        <View style={styles.topActionsRight}>
          <IconButton icon={liked ? 'heart' : 'heart-outline'} color={COLORS.danger} onPress={onLike} size={42} iconSize={20} />
          <IconButton icon="share-social-outline" onPress={onShare} size={42} iconSize={19} />
        </View>
      </View>

      {/* Note du restaurant (pas du plat) */}
      {rating > 0 ? (
        <View style={[styles.ratingPill, { top: topInset + 58 }]} pointerEvents="none">
          <Ionicons name="star" size={13} color={COLORS.star} />
          <Text style={styles.ratingPillValue}>{rating.toFixed(1).replace('.', ',')}</Text>
          {ratingCount > 0 ? <Text style={styles.ratingPillCount}>({formatCount(ratingCount)} avis)</Text> : null}
        </View>
      ) : null}

      {images.length > 1 ? (
        <View style={styles.counterPill} pointerEvents="none">
          <Ionicons name="images-outline" size={13} color={COLORS.white} />
          <Text style={styles.counterText}>{activeIndex + 1}/{images.length}</Text>
        </View>
      ) : null}
    </View>
  );
}

// ── Groupe d'options en cartes horizontales ──
function OptionGroupSelector({ group, selections, onSelect, showTitle }) {
  const isSingle = group.type === 'single';
  const groupItems = group.items || [];

  const handlePress = (optionItem) => {
    const current = selections[group.id] || [];
    const exists = current.find(o => o.id === optionItem.id);
    if (isSingle) {
      // Un choix facultatif peut être retiré en re-touchant l'option
      if (exists && !group.is_required) onSelect(group.id, []);
      else onSelect(group.id, [optionItem]);
    } else if (exists) {
      onSelect(group.id, current.filter(o => o.id !== optionItem.id));
    } else {
      if (group.max_selections && current.length >= group.max_selections) return;
      onSelect(group.id, [...current, optionItem]);
    }
  };

  const selectedIds = (selections[group.id] || []).map(o => o.id);
  const hint = isSingle ? 'Choisissez 1 option' : `Jusqu'à ${group.max_selections || groupItems.length} choix`;

  return (
    <View style={styles.optionGroup}>
      <View style={styles.optionHeader}>
        <View style={{ flex: 1 }}>
          {showTitle ? <Text style={styles.optionGroupTitle}>{clean(group.name)}</Text> : null}
          <Text style={TYPE.caption}>{hint}</Text>
        </View>
        {group.is_required ? (
          <Badge label="Obligatoire" color={COLORS.primaryDark} bg={COLORS.primarySoft} />
        ) : (
          <Badge label="Facultatif" color={COLORS.textMuted} bg={COLORS.divider} />
        )}
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.optionScroll}>
        {groupItems.map(opt => {
          const isSelected = selectedIds.includes(opt.id);
          const supplement = Number(opt.price_adjustment) || 0;
          return (
            <TouchableOpacity
              key={opt.id}
              style={[styles.optionCard, isSelected && styles.optionCardSelected]}
              onPress={() => handlePress(opt)}
              activeOpacity={0.85}
            >
              {opt.image ? (
                <SmartImage uri={opt.image} style={styles.optionImage} iconSize={22} />
              ) : (
                <View style={[styles.optionImage, styles.optionIconTile, isSelected && { backgroundColor: COLORS.white }]}>
                  <Ionicons name={optionIcon(opt.name)} size={26} color={COLORS.primary} />
                </View>
              )}
              <View style={[styles.optionCheck, isSelected && styles.optionCheckOn]}>
                {isSelected ? <Ionicons name="checkmark" size={13} color={COLORS.white} /> : null}
              </View>
              <Text style={[styles.optionName, isSelected && { fontFamily: FONTS.semibold }]} numberOfLines={2}>
                {clean(opt.name)}
              </Text>
              <Text style={styles.optionPrice}>{supplement > 0 ? `+ ${formatPrice(supplement)}` : 'Inclus'}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

// ── Carte « Vous aimerez aussi » ──
function SuggestionCard({ dish, liked, onLike, onPress, onAdd }) {
  const { price, effective, hasPromo } = pricing(dish);
  return (
    <TouchableOpacity style={styles.suggestCard} onPress={onPress} activeOpacity={0.9}>
      <SmartImage uri={dish.image} style={styles.suggestImage} iconSize={26}>
        <TouchableOpacity style={styles.suggestHeart} onPress={onLike} hitSlop={8} activeOpacity={0.8}>
          <Ionicons name={liked ? 'heart' : 'heart-outline'} size={15} color={liked ? COLORS.danger : COLORS.text} />
        </TouchableOpacity>
      </SmartImage>
      <View style={styles.suggestBody}>
        <Text style={styles.suggestName} numberOfLines={1}>{clean(dish.name)}</Text>
        <View style={styles.suggestFooter}>
          <View style={{ flex: 1 }}>
            {hasPromo ? <Text style={styles.suggestOld}>{formatPrice(price)}</Text> : null}
            <Text style={styles.suggestPrice} numberOfLines={1}>{formatPrice(effective)}</Text>
          </View>
          <Pressable onPress={onAdd} hitSlop={8} style={({ pressed }) => [styles.suggestAdd, pressed && { transform: [{ scale: 0.9 }] }]}>
            <Ionicons name="add" size={18} color={COLORS.white} />
          </Pressable>
        </View>
      </View>
    </TouchableOpacity>
  );
}

export default function ItemDetailScreen({ route, navigation }) {
  const menuDay = useMenuDay();
  const { item, restaurant } = route.params;
  const { addItem, items } = useCart();
  const { isFavorite, toggleFavorite } = useFavorites();
  const { location } = useDeliveryLocation() || {};
  const insets = useSafeAreaInsets();

  const toastAnim = useRef(new Animated.Value(0)).current;
  const toastTimer = useRef(null);
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  useEffect(() => () => clearTimeout(toastTimer.current), []);

  const [quantity, setQuantity] = useState(1);
  const [adding, setAdding] = useState(null); // 'cart' | 'order' | null
  const [suggestions, setSuggestions] = useState([]);
  const [selections, setSelections] = useState(() => {
    const defaults = {};
    (item.option_groups || []).forEach(group => {
      const defaultOpt = group.items?.find(o => o.is_default);
      if (defaultOpt) defaults[group.id] = [defaultOpt];
    });
    return defaults;
  });

  const liked = isFavorite('item', item.id);
  const onLike = async () => {
    const ok = await toggleFavorite('item', { ...item, restaurant: item.restaurant || restaurant });
    if (!ok) navigation.navigate('Auth', { screen: 'Login' });
  };
  const onLikeDish = async (dish) => {
    const ok = await toggleFavorite('item', { ...dish, restaurant: dish.restaurant || restaurant });
    if (!ok) navigation.navigate('Auth', { screen: 'Login' });
  };

  // « Vous aimerez aussi » : autres plats disponibles du même restaurant
  useEffect(() => {
    if (!restaurant?.id) return undefined;
    let alive = true;
    restaurantService.getMenu(restaurant.id)
      .then(data => {
        if (!alive) return;
        const all = (data?.menu || []).flatMap(c => (Array.isArray(c.items) ? c.items : []));
        setSuggestions(all.filter(d => d.id !== item.id && d.is_available !== false).slice(0, 8));
      })
      .catch(() => {});
    return () => { alive = false; };
  }, [restaurant?.id, item.id]);

  // Les prix peuvent arriver en chaîne depuis l'API : toujours comparer en nombres
  const basePrice = Number(item.price) || 0;
  const promoPrice = Number(item.discount_price) || 0;
  const hasPromo = promoPrice > 0 && promoPrice < basePrice;
  const unitPrice = hasPromo ? promoPrice : basePrice;
  const discountPercent = hasPromo ? Math.round(((basePrice - promoPrice) / basePrice) * 100) : 0;

  const optionsSupplement = Object.values(selections).flat().reduce(
    (sum, opt) => sum + Number(opt.price_adjustment || 0), 0
  );
  const totalUnitPrice = unitPrice + optionsSupplement;
  const totalPrice = totalUnitPrice * quantity;

  const allImages = getAllImages(item);
  const optionGroups = (item.option_groups || []).filter(g => (g.items || []).length > 0);
  const inCart = items.find(i => i.id === item.id);
  const inCartQty = inCart?.quantity || 0;

  const itemName = clean(item.name);
  const description = clean(item.description);
  const isAvailable = isDishOrderableToday(item, menuDay);
  const hint = availabilityHint(description);
  const availabilityLabel = isAvailable ? (hint && !/indisponib/i.test(hint) ? hint : 'Disponible') : isDishServedToday(item, menuDay) ? 'Indisponible' : `Pas au menu ce ${menuDay.label}`;

  // Restaurant
  const restoRating = Number(restaurant?.rating) || 0;
  const restoRatingCount = Number(restaurant?.ratings_count || restaurant?.reviews_count) || 0;
  const restoOpen = restaurant?.is_open == null ? null : !!restaurant.is_open;
  const restoTime = restaurant ? deliveryTime(restaurant) : null;
  const restoFee = restaurant && restaurant.delivery_fee != null
    ? (Number(restaurant.delivery_fee) > 0 ? formatPrice(restaurant.delivery_fee) : 'Livraison offerte')
    : null;
  const km = restaurant?.latitude && restaurant?.longitude
    ? distanceKm(location, { latitude: Number(restaurant.latitude), longitude: Number(restaurant.longitude) })
    : null;

  // Tuiles d'infos : uniquement des données réelles
  const tiles = [];
  if (item.preparation_time) tiles.push({ icon: 'timer-outline', title: `${item.preparation_time} min`, sub: 'Préparation' });
  if (item.is_spicy) tiles.push({ icon: 'flame-outline', title: 'Épicé', sub: 'Relevé' });
  if (item.is_vegetarian) tiles.push({ icon: 'leaf-outline', title: 'Végétarien', sub: 'Sans viande' });
  if (item.calories) tiles.push({ icon: 'nutrition-outline', title: `${item.calories} kcal`, sub: 'Énergie' });
  if (tiles.length < 4) {
    tiles.push(isAvailable
      ? { icon: 'checkmark-circle-outline', title: 'Disponible', sub: 'Statut', color: COLORS.success }
      : { icon: 'close-circle-outline', title: 'Indisponible', sub: 'Statut', color: COLORS.danger });
  }

  const showToast = (msg) => {
    setToastMessage(msg);
    clearTimeout(toastTimer.current);
    setToastVisible(true);
    Animated.spring(toastAnim, { toValue: 1, useNativeDriver: true, friction: 8 }).start();
    toastTimer.current = setTimeout(() => {
      Animated.timing(toastAnim, { toValue: 0, duration: 220, useNativeDriver: true })
        .start(() => setToastVisible(false));
    }, 1800);
  };

  const handleSelect = (groupId, opts) => {
    setSelections(prev => ({ ...prev, [groupId]: opts }));
  };

  const handleShare = () => {
    Share.share({
      message: `${itemName} — ${formatPrice(unitPrice)}${restaurant?.name ? ` chez ${restaurant.name}` : ''} sur Estuaire Eat`,
    }).catch(() => {});
  };

  const goToRestaurant = () => restaurant && navigation.navigate('Restaurant', { restaurant });

  // Panier invité : aucune connexion exigée ici, elle est demandée au paiement.
  // mode 'cart' : ajoute et confirme ; mode 'order' : ajoute puis ouvre le panier.
  const handleAdd = async (mode = 'cart') => {
    if (!isAvailable || adding) return;
    for (const group of optionGroups) {
      if (group.is_required && (!selections[group.id] || selections[group.id].length === 0)) {
        Alert.alert('Option requise', `Veuillez choisir : ${clean(group.name)}`);
        return;
      }
    }
    const selectedOptions = {};
    Object.entries(selections).forEach(([groupId, opts]) => {
      const group = optionGroups.find(g => String(g.id) === String(groupId));
      if (group && opts.length > 0) {
        selectedOptions[group.name] = opts.map(o => ({
          id: o.id, name: o.name,
          price_adjustment: Number(o.price_adjustment || 0),
        }));
      }
    });

    setAdding(mode);
    let added = true;
    try {
      // addItem demande confirmation si le panier contient un autre restaurant
      added = await addItem(
        { ...item, effective_price: totalUnitPrice, selected_options: selectedOptions },
        quantity,
        restaurant
      );
    } finally {
      setAdding(null);
    }
    if (added === false) return;

    if (mode === 'order') navigation.navigate('Main', { screen: 'Panier' });
    else showToast(`${quantity}× ${itemName} ajouté au panier`);
  };

  // Ajout rapide depuis « Vous aimerez aussi »
  const openDish = (dish) => navigation.push('ItemDetail', { item: dish, restaurant });
  const quickAdd = async (dish) => {
    if ((dish.option_groups || []).some(g => g.is_required)) { openDish(dish); return; }
    const added = await addItem({ ...dish, effective_price: pricing(dish).effective }, 1, restaurant);
    if (added !== false) showToast(`${clean(dish.name)} ajouté au panier`);
  };

  return (
    <View style={styles.container}>
      <StatusBar
        barStyle={allImages.length > 0 ? 'light-content' : 'dark-content'}
        backgroundColor="transparent"
        translucent
      />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 28 }}
      >
        <ImageCarousel
          images={allImages}
          fallbackSource={dishFallbackImage(item)}
          onBack={() => navigation.goBack()}
          liked={liked}
          onLike={onLike}
          onShare={handleShare}
          topInset={insets.top}
          rating={restoRating}
          ratingCount={restoRatingCount}
        />

        {/* ── Fiche blanche qui chevauche la photo ── */}
        <View style={styles.sheet}>
          {/* Restaurant */}
          {restaurant ? (
            <TouchableOpacity style={styles.restaurantRow} onPress={goToRestaurant} activeOpacity={0.85}>
              <View style={styles.logoWrap}>
                <SmartImage uri={restaurant.logo} style={styles.logo} fallbackIcon="storefront-outline" iconSize={26} />
              </View>
              <View style={{ flex: 1 }}>
                <View style={styles.restoTop}>
                  <Text style={styles.restoName} numberOfLines={1}>{clean(restaurant.name)}</Text>
                  {restoOpen != null ? (
                    <View style={[styles.openPill, { backgroundColor: restoOpen ? COLORS.successSoft : COLORS.dangerSoft }]}>
                      <View style={[styles.openDot, { backgroundColor: restoOpen ? COLORS.success : COLORS.danger }]} />
                      <Text style={[styles.openText, { color: restoOpen ? COLORS.success : COLORS.danger }]}>
                        {restoOpen ? 'Ouvert' : 'Fermé'}
                      </Text>
                    </View>
                  ) : null}
                </View>
                <Text style={styles.restoCuisine} numberOfLines={1}>
                  {clean(restaurant.category?.name) || 'Restaurant'}
                </Text>
                <View style={styles.restoMeta}>
                  {restoTime ? (
                    <View style={styles.metaItem}>
                      <Ionicons name="time-outline" size={14} color={COLORS.text} />
                      <Text style={styles.metaText}>{restoTime}</Text>
                    </View>
                  ) : null}
                  {restoFee ? (
                    <View style={styles.metaItem}>
                      <Ionicons name="bicycle-outline" size={14} color={COLORS.text} />
                      <Text style={styles.metaText}>{restoFee}</Text>
                    </View>
                  ) : null}
                  {km != null ? (
                    <View style={styles.metaItem}>
                      <Ionicons name="location-outline" size={14} color={COLORS.text} />
                      <Text style={styles.metaText}>À {formatKm(km)}</Text>
                    </View>
                  ) : null}
                </View>
              </View>
            </TouchableOpacity>
          ) : null}

          {/* Titre + disponibilité */}
          <Text style={styles.itemName}>{itemName}</Text>
          <View style={styles.availabilityRow}>
            <Badge
              label={availabilityLabel}
              icon={isAvailable ? 'checkmark-circle' : 'close-circle'}
              color={isAvailable ? COLORS.success : COLORS.danger}
              bg={isAvailable ? COLORS.successSoft : COLORS.dangerSoft}
            />
            {inCartQty > 0 ? (
              <Badge label={`Déjà ${inCartQty} au panier`} icon="cart" color={COLORS.primary} bg={COLORS.primarySoft} />
            ) : null}
          </View>

          {description ? <Text style={styles.description}>{description}</Text> : null}

          {/* Prix */}
          <View style={styles.priceRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.price}>{formatPrice(unitPrice)}</Text>
              {hasPromo ? (
                <View style={styles.oldRow}>
                  <Text style={styles.oldPrice}>{formatPrice(basePrice)}</Text>
                  <Badge label={`-${discountPercent}%`} color={COLORS.white} bg={COLORS.success} />
                </View>
              ) : null}
            </View>
            {item.is_featured ? (
              <View style={styles.popularPill}>
                <Ionicons name="flame" size={16} color={COLORS.primary} />
                <Text style={styles.popularText}>Plat populaire</Text>
              </View>
            ) : null}
          </View>

          {/* Tuiles d'infos (données réelles uniquement) */}
          {tiles.length > 0 ? (
            <View style={styles.tiles}>
              {tiles.slice(0, 4).map((t, i) => (
                <React.Fragment key={t.title}>
                  {i > 0 ? <View style={styles.tileDivider} /> : null}
                  <View style={styles.tile}>
                    <Ionicons name={t.icon} size={22} color={t.color || COLORS.text} />
                    <Text style={[styles.tileTitle, t.color && { color: t.color }]} numberOfLines={1}>{t.title}</Text>
                    <Text style={styles.tileSub} numberOfLines={1}>{t.sub}</Text>
                  </View>
                </React.Fragment>
              ))}
            </View>
          ) : null}

          {/* Options */}
          {optionGroups.length > 0 ? (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Ionicons name="restaurant" size={18} color={COLORS.primary} />
                <Text style={styles.sectionTitle}>Choisissez vos options</Text>
              </View>
              {optionGroups.map(group => (
                <OptionGroupSelector
                  key={group.id}
                  group={group}
                  selections={selections}
                  onSelect={handleSelect}
                  showTitle={optionGroups.length > 1}
                />
              ))}
            </View>
          ) : null}

          {/* Quantité + ajout */}
          <View style={styles.addRow}>
            <View style={styles.stepperWrap}>
              <QuantityStepper value={quantity} onChange={setQuantity} />
            </View>
            <TouchableOpacity
              style={[styles.addMain, (!isAvailable || adding) && { opacity: 0.6 }]}
              onPress={() => handleAdd('cart')}
              disabled={!isAvailable || !!adding}
              activeOpacity={0.88}
            >
              <LinearGradient colors={GRADIENTS.primary} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.addMainInner}>
                <Ionicons name={isAvailable ? 'cart-outline' : 'close-circle-outline'} size={26} color={COLORS.white} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.addMainTitle} numberOfLines={1}>
                    {!isAvailable ? 'Indisponible' : adding === 'cart' ? 'Ajout…' : 'Ajouter au panier'}
                  </Text>
                  <Text style={styles.addMainSub} numberOfLines={1}>{formatPrice(totalPrice)}</Text>
                </View>
              </LinearGradient>
            </TouchableOpacity>
          </View>
          {isAvailable ? (
            <TouchableOpacity
              style={styles.orderBtn}
              onPress={() => handleAdd('order')}
              disabled={!!adding}
              activeOpacity={0.85}
            >
              <Ionicons name="flash-outline" size={17} color={COLORS.primary} />
              <Text style={styles.orderBtnText}>{adding === 'order' ? 'Un instant…' : 'Commander maintenant'}</Text>
            </TouchableOpacity>
          ) : null}
        </View>

        {/* ── Vous aimerez aussi ── */}
        {suggestions.length > 0 ? (
          <View style={styles.suggestSection}>
            <View style={[styles.sectionHeader, { paddingHorizontal: SCREEN_PADDING }]}>
              <Ionicons name="sparkles" size={18} color={COLORS.primary} />
              <Text style={[styles.sectionTitle, { flex: 1 }]}>Vous aimerez aussi</Text>
              {restaurant ? (
                <TouchableOpacity style={styles.seeAll} onPress={goToRestaurant} hitSlop={8}>
                  <Text style={styles.seeAllText}>Voir tout</Text>
                  <Ionicons name="arrow-forward" size={14} color={COLORS.primary} />
                </TouchableOpacity>
              ) : null}
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.suggestScroll}>
              {suggestions.map(dish => (
                <SuggestionCard
                  key={dish.id}
                  dish={dish}
                  liked={isFavorite('item', dish.id)}
                  onLike={() => onLikeDish(dish)}
                  onPress={() => openDish(dish)}
                  onAdd={() => quickAdd(dish)}
                />
              ))}
            </ScrollView>
          </View>
        ) : null}
      </ScrollView>

      {/* ── Confirmation d'ajout ── */}
      <Animated.View
        pointerEvents={toastVisible ? 'box-none' : 'none'}
        style={[
          styles.toast,
          { bottom: insets.bottom + 20 },
          {
            opacity: toastAnim,
            transform: [{ translateY: toastAnim.interpolate({ inputRange: [0, 1], outputRange: [16, 0] }) }],
          },
        ]}
      >
        <Ionicons name="checkmark-circle" size={18} color={COLORS.success} />
        <Text style={styles.toastText} numberOfLines={1}>{toastMessage}</Text>
        <TouchableOpacity onPress={() => navigation.navigate('Main', { screen: 'Panier' })} hitSlop={8}>
          <Text style={styles.toastLink}>Voir</Text>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },

  // ── Photo ──
  imageContainer: { height: HEADER_H, backgroundColor: COLORS.surfaceAlt },
  carouselImage: { width, height: HEADER_H },
  topOverlay: { position: 'absolute', top: 0, left: 0, right: 0, height: 120 },
  topActions: {
    position: 'absolute', left: SCREEN_PADDING, right: SCREEN_PADDING,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  topActionsRight: { flexDirection: 'row', gap: 10 },
  ratingPill: {
    position: 'absolute', left: SCREEN_PADDING,
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: 'rgba(20,20,31,0.6)', borderRadius: RADIUS.pill,
    paddingHorizontal: 10, paddingVertical: 4,
  },
  ratingPillValue: { fontFamily: FONTS.semibold, fontSize: 13, color: COLORS.white },
  ratingPillCount: { fontFamily: FONTS.regular, fontSize: 10, color: 'rgba(255,255,255,0.85)' },
  counterPill: {
    position: 'absolute', right: SCREEN_PADDING, bottom: SHEET_OVERLAP + 12,
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: 'rgba(20,20,31,0.6)', borderRadius: RADIUS.pill,
    paddingHorizontal: 10, paddingVertical: 5,
  },
  counterText: { fontFamily: FONTS.medium, fontSize: 12, color: COLORS.white },

  // ── Fiche ──
  sheet: {
    marginTop: -SHEET_OVERLAP,
    backgroundColor: COLORS.bg,
    borderTopLeftRadius: 36, borderTopRightRadius: 36,
    paddingHorizontal: SCREEN_PADDING, paddingTop: 16,
  },

  restaurantRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 14 },
  logoWrap: { marginTop: -40 },
  logo: { width: 76, height: 76, borderRadius: 38, borderWidth: 3, borderColor: COLORS.surface, ...SHADOWS.md },
  verified: {
    position: 'absolute', right: 2, bottom: 2,
    width: 22, height: 22, borderRadius: 11, backgroundColor: COLORS.primary,
    alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: COLORS.surface,
  },
  restoTop: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  restoName: { flex: 1, fontFamily: FONTS.bold, fontSize: 18, lineHeight: 24, color: COLORS.text },
  restoCuisine: { fontFamily: FONTS.regular, fontSize: 12, color: COLORS.textMuted },
  openPill: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    height: 28, paddingHorizontal: 10, borderRadius: RADIUS.pill,
  },
  openDot: { width: 7, height: 7, borderRadius: 4 },
  openText: { fontFamily: FONTS.semibold, fontSize: 12 },
  restoMeta: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginTop: 4 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { fontFamily: FONTS.medium, fontSize: 12, color: COLORS.text },

  itemName: { fontFamily: FONTS.bold, fontSize: 26, lineHeight: 33, color: COLORS.text },
  availabilityRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
  description: { ...TYPE.bodyMuted, marginTop: 10 },

  priceRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 14 },
  price: { fontFamily: FONTS.extrabold, fontSize: 28, lineHeight: 36, color: COLORS.primary },
  oldRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  oldPrice: { fontFamily: FONTS.regular, fontSize: 14, color: COLORS.textLight, textDecorationLine: 'line-through' },
  popularPill: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: COLORS.primaryLight, borderRadius: RADIUS.pill, paddingHorizontal: 14, height: 36,
  },
  popularText: { fontFamily: FONTS.semibold, fontSize: 13, color: COLORS.primaryDark },

  tiles: {
    flexDirection: 'row', alignItems: 'center', marginTop: 16,
    backgroundColor: COLORS.surface, borderRadius: RADIUS.lg, paddingVertical: 12, ...SHADOWS.sm,
  },
  tile: { flex: 1, alignItems: 'center', paddingHorizontal: 4 },
  tileDivider: { width: 1, height: 40, backgroundColor: COLORS.divider },
  tileTitle: { fontFamily: FONTS.semibold, fontSize: 12, lineHeight: 16, color: COLORS.text, marginTop: 4 },
  tileSub: { fontFamily: FONTS.regular, fontSize: 10, lineHeight: 14, color: COLORS.textMuted },

  section: { marginTop: 22 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  sectionTitle: { fontFamily: FONTS.bold, fontSize: 17, lineHeight: 24, color: COLORS.text },

  // ── Options ──
  optionGroup: { marginBottom: 12 },
  optionHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  optionGroupTitle: { fontFamily: FONTS.semibold, fontSize: 15, lineHeight: 21, color: COLORS.text },
  optionScroll: { gap: 10, paddingRight: SCREEN_PADDING, paddingVertical: 4 },
  optionCard: {
    width: OPTION_W, padding: 10, alignItems: 'center',
    backgroundColor: COLORS.surface, borderRadius: RADIUS.lg,
    borderWidth: 1.5, borderColor: COLORS.border, ...SHADOWS.sm,
  },
  optionCardSelected: { borderColor: COLORS.primary, backgroundColor: COLORS.primarySoft },
  optionImage: { width: '100%', height: 64, borderRadius: RADIUS.md },
  optionIconTile: { backgroundColor: COLORS.surfaceAlt, alignItems: 'center', justifyContent: 'center' },
  optionCheck: {
    position: 'absolute', top: 6, right: 6,
    width: 22, height: 22, borderRadius: 11,
    borderWidth: 1.5, borderColor: COLORS.textLight, backgroundColor: COLORS.surface,
    alignItems: 'center', justifyContent: 'center',
  },
  optionCheckOn: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  optionName: {
    fontFamily: FONTS.medium, fontSize: 12, lineHeight: 16, color: COLORS.text,
    textAlign: 'center', marginTop: 8, minHeight: 32,
  },
  optionPrice: { fontFamily: FONTS.semibold, fontSize: 12, color: COLORS.primary, marginTop: 2 },

  // ── Ajout ──
  addRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 18 },
  stepperWrap: {
    backgroundColor: COLORS.surface, borderRadius: RADIUS.pill,
    paddingHorizontal: 8, paddingVertical: 8, ...SHADOWS.sm,
  },
  addMain: { flex: 1, borderRadius: RADIUS.pill, ...SHADOWS.primary },
  addMainInner: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    height: 60, borderRadius: RADIUS.pill, paddingHorizontal: 18,
  },
  addMainTitle: { fontFamily: FONTS.semibold, fontSize: 15, lineHeight: 20, color: COLORS.white },
  addMainSub: { fontFamily: FONTS.bold, fontSize: 14, lineHeight: 19, color: COLORS.white },
  orderBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    height: 46, marginTop: 10, borderRadius: RADIUS.pill,
    borderWidth: 1.5, borderColor: COLORS.primary, backgroundColor: COLORS.surface,
  },
  orderBtnText: { fontFamily: FONTS.semibold, fontSize: 14, color: COLORS.primary },

  // ── Suggestions ──
  suggestSection: { marginTop: 26 },
  seeAll: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  seeAllText: { fontFamily: FONTS.semibold, fontSize: 13, color: COLORS.primary },
  suggestScroll: { paddingHorizontal: SCREEN_PADDING, gap: 12, paddingBottom: 8 },
  suggestCard: { width: SUGGEST_W, backgroundColor: COLORS.surface, borderRadius: RADIUS.lg, ...SHADOWS.md },
  suggestImage: {
    width: '100%', height: 100,
    borderTopLeftRadius: RADIUS.lg, borderTopRightRadius: RADIUS.lg,
  },
  suggestHeart: {
    position: 'absolute', top: 6, right: 6,
    width: 26, height: 26, borderRadius: 13, backgroundColor: COLORS.white,
    alignItems: 'center', justifyContent: 'center', ...SHADOWS.sm,
  },
  suggestBody: { padding: 10 },
  suggestName: { fontFamily: FONTS.semibold, fontSize: 13, lineHeight: 18, color: COLORS.text },
  suggestFooter: { flexDirection: 'row', alignItems: 'flex-end', marginTop: 6, gap: 6 },
  suggestOld: { fontFamily: FONTS.regular, fontSize: 10, color: COLORS.textLight, textDecorationLine: 'line-through' },
  suggestPrice: { fontFamily: FONTS.bold, fontSize: 13, lineHeight: 18, color: COLORS.primary },
  suggestAdd: {
    width: 30, height: 30, borderRadius: 15, backgroundColor: COLORS.primary,
    alignItems: 'center', justifyContent: 'center', ...SHADOWS.primary,
  },

  // ── Toast ──
  toast: {
    position: 'absolute', alignSelf: 'center', maxWidth: width - SCREEN_PADDING * 2,
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: COLORS.dark, borderRadius: RADIUS.pill, paddingHorizontal: 16, paddingVertical: 10,
    ...SHADOWS.md,
  },
  toastText: { fontFamily: FONTS.medium, fontSize: 13, color: COLORS.white, flexShrink: 1 },
  toastLink: { fontFamily: FONTS.semibold, fontSize: 13, color: COLORS.secondary },
});
