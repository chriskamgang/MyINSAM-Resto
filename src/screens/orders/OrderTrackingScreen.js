import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  Linking, Animated,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
// Carte affichée uniquement à la demande (bouton « Voir le livreur en direct »)
import MapView, { Marker, UrlTile, Polyline } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';
import { orderService } from '../../services/orderService';
import { COLORS, FONTS, TYPE, RADIUS, SHADOWS, GRADIENTS, SCREEN_PADDING } from '../../theme';
import {
  Screen, ScreenHeader, IconButton, Card, Button, SmartImage, Rating, LoadingView, EmptyState,
} from '../../components/ui';

// Coordonnées restaurant par défaut (Évêché Macambou, Bafoussam) si l'API n'en fournit pas
const DEFAULT_RESTAURANT = { latitude: 5.4720, longitude: 10.4180 };

// Fréquences de rafraîchissement du suivi
const POLL_ACTIVE_MS = 5000;   // livreur en mission : position en direct
const POLL_IDLE_MS   = 10000;  // reste du temps
const STALE_POSITION_S = 120;  // au-delà, la position du livreur est considérée comme ancienne

// Nouveau parcours : le livreur accepte dès « en préparation », va au restaurant, puis vient chez le client
const STATUS_STEPS = [
  { key: 'pending',       label: 'Commande reçue',                     iconName: 'receipt-outline',          desc: 'En attente de validation par le restaurant' },
  { key: 'confirmed',     label: 'Validée',                            iconName: 'checkmark-circle-outline', desc: 'Le restaurant a validé votre commande' },
  { key: 'preparing',     label: 'En préparation',                     iconName: 'restaurant-outline',       desc: 'Vos plats sont en cours de préparation' },
  { key: 'to_restaurant', label: 'Livreur en route vers le restaurant', iconName: 'bicycle-outline',          desc: 'Votre livreur va chercher votre commande' },
  { key: 'picked_up',     label: 'Commande récupérée',                 iconName: 'bag-check-outline',        desc: 'Le livreur a récupéré votre commande' },
  { key: 'on_the_way',    label: 'En route vers vous',                 iconName: 'navigate-outline',         desc: 'Votre livreur est en chemin !' },
  { key: 'delivered',     label: 'Livrée',                             iconName: 'home-outline',             desc: 'Bon appétit !' },
];
const STEP_IDX = STATUS_STEPS.reduce((acc, s, i) => ({ ...acc, [s.key]: i }), {});

const CANCELLED_STEP = { key: 'cancelled', label: 'Commande annulée', iconName: 'close-circle-outline', desc: 'Cette commande a été annulée' };

// Statuts de livraison par phase
const TO_RESTAURANT_DELIVERY = ['assigned', 'going_to_restaurant', 'at_restaurant'];
const TO_CUSTOMER_DELIVERY   = ['picked_up', 'on_the_way', 'arrived'];
const FINISHED_ORDER         = ['delivered', 'cancelled'];

const formatClock = (d) => d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

const formatAge = (seconds) => {
  if (seconds < 60) return `${seconds} s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)} min`;
  return `${Math.floor(seconds / 3600)} h`;
};

// Convertit une paire lat/lng en coordonnée carte ; null si absente, invalide ou à 0
const toCoord = (lat, lng) => {
  const latitude  = parseFloat(lat);
  const longitude = parseFloat(lng);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
  if (latitude === 0 || longitude === 0) return null;
  if (Math.abs(latitude) > 90 || Math.abs(longitude) > 180) return null;
  return { latitude, longitude };
};

// Phase de livraison en direct : 'searching' | 'to_restaurant' | 'to_customer' | null
const getPhase = (orderStatus, deliveryStatus, hasDriver) => {
  if (FINISHED_ORDER.includes(orderStatus) || deliveryStatus === 'delivered') return null;
  if (TO_RESTAURANT_DELIVERY.includes(deliveryStatus)) return 'to_restaurant';
  if (TO_CUSTOMER_DELIVERY.includes(deliveryStatus)) return 'to_customer';
  // Pas de statut de livraison exploitable : on se base sur le statut commande
  if (!deliveryStatus || deliveryStatus === 'failed') {
    if (['picked_up', 'on_the_way'].includes(orderStatus)) return 'to_customer';
    if (['preparing', 'ready'].includes(orderStatus)) return hasDriver ? 'to_restaurant' : 'searching';
  }
  if (deliveryStatus === 'searching' && ['preparing', 'ready', 'confirmed'].includes(orderStatus)) return 'searching';
  return null;
};

