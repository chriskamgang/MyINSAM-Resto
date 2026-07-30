import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  SafeAreaView, ActivityIndicator, Linking, Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { marketService } from '../../services/marketService';

const COLORS = { primary: '#FF6B35', bg: '#f8f8f8', card: '#fff', text: '#1a1a1a', gray: '#888' };

const STATUS_STEPS = [
  { key: 'pending',     label: 'En attente',         iconName: 'time-outline',                desc: 'Votre commande est en attente' },
  { key: 'assigned',    label: 'Coursier assign\u00e9',   iconName: 'person-outline',              desc: 'Un coursier a \u00e9t\u00e9 assign\u00e9' },
  { key: 'at_market',   label: 'Au march\u00e9',          iconName: 'storefront-outline',          desc: 'Le coursier est au march\u00e9' },
  { key: 'photos_sent', label: 'Photos envoy\u00e9es',    iconName: 'camera-outline',              desc: 'V\u00e9rifiez les articles dans le d\u00e9tail' },
  { key: 'validated',   label: 'Valid\u00e9',              iconName: 'checkmark-circle-outline',    desc: 'Achats valid\u00e9s' },
  { key: 'purchasing',  label: 'Achats en cours',     iconName: 'cart-outline',                desc: 'Le coursier effectue les achats' },
  { key: 'delivering',  label: 'En livraison',        iconName: 'bicycle-outline',             desc: 'Vos courses arrivent bient\u00f4t !' },
  { key: 'delivered',   label: 'Livr\u00e9',               iconName: 'checkmark-done-circle-outline', desc: 'Vos courses sont arriv\u00e9es' },
];

