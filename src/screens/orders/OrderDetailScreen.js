import { showAlert } from '../../utils/showAlert';
import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Alert, RefreshControl, Modal,
  TouchableOpacity, TextInput, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { orderService } from '../../services/orderService';
import { COLORS, FONTS, TYPE, RADIUS, SHADOWS, SCREEN_PADDING, formatPrice } from '../../theme';
import {
  Screen, ScreenHeader, Card, Badge, Button, SmartImage, LoadingView, EmptyState, Divider,
} from '../../components/ui';
import { ORDER_STATUS } from './OrdersScreen';

const STATUS_STEPS = [
  { key: 'pending',    label: 'Commande reçue', iconName: 'time-outline' },
  { key: 'confirmed',  label: 'Validée',        iconName: 'checkmark-circle-outline' },
  { key: 'preparing',  label: 'En préparation', iconName: 'restaurant-outline' },
  { key: 'ready',      label: 'Prête',          iconName: 'cube-outline' },
  { key: 'picked_up',  label: 'Récupérée',      iconName: 'car-outline' },
  { key: 'on_the_way', label: 'En route vers vous', iconName: 'bicycle-outline' },
  { key: 'delivered',  label: 'Livrée',         iconName: 'home-outline' },
];

const PAYMENT_LABELS = {
  cash: 'Espèces',
  mtn_momo: 'MTN Mobile Money',
  orange_money: 'Orange Money',
  gfs: 'Compte GFS',
};

const CANCELLABLE = ['pending', 'confirmed'];
// Toute commande en cours peut être suivie en direct
const TRACKABLE   = ['pending', 'confirmed', 'preparing', 'ready', 'picked_up', 'on_the_way'];

// ── Ligne d'étoiles cliquables ──
function StarPicker({ value, onChange }) {
  return (
    <View style={styles.stars}>
      {[1, 2, 3, 4, 5].map(n => (
        <TouchableOpacity key={n} onPress={() => onChange(n)} hitSlop={6}>
          <Ionicons name={n <= value ? 'star' : 'star-outline'} size={34} color={COLORS.star} />
        </TouchableOpacity>
      ))}
    </View>
  );
}

