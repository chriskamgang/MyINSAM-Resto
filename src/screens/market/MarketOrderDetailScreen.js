import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  SafeAreaView, ActivityIndicator, Alert, RefreshControl,
  Image, TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { marketService } from '../../services/marketService';

const COLORS = { primary: '#FF6B35', bg: '#f8f8f8', card: '#fff', text: '#1a1a1a', gray: '#888' };

const STATUS_STEPS = [
  { key: 'pending',     label: 'En attente',         iconName: 'time-outline',                desc: 'Votre commande est en attente de traitement' },
  { key: 'assigned',    label: 'Coursier assign\u00e9',   iconName: 'person-outline',              desc: 'Un coursier a \u00e9t\u00e9 assign\u00e9 \u00e0 votre commande' },
  { key: 'at_market',   label: 'Au march\u00e9',          iconName: 'storefront-outline',          desc: 'Le coursier est au march\u00e9' },
  { key: 'photos_sent', label: 'Photos envoy\u00e9es',    iconName: 'camera-outline',              desc: 'Le coursier a envoy\u00e9 des photos des articles' },
  { key: 'validated',   label: 'Valid\u00e9',              iconName: 'checkmark-circle-outline',    desc: 'Vous avez valid\u00e9 les achats' },
  { key: 'purchasing',  label: 'Achats en cours',     iconName: 'cart-outline',                desc: 'Le coursier proc\u00e8de aux achats' },
  { key: 'delivering',  label: 'En livraison',        iconName: 'bicycle-outline',             desc: 'Vos courses sont en route' },
  { key: 'delivered',   label: 'Livr\u00e9',               iconName: 'checkmark-done-circle-outline', desc: 'Vos courses ont \u00e9t\u00e9 livr\u00e9es' },
];

const STATUS_CONFIG = {
  pending:      { color: '#f59e0b', bg: '#fef3c7' },
  assigned:     { color: '#3b82f6', bg: '#dbeafe' },
  at_market:    { color: '#8b5cf6', bg: '#ede9fe' },
  photos_sent:  { color: '#FF6B35', bg: '#FFF3E0' },
  validated:    { color: '#14b8a6', bg: '#ccfbf1' },
  purchasing:   { color: '#6366f1', bg: '#e0e7ff' },
  delivering:   { color: '#FF6B35', bg: '#FFF3E0' },
  delivered:    { color: '#22c55e', bg: '#f0fdf4' },
  cancelled:    { color: '#ef4444', bg: '#fee2e2' },
};

const PAYMENT_LABELS = {
  mobile_money: 'Mobile Money',
  on_delivery: 'Paiement \u00e0 la livraison',
};

