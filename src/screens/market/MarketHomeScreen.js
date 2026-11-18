import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from '@react-navigation/native';
import { marketService } from '../../services/marketService';
import {
  COLORS, FONTS, TYPE, RADIUS, SHADOWS, SCREEN_PADDING, formatPrice,
} from '../../theme';
import { useTabBarSpace } from '../../hooks/useTabBarSpace';
import {
  Screen, Card, Badge, Button, SectionHeader, EmptyState, LoadingView, MetaItem, Divider,
} from '../../components/ui';

// Accent « produits frais » (secondaire, l'orange reste la couleur principale)
const FRESH = { color: COLORS.success, soft: COLORS.successSoft };

const STATUS_CONFIG = {
  pending:      { label: 'En attente',       color: COLORS.warning, bg: COLORS.warningSoft, iconName: 'time-outline' },
  assigned:     { label: 'Coursier assigné', color: COLORS.info,    bg: COLORS.infoSoft,    iconName: 'person-outline' },
  at_market:    { label: 'Au marché',        color: '#7C3AED',      bg: '#F1EAFE',          iconName: 'storefront-outline' },
  photos_sent:  { label: 'Photos envoyées',  color: COLORS.primary, bg: COLORS.primarySoft, iconName: 'camera-outline' },
  validated:    { label: 'Validé',           color: '#0D9488',      bg: '#E3F7F4',          iconName: 'checkmark-circle-outline' },
  purchasing:   { label: 'Achats en cours',  color: '#4F46E5',      bg: '#ECEBFE',          iconName: 'cart-outline' },
  delivering:   { label: 'En livraison',     color: COLORS.primary, bg: COLORS.primarySoft, iconName: 'bicycle-outline' },
  delivered:    { label: 'Livré',            color: COLORS.success, bg: COLORS.successSoft, iconName: 'checkmark-done-circle-outline' },
  cancelled:    { label: 'Annulé',           color: COLORS.danger,  bg: COLORS.dangerSoft,  iconName: 'close-circle-outline' },
};

const PAYMENT_LABELS = {
  mobile_money: 'Mobile Money',
  on_delivery: 'Paiement à la livraison',
};

const TRACKABLE = ['assigned', 'at_market', 'photos_sent', 'purchasing', 'delivering'];

const HOW_IT_WORKS = [
  { icon: 'list-outline', label: 'Votre liste' },
  { icon: 'storefront-outline', label: 'Le coursier achète' },
  { icon: 'bicycle-outline', label: 'Livré chez vous' },
];

function MarketOrderCard({ order, onPress }) {
  const status = STATUS_CONFIG[order.status] || {
    label: order.status, color: COLORS.textMuted, bg: COLORS.divider, iconName: 'help-outline',
  };
  const date = new Date(order.created_at).toLocaleDateString('fr-FR', {
    day: '2-digit', month: 'short', year: 'numeric',
  });
  const itemCount = order.items?.length || 0;
  const total = Number(order.total_estimated || order.total || 0);
  const trackable = TRACKABLE.includes(order.status);

  return (
    <Card style={styles.card} onPress={() => onPress(order)}>
      <View style={styles.cardHeader}>
        <View style={styles.cardIcon}>
          <Ionicons name="basket" size={20} color={FRESH.color} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={TYPE.title} numberOfLines={1}>Marché #{order.order_number || order.id}</Text>
          <Text style={TYPE.caption}>{date}</Text>
        </View>
        <Badge label={status.label} icon={status.iconName} color={status.color} bg={status.bg} />
      </View>

      <Divider style={{ marginVertical: 12 }} />

      <View style={styles.cardDetails}>
        <MetaItem icon="list-outline" size={12} label={`${itemCount} article${itemCount > 1 ? 's' : ''}`} />
        <MetaItem
          icon="card-outline"
          size={12}
          label={PAYMENT_LABELS[order.payment_method] || order.payment_method || 'N/A'}
        />
      </View>

      <View style={styles.cardFooter}>
        <View>
          <Text style={TYPE.caption}>Budget estimé</Text>
          <Text style={TYPE.price}>~{formatPrice(total)}</Text>
        </View>
        {trackable ? (
          <View style={styles.trackPill}>
            <Ionicons name="navigate" size={13} color={COLORS.white} />
            <Text style={styles.trackPillText}>Suivre</Text>
          </View>
        ) : (
          <Ionicons name="chevron-forward" size={18} color={COLORS.textLight} />
        )}
      </View>
    </Card>
  );
}

