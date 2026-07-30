import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  SafeAreaView, ActivityIndicator, Alert, TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useMarket } from '../../context/MarketContext';
import { marketService } from '../../services/marketService';
import { profileService } from '../../services/profileService';

const COLORS = { primary: '#FF6B35', bg: '#f8f8f8', card: '#fff', text: '#1a1a1a', gray: '#888' };

const PAYMENT_OPTIONS = [
  { key: 'mobile_money', label: 'Payer maintenant (Mobile Money)', iconName: 'phone-portrait-outline', desc: 'MTN ou Orange Money' },
  { key: 'on_delivery',  label: 'Payer \u00e0 la livraison',            iconName: 'cash-outline',             desc: 'Esp\u00e8ces \u00e0 la r\u00e9ception' },
];

const MOBILE_METHODS = [
  { key: 'mtn',    label: 'MTN Mobile Money', color: '#FFCC00' },
  { key: 'orange', label: 'Orange Money',     color: '#FF6600' },
];

export default function MarketOrderSummaryScreen({ navigation }) {
  const { items, totalEstimated, clearList } = useMarket();

  const [addresses, setAddresses] = useState([]);
  const [selectedAddress, setSelectedAddress] = useState(null);
  const [loadingAddresses, setLoadingAddresses] = useState(true);

  const [serviceFee, setServiceFee] = useState(0);
  const [loadingFee, setLoadingFee] = useState(true);

  const [paymentMethod, setPaymentMethod] = useState('on_delivery');
  const [mobileMethod, setMobileMethod] = useState('mtn');
  const [mobilePhone, setMobilePhone] = useState('');

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadAddresses();
    loadServiceFee();
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

  const loadServiceFee = async () => {
    try {
      const data = await marketService.getServiceFee();
      setServiceFee(Number(data.fee || data.service_fee || data || 0));
    } catch (e) {
      console.error('Erreur frais service:', e);
      setServiceFee(500); // fallback
    } finally {
      setLoadingFee(false);
    }
  };

  const grandTotal = totalEstimated + serviceFee;

  const handleConfirm = async () => {
    if (!selectedAddress) {
      Alert.alert('Adresse manquante', 'Veuillez s\u00e9lectionner une adresse de livraison.');
      return;
    }

    if (paymentMethod === 'mobile_money' && !mobilePhone.trim()) {
      Alert.alert('T\u00e9l\u00e9phone manquant', 'Veuillez saisir votre num\u00e9ro de t\u00e9l\u00e9phone pour le paiement mobile.');
      return;
    }

    setLoading(true);
    try {
      const orderData = {
        items: items.map(item => ({
          name: item.name,
          quantity: item.quantity,
          estimated_price: Number(item.estimatedPrice) || 0,
          note: item.note || null,
        })),
        delivery_address_id: selectedAddress.id,
        delivery_address: selectedAddress.address,
        payment_method: paymentMethod,
        phone: paymentMethod === 'mobile_money' ? mobilePhone.trim() : null,
        mobile_method: paymentMethod === 'mobile_money' ? mobileMethod : null,
      };

      const result = await marketService.createOrder(orderData);
      const order = result.order || result;

      clearList();
      navigation.replace('MarketOrderDetail', { orderId: order.id });
    } catch (e) {
      const msg = e.response?.data?.message || 'Une erreur est survenue lors de la cr\u00e9ation de la commande.';
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
          <Text style={styles.backText}>{'\u2190'}</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>R\u00e9capitulatif</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 16, paddingBottom: 140 }}>
        {/* Items list */}
        <Text style={styles.sectionTitle}>
          <Ionicons name="list-outline" size={16} color={COLORS.text} /> Articles ({items.length})
        </Text>
        <View style={styles.itemsCard}>
          {items.map((item, idx) => (
            <View key={item.id} style={[styles.itemRow, idx < items.length - 1 && styles.itemRowBorder]}>
              <View style={{ flex: 1 }}>
                <Text style={styles.itemName}>{item.name}</Text>
                {item.quantity ? <Text style={styles.itemQuantity}>{item.quantity}</Text> : null}
                {item.note ? <Text style={styles.itemNote}>{item.note}</Text> : null}
              </View>
              <Text style={styles.itemPrice}>
                {Number(item.estimatedPrice || 0).toLocaleString('fr-FR')} XAF
              </Text>
            </View>
          ))}
        </View>

        {/* Delivery address */}
        <Text style={[styles.sectionTitle, { marginTop: 20 }]}>
          <Ionicons name="location-outline" size={16} color={COLORS.text} /> Adresse de livraison
        </Text>
        {loadingAddresses ? (
          <ActivityIndicator color={COLORS.primary} style={{ marginVertical: 16 }} />
        ) : addresses.length === 0 ? (
          <View style={styles.noAddressCard}>
            <Text style={styles.noAddressText}>Aucune adresse enregistr\u00e9e</Text>
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
                  {addr.phone && (
                    <Text style={styles.addressPhone}>
                      <Ionicons name="call-outline" size={12} color={COLORS.gray} /> {addr.phone}
                    </Text>
                  )}
                  {addr.is_default && <Text style={styles.defaultBadge}>Par d\u00e9faut</Text>}
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

        {/* Service fee */}
        <Text style={[styles.sectionTitle, { marginTop: 20 }]}>
          <Ionicons name="bicycle-outline" size={16} color={COLORS.text} /> Frais de course
        </Text>
        <View style={styles.feeCard}>
          {loadingFee ? (
            <ActivityIndicator color={COLORS.primary} />
          ) : (
            <View style={styles.feeRow}>
              <Text style={styles.feeLabel}>Commission du coursier</Text>
              <Text style={styles.feeValue}>{serviceFee.toLocaleString('fr-FR')} XAF</Text>
            </View>
          )}
        </View>

        {/* Total */}
        <View style={styles.totalCard}>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Budget articles</Text>
            <Text style={styles.totalValue}>~{totalEstimated.toLocaleString('fr-FR')} XAF</Text>
          </View>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Frais de course</Text>
            <Text style={styles.totalValue}>{serviceFee.toLocaleString('fr-FR')} XAF</Text>
          </View>
          <View style={styles.totalDivider} />
          <View style={styles.totalRow}>
            <Text style={styles.totalFinalLabel}>Total estim\u00e9</Text>
            <Text style={styles.totalFinalValue}>~{grandTotal.toLocaleString('fr-FR')} XAF</Text>
          </View>
        </View>

        {/* Payment method */}
        <Text style={[styles.sectionTitle, { marginTop: 20 }]}>
          <Ionicons name="card-outline" size={16} color={COLORS.text} /> Mode de paiement
        </Text>
        {PAYMENT_OPTIONS.map(pm => (
          <TouchableOpacity
            key={pm.key}
            style={[styles.payCard, paymentMethod === pm.key && styles.payCardSelected]}
            onPress={() => setPaymentMethod(pm.key)}
          >
            <Ionicons name={pm.iconName} size={24} color={paymentMethod === pm.key ? COLORS.primary : COLORS.gray} />
            <View style={{ flex: 1 }}>
              <Text style={styles.payLabel}>{pm.label}</Text>
              <Text style={styles.payDesc}>{pm.desc}</Text>
            </View>
            <View style={[styles.radioOuter, paymentMethod === pm.key && styles.radioOuterSelected]}>
              {paymentMethod === pm.key && <View style={styles.radioInner} />}
            </View>
          </TouchableOpacity>
        ))}

        {/* Mobile Money details */}
        {paymentMethod === 'mobile_money' && (
          <View style={styles.mobilePayCard}>
            <Text style={styles.mobilePayTitle}>D\u00e9tails du paiement mobile</Text>

            <View style={styles.mobileMethodRow}>
              {MOBILE_METHODS.map(m => (
                <TouchableOpacity
                  key={m.key}
                  style={[styles.mobileMethodBtn, mobileMethod === m.key && { borderColor: COLORS.primary }]}
                  onPress={() => setMobileMethod(m.key)}
                >
                  <View style={[styles.radioSmall, mobileMethod === m.key && styles.radioSmallSelected]}>
                    {mobileMethod === m.key && <View style={styles.radioSmallInner} />}
                  </View>
                  <Text style={[styles.mobileMethodLabel, mobileMethod === m.key && { color: COLORS.primary, fontWeight: '700' }]}>
                    {m.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <TextInput
              style={styles.phoneInput}
              placeholder="Num\u00e9ro de t\u00e9l\u00e9phone (ex: 6XXXXXXXX)"
              value={mobilePhone}
              onChangeText={setMobilePhone}
              placeholderTextColor="#aaa"
              keyboardType="phone-pad"
            />
          </View>
        )}
      </ScrollView>

      {/* Footer */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.confirmBtn, loading && { opacity: 0.7 }]}
          onPress={handleConfirm}
          disabled={loading}
        >
          {loading
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.confirmBtnText}>Confirmer la commande</Text>
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

  // Items
  itemsCard: { backgroundColor: COLORS.card, borderRadius: 16, padding: 16, marginBottom: 4 },
  itemRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10 },
  itemRowBorder: { borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  itemName: { fontSize: 14, fontWeight: '600', color: COLORS.text },
  itemQuantity: { fontSize: 13, color: COLORS.gray, marginTop: 2 },
  itemNote: { fontSize: 12, color: COLORS.primary, fontStyle: 'italic', marginTop: 2 },
  itemPrice: { fontSize: 14, fontWeight: '700', color: COLORS.text, marginLeft: 12 },

  // Address
  noAddressCard: {
    backgroundColor: COLORS.card, borderRadius: 16, padding: 20,
    alignItems: 'center', marginBottom: 8,
  },
  noAddressText:    { color: COLORS.gray, marginBottom: 12 },
  addAddressBtn:    { backgroundColor: COLORS.primary, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 10 },
  addAddressBtnText: { color: '#fff', fontWeight: '600' },
  addressCard: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.card,
    borderRadius: 14, padding: 14, marginBottom: 8,
    borderWidth: 1.5, borderColor: 'transparent',
  },
  addressCardSelected: { borderColor: COLORS.primary },
  addressRadio: { marginRight: 12 },
  radioOuter: {
    width: 20, height: 20, borderRadius: 10,
    borderWidth: 2, borderColor: '#ccc', justifyContent: 'center', alignItems: 'center',
  },
  radioOuterSelected: { borderColor: COLORS.primary },
  radioInner: { width: 10, height: 10, borderRadius: 5, backgroundColor: COLORS.primary },
  addressLabel: { fontSize: 13, fontWeight: '700', color: COLORS.text },
  addressValue: { fontSize: 13, color: COLORS.gray, marginTop: 2 },
  addressPhone: { fontSize: 12, color: COLORS.primary, fontWeight: '600', marginTop: 2 },
  defaultBadge: { fontSize: 11, color: COLORS.primary, fontWeight: '600', marginTop: 4 },
  addMoreAddress: { marginBottom: 4 },
  addMoreAddressText: { color: COLORS.primary, fontWeight: '600', fontSize: 14 },

  // Fee
  feeCard: { backgroundColor: COLORS.card, borderRadius: 16, padding: 16, marginBottom: 4 },
  feeRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  feeLabel: { fontSize: 14, color: COLORS.text },
  feeValue: { fontSize: 14, fontWeight: '700', color: COLORS.text },

  // Total
  totalCard: { backgroundColor: COLORS.card, borderRadius: 16, padding: 16, marginTop: 12 },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  totalLabel: { fontSize: 14, color: COLORS.gray },
  totalValue: { fontSize: 14, color: COLORS.text, fontWeight: '600' },
  totalDivider: { height: 1, backgroundColor: '#f0f0f0', marginVertical: 8 },
  totalFinalLabel: { fontSize: 16, fontWeight: 'bold', color: COLORS.text },
  totalFinalValue: { fontSize: 18, fontWeight: '800', color: COLORS.primary },

  // Payment
  payCard: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.card,
    borderRadius: 14, padding: 14, marginBottom: 8,
    borderWidth: 1.5, borderColor: 'transparent',
  },
  payCardSelected: { borderColor: COLORS.primary },
  payLabel: { fontSize: 14, fontWeight: '700', color: COLORS.text },
  payDesc: { fontSize: 12, color: COLORS.gray, marginTop: 2 },

  // Mobile money
  mobilePayCard: {
    backgroundColor: COLORS.card, borderRadius: 14, padding: 16,
    borderWidth: 1.5, borderColor: COLORS.primary, marginTop: 4,
  },
  mobilePayTitle: { fontSize: 14, fontWeight: '700', color: COLORS.text, marginBottom: 12 },
  mobileMethodRow: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  mobileMethodBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#f9f9f9', borderRadius: 10, padding: 12,
    borderWidth: 1.5, borderColor: '#e5e7eb',
  },
  mobileMethodLabel: { fontSize: 13, color: COLORS.text },
  radioSmall: {
    width: 16, height: 16, borderRadius: 8,
    borderWidth: 2, borderColor: '#ccc', justifyContent: 'center', alignItems: 'center',
  },
  radioSmallSelected: { borderColor: COLORS.primary },
  radioSmallInner: { width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.primary },
  phoneInput: {
    backgroundColor: '#f9f9f9', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 14, color: COLORS.text, borderWidth: 1, borderColor: '#e0e0e0',
  },

  // Footer
  footer: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    padding: 16, paddingBottom: 32, backgroundColor: COLORS.card,
    borderTopWidth: 1, borderTopColor: '#f0f0f0',
  },
  confirmBtn: {
    backgroundColor: COLORS.primary, borderRadius: 16, paddingVertical: 16,
    alignItems: 'center',
    shadowColor: COLORS.primary, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 8, elevation: 6,
  },
  confirmBtnText: { color: '#fff', fontSize: 15, fontWeight: 'bold' },
});
