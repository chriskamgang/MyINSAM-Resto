import { showAlert } from '../../utils/showAlert';
import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Alert, Linking,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { restoDashboardService } from '../../services/restoDashboardService';
import { COLORS, FONTS, TYPE, RADIUS, SHADOWS, SCREEN_PADDING, formatPrice } from '../../theme';
import {
  Screen, ScreenHeader, Card, Button, Badge, SectionHeader, Divider, IconButton, LoadingView,
} from '../../components/ui';

const STATUS_CONFIG = {
  pending:    { label: 'En attente',     color: COLORS.warning, bg: COLORS.warningSoft, icon: 'time-outline' },
  confirmed:  { label: 'Confirmée',      color: COLORS.info,    bg: COLORS.infoSoft,    icon: 'checkmark-circle-outline' },
  preparing:  { label: 'En préparation', color: '#7C3AED',      bg: '#F1EAFE',          icon: 'restaurant-outline' },
  ready:      { label: 'Prête',          color: '#0D9488',      bg: '#E3F7F4',          icon: 'cube-outline' },
  assigned:   { label: 'Assignée',       color: '#0891B2',      bg: '#E0F5FA',          icon: 'bicycle-outline' },
  on_the_way: { label: 'En route',       color: COLORS.primary, bg: COLORS.primarySoft, icon: 'car-outline' },
  delivered:  { label: 'Livrée',         color: COLORS.success, bg: COLORS.successSoft, icon: 'checkmark-done-outline' },
  cancelled:  { label: 'Annulée',        color: COLORS.danger,  bg: COLORS.dangerSoft,  icon: 'close-circle-outline' },
};

const PAYMENT_LABELS = {
  cash: 'Espèces',
  mtn_momo: 'MTN MoMo',
  orange_money: 'Orange Money',
  gfs: 'Compte GFS',
};

function PayRow({ label, value, valueStyle }) {
  return (
    <View style={styles.payRow}>
      <Text style={TYPE.bodyMuted}>{label}</Text>
      <Text style={[styles.payValue, valueStyle]}>{value}</Text>
    </View>
  );
}

