import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  SafeAreaView, ActivityIndicator, Alert, TextInput,
} from 'react-native';
import { useCart } from '../../context/CartContext';
import { orderService } from '../../services/orderService';
import { profileService } from '../../services/profileService';

const COLORS = { primary: '#FF6B35', bg: '#f8f8f8', card: '#fff', text: '#1a1a1a', gray: '#888' };

// Coordonnées du restaurant (Évêché Macambou, Bafoussam)
const RESTAURANT_LAT = 5.4720;
const RESTAURANT_LON = 10.4180;

// Calcule le temps de livraison via OSRM (routing OpenStreetMap)
async function getDeliveryMinutes(clientLat, clientLon) {
  try {
    const url = `https://router.project-osrm.org/route/v1/driving/${RESTAURANT_LON},${RESTAURANT_LAT};${clientLon},${clientLat}?overview=false`;
    const res  = await fetch(url);
    const data = await res.json();
    if (data.code === 'Ok' && data.routes?.length > 0) {
      const durationSec = data.routes[0].duration; // secondes
      return Math.ceil(durationSec / 60); // → minutes
    }
  } catch (e) {
    // silencieux, on retourne null
  }
  return null;
}

const PAYMENT_METHODS = [
  { key: 'cash',        label: 'Espèces',          icon: '💵', desc: 'Payer à la livraison' },
  { key: 'mtn_momo',   label: 'MTN Mobile Money',  icon: '📱', desc: 'Paiement mobile MTN' },
  { key: 'orange_money',label: 'Orange Money',      icon: '🍊', desc: 'Paiement mobile Orange' },
];

