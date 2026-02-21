import React from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  SafeAreaView, ScrollView, Alert,
} from 'react-native';
import { useAuth } from '../../context/AuthContext';

const COLORS = { primary: '#FF6B35', bg: '#f8f8f8', card: '#fff', text: '#1a1a1a', gray: '#888' };

function MenuItem({ icon, label, desc, onPress, danger }) {
  return (
    <TouchableOpacity style={styles.menuItem} onPress={onPress} activeOpacity={0.7}>
      <Text style={styles.menuIcon}>{icon}</Text>
      <View style={{ flex: 1 }}>
        <Text style={[styles.menuLabel, danger && { color: '#ef4444' }]}>{label}</Text>
        {desc && <Text style={styles.menuDesc}>{desc}</Text>}
      </View>
      <Text style={[styles.menuChevron, danger && { color: '#ef4444' }]}>›</Text>
    </TouchableOpacity>
  );
}

export default function ProfileScreen({ navigation }) {
  const { user, logout } = useAuth();

  const handleLogout = () => {
    Alert.alert(
      'Déconnexion',
      'Voulez-vous vraiment vous déconnecter ?',
      [
        { text: 'Annuler', style: 'cancel' },
        { text: 'Se déconnecter', style: 'destructive', onPress: logout },
      ]
    );
  };

  const initial = user?.name?.charAt(0)?.toUpperCase() || '?';

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Mon profil</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Avatar & infos */}
        <View style={styles.profileCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initial}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.name}>{user?.name}</Text>
            <Text style={styles.email}>{user?.email}</Text>
            {user?.phone && <Text style={styles.phone}>📞 {user.phone}</Text>}
          </View>
          <TouchableOpacity
            style={styles.editAvatarBtn}
            onPress={() => navigation.navigate('EditProfile')}
          >
            <Text style={styles.editAvatarText}>✏️</Text>
          </TouchableOpacity>
        </View>

        {/* Section compte */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Mon compte</Text>
          <View style={styles.menuCard}>
            <MenuItem
              icon="👤" label="Modifier mon profil" desc="Nom, téléphone, email"
              onPress={() => navigation.navigate('EditProfile')}
            />
            <View style={styles.divider} />
            <MenuItem
              icon="📍" label="Mes adresses" desc="Gérer vos adresses de livraison"
              onPress={() => navigation.navigate('Addresses')}
            />
            <View style={styles.divider} />
            <MenuItem
              icon="🔔" label="Notifications" desc="Gérer vos préférences"
              onPress={() => navigation.navigate('Notifications')}
            />
          </View>
        </View>

        {/* Section commandes */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Commandes</Text>
          <View style={styles.menuCard}>
            <MenuItem
              icon="📦" label="Mes commandes" desc="Historique de toutes vos commandes"
              onPress={() => navigation.navigate('Main', { screen: 'Commandes' })}
            />
          </View>
        </View>

        {/* Section app */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Application</Text>
          <View style={styles.menuCard}>
            <MenuItem icon="ℹ️" label="À propos" desc="Version 1.0.0" onPress={() => {}} />
            <View style={styles.divider} />
            <MenuItem icon="⭐" label="Noter l'application" onPress={() => {}} />
          </View>
        </View>

        {/* Déconnexion */}
        <View style={styles.section}>
          <View style={styles.menuCard}>
            <MenuItem icon="🚪" label="Se déconnecter" onPress={handleLogout} danger />
          </View>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container:   { flex: 1, backgroundColor: COLORS.bg },
  header:      { paddingHorizontal: 20, paddingVertical: 16, backgroundColor: COLORS.card, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: COLORS.text },

  profileCard: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: COLORS.card, margin: 16, borderRadius: 20, padding: 20,
    shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8, elevation: 2,
  },
  avatar:     { width: 64, height: 64, borderRadius: 32, backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center' },
  avatarText: { fontSize: 28, fontWeight: 'bold', color: '#fff' },
  name:       { fontSize: 17, fontWeight: 'bold', color: COLORS.text },
  email:      { fontSize: 13, color: COLORS.gray, marginTop: 2 },
  phone:      { fontSize: 13, color: COLORS.gray, marginTop: 2 },
  editAvatarBtn: { padding: 8 },
  editAvatarText:{ fontSize: 20 },

  section:      { marginHorizontal: 16, marginBottom: 12 },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: COLORS.gray, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
  menuCard:     { backgroundColor: COLORS.card, borderRadius: 16, overflow: 'hidden', shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, elevation: 1 },
  menuItem:     { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 12 },
  menuIcon:     { fontSize: 20, width: 28, textAlign: 'center' },
  menuLabel:    { fontSize: 15, fontWeight: '600', color: COLORS.text },
  menuDesc:     { fontSize: 12, color: COLORS.gray, marginTop: 2 },
  menuChevron:  { fontSize: 22, color: '#ccc', fontWeight: '300' },
  divider:      { height: 1, backgroundColor: '#f5f5f5', marginLeft: 56 },
});