// Étape de la timeline à partir du statut commande + statut livraison
const getStepIdx = (orderStatus, deliveryStatus, phase) => {
  if (orderStatus === 'delivered' || deliveryStatus === 'delivered') return STEP_IDX.delivered;
  if (['on_the_way', 'arrived'].includes(deliveryStatus) || orderStatus === 'on_the_way') return STEP_IDX.on_the_way;
  if (deliveryStatus === 'picked_up' || orderStatus === 'picked_up') return STEP_IDX.picked_up;
  if (phase === 'to_restaurant') return STEP_IDX.to_restaurant;
  if (['preparing', 'ready'].includes(orderStatus)) return STEP_IDX.preparing;
  if (orderStatus === 'confirmed') return STEP_IDX.confirmed;
  return STEP_IDX.pending;
};

// Bandeau principal selon la phase
const getHeadline = ({ isCancelled, phase, deliveryStatus, orderStatus, stepIdx }) => {
  if (isCancelled) return CANCELLED_STEP;
  if (phase === 'searching') {
    return {
      iconName: 'search-outline',
      label: 'Recherche d\'un livreur…',
      desc: orderStatus === 'ready' ? 'Votre commande est prête' : 'Votre commande est en préparation',
    };
  }
  if (phase === 'to_restaurant') {
    return deliveryStatus === 'at_restaurant'
      ? { iconName: 'storefront-outline', label: 'Votre livreur est au restaurant', desc: 'Il récupère votre commande' }
      : { iconName: 'bicycle-outline', label: 'Votre livreur va chercher votre commande', desc: 'Il est en route vers le restaurant' };
  }
  if (phase === 'to_customer') {
    return deliveryStatus === 'arrived'
      ? { iconName: 'location-outline', label: 'Votre livreur est arrivé', desc: 'Il vous attend à l\'adresse de livraison' }
      : { iconName: 'navigate-outline', label: 'Votre livreur arrive', desc: 'Il est en route avec votre commande' };
  }
  return STATUS_STEPS[stepIdx];
};

// Âge de la dernière position du livreur (se met à jour toutes les secondes, isolé pour ne pas re-rendre la carte)
function LocationAge({ updatedAt }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const ts = updatedAt ? new Date(updatedAt).getTime() : NaN;
  if (!Number.isFinite(ts)) {
    return (
      <View style={styles.locAgeRow}>
        <Ionicons name="locate-outline" size={13} color={COLORS.textMuted} />
        <Text style={styles.locAgeText}>Position du livreur en attente…</Text>
      </View>
    );
  }
  const seconds = Math.max(0, Math.round((now - ts) / 1000));
  const stale = seconds > STALE_POSITION_S;
  return (
    <View style={[styles.locAgeRow, stale && styles.locAgeStale]}>
      <Ionicons
        name={stale ? 'warning-outline' : 'locate-outline'}
        size={13}
        color={stale ? COLORS.warning : COLORS.success}
      />
      <Text style={[styles.locAgeText, stale && { color: COLORS.text }]}>
        {stale
          ? `Position du livreur non mise à jour depuis ${formatAge(seconds)}`
          : `Position mise à jour il y a ${formatAge(seconds)}`}
      </Text>
    </View>
  );
}