export default function MarketOrderDetailScreen({ route, navigation }) {
  const { orderId } = route.params;
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [validating, setValidating] = useState(false);
  const [showChangeInput, setShowChangeInput] = useState(false);
  const [changeNote, setChangeNote] = useState('');
  const intervalRef = useRef(null);

  const loadOrder = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const data = await marketService.getOrder(orderId);
      setOrder(data);
    } catch (e) {
      if (!silent) {
        Alert.alert('Erreur', 'Impossible de charger la commande.');
        navigation.goBack();
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [orderId]);

  // Auto-refresh every 10 seconds
  useFocusEffect(useCallback(() => {
    loadOrder();
    intervalRef.current = setInterval(() => loadOrder(true), 10000);
    return () => clearInterval(intervalRef.current);
  }, [loadOrder]));

  const onRefresh = () => { setRefreshing(true); loadOrder(); };

  const handleValidatePhotos = async (approved) => {
    if (!approved && !changeNote.trim()) {
      Alert.alert('Note requise', 'Veuillez indiquer les changements souhait\u00e9s.');
      return;
    }

    setValidating(true);
    try {
      await marketService.validatePhotos(orderId, {
        approved,
        note: approved ? null : changeNote.trim(),
      });
      setShowChangeInput(false);
      setChangeNote('');
      Alert.alert('Succ\u00e8s', approved ? 'Achats valid\u00e9s !' : 'Demande de changement envoy\u00e9e.');
      loadOrder();
    } catch (e) {
      Alert.alert('Erreur', e.response?.data?.message || 'Une erreur est survenue.');
    } finally {
      setValidating(false);
    }
  };

  const handleCancel = () => {
    Alert.alert(
      'Annuler la commande',
      'Voulez-vous vraiment annuler cette commande march\u00e9 ?',
      [
        { text: 'Non', style: 'cancel' },
        {
          text: 'Annuler la commande', style: 'destructive',
          onPress: async () => {
            try {
              await marketService.cancelOrder(orderId);
              loadOrder();
            } catch (e) {
              Alert.alert('Erreur', e.response?.data?.message || 'Impossible d\'annuler la commande.');
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return <View style={styles.loader}><ActivityIndicator size="large" color={COLORS.primary} /></View>;
  }

  if (!order) return null;

  const statusConf = STATUS_CONFIG[order.status] || { color: COLORS.gray, bg: '#f0f0f0' };
  const currentStepIdx = STATUS_STEPS.findIndex(s => s.key === order.status);
  const currentStep = STATUS_STEPS[Math.max(currentStepIdx, 0)];
  const canCancel = ['pending', 'assigned'].includes(order.status);
  const canTrack = ['assigned', 'at_market', 'purchasing', 'delivering'].includes(order.status);
  const isPhotoValidation = order.status === 'photos_sent';

  const date = new Date(order.created_at).toLocaleString('fr-FR', {
    day: '2-digit', month: 'long', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });

  const photos = order.photos || order.courier_photos || [];

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.backText}>{'\u2190'}</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>March\u00e9 #{order.order_number || order.id}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
      >
        {/* Status banner */}
        <View style={[styles.statusCard, { backgroundColor: statusConf.bg }]}>
          <Text style={[styles.statusLabel, { color: statusConf.color }]}>
            <Ionicons name={currentStep.iconName} size={16} color={statusConf.color} /> {currentStep.label}
          </Text>
          <Text style={styles.statusDate}>{date}</Text>
        </View>

        {/* Timeline */}
        {order.status !== 'cancelled' && (
          <View style={styles.timelineCard}>
            <Text style={styles.timelineTitle}>Progression</Text>
            {STATUS_STEPS.map((step, idx) => {
              const isDone = idx <= currentStepIdx;
              const isCurrent = idx === currentStepIdx;
              return (
                <View key={step.key} style={styles.timelineItem}>
                  <View style={styles.timelineLeft}>
                    <View style={[
                      styles.timelineDot,
                      isDone && styles.timelineDotDone,
                      isCurrent && styles.timelineDotCurrent,
                    ]}>
                      {isDone && (
                        <Ionicons
                          name={isCurrent ? step.iconName : 'checkmark'}
                          size={12}
                          color={isCurrent ? '#fff' : '#16a34a'}
                        />
                      )}
                    </View>
                    {idx < STATUS_STEPS.length - 1 && (
                      <View style={[styles.timelineLine, isDone && idx < currentStepIdx && styles.timelineLineDone]} />
                    )}
                  </View>
                  <View style={styles.timelineContent}>
                    <Text style={[
                      styles.stepLabel,
                      isCurrent && { color: COLORS.primary, fontWeight: '700' },
                      !isDone && { color: '#ccc' },
                    ]}>
                      {step.label}
                    </Text>
                    {isCurrent && <Text style={styles.stepDesc}>{step.desc}</Text>}
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {/* Cancelled status */}
        {order.status === 'cancelled' && (
          <View style={[styles.statusCard, { backgroundColor: '#fee2e2', marginBottom: 16 }]}>
            <Ionicons name="close-circle" size={32} color="#ef4444" />
            <Text style={{ fontSize: 16, fontWeight: '700', color: '#ef4444', marginTop: 8 }}>Commande annul\u00e9e</Text>
          </View>
        )}

        {/* Photo validation section */}
        {isPhotoValidation && photos.length > 0 && (
          <View style={styles.photosCard}>
            <Text style={styles.photosTitle}>
              <Ionicons name="camera-outline" size={16} color={COLORS.text} /> Photos du coursier
            </Text>
            <Text style={styles.photosSubtitle}>V\u00e9rifiez les articles avant l'achat</Text>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.photosScroll}>
              {photos.map((photo, idx) => (
                <Image
                  key={idx}
                  source={{ uri: photo.url || photo }}
                  style={styles.photoImage}
                  resizeMode="cover"
                />
              ))}
            </ScrollView>

            {!showChangeInput ? (
              <View style={styles.photoActions}>
                <TouchableOpacity
                  style={styles.validateBtn}
                  onPress={() => handleValidatePhotos(true)}
                  disabled={validating}
                >
                  {validating ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <>
                      <Ionicons name="checkmark-circle-outline" size={18} color="#fff" />
                      <Text style={styles.validateBtnText}>Valider les achats</Text>
                    </>
                  )}
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.changeBtn}
                  onPress={() => setShowChangeInput(true)}
                >
                  <Ionicons name="create-outline" size={18} color="#FF6B35" />
                  <Text style={styles.changeBtnText}>Demander un changement</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.changeInputSection}>
                <Text style={styles.changeInputLabel}>D\u00e9crivez les changements souhait\u00e9s :</Text>
                <TextInput
                  style={styles.changeInput}
                  placeholder="Ex: Remplacez les tomates par des poivrons..."
                  value={changeNote}
                  onChangeText={setChangeNote}
                  placeholderTextColor="#aaa"
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                />
                <View style={styles.changeInputActions}>
                  <TouchableOpacity
                    style={styles.changeSubmitBtn}
                    onPress={() => handleValidatePhotos(false)}
                    disabled={validating}
                  >
                    {validating ? (
                      <ActivityIndicator color="#fff" size="small" />
                    ) : (
                      <Text style={styles.changeSubmitBtnText}>Envoyer</Text>
                    )}
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.changeCancelBtn}
                    onPress={() => { setShowChangeInput(false); setChangeNote(''); }}
                  >
                    <Text style={styles.changeCancelBtnText}>Annuler</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>
        )}

        {/* Items */}
        <Text style={styles.sectionTitle}>Articles command\u00e9s</Text>
        <View style={styles.itemsCard}>
          {order.items?.map((item, idx) => (
            <View key={idx} style={[styles.itemRow, idx < order.items.length - 1 && styles.itemRowBorder]}>
              <View style={{ flex: 1 }}>
                <Text style={styles.itemName}>{item.name}</Text>
                {item.quantity && <Text style={styles.itemQuantity}>{item.quantity}</Text>}
                {item.note && <Text style={styles.itemNote}>{item.note}</Text>}
              </View>
              <Text style={styles.itemPrice}>
                ~{Number(item.estimated_price || item.estimatedPrice || 0).toLocaleString('fr-FR')} XAF
              </Text>
            </View>
          ))}
        </View>

        {/* Totals */}
        <View style={styles.totalsCard}>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Budget estim\u00e9</Text>
            <Text style={styles.totalValue}>
              ~{Number(order.total_estimated || 0).toLocaleString('fr-FR')} XAF
            </Text>
          </View>
          {order.service_fee > 0 && (
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Frais de course</Text>
              <Text style={styles.totalValue}>{Number(order.service_fee).toLocaleString('fr-FR')} XAF</Text>
            </View>
          )}
          {order.total_final > 0 && (
            <>
              <View style={styles.totalDivider} />
              <View style={styles.totalRow}>
                <Text style={styles.totalFinalLabel}>Total final</Text>
                <Text style={styles.totalFinalValue}>
                  {Number(order.total_final).toLocaleString('fr-FR')} XAF
                </Text>
              </View>
            </>
          )}
        </View>

        {/* Payment info */}
        <Text style={styles.sectionTitle}>Informations</Text>
        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <Ionicons name="card-outline" size={18} color={COLORS.primary} style={{ marginRight: 10 }} />
            <View>
              <Text style={styles.infoLabel}>Paiement</Text>
              <Text style={styles.infoValue}>
                {PAYMENT_LABELS[order.payment_method] || order.payment_method}
                {order.payment_status ? ` (${order.payment_status})` : ''}
              </Text>
            </View>
          </View>

          {order.address && (
            <View style={styles.infoRow}>
              <Ionicons name="location-outline" size={18} color={COLORS.primary} style={{ marginRight: 10 }} />
              <View>
                <Text style={styles.infoLabel}>Adresse de livraison</Text>
                <Text style={styles.infoValue}>{order.address.address || order.delivery_address}</Text>
              </View>
            </View>
          )}

          {/* Courier info */}
          {order.courier && (
            <View style={styles.infoRow}>
              <Ionicons name="person-outline" size={18} color={COLORS.primary} style={{ marginRight: 10 }} />
              <View>
                <Text style={styles.infoLabel}>Coursier</Text>
                <Text style={styles.infoValue}>{order.courier.name}</Text>
                {order.courier.phone && (
                  <Text style={styles.infoPhone}>
                    <Ionicons name="call-outline" size={12} color={COLORS.primary} /> {order.courier.phone}
                  </Text>
                )}
              </View>
            </View>
          )}
        </View>

        {/* Actions */}
        <View style={styles.actions}>
          {canTrack && (
            <TouchableOpacity
              style={styles.trackBtn}
              onPress={() => navigation.navigate('MarketOrderTracking', { orderId: order.id })}
            >
              <Ionicons name="location" size={16} color="#fff" />
              <Text style={styles.trackBtnText}> Suivre la livraison</Text>
            </TouchableOpacity>
          )}
          {canCancel && (
            <TouchableOpacity style={styles.cancelBtn} onPress={handleCancel}>
              <Text style={styles.cancelBtnText}>Annuler la commande</Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  loader:    { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12,
    backgroundColor: COLORS.card, borderBottomWidth: 1, borderBottomColor: '#f0f0f0',
  },
  backBtn:     { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  backText:    { fontSize: 24, color: COLORS.text },
  headerTitle: { fontSize: 16, fontWeight: 'bold', color: COLORS.text },

  statusCard:  { borderRadius: 16, padding: 16, marginBottom: 16, alignItems: 'center' },
  statusLabel: { fontSize: 18, fontWeight: 'bold', marginBottom: 4 },
  statusDate:  { fontSize: 13, color: COLORS.gray },

  // Timeline
  timelineCard:    { backgroundColor: COLORS.card, borderRadius: 16, padding: 16, marginBottom: 16 },
  timelineTitle:   { fontSize: 15, fontWeight: '700', color: COLORS.text, marginBottom: 16 },
  timelineItem:    { flexDirection: 'row', alignItems: 'flex-start' },
  timelineLeft:    { alignItems: 'center', marginRight: 12, width: 24 },
  timelineDot: {
    width: 22, height: 22, borderRadius: 11,
    backgroundColor: '#e5e7eb', justifyContent: 'center', alignItems: 'center',
  },
  timelineDotDone:    { backgroundColor: '#d1fae5' },
  timelineDotCurrent: { backgroundColor: COLORS.primary },
  timelineLine:       { width: 2, height: 28, backgroundColor: '#e5e7eb', marginVertical: 2 },
  timelineLineDone:   { backgroundColor: '#86efac' },
  timelineContent:    { flex: 1, paddingBottom: 28 },
  stepLabel:  { fontSize: 14, color: COLORS.text },
  stepDesc:   { fontSize: 12, color: COLORS.gray, marginTop: 3 },

  // Photos
  photosCard: {
    backgroundColor: COLORS.card, borderRadius: 16, padding: 16, marginBottom: 16,
    borderWidth: 2, borderColor: '#FF6B35',
  },
  photosTitle:    { fontSize: 15, fontWeight: '700', color: COLORS.text, marginBottom: 4 },
  photosSubtitle: { fontSize: 13, color: COLORS.gray, marginBottom: 12 },
  photosScroll:   { marginBottom: 16 },
  photoImage: {
    width: 200, height: 200, borderRadius: 12, marginRight: 10,
    backgroundColor: '#f0f0f0',
  },
  photoActions: { gap: 10 },
  validateBtn: {
    backgroundColor: '#22c55e', borderRadius: 14, paddingVertical: 14,
    alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8,
  },
  validateBtnText: { color: '#fff', fontSize: 15, fontWeight: 'bold' },
  changeBtn: {
    borderRadius: 14, paddingVertical: 14, alignItems: 'center',
    flexDirection: 'row', justifyContent: 'center', gap: 8,
    borderWidth: 1.5, borderColor: '#FF6B35',
  },
  changeBtnText: { color: '#FF6B35', fontSize: 15, fontWeight: '600' },

  changeInputSection: { marginTop: 8 },
  changeInputLabel: { fontSize: 13, fontWeight: '600', color: COLORS.text, marginBottom: 8 },
  changeInput: {
    backgroundColor: '#f9f9f9', borderRadius: 12, padding: 14,
    fontSize: 14, color: COLORS.text, borderWidth: 1, borderColor: '#e0e0e0',
    minHeight: 80,
  },
  changeInputActions: { flexDirection: 'row', gap: 10, marginTop: 10 },
  changeSubmitBtn: {
    flex: 1, backgroundColor: '#FF6B35', borderRadius: 12, paddingVertical: 12,
    alignItems: 'center',
  },
  changeSubmitBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 14 },
  changeCancelBtn: {
    flex: 1, borderRadius: 12, paddingVertical: 12,
    alignItems: 'center', borderWidth: 1, borderColor: '#ccc',
  },
  changeCancelBtnText: { color: COLORS.gray, fontWeight: '600', fontSize: 14 },

  // Items
  sectionTitle: { fontSize: 15, fontWeight: '700', color: COLORS.text, marginBottom: 10, marginTop: 8 },
  itemsCard: { backgroundColor: COLORS.card, borderRadius: 16, padding: 16, marginBottom: 12 },
  itemRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10 },
  itemRowBorder: { borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  itemName: { fontSize: 14, fontWeight: '600', color: COLORS.text },
  itemQuantity: { fontSize: 13, color: COLORS.gray, marginTop: 2 },
  itemNote: { fontSize: 12, color: COLORS.primary, fontStyle: 'italic', marginTop: 2 },
  itemPrice: { fontSize: 14, fontWeight: '700', color: COLORS.text, marginLeft: 12 },

  // Totals
  totalsCard: { backgroundColor: COLORS.card, borderRadius: 16, padding: 16, marginBottom: 16 },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  totalLabel: { fontSize: 14, color: COLORS.gray },
  totalValue: { fontSize: 14, color: COLORS.text, fontWeight: '600' },
  totalDivider: { height: 1, backgroundColor: '#f0f0f0', marginVertical: 8 },
  totalFinalLabel: { fontSize: 16, fontWeight: 'bold', color: COLORS.text },
  totalFinalValue: { fontSize: 18, fontWeight: '800', color: COLORS.primary },

  // Info
  infoCard: { backgroundColor: COLORS.card, borderRadius: 16, padding: 16, marginBottom: 16, gap: 12 },
  infoRow:   { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  infoLabel: { fontSize: 12, color: COLORS.gray, marginBottom: 2 },
  infoValue: { fontSize: 14, color: COLORS.text, fontWeight: '500' },
  infoPhone: { fontSize: 13, color: COLORS.primary, fontWeight: '600', marginTop: 4 },

  // Actions
  actions: { gap: 10 },
  trackBtn: {
    backgroundColor: COLORS.primary, borderRadius: 14, paddingVertical: 14,
    alignItems: 'center', flexDirection: 'row', justifyContent: 'center',
    shadowColor: COLORS.primary, shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25, shadowRadius: 6, elevation: 4,
  },
  trackBtnText: { color: '#fff', fontSize: 15, fontWeight: 'bold' },
  cancelBtn: { borderRadius: 14, paddingVertical: 14, alignItems: 'center', borderWidth: 1.5, borderColor: '#ef4444' },
  cancelBtnText: { color: '#ef4444', fontSize: 15, fontWeight: '600' },
});
