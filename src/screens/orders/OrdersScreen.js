import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  SafeAreaView, ActivityIndicator, RefreshControl,
} from 'react-native';
import { orderService } from '../../services/orderService';
import { useFocusEffect } from '@react-navigation/native';

const COLORS = { primary: '#FF6B35', bg: '#f8f8f8', card: '#fff', text: '#1a1a1a', gray: '#888' };

const STATUS_CONFIG = {
  pending:    { label: 'En attente',     color: '#f59e0b', bg: '#fef3c7', icon: '⏳' },
  confirmed:  { label: 'Confirmée',      color: '#3b82f6', bg: '#dbeafe', icon: '✅' },
  preparing:  { label: 'En préparation', color: '#8b5cf6', bg: '#ede9fe', icon: '🍳' },
  ready:      { label: 'Prête',          color: '#10b981', bg: '#d1fae5', icon: '📦' },
  picked_up:  { label: 'Récupérée',      color: '#FF6B35', bg: '#FFF3E0', icon: '🚚' },
  on_the_way: { label: 'En livraison',   color: '#FF6B35', bg: '#FFF3E0', icon: '🛵' },
  delivered:  { label: 'Livrée',         color: '#22c55e', bg: '#f0fdf4', icon: '✅' },
  cancelled:  { label: 'Annulée',        color: '#ef4444', bg: '#fee2e2', icon: '❌' },
};

function OrderCard({ order, onPress }) {
  const status = STATUS_CONFIG[order.status] || { label: order.status, color: COLORS.gray, bg: '#f0f0f0', icon: '?' };
  const date = new Date(order.created_at).toLocaleDateString('fr-FR', {
    day: '2-digit', month: 'short', year: 'numeric',
  });

  return (
    <TouchableOpacity style={styles.card} onPress={() => onPress(order)} activeOpacity={0.85}>
      <View style={styles.cardHeader}>
        <View>
          <Text style={styles.orderNumber}>Commande #{order.order_number}</Text>
          <Text style={styles.orderDate}>{date}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: status.bg }]}>
          <Text style={[styles.statusText, { color: status.color }]}>{status.icon} {status.label}</Text>
        </View>
      </View>

      <View style={styles.cardDivider} />

      <Text style={styles.itemsList} numberOfLines={2}>
        {order.items?.map(i => `${i.quantity}× ${i.item_name || i.name}`).join(', ') || 'Articles'}
      </Text>

      <View style={styles.cardFooter}>
        <Text style={styles.cardTotal}>{Number(order.total || order.total_amount || 0).toLocaleString('fr-FR')} XAF</Text>
        {['picked_up', 'on_the_way', 'preparing', 'ready', 'confirmed'].includes(order.status) && (
          <Text style={styles.trackLink}>Suivre →</Text>
        )}
      </View>
    </TouchableOpacity>
  );
}

export default function OrdersScreen({ navigation }) {
  const [orders, setOrders]       = useState([]);
  const [loading, setLoading]     = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadOrders = useCallback(async () => {
    try {
      const data = await orderService.getOrders();
      // La réponse est paginée: { data: [...], total, ... }
      const list = Array.isArray(data) ? data : (data.data || []);
      setOrders(list);
    } catch (e) {
      console.error('Erreur commandes:', e);
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
        <Text style={styles.headerTitle}>Mes commandes</Text>
      </View>

      {orders.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyEmoji}>📦</Text>
          <Text style={styles.emptyTitle}>Aucune commande</Text>
          <Text style={styles.emptySubtitle}>Vos commandes apparaîtront ici</Text>
          <TouchableOpacity style={styles.menuBtn} onPress={() => navigation.navigate('Main', { screen: 'Menu' })}>
            <Text style={styles.menuBtnText}>Commander maintenant</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={orders}
          keyExtractor={item => String(item.id)}
          renderItem={({ item }) => (
            <OrderCard
              order={item}
              onPress={order => navigation.navigate('OrderDetail', { orderId: order.id })}
            />
          )}
          contentContainerStyle={{ padding: 16 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  loader:    { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.bg },
  header:    { paddingHorizontal: 20, paddingVertical: 16, backgroundColor: COLORS.card, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: COLORS.text },

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
  itemsList:    { fontSize: 13, color: COLORS.gray, marginBottom: 12, lineHeight: 18 },
  cardFooter:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardTotal:    { fontSize: 16, fontWeight: '800', color: COLORS.primary },
  trackLink:    { fontSize: 13, color: COLORS.primary, fontWeight: '600' },

  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  emptyEmoji:    { fontSize: 70, marginBottom: 16 },
  emptyTitle:    { fontSize: 20, fontWeight: 'bold', color: COLORS.text, marginBottom: 8 },
  emptySubtitle: { fontSize: 15, color: COLORS.gray, textAlign: 'center', marginBottom: 32 },
  menuBtn: { backgroundColor: COLORS.primary, paddingHorizontal: 28, paddingVertical: 14, borderRadius: 14 },
  menuBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 15 },
});
