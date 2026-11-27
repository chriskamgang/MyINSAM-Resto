import Constants from 'expo-constants';
import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Linking, Animated,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { marketService } from '../../services/marketService';
import { createThemedStyles, COLORS, FONTS, TYPE, RADIUS, SHADOWS, GRADIENTS, SCREEN_PADDING } from '../../theme';
import {
  Screen, ScreenHeader, Card, Button, IconButton, SectionHeader, LoadingView, Rating, Badge,
} from '../../components/ui';

const STATUS_STEPS = [
  { key: 'pending',     label: 'En attente',       iconName: 'time-outline',                  desc: 'Votre commande est en attente' },
  { key: 'assigned',    label: 'Coursier assigné', iconName: 'person-outline',                desc: 'Un coursier a été assigné' },
  { key: 'at_market',   label: 'Au marché',        iconName: 'storefront-outline',            desc: 'Le coursier est au marché' },
  { key: 'photos_sent', label: 'Photos envoyées',  iconName: 'camera-outline',                desc: 'Vérifiez les articles dans le détail' },
  { key: 'validated',   label: 'Validé',           iconName: 'checkmark-circle-outline',      desc: 'Achats validés' },
  { key: 'purchasing',  label: 'Achats en cours',  iconName: 'cart-outline',                  desc: 'Le coursier effectue les achats' },
  { key: 'delivering',  label: 'En livraison',     iconName: 'bicycle-outline',               desc: 'Vos courses arrivent bientôt !' },
  { key: 'delivered',   label: 'Livré',            iconName: 'checkmark-done-circle-outline', desc: 'Vos courses sont arrivées' },
];

const CANCELLED_STEP = { key: 'cancelled', label: 'Commande annulée', iconName: 'close-circle-outline', desc: 'Cette commande a été annulée' };

