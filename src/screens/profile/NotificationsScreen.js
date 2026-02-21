import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  SafeAreaView, ActivityIndicator, RefreshControl,
} from 'react-native';
import { profileService } from '../../services/profileService';
import { useFocusEffect } from '@react-navigation/native';

const COLORS = { primary: '#FF6B35', bg: '#f8f8f8', card: '#fff', text: '#1a1a1a', gray: '#888' };

const NOTIF_ICONS = {
  order:    '📦',
  promo:    '🎉',
  delivery: '🚚',
  system:   'ℹ️',
};

function NotifCard({ notif, onPress }) {
  const icon = NOTIF_ICONS[notif.type] || '🔔';
  const date = new Date(notif.created_at).toLocaleString('fr-FR', {
    day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
  });
  return (
    <TouchableOpacity
      style={[styles.card, !notif.read_at && styles.cardUnread]}
      onPress={() => onPress(notif)}
      activeOpacity={0.8}
    >
      <View style={[styles.iconBox, !notif.read_at && styles.iconBoxUnread]}>
        <Text style={styles.icon}>{icon}</Text>
      </View>
      <View style={styles.content}>
        <Text style={[styles.title, !notif.read_at && styles.titleUnread]} numberOfLines={1}>
          {notif.title}
        </Text>
        <Text style={styles.body} numberOfLines={2}>{notif.body}</Text>
        <Text style={styles.date}>{date}</Text>
      </View>
      {!notif.read_at && <View style={styles.unreadDot} />}
    </TouchableOpacity>
  );
}

export default function NotificationsScreen({ navigation }) {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadNotifs = useCallback(async () => {
    try {
      const data = await profileService.getNotifications();
      setNotifications(data);
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
    // Navigate based on type
    if (notif.type === 'order' && notif.data?.order_id) {
      navigation.navigate('OrderDetail', { orderId: notif.data.order_id });
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await profileService.markAllNotificationsRead();
      setNotifications(prev => prev.map(n => ({ ...n, read_at: new Date().toISOString() })));
    } catch (_) {}
  };

  const unreadCount = notifications.filter(n => !n.read_at).length;

  if (loading) {
    return <View style={styles.loader}><ActivityIndicator size="large" color={COLORS.primary} /></View>;
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          Notifications {unreadCount > 0 ? `(${unreadCount})` : ''}
        </Text>
        {unreadCount > 0 ? (
          <TouchableOpacity onPress={handleMarkAllRead}>
            <Text style={styles.markAllBtn}>Tout lire</Text>
          </TouchableOpacity>
        ) : (
          <View style={{ width: 60 }} />
        )}
      </View>

      {notifications.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyEmoji}>🔔</Text>
          <Text style={styles.emptyTitle}>Aucune notification</Text>
          <Text style={styles.emptySubtitle}>Vous serez notifié des mises à jour de vos commandes ici</Text>
        </View>
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={item => String(item.id)}
          renderItem={({ item }) => <NotifCard notif={item} onPress={handlePress} />}
          contentContainerStyle={{ padding: 16 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => { setRefreshing(true); loadNotifs(); }}
              tintColor={COLORS.primary}
            />
          }
        />
      )}
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
  markAllBtn:  { color: COLORS.primary, fontSize: 13, fontWeight: '600' },

  card: {
    flexDirection: 'row', alignItems: 'flex-start',
    backgroundColor: COLORS.card, borderRadius: 16, padding: 14,
    marginBottom: 10, gap: 12,
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, elevation: 1,
  },
  cardUnread: { backgroundColor: '#FFF8F5' },
  iconBox:    { width: 44, height: 44, borderRadius: 22, backgroundColor: '#f0f0f0', justifyContent: 'center', alignItems: 'center' },
  iconBoxUnread: { backgroundColor: '#FFF3E0' },
  icon:       { fontSize: 20 },
  content:    { flex: 1 },
  title:      { fontSize: 14, fontWeight: '600', color: COLORS.text, marginBottom: 3 },
  titleUnread:{ fontWeight: '700' },
  body:       { fontSize: 13, color: COLORS.gray, lineHeight: 18, marginBottom: 4 },
  date:       { fontSize: 11, color: '#bbb' },
  unreadDot:  { width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.primary, marginTop: 6 },

  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  emptyEmoji:    { fontSize: 60, marginBottom: 16 },
  emptyTitle:    { fontSize: 20, fontWeight: 'bold', color: COLORS.text, marginBottom: 8 },
  emptySubtitle: { fontSize: 15, color: COLORS.gray, textAlign: 'center', lineHeight: 22 },
});
