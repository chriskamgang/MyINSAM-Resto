import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, FlatList, ActivityIndicator, RefreshControl, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../../context/AuthContext';
import { restoDashboardService } from '../../services/restoDashboardService';
import {
  COLORS, FONTS, TYPE, RADIUS, SHADOWS, GRADIENTS, SCREEN_PADDING, formatPrice,
} from '../../theme';
import { useTabBarSpace } from '../../hooks/useTabBarSpace';
import {
  Screen, Card, Badge, SectionHeader, SmartImage, EmptyState, LoadingView, MetaItem,
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

const RECENT_LIMIT = 8;

function OrderCard({ order, onPress }) {
  const cfg = STATUS_CONFIG[order.status] || STATUS_CONFIG.pending;
  const time = new Date(order.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

  return (
    <Card style={styles.orderCard} onPress={() => onPress(order)}>
      <View style={styles.orderCardTop}>
        <View style={[styles.orderIcon, { backgroundColor: cfg.bg }]}>
          <Ionicons name={cfg.icon} size={20} color={cfg.color} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={TYPE.title}>#{order.order_number}</Text>
          <MetaItem icon="person-outline" size={12} label={`${order.user?.name || 'Client'} · ${time}`} />
        </View>
        <Badge label={cfg.label} color={cfg.color} bg={cfg.bg} />
      </View>
      <View style={styles.orderCardBottom}>
        <Text style={styles.itemsSummary} numberOfLines={1}>
          {order.items && order.items.length > 0
            ? order.items.map(i => `${i.quantity}x ${i.item_name}`).join(', ')
            : ' '}
        </Text>
        <Text style={TYPE.price}>{formatPrice(order.total)}</Text>
      </View>
    </Card>
  );
}

function StatCard({ icon, value, label, color, bg }) {
  return (
    <Card style={styles.statCard}>
      <View style={[styles.statIcon, { backgroundColor: bg }]}>
        <Ionicons name={icon} size={18} color={color} />
      </View>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel} numberOfLines={1}>{label}</Text>
    </Card>
  );
}

export default function RestoDashboardScreen({ navigation }) {
  const tabSpace = useTabBarSpace();
  const { user } = useAuth();
  const [dashboard, setDashboard] = useState(null);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [togglingOpen, setTogglingOpen] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [dashData, ordersData] = await Promise.all([
        restoDashboardService.getDashboard(),
        restoDashboardService.getOrders(),
      ]);
      setDashboard(dashData);
      setOrders(ordersData.data || []);
      setIsOpen(!!dashData.restaurant?.is_open);
    } catch (e) {
      console.error('Erreur dashboard:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => {
    loadData();
    const interval = setInterval(loadData, 15000);
    return () => clearInterval(interval);
  }, [loadData]));

  const handleToggleOpen = async () => {
    if (togglingOpen) return;
    setTogglingOpen(true);
    try {
      const res = await restoDashboardService.toggleOpen(!isOpen);
      setIsOpen(!!res.is_open);
    } catch (e) {
      Alert.alert('Erreur', 'Impossible de modifier le statut.');
    } finally {
      setTogglingOpen(false);
    }
  };

  if (loading) {
    return <Screen><LoadingView label="Chargement du tableau de bord…" /></Screen>;
  }

  const restaurant = dashboard?.restaurant;
  const firstName = user?.name?.split(' ')[0];
  const recent = orders.slice(0, RECENT_LIMIT);

  const header = (
    <>
      {/* Header */}
      <View style={styles.header}>
        <SmartImage uri={restaurant?.logo} style={styles.logo} fallbackIcon="restaurant" iconSize={22} />
        <View style={{ flex: 1 }}>
          <Text style={styles.hello} numberOfLines={1}>
            {firstName ? `Bonjour ${firstName}` : 'Tableau de bord'}
          </Text>
          <Text style={styles.restoName} numberOfLines={1}>{restaurant?.name || 'Restaurant'}</Text>
        </View>
      </View>

      {/* Open / closed toggle */}
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={handleToggleOpen}
        style={[styles.openCard, { backgroundColor: isOpen ? COLORS.successSoft : COLORS.dangerSoft }]}
      >
        <View style={[styles.openIcon, { backgroundColor: isOpen ? COLORS.success : COLORS.danger }]}>
          <Ionicons name={isOpen ? 'storefront' : 'storefront-outline'} size={22} color={COLORS.white} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.openTitle, { color: isOpen ? COLORS.success : COLORS.danger }]}>
            {isOpen ? 'Restaurant ouvert' : 'Restaurant fermé'}
          </Text>
          <Text style={TYPE.caption}>
            {isOpen ? 'Les clients peuvent commander' : 'Les commandes sont suspendues'}
          </Text>
        </View>
        {togglingOpen ? (
          <ActivityIndicator color={isOpen ? COLORS.success : COLORS.danger} />
        ) : (
          <View style={[styles.toggleTrack, { backgroundColor: isOpen ? COLORS.success : '#E6C9C9' }]}>
            <View style={[styles.toggleThumb, isOpen && styles.toggleThumbOn]} />
          </View>
        )}
      </TouchableOpacity>

      {/* Revenue hero */}
      <LinearGradient colors={GRADIENTS.primary} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.revenueCard}>
        <View style={styles.revenueTop}>
          <View style={{ flex: 1 }}>
            <Text style={styles.revenueLabel}>Chiffre du jour</Text>
            <Text style={styles.revenueValue}>{formatPrice(dashboard?.today_revenue)}</Text>
          </View>
          <View style={styles.revenueIcon}>
            <Ionicons name="trending-up" size={22} color={COLORS.white} />
          </View>
        </View>
        <View style={styles.revenueBottom}>
          <View style={{ flex: 1 }}>
            <Text style={styles.revenueLabel}>Commandes aujourd'hui</Text>
            <Text style={styles.revenueSmall}>{dashboard?.today_orders || 0}</Text>
          </View>
          <View style={styles.revenueSep} />
          <View style={{ flex: 1 }}>
            <Text style={styles.revenueLabel}>Total encaissé</Text>
            <Text style={styles.revenueSmall} numberOfLines={1}>{formatPrice(dashboard?.total_revenue)}</Text>
          </View>
        </View>
      </LinearGradient>

      {/* Stats */}
      <View style={styles.statsRow}>
        <StatCard icon="time-outline" value={dashboard?.pending_orders || 0} label="À traiter" color={COLORS.warning} bg={COLORS.warningSoft} />
        <StatCard icon="flame-outline" value={dashboard?.preparing_orders || 0} label="En cuisine" color="#7C3AED" bg="#F1EAFE" />
        <StatCard icon="cube-outline" value={dashboard?.ready_orders || 0} label="Prêtes" color="#0D9488" bg="#E3F7F4" />
      </View>

      <SectionHeader
        title="Commandes récentes"
        onAction={orders.length > 0 ? () => navigation.navigate('Commandes') : undefined}
      />
    </>
  );

  return (
    <Screen>
      <FlatList
        data={recent}
        keyExtractor={item => String(item.id)}
        renderItem={({ item }) => (
          <OrderCard order={item} onPress={(o) => navigation.navigate('RestoOrderDetail', { orderId: o.id })} />
        )}
        ListHeaderComponent={header}
        contentContainerStyle={{ paddingBottom: tabSpace }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadData(); }} tintColor={COLORS.primary} />}
        ListEmptyComponent={
          <EmptyState
            icon="restaurant-outline"
            title="Aucune commande pour le moment"
            message="Les nouvelles commandes apparaîtront ici automatiquement."
            style={{ paddingVertical: 32 }}
          />
        }
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: SCREEN_PADDING, paddingTop: 12, paddingBottom: 4,
  },
  logo: { width: 52, height: 52, borderRadius: 26, ...SHADOWS.sm },
  hello: { fontFamily: FONTS.medium, fontSize: 14, color: COLORS.textMuted },
  restoName: { fontFamily: FONTS.bold, fontSize: 22, lineHeight: 29, color: COLORS.text },

  openCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    marginHorizontal: SCREEN_PADDING, marginTop: 16, padding: 14, borderRadius: RADIUS.xl,
  },
  openIcon: { width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center' },
  openTitle: { fontFamily: FONTS.semibold, fontSize: 16, lineHeight: 22 },
  toggleTrack: { width: 52, height: 30, borderRadius: 15, padding: 3, justifyContent: 'center' },
  toggleThumb: { width: 24, height: 24, borderRadius: 12, backgroundColor: COLORS.white, ...SHADOWS.sm },
  toggleThumbOn: { alignSelf: 'flex-end' },

  revenueCard: {
    marginHorizontal: SCREEN_PADDING, marginTop: 14, borderRadius: RADIUS.xl, padding: 18, ...SHADOWS.primary,
  },
  revenueTop: { flexDirection: 'row', alignItems: 'center' },
  revenueIcon: {
    width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center', justifyContent: 'center',
  },
  revenueLabel: { fontFamily: FONTS.regular, fontSize: 12, color: 'rgba(255,255,255,0.85)' },
  revenueValue: { fontFamily: FONTS.bold, fontSize: 26, lineHeight: 34, color: COLORS.white },
  revenueBottom: {
    flexDirection: 'row', alignItems: 'center', marginTop: 14, paddingTop: 12,
    borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.25)',
  },
  revenueSep: { width: 1, height: 30, backgroundColor: 'rgba(255,255,255,0.25)', marginHorizontal: 12 },
  revenueSmall: { fontFamily: FONTS.semibold, fontSize: 16, color: COLORS.white },

  statsRow: { flexDirection: 'row', gap: 10, paddingHorizontal: SCREEN_PADDING, marginTop: 14, marginBottom: 24 },
  statCard: { flex: 1, padding: 12 },
  statIcon: { width: 34, height: 34, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  statValue: { fontFamily: FONTS.bold, fontSize: 22, lineHeight: 28, color: COLORS.text, marginTop: 8 },
  statLabel: { ...TYPE.caption },

  orderCard: { marginHorizontal: SCREEN_PADDING, marginBottom: 12, padding: 14 },
  orderCardTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  orderIcon: { width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  orderCardBottom: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12,
    marginTop: 12, paddingTop: 10, borderTopWidth: 1, borderTopColor: COLORS.divider,
  },
  itemsSummary: { ...TYPE.caption, flex: 1 },
});
