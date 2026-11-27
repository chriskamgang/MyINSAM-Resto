import { showAlert } from '../../utils/showAlert';
import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, ScrollView, RefreshControl, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { restoDashboardService } from '../../services/restoDashboardService';
import { createThemedStyles, COLORS, TYPE, SCREEN_PADDING, formatPrice } from '../../theme';
import { useTabBarSpace } from '../../hooks/useTabBarSpace';
import {
  Screen, Card, Chip, Badge, Button, EmptyState, LoadingView, MetaItem,
} from '../../components/ui';

const FILTERS = [
  { key: null,         label: 'Toutes' },
  { key: 'pending',    label: 'En attente' },
  { key: 'confirmed',  label: 'Confirmées' },
  { key: 'preparing',  label: 'En préparation' },
  { key: 'ready',      label: 'Prêtes' },
  { key: 'delivered',  label: 'Livrées' },
  { key: 'cancelled',  label: 'Annulées' },
];

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

// Actions rapides autorisées par l'API (RestaurantDashboardController::updateStatus)
const QUICK_ACTIONS = {
  pending: [
    { status: 'cancelled', title: 'Refuser', variant: 'outline', confirm: 'Refuser cette commande ?' },
    { status: 'confirmed', title: 'Accepter', icon: 'checkmark', confirm: 'Accepter cette commande ?' },
  ],
  confirmed: [
    { status: 'preparing', title: 'Lancer la préparation', icon: 'flame-outline', confirm: 'Commencer la préparation ?' },
  ],
  preparing: [
    { status: 'ready', title: 'Marquer prête', icon: 'cube-outline', confirm: 'Marquer la commande comme prête ?' },
  ],
};

export default function RestoOrdersScreen({ navigation }) {
  const tabSpace = useTabBarSpace();
  const [orders, setOrders] = useState([]);
  const [filter, setFilter] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actingId, setActingId] = useState(null);

  const loadOrders = useCallback(async () => {
    try {
      const data = await restoDashboardService.getOrders(filter);
      setOrders(data.data || []);
    } catch (e) {
      console.error('Erreur orders:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [filter]);

  useFocusEffect(useCallback(() => {
    setLoading(true);
    loadOrders();
    const interval = setInterval(loadOrders, 15000);
    return () => clearInterval(interval);
  }, [loadOrders]));

  const runAction = (order, action) => {
    showAlert('Confirmer', action.confirm, [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Confirmer',
        style: action.status === 'cancelled' ? 'destructive' : 'default',
        onPress: async () => {
          setActingId(order.id);
          try {
            await restoDashboardService.updateOrderStatus(order.id, action.status);
            await loadOrders();
          } catch (e) {
            showAlert('Erreur', e.response?.data?.message || 'Impossible de modifier le statut.');
          } finally {
            setActingId(null);
          }
        },
      },
    ]);
  };

  const renderOrder = ({ item }) => {
    const cfg = STATUS_CONFIG[item.status] || STATUS_CONFIG.pending;
    const time = new Date(item.created_at).toLocaleString('fr-FR', {
      day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
    });
    const actions = QUICK_ACTIONS[item.status] || [];
    const itemsText = (item.items || []).map(i => `${i.quantity}x ${i.item_name}`).join(', ');

    return (
      <Card
        style={styles.orderCard}
        onPress={() => navigation.navigate('RestoOrderDetail', { orderId: item.id })}
      >
        <View style={styles.cardRow}>
          <View style={[styles.orderIcon, { backgroundColor: cfg.bg }]}>
            <Ionicons name={cfg.icon} size={20} color={cfg.color} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={TYPE.title}>#{item.order_number}</Text>
            <Text style={TYPE.caption} numberOfLines={1}>{item.user?.name || 'Client'}</Text>
          </View>
          <Badge label={cfg.label} color={cfg.color} bg={cfg.bg} />
        </View>

        {itemsText ? <Text style={styles.itemsText} numberOfLines={2}>{itemsText}</Text> : null}

        <View style={styles.cardFooter}>
          <MetaItem icon="time-outline" size={12} label={time} />
          <Text style={TYPE.price}>{formatPrice(item.total)}</Text>
        </View>

        {actions.length > 0 ? (
          <View style={styles.actionsRow}>
            {actions.map(a => (
              <Button
                key={a.status}
                title={a.title}
                icon={a.icon}
                variant={a.variant || 'primary'}
                size="sm"
                style={{ flex: 1 }}
                textStyle={a.status === 'cancelled' ? { color: COLORS.danger } : undefined}
                loading={actingId === item.id && a.variant !== 'outline'}
                disabled={actingId != null}
                onPress={() => runAction(item, a)}
              />
            ))}
          </View>
        ) : null}
      </Card>
    );
  };

  const activeFilterLabel = FILTERS.find(f => f.key === filter)?.label || 'Toutes';

  return (
    <Screen>
      <View style={styles.header}>
        <Text style={TYPE.h1}>Commandes</Text>
        <Text style={TYPE.bodyMuted}>Gérez les commandes de votre restaurant</Text>
      </View>

      {/* Filters */}
      <View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filters}
        >
          {FILTERS.map(f => (
            <Chip
              key={f.label}
              label={f.label}
              active={filter === f.key}
              onPress={() => setFilter(f.key)}
            />
          ))}
        </ScrollView>
      </View>

      {loading ? (
        <LoadingView />
      ) : (
        <FlatList
          data={orders}
          keyExtractor={item => String(item.id)}
          renderItem={renderOrder}
          contentContainerStyle={{ paddingTop: 4, paddingBottom: tabSpace }}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadOrders(); }} tintColor={COLORS.primary} />}
          ListEmptyComponent={
            <EmptyState
              icon="document-text-outline"
              title="Aucune commande"
              message={filter ? `Aucune commande « ${activeFilterLabel} » pour le moment.` : 'Les nouvelles commandes apparaîtront ici.'}
            />
          }
        />
      )}
    </Screen>
  );
}

const styles = createThemedStyles({
  header: { paddingHorizontal: SCREEN_PADDING, paddingTop: 12 },
  filters: { paddingHorizontal: SCREEN_PADDING, paddingVertical: 14, gap: 8 },

  orderCard: { marginHorizontal: SCREEN_PADDING, marginBottom: 12, padding: 14 },
  cardRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  orderIcon: { width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  itemsText: { ...TYPE.caption, color: COLORS.text, marginTop: 10 },
  cardFooter: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: COLORS.divider,
  },
  actionsRow: { flexDirection: 'row', gap: 10, marginTop: 12 },
});
