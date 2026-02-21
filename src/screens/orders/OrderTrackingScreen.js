import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  SafeAreaView, ActivityIndicator, ScrollView,
  Linking, Animated,
} from 'react-native';
import MapView, { Marker, UrlTile, Polyline } from 'react-native-maps';
import { orderService } from '../../services/orderService';

const COLORS = { primary: '#FF6B35', bg: '#f8f8f8', card: '#fff', text: '#1a1a1a', gray: '#888' };

// Coordonnées restaurant (Évêché Macambou, Bafoussam)
const RESTAURANT = { latitude: 5.4720, longitude: 10.4180 };

const STATUS_STEPS = [
  { key: 'pending',    label: 'En attente',           icon: '⏳', desc: 'En attente de confirmation' },
  { key: 'confirmed',  label: 'Commande confirmée',   icon: '✅', desc: 'Le restaurant a reçu votre commande' },
  { key: 'preparing',  label: 'En préparation',        icon: '🍳', desc: 'Vos plats sont en cours de préparation' },
  { key: 'ready',      label: 'Prête',                 icon: '📦', desc: 'Un livreur récupère votre commande' },
  { key: 'picked_up',  label: 'Récupérée',             icon: '🛵', desc: 'Le livreur a pris votre commande' },
  { key: 'on_the_way', label: 'En route vers vous',    icon: '🚀', desc: 'Votre livreur est en chemin !' },
  { key: 'delivered',  label: 'Livrée',                icon: '🏠', desc: 'Bon appétit !' },
];

// Statuts où le livreur est visible sur la carte
const DRIVER_VISIBLE_STATUSES = ['picked_up', 'on_the_way'];