export default function MarketOrderTrackingScreen({ route, navigation }) {
  const insets = useSafeAreaInsets();
  const { orderId } = route.params;
  const [trackData, setTrackData] = useState(null);
  const [loading, setLoading] = useState(true);
  const intervalRef = useRef(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Pulse animation
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.4, duration: 700, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1.0, duration: 700, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, []);

  const loadTracking = async () => {
    try {
      const data = await marketService.trackOrder(orderId);
      setTrackData(data);
      if (['delivered', 'cancelled'].includes(data.status || data.order_status)) {
        clearInterval(intervalRef.current);
      }
    } catch (e) {
      console.error('Erreur tracking marché:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTracking();
    intervalRef.current = setInterval(loadTracking, 10000);
    return () => clearInterval(intervalRef.current);
  }, [orderId]);

  const callCourier = () => {
    const phone = trackData?.courier?.phone;
    if (phone) Linking.openURL(`tel:${phone}`);
  };

  const callSupport = () => {
    // Placeholder support number
    Linking.openURL(`tel:${Constants.expoConfig?.extra?.supportPhone || '+237659339778'}`);
  };

  if (loading) {
    return <Screen><LoadingView label="Chargement du suivi…" /></Screen>;
  }

  const status = trackData?.status || trackData?.order_status || 'pending';
  const isCancelled = status === 'cancelled';
  const currentStepIdx = STATUS_STEPS.findIndex(s => s.key === status);
  const currentStep = isCancelled ? CANCELLED_STEP : STATUS_STEPS[Math.max(currentStepIdx, 0)];
  const courier = trackData?.courier;
  const isActive = !['delivered', 'cancelled'].includes(status);
  const progress = isCancelled ? 0 : Math.max(currentStepIdx, 0) / (STATUS_STEPS.length - 1);

  return (
    <Screen>
      <ScreenHeader
        title="Suivi marché"
        onBack={() => navigation.goBack()}
        right={<IconButton icon="refresh-outline" color={COLORS.primary} onPress={loadTracking} />}
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scroll, { paddingBottom: Math.max(insets.bottom, 16) + 16 }]}
      >
        {/* Current status hero */}
        <LinearGradient
          colors={isCancelled ? [COLORS.danger, '#C62828'] : GRADIENTS.primary}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.hero}
        >
          <View style={styles.heroTop}>
            <View style={styles.statusIconWrap}>
              {isActive && (
                <Animated.View style={[styles.statusPulse, { transform: [{ scale: pulseAnim }] }]} />
              )}
              <View style={styles.statusIcon}>
                <Ionicons name={currentStep.iconName} size={28} color={COLORS.white} />
              </View>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.heroLabel}>{currentStep.label}</Text>
              <Text style={styles.heroDesc}>{currentStep.desc}</Text>
            </View>
            {isActive && (
              <View style={styles.liveBadge}>
                <View style={styles.liveDot} />
                <Text style={styles.liveText}>LIVE</Text>
              </View>
            )}
          </View>
          {!isCancelled ? (
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${Math.round(progress * 100)}%` }]} />
            </View>
          ) : null}
        </LinearGradient>

        {/* Courier card */}
        {courier ? (
          <Card style={styles.courierCard}>
            <View style={styles.courierAvatar}>
              <Text style={styles.courierAvatarText}>
                {courier.name?.charAt(0)?.toUpperCase() || '?'}
              </Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={TYPE.title}>{courier.name}</Text>
              <Text style={TYPE.caption}>Votre coursier</Text>
              {Number(courier.rating) > 0 ? <Rating value={courier.rating} style={{ marginTop: 2 }} /> : null}
            </View>
            {courier.phone ? (
              <IconButton icon="call" color={COLORS.white} bg={COLORS.success} onPress={callCourier} />
            ) : null}
          </Card>
        ) : null}

        {/* Timeline */}
        {!isCancelled && (
          <>
            <SectionHeader title="Progression" style={styles.section} />
            <Card>
              {STATUS_STEPS.map((step, idx) => {
                const isDone = idx <= currentStepIdx;
                const isCurrent = idx === currentStepIdx;
                const isLast = idx === STATUS_STEPS.length - 1;
                return (
                  <View key={step.key} style={styles.tlRow}>
                    <View style={styles.tlLeft}>
                      <View style={[styles.tlDot, isDone && styles.tlDotDone, isCurrent && styles.tlDotCurrent]}>
                        {isDone ? (
                          <Ionicons
                            name={isCurrent ? step.iconName : 'checkmark'}
                            size={isCurrent ? 15 : 13}
                            color={isCurrent ? COLORS.white : COLORS.success}
                          />
                        ) : null}
                      </View>
                      {!isLast ? <View style={[styles.tlLine, idx < currentStepIdx && styles.tlLineDone]} /> : null}
                    </View>
                    <View style={[styles.tlContent, isLast && { paddingBottom: 0 }]}>
                      <View style={styles.tlLabelRow}>
                        <Text style={[
                          styles.tlLabel,
                          isCurrent && { color: COLORS.primary, fontFamily: FONTS.semibold },
                          !isDone && { color: COLORS.textLight },
                        ]}>
                          {step.label}
                        </Text>
                        {isCurrent && isActive ? <Badge label="En cours" /> : null}
                      </View>
                      {isCurrent ? <Text style={TYPE.caption}>{step.desc}</Text> : null}

                      {/* Link to detail for photo validation */}
                      {isCurrent && step.key === 'photos_sent' && (
                        <TouchableOpacity
                          style={styles.inlineActionBtn}
                          onPress={() => navigation.navigate('MarketOrderDetail', { orderId })}
                        >
                          <Ionicons name="camera-outline" size={14} color={COLORS.primary} />
                          <Text style={styles.inlineActionBtnText}>Voir les photos</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                );
              })}
            </Card>
          </>
        )}

        {/* Delivered state */}
        {status === 'delivered' && (
          <Card style={styles.deliveredCard}>
            <View style={styles.deliveredIcon}>
              <Ionicons name="checkmark-done" size={34} color={COLORS.success} />
            </View>
            <Text style={[TYPE.h2, { color: COLORS.success }]}>Courses livrées !</Text>
            <Text style={[TYPE.bodyMuted, { marginBottom: 16 }]}>Merci pour votre confiance</Text>
            <Button
              title="Voir le détail"
              size="md"
              style={{ alignSelf: 'stretch' }}
              onPress={() => navigation.replace('MarketOrderDetail', { orderId })}
            />
          </Card>
        )}

        {/* Contact buttons */}
        <SectionHeader title="Besoin d'aide ?" style={styles.section} />
        <View style={styles.contactSection}>
          {courier?.phone ? (
            <Button title="Appeler le coursier" icon="call-outline" variant="ghost" size="md" onPress={callCourier} />
          ) : null}
          <Button title="Contacter le support" icon="headset-outline" variant="outline" size="md" onPress={callSupport} />
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = createThemedStyles({
  scroll: { paddingHorizontal: SCREEN_PADDING, paddingTop: 8 },
  section: { paddingHorizontal: 0, marginTop: 22, marginBottom: 12 },

  // Hero
  hero: { borderRadius: RADIUS.xl, padding: 18, ...SHADOWS.primary },
  heroTop: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  statusIconWrap: { width: 56, height: 56, justifyContent: 'center', alignItems: 'center' },
  statusPulse: {
    position: 'absolute', width: 56, height: 56, borderRadius: 28,
    backgroundColor: 'rgba(255,255,255,0.22)',
  },
  statusIcon: {
    width: 52, height: 52, borderRadius: 26, backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center', justifyContent: 'center',
  },
  heroLabel: { fontFamily: FONTS.bold, fontSize: 18, lineHeight: 24, color: COLORS.white },
  heroDesc: { fontFamily: FONTS.regular, fontSize: 13, color: 'rgba(255,255,255,0.88)' },
  liveBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 10, paddingVertical: 5,
    borderRadius: RADIUS.pill,
  },
  liveDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#4ADE80' },
  liveText: { fontFamily: FONTS.bold, fontSize: 10, color: COLORS.white, letterSpacing: 0.5 },
  progressTrack: {
    height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.25)',
    marginTop: 16, overflow: 'hidden',
  },
  progressFill: { height: 6, borderRadius: 3, backgroundColor: COLORS.white },

  // Courier
  courierCard: { flexDirection: 'row', alignItems: 'center', gap: 14, marginTop: 16 },
  courierAvatar: {
    width: 52, height: 52, borderRadius: 26,
    backgroundColor: COLORS.primarySoft, justifyContent: 'center', alignItems: 'center',
  },
  courierAvatarText: { fontFamily: FONTS.bold, fontSize: 21, color: COLORS.primary },

  // Timeline
  tlRow: { flexDirection: 'row' },
  tlLeft: { alignItems: 'center', width: 30, marginRight: 12 },
  tlDot: {
    width: 26, height: 26, borderRadius: 13, backgroundColor: COLORS.divider,
    justifyContent: 'center', alignItems: 'center',
  },
  tlDotDone: { backgroundColor: COLORS.successSoft },
  tlDotCurrent: { backgroundColor: COLORS.primary, width: 30, height: 30, borderRadius: 15, ...SHADOWS.primary },
  tlLine: { width: 2, flex: 1, minHeight: 20, backgroundColor: COLORS.divider, marginVertical: 2 },
  tlLineDone: { backgroundColor: '#9EDCB4' },
  tlContent: { flex: 1, paddingBottom: 22, paddingTop: 3 },
  tlLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  tlLabel: { fontFamily: FONTS.medium, fontSize: 14, color: COLORS.text },

  inlineActionBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start',
    marginTop: 8, backgroundColor: COLORS.primarySoft,
    borderRadius: RADIUS.pill, paddingHorizontal: 14, paddingVertical: 7,
  },
  inlineActionBtnText: { fontFamily: FONTS.semibold, fontSize: 13, color: COLORS.primary },

  // Delivered
  deliveredCard: { alignItems: 'center', marginTop: 16, backgroundColor: COLORS.successSoft },
  deliveredIcon: {
    width: 68, height: 68, borderRadius: 34, backgroundColor: COLORS.white,
    alignItems: 'center', justifyContent: 'center', marginBottom: 10,
  },

  // Contact
  contactSection: { gap: 10 },
});