export default function RestoOrderDetailScreen({ route, navigation }) {
  const insets = useSafeAreaInsets();
  const { orderId } = route.params;
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);

  const loadOrder = async () => {
    try {
      const data = await restoDashboardService.getOrder(orderId);
      setOrder(data);
    } catch (e) {
      showAlert('Erreur', 'Impossible de charger la commande.');
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrder();
    const interval = setInterval(loadOrder, 10000);
    return () => clearInterval(interval);
  }, [orderId]);

  const handleStatusChange = (newStatus, confirmMsg) => {
    showAlert('Confirmer', confirmMsg, [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Confirmer', style: newStatus === 'cancelled' ? 'destructive' : 'default', onPress: async () => {
        setActing(true);
        try {
          await restoDashboardService.updateOrderStatus(orderId, newStatus);
          await loadOrder();
          showAlert('Succès', 'Statut mis à jour.');
        } catch (e) {
          showAlert('Erreur', e.response?.data?.message || 'Impossible de modifier le statut.');
        } finally { setActing(false); }
      }},
    ]);
  };

  const callClient = () => {
    const phone = order?.user?.phone;
    if (phone) Linking.openURL(`tel:${phone}`);
    else showAlert('Erreur', 'Numéro non disponible.');
  };

  const callDriver = () => {
    const phone = order?.delivery?.driver?.phone;
    if (phone) Linking.openURL(`tel:${phone}`);
  };

  if (loading) return <Screen><LoadingView label="Chargement de la commande…" /></Screen>;
  if (!order) return null;

  const cfg = STATUS_CONFIG[order.status] || STATUS_CONFIG.pending;
  // Transitions autorisées par l'API : pending → confirmed|cancelled, confirmed → preparing|ready|cancelled, preparing → ready|cancelled
  const canAccept = order.status === 'pending';
  const canPrepare = order.status === 'confirmed';
  const canReady = order.status === 'preparing' || order.status === 'confirmed';
  const canCancel = ['pending', 'confirmed', 'preparing'].includes(order.status);
  const hasActions = canAccept || canPrepare || canReady || canCancel;
  const paymentLabel = PAYMENT_LABELS[order.payment_method] || order.payment_method || '—';
  const date = new Date(order.created_at).toLocaleString('fr-FR', {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
  const items = order.items || [];
  const driver = order.delivery?.driver;

  return (
    <Screen>
      <ScreenHeader title={`Commande #${order.order_number}`} subtitle={date} onBack={() => navigation.goBack()} />

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Status */}
        <Card style={[styles.statusCard, { backgroundColor: cfg.bg }]}>
          <View style={[styles.statusIcon, { backgroundColor: cfg.color }]}>
            <Ionicons name={cfg.icon} size={24} color={COLORS.white} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={TYPE.caption}>Statut de la commande</Text>
            <Text style={[styles.statusLabel, { color: cfg.color }]}>{cfg.label}</Text>
          </View>
          <Badge label={paymentLabel} icon="card-outline" color={COLORS.text} bg={COLORS.white} />
        </Card>

        {/* Client */}
        <SectionHeader title="Client" style={styles.section} />
        <Card>
          <View style={styles.personRow}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{order.user?.name?.charAt(0)?.toUpperCase() || '?'}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={TYPE.title}>{order.user?.name || 'Client'}</Text>
              <Text style={TYPE.caption}>{order.user?.phone || '-'}</Text>
            </View>
            {order.user?.phone ? (
              <IconButton icon="call" color={COLORS.white} bg={COLORS.success} onPress={callClient} />
            ) : null}
          </View>
          {order.address?.address ? (
            <>
              <Divider style={{ marginVertical: 12 }} />
              <View style={styles.addressRow}>
                <View style={styles.addressIcon}>
                  <Ionicons name="location" size={16} color={COLORS.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={TYPE.caption}>Adresse de livraison</Text>
                  <Text style={styles.addressText}>{order.address.address}</Text>
                </View>
              </View>
            </>
          ) : null}
        </Card>

        {/* Items */}
        <SectionHeader title={`Articles (${items.length})`} style={styles.section} />
        <Card>
          {items.map((item, idx) => (
            <View key={idx}>
              {idx > 0 ? <Divider /> : null}
              <View style={styles.itemRow}>
                <View style={styles.qtyBadge}>
                  <Text style={styles.qtyText}>{item.quantity}x</Text>
                </View>
                <Text style={styles.itemName}>{item.item_name}</Text>
                <Text style={styles.itemPrice}>{formatPrice(item.subtotal)}</Text>
              </View>
            </View>
          ))}
        </Card>

        {/* Special instructions */}
        {order.special_instructions ? (
          <Card style={styles.instructionsCard}>
            <Ionicons name="chatbubble-ellipses-outline" size={18} color={COLORS.warning} />
            <View style={{ flex: 1 }}>
              <Text style={[TYPE.label, { color: '#92400E' }]}>Instructions du client</Text>
              <Text style={styles.instructions}>{order.special_instructions}</Text>
            </View>
          </Card>
        ) : null}

        {/* Payment */}
        <SectionHeader title="Paiement" style={styles.section} />
        <Card>
          <PayRow label="Sous-total" value={formatPrice(order.subtotal)} />
          <PayRow label="Livraison" value={formatPrice(order.delivery_fee)} />
          {Number(order.discount_amount) > 0 ? (
            <PayRow label="Remise" value={`-${formatPrice(order.discount_amount)}`} valueStyle={{ color: COLORS.success }} />
          ) : null}
          <Divider style={{ marginVertical: 10 }} />
          <View style={styles.payRow}>
            <Text style={styles.payTotalLabel}>Total ({paymentLabel})</Text>
            <Text style={styles.payTotalValue}>{formatPrice(order.total)}</Text>
          </View>
        </Card>

        {/* Driver info */}
        {driver ? (
          <>
            <SectionHeader title="Livreur" style={styles.section} />
            <Card>
              <View style={styles.personRow}>
                <View style={[styles.avatar, { backgroundColor: COLORS.primarySoft }]}>
                  <Ionicons name="bicycle" size={22} color={COLORS.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={TYPE.title}>{driver.name}</Text>
                  <Text style={TYPE.caption}>{driver.phone || '-'}</Text>
                </View>
                {driver.phone ? (
                  <IconButton icon="call-outline" color={COLORS.primary} bg={COLORS.primarySoft} onPress={callDriver} />
                ) : null}
              </View>
            </Card>
          </>
        ) : null}
      </ScrollView>

      {/* Action buttons */}
      {hasActions && (
        <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 16) }]}>
          {canAccept && (
            <Button
              title="Accepter la commande"
              icon="checkmark-circle-outline"
              loading={acting}
              onPress={() => handleStatusChange('confirmed', 'Accepter cette commande ?')}
            />
          )}
          {(canPrepare || canReady) && (
            <View style={styles.footerRow}>
              {canPrepare && (
                <Button
                  title="En préparation"
                  icon="flame-outline"
                  variant="dark"
                  size="md"
                  style={{ flex: 1 }}
                  disabled={acting}
                  onPress={() => handleStatusChange('preparing', 'Commencer la préparation ?')}
                />
              )}
              {canReady && (
                <Button
                  title="Commande prête"
                  icon="cube-outline"
                  size="md"
                  style={{ flex: 1 }}
                  loading={acting && !canPrepare}
                  disabled={acting}
                  onPress={() => handleStatusChange('ready', 'Marquer la commande comme prête ?')}
                />
              )}
            </View>
          )}
          {canCancel && (
            <Button
              title={canAccept ? 'Refuser la commande' : 'Annuler la commande'}
              variant="outline"
              size="sm"
              textStyle={{ color: COLORS.danger }}
              disabled={acting}
              onPress={() => handleStatusChange('cancelled', canAccept ? 'Refuser cette commande ?' : 'Annuler cette commande ?')}
            />
          )}
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingHorizontal: SCREEN_PADDING, paddingTop: 8, paddingBottom: 32 },
  section: { paddingHorizontal: 0, marginTop: 22, marginBottom: 12 },

  statusCard: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  statusIcon: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  statusLabel: { fontFamily: FONTS.bold, fontSize: 18, lineHeight: 24 },

  personRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: {
    width: 46, height: 46, borderRadius: 23, backgroundColor: COLORS.primary,
    justifyContent: 'center', alignItems: 'center',
  },
  avatarText: { fontFamily: FONTS.bold, fontSize: 18, color: COLORS.white },

  addressRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  addressIcon: {
    width: 34, height: 34, borderRadius: 12, backgroundColor: COLORS.primarySoft,
    alignItems: 'center', justifyContent: 'center',
  },
  addressText: { fontFamily: FONTS.medium, fontSize: 14, lineHeight: 20, color: COLORS.text },

  itemRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, gap: 10 },
  qtyBadge: {
    backgroundColor: COLORS.primarySoft, borderRadius: RADIUS.sm,
    paddingHorizontal: 8, paddingVertical: 4, minWidth: 38, alignItems: 'center',
  },
  qtyText: { fontFamily: FONTS.bold, fontSize: 13, color: COLORS.primary },
  itemName: { flex: 1, fontFamily: FONTS.medium, fontSize: 14, color: COLORS.text },
  itemPrice: { fontFamily: FONTS.semibold, fontSize: 14, color: COLORS.text },

  instructionsCard: {
    flexDirection: 'row', gap: 10, marginTop: 14, backgroundColor: COLORS.warningSoft,
  },
  instructions: { fontFamily: FONTS.regular, fontSize: 14, lineHeight: 20, color: '#92400E', marginTop: 2 },

  payRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 3 },
  payValue: { fontFamily: FONTS.semibold, fontSize: 14, color: COLORS.text },
  payTotalLabel: { fontFamily: FONTS.semibold, fontSize: 15, color: COLORS.text, flex: 1 },
  payTotalValue: { fontFamily: FONTS.bold, fontSize: 19, color: COLORS.primary },

  footer: {
    paddingHorizontal: SCREEN_PADDING, paddingTop: 14, gap: 10, backgroundColor: COLORS.surface,
    borderTopLeftRadius: RADIUS.xl, borderTopRightRadius: RADIUS.xl, ...SHADOWS.lg,
  },
  footerRow: { flexDirection: 'row', gap: 10 },
});
