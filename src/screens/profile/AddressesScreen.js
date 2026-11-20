import { showAlert } from '../../utils/showAlert';
import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, Alert, RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { profileService } from '../../services/profileService';
import { useDeliveryLocation } from '../../context/DeliveryLocationContext';
import {
  Screen, ScreenHeader, IconButton, Card, Badge, Button, EmptyState, LoadingView, Divider,
} from '../../components/ui';
import { COLORS, FONTS, TYPE, RADIUS, SHADOWS, SCREEN_PADDING } from '../../theme';

// Icône selon le libellé de l'adresse
function addressIcon(label = '') {
  const l = String(label).toLowerCase();
  if (/maison|domicile|home|chez/.test(l)) return 'home-outline';
  if (/bureau|travail|work|boulot|office/.test(l)) return 'briefcase-outline';
  return 'location-outline';
}

function ActionButton({ icon, label, onPress, color = COLORS.primary }) {
  return (
    <TouchableOpacity style={styles.action} onPress={onPress} activeOpacity={0.7} hitSlop={6}>
      <Ionicons name={icon} size={16} color={color} />
      <Text style={[styles.actionText, { color }]}>{label}</Text>
    </TouchableOpacity>
  );
}

export default function AddressesScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { location, setLocation } = useDeliveryLocation();
  const [addresses, setAddresses]   = useState([]);
  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadAddresses = useCallback(async () => {
    try {
      const data = await profileService.getAddresses();
      setAddresses(Array.isArray(data) ? data : data?.data || []);
    } catch (e) {
      console.error('Erreur adresses:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Recharge à chaque retour sur l'écran (après ajout / modification)
  useFocusEffect(useCallback(() => { loadAddresses(); }, [loadAddresses]));

  const goAdd = () => navigation.navigate('AddAddress');
  const goEdit = (address) => navigation.navigate('AddAddress', { address });

  const handleDelete = (id) => {
    showAlert(
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
              // L'adresse supprimée ne doit plus rester l'adresse de livraison active
              if (location?.addressId === id) setLocation(null);
            } catch (e) {
              showAlert('Erreur', 'Impossible de supprimer l\'adresse.');
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
      showAlert('Erreur', 'Impossible de définir l\'adresse par défaut.');
    }
  };

  if (loading) {
    return (
      <Screen>
        <ScreenHeader title="Mes adresses" onBack={() => navigation.goBack()} />
        <LoadingView />
      </Screen>
    );
  }

  const renderItem = ({ item }) => {
    const isDefault = !!item.is_default;
    return (
      <Card style={[styles.card, isDefault && styles.cardDefault]}>
        <View style={styles.cardTop}>
          <View style={[styles.iconTile, isDefault && { backgroundColor: COLORS.primary }]}>
            <Ionicons
              name={addressIcon(item.label)}
              size={20}
              color={isDefault ? COLORS.white : COLORS.primary}
            />
          </View>
          <View style={{ flex: 1 }}>
            <View style={styles.labelRow}>
              <Text style={styles.label} numberOfLines={1}>{item.label || 'Adresse'}</Text>
              {isDefault ? <Badge label="Par défaut" icon="checkmark-circle" /> : null}
            </View>
            <Text style={styles.address} numberOfLines={3}>{item.address}</Text>
            {item.address_details ? (
              <Text style={styles.details} numberOfLines={2}>{item.address_details}</Text>
            ) : null}
            {item.phone ? (
              <View style={styles.phoneRow}>
                <Ionicons name="call-outline" size={13} color={COLORS.textMuted} />
                <Text style={styles.phone}>{item.phone}</Text>
              </View>
            ) : null}
          </View>
        </View>

        <Divider style={{ marginVertical: 12 }} />

        <View style={styles.actions}>
          {!isDefault ? (
            <ActionButton icon="star-outline" label="Par défaut" onPress={() => handleSetDefault(item.id)} />
          ) : <View style={{ flex: 1 }} />}
          <View style={styles.actionsRight}>
            <ActionButton icon="create-outline" label="Modifier" color={COLORS.text} onPress={() => goEdit(item)} />
            <ActionButton icon="trash-outline" label="Supprimer" color={COLORS.danger} onPress={() => handleDelete(item.id)} />
          </View>
        </View>
      </Card>
    );
  };

  return (
    <Screen>
      <ScreenHeader
        title="Mes adresses"
        subtitle={addresses.length ? `${addresses.length} adresse${addresses.length > 1 ? 's' : ''}` : undefined}
        onBack={() => navigation.goBack()}
        right={addresses.length ? <IconButton icon="add" color={COLORS.primary} onPress={goAdd} /> : null}
      />

      {addresses.length === 0 ? (
        <EmptyState
          icon="location-outline"
          title="Aucune adresse"
          message="Ajoutez une adresse pour être livré plus rapidement."
          actionLabel="Ajouter une adresse"
          onAction={goAdd}
          style={{ flex: 1, justifyContent: 'center' }}
        />
      ) : (
        <>
          <FlatList
            data={addresses}
            keyExtractor={item => String(item.id)}
            renderItem={renderItem}
            contentContainerStyle={styles.list}
            showsVerticalScrollIndicator={false}
            refreshControl={(
              <RefreshControl
                refreshing={refreshing}
                onRefresh={() => { setRefreshing(true); loadAddresses(); }}
                tintColor={COLORS.primary}
                colors={[COLORS.primary]}
              />
            )}
          />
          <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 16) }]}>
            <Button title="Ajouter une adresse" icon="add" onPress={goAdd} />
          </View>
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: { paddingHorizontal: SCREEN_PADDING, paddingTop: 8, paddingBottom: 24, gap: 14 },

  card: { borderWidth: 1.5, borderColor: 'transparent' },
  cardDefault: { borderColor: COLORS.primaryLight },
  cardTop: { flexDirection: 'row', gap: 12 },
  iconTile: {
    width: 44, height: 44, borderRadius: RADIUS.md, backgroundColor: COLORS.primarySoft,
    alignItems: 'center', justifyContent: 'center',
  },
  labelRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 2, flexWrap: 'wrap' },
  label: { ...TYPE.title, flexShrink: 1 },
  address: { ...TYPE.bodyMuted, fontSize: 13, lineHeight: 19 },
  details: { ...TYPE.caption, color: COLORS.textLight, marginTop: 2 },
  phoneRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 6 },
  phone: { fontFamily: FONTS.medium, fontSize: 12, color: COLORS.text },

  actions: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  actionsRight: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  action: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  actionText: { fontFamily: FONTS.medium, fontSize: 13 },

  footer: {
    paddingHorizontal: SCREEN_PADDING, paddingTop: 12,
    backgroundColor: COLORS.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24,
    ...SHADOWS.lg,
  },
});
