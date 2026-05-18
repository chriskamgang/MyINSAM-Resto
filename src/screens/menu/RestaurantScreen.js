import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ScrollView, RefreshControl, ActivityIndicator, Image,
  SafeAreaView, Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { restaurantService } from '../../services/restaurantService';
import { getImageUrl } from '../../services/api';
import { useCart } from '../../context/CartContext';
import { useAuth } from '../../context/AuthContext';

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

function MenuItemCard({ item, onPress, onAdd }) {
  const hasPromo = item.discount_price && item.discount_price < item.price;
  const price = hasPromo ? item.discount_price : item.price;
  const discountPercent = hasPromo ? Math.round(((item.price - item.discount_price) / item.price) * 100) : 0;
  const imageUrl = getImageUrl(item.image);
  const [imgError, setImgError] = React.useState(false);

  return (
    <TouchableOpacity style={styles.itemCard} onPress={() => onPress(item)} activeOpacity={0.85}>
      <View style={styles.itemImageBox}>
        {imageUrl && !imgError ? (
          <Image source={{ uri: imageUrl }} style={styles.itemImage} resizeMode="cover" onError={() => setImgError(true)} />
        ) : (
          <View style={styles.itemPlaceholder}>
            <Ionicons name="restaurant-outline" size={40} color={COLORS.lightGray} style={{ opacity: 0.3 }} />
          </View>
        )}
        {hasPromo && (
          <View style={styles.promoBadge}>
            <Text style={styles.promoText}>-{discountPercent}%</Text>
          </View>
        )}
      </View>

      <View style={styles.itemInfo}>
        <View style={styles.itemHeader}>
          <Text style={styles.itemName} numberOfLines={1}>{item.name}</Text>
          <View style={styles.badgeRow}>
            {item.is_spicy && <View style={styles.spicyBadge}><Ionicons name="flame" size={14} color="#F59E0B" /></View>}
            {item.is_vegetarian && <View style={styles.vegBadge}><Ionicons name="leaf" size={14} color="#10B981" /></View>}
          </View>
        </View>

        {item.description ? (
          <Text style={styles.itemDesc} numberOfLines={2}>{item.description}</Text>
        ) : null}

        <View style={styles.itemFooter}>
          <View>
            <Text style={styles.itemPrice}>{Number(price).toLocaleString('fr-FR')} XAF</Text>
            {hasPromo && (
              <Text style={styles.itemOriginalPrice}>{Number(item.price).toLocaleString('fr-FR')} XAF</Text>
            )}
          </View>
          <TouchableOpacity style={styles.addBtn} onPress={() => onAdd(item)} activeOpacity={0.8}>
            <Text style={styles.addBtnText}>+</Text>
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );
}

