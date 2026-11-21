import { showAlert } from '../../utils/showAlert';
import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useMarket } from '../../context/MarketContext';
import { marketService } from '../../services/marketService';
import { profileService } from '../../services/profileService';
import { COLORS, FONTS, TYPE, RADIUS, SHADOWS, SCREEN_PADDING, formatPrice } from '../../theme';
import {
  Screen, ScreenHeader, Card, Input, Button, Badge, SectionHeader, Divider, EmptyState,
} from '../../components/ui';

const PAYMENT_OPTIONS = [
  { key: 'mobile_money', label: 'Payer maintenant (Mobile Money)', iconName: 'phone-portrait-outline', desc: 'MTN ou Orange Money' },
  { key: 'on_delivery',  label: 'Payer à la livraison',            iconName: 'cash-outline',           desc: 'Espèces à la réception' },
];

const MOBILE_METHODS = [
  { key: 'mtn',    label: 'MTN MoMo',     color: '#FFCC00' },
  { key: 'orange', label: 'Orange Money', color: '#FF6600' },
];

function Radio({ selected }) {
  return (
    <View style={[styles.radioOuter, selected && styles.radioOuterSelected]}>
      {selected ? <View style={styles.radioInner} /> : null}
    </View>
  );
}

function TotalRow({ label, value, strong }) {
  return (
    <View style={styles.totalRow}>
      <Text style={strong ? styles.totalFinalLabel : TYPE.bodyMuted}>{label}</Text>
      <Text style={strong ? styles.totalFinalValue : styles.totalValue}>{value}</Text>
    </View>
  );
}