export default function OrderTrackingScreen({ route, navigation }) {
  const { orderId } = route.params;
  const insets = useSafeAreaInsets();

  const [trackData, setTrackData] = useState(null);
  const [order,     setOrder]     = useState(null);
  const [loading,   setLoading]   = useState(true);
  const [showMap,   setShowMap]   = useState(false);
  const [mapReady,  setMapReady]  = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [fetchError,  setFetchError]  = useState(false);

  const pollRef    = useRef(null);
  const mountedRef = useRef(true);
  const mapRef     = useRef(null);
  const pulseAnim  = useRef(new Animated.Value(1)).current;

  // Animation pulsation (point actif de la timeline)
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.3, duration: 600, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1.0, duration: 600, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, []);

  // Charge le suivi ; renvoie { finished, active } pour piloter la fréquence de rafraîchissement
  const loadTracking = useCallback(async () => {
    // Les deux appels sont indépendants : si l'un échoue, on garde l'autre
    const [trackRes, orderRes] = await Promise.allSettled([
      orderService.trackOrder(orderId), // /api/orders/{id}/track : position + statut
      orderService.getOrder(orderId),
    ]);
    if (!mountedRef.current) return { finished: true, active: false };

    const track = trackRes.status === 'fulfilled' ? trackRes.value : null;
    const ord   = orderRes.status === 'fulfilled' ? orderRes.value : null;
    if (track) setTrackData(track);
    else console.error('Erreur tracking:', trackRes.reason);
    if (ord) setOrder(ord);
    else console.error('Erreur commande:', orderRes.reason);

    if (track || ord) {
      setLastUpdated(new Date());
      setFetchError(false);
    } else {
      setFetchError(true);
    }
    setLoading(false);

    const latestStatus   = track?.order_status || ord?.status;
    const deliveryStatus = track?.delivery_status;
    const finished = FINISHED_ORDER.includes(latestStatus) || deliveryStatus === 'delivered';
    const active   = TO_RESTAURANT_DELIVERY.includes(deliveryStatus) || TO_CUSTOMER_DELIVERY.includes(deliveryStatus);
    return { finished, active };
  }, [orderId]);

  // Boucle de suivi : 5 s pendant la livraison, 10 s sinon, arrêt une fois livrée/annulée
  useEffect(() => {
    mountedRef.current = true;
    let cancelled = false;

    const tick = async () => {
      let res = { finished: false, active: false };
      try { res = await loadTracking(); } catch (e) { console.error('Erreur suivi:', e); }
      if (cancelled || !mountedRef.current || res.finished) return;
      pollRef.current = setTimeout(tick, res.active ? POLL_ACTIVE_MS : POLL_IDLE_MS);
    };
    tick();

    return () => {
      cancelled = true;
      mountedRef.current = false;
      clearTimeout(pollRef.current);
      pollRef.current = null;
    };
  }, [loadTracking]);

  // ── Données dérivées (calculées avant tout return conditionnel pour respecter l'ordre des hooks) ──
  const status         = trackData?.order_status || order?.status || 'pending';
  const deliveryStatus = trackData?.delivery_status || null;
  const driver         = trackData?.driver;
  // L'API renvoie toujours un objet driver (champs null tant qu'aucun livreur n'est assigné)
  const hasDriver      = !!(driver?.id || driver?.name);
  const phase          = getPhase(status, deliveryStatus, hasDriver);
  const liveActive     = phase === 'to_restaurant' || phase === 'to_customer';

  const driverCoord = useMemo(
    () => (liveActive ? toCoord(trackData?.driver_location?.latitude, trackData?.driver_location?.longitude) : null),
    [liveActive, trackData?.driver_location?.latitude, trackData?.driver_location?.longitude]
  );
  const restaurantCoord = useMemo(
    () => toCoord(trackData?.restaurant_coords?.lat, trackData?.restaurant_coords?.lng) || DEFAULT_RESTAURANT,
    [trackData?.restaurant_coords?.lat, trackData?.restaurant_coords?.lng]
  );
  const clientCoord = useMemo(
    () => toCoord(trackData?.delivery_coords?.lat, trackData?.delivery_coords?.lng),
    [trackData?.delivery_coords?.lat, trackData?.delivery_coords?.lng]
  );
  // Destination actuelle du livreur : restaurant (phase 1) puis client (phase 2)
  const targetCoord = phase === 'to_restaurant' ? restaurantCoord : phase === 'to_customer' ? clientCoord : null;

  const routeLine = useMemo(
    () => (driverCoord && targetCoord ? [driverCoord, targetCoord] : null),
    [driverCoord, targetCoord]
  );

  // Cadrer la carte sur livreur + destination (ou restaurant + client à défaut)
  const fitMap = useCallback(() => {
    if (!mapRef.current) return;
    const points = [driverCoord, targetCoord].filter(Boolean);
    if (points.length < 2) {
      if (!driverCoord) {
        [restaurantCoord, clientCoord].filter(Boolean).forEach(p => {
          if (!points.some(q => q.latitude === p.latitude && q.longitude === p.longitude)) points.push(p);
        });
      }
    }
    try {
      if (points.length >= 2) {
        mapRef.current.fitToCoordinates(points, {
          edgePadding: { top: 70, right: 50, bottom: 50, left: 50 },
          animated: true,
        });
      } else if (points.length === 1) {
        mapRef.current.animateToRegion({ ...points[0], latitudeDelta: 0.02, longitudeDelta: 0.02 }, 800);
      }
    } catch (e) {
      console.warn('Cadrage carte impossible:', e);
    }
  }, [driverCoord, targetCoord, restaurantCoord, clientCoord]);

  useEffect(() => {
    if (showMap && mapReady) fitMap();
  }, [showMap, mapReady, fitMap]);

  // La carte n'est montée que pendant une livraison active et sur demande explicite
  const mapVisible = showMap && liveActive;
  useEffect(() => {
    if (!mapVisible) setMapReady(false);
  }, [mapVisible]);

  if (loading) {
    return <Screen><LoadingView label="Chargement du suivi…" /></Screen>;
  }

  if (!trackData && !order) {
    return (
      <Screen>
        <ScreenHeader title="Suivi de livraison" onBack={() => navigation.goBack()} />
        <EmptyState
          icon="cloud-offline-outline"
          title="Suivi indisponible"
          message="Impossible de récupérer l'état de votre commande pour le moment."
          actionLabel="Réessayer"
          onAction={() => { setLoading(true); loadTracking(); }}
        />
      </Screen>
    );
  }

  const isCancelled    = status === 'cancelled';
  const isDelivered    = status === 'delivered' || deliveryStatus === 'delivered';
  const currentStepIdx = getStepIdx(status, deliveryStatus, phase);
  const currentStepKey = STATUS_STEPS[currentStepIdx].key;
  const headline       = getHeadline({ isCancelled, phase, deliveryStatus, orderStatus: status, stepIdx: currentStepIdx });
  const cookingTimeLeft = trackData?.cooking_time_left;

  // Heure d'arrivée estimée
  const etaDate = trackData?.estimated_at ? new Date(trackData.estimated_at) : null;
  const etaValid = etaDate && !isNaN(etaDate.getTime());
  const etaMinutes = etaValid ? Math.max(0, Math.round((etaDate.getTime() - Date.now()) / 60000)) : null;

  let eta = null;
  if (!isCancelled && !isDelivered) {
    if (status === 'preparing' && phase !== 'to_customer' && cookingTimeLeft != null) {
      eta = {
        icon: 'flame-outline',
        label: 'Temps de cuisson restant',
        value: cookingTimeLeft > 0 ? `~${cookingTimeLeft} min` : 'Bientôt prêt !',
        hint: etaValid ? `Livraison estimée vers ${formatClock(etaDate)}` : null,
      };
    } else if (etaValid) {
      eta = {
        icon: 'time-outline',
        label: 'Arrivée estimée',
        value: etaMinutes > 0 ? `${formatClock(etaDate)}` : 'D\'un instant à l\'autre',
        hint: etaMinutes > 0 ? `Dans environ ${etaMinutes} min` : null,
      };
    }
  }

  // Région initiale de la carte
  const initialCenter = driverCoord || targetCoord || clientCoord || restaurantCoord;
  const mapRegion = { ...initialCenter, latitudeDelta: 0.03, longitudeDelta: 0.03 };

  const callDriver = () => {
    if (driver?.phone) Linking.openURL(`tel:${driver.phone}`);
  };

  const driverPhaseText = phase === 'to_restaurant'
    ? (deliveryStatus === 'at_restaurant' ? 'Au restaurant' : 'En route vers le restaurant')
    : phase === 'to_customer'
      ? (deliveryStatus === 'arrived' ? 'Arrivé à votre adresse' : 'En route vers vous')
      : null;

  const timelineSteps = STATUS_STEPS;

  return (
    <Screen>
      <ScreenHeader
        title="Suivi de livraison"
        subtitle={order?.order_number ? `Commande #${order.order_number}` : undefined}
        onBack={() => navigation.goBack()}
        right={<IconButton icon="refresh" onPress={loadTracking} color={COLORS.primary} />}
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: SCREEN_PADDING, paddingTop: 8, paddingBottom: insets.bottom + 32 }}
      >

        {/* ── Statut principal ── */}
        <LinearGradient
          colors={isCancelled ? [COLORS.danger, '#C62828'] : isDelivered ? [COLORS.success, '#12813B'] : GRADIENTS.primary}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
          style={styles.statusBanner}
        >
          <View style={styles.statusIcon}>
            <Ionicons name={headline.iconName} size={26} color={COLORS.white} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.statusLabel}>{headline.label}</Text>
            <Text style={styles.statusDesc}>{headline.desc}</Text>
          </View>
          {/* Indicateur de live */}
          {liveActive && (
            <View style={styles.liveBadge}>
              <View style={styles.liveDot} />
              <Text style={styles.liveText}>EN DIRECT</Text>
            </View>
          )}
        </LinearGradient>

        {/* ── Dernière mise à jour ── */}
        <View style={styles.updateRow}>
          <View style={[styles.updateDot, { backgroundColor: fetchError ? COLORS.danger : (isCancelled || isDelivered) ? COLORS.textLight : COLORS.success }]} />
          <Text style={styles.updateText}>
            {fetchError
              ? 'Connexion perdue · nouvelle tentative…'
              : (isCancelled || isDelivered)
                ? `Suivi terminé${lastUpdated ? ` · ${formatClock(lastUpdated)}` : ''}`
                : `Suivi en direct · mis à jour à ${lastUpdated ? formatClock(lastUpdated) : '—'}`}
          </Text>
        </View>

        {/* ── Heure d'arrivée / temps de cuisson ── */}
        {eta && (
          <Card style={styles.etaCard}>
            <View style={styles.etaIcon}>
              <Ionicons name={eta.icon} size={24} color={COLORS.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.etaLabel}>{eta.label}</Text>
              <Text style={styles.etaValue}>{eta.value}</Text>
              {eta.hint ? <Text style={TYPE.caption}>{eta.hint}</Text> : null}
            </View>
          </Card>
        )}

        {/* ── Carte (montée uniquement à la demande, pendant la livraison) ── */}
        {mapVisible ? (
          <View style={styles.mapContainer}>
            <MapView
              ref={mapRef}
              style={styles.map}
              initialRegion={mapRegion}
              onMapReady={() => setMapReady(true)}
            >
              <UrlTile
                urlTemplate="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
                maximumZ={19} flipY={false}
              />

              {/* Marqueur restaurant */}
              <Marker coordinate={restaurantCoord} title="Restaurant" anchor={{ x: 0.5, y: 0.5 }}>
                <View style={styles.markerRestaurant}>
                  <Ionicons name="restaurant" size={18} color={COLORS.primary} />
                </View>
              </Marker>

              {/* Marqueur client */}
              {clientCoord ? (
                <Marker coordinate={clientCoord} title="Votre adresse" anchor={{ x: 0.5, y: 0.5 }}>
                  <View style={styles.markerClient}>
                    <Ionicons name="home" size={18} color={COLORS.white} />
                  </View>
                </Marker>
              ) : null}

              {/* Marqueur livreur */}
              {driverCoord ? (
                <Marker
                  coordinate={driverCoord}
                  title={driver?.name || 'Livreur'}
                  description={driverPhaseText || undefined}
                  anchor={{ x: 0.5, y: 0.5 }}
                >
                  <View style={styles.markerDriver}>
                    <Ionicons name="bicycle" size={20} color={COLORS.white} />
                  </View>
                </Marker>
              ) : null}

              {/* Trajet livreur → destination actuelle */}
              {routeLine ? (
                <Polyline
                  coordinates={routeLine}
                  strokeColor={COLORS.info}
                  strokeWidth={4}
                  lineDashPattern={[10, 6]}
                />
              ) : null}
            </MapView>

            {/* Légende de la destination */}
            <View style={styles.mapLegend}>
              <Ionicons
                name={phase === 'to_restaurant' ? 'restaurant' : 'home'}
                size={13}
                color={phase === 'to_restaurant' ? COLORS.primary : COLORS.success}
              />
              <Text style={styles.mapLegendText}>
                {!driverCoord
                  ? 'Position du livreur en attente…'
                  : phase === 'to_restaurant' ? 'Vers le restaurant' : 'Vers votre adresse'}
              </Text>
            </View>

            {/* Recentrer */}
            <TouchableOpacity style={styles.recenterBtn} onPress={fitMap}>
              <Ionicons name="locate" size={18} color={COLORS.primary} />
            </TouchableOpacity>

            {/* Bouton masquer carte */}
            <TouchableOpacity style={styles.hideMapBtn} onPress={() => setShowMap(false)}>
              <Ionicons name="close" size={16} color={COLORS.text} />
              <Text style={styles.hideMapText}>Fermer la carte</Text>
            </TouchableOpacity>
          </View>
        ) : (
          /* Bouton "Voir le livreur" — dès qu'un livreur a accepté la commande */
          liveActive ? (
            <Card style={styles.showMapBtn} onPress={() => setShowMap(true)}>
              <View style={styles.showMapIcon}>
                <Ionicons name="map" size={22} color={COLORS.white} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.showMapBtnTitle}>Voir le livreur en direct</Text>
                <Text style={TYPE.caption}>
                  {phase === 'to_restaurant'
                    ? 'Suivez-le jusqu\'au restaurant, puis jusqu\'à vous'
                    : 'Suivez sa position en temps réel'}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={COLORS.primary} />
            </Card>
          ) : !isCancelled && !isDelivered ? (
            <View style={styles.mapPreview}>
              <Ionicons name={phase === 'searching' ? 'search-outline' : 'map-outline'} size={30} color={COLORS.textLight} />
              <Text style={styles.mapPreviewText}>
                {phase === 'searching'
                  ? 'Nous cherchons un livreur. La carte s\'activera dès qu\'il aura accepté votre commande.'
                  : 'La carte s\'activera dès qu\'un livreur aura accepté votre commande'}
              </Text>
            </View>
          ) : null
        )}

        {/* ── Livreur ── */}
        {hasDriver && !isCancelled && (
          <Card style={styles.driverCard}>
            <View style={styles.driverRow}>
              <SmartImage uri={driver.avatar} style={styles.driverAvatar} fallbackIcon="person" iconSize={24}>
                {!driver.avatar && driver.name ? (
                  <View style={styles.driverInitial}>
                    <Text style={styles.driverInitialText}>{driver.name.charAt(0).toUpperCase()}</Text>
                  </View>
                ) : null}
              </SmartImage>
              <View style={{ flex: 1 }}>
                <Text style={TYPE.caption}>{driverPhaseText ? `Votre livreur · ${driverPhaseText}` : 'Votre livreur'}</Text>
                <Text style={styles.driverName} numberOfLines={1}>{driver.name || 'Livreur'}</Text>
                <View style={styles.driverMeta}>
                  <View style={styles.driverVehicle}>
                    <Ionicons name="bicycle-outline" size={14} color={COLORS.textMuted} />
                    <Text style={TYPE.caption}>{driver.vehicle_type || 'Moto'}</Text>
                  </View>
                  {driver.rating ? <Rating value={driver.rating} size={12} /> : null}
                </View>
              </View>
              {driver.phone && !isDelivered ? (
                <IconButton icon="call" onPress={callDriver} bg={COLORS.success} color={COLORS.white} size={48} iconSize={20} />
              ) : null}
            </View>
            {liveActive && <LocationAge updatedAt={trackData?.driver_location?.updated_at} />}
          </Card>
        )}

        {/* ── Timeline progression ── */}
        {!isCancelled && (
          <Card style={styles.timelineCard}>
            <View style={styles.timelineHeader}>
              <View style={styles.sectionBar} />
              <Text style={TYPE.h3}>Progression</Text>
            </View>
            {timelineSteps.map((step, idx) => {
              const isDone    = idx <= currentStepIdx;
              const isCurrent = step.key === currentStepKey;
              const isLast    = idx === timelineSteps.length - 1;
              const showInlineMap = isCurrent && liveActive && !showMap
                && (step.key === 'to_restaurant' || step.key === 'picked_up' || step.key === 'on_the_way');
              return (
                <View key={step.key} style={styles.timelineRow}>
                  <View style={styles.timelineLeft}>
                    <View style={styles.dotWrap}>
                      {isCurrent && !isDelivered && (
                        <Animated.View style={[styles.dotHalo, { transform: [{ scale: pulseAnim }] }]} />
                      )}
                      <View style={[styles.dot, isDone && styles.dotDone, isCurrent && styles.dotCurrent]}>
                        <Ionicons
                          name={isCurrent ? step.iconName : isDone ? 'checkmark' : step.iconName}
                          size={isCurrent ? 16 : 14}
                          color={isDone ? COLORS.white : COLORS.textLight}
                        />
                      </View>
                    </View>
                    {!isLast && (
                      <View style={[styles.line, idx < currentStepIdx && styles.lineDone]} />
                    )}
                  </View>
                  <View style={[styles.timelineContent, isLast && { paddingBottom: 0 }]}>
                    <Text style={[
                      styles.stepLabel,
                      isCurrent && styles.stepLabelCurrent,
                      !isDone && { color: COLORS.textLight },
                    ]}>
                      {step.label}
                    </Text>
                    {isCurrent && (
                      <Text style={styles.stepDesc}>
                        {step.key === 'preparing' && phase === 'searching' ? 'Recherche d\'un livreur…' : step.desc}
                      </Text>
                    )}

                    {/* Bouton carte intégré aux étapes de livraison */}
                    {showInlineMap && (
                      <TouchableOpacity style={styles.inlineMapBtn} onPress={() => setShowMap(true)}>
                        <Ionicons name="location" size={14} color={COLORS.primary} />
                        <Text style={styles.inlineMapBtnText}>Voir le livreur sur la carte</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              );
            })}
          </Card>
        )}

        {/* ── Adresse de livraison ── */}
        {order?.address && (
          <Card style={styles.addressCard}>
            <View style={styles.addressIcon}>
              <Ionicons name="location" size={20} color={COLORS.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={TYPE.caption}>Livraison à</Text>
              <Text style={styles.addressValue}>{order.address.address}</Text>
              {order.address.phone ? (
                <View style={styles.addressPhone}>
                  <Ionicons name="call-outline" size={12} color={COLORS.primary} />
                  <Text style={styles.addressPhoneText}>{order.address.phone}</Text>
                </View>
              ) : null}
            </View>
          </Card>
        )}

        {/* ── Livré ── */}
        {isDelivered && (
          <Card style={styles.deliveredSection}>
            <View style={styles.deliveredIcon}>
              <Ionicons name="checkmark-done" size={36} color={COLORS.success} />
            </View>
            <Text style={[TYPE.h2, { color: COLORS.success }]}>Commande livrée !</Text>
            <Text style={[TYPE.bodyMuted, { marginBottom: 18 }]}>Bon appétit !</Text>
            <Button
              title="Voir le détail"
              size="md"
              style={{ alignSelf: 'stretch' }}
              onPress={() => navigation.replace('OrderDetail', { orderId })}
            />
          </Card>
        )}

        {isCancelled && (
          <Button
            title="Voir le détail"
            variant="outline"
            size="md"
            style={{ marginTop: 16 }}
            onPress={() => navigation.replace('OrderDetail', { orderId })}
          />
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  // Statut bannière
  statusBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    borderRadius: RADIUS.xl, padding: 18, ...SHADOWS.primary,
  },
  statusIcon: {
    width: 50, height: 50, borderRadius: 25, backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center', justifyContent: 'center',
  },
  statusLabel: { fontFamily: FONTS.bold, fontSize: 18, lineHeight: 24, color: COLORS.white },
  statusDesc:  { fontFamily: FONTS.regular, fontSize: 13, lineHeight: 18, color: 'rgba(255,255,255,0.9)' },
  liveBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 10, paddingVertical: 6,
    borderRadius: RADIUS.pill,
  },
  liveDot:  { width: 8, height: 8, borderRadius: 4, backgroundColor: '#4ADE80' },
  liveText: { fontFamily: FONTS.bold, fontSize: 10, color: COLORS.white, letterSpacing: 0.5 },

  updateRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 10 },
  updateDot: { width: 8, height: 8, borderRadius: 4 },
  updateText: { fontFamily: FONTS.regular, fontSize: 12, color: COLORS.textMuted },

  // ETA
  etaCard: {
    marginTop: 12, flexDirection: 'row', alignItems: 'center', gap: 14,
    borderWidth: 1.5, borderColor: COLORS.primaryLight,
  },
  etaIcon: {
    width: 52, height: 52, borderRadius: 26, backgroundColor: COLORS.primarySoft,
    alignItems: 'center', justifyContent: 'center',
  },
  etaLabel: { fontFamily: FONTS.medium, fontSize: 12, color: COLORS.textMuted },
  etaValue: { fontFamily: FONTS.extrabold, fontSize: 24, lineHeight: 32, color: COLORS.primary },

  // Carte
  mapContainer: { height: 320, marginTop: 14, borderRadius: RADIUS.xl, overflow: 'hidden', ...SHADOWS.md },
  map:          { flex: 1 },
  hideMapBtn: {
    position: 'absolute', top: 10, right: 10, flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: COLORS.surface, borderRadius: RADIUS.pill,
    paddingHorizontal: 14, paddingVertical: 8, ...SHADOWS.md,
  },
  hideMapText: { fontFamily: FONTS.semibold, fontSize: 13, color: COLORS.text },

  showMapBtn: {
    marginTop: 14, flexDirection: 'row', alignItems: 'center', gap: 14,
    borderWidth: 1.5, borderColor: COLORS.primary,
  },
  showMapIcon: {
    width: 44, height: 44, borderRadius: 22, backgroundColor: COLORS.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  showMapBtnTitle: { fontFamily: FONTS.semibold, fontSize: 15, color: COLORS.primary },

  mapPreview: {
    marginTop: 14, backgroundColor: COLORS.surfaceAlt, borderRadius: RADIUS.xl,
    padding: 18, alignItems: 'center', flexDirection: 'row', gap: 12,
    borderWidth: 1, borderColor: COLORS.border, borderStyle: 'dashed',
  },
  mapPreviewText: { flex: 1, fontFamily: FONTS.regular, fontSize: 13, lineHeight: 18, color: COLORS.textMuted },

  // Marqueurs carte
  markerRestaurant: {
    backgroundColor: COLORS.surface, borderRadius: 24, padding: 6,
    borderWidth: 2, borderColor: COLORS.primary, ...SHADOWS.sm,
  },
  markerClient: {
    backgroundColor: COLORS.success, borderRadius: 24, padding: 6,
    borderWidth: 2, borderColor: COLORS.white, ...SHADOWS.sm,
  },
  markerDriver: {
    backgroundColor: COLORS.info, borderRadius: 28, padding: 8,
    borderWidth: 2, borderColor: COLORS.white, ...SHADOWS.md,
  },
  mapLegend: {
    position: 'absolute', top: 10, left: 10, flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: COLORS.surface, borderRadius: RADIUS.pill,
    paddingHorizontal: 12, paddingVertical: 8, ...SHADOWS.md,
  },
  mapLegendText: { fontFamily: FONTS.semibold, fontSize: 12, color: COLORS.text },
  recenterBtn: {
    position: 'absolute', bottom: 12, right: 12, width: 40, height: 40, borderRadius: 20,
    backgroundColor: COLORS.surface, alignItems: 'center', justifyContent: 'center', ...SHADOWS.md,
  },

  // Livreur
  driverCard: { marginTop: 14 },
  driverRow:  { flexDirection: 'row', alignItems: 'center', gap: 14 },
  locAgeRow: {
    flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 12,
    paddingTop: 10, borderTopWidth: 1, borderTopColor: COLORS.divider,
  },
  locAgeStale: {
    backgroundColor: COLORS.warningSoft, borderTopWidth: 0, borderRadius: RADIUS.md,
    paddingHorizontal: 10, paddingVertical: 8,
  },
  locAgeText: { flex: 1, fontFamily: FONTS.regular, fontSize: 12, lineHeight: 17, color: COLORS.textMuted },
  driverAvatar: { width: 58, height: 58, borderRadius: 29, borderWidth: 2, borderColor: COLORS.primaryLight },
  driverInitial: {
    ...StyleSheet.absoluteFillObject, backgroundColor: COLORS.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  driverInitialText: { fontFamily: FONTS.bold, fontSize: 22, color: COLORS.white },
  driverName: { ...TYPE.h3 },
  driverMeta: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 2 },
  driverVehicle: { flexDirection: 'row', alignItems: 'center', gap: 4 },

  // Timeline
  timelineCard: { marginTop: 14, padding: 18 },
  timelineHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 18 },
  sectionBar: { width: 4, height: 20, borderRadius: 2, backgroundColor: COLORS.primary },
  timelineRow: { flexDirection: 'row', alignItems: 'stretch' },
  timelineLeft: { alignItems: 'center', marginRight: 14, width: 34 },
  dotWrap: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center' },
  dotHalo: {
    position: 'absolute', width: 34, height: 34, borderRadius: 17, backgroundColor: COLORS.primaryLight,
  },
  dot: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: COLORS.bg, borderWidth: 1.5, borderColor: COLORS.border,
    justifyContent: 'center', alignItems: 'center',
  },
  dotDone:    { backgroundColor: COLORS.secondary, borderColor: COLORS.secondary },
  dotCurrent: { width: 30, height: 30, borderRadius: 15, backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  line:       { flex: 1, width: 3, minHeight: 22, borderRadius: 2, backgroundColor: COLORS.divider, marginVertical: 3 },
  lineDone:   { backgroundColor: COLORS.primary },
  timelineContent: { flex: 1, paddingBottom: 22, paddingTop: 6 },
  stepLabel:  { fontFamily: FONTS.medium, fontSize: 14, lineHeight: 20, color: COLORS.text },
  stepLabelCurrent: { fontFamily: FONTS.semibold, fontSize: 15, color: COLORS.primary },
  stepDesc:   { ...TYPE.caption, marginTop: 2 },

  inlineMapBtn: {
    marginTop: 8, flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: COLORS.primarySoft, borderRadius: RADIUS.pill,
    paddingHorizontal: 14, paddingVertical: 8, alignSelf: 'flex-start',
  },
  inlineMapBtnText: { fontFamily: FONTS.semibold, fontSize: 13, color: COLORS.primary },

  // Adresse
  addressCard: { marginTop: 14, flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  addressIcon: {
    width: 40, height: 40, borderRadius: 12, backgroundColor: COLORS.primarySoft,
    alignItems: 'center', justifyContent: 'center',
  },
  addressValue: { fontFamily: FONTS.medium, fontSize: 14, lineHeight: 20, color: COLORS.text },
  addressPhone: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  addressPhoneText: { fontFamily: FONTS.semibold, fontSize: 13, color: COLORS.primary },

  // Livré
  deliveredSection: { marginTop: 14, alignItems: 'center', paddingVertical: 24 },
  deliveredIcon: {
    width: 72, height: 72, borderRadius: 36, backgroundColor: COLORS.successSoft,
    alignItems: 'center', justifyContent: 'center', marginBottom: 12,
  },
});