function MarketHero({ onCreate }) {
  return (
    <Card style={styles.hero} padded={false}>
      <LinearGradient
        colors={['#EAF7EE', '#FFF4EC']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.heroInner}
      >
        <View style={styles.heroTop}>
          <View style={{ flex: 1 }}>
            <Badge label="Produits frais" icon="leaf" color={FRESH.color} bg={COLORS.white} />
            <Text style={styles.heroTitle}>Vos courses au marché, livrées chez vous</Text>
            <Text style={styles.heroSub}>
              Créez votre liste, un coursier va au marché, vous valide les articles en photo et vous livre.
            </Text>
          </View>
          <View style={styles.heroEmojiWrap}>
            <Ionicons name="basket" size={30} color={COLORS.success} />
          </View>
        </View>

        <View style={styles.steps}>
          {HOW_IT_WORKS.map((s, i) => (
            <React.Fragment key={s.label}>
              <View style={styles.step}>
                <View style={styles.stepIcon}>
                  <Ionicons name={s.icon} size={16} color={COLORS.primary} />
                </View>
                <Text style={styles.stepLabel} numberOfLines={2}>{s.label}</Text>
              </View>
              {i < HOW_IT_WORKS.length - 1 ? (
                <Ionicons name="chevron-forward" size={14} color={COLORS.textLight} style={{ marginTop: 9 }} />
              ) : null}
            </React.Fragment>
          ))}
        </View>

        <Button title="Nouvelle liste de courses" icon="add-circle-outline" onPress={onCreate} size="md" />
      </LinearGradient>
    </Card>
  );
}

export default function MarketHomeScreen({ navigation }) {
  const tabSpace = useTabBarSpace();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadOrders = useCallback(async () => {
    try {
      const data = await marketService.getOrders();
      const list = Array.isArray(data) ? data : (data.data || []);
      setOrders(list);
    } catch (e) {
      console.error('Erreur commandes marché:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { loadOrders(); }, [loadOrders]));

  const onRefresh = () => { setRefreshing(true); loadOrders(); };
  const goCreate = () => navigation.navigate('CreateMarketList');

  if (loading) {
    return <Screen><LoadingView label="Chargement de vos courses…" /></Screen>;
  }

  return (
    <Screen>
      <View style={styles.header}>
        <Text style={TYPE.h1}>Mon Marché</Text>
        <Text style={TYPE.bodyMuted}>Le marché de Bafoussam, sans vous déplacer</Text>
      </View>

      <FlatList
        data={orders}
        keyExtractor={item => String(item.id)}
        renderItem={({ item }) => (
          <MarketOrderCard
            order={item}
            onPress={order => navigation.navigate('MarketOrderDetail', { orderId: order.id })}
          />
        )}
        ListHeaderComponent={
          <>
            <MarketHero onCreate={goCreate} />
            {orders.length > 0 ? (
              <SectionHeader title="Mes commandes" style={styles.sectionHeader} />
            ) : null}
          </>
        }
        ListEmptyComponent={
          <EmptyState
            icon="basket-outline"
            title="Aucune commande marché"
            message="Vos listes de courses apparaîtront ici dès votre première commande."
          />
        }
        contentContainerStyle={{ paddingBottom: tabSpace + 60 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
      />

      {/* FAB */}
      {orders.length > 0 && (
        <TouchableOpacity style={[styles.fab, { bottom: tabSpace - 4 }]} onPress={goCreate} activeOpacity={0.85}>
          <Ionicons name="add" size={28} color={COLORS.white} />
        </TouchableOpacity>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: SCREEN_PADDING, paddingTop: 12, paddingBottom: 6 },

  hero: { marginHorizontal: SCREEN_PADDING, marginTop: 12, marginBottom: 24, overflow: 'hidden' },
  heroInner: { padding: 18, borderRadius: RADIUS.xl },
  heroTop: { flexDirection: 'row', gap: 10 },
  heroTitle: { fontFamily: FONTS.bold, fontSize: 19, lineHeight: 25, color: COLORS.text, marginTop: 10 },
  heroSub: { ...TYPE.caption, marginTop: 6 },
  heroEmojiWrap: {
    width: 64, height: 64, borderRadius: 32, backgroundColor: COLORS.white,
    alignItems: 'center', justifyContent: 'center', ...SHADOWS.sm,
  },
  steps: {
    flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between',
    backgroundColor: 'rgba(255,255,255,0.75)', borderRadius: RADIUS.lg,
    paddingVertical: 12, paddingHorizontal: 10, marginVertical: 16,
  },
  step: { flex: 1, alignItems: 'center' },
  stepIcon: {
    width: 34, height: 34, borderRadius: 17, backgroundColor: COLORS.primarySoft,
    alignItems: 'center', justifyContent: 'center',
  },
  stepLabel: { fontFamily: FONTS.medium, fontSize: 11, lineHeight: 15, color: COLORS.text, marginTop: 6, textAlign: 'center' },

  sectionHeader: { marginBottom: 12 },

  card: { marginHorizontal: SCREEN_PADDING, marginBottom: 14 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  cardIcon: {
    width: 42, height: 42, borderRadius: 14, backgroundColor: FRESH.soft,
    alignItems: 'center', justifyContent: 'center',
  },
  cardDetails: { flexDirection: 'row', gap: 16, marginBottom: 12, flexWrap: 'wrap' },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  trackPill: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: COLORS.primary, borderRadius: RADIUS.pill,
    paddingHorizontal: 14, paddingVertical: 7,
  },
  trackPillText: { fontFamily: FONTS.semibold, fontSize: 12, color: COLORS.white },

  fab: {
    position: 'absolute', right: SCREEN_PADDING,
    width: 58, height: 58, borderRadius: 29,
    backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center',
    ...SHADOWS.primary,
  },
});