export default function OrderTrackingScreen({ route, navigation }) {
  const { orderId } = route.params;

  const [trackData, setTrackData] = useState(null);
  const [order,     setOrder]     = useState(null);
  const [loading,   setLoading]   = useState(true);
  const [showMap,   setShowMap]   = useState(false);

  const intervalRef  = useRef(null);
  const mapRef       = useRef(null);
  const pulseAnim    = useRef(new Animated.Value(1)).current;

  // Animation pulsation sur le marqueur livreur
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.3, duration: 600, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1.0, duration: 600, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  const loadTracking = async () => {
    try {
      // Appel /api/orders/{id}/track pour la position + statut
      const [trackRes, orderRes] = await Promise.all([
        orderService.trackOrder(orderId),
        orderService.getOrder(orderId),
      ]);
      setTrackData(trackRes);
      setOrder(orderRes);

      if (['delivered', 'cancelled'].includes(orderRes.status)) {
        clearInterval(intervalRef.current);
      }
    } catch (e) {
      console.error('Erreur tracking:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTracking();
    intervalRef.current = setInterval(loadTracking, 10000); // refresh 10s
    return () => clearInterval(intervalRef.current);
  }, [orderId]);

  // Quand la position du livreur change, centrer la carte sur lui
  useEffect(() => {
    if (showMap && trackData?.driver_location?.latitude && mapRef.current) {
      mapRef.current.animateToRegion({
        latitude:      parseFloat(trackData.driver_location.latitude),
        longitude:     parseFloat(trackData.driver_location.longitude),
        latitudeDelta:  0.02,
        longitudeDelta: 0.02,
      }, 800);
    }
  }, [trackData?.driver_location, showMap]);

  if (loading) {
    return <View style={styles.loader}><ActivityIndicator size="large" color={COLORS.primary} /></View>;
  }

  const status         = trackData?.order_status || order?.status || 'pending';
  const currentStepIdx = STATUS_STEPS.findIndex(s => s.key === status);
  const currentStep    = STATUS_STEPS[Math.max(currentStepIdx, 0)];
  const driver         = trackData?.driver;
  const driverLoc      = trackData?.driver_location;
  const clientCoords   = trackData?.delivery_coords;
  const driverVisible  = DRIVER_VISIBLE_STATUSES.includes(status);

  // Région initiale de la carte
  const mapRegion = driverLoc?.latitude ? {
    latitude:      parseFloat(driverLoc.latitude),
    longitude:     parseFloat(driverLoc.longitude),
    latitudeDelta:  0.03,
    longitudeDelta: 0.03,
  } : clientCoords?.lat ? {
    latitude:      parseFloat(clientCoords.lat),
    longitude:     parseFloat(clientCoords.lng),
    latitudeDelta:  0.05,
    longitudeDelta: 0.05,
  } : {
    latitude:  RESTAURANT.latitude,
    longitude: RESTAURANT.longitude,
    latitudeDelta:  0.05,
    longitudeDelta: 0.05,
  };

  // Points pour la polyline (restaurant → livreur → client)
  const polylinePoints = [];
  if (clientCoords?.lat) polylinePoints.push({ latitude: parseFloat(clientCoords.lat), longitude: parseFloat(clientCoords.lng) });
  if (driverLoc?.latitude) polylinePoints.push({ latitude: parseFloat(driverLoc.latitude), longitude: parseFloat(driverLoc.longitude) });
  polylinePoints.push(RESTAURANT);

  const callDriver = () => {
    if (driver?.phone) Linking.openURL(`tel:${driver.phone}`);
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Suivi de livraison</Text>
        <TouchableOpacity onPress={loadTracking} style={styles.refreshBtn}>
          <Text style={styles.refreshIcon}>↻</Text>
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>

        {/* ── Statut principal ── */}
        <View style={styles.statusBanner}>
          <Text style={styles.statusIcon}>{currentStep.icon}</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.statusLabel}>{currentStep.label}</Text>
            <Text style={styles.statusDesc}>{currentStep.desc}</Text>
          </View>
          {/* Indicateur de live */}
          {driverVisible && (
            <View style={styles.liveBadge}>
              <View style={styles.liveDot} />
              <Text style={styles.liveText}>EN DIRECT</Text>
            </View>
          )}
        </View>

        {/* ── Carte ── */}
        {showMap ? (
          <View style={styles.mapContainer}>
            <MapView ref={mapRef} style={styles.map} initialRegion={mapRegion}>
              <UrlTile
                urlTemplate="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
                maximumZ={19} flipY={false}
              />

              {/* Marqueur restaurant */}
              <Marker coordinate={RESTAURANT} title="Restaurant" anchor={{ x: 0.5, y: 0.5 }}>
                <View style={styles.markerRestaurant}>
                  <Text style={{ fontSize: 20 }}>🍴</Text>
                </View>
              </Marker>

              {/* Marqueur client */}
              {clientCoords?.lat && (
                <Marker
                  coordinate={{ latitude: parseFloat(clientCoords.lat), longitude: parseFloat(clientCoords.lng) }}
                  title="Votre adresse"
                  anchor={{ x: 0.5, y: 1 }}
                >
                  <View style={styles.markerClient}>
                    <Text style={{ fontSize: 20 }}>📍</Text>
                  </View>
                </Marker>
              )}

              {/* Marqueur livreur animé */}
              {driverVisible && driverLoc?.latitude && (
                <Marker
                  coordinate={{ latitude: parseFloat(driverLoc.latitude), longitude: parseFloat(driverLoc.longitude) }}
                  title={driver?.name || 'Livreur'}
                  anchor={{ x: 0.5, y: 0.5 }}
                >
                  <Animated.View style={[styles.markerDriver, { transform: [{ scale: pulseAnim }] }]}>
                    <Text style={{ fontSize: 22 }}>🛵</Text>
                  </Animated.View>
                </Marker>
              )}

              {/* Ligne trajet */}
              {polylinePoints.length >= 2 && (
                <Polyline
                  coordinates={polylinePoints}
                  strokeColor={COLORS.primary}
                  strokeWidth={3}
                  lineDashPattern={[8, 4]}
                />
              )}
            </MapView>

            {/* Bouton masquer carte */}
            <TouchableOpacity style={styles.hideMapBtn} onPress={() => setShowMap(false)}>
              <Text style={styles.hideMapText}>✕ Fermer la carte</Text>
            </TouchableOpacity>
          </View>
        ) : (
          /* Bouton "Voir le livreur" — visible uniquement quand il est en route */
          driverVisible ? (
            <TouchableOpacity style={styles.showMapBtn} onPress={() => setShowMap(true)} activeOpacity={0.85}>
              <Text style={styles.showMapBtnIcon}>🗺️</Text>
              <View>
                <Text style={styles.showMapBtnTitle}>Voir le livreur en direct</Text>
                <Text style={styles.showMapBtnSub}>Suivez sa position en temps réel</Text>
              </View>
              <Text style={styles.showMapArrow}>›</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.mapPreview}>
              <Text style={styles.mapPreviewEmoji}>🗺️</Text>
              <Text style={styles.mapPreviewText}>La carte s'activera quand le livreur sera en route</Text>
            </View>
          )
        )}

        {/* ── Livreur card ── */}
        {driver && (
          <View style={styles.driverCard}>
            <View style={styles.driverAvatar}>
              <Text style={styles.driverAvatarText}>
                {driver.name?.charAt(0)?.toUpperCase() || '?'}
              </Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.driverName}>{driver.name}</Text>
              <Text style={styles.driverVehicle}>🛵 {driver.vehicle_type || 'Moto'}</Text>
              {driver.rating && (
                <Text style={styles.driverRating}>⭐ {Number(driver.rating).toFixed(1)}</Text>
              )}
            </View>
            {driver.phone && (
              <TouchableOpacity style={styles.callBtn} onPress={callDriver}>
                <Text style={styles.callBtnIcon}>📞</Text>
                <Text style={styles.callBtnText}>Appeler</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* ── Timeline progression ── */}
        <View style={styles.timelineCard}>
          <Text style={styles.timelineTitle}>Progression</Text>
          {STATUS_STEPS.filter(s => s.key !== 'pending').map((step, idx) => {
            const realIdx   = STATUS_STEPS.findIndex(s => s.key === step.key);
            const isDone    = realIdx <= currentStepIdx;
            const isCurrent = step.key === status;
            return (
              <View key={step.key} style={styles.timelineRow}>
                <View style={styles.timelineLeft}>
                  <View style={[styles.dot, isDone && styles.dotDone, isCurrent && styles.dotCurrent]}>
                    {isDone
                      ? <Text style={styles.dotCheck}>{isCurrent ? step.icon : '✓'}</Text>
                      : null
                    }
                  </View>
                  {idx < STATUS_STEPS.length - 2 && (
                    <View style={[styles.line, isDone && realIdx < currentStepIdx && styles.lineDone]} />
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

                  {/* Bouton carte intégré à "En route" */}
                  {isCurrent && step.key === 'on_the_way' && !showMap && (
                    <TouchableOpacity style={styles.inlineMapBtn} onPress={() => setShowMap(true)}>
                      <Text style={styles.inlineMapBtnText}>📍 Voir le livreur sur la carte</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            );
          })}
        </View>

        {/* ── Adresse de livraison ── */}
        {order?.address && (
          <View style={styles.addressCard}>
            <Text style={styles.addressIcon}>📍</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.addressLabel}>Livraison à</Text>
              <Text style={styles.addressValue}>{order.address.address}</Text>
              {order.address.phone && (
                <Text style={styles.addressPhone}>📞 {order.address.phone}</Text>
              )}
            </View>
          </View>
        )}

        {/* ── Livré ── */}
        {order?.status === 'delivered' && (
          <View style={styles.deliveredSection}>
            <Text style={styles.deliveredEmoji}>🎉</Text>
            <Text style={styles.deliveredTitle}>Commande livrée !</Text>
            <Text style={styles.deliveredSub}>Bon appétit !</Text>
            <TouchableOpacity
              style={styles.detailBtn}
              onPress={() => navigation.replace('OrderDetail', { orderId })}
            >
              <Text style={styles.detailBtnText}>Voir le détail</Text>
            </TouchableOpacity>
          </View>
        )}

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
  refreshIcon: { fontSize: 22, color: COLORS.primary },

  // Statut bannière
  statusBanner: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: COLORS.primary, padding: 20, gap: 14,
  },
  statusIcon:  { fontSize: 36 },
  statusLabel: { fontSize: 18, fontWeight: '800', color: '#fff', marginBottom: 2 },
  statusDesc:  { fontSize: 13, color: 'rgba(255,255,255,0.85)' },
  liveBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 10, paddingVertical: 6,
    borderRadius: 20,
  },
  liveDot:  { width: 8, height: 8, borderRadius: 4, backgroundColor: '#4ade80' },
  liveText: { fontSize: 10, color: '#fff', fontWeight: '800', letterSpacing: 0.5 },

  // Carte
  mapContainer: { height: 320, position: 'relative' },
  map:          { flex: 1 },
  hideMapBtn: {
    position: 'absolute', top: 10, right: 10,
    backgroundColor: '#fff', borderRadius: 20,
    paddingHorizontal: 14, paddingVertical: 8,
    shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 6, elevation: 4,
  },
  hideMapText: { fontSize: 13, fontWeight: '700', color: COLORS.text },

  // Bouton montrer carte
  showMapBtn: {
    margin: 16, backgroundColor: COLORS.card, borderRadius: 18,
    padding: 16, flexDirection: 'row', alignItems: 'center', gap: 14,
    borderWidth: 2, borderColor: COLORS.primary,
    shadowColor: COLORS.primary, shadowOpacity: 0.15, shadowRadius: 8, elevation: 3,
  },
  showMapBtnIcon:  { fontSize: 36 },
  showMapBtnTitle: { fontSize: 15, fontWeight: '800', color: COLORS.primary },
  showMapBtnSub:   { fontSize: 12, color: COLORS.gray, marginTop: 2 },
  showMapArrow:    { fontSize: 28, color: COLORS.primary, marginLeft: 'auto' },

  mapPreview: {
    margin: 16, backgroundColor: '#f8f8f8', borderRadius: 16,
    padding: 24, alignItems: 'center', borderWidth: 1, borderColor: '#e5e7eb',
  },
  mapPreviewEmoji: { fontSize: 40, marginBottom: 8 },
  mapPreviewText:  { fontSize: 13, color: COLORS.gray, textAlign: 'center', lineHeight: 18 },

  // Marqueurs carte
  markerRestaurant: {
    backgroundColor: '#fff', borderRadius: 24, padding: 6,
    borderWidth: 2, borderColor: COLORS.primary,
    shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 4, elevation: 4,
  },
  markerClient: {
    backgroundColor: '#fff', borderRadius: 24, padding: 4,
  },
  markerDriver: {
    backgroundColor: COLORS.primary, borderRadius: 28, padding: 8,
    shadowColor: COLORS.primary, shadowOpacity: 0.5, shadowRadius: 8, elevation: 6,
  },

  // Card livreur
  driverCard: {
    margin: 16, marginBottom: 0, backgroundColor: COLORS.card, borderRadius: 18,
    padding: 16, flexDirection: 'row', alignItems: 'center', gap: 14,
    shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8, elevation: 3,
  },
  driverAvatar:     { width: 54, height: 54, borderRadius: 27, backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center' },
  driverAvatarText: { color: '#fff', fontSize: 22, fontWeight: 'bold' },
  driverName:       { fontSize: 16, fontWeight: '700', color: COLORS.text },
  driverVehicle:    { fontSize: 13, color: COLORS.gray, marginTop: 2 },
  driverRating:     { fontSize: 13, color: '#f59e0b', marginTop: 2 },
  callBtn: {
    backgroundColor: '#f0fdf4', borderRadius: 14,
    paddingHorizontal: 14, paddingVertical: 10, alignItems: 'center',
    borderWidth: 1.5, borderColor: '#86efac',
  },
  callBtnIcon: { fontSize: 20 },
  callBtnText: { fontSize: 11, color: '#16a34a', fontWeight: '700', marginTop: 2 },

  // Timeline
  timelineCard:  { backgroundColor: COLORS.card, margin: 16, borderRadius: 18, padding: 18 },
  timelineTitle: { fontSize: 15, fontWeight: '700', color: COLORS.text, marginBottom: 16 },
  timelineRow:   { flexDirection: 'row', alignItems: 'flex-start' },
  timelineLeft:  { alignItems: 'center', marginRight: 14, width: 26 },
  dot: {
    width: 26, height: 26, borderRadius: 13,
    backgroundColor: '#e5e7eb', justifyContent: 'center', alignItems: 'center',
  },
  dotDone:    { backgroundColor: '#d1fae5' },
  dotCurrent: { backgroundColor: COLORS.primary },
  dotCheck:   { fontSize: 12, color: '#16a34a', fontWeight: 'bold' },
  line:       { width: 2, height: 34, backgroundColor: '#e5e7eb', marginVertical: 2 },
  lineDone:   { backgroundColor: '#86efac' },
  timelineContent: { flex: 1, paddingBottom: 28 },
  stepLabel:  { fontSize: 14, color: COLORS.text },
  stepDesc:   { fontSize: 12, color: COLORS.gray, marginTop: 3 },

  inlineMapBtn: {
    marginTop: 8, backgroundColor: '#FFF3E0',
    borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8,
    alignSelf: 'flex-start', borderWidth: 1, borderColor: '#FFD7B8',
  },
  inlineMapBtnText: { fontSize: 13, color: COLORS.primary, fontWeight: '700' },

  // Adresse
  addressCard: {
    backgroundColor: COLORS.card, marginHorizontal: 16, marginBottom: 12,
    borderRadius: 16, padding: 16, flexDirection: 'row', alignItems: 'flex-start', gap: 12,
  },
  addressIcon:  { fontSize: 20, marginTop: 2 },
  addressLabel: { fontSize: 12, color: COLORS.gray, marginBottom: 2 },
  addressValue: { fontSize: 14, color: COLORS.text, fontWeight: '500' },
  addressPhone: { fontSize: 13, color: COLORS.primary, fontWeight: '600', marginTop: 4 },

  // Livré
  deliveredSection: {
    margin: 16, backgroundColor: '#f0fdf4', borderRadius: 20,
    padding: 28, alignItems: 'center',
    borderWidth: 1.5, borderColor: '#86efac',
  },
  deliveredEmoji: { fontSize: 56, marginBottom: 12 },
  deliveredTitle: { fontSize: 20, fontWeight: '800', color: '#16a34a', marginBottom: 4 },
  deliveredSub:   { fontSize: 14, color: '#16a34a', marginBottom: 20 },
  detailBtn: {
    backgroundColor: COLORS.primary, paddingHorizontal: 28, paddingVertical: 13,
    borderRadius: 14,
  },
  detailBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 15 },
});
