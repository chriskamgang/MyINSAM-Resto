import React, { useState, useCallback, useMemo, useEffect } from 'react';
import {
  View, Text, StyleSheet, FlatList, ScrollView, RefreshControl, TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { orderService } from '../../services/orderService';
import { createThemedStyles, COLORS, FONTS, TYPE, RADIUS, SHADOWS, SCREEN_PADDING, formatPrice } from '../../theme';
import { useTabBarSpace } from '../../hooks/useTabBarSpace';
import { Screen, Card, Chip, Badge, SmartImage, EmptyState, LoadingView, Divider, IconButton } from '../../components/ui';

// Statut → libellé, couleurs (tokens du thème) et icône
export const ORDER_STATUS = {
  pending:    { label: 'En attente',     color: COLORS.warning, bg: COLORS.warningSoft, icon: 'time-outline' },
  confirmed:  { label: 'Confirmée',      color: COLORS.info,    bg: COLORS.infoSoft,    icon: 'checkmark-circle-outline' },
  preparing:  { label: 'En préparation', color: COLORS.info,    bg: COLORS.infoSoft,    icon: 'restaurant-outline' },
  ready:      { label: 'Prête',          color: COLORS.info,    bg: COLORS.infoSoft,    icon: 'cube-outline' },
  picked_up:  { label: 'Récupérée',      color: COLORS.primary, bg: COLORS.primarySoft, icon: 'bicycle-outline' },
  on_the_way: { label: 'En livraison',   color: COLORS.primary, bg: COLORS.primarySoft, icon: 'bicycle-outline' },
  delivered:  { label: 'Livrée',         color: COLORS.success, bg: COLORS.successSoft, icon: 'checkmark-done-outline' },
  cancelled:  { label: 'Annulée',        color: COLORS.danger,  bg: COLORS.dangerSoft,  icon: 'close-circle-outline' },
};

const ACTIVE_STATUSES = ['pending', 'confirmed', 'preparing', 'ready', 'picked_up', 'on_the_way'];
// Toute commande en cours peut être suivie
const TRACKABLE_STATUSES = ACTIVE_STATUSES;

const FILTERS = [
  { key: 'all',       label: 'Toutes',    match: () => true },
  { key: 'active',    label: 'En cours',  match: (o) => ACTIVE_STATUSES.includes(o.status) },
  { key: 'delivered', label: 'Terminées', match: (o) => o.status === 'delivered' },
  { key: 'cancelled', label: 'Annulées',  match: (o) => o.status === 'cancelled' },
];

const statusOf = (s) => ORDER_STATUS[s] || { label: s || 'Inconnu', color: COLORS.textMuted, bg: COLORS.divider, icon: 'help-circle-outline' };

function OrderCard({ order, onPress, onTrack }) {
  const status = statusOf(order.status);
  const date = order.created_at
    ? new Date(order.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })
    : '';
  const time = order.created_at
    ? new Date(order.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
    : '';
  const itemCount = (order.items || []).reduce((n, i) => n + (Number(i.quantity) || 0), 0);
  const summary = order.items?.map(i => `${i.quantity}× ${i.item_name || i.name}`).join(', ');
  const canTrack = TRACKABLE_STATUSES.includes(order.status);

  return (
    <Card style={styles.card} onPress={() => onPress(order)}>
      <View style={styles.cardTop}>
        <SmartImage
          uri={order.restaurant?.logo || order.restaurant?.cover_image}
          style={styles.thumb}
          fallbackIcon="storefront-outline"
          iconSize={24}
        />
        <View style={{ flex: 1 }}>
          <Text style={styles.restaurant} numberOfLines={1}>{order.restaurant?.name || 'Restaurant'}</Text>
          <Text style={styles.orderNumber} numberOfLines={1}>Commande #{order.order_number}</Text>
          <Text style={TYPE.caption}>{date}{time ? ` · ${time}` : ''}</Text>
        </View>
        <Badge label={status.label} color={status.color} bg={status.bg} icon={status.icon} />
      </View>

      {summary ? <Text style={styles.summary} numberOfLines={2}>{summary}</Text> : null}

      <Divider style={{ marginVertical: 12 }} />

      <View style={styles.cardFooter}>
        <View>
          <Text style={TYPE.caption}>{itemCount} article{itemCount > 1 ? 's' : ''}</Text>
          <Text style={styles.total}>{formatPrice(order.total || order.total_amount)}</Text>
        </View>
        {canTrack ? (
          <TouchableOpacity style={styles.trackBtn} onPress={() => onTrack(order)} activeOpacity={0.85}>
            <Ionicons name="navigate" size={15} color={COLORS.white} />
            <Text style={styles.trackText}>Suivre</Text>
            <Ionicons name="chevron-forward" size={14} color={COLORS.white} />
          </TouchableOpacity>
        ) : (
          <View style={styles.detailLink}>
            <Text style={styles.detailText}>Détails</Text>
            <Ionicons name="chevron-forward" size={14} color={COLORS.textMuted} />
          </View>
        )}
      </View>
    </Card>
  );
}

export default function OrdersScreen({ navigation }) {
  const tabSpace = useTabBarSpace();
  const [orders, setOrders]         = useState([]);
  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError]           = useState(false);
  const [filter, setFilter]         = useState('all');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  const loadOrders = useCallback(async () => {
    try {
      const data = await orderService.getOrders(1);
      // La réponse est paginée: { data: [...], total, ... }
      const list = Array.isArray(data) ? data : (data?.data || []);
      setOrders(list);
      setPage(1);
      setHasMore(Boolean(data?.next_page_url || (data?.last_page && Number(data.current_page) < Number(data.last_page))));
      setError(false);
    } catch (e) {
      console.error('Erreur commandes:', e);
      setError(true);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const loadMore = useCallback(async () => {
    if (loading || refreshing || loadingMore || !hasMore) return;
    setLoadingMore(true);
    try {
      const nextPage = page + 1;
      const data = await orderService.getOrders(nextPage);
      const list = Array.isArray(data) ? data : (data?.data || []);
      setOrders((previous) => [...previous, ...list.filter((order) => !previous.some((old) => old.id === order.id))]);
      setPage(nextPage);
      setHasMore(Boolean(data?.next_page_url || (data?.last_page && Number(data.current_page) < Number(data.last_page))));
    } catch (e) {
      console.error('Erreur pagination commandes:', e);
      setHasMore(false);
    } finally {
      setLoadingMore(false);
    }
  }, [loading, refreshing, loadingMore, hasMore, page]);

  useFocusEffect(useCallback(() => { loadOrders(); }, [loadOrders]));

  const onRefresh = () => { setRefreshing(true); loadOrders(); };

  const counts = useMemo(() => {
    const c = {};
    FILTERS.forEach(f => { c[f.key] = orders.filter(f.match).length; });
    return c;
  }, [orders]);

  const visible = useMemo(() => {
    const f = FILTERS.find(x => x.key === filter) || FILTERS[0];
    return orders.filter(f.match);
  }, [orders, filter]);

  useEffect(() => {
    if (filter !== 'all' && !loading && visible.length === 0 && hasMore) loadMore();
  }, [filter, loading, visible.length, hasMore, loadMore]);

  if (loading) {
    return <Screen><LoadingView label="Chargement de vos commandes…" /></Screen>;
  }

  const goHome = () => navigation.navigate('Main', { screen: 'Accueil' });

  const renderEmpty = () => {
    if (error) {
      return (
        <EmptyState
          icon="cloud-offline-outline"
          title="Impossible de charger vos commandes"
          message="Vérifiez votre connexion internet puis réessayez."
          actionLabel="Réessayer"
          onAction={() => { setLoading(true); loadOrders(); }}
        />
      );
    }
    if (orders.length === 0) {
      return (
        <EmptyState
          icon="receipt-outline"
          title="Aucune commande"
          message="Vos commandes apparaîtront ici."
          actionLabel="Commander maintenant"
          onAction={goHome}
        />
      );
    }
    return (
      <EmptyState
        icon="filter-outline"
        title="Aucune commande ici"
        message={hasMore ? 'Faites défiler pour voir les autres commandes.' : 'Aucune commande ne correspond à ce filtre.'}
      />
    );
  };

  return (
    <Screen>
      <View style={styles.header}>
        <IconButton icon="arrow-back" size={36} onPress={() => navigation.goBack()} style={{ marginBottom: 8 }} />
        <Text style={TYPE.h1}>Mes commandes</Text>
        <Text style={TYPE.bodyMuted}>Suivez et retrouvez toutes vos commandes</Text>
      </View>

      {orders.length > 0 && (
        <View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filters}
          >
            {FILTERS.map(f => (
              <Chip
                key={f.key}
                label={f.label}
                count={counts[f.key]}
                active={filter === f.key}
                onPress={() => setFilter(f.key)}
              />
            ))}
          </ScrollView>
        </View>
      )}

      <FlatList
        data={visible}
        onEndReached={loadMore}
        onEndReachedThreshold={0.35}
        ListFooterComponent={loadingMore ? <LoadingView label="Chargement des commandes…" /> : null}
        keyExtractor={item => String(item.id)}
        renderItem={({ item }) => (
          <OrderCard
            order={item}
            onPress={order => navigation.navigate('OrderDetail', { orderId: order.id })}
            onTrack={order => navigation.navigate('OrderTracking', { orderId: order.id })}
          />
        )}
        ListEmptyComponent={renderEmpty}
        contentContainerStyle={[styles.list, { paddingBottom: tabSpace }, visible.length === 0 && { flexGrow: 1, justifyContent: 'center' }]}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} colors={[COLORS.primary]} />}
      />
    </Screen>
  );
}

const styles = createThemedStyles({
  header: { paddingHorizontal: SCREEN_PADDING, paddingTop: 12, paddingBottom: 14 },
  filters: { paddingHorizontal: SCREEN_PADDING, gap: 10, paddingBottom: 14, paddingTop: 2 },
  list: { paddingHorizontal: SCREEN_PADDING, paddingTop: 4 },

  card: { marginBottom: 14 },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  thumb: { width: 56, height: 56, borderRadius: RADIUS.md },
  restaurant: { ...TYPE.title },
  orderNumber: { fontFamily: FONTS.medium, fontSize: 12, color: COLORS.textMuted },
  summary: { ...TYPE.caption, marginTop: 12, lineHeight: 18 },

  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  total: { ...TYPE.price, fontSize: 17 },
  trackBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: COLORS.primary, borderRadius: RADIUS.pill,
    paddingHorizontal: 16, height: 40, ...SHADOWS.primary,
  },
  trackText: { fontFamily: FONTS.semibold, fontSize: 14, color: COLORS.white },
  detailLink: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  detailText: { fontFamily: FONTS.medium, fontSize: 13, color: COLORS.textMuted },
});
