// Feuille « Livrer à » : position actuelle, adresses enregistrées, ajout d'adresse.
import React, { useEffect, useState } from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONTS, TYPE, RADIUS, SCREEN_PADDING } from '../theme';
import { useAuth } from '../context/AuthContext';
import { useDeliveryLocation } from '../context/DeliveryLocationContext';
import { profileService } from '../services/profileService';

export default function DeliveryLocationSheet({ visible, onClose, navigation }) {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { location, locating, selectSavedAddress, useCurrentPosition } = useDeliveryLocation();
  const [addresses, setAddresses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!visible || !user) return;
    setError('');
    setLoading(true);
    profileService.getAddresses()
      .then((data) => setAddresses(Array.isArray(data) ? data : data?.data || []))
      .catch(() => setAddresses([]))
      .finally(() => setLoading(false));
  }, [visible, user]);

  const pickGps = async () => {
    setError('');
    try {
      await useCurrentPosition();
      onClose();
    } catch (e) {
      setError(e.message || 'Impossible de récupérer votre position.');
    }
  };

  const pickAddress = (addr) => {
    selectSavedAddress(addr);
    onClose();
  };

  const addAddress = () => {
    onClose();
    if (!user) navigation.navigate('Auth', { screen: 'Login' });
    else navigation.navigate('AddAddress');
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} />
      <View style={[styles.sheet, { paddingBottom: insets.bottom + 16 }]}>
        <View style={styles.handle} />
        <Text style={[TYPE.h2, { marginBottom: 4 }]}>Où livrer ?</Text>
        <Text style={[TYPE.bodyMuted, { marginBottom: 16 }]}>Choisissez votre adresse de livraison</Text>

        <TouchableOpacity style={styles.gpsRow} onPress={pickGps} disabled={locating} activeOpacity={0.8}>
          <View style={styles.gpsIcon}>
            {locating ? <ActivityIndicator color={COLORS.white} size="small" /> : <Ionicons name="navigate" size={18} color={COLORS.white} />}
          </View>
          <View style={{ flex: 1 }}>
            <Text style={TYPE.title}>Utiliser ma position actuelle</Text>
            <Text style={TYPE.caption}>{locating ? 'Localisation en cours…' : 'Via le GPS de votre téléphone'}</Text>
          </View>
          {location?.source === 'gps' && <Ionicons name="checkmark-circle" size={22} color={COLORS.primary} />}
        </TouchableOpacity>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        {user ? (
          <>
            <Text style={styles.groupTitle}>Mes adresses</Text>
            <ScrollView style={{ maxHeight: 260 }} showsVerticalScrollIndicator={false}>
              {loading ? <ActivityIndicator color={COLORS.primary} style={{ marginVertical: 20 }} /> : null}
              {!loading && addresses.length === 0 ? (
                <Text style={[TYPE.caption, { paddingVertical: 8 }]}>Aucune adresse enregistrée pour l'instant.</Text>
              ) : null}
              {addresses.map((addr) => {
                const selected = location?.addressId === addr.id;
                return (
                  <TouchableOpacity key={addr.id} style={[styles.addrRow, selected && styles.addrRowActive]} onPress={() => pickAddress(addr)} activeOpacity={0.8}>
                    <View style={styles.addrIcon}>
                      <Ionicons name={/maison|home/i.test(addr.label || '') ? 'home' : /bureau|travail|work/i.test(addr.label || '') ? 'briefcase' : 'location'} size={18} color={COLORS.primary} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={TYPE.title} numberOfLines={1}>{addr.label || 'Adresse'}</Text>
                      <Text style={TYPE.caption} numberOfLines={1}>{[addr.address, addr.city].filter(Boolean).join(', ')}</Text>
                    </View>
                    {selected && <Ionicons name="checkmark-circle" size={22} color={COLORS.primary} />}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </>
        ) : null}

        <TouchableOpacity style={styles.addRow} onPress={addAddress} activeOpacity={0.8}>
          <Ionicons name="add-circle-outline" size={22} color={COLORS.primary} />
          <Text style={styles.addText}>{user ? 'Ajouter une nouvelle adresse' : 'Se connecter pour gérer mes adresses'}</Text>
        </TouchableOpacity>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: COLORS.overlay },
  sheet: {
    backgroundColor: COLORS.surface, borderTopLeftRadius: RADIUS.xxl, borderTopRightRadius: RADIUS.xxl,
    paddingHorizontal: SCREEN_PADDING, paddingTop: 10,
  },
  handle: { alignSelf: 'center', width: 44, height: 5, borderRadius: 3, backgroundColor: COLORS.border, marginBottom: 16 },
  gpsRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14,
    backgroundColor: COLORS.primarySoft, borderRadius: RADIUS.lg,
  },
  gpsIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center' },
  error: { fontFamily: FONTS.regular, fontSize: 12, color: COLORS.danger, marginTop: 8 },
  groupTitle: { fontFamily: FONTS.semibold, fontSize: 13, color: COLORS.textMuted, marginTop: 20, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 },
  addrRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingHorizontal: 10,
    borderRadius: RADIUS.md, borderWidth: 1, borderColor: 'transparent',
  },
  addrRowActive: { borderColor: COLORS.primaryLight, backgroundColor: '#FFFBF8' },
  addrIcon: { width: 38, height: 38, borderRadius: 19, backgroundColor: COLORS.surfaceAlt, alignItems: 'center', justifyContent: 'center' },
  addRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 16, marginTop: 6 },
  addText: { fontFamily: FONTS.semibold, fontSize: 14, color: COLORS.primary },
});
