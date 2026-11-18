import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, ActivityIndicator,
  KeyboardAvoidingView, Platform, Switch,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import { profileService } from '../../services/profileService';
import { useDeliveryLocation } from '../../context/DeliveryLocationContext';
import {
  Screen, ScreenHeader, Input, Button, Card, Chip, Badge, Divider,
} from '../../components/ui';
import { COLORS, FONTS, TYPE, RADIUS, SHADOWS, SCREEN_PADDING } from '../../theme';

const LABELS = [
  { key: 'Maison', icon: 'home-outline' },
  { key: 'Bureau', icon: 'briefcase-outline' },
  { key: 'Autre',  icon: 'location-outline' },
];
const DEFAULT_CITY = 'Bafoussam';
const NOMINATIM_HEADERS = { 'Accept-Language': 'fr', 'User-Agent': 'RestaurantDeliveryApp/1.0' };

// Géocodage inverse Nominatim → { address, city }
async function reverseGeocode(latitude, longitude) {
  const fallback = `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`;
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`,
      { headers: NOMINATIM_HEADERS }
    );
    const data = await res.json();
    const a = data.address || {};
    return {
      address: data.display_name || fallback,
      city: a.city || a.town || a.village || a.county || '',
    };
  } catch {
    return { address: fallback, city: '' };
  }
}

export default function AddAddressScreen({ route, navigation }) {
  const insets = useSafeAreaInsets();
  const { onSave, address: editing } = route.params || {};
  const isEdit = !!editing?.id;
  const { location, selectSavedAddress } = useDeliveryLocation();

  const initialLabel = editing?.label || 'Maison';
  const isPreset = LABELS.some(l => l.key === initialLabel);

  const [label,       setLabel]       = useState(isPreset ? initialLabel : 'Autre');
  const [customLabel, setCustomLabel] = useState(isPreset ? '' : initialLabel);
  const [addressText, setAddressText] = useState(editing?.address || '');
  const [details,     setDetails]     = useState(editing?.address_details || '');
  const [city,        setCity]        = useState(editing?.city || DEFAULT_CITY);
  const [phone,       setPhone]       = useState(editing?.phone || '');
  const [isDefault,   setIsDefault]   = useState(!!editing?.is_default);
  const [coords,      setCoords]      = useState(
    editing?.latitude && editing?.longitude
      ? { latitude: Number(editing.latitude), longitude: Number(editing.longitude) }
      : null
  );
  const [loading,     setLoading]     = useState(false);
  const [locating,    setLocating]    = useState(false);
  const [addressError, setAddressError] = useState('');

  // Recherche Nominatim
  const [searchQuery,   setSearchQuery]   = useState('');
  const [searching,     setSearching]     = useState(false);
  const [searchResults, setSearchResults] = useState([]);

  // ─── GPS : Utiliser ma position ─────────────────────────────────────────────
  const handleGPS = useCallback(async () => {
    setLocating(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission refusée', 'Autorisez la localisation dans les paramètres.');
        return;
      }
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      const { latitude, longitude } = loc.coords;
      const geo = await reverseGeocode(latitude, longitude);

      setCoords({ latitude, longitude });
      setAddressText(geo.address);
      if (geo.city) setCity(geo.city);
      setAddressError('');
      setSearchQuery('');
      setSearchResults([]);
    } catch (e) {
      Alert.alert('Erreur', 'Impossible d\'obtenir votre position.');
    } finally {
      setLocating(false);
    }
  }, []);

  // ─── Recherche d'adresse ────────────────────────────────────────────────────
  const handleSearch = useCallback(async () => {
    const q = searchQuery.trim();
    if (!q) return;
    setSearching(true);
    setSearchResults([]);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=5&addressdetails=1&accept-language=fr`,
        { headers: NOMINATIM_HEADERS }
      );
      const data = await res.json();
      setSearchResults(Array.isArray(data) ? data : []);
      if (Array.isArray(data) && data.length === 0) {
        Alert.alert('Aucun résultat', 'Essayez avec un quartier ou un repère proche.');
      }
    } catch (e) {
      Alert.alert('Erreur', 'Impossible de rechercher cette adresse.');
    } finally {
      setSearching(false);
    }
  }, [searchQuery]);

  const selectSearchResult = useCallback((item) => {
    const a = item.address || {};
    setCoords({ latitude: parseFloat(item.lat), longitude: parseFloat(item.lon) });
    setAddressText(item.display_name);
    const c = a.city || a.town || a.village || a.county;
    if (c) setCity(c);
    setAddressError('');
    setSearchQuery('');
    setSearchResults([]);
  }, []);

  // ─── Enregistrement ─────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!addressText.trim()) {
      setAddressError('Indiquez une adresse, utilisez votre position ou la recherche.');
      return;
    }
    const finalLabel = label === 'Autre' ? (customLabel.trim() || 'Autre') : label;
    const payload = {
      label:           finalLabel,
      address:         addressText.trim(),
      address_details: details.trim() || null,
      city:            city.trim() || DEFAULT_CITY,
      latitude:        coords?.latitude  ?? null,
      longitude:       coords?.longitude ?? null,
      is_default:      isDefault,
      phone:           phone.trim() || null,
    };

    setLoading(true);
    try {
      const result = isEdit
        ? await profileService.updateAddress(editing.id, payload)
        : await profileService.addAddress(payload);
      const saved = result?.address || result?.data || result || {};
      const savedAddress = { ...(isEdit ? editing : {}), ...payload, ...(saved?.id ? saved : {}) };

      // Nouvelle adresse → devient l'adresse de livraison active (ouverte aussi depuis « Livrer à »).
      // Adresse modifiée → on rafraîchit l'adresse active si c'est elle.
      if (!isEdit || location?.addressId === editing.id) {
        selectSavedAddress(savedAddress);
      }
      if (onSave) onSave(savedAddress);
      navigation.goBack();
    } catch (e) {
      Alert.alert(
        'Erreur',
        e.response?.data?.message || (isEdit ? 'Impossible de modifier l\'adresse.' : 'Impossible d\'ajouter l\'adresse.')
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen>
      <ScreenHeader
        title={isEdit ? 'Modifier l\'adresse' : 'Nouvelle adresse'}
        onBack={() => navigation.goBack()}
      />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' && !Platform.isPad ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* ── Position actuelle ── */}
          <TouchableOpacity
            style={styles.gpsCard}
            onPress={handleGPS}
            disabled={locating}
            activeOpacity={0.85}
          >
            <View style={styles.gpsIcon}>
              {locating
                ? <ActivityIndicator color={COLORS.white} />
                : <Ionicons name="navigate" size={20} color={COLORS.white} />}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={TYPE.title}>Utiliser ma position</Text>
              <Text style={TYPE.caption}>
                {locating ? 'Localisation en cours…' : 'Remplir automatiquement avec le GPS'}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={COLORS.primary} />
          </TouchableOpacity>

          {/* ── Recherche ── */}
          <Text style={styles.sectionTitle}>Ou rechercher une adresse</Text>
          <Input
            icon="search-outline"
            label="Quartier, rue, repère"
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Ex : Tamdja, Bafoussam"
            onSubmitEditing={handleSearch}
            returnKeyType="search"
            right={(
              <TouchableOpacity style={styles.searchBtn} onPress={handleSearch} disabled={searching}>
                {searching
                  ? <ActivityIndicator size="small" color={COLORS.white} />
                  : <Ionicons name="arrow-forward" size={18} color={COLORS.white} />}
              </TouchableOpacity>
            )}
          />
          {searchResults.length > 0 ? (
            <Card padded={false} style={styles.results}>
              {searchResults.map((item, i) => (
                <React.Fragment key={item.place_id || i}>
                  {i > 0 ? <Divider style={{ marginLeft: 48 }} /> : null}
                  <TouchableOpacity style={styles.resultItem} onPress={() => selectSearchResult(item)}>
                    <Ionicons name="location-outline" size={18} color={COLORS.primary} />
                    <Text style={styles.resultText} numberOfLines={2}>{item.display_name}</Text>
                  </TouchableOpacity>
                </React.Fragment>
              ))}
            </Card>
          ) : null}

          {/* ── Type d'adresse ── */}
          <Text style={styles.sectionTitle}>Type d'adresse</Text>
          <View style={styles.chips}>
            {LABELS.map(l => (
              <Chip
                key={l.key}
                label={l.key}
                icon={l.icon}
                active={label === l.key}
                onPress={() => setLabel(l.key)}
              />
            ))}
          </View>
          {label === 'Autre' ? (
            <Input
              icon="pricetag-outline"
              label="Nom de l'adresse"
              value={customLabel}
              onChangeText={setCustomLabel}
              placeholder="Ex : Chez maman, Université…"
              style={{ marginTop: 12 }}
            />
          ) : null}

          {/* ── Détails ── */}
          <Text style={styles.sectionTitle}>Détails de livraison</Text>
          <View style={styles.form}>
            <View>
              <Input
                icon="location-outline"
                label="Adresse *"
                value={addressText}
                onChangeText={(v) => { setAddressText(v); if (addressError) setAddressError(''); }}
                placeholder="Quartier, rue…"
                multiline
                error={addressError}
              />
              {coords ? (
                <Badge
                  label="Position GPS enregistrée"
                  icon="checkmark-circle"
                  color={COLORS.success}
                  bg={COLORS.successSoft}
                  style={{ marginTop: 8, marginLeft: 4 }}
                />
              ) : null}
            </View>
            <Input
              icon="business-outline"
              label="Complément (facultatif)"
              value={details}
              onChangeText={setDetails}
              placeholder="Porte, étage, repère proche…"
            />
            <Input
              icon="map-outline"
              label="Ville"
              value={city}
              onChangeText={setCity}
              placeholder={DEFAULT_CITY}
            />
            <Input
              icon="call-outline"
              label="Numéro à appeler"
              value={phone}
              onChangeText={setPhone}
              placeholder="+237 6XX XXX XXX"
              keyboardType="phone-pad"
            />
          </View>

          {/* ── Par défaut ── */}
          <Card style={styles.switchCard}>
            <View style={styles.switchIcon}>
              <Ionicons name="star-outline" size={18} color={COLORS.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={TYPE.title}>Adresse par défaut</Text>
              <Text style={TYPE.caption}>Utilisée automatiquement lors des commandes</Text>
            </View>
            <Switch
              value={isDefault}
              onValueChange={setIsDefault}
              trackColor={{ false: COLORS.border, true: COLORS.primary }}
              thumbColor={COLORS.white}
            />
          </Card>
        </ScrollView>

        <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 16) }]}>
          <Button
            title={isEdit ? 'Enregistrer les modifications' : 'Confirmer cette adresse'}
            icon="checkmark"
            onPress={handleSave}
            loading={loading}
          />
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { padding: SCREEN_PADDING, paddingTop: 8, paddingBottom: 32 },

  gpsCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: COLORS.primarySoft, borderRadius: RADIUS.xl,
    borderWidth: 1.5, borderColor: COLORS.primaryLight, padding: 14,
  },
  gpsIcon: {
    width: 44, height: 44, borderRadius: 22, backgroundColor: COLORS.primary,
    alignItems: 'center', justifyContent: 'center', ...SHADOWS.primary,
  },

  sectionTitle: { ...TYPE.label, color: COLORS.textMuted, marginTop: 22, marginBottom: 10, marginLeft: 4 },

  searchBtn: {
    width: 38, height: 38, borderRadius: 19, backgroundColor: COLORS.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  results: { marginTop: 8, paddingVertical: 4, ...SHADOWS.sm },
  resultItem: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 12 },
  resultText: { ...TYPE.body, fontSize: 13, lineHeight: 18, flex: 1 },

  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },

  form: { gap: 12 },

  switchCard: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 20, ...SHADOWS.sm },
  switchIcon: {
    width: 40, height: 40, borderRadius: 12, backgroundColor: COLORS.primarySoft,
    alignItems: 'center', justifyContent: 'center',
  },

  footer: {
    paddingHorizontal: SCREEN_PADDING, paddingTop: 12,
    backgroundColor: COLORS.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24,
    ...SHADOWS.lg,
  },
});