export default function MarketOrderSummaryScreen({ navigation }) {
  const insets = useSafeAreaInsets();
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
      const list = Array.isArray(data) ? data : (data?.data || []);
      setAddresses(list);
      const def = list.find(a => a.is_default) || list[0];
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
      const raw = typeof data === 'object' && data !== null ? (data.fee ?? data.service_fee) : data;
      const fee = Number(raw);
      setServiceFee(Number.isFinite(fee) ? fee : 500);
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
      showAlert('Adresse manquante', 'Veuillez sélectionner une adresse de livraison.');
      return;
    }

    if (paymentMethod === 'mobile_money' && !mobilePhone.trim()) {
      showAlert('Téléphone manquant', 'Veuillez saisir votre numéro de téléphone pour le paiement mobile.');
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
      const msg = e.response?.data?.message || 'Une erreur est survenue lors de la création de la commande.';
      showAlert('Erreur', msg);
    } finally {
      setLoading(false);
    }
  };

  const goAddAddress = () => navigation.navigate('AddAddress', { onSave: loadAddresses });

  return (
    <Screen>
      <ScreenHeader title="Récapitulatif" subtitle="Commande marché" onBack={() => navigation.goBack()} />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' && !Platform.isPad ? 'padding' : undefined}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.scroll}
        >
          {/* Items list */}
          <SectionHeader title={`Articles (${items.length})`} style={styles.section} actionLabel="Modifier" onAction={() => navigation.goBack()} />
          <Card>
            {items.length === 0 ? (
              <Text style={TYPE.bodyMuted}>Votre liste est vide.</Text>
            ) : items.map((item, idx) => (
              <View key={`${item.id}-${idx}`}>
                {idx > 0 ? <Divider /> : null}
                <View style={styles.itemRow}>
                  <View style={styles.itemDot}>
                    <Ionicons name="leaf-outline" size={14} color={COLORS.success} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={TYPE.title}>{item.name}</Text>
                    {item.quantity ? <Text style={TYPE.caption}>{item.quantity}</Text> : null}
                    {item.note ? <Text style={styles.itemNote}>« {item.note} »</Text> : null}
                  </View>
                  <Text style={styles.itemPrice}>{formatPrice(item.estimatedPrice)}</Text>
                </View>
              </View>
            ))}
          </Card>

          {/* Delivery address */}
          <SectionHeader title="Adresse de livraison" style={styles.section} />
          {loadingAddresses ? (
            <ActivityIndicator color={COLORS.primary} style={{ marginVertical: 16 }} />
          ) : addresses.length === 0 ? (
            <Card padded={false}>
              <EmptyState
                icon="location-outline"
                title="Aucune adresse enregistrée"
                message="Ajoutez une adresse pour recevoir vos courses."
                actionLabel="Ajouter une adresse"
                onAction={goAddAddress}
                style={{ paddingVertical: 24 }}
              />
            </Card>
          ) : (
            <>
              {addresses.map(addr => {
                const selected = selectedAddress?.id === addr.id;
                return (
                  <TouchableOpacity
                    key={addr.id}
                    style={[styles.optionCard, selected && styles.optionCardSelected]}
                    onPress={() => setSelectedAddress(addr)}
                    activeOpacity={0.85}
                  >
                    <View style={[styles.optionIcon, selected && { backgroundColor: COLORS.primary }]}>
                      <Ionicons name="location" size={18} color={selected ? COLORS.white : COLORS.primary} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <View style={styles.addrTitleRow}>
                        <Text style={TYPE.title}>{addr.label || 'Adresse'}</Text>
                        {addr.is_default ? <Badge label="Par défaut" /> : null}
                      </View>
                      <Text style={TYPE.caption} numberOfLines={2}>{addr.address}</Text>
                      {addr.phone ? (
                        <View style={styles.addrPhone}>
                          <Ionicons name="call-outline" size={12} color={COLORS.primary} />
                          <Text style={styles.addrPhoneText}>{addr.phone}</Text>
                        </View>
                      ) : null}
                    </View>
                    <Radio selected={selected} />
                  </TouchableOpacity>
                );
              })}
              <TouchableOpacity style={styles.addMoreAddress} onPress={goAddAddress}>
                <Ionicons name="add-circle-outline" size={18} color={COLORS.primary} />
                <Text style={styles.linkText}>Nouvelle adresse</Text>
              </TouchableOpacity>
            </>
          )}

          {/* Payment method */}
          <SectionHeader title="Mode de paiement" style={styles.section} />
          {PAYMENT_OPTIONS.map(pm => {
            const selected = paymentMethod === pm.key;
            return (
              <TouchableOpacity
                key={pm.key}
                style={[styles.optionCard, selected && styles.optionCardSelected]}
                onPress={() => setPaymentMethod(pm.key)}
                activeOpacity={0.85}
              >
                <View style={[styles.optionIcon, selected && { backgroundColor: COLORS.primary }]}>
                  <Ionicons name={pm.iconName} size={18} color={selected ? COLORS.white : COLORS.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={TYPE.title}>{pm.label}</Text>
                  <Text style={TYPE.caption}>{pm.desc}</Text>
                </View>
                <Radio selected={selected} />
              </TouchableOpacity>
            );
          })}

          {/* Mobile Money details */}
          {paymentMethod === 'mobile_money' && (
            <Card style={styles.mobilePayCard}>
              <Text style={[TYPE.title, { marginBottom: 12 }]}>Détails du paiement mobile</Text>
              <View style={styles.mobileMethodRow}>
                {MOBILE_METHODS.map(m => {
                  const selected = mobileMethod === m.key;
                  return (
                    <TouchableOpacity
                      key={m.key}
                      style={[styles.mobileMethodBtn, selected && styles.mobileMethodBtnSelected]}
                      onPress={() => setMobileMethod(m.key)}
                      activeOpacity={0.85}
                    >
                      <View style={[styles.operatorDot, { backgroundColor: m.color }]} />
                      <Text style={[styles.mobileMethodLabel, selected && { color: COLORS.primary, fontFamily: FONTS.semibold }]}>
                        {m.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
              <Input
                icon="call-outline"
                label="Numéro de téléphone"
                placeholder="Ex : 6XXXXXXXX"
                value={mobilePhone}
                onChangeText={setMobilePhone}
                keyboardType="phone-pad"
              />
            </Card>
          )}

          {/* Total */}
          <SectionHeader title="Résumé" style={styles.section} />
          <Card>
            <TotalRow label="Budget articles" value={`~${formatPrice(totalEstimated)}`} />
            <TotalRow
              label="Frais de course (coursier)"
              value={loadingFee ? '…' : formatPrice(serviceFee)}
            />
            <Divider style={{ marginVertical: 10 }} />
            <TotalRow label="Total estimé" value={`~${formatPrice(grandTotal)}`} strong />
            <View style={styles.infoNote}>
              <Ionicons name="information-circle-outline" size={16} color={COLORS.info} />
              <Text style={styles.infoNoteText}>
                Le montant final dépend des prix réels au marché. Vous validerez les articles en photo avant l'achat.
              </Text>
            </View>
          </Card>
        </ScrollView>

        {/* Footer */}
        <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 16) }]}>
          <View style={styles.footerInfo}>
            <Text style={TYPE.bodyMuted}>Total estimé</Text>
            <Text style={styles.totalFinalValue}>~{formatPrice(grandTotal)}</Text>
          </View>
          <Button
            title="Confirmer la commande"
            icon="checkmark-circle-outline"
            onPress={handleConfirm}
            loading={loading}
            disabled={items.length === 0}
          />
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingHorizontal: SCREEN_PADDING, paddingTop: 8, paddingBottom: 24 },
  section: { paddingHorizontal: 0, marginTop: 22, marginBottom: 12 },

  // Items
  itemRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10 },
  itemDot: {
    width: 30, height: 30, borderRadius: 15, backgroundColor: COLORS.successSoft,
    alignItems: 'center', justifyContent: 'center',
  },
  itemNote: { fontFamily: FONTS.regular, fontSize: 12, color: COLORS.primary, fontStyle: 'italic', marginTop: 2 },
  itemPrice: { fontFamily: FONTS.semibold, fontSize: 14, color: COLORS.text },

  // Options (address / payment)
  optionCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: COLORS.surface, borderRadius: RADIUS.lg, padding: 14, marginBottom: 10,
    borderWidth: 1.5, borderColor: 'transparent', ...SHADOWS.sm,
  },
  optionCardSelected: { borderColor: COLORS.primary, backgroundColor: '#FFFBF8' },
  optionIcon: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.primarySoft,
    alignItems: 'center', justifyContent: 'center',
  },
  addrTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  addrPhone: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  addrPhoneText: { fontFamily: FONTS.medium, fontSize: 12, color: COLORS.primary },
  addMoreAddress: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 4 },
  linkText: { fontFamily: FONTS.semibold, fontSize: 14, color: COLORS.primary },

  radioOuter: {
    width: 22, height: 22, borderRadius: 11,
    borderWidth: 2, borderColor: COLORS.border, justifyContent: 'center', alignItems: 'center',
  },
  radioOuterSelected: { borderColor: COLORS.primary },
  radioInner: { width: 11, height: 11, borderRadius: 6, backgroundColor: COLORS.primary },

  // Mobile money
  mobilePayCard: { marginTop: 2, borderWidth: 1.5, borderColor: COLORS.primaryLight },
  mobileMethodRow: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  mobileMethodBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: COLORS.bg, borderRadius: RADIUS.md, padding: 12,
    borderWidth: 1.5, borderColor: COLORS.border,
  },
  mobileMethodBtnSelected: { borderColor: COLORS.primary, backgroundColor: COLORS.primarySoft },
  operatorDot: { width: 14, height: 14, borderRadius: 7 },
  mobileMethodLabel: { fontFamily: FONTS.medium, fontSize: 13, color: COLORS.text },

  // Total
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 4 },
  totalValue: { fontFamily: FONTS.semibold, fontSize: 14, color: COLORS.text },
  totalFinalLabel: { fontFamily: FONTS.semibold, fontSize: 16, color: COLORS.text },
  totalFinalValue: { fontFamily: FONTS.bold, fontSize: 19, color: COLORS.primary },
  infoNote: {
    flexDirection: 'row', gap: 8, marginTop: 12, padding: 10,
    backgroundColor: COLORS.infoSoft, borderRadius: RADIUS.md,
  },
  infoNoteText: { flex: 1, fontFamily: FONTS.regular, fontSize: 12, lineHeight: 17, color: COLORS.info },

  // Footer
  footer: {
    paddingHorizontal: SCREEN_PADDING, paddingTop: 14, backgroundColor: COLORS.surface,
    borderTopLeftRadius: RADIUS.xl, borderTopRightRadius: RADIUS.xl, ...SHADOWS.lg,
  },
  footerInfo: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
});
