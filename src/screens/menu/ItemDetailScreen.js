import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ScrollView, Image, SafeAreaView, Alert,
} from 'react-native';
import { useCart } from '../../context/CartContext';

const COLORS = { primary: '#FF6B35', bg: '#f8f8f8', card: '#fff', text: '#1a1a1a', gray: '#888' };

export default function ItemDetailScreen({ route, navigation }) {
  const { item }  = route.params;
  const { addItem, items } = useCart();
  const [quantity, setQuantity] = useState(1);

  const hasPromo   = item.discount_price && item.discount_price < item.price;
  const unitPrice  = hasPromo ? Number(item.discount_price) : Number(item.price);
  const totalPrice = unitPrice * quantity;

  const inCart  = items.find(i => i.id === item.id);
  const inCartQty = inCart?.quantity || 0;

  const handleAdd = () => {
    addItem({ ...item, effective_price: unitPrice }, quantity);
    Alert.alert(
      '✅ Ajouté au panier',
      `${quantity}x ${item.name} — ${totalPrice.toLocaleString('fr-FR')} XAF`,
      [
        { text: 'Continuer', style: 'cancel' },
        { text: 'Voir le panier', onPress: () => navigation.navigate('Main', { screen: 'Panier' }) },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Image header */}
        <View style={styles.imageContainer}>
          {item.image
            ? <Image source={{ uri: item.image }} style={styles.image} resizeMode="cover" />
            : <View style={styles.imagePlaceholder}><Text style={{ fontSize: 80 }}>🍽️</Text></View>
          }
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Text style={styles.backText}>←</Text>
          </TouchableOpacity>
          {hasPromo && (
            <View style={styles.promoBadge}>
              <Text style={styles.promoText}>PROMO</Text>
            </View>
          )}
        </View>

        {/* Contenu */}
        <View style={styles.content}>
          {/* Badges */}
          <View style={styles.badges}>
            {item.is_vegetarian && <View style={styles.badge}><Text style={styles.badgeText}>🥗 Végétarien</Text></View>}
            {item.is_spicy      && <View style={styles.badge}><Text style={styles.badgeText}>🌶️ Épicé</Text></View>}
            {item.preparation_time && (
              <View style={styles.badge}><Text style={styles.badgeText}>⏱️ {item.preparation_time} min</Text></View>
            )}
          </View>

          <Text style={styles.name}>{item.name}</Text>

          {/* Prix */}
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
            <Text style={styles.calories}>🔥 {item.calories} kcal</Text>
          ) : null}

          {/* Quantité */}
          <View style={styles.quantitySection}>
            <Text style={styles.quantityLabel}>Quantité</Text>
            <View style={styles.quantityRow}>
              <TouchableOpacity
                style={[styles.qtyBtn, quantity === 1 && styles.qtyBtnDisabled]}
                onPress={() => setQuantity(q => Math.max(1, q - 1))}
              >
                <Text style={styles.qtyBtnText}>−</Text>
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
            <Text style={styles.inCartHint}>Déjà {inCartQty} dans votre panier</Text>
          )}
        </View>
      </ScrollView>

      {/* Bouton Ajouter */}
      <View style={styles.footer}>
        <TouchableOpacity style={styles.addBtn} onPress={handleAdd}>
          <Text style={styles.addBtnText}>
            Ajouter au panier • {totalPrice.toLocaleString('fr-FR')} XAF
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  imageContainer: { position: 'relative', height: 280 },
  image:          { width: '100%', height: '100%' },
  imagePlaceholder: {
    width: '100%', height: '100%',
    backgroundColor: '#FFF3E0', justifyContent: 'center', alignItems: 'center',
  },
  backBtn: {
    position: 'absolute', top: 16, left: 16,
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center',
  },
  backText:   { color: '#fff', fontSize: 22, fontWeight: 'bold' },
  promoBadge: {
    position: 'absolute', top: 16, right: 16,
    backgroundColor: '#FF6B35', paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20,
  },
  promoText: { color: '#fff', fontSize: 11, fontWeight: 'bold', letterSpacing: 1 },

  content:  { backgroundColor: COLORS.card, borderTopLeftRadius: 24, borderTopRightRadius: 24, marginTop: -20, padding: 24 },
  badges:   { flexDirection: 'row', gap: 8, marginBottom: 12 },
  badge:    { backgroundColor: '#f0f0f0', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  badgeText:{ fontSize: 12, color: '#555', fontWeight: '600' },

  name:       { fontSize: 24, fontWeight: 'bold', color: COLORS.text, marginBottom: 8 },
  priceRow:   { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
  price:      { fontSize: 26, fontWeight: '800', color: COLORS.primary },
  originalPrice: { fontSize: 16, color: '#ccc', textDecorationLine: 'line-through' },

  descSection: { marginBottom: 16 },
  descTitle:   { fontSize: 15, fontWeight: '700', color: COLORS.text, marginBottom: 6 },
  desc:        { fontSize: 14, color: COLORS.gray, lineHeight: 22 },
  calories:    { fontSize: 13, color: COLORS.gray, marginBottom: 20 },

  quantitySection: { marginVertical: 16 },
  quantityLabel:   { fontSize: 15, fontWeight: '700', color: COLORS.text, marginBottom: 12 },
  quantityRow:     { flexDirection: 'row', alignItems: 'center', gap: 20 },
  qtyBtn: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center',
  },
  qtyBtnDisabled: { backgroundColor: '#e0e0e0' },
  qtyBtnText:     { color: '#fff', fontSize: 24, fontWeight: 'bold', lineHeight: 28 },
  qtyValue:       { fontSize: 22, fontWeight: 'bold', color: COLORS.text, minWidth: 32, textAlign: 'center' },
  inCartHint:     { fontSize: 13, color: COLORS.primary, fontWeight: '600', textAlign: 'center' },

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
