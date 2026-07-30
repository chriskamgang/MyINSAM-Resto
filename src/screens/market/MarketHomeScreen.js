import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  SafeAreaView, ActivityIndicator, RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { marketService } from '../../services/marketService';

const COLORS = { primary: '#FF6B35', bg: '#f8f8f8', card: '#fff', text: '#1a1a1a', gray: '#888' };

const STATUS_CONFIG = {
  pending:      { label: 'En attente',        color: '#f59e0b', bg: '#fef3c7', iconName: 'time-outline' },
  assigned:     { label: 'Coursier assign\u00e9',  color: '#3b82f6', bg: '#dbeafe', iconName: 'person-outline' },
  at_market:    { label: 'Au march\u00e9',         color: '#8b5cf6', bg: '#ede9fe', iconName: 'storefront-outline' },
  photos_sent:  { label: 'Photos envoy\u00e9es',   color: '#FF6B35', bg: '#FFF3E0', iconName: 'camera-outline' },
  validated:    { label: 'Valid\u00e9',             color: '#14b8a6', bg: '#ccfbf1', iconName: 'checkmark-circle-outline' },
  purchasing:   { label: 'Achats en cours',    color: '#6366f1', bg: '#e0e7ff', iconName: 'cart-outline' },
  delivering:   { label: 'En livraison',       color: '#FF6B35', bg: '#FFF3E0', iconName: 'bicycle-outline' },
  delivered:    { label: 'Livr\u00e9',              color: '#22c55e', bg: '#f0fdf4', iconName: 'checkmark-done-circle-outline' },
  cancelled:    { label: 'Annul\u00e9',             color: '#ef4444', bg: '#fee2e2', iconName: 'close-circle-outline' },
};

const PAYMENT_LABELS = {
  mobile_money: 'Mobile Money',
  on_delivery: 'Paiement \u00e0 la livraison',
};

function MarketOrderCard({ order, onPress }) {
  const status = STATUS_CONFIG[order.status] || { label: order.status, color: COLORS.gray, bg: '#f0f0f0', iconName: 'help-outline' };
  const date = new Date(order.created_at).toLocaleDateString('fr-FR', {
    day: '2-digit', month: 'short', year: 'numeric',
  });
  const itemCount = order.items?.length || 0;
  const total = Number(order.total_estimated || order.total || 0);

  return (
    <TouchableOpacity style={styles.card} onPress={() => onPress(order)} activeOpacity={0.85}>
      <View style={styles.cardHeader}>
        <View>
          <Text style={styles.orderNumber}>March\u00e9 #{order.order_number || order.id}</Text>
          <Text style={styles.orderDate}>{date}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: status.bg }]}>
          <Text style={[styles.statusText, { color: status.color }]}>
            <Ionicons name={status.iconName} size={12} color={status.color} /> {status.label}
          </Text>
        </View>
      </View>

      <View style={styles.cardDivider} />

      <View style={styles.cardDetails}>
        <View style={styles.detailItem}>
          <Ionicons name="list-outline" size={14} color={COLORS.gray} />
          <Text style={styles.detailText}>{itemCount} article{itemCount > 1 ? 's' : ''}</Text>
        </View>
        <View style={styles.detailItem}>
          <Ionicons name="card-outline" size={14} color={COLORS.gray} />
          <Text style={styles.detailText}>{PAYMENT_LABELS[order.payment_method] || order.payment_method || 'N/A'}</Text>
        </View>
      </View>

      <View style={styles.cardFooter}>
        <Text style={styles.cardTotal}>~{total.toLocaleString('fr-FR')} XAF</Text>
        {['assigned', 'at_market', 'photos_sent', 'purchasing', 'delivering'].includes(order.status) && (
          <Text style={styles.trackLink}>Suivre &rarr;</Text>
        )}
      </View>
    </TouchableOpacity>
  );
}

export default function MarketHomeScreen({ navigation }) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadOrders = useCallback(async () => {
    try {
      const data = await marketService.getOrders();
      const list = Array.isArray(data) ? data : (data.data || []);
      setOrders(list);
    } catch (e) {
      console.error('Erreur commandes march\u00e9:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { loadOrders(); }, [loadOrders]));

  const onRefresh = () => { setRefreshing(true); loadOrders(); };

  if (loading) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Mon March\u00e9</Text>
      </View>

      {orders.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="basket-outline" size={70} color="#ccc" style={{ marginBottom: 16 }} />
          <Text style={styles.emptyTitle}>Faites vos courses au march\u00e9 !</Text>
          <Text style={styles.emptySubtitle}>
            Cr\u00e9ez une liste de courses et un coursier ira au march\u00e9 pour vous.
          </Text>
          <TouchableOpacity
            style={styles.menuBtn}
            onPress={() => navigation.navigate('CreateMarketList')}
          >
            <Ionicons name="add-outline" size={18} color="#fff" />
            <Text style={styles.menuBtnText}> Nouvelle liste</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={orders}
          keyExtractor={item => String(item.id)}
          renderItem={({ item }) => (
            <MarketOrderCard
              order={item}
              onPress={order => navigation.navigate('MarketOrderDetail', { orderId: order.id })}
            />
          )}
          contentContainerStyle={{ padding: 16 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
        />
      )}

      {/* FAB */}
      {orders.length > 0 && (
        <TouchableOpacity
          style={styles.fab}
          onPress={() => navigation.navigate('CreateMarketList')}
          activeOpacity={0.85}
        >
          <Ionicons name="add" size={28} color="#fff" />
        </TouchableOpacity>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  loader:    { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.bg },
  header: {
    paddingHorizontal: 20, paddingVertical: 16,
    backgroundColor: COLORS.primary,
  },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#fff' },

  card: {
    backgroundColor: COLORS.card, borderRadius: 16, padding: 16,
    marginBottom: 12,
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6, elevation: 2,
  },
  cardHeader:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  orderNumber:  { fontSize: 15, fontWeight: '700', color: COLORS.text },
  orderDate:    { fontSize: 12, color: COLORS.gray, marginTop: 2 },
  statusBadge:  { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  statusText:   { fontSize: 12, fontWeight: '700' },
  cardDivider:  { height: 1, backgroundColor: '#f0f0f0', marginVertical: 12 },
  cardDetails:  { flexDirection: 'row', gap: 16, marginBottom: 12 },
  detailItem:   { flexDirection: 'row', alignItems: 'center', gap: 4 },
  detailText:   { fontSize: 13, color: COLORS.gray },
  cardFooter:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardTotal:    { fontSize: 16, fontWeight: '800', color: COLORS.primary },
  trackLink:    { fontSize: 13, color: COLORS.primary, fontWeight: '600' },

  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  emptyTitle:     { fontSize: 20, fontWeight: 'bold', color: COLORS.text, marginBottom: 8, textAlign: 'center' },
  emptySubtitle:  { fontSize: 15, color: COLORS.gray, textAlign: 'center', marginBottom: 32, lineHeight: 22 },
  menuBtn: {
    backgroundColor: COLORS.primary, paddingHorizontal: 28, paddingVertical: 14,
    borderRadius: 14, flexDirection: 'row', alignItems: 'center',
  },
  menuBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 15 },

  fab: {
    position: 'absolute', bottom: 24, right: 20,
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center',
    shadowColor: COLORS.primary, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35, shadowRadius: 8, elevation: 8,
  },
});
