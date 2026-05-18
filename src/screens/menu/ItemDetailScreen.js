import React, { useState, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ScrollView, Image, SafeAreaView, Alert,
  FlatList, Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useCart } from '../../context/CartContext';
import { useAuth } from '../../context/AuthContext';
import { getImageUrl } from '../../services/api';

const { width } = Dimensions.get('window');
const COLORS = { primary: '#FF6B35', bg: '#f8f8f8', card: '#fff', text: '#1a1a1a', gray: '#888' };

// Build array of all images for the carousel
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

// Image carousel component
function ImageCarousel({ images, hasPromo, onBack }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [errors, setErrors] = useState({});

  const onScroll = (e) => {
    const idx = Math.round(e.nativeEvent.contentOffset.x / width);
    setActiveIndex(idx);
  };

  const validImages = images.filter((_, i) => !errors[i]);

  if (validImages.length === 0) {
    return (
      <View style={styles.imageContainer}>
        <View style={styles.imagePlaceholder}>
          <Ionicons name="restaurant-outline" size={80} color="#ccc" />
        </View>
        <TouchableOpacity style={styles.backBtn} onPress={onBack}>
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </TouchableOpacity>
        {hasPromo && (
          <View style={styles.promoBadge}>
            <Text style={styles.promoText}>PROMO</Text>
          </View>
        )}
      </View>
    );
  }

  return (
    <View style={styles.imageContainer}>
      <FlatList
        data={images}
        keyExtractor={(_, i) => String(i)}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={16}
        renderItem={({ item: img, index }) => {
          const url = getImageUrl(img);
          if (errors[index] || !url) return <View style={[styles.image, styles.imagePlaceholder]}><Ionicons name="restaurant-outline" size={80} color="#ccc" /></View>;
          return (
            <Image
              source={{ uri: url }}
              style={[styles.image, { width }]}
              resizeMode="cover"
              onError={() => setErrors(prev => ({ ...prev, [index]: true }))}
            />
          );
        }}
      />
      <TouchableOpacity style={styles.backBtn} onPress={onBack}>
        <Ionicons name="arrow-back" size={22} color="#fff" />
      </TouchableOpacity>
      {hasPromo && (
        <View style={styles.promoBadge}>
          <Text style={styles.promoText}>PROMO</Text>
        </View>
      )}
      {/* Dots indicator */}
      {images.length > 1 && (
        <View style={styles.dotsRow}>
          {images.map((_, i) => (
            <View key={i} style={[styles.dot, activeIndex === i && styles.dotActive]} />
          ))}
        </View>
      )}
      {/* Counter */}
      {images.length > 1 && (
        <View style={styles.imageCounter}>
          <Text style={styles.imageCounterText}>{activeIndex + 1}/{images.length}</Text>
        </View>
      )}
    </View>
  );
}

