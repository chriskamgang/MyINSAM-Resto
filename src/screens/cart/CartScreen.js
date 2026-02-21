import React, { useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  SafeAreaView, TextInput, Alert, Image,
} from 'react-native';
import { useCart } from '../../context/CartContext';

const COLORS = { primary: '#FF6B35', bg: '#f8f8f8', card: '#fff', text: '#1a1a1a', gray: '#888' };

function CartItem({ item, onIncrease, onDecrease, onDelete }) {
  const unitPrice = item.effective_price || item.price;
  return (
    <View style={styles.cartItem}>
      <View style={styles.itemImageBox}>
        {item.image
          ? <Image source={{ uri: item.image }} style={styles.itemImage} />
          : <Text style={styles.itemPlaceholder}>🍽️</Text>
        }
      </View>
      <View style={styles.itemInfo}>
        <Text style={styles.itemName} numberOfLines={1}>{item.name}</Text>
        <Text style={styles.itemPrice}>{Number(unitPrice).toLocaleString('fr-FR')} XAF</Text>
        <View style={styles.qtyRow}>
          <TouchableOpacity
            style={[styles.qtyBtn, item.quantity === 1 && styles.qtyBtnDanger]}
            onPress={() => item.quantity === 1 ? onDelete(item.id) : onDecrease(item.id)}
          >
            <Text style={styles.qtyBtnText}>{item.quantity === 1 ? '🗑' : '−'}</Text>
          </TouchableOpacity>
          <Text style={styles.qtyValue}>{item.quantity}</Text>
          <TouchableOpacity style={styles.qtyBtn} onPress={() => onIncrease(item.id)}>
            <Text style={styles.qtyBtnText}>+</Text>
          </TouchableOpacity>
          <Text style={styles.lineTotal}>
            = {(Number(unitPrice) * item.quantity).toLocaleString('fr-FR')} XAF
          </Text>
        </View>
      </View>
    </View>
  );
}