export default function MarketOrderTrackingScreen({ route, navigation }) {
  const { orderId } = route.params;
  const [trackData, setTrackData] = useState(null);
  const [loading, setLoading] = useState(true);
  const intervalRef = useRef(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Pulse animation
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.4, duration: 700, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1.0, duration: 700, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  const loadTracking = async () => {
    try {
      const data = await marketService.trackOrder(orderId);
      setTrackData(data);
      if (['delivered', 'cancelled'].includes(data.status || data.order_status)) {
        clearInterval(intervalRef.current);
      }
    } catch (e) {
      console.error('Erreur tracking march\u00e9:', e);
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
    Linking.openURL('tel:+237600000000');
  };

  if (loading) {
    return <View style={styles.loader}><ActivityIndicator size="large" color={COLORS.primary} /></View>;
  }

  const status = trackData?.status || trackData?.order_status || 'pending';
  const currentStepIdx = STATUS_STEPS.findIndex(s => s.key === status);
  const currentStep = STATUS_STEPS[Math.max(currentStepIdx, 0)];
  const courier = trackData?.courier;
  const isActive = !['delivered', 'cancelled'].includes(status);

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.backText}>{'\u2190'}</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Suivi march\u00e9</Text>
        <TouchableOpacity onPress={loadTracking} style={styles.refreshBtn}>
          <Ionicons name="refresh-outline" size={22} color={COLORS.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Current status banner */}
        <View style={styles.statusBanner}>
          <View style={styles.statusIconWrap}>
            {isActive && (
              <Animated.View style={[styles.statusPulse, { transform: [{ scale: pulseAnim }] }]} />
            )}
            <Ionicons name={currentStep.iconName} size={32} color="#fff" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.statusLabel}>{currentStep.label}</Text>
            <Text style={styles.statusDesc}>{currentStep.desc}</Text>
          </View>
          {isActive && (
            <View style={styles.liveBadge}>
              <View style={styles.liveDot} />
              <Text style={styles.liveText}>LIVE</Text>
            </View>
          )}
        </View>

        {/* Courier card */}
        {courier && (
          <View style={styles.courierCard}>
            <View style={styles.courierAvatar}>
              <Text style={styles.courierAvatarText}>
                {courier.name?.charAt(0)?.toUpperCase() || '?'}
              </Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.courierName}>{courier.name}</Text>
              <Text style={styles.courierRole}>Coursier</Text>
              {courier.rating && (
                <Text style={styles.courierRating}>
                  <Ionicons name="star" size={13} color="#f59e0b" /> {Number(courier.rating).toFixed(1)}
                </Text>
              )}
            </View>
            {courier.phone && (
              <TouchableOpacity style={styles.callBtn} onPress={callCourier}>
                <Ionicons name="call" size={18} color="#fff" />
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Timeline */}
        <View style={styles.timelineCard}>
          <Text style={styles.timelineTitle}>Progression</Text>
          {STATUS_STEPS.map((step, idx) => {
            const isDone = idx <= currentStepIdx;
            const isCurrent = idx === currentStepIdx;
            return (
              <View key={step.key} style={styles.timelineRow}>
                <View style={styles.timelineLeft}>
                  <View style={[
                    styles.dot,
                    isDone && styles.dotDone,
                    isCurrent && styles.dotCurrent,
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
                    <View style={[styles.line, isDone && idx < currentStepIdx && styles.lineDone]} />
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

                  {/* Link to detail for photo validation */}
                  {isCurrent && step.key === 'photos_sent' && (
                    <TouchableOpacity
                      style={styles.inlineActionBtn}
                      onPress={() => navigation.navigate('MarketOrderDetail', { orderId })}
                    >
                      <Text style={styles.inlineActionBtnText}>
                        <Ionicons name="camera-outline" size={14} color={COLORS.primary} /> Voir les photos
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            );
          })}
        </View>

        {/* Delivered state */}
        {status === 'delivered' && (
          <View style={styles.deliveredSection}>
            <Ionicons name="checkmark-done-circle" size={56} color="#22c55e" style={{ marginBottom: 12 }} />
            <Text style={styles.deliveredTitle}>Courses livr\u00e9es !</Text>
            <Text style={styles.deliveredSub}>Merci pour votre confiance</Text>
            <TouchableOpacity
              style={styles.detailBtn}
              onPress={() => navigation.replace('MarketOrderDetail', { orderId })}
            >
              <Text style={styles.detailBtnText}>Voir le d\u00e9tail</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Contact buttons */}
        <View style={styles.contactSection}>
          {courier?.phone && (
            <TouchableOpacity style={styles.contactBtn} onPress={callCourier}>
              <Ionicons name="call-outline" size={20} color={COLORS.primary} />
              <Text style={styles.contactBtnText}>Appeler le coursier</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity style={styles.contactBtn} onPress={callSupport}>
            <Ionicons name="headset-outline" size={20} color={COLORS.primary} />
            <Text style={styles.contactBtnText}>Contacter le support</Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 40 }} />
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
  headerTitle: { fontSize: 17, fontWeight: 'bold', color: COLORS.text },
  refreshBtn:  { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },

  // Status banner
  statusBanner: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: COLORS.primary, padding: 20, gap: 14,
  },
  statusIconWrap: { position: 'relative', justifyContent: 'center', alignItems: 'center' },
  statusPulse: {
    position: 'absolute', width: 50, height: 50, borderRadius: 25,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  statusLabel: { fontSize: 18, fontWeight: '800', color: '#fff', marginBottom: 2 },
  statusDesc:  { fontSize: 13, color: 'rgba(255,255,255,0.85)' },
  liveBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 10, paddingVertical: 6,
    borderRadius: 20,
  },
  liveDot:  { width: 8, height: 8, borderRadius: 4, backgroundColor: '#4ade80' },
  liveText: { fontSize: 10, color: '#fff', fontWeight: '800', letterSpacing: 0.5 },

  // Courier
  courierCard: {
    margin: 16, marginBottom: 0, backgroundColor: COLORS.card, borderRadius: 18,
    padding: 16, flexDirection: 'row', alignItems: 'center', gap: 14,
    shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8, elevation: 3,
  },
  courierAvatar: {
    width: 54, height: 54, borderRadius: 27,
    backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center',
  },
  courierAvatarText: { color: '#fff', fontSize: 22, fontWeight: 'bold' },
  courierName:    { fontSize: 16, fontWeight: '700', color: COLORS.text },
  courierRole:    { fontSize: 13, color: COLORS.gray, marginTop: 2 },
  courierRating:  { fontSize: 13, color: '#f59e0b', marginTop: 2 },
  callBtn: {
    backgroundColor: COLORS.primary, borderRadius: 14, width: 44, height: 44,
    justifyContent: 'center', alignItems: 'center',
  },

  // Timeline
  timelineCard:    { backgroundColor: COLORS.card, margin: 16, borderRadius: 18, padding: 18 },
  timelineTitle:   { fontSize: 15, fontWeight: '700', color: COLORS.text, marginBottom: 16 },
  timelineRow:     { flexDirection: 'row', alignItems: 'flex-start' },
  timelineLeft:    { alignItems: 'center', marginRight: 14, width: 26 },
  dot: {
    width: 26, height: 26, borderRadius: 13,
    backgroundColor: '#e5e7eb', justifyContent: 'center', alignItems: 'center',
  },
  dotDone:    { backgroundColor: '#d1fae5' },
  dotCurrent: { backgroundColor: COLORS.primary },
  line:       { width: 2, height: 34, backgroundColor: '#e5e7eb', marginVertical: 2 },
  lineDone:   { backgroundColor: '#86efac' },
  timelineContent: { flex: 1, paddingBottom: 28 },
  stepLabel:  { fontSize: 14, color: COLORS.text },
  stepDesc:   { fontSize: 12, color: COLORS.gray, marginTop: 3 },

  inlineActionBtn: {
    marginTop: 8, backgroundColor: '#FFF3E0',
    borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8,
    alignSelf: 'flex-start', borderWidth: 1, borderColor: '#FFD7B8',
  },
  inlineActionBtnText: { fontSize: 13, color: COLORS.primary, fontWeight: '700' },

  // Delivered
  deliveredSection: {
    margin: 16, backgroundColor: '#f0fdf4', borderRadius: 20,
    padding: 28, alignItems: 'center',
    borderWidth: 1.5, borderColor: '#86efac',
  },
  deliveredTitle: { fontSize: 20, fontWeight: '800', color: '#16a34a', marginBottom: 4 },
  deliveredSub:   { fontSize: 14, color: '#16a34a', marginBottom: 20 },
  detailBtn: {
    backgroundColor: COLORS.primary, paddingHorizontal: 28, paddingVertical: 13,
    borderRadius: 14,
  },
  detailBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 15 },

  // Contact
  contactSection: { marginHorizontal: 16, gap: 10 },
  contactBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    backgroundColor: COLORS.card, borderRadius: 14, paddingVertical: 14,
    borderWidth: 1.5, borderColor: COLORS.primary,
  },
  contactBtnText: { fontSize: 15, fontWeight: '600', color: COLORS.primary },
});
