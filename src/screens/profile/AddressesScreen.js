import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  SafeAreaView, Alert, ActivityIndicator,
} from 'react-native';
import { profileService } from '../../services/profileService';
import { useFocusEffect } from '@react-navigation/native';

const COLORS = { primary: '#FF6B35', bg: '#f8f8f8', card: '#fff', text: '#1a1a1a', gray: '#888' };

export default function AddressesScreen({ navigation }) {
  const [addresses, setAddresses] = useState([]);
  const [loading, setLoading]     = useState(true);

  const loadAddresses = useCallback(async () => {
    try {
      const data = await profileService.getAddresses();
      setAddresses(data);
    } catch (e) {
      console.error('Erreur adresses:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { loadAddresses(); }, [loadAddresses]));

  const handleDelete = (id) => {
    Alert.alert(
      'Supprimer l\'adresse',
      'Voulez-vous vraiment supprimer cette adresse ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer', style: 'destructive',
          onPress: async () => {
            try {
              await profileService.deleteAddress(id);
              setAddresses(prev => prev.filter(a => a.id !== id));
            } catch (e) {
              Alert.alert('Erreur', 'Impossible de supprimer l\'adresse.');
            }
          },
        },
      ]
    );
  };

  const handleSetDefault = async (id) => {
    try {
      await profileService.setDefaultAddress(id);
      setAddresses(prev => prev.map(a => ({ ...a, is_default: a.id === id })));
    } catch (e) {
      Alert.alert('Erreur', 'Impossible de définir l\'adresse par défaut.');
    }
  };

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
        <Text style={styles.headerTitle}>Mes adresses</Text>
        <TouchableOpacity onPress={() => navigation.navigate('AddAddress', { onSave: loadAddresses })}>
          <Text style={styles.addBtn}>+</Text>
        </TouchableOpacity>
      </View>

      {addresses.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyEmoji}>📍</Text>
          <Text style={styles.emptyTitle}>Aucune adresse</Text>
          <Text style={styles.emptySubtitle}>Ajoutez une adresse de livraison</Text>
          <TouchableOpacity
            style={styles.addFirstBtn}
            onPress={() => navigation.navigate('AddAddress', { onSave: loadAddresses })}
          >
            <Text style={styles.addFirstBtnText}>+ Ajouter une adresse</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={addresses}
          keyExtractor={item => String(item.id)}
          contentContainerStyle={{ padding: 16 }}
          renderItem={({ item }) => (
            <View style={[styles.card, item.is_default && styles.cardDefault]}>
              <View style={styles.cardHeader}>
                <View style={styles.labelRow}>
                  <Text style={styles.labelIcon}>📍</Text>
                  <Text style={styles.labelText}>{item.label || 'Adresse'}</Text>
                  {item.is_default && (
                    <View style={styles.defaultBadge}>
                      <Text style={styles.defaultBadgeText}>Par défaut</Text>
                    </View>
                  )}
                </View>
                <TouchableOpacity onPress={() => handleDelete(item.id)}>
                  <Text style={styles.deleteBtn}>🗑</Text>
                </TouchableOpacity>
              </View>
              <Text style={styles.addressText}>{item.address}</Text>
              {item.phone && (
                <Text style={styles.phoneText}>📞 {item.phone}</Text>
              )}
              {!item.is_default && (
                <TouchableOpacity
                  style={styles.setDefaultBtn}
                  onPress={() => handleSetDefault(item.id)}
                >
                  <Text style={styles.setDefaultText}>Définir par défaut</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
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
  addBtn:      { fontSize: 28, color: COLORS.primary, paddingHorizontal: 8 },

  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  emptyEmoji:    { fontSize: 60, marginBottom: 16 },
  emptyTitle:    { fontSize: 20, fontWeight: 'bold', color: COLORS.text, marginBottom: 8 },
  emptySubtitle: { fontSize: 15, color: COLORS.gray, textAlign: 'center', marginBottom: 28 },
  addFirstBtn:   { backgroundColor: COLORS.primary, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 14 },
  addFirstBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 15 },

  card: {
    backgroundColor: COLORS.card, borderRadius: 16, padding: 16, marginBottom: 12,
    borderWidth: 1.5, borderColor: 'transparent',
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, elevation: 1,
  },
  cardDefault: { borderColor: COLORS.primary },
  cardHeader:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  labelRow:    { flexDirection: 'row', alignItems: 'center', gap: 6 },
  labelIcon:   { fontSize: 16 },
  labelText:   { fontSize: 14, fontWeight: '700', color: COLORS.text },
  defaultBadge: { backgroundColor: '#FFF3E0', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
  defaultBadgeText: { fontSize: 11, color: COLORS.primary, fontWeight: '600' },
  deleteBtn:   { fontSize: 18, padding: 4 },
  addressText: { fontSize: 14, color: COLORS.gray, lineHeight: 20, marginBottom: 4 },
  phoneText:   { fontSize: 13, color: COLORS.primary, fontWeight: '600', marginBottom: 8 },
  setDefaultBtn:  { alignSelf: 'flex-start' },
  setDefaultText: { fontSize: 13, color: COLORS.primary, fontWeight: '600' },
});