export default function CartScreen({ navigation }) {
  const { items, subtotal, deliveryFee, discount, total, totalItems, addItem, removeItem, deleteItem, clearCart, applyCoupon, removeCoupon, coupon } = useCart();
  const [couponInput, setCouponInput] = useState('');
  const [couponLoading, setCouponLoading] = useState(false);

  const handleApplyCoupon = async () => {
    if (!couponInput.trim()) return;
    setCouponLoading(true);
    try {
      await applyCoupon(couponInput.trim());
      setCouponInput('');
    } catch (e) {
      Alert.alert('Coupon invalide', e.message || 'Ce code promo n\'est pas valide.');
    } finally {
      setCouponLoading(false);
    }
  };

  const handleClearCart = () => {
    Alert.alert(
      'Vider le panier',
      'Supprimer tous les articles du panier ?',
      [
        { text: 'Annuler', style: 'cancel' },
        { text: 'Vider', style: 'destructive', onPress: clearCart },
      ]
    );
  };

  if (items.length === 0) {
    return (
      <SafeAreaView style={styles.emptyContainer}>
        <Text style={styles.emptyEmoji}>🛒</Text>
        <Text style={styles.emptyTitle}>Votre panier est vide</Text>
        <Text style={styles.emptySubtitle}>Ajoutez des plats depuis le menu</Text>
        <TouchableOpacity style={styles.shopBtn} onPress={() => navigation.navigate('Main', { screen: 'Menu' })}>
          <Text style={styles.shopBtnText}>Voir le menu</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Mon panier</Text>
        <TouchableOpacity onPress={handleClearCart}>
          <Text style={styles.clearText}>Vider</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={items}
        keyExtractor={item => String(item.id)}
        renderItem={({ item }) => (
          <CartItem
            item={item}
            onIncrease={id => addItem(item, 1)}
            onDecrease={id => removeItem(id)}
            onDelete={id => deleteItem(id)}
          />
        )}
        contentContainerStyle={{ padding: 16, paddingBottom: 8 }}
        ListFooterComponent={() => (
          <View>
            {/* Coupon */}
            <View style={styles.couponSection}>
              {coupon ? (
                <View style={styles.couponApplied}>
                  <Text style={styles.couponAppliedText}>🎉 Code «{coupon.code}» appliqué — -{discount.toLocaleString('fr-FR')} XAF</Text>
                  <TouchableOpacity onPress={removeCoupon}>
                    <Text style={styles.couponRemove}>✕</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={styles.couponRow}>
                  <TextInput
                    style={styles.couponInput}
                    placeholder="Code promo"
                    value={couponInput}
                    onChangeText={setCouponInput}
                    autoCapitalize="characters"
                    placeholderTextColor="#aaa"
                  />
                  <TouchableOpacity
                    style={[styles.couponBtn, !couponInput.trim() && { opacity: 0.5 }]}
                    onPress={handleApplyCoupon}
                    disabled={couponLoading || !couponInput.trim()}
                  >
                    <Text style={styles.couponBtnText}>{couponLoading ? '...' : 'Appliquer'}</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>

            {/* Totaux */}
            <View style={styles.totalsCard}>
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Sous-total ({totalItems} article{totalItems > 1 ? 's' : ''})</Text>
                <Text style={styles.totalValue}>{subtotal.toLocaleString('fr-FR')} XAF</Text>
              </View>
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Frais de livraison</Text>
                <Text style={styles.totalValue}>
                  {deliveryFee === 0 ? <Text style={{ color: '#22c55e' }}>Gratuit</Text> : `${deliveryFee.toLocaleString('fr-FR')} XAF`}
                </Text>
              </View>
              {discount > 0 && (
                <View style={styles.totalRow}>
                  <Text style={[styles.totalLabel, { color: '#22c55e' }]}>Réduction</Text>
                  <Text style={[styles.totalValue, { color: '#22c55e' }]}>-{discount.toLocaleString('fr-FR')} XAF</Text>
                </View>
              )}
              <View style={[styles.totalRow, styles.totalRowFinal]}>
                <Text style={styles.totalFinalLabel}>Total</Text>
                <Text style={styles.totalFinalValue}>{total.toLocaleString('fr-FR')} XAF</Text>
              </View>
            </View>
            <View style={{ height: 100 }} />
          </View>
        )}
      />

      {/* Footer CTA */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.checkoutBtn}
          onPress={() => navigation.navigate('Checkout')}
        >
          <Text style={styles.checkoutBtnText}>
            Commander • {total.toLocaleString('fr-FR')} XAF
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container:      { flex: 1, backgroundColor: COLORS.bg },
  emptyContainer: { flex: 1, backgroundColor: COLORS.bg, justifyContent: 'center', alignItems: 'center', padding: 32 },
  emptyEmoji:     { fontSize: 80, marginBottom: 16 },
  emptyTitle:     { fontSize: 22, fontWeight: 'bold', color: COLORS.text, marginBottom: 8 },
  emptySubtitle:  { fontSize: 15, color: COLORS.gray, textAlign: 'center', marginBottom: 32 },
  shopBtn: {
    backgroundColor: COLORS.primary, paddingHorizontal: 32, paddingVertical: 14,
    borderRadius: 14,
  },
  shopBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 15 },

  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 16,
    backgroundColor: COLORS.card, borderBottomWidth: 1, borderBottomColor: '#f0f0f0',
  },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: COLORS.text },
  clearText:   { fontSize: 14, color: '#e53e3e', fontWeight: '600' },

  cartItem: {
    flexDirection: 'row', backgroundColor: COLORS.card,
    borderRadius: 16, marginBottom: 10, padding: 12,
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, elevation: 1,
  },
  itemImageBox:    { width: 72, height: 72, marginRight: 12 },
  itemImage:       { width: 72, height: 72, borderRadius: 12 },
  itemPlaceholder: { fontSize: 40, width: 72, height: 72, textAlign: 'center', lineHeight: 72 },
  itemInfo:        { flex: 1 },
  itemName:        { fontSize: 15, fontWeight: '700', color: COLORS.text, marginBottom: 4 },
  itemPrice:       { fontSize: 13, color: COLORS.gray, marginBottom: 8 },
  qtyRow:          { flexDirection: 'row', alignItems: 'center', gap: 10 },
  qtyBtn: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center',
  },
  qtyBtnDanger: { backgroundColor: '#e53e3e' },
  qtyBtnText:   { color: '#fff', fontSize: 18, fontWeight: 'bold', lineHeight: 22 },
  qtyValue:     { fontSize: 16, fontWeight: 'bold', color: COLORS.text, minWidth: 20, textAlign: 'center' },
  lineTotal:    { fontSize: 13, color: COLORS.primary, fontWeight: '700', marginLeft: 4 },

  couponSection: { marginBottom: 12 },
  couponRow:     { flexDirection: 'row', gap: 8 },
  couponInput: {
    flex: 1, backgroundColor: COLORS.card, borderWidth: 1.5, borderColor: '#e0e0e0',
    borderRadius: 12, paddingHorizontal: 14, paddingVertical: 11, fontSize: 14, color: COLORS.text,
  },
  couponBtn: {
    backgroundColor: COLORS.primary, borderRadius: 12, paddingHorizontal: 16,
    justifyContent: 'center', alignItems: 'center',
  },
  couponBtnText:    { color: '#fff', fontWeight: 'bold', fontSize: 14 },
  couponApplied:    { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f0fdf4', borderRadius: 12, padding: 12, gap: 8 },
  couponAppliedText:{ flex: 1, color: '#16a34a', fontSize: 13, fontWeight: '600' },
  couponRemove:     { color: '#aaa', fontSize: 18 },

  totalsCard: {
    backgroundColor: COLORS.card, borderRadius: 16, padding: 16, marginBottom: 16,
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, elevation: 1,
  },
  totalRow:       { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  totalRowFinal:  { borderTopWidth: 1, borderTopColor: '#f0f0f0', paddingTop: 10, marginTop: 2 },
  totalLabel:     { fontSize: 14, color: COLORS.gray },
  totalValue:     { fontSize: 14, color: COLORS.text, fontWeight: '600' },
  totalFinalLabel:{ fontSize: 16, fontWeight: 'bold', color: COLORS.text },
  totalFinalValue:{ fontSize: 18, fontWeight: '800', color: COLORS.primary },

  footer: {
    padding: 16, paddingBottom: 24, backgroundColor: COLORS.card,
    borderTopWidth: 1, borderTopColor: '#f0f0f0',
  },
  checkoutBtn: {
    backgroundColor: COLORS.primary, borderRadius: 16, paddingVertical: 16, alignItems: 'center',
    shadowColor: COLORS.primary, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 8, elevation: 6,
  },
  checkoutBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
});
