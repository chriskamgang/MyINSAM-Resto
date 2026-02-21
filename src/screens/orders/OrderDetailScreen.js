import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  SafeAreaView, ActivityIndicator, Alert,
} from 'react-native';
import { orderService } from '../../services/orderService';

const COLORS = { primary: '#FF6B35', bg: '#f8f8f8', card: '#fff', text: '#1a1a1a', gray: '#888' };

const STATUS_STEPS = [
  { key: 'pending',    label: 'En attente',       icon: '⏳' },
  { key: 'confirmed',  label: 'Confirmée',         icon: '✅' },
  { key: 'preparing',  label: 'En préparation',    icon: '🍳' },
  { key: 'ready',      label: 'Prête',             icon: '📦' },
  { key: 'picked_up',  label: 'Récupérée',         icon: '🚚' },
  { key: 'on_the_way', label: 'En livraison',      icon: '🛵' },
  { key: 'delivered',  label: 'Livrée',            icon: '🏠' },
];

const STATUS_CONFIG = {
  pending:    { color: '#f59e0b', bg: '#fef3c7' },
  confirmed:  { color: '#3b82f6', bg: '#dbeafe' },
  preparing:  { color: '#8b5cf6', bg: '#ede9fe' },
  ready:      { color: '#10b981', bg: '#d1fae5' },
  picked_up:  { color: '#FF6B35', bg: '#FFF3E0' },
  on_the_way: { color: '#FF6B35', bg: '#FFF3E0' },
  delivered:  { color: '#22c55e', bg: '#f0fdf4' },
  cancelled:  { color: '#ef4444', bg: '#fee2e2' },
};

const PAYMENT_LABELS = {
  cash: 'Espèces',
  mtn_momo: 'MTN Mobile Money',
  orange_money: 'Orange Money',
};

