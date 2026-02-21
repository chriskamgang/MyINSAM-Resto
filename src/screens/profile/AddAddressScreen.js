import React, { useState, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  SafeAreaView, ScrollView, Alert, ActivityIndicator,
  KeyboardAvoidingView, Platform, Switch, FlatList,
  Dimensions,
} from 'react-native';
import MapView, { Marker, UrlTile } from 'react-native-maps';
import * as Location from 'expo-location';
import { profileService } from '../../services/profileService';

const COLORS = { primary: '#FF6B35', bg: '#f8f8f8', card: '#fff', text: '#1a1a1a', gray: '#888' };
const LABELS = ['Maison', 'Bureau', 'Autre'];
const { width } = Dimensions.get('window');

const DEFAULT_REGION = {
  latitude: 5.4647,
  longitude: 10.4244,
  latitudeDelta: 0.02,
  longitudeDelta: 0.02,
};

export default function AddAddressScreen({ route, navigation }) {
  const { onSave } = route.params || {};

  const [label,       setLabel]       = useState('Maison');
  const [phone,       setPhone]       = useState('');
  const [isDefault,   setIsDefault]   = useState(false);
  const [loading,     setLoading]     = useState(false);

  // Map state
  const [region,      setRegion]      = useState(DEFAULT_REGION);
  const [markerCoord, setMarkerCoord] = useState(null);
  const [addressText, setAddressText] = useState('');

  // GPS state
  const [locating,    setLocating]    = useState(false);

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searching,   setSearching]   = useState(false);
  const [searchResults, setSearchResults] = useState([]);

  const mapRef = useRef(null);

  // ─── GPS: Me livrer ici ──────────────────────────────────────────────────────
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

      // Reverse geocoding via Nominatim
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`,
        { headers: { 'Accept-Language': 'fr', 'User-Agent': 'RestaurantDeliveryApp/1.0' } }
      );
      const data = await res.json();
      const addr = data.display_name || `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`;

      setMarkerCoord({ latitude, longitude });
      setAddressText(addr);
      setSearchQuery('');
      setSearchResults([]);

      const newRegion = { latitude, longitude, latitudeDelta: 0.005, longitudeDelta: 0.005 };
      setRegion(newRegion);
      mapRef.current?.animateToRegion(newRegion, 800);
    } catch (e) {
      Alert.alert('Erreur', 'Impossible d\'obtenir votre position.');
    } finally {
      setLocating(false);
    }
  }, []);

  // ─── Search: Nominatim forward geocoding ────────────────────────────────────
  const handleSearch = useCallback(async () => {
    const q = searchQuery.trim();
    if (!q) return;
    setSearching(true);
    setSearchResults([]);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=5&accept-language=fr`,
        { headers: { 'User-Agent': 'RestaurantDeliveryApp/1.0' } }
      );
      const data = await res.json();
      setSearchResults(data);
    } catch (e) {
      Alert.alert('Erreur', 'Impossible de rechercher cette adresse.');
    } finally {
      setSearching(false);
    }
  }, [searchQuery]);

  const selectSearchResult = useCallback((item) => {
    const latitude  = parseFloat(item.lat);
    const longitude = parseFloat(item.lon);

    setMarkerCoord({ latitude, longitude });
    setAddressText(item.display_name);
    setSearchQuery('');
    setSearchResults([]);

    const newRegion = { latitude, longitude, latitudeDelta: 0.01, longitudeDelta: 0.01 };
    setRegion(newRegion);
    mapRef.current?.animateToRegion(newRegion, 800);
  }, []);

  // ─── Map: tap or drag marker ─────────────────────────────────────────────────
  const handleMapPress = useCallback(async (e) => {
    const { latitude, longitude } = e.nativeEvent.coordinate;
    setMarkerCoord({ latitude, longitude });

    // Reverse geocode
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`,
        { headers: { 'Accept-Language': 'fr', 'User-Agent': 'RestaurantDeliveryApp/1.0' } }
      );
      const data = await res.json();
      setAddressText(data.display_name || `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`);
    } catch {
      setAddressText(`${latitude.toFixed(5)}, ${longitude.toFixed(5)}`);
    }
  }, []);

  const handleMarkerDrag = useCallback(async (e) => {
    const { latitude, longitude } = e.nativeEvent.coordinate;
    setMarkerCoord({ latitude, longitude });

    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`,
        { headers: { 'Accept-Language': 'fr', 'User-Agent': 'RestaurantDeliveryApp/1.0' } }
      );
      const data = await res.json();
      setAddressText(data.display_name || `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`);
    } catch {
      setAddressText(`${latitude.toFixed(5)}, ${longitude.toFixed(5)}`);
    }
  }, []);

  // ─── Save ────────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!addressText.trim()) {
      Alert.alert('Adresse manquante', 'Sélectionnez une adresse sur la carte ou via la recherche.');
      return;
    }
    setLoading(true);
    try {
      await profileService.addAddress({
        label,
        address: addressText.trim(),
        latitude:   markerCoord?.latitude  ?? null,
        longitude:  markerCoord?.longitude ?? null,
        is_default: isDefault,
        phone:      phone.trim() || null,
      });
      if (onSave) onSave();
      navigation.goBack();
    } catch (e) {
      Alert.alert('Erreur', e.response?.data?.message || 'Impossible d\'ajouter l\'adresse.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <SafeAreaView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Text style={styles.backText}>←</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Nouvelle adresse</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView
          contentContainerStyle={{ paddingBottom: 40 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* ── MAP ── */}
          <View style={styles.mapContainer}>
            <MapView
              ref={mapRef}
              style={styles.map}
              initialRegion={DEFAULT_REGION}
              onPress={handleMapPress}
            >
              <UrlTile
                urlTemplate="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
                maximumZ={19}
                flipY={false}
              />
              {markerCoord && (
                <Marker
                  coordinate={markerCoord}
                  draggable
                  onDragEnd={handleMarkerDrag}
                  pinColor={COLORS.primary}
                />
              )}
            </MapView>

            {/* GPS button overlay */}
            <TouchableOpacity style={styles.gpsBtn} onPress={handleGPS} disabled={locating}>
              {locating
                ? <ActivityIndicator size="small" color="#fff" />
                : <Text style={styles.gpsBtnText}>📍 Me livrer ici</Text>
              }
            </TouchableOpacity>
          </View>

          {/* ── SEARCH ── */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>🔍 Chercher une adresse</Text>
            <View style={styles.searchRow}>
              <TextInput
                style={styles.searchInput}
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder="Ex: Tamdja, Bafoussam"
                placeholderTextColor="#aaa"
                onSubmitEditing={handleSearch}
                returnKeyType="search"
              />
              <TouchableOpacity style={styles.searchBtn} onPress={handleSearch} disabled={searching}>
                {searching
                  ? <ActivityIndicator size="small" color="#fff" />
                  : <Text style={styles.searchBtnText}>OK</Text>
                }
              </TouchableOpacity>
            </View>

            {searchResults.length > 0 && (
              <View style={styles.resultsList}>
                {searchResults.map((item) => (
                  <TouchableOpacity
                    key={item.place_id}
                    style={styles.resultItem}
                    onPress={() => selectSearchResult(item)}
                  >
                    <Text style={styles.resultText} numberOfLines={2}>{item.display_name}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>

          {/* ── ADDRESS PREVIEW ── */}
          {addressText ? (
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>📍 Adresse sélectionnée</Text>
              <View style={styles.addressPreview}>
                <Text style={styles.addressPreviewText}>{addressText}</Text>
              </View>
            </View>
          ) : (
            <View style={styles.section}>
              <View style={styles.hintBox}>
                <Text style={styles.hintText}>
                  Touchez la carte pour placer un marqueur, ou utilisez le GPS / la recherche
                </Text>
              </View>
            </View>
          )}

          {/* ── LABEL ── */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Type d'adresse</Text>
            <View style={styles.labelRow}>
              {LABELS.map(l => (
                <TouchableOpacity
                  key={l}
                  style={[styles.labelChip, label === l && styles.labelChipActive]}
                  onPress={() => setLabel(l)}
                >
                  <Text style={[styles.labelChipText, label === l && styles.labelChipTextActive]}>{l}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* ── PHONE ── */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>📞 Numéro à appeler</Text>
            <TextInput
              style={styles.input}
              value={phone}
              onChangeText={setPhone}
              placeholder="Ex: +237 6XX XXX XXX"
              placeholderTextColor="#aaa"
              keyboardType="phone-pad"
            />
          </View>

          {/* ── DEFAULT ── */}
          <View style={[styles.section, styles.switchRow]}>
            <View>
              <Text style={styles.switchLabel}>Adresse par défaut</Text>
              <Text style={styles.switchDesc}>Utilisée automatiquement lors des commandes</Text>
            </View>
            <Switch
              value={isDefault}
              onValueChange={setIsDefault}
              trackColor={{ false: '#e0e0e0', true: COLORS.primary }}
              thumbColor="#fff"
            />
          </View>

          {/* ── SAVE ── */}
          <View style={styles.section}>
            <TouchableOpacity
              style={[styles.saveBtn, loading && { opacity: 0.7 }]}
              onPress={handleSave}
              disabled={loading}
            >
              {loading
                ? <ActivityIndicator color="#fff" />
                : <Text style={styles.saveBtnText}>Confirmer cette adresse</Text>
              }
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container:   { flex: 1, backgroundColor: COLORS.bg },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12,
    backgroundColor: COLORS.card, borderBottomWidth: 1, borderBottomColor: '#f0f0f0',
  },
  backBtn:     { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  backText:    { fontSize: 24, color: COLORS.text },
  headerTitle: { fontSize: 17, fontWeight: 'bold', color: COLORS.text },

  // Map
  mapContainer: { height: 260, position: 'relative' },
  map:          { flex: 1 },
  gpsBtn: {
    position: 'absolute', bottom: 12, left: 12,
    backgroundColor: COLORS.primary, borderRadius: 24,
    paddingHorizontal: 16, paddingVertical: 10,
    flexDirection: 'row', alignItems: 'center',
    shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 6, elevation: 4,
  },
  gpsBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },

  // Sections
  section: { paddingHorizontal: 16, marginTop: 16 },
  sectionLabel: { fontSize: 14, fontWeight: '600', color: COLORS.text, marginBottom: 8 },

  // Search
  searchRow:   { flexDirection: 'row', gap: 8 },
  searchInput: {
    flex: 1, backgroundColor: COLORS.card, borderWidth: 1.5, borderColor: '#e0e0e0',
    borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 14, color: COLORS.text,
  },
  searchBtn: {
    backgroundColor: COLORS.primary, borderRadius: 12,
    paddingHorizontal: 18, justifyContent: 'center', alignItems: 'center',
  },
  searchBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 14 },

  resultsList: {
    backgroundColor: COLORS.card, borderRadius: 12, marginTop: 6,
    borderWidth: 1, borderColor: '#e0e0e0', overflow: 'hidden',
  },
  resultItem: {
    padding: 12, borderBottomWidth: 1, borderBottomColor: '#f0f0f0',
  },
  resultText: { fontSize: 13, color: COLORS.text, lineHeight: 18 },

  // Address preview
  addressPreview: {
    backgroundColor: COLORS.card, borderRadius: 12, padding: 14,
    borderWidth: 1.5, borderColor: COLORS.primary,
  },
  addressPreviewText: { fontSize: 13, color: COLORS.text, lineHeight: 18 },

  hintBox: {
    backgroundColor: '#FFF3E0', borderRadius: 12, padding: 14,
    borderWidth: 1, borderColor: '#FFD7B8',
  },
  hintText: { fontSize: 13, color: '#b45309', lineHeight: 18, textAlign: 'center' },

  // Label chips
  labelRow:           { flexDirection: 'row', gap: 10 },
  labelChip:          { paddingHorizontal: 18, paddingVertical: 9, borderRadius: 20, borderWidth: 1.5, borderColor: '#e0e0e0', backgroundColor: COLORS.card },
  labelChipActive:    { borderColor: COLORS.primary, backgroundColor: '#FFF3E0' },
  labelChipText:      { fontSize: 14, color: COLORS.gray, fontWeight: '600' },
  labelChipTextActive:{ color: COLORS.primary },

  // Phone input
  input: {
    backgroundColor: COLORS.card, borderWidth: 1.5, borderColor: '#e0e0e0',
    borderRadius: 14, paddingHorizontal: 16, paddingVertical: 14,
    fontSize: 15, color: COLORS.text,
  },

  // Switch
  switchRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: COLORS.card, borderRadius: 14, padding: 16,
  },
  switchLabel: { fontSize: 15, fontWeight: '600', color: COLORS.text },
  switchDesc:  { fontSize: 12, color: COLORS.gray, marginTop: 2, maxWidth: 220 },

  // Save button
  saveBtn: {
    backgroundColor: COLORS.primary, borderRadius: 16, paddingVertical: 16,
    alignItems: 'center',
    shadowColor: COLORS.primary, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 8, elevation: 6,
  },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
});
