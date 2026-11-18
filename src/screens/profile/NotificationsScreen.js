import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { profileService } from '../../services/profileService';
import { Screen, ScreenHeader, Card, EmptyState, LoadingView } from '../../components/ui';
import { COLORS, FONTS, TYPE, RADIUS, SCREEN_PADDING } from '../../theme';
import { useTabBarSpace } from '../../hooks/useTabBarSpace';

const NOTIF_TYPES = {
  order:    { icon: 'cube-outline',               color: COLORS.primary, bg: COLORS.primarySoft },
  promo:    { icon: 'pricetag-outline',           color: COLORS.success, bg: COLORS.successSoft },
  delivery: { icon: 'bicycle-outline',            color: COLORS.info,    bg: COLORS.infoSoft },
  system:   { icon: 'information-circle-outline', color: COLORS.warning, bg: COLORS.warningSoft },
};
const DEFAULT_TYPE = { icon: 'notifications-outline', color: COLORS.primary, bg: COLORS.primarySoft };

// « À l'instant », « Il y a 5 min », « Hier », puis date courte
function relativeTime(value) {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  const diff = Math.max(0, (Date.now() - d.getTime()) / 1000);
  if (diff < 60) return "À l'instant";
  if (diff < 3600) return `Il y a ${Math.floor(diff / 60)} min`;
  if (diff < 86400) return `Il y a ${Math.floor(diff / 3600)} h`;
  if (diff < 172800) return 'Hier';
  if (diff < 604800) return `Il y a ${Math.floor(diff / 86400)} jours`;
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: diff > 31536000 ? 'numeric' : undefined });
}

function NotifCard({ notif, onPress }) {
  const type = NOTIF_TYPES[notif.type] || DEFAULT_TYPE;
  const unread = !notif.read_at;
  return (
    <Card
      onPress={() => onPress(notif)}
      style={[styles.card, unread && styles.cardUnread]}
    >
      <View style={[styles.iconTile, { backgroundColor: type.bg }]}>
        <Ionicons name={type.icon} size={20} color={type.color} />
      </View>
      <View style={styles.content}>
        <View style={styles.titleRow}>
          <Text style={[styles.title, unread && styles.titleUnread]} numberOfLines={1}>
            {notif.title}
          </Text>
          {unread ? <View style={styles.unreadDot} /> : null}
        </View>
        {notif.body ? <Text style={styles.body} numberOfLines={2}>{notif.body}</Text> : null}
        <Text style={styles.date}>{relativeTime(notif.created_at)}</Text>
      </View>
    </Card>
  );
}

export default function NotificationsScreen({ navigation }) {
  const tabSpace = useTabBarSpace();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Cet écran est aussi un onglet (espace restaurant) : pas de retour, et place pour la barre d'onglets
  const isTab = navigation.getState?.()?.type === 'tab';

  const loadNotifs = useCallback(async () => {
    try {
      const data = await profileService.getNotifications();
      setNotifications(Array.isArray(data) ? data : data?.data || []);
    } catch (e) {
      console.error('Erreur notifs:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { loadNotifs(); }, [loadNotifs]));

  const handlePress = async (notif) => {
    if (!notif.read_at) {
      try {
        await profileService.markNotificationRead(notif.id);
        setNotifications(prev => prev.map(n =>
          n.id === notif.id ? { ...n, read_at: new Date().toISOString() } : n
        ));
      } catch (_) {}
    }
    // Navigation selon le type
    if (notif.type === 'order' && notif.data?.order_id) {
      navigation.navigate('OrderDetail', { orderId: notif.data.order_id });
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await profileService.markAllNotificationsRead();
      setNotifications(prev => prev.map(n => ({ ...n, read_at: n.read_at || new Date().toISOString() })));
    } catch (_) {}
  };

  const unreadCount = notifications.filter(n => !n.read_at).length;
  const onBack = !isTab && navigation.canGoBack() ? () => navigation.goBack() : undefined;

  const header = (
    <ScreenHeader
      title="Notifications"
      subtitle={unreadCount > 0 ? `${unreadCount} non lue${unreadCount > 1 ? 's' : ''}` : undefined}
      onBack={onBack}
    />
  );

  if (loading) {
    return <Screen>{header}<LoadingView /></Screen>;
  }

  return (
    <Screen>
      {header}

      {notifications.length === 0 ? (
        <EmptyState
          icon="notifications-outline"
          title="Aucune notification"
          message="Vous serez notifié des mises à jour de vos commandes ici."
          style={{ flex: 1, justifyContent: 'center', paddingBottom: isTab ? tabSpace : 48 }}
        />
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={item => String(item.id)}
          renderItem={({ item }) => <NotifCard notif={item} onPress={handlePress} />}
          contentContainerStyle={[styles.list, { paddingBottom: isTab ? tabSpace : 32 }]}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={unreadCount > 0 ? (
            <View style={styles.listHeader}>
              <Text style={TYPE.caption}>
                {unreadCount} nouvelle{unreadCount > 1 ? 's' : ''} notification{unreadCount > 1 ? 's' : ''}
              </Text>
              <TouchableOpacity style={styles.markAll} onPress={handleMarkAllRead} hitSlop={8}>
                <Ionicons name="checkmark-done" size={16} color={COLORS.primary} />
                <Text style={styles.markAllText}>Tout marquer comme lu</Text>
              </TouchableOpacity>
            </View>
          ) : null}
          refreshControl={(
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => { setRefreshing(true); loadNotifs(); }}
              tintColor={COLORS.primary}
              colors={[COLORS.primary]}
            />
          )}
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: { paddingHorizontal: SCREEN_PADDING, paddingTop: 4, gap: 12 },
  listHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginBottom: 2,
  },
  markAll: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: COLORS.primarySoft, borderRadius: RADIUS.pill,
    paddingHorizontal: 12, paddingVertical: 6,
  },
  markAllText: { fontFamily: FONTS.semibold, fontSize: 12, color: COLORS.primary },

  card: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, padding: 14 },
  cardUnread: { backgroundColor: '#FFF6F1', borderWidth: 1, borderColor: COLORS.primaryLight },
  iconTile: {
    width: 44, height: 44, borderRadius: RADIUS.md,
    alignItems: 'center', justifyContent: 'center',
  },
  content: { flex: 1 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  title: { fontFamily: FONTS.medium, fontSize: 14, lineHeight: 20, color: COLORS.text, flex: 1 },
  titleUnread: { fontFamily: FONTS.semibold },
  body: { ...TYPE.caption, fontSize: 13, lineHeight: 18, marginTop: 2 },
  date: { fontFamily: FONTS.regular, fontSize: 11, color: COLORS.textLight, marginTop: 6 },
  unreadDot: { width: 9, height: 9, borderRadius: 5, backgroundColor: COLORS.primary },
});