export default function CheckoutScreen({ navigation }) {
  const { items, subtotal, deliveryFee, discount, total, coupon, clearCart } = useCart();
  const [addresses, setAddresses] = useState([]);
  const [selectedAddress, setSelectedAddress] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingAddresses, setLoadingAddresses] = useState(true);

  useEffect(() => {
    loadAddresses();
  }, []);

  const loadAddresses = async () => {
    try {
      const data = await profileService.getAddresses();
      setAddresses(data);
      const def = data.find(a => a.is_default) || data[0];
      if (def) setSelectedAddress(def);
    } catch (e) {
      console.error('Erreur adresses:', e);
    } finally {
      setLoadingAddresses(false);
    }
  };

  const handleOrder = async () => {
    if (!selectedAddress) {
      Alert.alert('Adresse manquante', 'Veuillez sélectionner une adresse de livraison.');
      return;
    }

    setLoading(true);
    try {
      const orderData = {
        restaurant_id: 1, // Application mono-restaurant
        address_id: selectedAddress.id,
        payment_method: paymentMethod,
        special_instructions: note.trim() || null,
        coupon_code: coupon?.code || null,
        items: items.map(item => ({
          menu_item_id: item.id,
          quantity: item.quantity,
        })),
      };

      const result = await orderService.createOrder(orderData);
      const order = result.order || result; // Le backend renvoie { message, order }

      // Calculer le temps de livraison via OSRM si l'adresse a des coordonnées
      let deliveryMinutes = null;
      if (selectedAddress?.latitude && selectedAddress?.longitude) {
        deliveryMinutes = await getDeliveryMinutes(
          parseFloat(selectedAddress.latitude),
          parseFloat(selectedAddress.longitude)
        );
      }

      // Si paiement mobile money → rediriger vers l'écran de paiement
      if (paymentMethod === 'mtn_momo' || paymentMethod === 'orange_money') {
        clearCart();
        navigation.replace('MobilePayment', { order, paymentMethod, deliveryMinutes });
        return;
      }

      // Sinon (espèces) → aller directement à la confirmation
      clearCart();
      navigation.replace('OrderConfirmation', { order, deliveryMinutes });
    } catch (e) {
      const msg = e.response?.data?.message || 'Une erreur est survenue lors de la commande.';
      Alert.alert('Erreur', msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Finaliser la commande</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 16, paddingBottom: 120 }}>
        {/* Adresse de livraison */}
        <Text style={styles.sectionTitle}>📍 Adresse de livraison</Text>
        {loadingAddresses ? (
          <ActivityIndicator color={COLORS.primary} style={{ marginVertical: 16 }} />
        ) : addresses.length === 0 ? (
          <View style={styles.noAddressCard}>
            <Text style={styles.noAddressText}>Aucune adresse enregistrée</Text>
            <TouchableOpacity
              style={styles.addAddressBtn}
              onPress={() => navigation.navigate('AddAddress', { onSave: loadAddresses })}
            >
              <Text style={styles.addAddressBtnText}>+ Ajouter une adresse</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {addresses.map(addr => (
              <TouchableOpacity
                key={addr.id}
                style={[styles.addressCard, selectedAddress?.id === addr.id && styles.addressCardSelected]}
                onPress={() => setSelectedAddress(addr)}
              >
                <View style={styles.addressRadio}>
                  <View style={[styles.radioOuter, selectedAddress?.id === addr.id && styles.radioOuterSelected]}>
                    {selectedAddress?.id === addr.id && <View style={styles.radioInner} />}
                  </View>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.addressLabel}>{addr.label || 'Adresse'}</Text>
                  <Text style={styles.addressValue}>{addr.address}</Text>
                  {addr.phone && <Text style={styles.addressPhone}>📞 {addr.phone}</Text>}
                  {addr.is_default && <Text style={styles.defaultBadge}>Par défaut</Text>}
                </View>
              </TouchableOpacity>
            ))}
            <TouchableOpacity
              style={styles.addMoreAddress}
              onPress={() => navigation.navigate('AddAddress', { onSave: loadAddresses })}
            >
              <Text style={styles.addMoreAddressText}>+ Nouvelle adresse</Text>
            </TouchableOpacity>
          </>
        )}

        {/* Mode de paiement */}
        <Text style={[styles.sectionTitle, { marginTop: 24 }]}>💳 Mode de paiement</Text>
        {PAYMENT_METHODS.map(pm => (
          <TouchableOpacity
            key={pm.key}
            style={[styles.payCard, paymentMethod === pm.key && styles.payCardSelected]}
            onPress={() => setPaymentMethod(pm.key)}
          >
            <Text style={styles.payIcon}>{pm.icon}</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.payLabel}>{pm.label}</Text>
              <Text style={styles.payDesc}>{pm.desc}</Text>
            </View>
            <View style={[styles.radioOuter, paymentMethod === pm.key && styles.radioOuterSelected]}>
              {paymentMethod === pm.key && <View style={styles.radioInner} />}
            </View>
          </TouchableOpacity>
        ))}

        {/* Note */}
        <Text style={[styles.sectionTitle, { marginTop: 24 }]}>📝 Note (optionnel)</Text>
        <TextInput
          style={styles.noteInput}
          placeholder="Instructions particulières pour la préparation ou la livraison..."
          value={note}
          onChangeText={setNote}
          multiline
          numberOfLines={3}
          placeholderTextColor="#aaa"
          textAlignVertical="top"
        />

        {/* Récap commande */}
        <Text style={[styles.sectionTitle, { marginTop: 24 }]}>🧾 Récapitulatif</Text>
        <View style={styles.summaryCard}>
          {items.map(item => (
            <View key={item.id} style={styles.summaryRow}>
              <Text style={styles.summaryQty}>{item.quantity}×</Text>
              <Text style={styles.summaryName} numberOfLines={1}>{item.name}</Text>
              <Text style={styles.summaryPrice}>
                {(Number(item.effective_price || item.price) * item.quantity).toLocaleString('fr-FR')} XAF
              </Text>
            </View>
          ))}
          <View style={styles.summaryDivider} />
          <View style={styles.summaryRow}>
            <Text style={[styles.summaryName, { color: COLORS.gray }]}>Livraison</Text>
            <Text style={styles.summaryPrice}>
              {deliveryFee === 0 ? <Text style={{ color: '#22c55e' }}>Gratuite</Text> : `${deliveryFee.toLocaleString('fr-FR')} XAF`}
            </Text>
          </View>
          {discount > 0 && (
            <View style={styles.summaryRow}>
              <Text style={[styles.summaryName, { color: '#22c55e' }]}>Réduction</Text>
              <Text style={[styles.summaryPrice, { color: '#22c55e' }]}>-{discount.toLocaleString('fr-FR')} XAF</Text>
            </View>
          )}
          <View style={[styles.summaryRow, { marginTop: 8 }]}>
            <Text style={styles.summaryTotal}>TOTAL</Text>
            <Text style={styles.summaryTotalValue}>{total.toLocaleString('fr-FR')} XAF</Text>
          </View>
        </View>
      </ScrollView>

      {/* Footer */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.orderBtn, loading && { opacity: 0.7 }]}
          onPress={handleOrder}
          disabled={loading}
        >
          {loading
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.orderBtnText}>Confirmer la commande • {total.toLocaleString('fr-FR')} XAF</Text>
          }
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12,
    backgroundColor: COLORS.card, borderBottomWidth: 1, borderBottomColor: '#f0f0f0',
  },
  backBtn:     { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  backText:    { fontSize: 24, color: COLORS.text },
  headerTitle: { fontSize: 17, fontWeight: 'bold', color: COLORS.text },

  sectionTitle: { fontSize: 15, fontWeight: '700', color: COLORS.text, marginBottom: 12 },

  noAddressCard: {
    backgroundColor: COLORS.card, borderRadius: 16, padding: 20,
    alignItems: 'center', marginBottom: 8,
  },
  noAddressText:    { color: COLORS.gray, marginBottom: 12 },
  addAddressBtn:    { backgroundColor: COLORS.primary, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 10 },
  addAddressBtnText:{ color: '#fff', fontWeight: '600' },

  addressCard: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.card,
    borderRadius: 14, padding: 14, marginBottom: 8,
    borderWidth: 1.5, borderColor: 'transparent',
  },
  addressCardSelected: { borderColor: COLORS.primary },
  addressRadio:  { marginRight: 12 },
  radioOuter: {
    width: 20, height: 20, borderRadius: 10,
    borderWidth: 2, borderColor: '#ccc', justifyContent: 'center', alignItems: 'center',
  },
  radioOuterSelected: { borderColor: COLORS.primary },
  radioInner:  { width: 10, height: 10, borderRadius: 5, backgroundColor: COLORS.primary },
  addressLabel:{ fontSize: 13, fontWeight: '700', color: COLORS.text },
  addressValue:{ fontSize: 13, color: COLORS.gray, marginTop: 2 },
  addressPhone:{ fontSize: 12, color: COLORS.primary, fontWeight: '600', marginTop: 2 },
  defaultBadge:{ fontSize: 11, color: COLORS.primary, fontWeight: '600', marginTop: 4 },
  addMoreAddress:{ marginBottom: 4 },
  addMoreAddressText:{ color: COLORS.primary, fontWeight: '600', fontSize: 14 },

  payCard: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.card,
    borderRadius: 14, padding: 14, marginBottom: 8,
    borderWidth: 1.5, borderColor: 'transparent',
  },
  payCardSelected: { borderColor: COLORS.primary },
  payIcon:  { fontSize: 24, marginRight: 12 },
  payLabel: { fontSize: 14, fontWeight: '700', color: COLORS.text },
  payDesc:  { fontSize: 12, color: COLORS.gray, marginTop: 2 },

  noteInput: {
    backgroundColor: COLORS.card, borderRadius: 14, padding: 14,
    fontSize: 14, color: COLORS.text, borderWidth: 1.5, borderColor: '#e0e0e0',
    minHeight: 90, marginBottom: 8,
  },

  summaryCard: {
    backgroundColor: COLORS.card, borderRadius: 16, padding: 16,
  },
  summaryRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  summaryQty:  { fontSize: 13, color: COLORS.primary, fontWeight: '700', width: 28 },
  summaryName: { flex: 1, fontSize: 13, color: COLORS.text },
  summaryPrice:{ fontSize: 13, color: COLORS.text, fontWeight: '600' },
  summaryDivider: { height: 1, backgroundColor: '#f0f0f0', marginVertical: 8 },
  summaryTotal:{ flex: 1, fontSize: 15, fontWeight: 'bold', color: COLORS.text },
  summaryTotalValue:{ fontSize: 16, fontWeight: '800', color: COLORS.primary },

  footer: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    padding: 16, paddingBottom: 32, backgroundColor: COLORS.card,
    borderTopWidth: 1, borderTopColor: '#f0f0f0',
  },
  orderBtn: {
    backgroundColor: COLORS.primary, borderRadius: 16, paddingVertical: 16,
    alignItems: 'center',
    shadowColor: COLORS.primary, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 8, elevation: 6,
  },
  orderBtnText: { color: '#fff', fontSize: 15, fontWeight: 'bold' },
});