// Option group selector
function OptionGroupSelector({ group, selections, onSelect }) {
  const isSingle = group.type === 'single';

  const handlePress = (optionItem) => {
    if (isSingle) {
      onSelect(group.id, [optionItem]);
    } else {
      const current = selections[group.id] || [];
      const exists = current.find(o => o.id === optionItem.id);
      if (exists) {
        onSelect(group.id, current.filter(o => o.id !== optionItem.id));
      } else {
        if (group.max_selections && current.length >= group.max_selections) return;
        onSelect(group.id, [...current, optionItem]);
      }
    }
  };

  const selectedIds = (selections[group.id] || []).map(o => o.id);

  return (
    <View style={styles.optionGroupSection}>
      <View style={styles.optionGroupHeader}>
        <Text style={styles.optionGroupTitle}>{group.name}</Text>
        <View style={styles.optionGroupMeta}>
          {group.is_required && (
            <View style={styles.requiredBadge}>
              <Text style={styles.requiredText}>Obligatoire</Text>
            </View>
          )}
          <Text style={styles.optionGroupHint}>
            {isSingle ? 'Choisir 1' : `Choisir jusqu'a ${group.max_selections || group.items.length}`}
          </Text>
        </View>
      </View>

      {group.items.map(opt => {
        const isSelected = selectedIds.includes(opt.id);
        const supplement = Number(opt.price_adjustment);

        return (
          <TouchableOpacity
            key={opt.id}
            style={[styles.optionItem, isSelected && styles.optionItemSelected]}
            onPress={() => handlePress(opt)}
            activeOpacity={0.7}
          >
            <View style={styles.optionLeft}>
              <View style={[
                isSingle ? styles.radioOuter : styles.checkOuter,
                isSelected && styles.optionCircleSelected,
              ]}>
                {isSelected && (
                  isSingle
                    ? <View style={styles.radioInner} />
                    : <Ionicons name="checkmark" size={14} color="#fff" />
                )}
              </View>
              <Text style={[styles.optionName, isSelected && styles.optionNameSelected]}>
                {opt.name}
              </Text>
            </View>
            {supplement > 0 && (
              <Text style={styles.optionPrice}>+{supplement.toLocaleString('fr-FR')} XAF</Text>
            )}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

export default function ItemDetailScreen({ route, navigation }) {
  const { item, restaurant } = route.params;
  const { addItem, items } = useCart();
  const { user } = useAuth();
  const [quantity, setQuantity] = useState(1);
  const [selections, setSelections] = useState(() => {
    // Pre-select defaults
    const defaults = {};
    (item.option_groups || []).forEach(group => {
      const defaultOpt = group.items?.find(o => o.is_default);
      if (defaultOpt) defaults[group.id] = [defaultOpt];
    });
    return defaults;
  });

  const hasPromo = item.discount_price && item.discount_price < item.price;
  const unitPrice = hasPromo ? Number(item.discount_price) : Number(item.price);

  // Calculate options supplement
  const optionsSupplement = Object.values(selections).flat().reduce(
    (sum, opt) => sum + Number(opt.price_adjustment || 0), 0
  );
  const totalUnitPrice = unitPrice + optionsSupplement;
  const totalPrice = totalUnitPrice * quantity;

  const allImages = getAllImages(item);
  const optionGroups = item.option_groups || [];

  const inCart = items.find(i => i.id === item.id);
  const inCartQty = inCart?.quantity || 0;

  const handleSelect = (groupId, opts) => {
    setSelections(prev => ({ ...prev, [groupId]: opts }));
  };

  const handleAdd = () => {
    if (!user) {
      navigation.navigate('Auth', { screen: 'Login' });
      return;
    }

    // Validate required options
    for (const group of optionGroups) {
      if (group.is_required && (!selections[group.id] || selections[group.id].length === 0)) {
        Alert.alert('Option requise', `Veuillez choisir: ${group.name}`);
        return;
      }
    }

    const selectedOptions = {};
    Object.entries(selections).forEach(([groupId, opts]) => {
      const group = optionGroups.find(g => String(g.id) === String(groupId));
      if (group && opts.length > 0) {
        selectedOptions[group.name] = opts.map(o => ({
          id: o.id,
          name: o.name,
          price_adjustment: Number(o.price_adjustment || 0),
        }));
      }
    });

    addItem(
      { ...item, effective_price: totalUnitPrice, selected_options: selectedOptions },
      quantity,
      restaurant
    );

    const optionsText = Object.entries(selectedOptions)
      .map(([group, opts]) => opts.map(o => o.name).join(', '))
      .join(' | ');

    Alert.alert(
      'Ajoute au panier',
      `${quantity}x ${item.name}${optionsText ? '\n' + optionsText : ''}\n${totalPrice.toLocaleString('fr-FR')} XAF`,
      [
        { text: 'Continuer', style: 'cancel' },
        { text: 'Voir le panier', onPress: () => navigation.navigate('Main', { screen: 'Panier' }) },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Image carousel */}
        <ImageCarousel
          images={allImages}
          hasPromo={hasPromo}
          onBack={() => navigation.goBack()}
        />

        {/* Content */}
        <View style={styles.content}>
          {/* Badges */}
          <View style={styles.badges}>
            {item.is_vegetarian && <View style={styles.badge}><Ionicons name="leaf" size={12} color="#10B981" /><Text style={styles.badgeText}> Vegetarien</Text></View>}
            {item.is_spicy && <View style={styles.badge}><Ionicons name="flame" size={12} color="#F59E0B" /><Text style={styles.badgeText}> Epice</Text></View>}
            {item.preparation_time && (
              <View style={styles.badge}><Ionicons name="time-outline" size={12} color="#555" /><Text style={styles.badgeText}> {item.preparation_time} min</Text></View>
            )}
          </View>

          <Text style={styles.name}>{item.name}</Text>

          {/* Price */}
          <View style={styles.priceRow}>
            <Text style={styles.price}>{unitPrice.toLocaleString('fr-FR')} XAF</Text>
            {hasPromo && (
              <Text style={styles.originalPrice}>{Number(item.price).toLocaleString('fr-FR')} XAF</Text>
            )}
          </View>

          {/* Description */}
          {item.description ? (
            <View style={styles.descSection}>
              <Text style={styles.descTitle}>Description</Text>
              <Text style={styles.desc}>{item.description}</Text>
            </View>
          ) : null}

          {item.calories ? (
            <Text style={styles.calories}><Ionicons name="flame" size={13} color="#888" /> {item.calories} kcal</Text>
          ) : null}

          {/* Option groups */}
          {optionGroups.map(group => (
            <OptionGroupSelector
              key={group.id}
              group={group}
              selections={selections}
              onSelect={handleSelect}
            />
          ))}

          {/* Quantity */}
          <View style={styles.quantitySection}>
            <Text style={styles.quantityLabel}>Quantite</Text>
            <View style={styles.quantityRow}>
              <TouchableOpacity
                style={[styles.qtyBtn, quantity === 1 && styles.qtyBtnDisabled]}
                onPress={() => setQuantity(q => Math.max(1, q - 1))}
              >
                <Text style={styles.qtyBtnText}>-</Text>
              </TouchableOpacity>
              <Text style={styles.qtyValue}>{quantity}</Text>
              <TouchableOpacity
                style={styles.qtyBtn}
                onPress={() => setQuantity(q => q + 1)}
              >
                <Text style={styles.qtyBtnText}>+</Text>
              </TouchableOpacity>
            </View>
          </View>

          {inCartQty > 0 && (
            <Text style={styles.inCartHint}>Deja {inCartQty} dans votre panier</Text>
          )}
        </View>
      </ScrollView>

      {/* Add button */}
      <View style={styles.footer}>
        <TouchableOpacity style={styles.addBtn} onPress={handleAdd}>
          <Text style={styles.addBtnText}>
            Ajouter au panier  {totalPrice.toLocaleString('fr-FR')} XAF
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  imageContainer: { position: 'relative', height: 280 },
  image: { width, height: 280 },
  imagePlaceholder: {
    width: '100%', height: '100%',
    backgroundColor: '#FFF3E0', justifyContent: 'center', alignItems: 'center',
  },
  backBtn: {
    position: 'absolute', top: 16, left: 16,
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center',
  },
  promoBadge: {
    position: 'absolute', top: 16, right: 16,
    backgroundColor: '#FF6B35', paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20,
  },
  promoText: { color: '#fff', fontSize: 11, fontWeight: 'bold', letterSpacing: 1 },

  // Dots
  dotsRow: {
    position: 'absolute', bottom: 30, left: 0, right: 0,
    flexDirection: 'row', justifyContent: 'center', gap: 6,
  },
  dot: {
    width: 8, height: 8, borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.5)',
  },
  dotActive: { backgroundColor: '#fff', width: 20 },
  imageCounter: {
    position: 'absolute', bottom: 30, right: 16,
    backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 12,
    paddingHorizontal: 10, paddingVertical: 4,
  },
  imageCounterText: { color: '#fff', fontSize: 12, fontWeight: '600' },

  content: { backgroundColor: COLORS.card, borderTopLeftRadius: 24, borderTopRightRadius: 24, marginTop: -20, padding: 24 },
  badges: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  badge: { backgroundColor: '#f0f0f0', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  badgeText: { fontSize: 12, color: '#555', fontWeight: '600' },

  name: { fontSize: 24, fontWeight: 'bold', color: COLORS.text, marginBottom: 8 },
  priceRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
  price: { fontSize: 26, fontWeight: '800', color: COLORS.primary },
  originalPrice: { fontSize: 16, color: '#ccc', textDecorationLine: 'line-through' },

  descSection: { marginBottom: 16 },
  descTitle: { fontSize: 15, fontWeight: '700', color: COLORS.text, marginBottom: 6 },
  desc: { fontSize: 14, color: COLORS.gray, lineHeight: 22 },
  calories: { fontSize: 13, color: COLORS.gray, marginBottom: 20 },

  // Option groups
  optionGroupSection: {
    marginBottom: 20,
    backgroundColor: '#FAFAFA',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  optionGroupHeader: { marginBottom: 12 },
  optionGroupTitle: { fontSize: 16, fontWeight: '700', color: COLORS.text, marginBottom: 4 },
  optionGroupMeta: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  requiredBadge: {
    backgroundColor: '#FEF3C7', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6,
  },
  requiredText: { fontSize: 11, fontWeight: '700', color: '#D97706' },
  optionGroupHint: { fontSize: 12, color: COLORS.gray },

  optionItem: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 12, paddingHorizontal: 12,
    backgroundColor: '#fff', borderRadius: 12, marginBottom: 6,
    borderWidth: 1.5, borderColor: '#e5e7eb',
  },
  optionItemSelected: {
    borderColor: COLORS.primary, backgroundColor: '#FFF7ED',
  },
  optionLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  radioOuter: {
    width: 22, height: 22, borderRadius: 11,
    borderWidth: 2, borderColor: '#d1d5db',
    justifyContent: 'center', alignItems: 'center',
  },
  radioInner: {
    width: 12, height: 12, borderRadius: 6,
    backgroundColor: COLORS.primary,
  },
  checkOuter: {
    width: 22, height: 22, borderRadius: 6,
    borderWidth: 2, borderColor: '#d1d5db',
    justifyContent: 'center', alignItems: 'center',
  },
  optionCircleSelected: { borderColor: COLORS.primary, backgroundColor: COLORS.primary },
  optionName: { fontSize: 15, color: COLORS.text, fontWeight: '500' },
  optionNameSelected: { fontWeight: '700', color: COLORS.primary },
  optionPrice: { fontSize: 13, color: COLORS.primary, fontWeight: '700' },

  quantitySection: { marginVertical: 16 },
  quantityLabel: { fontSize: 15, fontWeight: '700', color: COLORS.text, marginBottom: 12 },
  quantityRow: { flexDirection: 'row', alignItems: 'center', gap: 20 },
  qtyBtn: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center',
  },
  qtyBtnDisabled: { backgroundColor: '#e0e0e0' },
  qtyBtnText: { color: '#fff', fontSize: 24, fontWeight: 'bold', lineHeight: 28 },
  qtyValue: { fontSize: 22, fontWeight: 'bold', color: COLORS.text, minWidth: 32, textAlign: 'center' },
  inCartHint: { fontSize: 13, color: COLORS.primary, fontWeight: '600', textAlign: 'center' },

  footer: {
    padding: 16, paddingBottom: 24,
    backgroundColor: COLORS.card,
    borderTopWidth: 1, borderTopColor: '#f0f0f0',
  },
  addBtn: {
    backgroundColor: COLORS.primary, borderRadius: 16,
    paddingVertical: 16, alignItems: 'center',
    shadowColor: COLORS.primary, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 8, elevation: 6,
  },
  addBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
});
