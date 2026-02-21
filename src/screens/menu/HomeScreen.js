import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ScrollView, RefreshControl, ActivityIndicator, Image,
  SafeAreaView, TextInput, Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { menuService } from '../../services/menuService';
import { useCart } from '../../context/CartContext';
import { useAuth } from '../../context/AuthContext';

const { width } = Dimensions.get('window');
const COLORS = {
  primary:   '#FF6B35',
  secondary: '#FF8E53',
  bg:        '#F9FAFB',
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
  const price    = hasPromo ? item.discount_price : item.price;
  const discountPercent = hasPromo ? Math.round(((item.price - item.discount_price) / item.price) * 100) : 0;

  return (
    <TouchableOpacity style={styles.itemCard} onPress={() => onPress(item)} activeOpacity={0.85}>
      {/* Image section */}
      <View style={styles.itemImageBox}>
        {item.image ? (
          <Image source={{ uri: item.image }} style={styles.itemImage} resizeMode="cover" />
        ) : (
          <View style={styles.itemPlaceholder}>
            <Text style={styles.placeholderIcon}>🍽️</Text>
          </View>
        )}
        {/* Badge promo */}
        {hasPromo && (
          <View style={styles.promoBadge}>
            <Text style={styles.promoText}>-{discountPercent}%</Text>
          </View>
        )}
      </View>

      {/* Info section */}
      <View style={styles.itemInfo}>
        <View style={styles.itemHeader}>
          <Text style={styles.itemName} numberOfLines={1}>{item.name}</Text>
          {/* Badges spicy/vegetarian */}
          <View style={styles.badgeRow}>
            {item.is_spicy && <View style={styles.spicyBadge}><Text style={styles.badgeEmoji}>🌶️</Text></View>}
            {item.is_vegetarian && <View style={styles.vegBadge}><Text style={styles.badgeEmoji}>🥗</Text></View>}
          </View>
        </View>

        {item.description ? (
          <Text style={styles.itemDesc} numberOfLines={2}>{item.description}</Text>
        ) : null}

        {/* Footer: prix + bouton */}
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

export default function HomeScreen({ navigation }) {
  const { user }               = useAuth();
  const { addItem, totalItems } = useCart();
  const [restaurant, setRestaurant] = useState(null);
  const [categories,  setCategories] = useState([]);
  const [activeCategory, setActiveCategory] = useState(null);
  const [loading,    setLoading]   = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search,     setSearch]    = useState('');

  const loadMenu = useCallback(async () => {
    try {
      const data = await menuService.getMenu();
      setRestaurant(data.restaurant);
      setCategories(data.menu || []);
      if (data.menu?.length > 0) setActiveCategory(data.menu[0].id);
    } catch (e) {
      console.error('Erreur chargement menu:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { loadMenu(); }, []);

  const onRefresh = () => { setRefreshing(true); loadMenu(); };

  const filteredCategories = search.length > 0
    ? categories.map(cat => ({
        ...cat,
        items: (cat.items || []).filter(item =>
          item.name.toLowerCase().includes(search.toLowerCase())
        ),
      })).filter(cat => cat.items.length > 0)
    : categories.filter(cat => cat.id === activeCategory);

  if (loading) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loaderText}>Chargement du menu...</Text>
      </View>
    );
  }

  const firstName = user?.name?.split(' ')[0] || 'Client';

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
      >
        {/* ── Hero Header ── */}
        <View style={styles.heroSection}>
          <View style={styles.heroTop}>
            <View>
              <Text style={styles.greeting}>Bonjour, {firstName} 👋</Text>
              <Text style={styles.heroTitle}>{restaurant?.name || 'Notre restaurant'}</Text>
            </View>
            {restaurant?.rating > 0 && (
              <View style={styles.ratingBox}>
                <Text style={styles.ratingEmoji}>⭐</Text>
                <Text style={styles.ratingValue}>{Number(restaurant.rating).toFixed(1)}</Text>
              </View>
            )}
          </View>

          {/* Info chips */}
          <View style={styles.infoChips}>
            <View style={styles.chip}>
              <Text style={styles.chipIcon}>⏱️</Text>
              <Text style={styles.chipText}>{restaurant?.delivery_time_min}-{restaurant?.delivery_time_max} min</Text>
            </View>
            <View style={styles.chip}>
              <Text style={styles.chipIcon}>🚚</Text>
              <Text style={styles.chipText}>
                {restaurant?.delivery_fee === 0
                  ? 'Gratuit'
                  : `${Number(restaurant?.delivery_fee).toLocaleString('fr-FR')} XAF`}
              </Text>
            </View>
            <View style={[styles.chip, styles.chipOpen]}>
              <View style={styles.openDot} />
              <Text style={[styles.chipText, { color: COLORS.success }]}>Ouvert</Text>
            </View>
          </View>
        </View>

        {/* ── Barre de recherche ── */}
        <View style={styles.searchSection}>
          <View style={styles.searchBox}>
            <Text style={styles.searchIcon}>🔍</Text>
            <TextInput
              style={styles.searchInput}
              placeholder="Rechercher un plat..."
              value={search}
              onChangeText={setSearch}
              placeholderTextColor={COLORS.lightGray}
            />
            {search.length > 0 && (
              <TouchableOpacity onPress={() => setSearch('')} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <Text style={styles.searchClear}>✕</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* ── Tabs catégories ── */}
        {search.length === 0 && (
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
        )}

        {/* ── Liste des articles ── */}
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
                  onPress={item => navigation.navigate('ItemDetail', { item })}
                  onAdd={item => addItem({ ...item, effective_price: item.discount_price || item.price })}
                />
              ))}
            </View>
          ))}
        </View>

        {filteredCategories.length === 0 && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyEmoji}>🔍</Text>
            <Text style={styles.emptyTitle}>Aucun plat trouvé</Text>
            <Text style={styles.emptyDesc}>Essayez avec un autre mot-clé</Text>
          </View>
        )}

        <View style={{ height: 120 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  loader:    { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.bg },
  loaderText: { marginTop: 12, color: COLORS.gray, fontSize: 14 },

  // ── Hero section ──
  heroSection: {
    backgroundColor: COLORS.card,
    paddingTop: 12,
    paddingBottom: 20,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 4,
  },
  heroTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
  greeting: { fontSize: 14, color: COLORS.gray, marginBottom: 4 },
  heroTitle: { fontSize: 24, fontWeight: '800', color: COLORS.text },
  ratingBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.lightBg,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 4,
  },
  ratingEmoji: { fontSize: 16 },
  ratingValue: { fontSize: 14, fontWeight: '700', color: COLORS.orange },

  infoChips: { flexDirection: 'row', gap: 10 },
  chip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.bg,
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 12,
    gap: 6,
  },
  chipOpen: { backgroundColor: '#ECFDF5' },
  chipIcon: { fontSize: 16 },
  chipText: { fontSize: 11, fontWeight: '700', color: COLORS.text },
  openDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: COLORS.success },

  // ── Search ──
  searchSection: { paddingHorizontal: 20, marginTop: 20, marginBottom: 16 },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  searchIcon: { fontSize: 18, marginRight: 10 },
  searchInput: { flex: 1, fontSize: 15, color: COLORS.text },
  searchClear: { fontSize: 20, color: COLORS.lightGray },

  // ── Categories tabs ──
  catScroll: { marginBottom: 20 },
  catScrollContent: { paddingHorizontal: 20, gap: 10 },
  catTab: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 24,
    backgroundColor: COLORS.card,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  catTabActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  catTabText: { fontSize: 14, fontWeight: '600', color: COLORS.gray },
  catTabTextActive: { color: '#fff', fontWeight: '700' },
  catTabDot: { width: 5, height: 5, borderRadius: 2.5, backgroundColor: '#fff' },

  // ── Menu content ──
  menuContent: { paddingHorizontal: 20 },
  categorySection: { marginBottom: 24 },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  sectionTitle: { fontSize: 20, fontWeight: '800', color: COLORS.text },
  sectionCount: { fontSize: 13, fontWeight: '600', color: COLORS.lightGray },

  // ── Item card ──
  itemCard: {
    backgroundColor: COLORS.card,
    borderRadius: 20,
    marginBottom: 14,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
  },
  itemImageBox: {
    width: '100%',
    height: 160,
    position: 'relative',
  },
  itemImage: { width: '100%', height: '100%' },
  itemPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: COLORS.bg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderIcon: { fontSize: 60, opacity: 0.3 },
  promoBadge: {
    position: 'absolute',
    top: 12,
    left: 12,
    backgroundColor: '#EF4444',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  promoText: { color: '#fff', fontSize: 12, fontWeight: '800' },

  itemInfo: { padding: 16 },
  itemHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 },
  itemName: { flex: 1, fontSize: 17, fontWeight: '700', color: COLORS.text },
  badgeRow: { flexDirection: 'row', gap: 4, marginLeft: 8 },
  spicyBadge: { backgroundColor: '#FEF3C7', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  vegBadge:   { backgroundColor: '#D1FAE5', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  badgeEmoji: { fontSize: 14 },

  itemDesc: { fontSize: 13, color: COLORS.gray, lineHeight: 19, marginBottom: 12 },
  itemFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  itemPrice: { fontSize: 18, fontWeight: '800', color: COLORS.primary, marginBottom: 2 },
  itemOriginalPrice: {
    fontSize: 13,
    color: COLORS.lightGray,
    textDecorationLine: 'line-through',
  },

  addBtn: {
    backgroundColor: COLORS.primary,
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 6,
  },
  addBtnText: { color: '#fff', fontSize: 26, fontWeight: '700', lineHeight: 30 },

  // ── Empty state ──
  emptyState: {
    paddingVertical: 60,
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyEmoji: { fontSize: 56, marginBottom: 12, opacity: 0.4 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: COLORS.text, marginBottom: 6 },
  emptyDesc:  { fontSize: 14, color: COLORS.gray, textAlign: 'center' },
});