// ── Feuille de notation (restaurant + livreur) ──
function RatingSheet({ visible, hasDriver, onClose, onSubmit, submitting }) {
  const insets = useSafeAreaInsets();
  const [restaurantRating, setRestaurantRating] = useState(0);
  const [driverRating, setDriverRating]         = useState(0);
  const [comment, setComment]                   = useState('');

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView style={styles.sheetOverlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={onClose} />
        <View style={[styles.sheet, { paddingBottom: insets.bottom + 20 }]}>
          <View style={styles.sheetHandle} />
          <Text style={[TYPE.h2, { textAlign: 'center' }]}>Notez votre commande</Text>
          <Text style={[TYPE.bodyMuted, { textAlign: 'center', marginBottom: 16 }]}>Votre avis aide le restaurant à s'améliorer</Text>

          <Text style={styles.sheetLabel}>Le restaurant</Text>
          <StarPicker value={restaurantRating} onChange={setRestaurantRating} />

          {hasDriver && (
            <>
              <Text style={styles.sheetLabel}>Le livreur</Text>
              <StarPicker value={driverRating} onChange={setDriverRating} />
            </>
          )}

          <TextInput
            style={styles.sheetInput}
            value={comment}
            onChangeText={setComment}
            placeholder="Un commentaire ? (facultatif)"
            placeholderTextColor={COLORS.textLight}
            multiline
            maxLength={500}
          />

          <Button
            title="Envoyer mon avis"
            onPress={() => onSubmit(restaurantRating, driverRating || null, comment)}
            disabled={restaurantRating === 0}
            loading={submitting}
            style={{ marginTop: 16 }}
          />
          <Button title="Plus tard" variant="ghost" size="md" onPress={onClose} style={{ marginTop: 10 }} />
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function InfoRow({ icon, label, value }) {
  return (
    <View style={styles.infoRow}>
      <View style={styles.infoIcon}>
        <Ionicons name={icon} size={18} color={COLORS.primary} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={TYPE.caption}>{label}</Text>
        <Text style={styles.infoValue}>{value}</Text>
      </View>
    </View>
  );
}

function TotalRow({ label, value, color }) {
  return (
    <View style={styles.totalRow}>
      <Text style={[TYPE.bodyMuted, color && { color }]}>{label}</Text>
      <Text style={[styles.totalValue, color && { color }]}>{value}</Text>
    </View>
  );
}

export default function OrderDetailScreen({ route, navigation }) {
  const { orderId } = route.params;
  const insets = useSafeAreaInsets();
  const [order, setOrder]           = useState(null);
  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [ratingOpen, setRatingOpen] = useState(false);
  const [ratingBusy, setRatingBusy] = useState(false);
  const [rated, setRated]           = useState(false);

  const loadOrder = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const data = await orderService.getOrder(orderId);
      setOrder(data);
    } catch (e) {
      if (!silent) {
        showAlert('Erreur', 'Impossible de charger la commande.');
        navigation.goBack();
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [orderId, navigation]);

  // Auto-refresh toutes les 15s pour les commandes actives
  useFocusEffect(useCallback(() => {
    loadOrder();
    const interval = setInterval(() => loadOrder(true), 15000);
    return () => clearInterval(interval);
  }, [loadOrder]));

  // Rafraîchissement manuel sans repasser par le chargement plein écran
  const onRefresh = () => { setRefreshing(true); loadOrder(true); };

  const handleCancel = () => {
    showAlert(
      'Annuler la commande',
      'Voulez-vous vraiment annuler cette commande ?',
      [
        { text: 'Non', style: 'cancel' },
        {
          text: 'Annuler la commande', style: 'destructive',
          onPress: async () => {
            setCancelling(true);
            try {
              await orderService.cancelOrder(orderId);
              loadOrder(true);
            } catch (e) {
              showAlert('Erreur', e.response?.data?.message || 'Impossible d\'annuler la commande.');
            } finally {
              setCancelling(false);
            }
          },
        },
      ]
    );
  };

  const submitRating = async (restaurantRating, driverRating, comment) => {
    setRatingBusy(true);
    try {
      const res = await orderService.rateOrder(orderId, restaurantRating, driverRating, comment);
      setRated(true);
      setRatingOpen(false);
      showAlert('Merci !', res?.message || 'Merci pour votre avis !');
    } catch (e) {
      showAlert('Erreur', e.response?.data?.message || 'Impossible d\'envoyer votre avis.');
    } finally {
      setRatingBusy(false);
    }
  };

  if (loading) {
    return <Screen><LoadingView label="Chargement de la commande…" /></Screen>;
  }

  if (!order) {
    return (
      <Screen>
        <ScreenHeader title="Commande" onBack={() => navigation.goBack()} />
        <EmptyState icon="receipt-outline" title="Commande introuvable" actionLabel="Retour" onAction={() => navigation.goBack()} />
      </Screen>
    );
  }

  const status = ORDER_STATUS[order.status] || { label: order.status, color: COLORS.textMuted, bg: COLORS.divider, icon: 'help-circle-outline' };
  const isCancelled    = order.status === 'cancelled';
  const currentStepIdx = STATUS_STEPS.findIndex(s => s.key === order.status);
  const canCancel = CANCELLABLE.includes(order.status);
  const canTrack  = TRACKABLE.includes(order.status);
  const canRate   = order.status === 'delivered' && !rated;
  const hasDriver = !!order.delivery?.driver_id || !!order.delivery?.driver;
  const progress  = currentStepIdx >= 0 ? (currentStepIdx + 1) / STATUS_STEPS.length : 0;

  const date = order.created_at ? new Date(order.created_at).toLocaleString('fr-FR', {
    day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit',
  }) : '';

  const hasActions = canTrack || canCancel || canRate;

  return (
    <Screen>
      <ScreenHeader
        title={`Commande #${order.order_number}`}
        subtitle={date}
        onBack={() => navigation.goBack()}
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: SCREEN_PADDING, paddingTop: 8, paddingBottom: hasActions ? 24 : insets.bottom + 32 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} colors={[COLORS.primary]} />}
      >
        {/* ── Statut ── */}
        <Card style={styles.hero}>
          <View style={styles.heroTop}>
            <View style={[styles.heroIcon, { backgroundColor: status.bg }]}>
              <Ionicons name={status.icon} size={28} color={status.color} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={TYPE.caption}>Statut de la commande</Text>
              <Text style={[TYPE.h2, { color: status.color }]}>{status.label}</Text>
            </View>
            <Badge label={`#${order.order_number}`} color={COLORS.textMuted} bg={COLORS.bg} />
          </View>

          {!isCancelled && currentStepIdx >= 0 && (
            <>
              <View style={styles.progressTrack}>
                <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
              </View>
              <View style={styles.steps}>
                {STATUS_STEPS.map((step, idx) => {
                  const done = idx <= currentStepIdx;
                  return (
                    <View key={step.key} style={[styles.stepDot, done && styles.stepDotDone, idx === currentStepIdx && styles.stepDotCurrent]}>
                      <Ionicons name={step.iconName} size={13} color={done ? COLORS.white : COLORS.textLight} />
                    </View>
                  );
                })}
              </View>
              <Text style={[TYPE.caption, { marginTop: 8 }]}>
                Étape {currentStepIdx + 1} sur {STATUS_STEPS.length}
              </Text>
            </>
          )}
          {isCancelled && (
            <Text style={[TYPE.bodyMuted, { marginTop: 12 }]}>Cette commande a été annulée.</Text>
          )}
        </Card>

        {/* ── Restaurant + articles ── */}
        <Text style={styles.sectionTitle}>Articles commandés</Text>
        <Card>
          {order.restaurant && (
            <>
              <View style={styles.restoRow}>
                <SmartImage uri={order.restaurant.logo || order.restaurant.cover_image} style={styles.restoLogo} fallbackIcon="storefront-outline" iconSize={20} />
                <Text style={[TYPE.title, { flex: 1 }]} numberOfLines={1}>{order.restaurant.name}</Text>
              </View>
              <Divider style={{ marginVertical: 12 }} />
            </>
          )}
          {order.items?.map((item, idx) => (
            <View key={item.id || idx} style={[styles.itemRow, idx < order.items.length - 1 && styles.itemRowBorder]}>
              <SmartImage uri={item.menu_item?.image} style={styles.itemImage} iconSize={18} />
              <View style={{ flex: 1 }}>
                <Text style={styles.itemName} numberOfLines={2}>{item.item_name || item.name || item.menu_item?.name}</Text>
                <Text style={TYPE.caption}>{item.quantity} × {formatPrice(item.item_price || item.unit_price)}</Text>
              </View>
              <Text style={styles.itemPrice}>
                {formatPrice(Number(item.item_price || item.unit_price || 0) * item.quantity)}
              </Text>
            </View>
          ))}
        </Card>

        {/* ── Récapitulatif ── */}
        <Text style={styles.sectionTitle}>Récapitulatif</Text>
        <Card>
          <TotalRow label="Sous-total" value={formatPrice(order.subtotal)} />
          <TotalRow label="Livraison" value={Number(order.delivery_fee) > 0 ? formatPrice(order.delivery_fee) : 'Offerte'} />
          {Number(order.discount_amount) > 0 && (
            <TotalRow label="Réduction" value={`-${formatPrice(order.discount_amount)}`} color={COLORS.success} />
          )}
          <Divider style={{ marginVertical: 10 }} />
          <View style={styles.totalRow}>
            <Text style={TYPE.h3}>Total</Text>
            <Text style={[TYPE.price, { fontSize: 20, lineHeight: 26 }]}>{formatPrice(order.total)}</Text>
          </View>
        </Card>

        {/* ── Informations ── */}
        <Text style={styles.sectionTitle}>Informations</Text>
        <Card style={{ gap: 14 }}>
          {order.address?.address ? (
            <InfoRow icon="location-outline" label="Adresse de livraison" value={order.address.address} />
          ) : null}
          <InfoRow
            icon="card-outline"
            label="Paiement"
            value={PAYMENT_LABELS[order.payment_method] || order.payment_method || '—'}
          />
          {order.special_instructions ? (
            <InfoRow icon="document-text-outline" label="Note" value={order.special_instructions} />
          ) : null}
        </Card>

        {rated && (
          <View style={styles.ratedBox}>
            <Ionicons name="heart" size={18} color={COLORS.success} />
            <Text style={styles.ratedText}>Merci, votre avis a bien été envoyé.</Text>
          </View>
        )}
      </ScrollView>

      {/* ── Actions ── */}
      {hasActions && (
        <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 12 }]}>
          {canTrack && (
            <Button
              title="Suivre la livraison"
              icon="navigate"
              onPress={() => navigation.navigate('OrderTracking', { orderId: order.id })}
            />
          )}
          {canRate && (
            <Button title="Noter la commande" icon="star" onPress={() => setRatingOpen(true)} />
          )}
          {canCancel && (
            <Button
              title="Annuler la commande"
              variant="outline"
              icon="close-circle-outline"
              onPress={handleCancel}
              loading={cancelling}
              textStyle={{ color: COLORS.danger }}
              style={{ borderColor: COLORS.dangerSoft }}
              size="md"
            />
          )}
        </View>
      )}

      <RatingSheet
        visible={ratingOpen}
        hasDriver={hasDriver}
        onClose={() => setRatingOpen(false)}
        onSubmit={submitRating}
        submitting={ratingBusy}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { marginBottom: 6 },
  heroTop: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  heroIcon: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center' },
  progressTrack: { height: 6, borderRadius: 3, backgroundColor: COLORS.divider, marginTop: 18, overflow: 'hidden' },
  progressFill: { height: 6, borderRadius: 3, backgroundColor: COLORS.primary },
  steps: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 12 },
  stepDot: {
    width: 28, height: 28, borderRadius: 14, backgroundColor: COLORS.bg,
    alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: COLORS.border,
  },
  stepDotDone: { backgroundColor: COLORS.secondary, borderColor: COLORS.secondary },
  stepDotCurrent: { backgroundColor: COLORS.primary, borderColor: COLORS.primary, ...SHADOWS.primary },

  sectionTitle: { ...TYPE.h3, marginTop: 20, marginBottom: 10 },

  restoRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  restoLogo: { width: 40, height: 40, borderRadius: 20 },
  itemRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10 },
  itemRowBorder: { borderBottomWidth: 1, borderBottomColor: COLORS.divider },
  itemImage: { width: 48, height: 48, borderRadius: RADIUS.sm },
  itemName: { fontFamily: FONTS.medium, fontSize: 14, color: COLORS.text },
  itemPrice: { fontFamily: FONTS.semibold, fontSize: 14, color: COLORS.text },

  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 4 },
  totalValue: { fontFamily: FONTS.semibold, fontSize: 14, color: COLORS.text },

  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  infoIcon: {
    width: 40, height: 40, borderRadius: 12, backgroundColor: COLORS.primarySoft,
    alignItems: 'center', justifyContent: 'center',
  },
  infoValue: { fontFamily: FONTS.medium, fontSize: 14, color: COLORS.text },

  ratedBox: {
    flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 16,
    backgroundColor: COLORS.successSoft, borderRadius: RADIUS.md, padding: 12,
  },
  ratedText: { fontFamily: FONTS.medium, fontSize: 13, color: COLORS.success },

  bottomBar: {
    paddingHorizontal: SCREEN_PADDING, paddingTop: 12, gap: 10,
    backgroundColor: COLORS.surface, borderTopLeftRadius: RADIUS.xl, borderTopRightRadius: RADIUS.xl,
    ...SHADOWS.lg,
  },

  sheetOverlay: { flex: 1, backgroundColor: COLORS.overlay },
  sheet: {
    backgroundColor: COLORS.surface, borderTopLeftRadius: RADIUS.xxl, borderTopRightRadius: RADIUS.xxl,
    paddingHorizontal: SCREEN_PADDING, paddingTop: 10,
  },
  sheetHandle: { width: 44, height: 5, borderRadius: 3, backgroundColor: COLORS.border, alignSelf: 'center', marginBottom: 16 },
  sheetLabel: { ...TYPE.label, textAlign: 'center', marginTop: 8, marginBottom: 6 },
  stars: { flexDirection: 'row', justifyContent: 'center', gap: 8 },
  sheetInput: {
    marginTop: 16, minHeight: 80, textAlignVertical: 'top',
    backgroundColor: COLORS.bg, borderRadius: RADIUS.lg, borderWidth: 1, borderColor: COLORS.border,
    padding: 14, fontFamily: FONTS.regular, fontSize: 14, color: COLORS.text,
  },
});