export default function OrderDetailScreen({ route, navigation }) {
  const { orderId } = route.params;
  const [order, setOrder]   = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadOrder();
  }, [orderId]);

  const loadOrder = async () => {
    try {
      const data = await orderService.getOrder(orderId);
      setOrder(data);
    } catch (e) {
      Alert.alert('Erreur', 'Impossible de charger la commande.');
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    Alert.alert(
      'Annuler la commande',
      'Voulez-vous vraiment annuler cette commande ?',
      [
        { text: 'Non', style: 'cancel' },
        {
          text: 'Annuler la commande', style: 'destructive',
          onPress: async () => {
            try {
              await orderService.cancelOrder(orderId);
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
  const canCancel = ['pending', 'confirmed'].includes(order.status);
  const canTrack  = ['picked_up', 'on_the_way', 'ready'].includes(order.status);

  const date = new Date(order.created_at).toLocaleString('fr-FR', {
    day: '2-digit', month: 'long', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Commande #{order.order_number}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
        {/* Statut */}
        <View style={[styles.statusCard, { backgroundColor: statusConf.bg }]}>
          <Text style={[styles.statusLabel, { color: statusConf.color }]}>
            {STATUS_STEPS.find(s => s.key === order.status)?.icon} {' '}
            {STATUS_STEPS.find(s => s.key === order.status)?.label || order.status}
          </Text>
          <Text style={styles.statusDate}>{date}</Text>
        </View>

        {/* Timeline (seulement si pas annulée) */}
        {order.status !== 'cancelled' && (
          <View style={styles.timelineCard}>
            {STATUS_STEPS.map((step, idx) => {
              const isDone    = idx <= currentStepIdx;
              const isCurrent = idx === currentStepIdx;
              return (
                <View key={step.key} style={styles.timelineItem}>
                  <View style={styles.timelineLeft}>
                    <View style={[
                      styles.timelineDot,
                      isDone && styles.timelineDotDone,
                      isCurrent && styles.timelineDotCurrent,
                    ]}>
                      <Text style={styles.timelineDotText}>{isDone ? '✓' : ''}</Text>
                    </View>
                    {idx < STATUS_STEPS.length - 1 && (
                      <View style={[styles.timelineLine, isDone && idx < currentStepIdx && styles.timelineLineDone]} />
                    )}
                  </View>
                  <Text style={[
                    styles.timelineLabel,
                    isCurrent && { color: COLORS.primary, fontWeight: '700' },
                    !isDone && { color: '#ccc' },
                  ]}>
                    {step.icon} {step.label}
                  </Text>
                </View>
              );
            })}
          </View>
        )}

        {/* Articles */}
        <Text style={styles.sectionTitle}>Articles commandés</Text>
        <View style={styles.itemsCard}>
          {order.items?.map((item, idx) => (
            <View key={idx} style={[styles.itemRow, idx < order.items.length - 1 && styles.itemRowBorder]}>
              <Text style={styles.itemQty}>{item.quantity}×</Text>
              <Text style={styles.itemName}>{item.item_name || item.name}</Text>
              <Text style={styles.itemPrice}>
                {(Number(item.item_price || item.unit_price || 0) * item.quantity).toLocaleString('fr-FR')} XAF
              </Text>
            </View>
          ))}
        </View>

        {/* Totaux */}
        <View style={styles.totalsCard}>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Sous-total</Text>
            <Text style={styles.totalValue}>{Number(order.subtotal || 0).toLocaleString('fr-FR')} XAF</Text>
          </View>
          {order.delivery_fee > 0 && (
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Livraison</Text>
              <Text style={styles.totalValue}>{Number(order.delivery_fee).toLocaleString('fr-FR')} XAF</Text>
            </View>
          )}
          {order.discount_amount > 0 && (
            <View style={styles.totalRow}>
              <Text style={[styles.totalLabel, { color: '#22c55e' }]}>Réduction</Text>
              <Text style={[styles.totalValue, { color: '#22c55e' }]}>-{Number(order.discount_amount).toLocaleString('fr-FR')} XAF</Text>
            </View>
          )}
          <View style={[styles.totalRow, styles.totalRowFinal]}>
            <Text style={styles.totalFinalLabel}>Total</Text>
            <Text style={styles.totalFinalValue}>{Number(order.total || 0).toLocaleString('fr-FR')} XAF</Text>
          </View>
        </View>

        {/* Infos livraison */}
        <Text style={styles.sectionTitle}>Informations</Text>
        <View style={styles.infoCard}>
          {order.address && (
            <View style={styles.infoRow}>
              <Text style={styles.infoIcon}>📍</Text>
              <View>
                <Text style={styles.infoLabel}>Adresse de livraison</Text>
                <Text style={styles.infoValue}>{order.address.address}</Text>
              </View>
            </View>
          )}
          <View style={styles.infoRow}>
            <Text style={styles.infoIcon}>💳</Text>
            <View>
              <Text style={styles.infoLabel}>Paiement</Text>
              <Text style={styles.infoValue}>{PAYMENT_LABELS[order.payment_method] || order.payment_method}</Text>
            </View>
          </View>
          {order.special_instructions && (
            <View style={styles.infoRow}>
              <Text style={styles.infoIcon}>📝</Text>
              <View>
                <Text style={styles.infoLabel}>Note</Text>
                <Text style={styles.infoValue}>{order.special_instructions}</Text>
              </View>
            </View>
          )}
        </View>

        {/* Actions */}
        <View style={styles.actions}>
          {canTrack && (
            <TouchableOpacity
              style={styles.trackBtn}
              onPress={() => navigation.navigate('OrderTracking', { orderId: order.id })}
            >
              <Text style={styles.trackBtnText}>📍 Suivre la livraison</Text>
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

  timelineCard: { backgroundColor: COLORS.card, borderRadius: 16, padding: 16, marginBottom: 16 },
  timelineItem: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 0 },
  timelineLeft: { alignItems: 'center', marginRight: 12, width: 24 },
  timelineDot: {
    width: 22, height: 22, borderRadius: 11,
    backgroundColor: '#e5e7eb', justifyContent: 'center', alignItems: 'center',
  },
  timelineDotDone:    { backgroundColor: '#d1fae5' },
  timelineDotCurrent: { backgroundColor: COLORS.primary },
  timelineDotText:    { fontSize: 10, color: '#16a34a', fontWeight: 'bold' },
  timelineLine:       { width: 2, height: 28, backgroundColor: '#e5e7eb', marginVertical: 2 },
  timelineLineDone:   { backgroundColor: '#86efac' },
  timelineLabel:      { fontSize: 14, color: COLORS.text, paddingBottom: 28, paddingTop: 2 },

  sectionTitle: { fontSize: 15, fontWeight: '700', color: COLORS.text, marginBottom: 10, marginTop: 8 },

  itemsCard: { backgroundColor: COLORS.card, borderRadius: 16, padding: 16, marginBottom: 12 },
  itemRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8 },
  itemRowBorder: { borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  itemQty:  { width: 28, fontSize: 14, color: COLORS.primary, fontWeight: '700' },
  itemName: { flex: 1, fontSize: 14, color: COLORS.text },
  itemPrice:{ fontSize: 14, fontWeight: '700', color: COLORS.text },

  totalsCard: { backgroundColor: COLORS.card, borderRadius: 16, padding: 16, marginBottom: 16 },
  totalRow:        { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  totalRowFinal:   { borderTopWidth: 1, borderTopColor: '#f0f0f0', paddingTop: 8, marginTop: 4 },
  totalLabel:      { fontSize: 14, color: COLORS.gray },
  totalValue:      { fontSize: 14, color: COLORS.text, fontWeight: '600' },
  totalFinalLabel: { fontSize: 16, fontWeight: 'bold', color: COLORS.text },
  totalFinalValue: { fontSize: 18, fontWeight: '800', color: COLORS.primary },

  infoCard: { backgroundColor: COLORS.card, borderRadius: 16, padding: 16, marginBottom: 16, gap: 12 },
  infoRow:   { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  infoIcon:  { fontSize: 18, marginTop: 2 },
  infoLabel: { fontSize: 12, color: COLORS.gray, marginBottom: 2 },
  infoValue: { fontSize: 14, color: COLORS.text, fontWeight: '500' },

  actions:   { gap: 10 },
  trackBtn: {
    backgroundColor: COLORS.primary, borderRadius: 14, paddingVertical: 14, alignItems: 'center',
    shadowColor: COLORS.primary, shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25, shadowRadius: 6, elevation: 4,
  },
  trackBtnText:  { color: '#fff', fontSize: 15, fontWeight: 'bold' },
  cancelBtn:     { borderRadius: 14, paddingVertical: 14, alignItems: 'center', borderWidth: 1.5, borderColor: '#ef4444' },
  cancelBtnText: { color: '#ef4444', fontSize: 15, fontWeight: '600' },
});
