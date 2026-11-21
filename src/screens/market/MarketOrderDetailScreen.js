import { showAlert } from '../../utils/showAlert';
import React, { useState, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, RefreshControl, Linking,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { marketService } from '../../services/marketService';
import { COLORS, FONTS, TYPE, RADIUS, SHADOWS, SCREEN_PADDING, formatPrice } from '../../theme';
import {
  Screen, ScreenHeader, Card, Input, Button, Badge, SectionHeader, Divider, SmartImage,
  LoadingView, IconButton,
} from '../../components/ui';

const STATUS_STEPS = [
  { key: 'pending',     label: 'En attente',       iconName: 'time-outline',                  desc: 'Votre commande est en attente de traitement' },
  { key: 'assigned',    label: 'Coursier assigné', iconName: 'person-outline',                desc: 'Un coursier a été assigné à votre commande' },
  { key: 'at_market',   label: 'Au marché',        iconName: 'storefront-outline',            desc: 'Le coursier est au marché' },
  { key: 'photos_sent', label: 'Photos envoyées',  iconName: 'camera-outline',                desc: 'Le coursier a envoyé des photos des articles' },
  { key: 'validated',   label: 'Validé',           iconName: 'checkmark-circle-outline',      desc: 'Vous avez validé les achats' },
  { key: 'purchasing',  label: 'Achats en cours',  iconName: 'cart-outline',                  desc: 'Le coursier procède aux achats' },
  { key: 'delivering',  label: 'En livraison',     iconName: 'bicycle-outline',               desc: 'Vos courses sont en route' },
  { key: 'delivered',   label: 'Livré',            iconName: 'checkmark-done-circle-outline', desc: 'Vos courses ont été livrées' },
];

const STATUS_CONFIG = {
  pending:      { color: COLORS.warning, bg: COLORS.warningSoft },
  assigned:     { color: COLORS.info,    bg: COLORS.infoSoft },
  at_market:    { color: '#7C3AED',      bg: '#F1EAFE' },
  photos_sent:  { color: COLORS.primary, bg: COLORS.primarySoft },
  validated:    { color: '#0D9488',      bg: '#E3F7F4' },
  purchasing:   { color: '#4F46E5',      bg: '#ECEBFE' },
  delivering:   { color: COLORS.primary, bg: COLORS.primarySoft },
  delivered:    { color: COLORS.success, bg: COLORS.successSoft },
  cancelled:    { color: COLORS.danger,  bg: COLORS.dangerSoft },
};

const PAYMENT_LABELS = {
  mobile_money: 'Mobile Money',
  on_delivery: 'Paiement à la livraison',
};

const PAYMENT_STATUS_LABELS = {
  pending: 'en attente',
  paid: 'payé',
  completed: 'payé',
  failed: 'échoué',
  refunded: 'remboursé',
};

// ── Frise verticale des étapes ──
function StepTimeline({ steps, currentIdx }) {
  return (
    <View>
      {steps.map((step, idx) => {
        const isDone = idx <= currentIdx;
        const isCurrent = idx === currentIdx;
        const isLast = idx === steps.length - 1;
        return (
          <View key={step.key} style={styles.tlRow}>
            <View style={styles.tlLeft}>
              <View style={[styles.tlDot, isDone && styles.tlDotDone, isCurrent && styles.tlDotCurrent]}>
                {isDone ? (
                  <Ionicons
                    name={isCurrent ? step.iconName : 'checkmark'}
                    size={isCurrent ? 14 : 13}
                    color={isCurrent ? COLORS.white : COLORS.success}
                  />
                ) : null}
              </View>
              {!isLast ? <View style={[styles.tlLine, idx < currentIdx && styles.tlLineDone]} /> : null}
            </View>
            <View style={[styles.tlContent, isLast && { paddingBottom: 0 }]}>
              <Text style={[
                styles.tlLabel,
                isCurrent && { color: COLORS.primary, fontFamily: FONTS.semibold },
                !isDone && { color: COLORS.textLight },
              ]}>
                {step.label}
              </Text>
              {isCurrent ? <Text style={TYPE.caption}>{step.desc}</Text> : null}
            </View>
          </View>
        );
      })}
    </View>
  );
}

function InfoRow({ icon, label, value, children }) {
  return (
    <View style={styles.infoRow}>
      <View style={styles.infoIcon}>
        <Ionicons name={icon} size={18} color={COLORS.primary} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={TYPE.caption}>{label}</Text>
        {value ? <Text style={styles.infoValue}>{value}</Text> : null}
        {children}
      </View>
    </View>
  );
}

export default function MarketOrderDetailScreen({ route, navigation }) {
  const insets = useSafeAreaInsets();
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
        showAlert('Erreur', 'Impossible de charger la commande.');
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

  // Pull-to-refresh : rechargement silencieux (sans remplacer l'écran par le loader)
  const onRefresh = () => { setRefreshing(true); loadOrder(true); };

  const handleValidatePhotos = async (approved) => {
    if (!approved && !changeNote.trim()) {
      showAlert('Note requise', 'Veuillez indiquer les changements souhaités.');
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
      showAlert('Succès', approved ? 'Achats validés !' : 'Demande de changement envoyée.');
      loadOrder(true);
    } catch (e) {
      showAlert('Erreur', e.response?.data?.message || 'Une erreur est survenue.');
    } finally {
      setValidating(false);
    }
  };

  const handleCancel = () => {
    showAlert(
      'Annuler la commande',
      'Voulez-vous vraiment annuler cette commande marché ?',
      [
        { text: 'Non', style: 'cancel' },
        {
          text: 'Annuler la commande', style: 'destructive',
          onPress: async () => {
            try {
              await marketService.cancelOrder(orderId);
              loadOrder(true);
            } catch (e) {
              showAlert('Erreur', e.response?.data?.message || 'Impossible d\'annuler la commande.');
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return <Screen><LoadingView label="Chargement de la commande…" /></Screen>;
  }

  if (!order) return null;

  const isCancelled = order.status === 'cancelled';
  const statusConf = STATUS_CONFIG[order.status] || { color: COLORS.textMuted, bg: COLORS.divider };
  const currentStepIdx = STATUS_STEPS.findIndex(s => s.key === order.status);
  const currentStep = isCancelled
    ? { label: 'Commande annulée', iconName: 'close-circle-outline', desc: 'Cette commande a été annulée' }
    : (STATUS_STEPS[Math.max(currentStepIdx, 0)]);
  const canCancel = ['pending', 'assigned'].includes(order.status);
  const canTrack = ['assigned', 'at_market', 'purchasing', 'delivering'].includes(order.status);
  const isPhotoValidation = order.status === 'photos_sent';

  const date = new Date(order.created_at).toLocaleString('fr-FR', {
    day: '2-digit', month: 'long', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });

  const photos = order.photos || order.courier_photos || [];
  const items = order.items || [];
  const address = order.address?.address || order.delivery_address;
  const paymentStatus = order.payment_status
    ? ` (${PAYMENT_STATUS_LABELS[order.payment_status] || order.payment_status})`
    : '';
  const hasFooter = canTrack || canCancel;

  return (
    <Screen>
      <ScreenHeader
        title={`Marché #${order.order_number || order.id}`}
        subtitle={date}
        onBack={() => navigation.goBack()}
      />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' && !Platform.isPad ? 'padding' : undefined}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.scroll}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
        >
          {/* Status hero */}
          <Card style={[styles.statusCard, { backgroundColor: statusConf.bg }]}>
            <View style={[styles.statusIcon, { backgroundColor: statusConf.color }]}>
              <Ionicons name={currentStep.iconName} size={24} color={COLORS.white} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.statusLabel, { color: statusConf.color }]}>{currentStep.label}</Text>
              <Text style={TYPE.caption}>{currentStep.desc}</Text>
            </View>
          </Card>

          {/* Photo validation section */}
          {isPhotoValidation && photos.length > 0 && (
            <Card style={styles.photosCard}>
              <View style={styles.photosHeader}>
                <Badge label="Action requise" icon="alert-circle" />
              </View>
              <Text style={TYPE.h3}>Photos du coursier</Text>
              <Text style={[TYPE.caption, { marginBottom: 12 }]}>Vérifiez les articles avant l'achat</Text>

              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.photosScroll}>
                {photos.map((photo, idx) => (
                  <SmartImage
                    key={idx}
                    uri={photo?.url || photo?.path || photo}
                    style={styles.photoImage}
                    fallbackIcon="image-outline"
                  />
                ))}
              </ScrollView>

              {!showChangeInput ? (
                <View style={styles.photoActions}>
                  <Button
                    title="Valider les achats"
                    icon="checkmark-circle-outline"
                    onPress={() => handleValidatePhotos(true)}
                    loading={validating}
                    size="md"
                  />
                  <Button
                    title="Demander un changement"
                    icon="create-outline"
                    variant="ghost"
                    onPress={() => setShowChangeInput(true)}
                    disabled={validating}
                    size="md"
                  />
                </View>
              ) : (
                <View>
                  <Text style={[TYPE.label, { marginBottom: 8 }]}>Décrivez les changements souhaités :</Text>
                  <Input
                    icon="chatbubble-ellipses-outline"
                    placeholder="Ex : Remplacez les tomates par des poivrons..."
                    value={changeNote}
                    onChangeText={setChangeNote}
                    multiline
                    numberOfLines={3}
                  />
                  <View style={styles.changeInputActions}>
                    <Button
                      title="Annuler"
                      variant="outline"
                      size="md"
                      style={{ flex: 1 }}
                      onPress={() => { setShowChangeInput(false); setChangeNote(''); }}
                    />
                    <Button
                      title="Envoyer"
                      icon="send"
                      size="md"
                      style={{ flex: 1 }}
                      loading={validating}
                      onPress={() => handleValidatePhotos(false)}
                    />
                  </View>
                </View>
              )}
            </Card>
          )}

          {/* Timeline */}
          {!isCancelled && (
            <>
              <SectionHeader title="Progression" style={styles.section} />
              <Card>
                <StepTimeline steps={STATUS_STEPS} currentIdx={currentStepIdx} />
              </Card>
            </>
          )}

          {/* Items */}
          <SectionHeader title={`Articles commandés (${items.length})`} style={styles.section} />
          <Card>
            {items.map((item, idx) => (
              <View key={idx}>
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
                  <Text style={styles.itemPrice}>
                    ~{formatPrice(item.estimated_price || item.estimatedPrice)}
                  </Text>
                </View>
              </View>
            ))}

            <Divider style={{ marginVertical: 10 }} />
            <View style={styles.totalRow}>
              <Text style={TYPE.bodyMuted}>Budget estimé</Text>
              <Text style={styles.totalValue}>~{formatPrice(order.total_estimated)}</Text>
            </View>
            {Number(order.service_fee) > 0 ? (
              <View style={styles.totalRow}>
                <Text style={TYPE.bodyMuted}>Frais de course</Text>
                <Text style={styles.totalValue}>{formatPrice(order.service_fee)}</Text>
              </View>
            ) : null}
            {Number(order.total_final) > 0 ? (
              <View style={[styles.totalRow, { marginTop: 4 }]}>
                <Text style={styles.totalFinalLabel}>Total final</Text>
                <Text style={styles.totalFinalValue}>{formatPrice(order.total_final)}</Text>
              </View>
            ) : null}
          </Card>

          {/* Informations */}
          <SectionHeader title="Informations" style={styles.section} />
          <Card style={{ gap: 14 }}>
            <InfoRow
              icon="card-outline"
              label="Paiement"
              value={`${PAYMENT_LABELS[order.payment_method] || order.payment_method || '—'}${paymentStatus}`}
            />
            {address ? <InfoRow icon="location-outline" label="Adresse de livraison" value={address} /> : null}
            {order.courier ? (
              <InfoRow icon="person-outline" label="Coursier" value={order.courier.name}>
                {order.courier.phone ? (
                  <TouchableOpacity
                    style={styles.phoneLink}
                    onPress={() => Linking.openURL(`tel:${order.courier.phone}`)}
                  >
                    <Ionicons name="call-outline" size={13} color={COLORS.primary} />
                    <Text style={styles.phoneLinkText}>{order.courier.phone}</Text>
                  </TouchableOpacity>
                ) : null}
              </InfoRow>
            ) : null}
          </Card>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Actions */}
      {hasFooter && (
        <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 16) }]}>
          {canTrack && (
            <Button
              title="Suivre la livraison"
              icon="navigate"
              onPress={() => navigation.navigate('MarketOrderTracking', { orderId: order.id })}
              style={{ flex: 1 }}
            />
          )}
          {canCancel && (
            canTrack ? (
              <IconButton icon="close" color={COLORS.danger} bg={COLORS.dangerSoft} size={56} onPress={handleCancel} />
            ) : (
              <Button
                title="Annuler la commande"
                variant="outline"
                textStyle={{ color: COLORS.danger }}
                onPress={handleCancel}
                style={{ flex: 1 }}
              />
            )
          )}
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingHorizontal: SCREEN_PADDING, paddingTop: 8, paddingBottom: 32 },
  section: { paddingHorizontal: 0, marginTop: 22, marginBottom: 12 },

  statusCard: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  statusIcon: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  statusLabel: { fontFamily: FONTS.bold, fontSize: 17, lineHeight: 24 },

  // Timeline
  tlRow: { flexDirection: 'row' },
  tlLeft: { alignItems: 'center', width: 28, marginRight: 12 },
  tlDot: {
    width: 26, height: 26, borderRadius: 13, backgroundColor: COLORS.divider,
    justifyContent: 'center', alignItems: 'center',
  },
  tlDotDone: { backgroundColor: COLORS.successSoft },
  tlDotCurrent: { backgroundColor: COLORS.primary, width: 28, height: 28, borderRadius: 14 },
  tlLine: { width: 2, flex: 1, minHeight: 20, backgroundColor: COLORS.divider, marginVertical: 2 },
  tlLineDone: { backgroundColor: '#9EDCB4' },
  tlContent: { flex: 1, paddingBottom: 20, paddingTop: 3 },
  tlLabel: { fontFamily: FONTS.medium, fontSize: 14, color: COLORS.text },

  // Photos
  photosCard: { marginTop: 14, borderWidth: 1.5, borderColor: COLORS.primary },
  photosHeader: { marginBottom: 8 },
  photosScroll: { marginBottom: 16, marginHorizontal: -16, paddingHorizontal: 16 },
  photoImage: { width: 200, height: 200, borderRadius: RADIUS.lg, marginRight: 10 },
  photoActions: { gap: 10 },
  changeInputActions: { flexDirection: 'row', gap: 10, marginTop: 12 },

  // Items
  itemRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10 },
  itemDot: {
    width: 30, height: 30, borderRadius: 15, backgroundColor: COLORS.successSoft,
    alignItems: 'center', justifyContent: 'center',
  },
  itemNote: { fontFamily: FONTS.regular, fontSize: 12, color: COLORS.primary, fontStyle: 'italic', marginTop: 2 },
  itemPrice: { fontFamily: FONTS.semibold, fontSize: 14, color: COLORS.text },

  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 3 },
  totalValue: { fontFamily: FONTS.semibold, fontSize: 14, color: COLORS.text },
  totalFinalLabel: { fontFamily: FONTS.semibold, fontSize: 16, color: COLORS.text },
  totalFinalValue: { fontFamily: FONTS.bold, fontSize: 19, color: COLORS.primary },

  // Info
  infoRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  infoIcon: {
    width: 38, height: 38, borderRadius: 12, backgroundColor: COLORS.primarySoft,
    alignItems: 'center', justifyContent: 'center',
  },
  infoValue: { fontFamily: FONTS.medium, fontSize: 14, color: COLORS.text },
  phoneLink: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  phoneLinkText: { fontFamily: FONTS.semibold, fontSize: 13, color: COLORS.primary },

  // Footer
  footer: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: SCREEN_PADDING, paddingTop: 14, backgroundColor: COLORS.surface,
    borderTopLeftRadius: RADIUS.xl, borderTopRightRadius: RADIUS.xl,
    ...SHADOWS.lg,
  },
});