export default function RestaurantScreen({ route, navigation }) {
  const { restaurant: routeRestaurant } = route.params;
  const { addItem, totalItems, restaurant: cartRestaurant } = useCart();
  const { user } = useAuth();

  const [restaurant, setRestaurant] = useState(routeRestaurant);
  const [categories, setCategories] = useState([]);
  const [activeCategory, setActiveCategory] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadMenu = useCallback(async () => {
    try {
      const data = await restaurantService.getMenu(routeRestaurant.id);
      if (data.restaurant) setRestaurant(data.restaurant);
      setCategories(data.menu || []);
      if (data.menu?.length > 0 && !activeCategory) setActiveCategory(data.menu[0].id);
    } catch (e) {
      console.error('Erreur chargement menu:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [routeRestaurant.id]);

  useEffect(() => { loadMenu(); }, []);

  const onRefresh = () => { setRefreshing(true); loadMenu(); };

  const filteredCategories = categories.filter(cat => cat.id === activeCategory);

  const coverUrl = getImageUrl(restaurant.cover_image || restaurant.logo);
  const [coverError, setCoverError] = useState(false);

  const handleAdd = (item) => {
    if (!user) {
      navigation.navigate('Auth', { screen: 'Login' });
      return;
    }
    addItem(
      { ...item, effective_price: item.discount_price || item.price },
      1,
      restaurant
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* ── Header fixe ── */}
      <View style={styles.headerBar}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={22} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>{restaurant.name}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
      >
        {/* ── Hero image ── */}
        <View style={styles.heroImageBox}>
          {coverUrl && !coverError ? (
            <Image source={{ uri: coverUrl }} style={styles.heroImage} resizeMode="cover" onError={() => setCoverError(true)} />
          ) : (
            <View style={[styles.heroImage, styles.heroPlaceholder]}>
              <Ionicons name="restaurant" size={60} color={COLORS.lightGray} />
            </View>
          )}
        </View>

        {/* ── Infos restaurant ── */}
        <View style={styles.restaurantInfo}>
          <Text style={styles.restaurantName}>{restaurant.name}</Text>
          {restaurant.description ? (
            <Text style={styles.restaurantDesc}>{restaurant.description}</Text>
          ) : null}

          <View style={styles.infoChips}>
            {restaurant.rating > 0 && (
              <View style={styles.chip}>
                <Ionicons name="star" size={14} color={COLORS.orange} />
                <Text style={styles.chipText}>{Number(restaurant.rating).toFixed(1)}</Text>
              </View>
            )}
            <View style={styles.chip}>
              <Ionicons name="time-outline" size={14} color={COLORS.text} />
              <Text style={styles.chipText}>{restaurant.delivery_time_min || 20}-{restaurant.delivery_time_max || 40} min</Text>
            </View>
            <View style={styles.chip}>
              <Ionicons name="bicycle-outline" size={14} color={COLORS.text} />
              <Text style={styles.chipText}>
                {restaurant.delivery_fee === 0 ? 'Gratuit' : `${Number(restaurant.delivery_fee).toLocaleString('fr-FR')} XAF`}
              </Text>
            </View>
            <View style={[styles.chip, { backgroundColor: '#ECFDF5' }]}>
              <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: COLORS.success }} />
              <Text style={[styles.chipText, { color: COLORS.success }]}>Ouvert</Text>
            </View>
          </View>
        </View>

        {/* ── Loading ── */}
        {loading ? (
          <View style={{ paddingVertical: 40 }}>
            <ActivityIndicator size="large" color={COLORS.primary} />
          </View>
        ) : (
          <>
            {/* ── Tabs catégories ── */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.catScroll}
              contentContainerStyle={styles.catScrollContent}
            >
              {categories.map(cat => {
                const isActive = activeCategory === cat.id;
                return (
                  <TouchableOpacity
                    key={cat.id}
                    style={[styles.catTab, isActive && styles.catTabActive]}
                    onPress={() => setActiveCategory(cat.id)}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.catTabText, isActive && styles.catTabTextActive]}>
                      {cat.name}
                    </Text>
                    {isActive && <View style={styles.catTabDot} />}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {/* ── Liste des plats ── */}
            <View style={styles.menuContent}>
              {filteredCategories.map(cat => (
                <View key={cat.id} style={styles.categorySection}>
                  <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>{cat.name}</Text>
                    <Text style={styles.sectionCount}>
                      {cat.items?.length || 0} {cat.items?.length > 1 ? 'plats' : 'plat'}
                    </Text>
                  </View>
                  {(cat.items || []).map(item => (
                    <MenuItemCard
                      key={item.id}
                      item={item}
                      onPress={item => navigation.navigate('ItemDetail', { item, restaurant })}
                      onAdd={handleAdd}
                    />
                  ))}
                </View>
              ))}
            </View>
          </>
        )}

        <View style={{ height: 120 }} />
      </ScrollView>

      {/* ── Bouton panier flottant ── */}
      {totalItems > 0 && cartRestaurant?.id === restaurant.id && (
        <View style={styles.floatingCartBar}>
          <TouchableOpacity
            style={styles.floatingCartBtn}
            onPress={() => navigation.navigate('Main', { screen: 'Panier' })}
            activeOpacity={0.9}
          >
            <View style={styles.floatingCartLeft}>
              <View style={styles.floatingCartBadge}>
                <Text style={styles.floatingCartBadgeText}>{totalItems}</Text>
              </View>
              <Text style={styles.floatingCartText}>Voir le panier</Text>
            </View>
            <Ionicons name="arrow-forward" size={20} color="#fff" />
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },

  // ── Header bar ──
  headerBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12,
    backgroundColor: COLORS.card,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  backBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { flex: 1, fontSize: 17, fontWeight: '700', color: COLORS.text, textAlign: 'center' },

  // ── Hero ──
  heroImageBox: { width: '100%', height: 200 },
  heroImage: { width: '100%', height: '100%' },
  heroPlaceholder: { backgroundColor: '#F3F4F6', justifyContent: 'center', alignItems: 'center' },

  // ── Restaurant info ──
  restaurantInfo: {
    backgroundColor: COLORS.card,
    paddingHorizontal: 20, paddingVertical: 16,
    borderBottomLeftRadius: 24, borderBottomRightRadius: 24,
    marginBottom: 8,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04, shadowRadius: 8, elevation: 2,
  },
  restaurantName: { fontSize: 24, fontWeight: '800', color: COLORS.text, marginBottom: 6 },
  restaurantDesc: { fontSize: 14, color: COLORS.gray, lineHeight: 20, marginBottom: 12 },
  infoChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: COLORS.bg, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12,
  },
  chipText: { fontSize: 12, fontWeight: '600', color: COLORS.text },

  // ── Categories tabs ──
  catScroll: { marginTop: 8, marginBottom: 16 },
  catScrollContent: { paddingHorizontal: 20, gap: 10 },
  catTab: {
    paddingHorizontal: 20, paddingVertical: 10, borderRadius: 24,
    backgroundColor: COLORS.card, borderWidth: 1.5, borderColor: COLORS.border,
    flexDirection: 'row', alignItems: 'center', gap: 6,
  },
  catTabActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  catTabText: { fontSize: 14, fontWeight: '600', color: COLORS.gray },
  catTabTextActive: { color: '#fff', fontWeight: '700' },
  catTabDot: { width: 5, height: 5, borderRadius: 2.5, backgroundColor: '#fff' },

  // ── Menu content ──
  menuContent: { paddingHorizontal: 20 },
  categorySection: { marginBottom: 24 },
  sectionHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14,
  },
  sectionTitle: { fontSize: 20, fontWeight: '800', color: COLORS.text },
  sectionCount: { fontSize: 13, fontWeight: '600', color: COLORS.lightGray },

  // ── Item card ──
  itemCard: {
    backgroundColor: COLORS.card, borderRadius: 20, marginBottom: 14, overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08, shadowRadius: 10, elevation: 3,
  },
  itemImageBox: { width: '100%', height: 140, position: 'relative' },
  itemImage: { width: '100%', height: '100%' },
  itemPlaceholder: {
    width: '100%', height: '100%',
    backgroundColor: COLORS.bg, justifyContent: 'center', alignItems: 'center',
  },
  promoBadge: {
    position: 'absolute', top: 10, left: 10,
    backgroundColor: '#EF4444', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8,
  },
  promoText: { color: '#fff', fontSize: 12, fontWeight: '800' },
  itemInfo: { padding: 14 },
  itemHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 },
  itemName: { flex: 1, fontSize: 16, fontWeight: '700', color: COLORS.text },
  badgeRow: { flexDirection: 'row', gap: 4, marginLeft: 8 },
  spicyBadge: { backgroundColor: '#FEF3C7', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  vegBadge: { backgroundColor: '#D1FAE5', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  itemDesc: { fontSize: 13, color: COLORS.gray, lineHeight: 18, marginBottom: 10 },
  itemFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  itemPrice: { fontSize: 17, fontWeight: '800', color: COLORS.primary },
  itemOriginalPrice: { fontSize: 12, color: COLORS.lightGray, textDecorationLine: 'line-through' },
  addBtn: {
    backgroundColor: COLORS.primary, width: 40, height: 40, borderRadius: 20,
    justifyContent: 'center', alignItems: 'center',
    shadowColor: COLORS.primary, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35, shadowRadius: 8, elevation: 6,
  },
  addBtnText: { color: '#fff', fontSize: 24, fontWeight: '700', lineHeight: 28 },

  // ── Floating cart ──
  floatingCartBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    paddingHorizontal: 20, paddingVertical: 12,
    paddingBottom: 24,
  },
  floatingCartBtn: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: COLORS.primary, borderRadius: 18,
    paddingVertical: 16, paddingHorizontal: 20,
    shadowColor: COLORS.primary, shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4, shadowRadius: 12, elevation: 8,
  },
  floatingCartLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  floatingCartBadge: {
    backgroundColor: 'rgba(255,255,255,0.25)',
    borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4,
  },
  floatingCartBadgeText: { color: '#fff', fontSize: 13, fontWeight: '800' },
  floatingCartText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
