import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  SafeAreaView, ScrollView, Alert, ActivityIndicator,
  KeyboardAvoidingView, Platform, Switch,
} from 'react-native';
import { profileService } from '../../services/profileService';

const COLORS = { primary: '#FF6B35', bg: '#f8f8f8', card: '#fff', text: '#1a1a1a', gray: '#888' };
const LABELS = ['Maison', 'Bureau', 'Autre'];

export default function AddAddressScreen({ route, navigation }) {
  const { onSave } = route.params || {};

  const [label, setLabel] = useState('Maison');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [isDefault, setIsDefault] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    if (!address.trim()) {
      Alert.alert('Adresse manquante', 'Veuillez saisir une adresse.');
      return;
    }

    setLoading(true);
    try {
      await profileService.addAddress({
        label,
        address: address.trim(),
        latitude: null,
        longitude: null,
        is_default: isDefault,
        phone: phone.trim() || null,
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
          {/* Info */}
          <View style={styles.section}>
            <View style={styles.infoBox}>
              <Text style={styles.infoText}>
                📍 Saisissez votre adresse de livraison complète
              </Text>
            </View>
          </View>

          {/* Adresse */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>📍 Adresse complète</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={address}
              onChangeText={setAddress}
              placeholder="Ex: Quartier Tamdja, Rue principale, Bafoussam"
              placeholderTextColor="#aaa"
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
          </View>

          {/* Label */}
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

          {/* Phone */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>📞 Numéro à appeler (optionnel)</Text>
            <TextInput
              style={styles.input}
              value={phone}
              onChangeText={setPhone}
              placeholder="Ex: +237 6XX XXX XXX"
              placeholderTextColor="#aaa"
              keyboardType="phone-pad"
            />
          </View>

          {/* Default */}
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

          {/* Save */}
          <View style={styles.section}>
            <TouchableOpacity
              style={[styles.saveBtn, loading && { opacity: 0.7 }]}
              onPress={handleSave}
              disabled={loading}
            >
              {loading
                ? <ActivityIndicator color="#fff" />
                : <Text style={styles.saveBtnText}>Enregistrer l'adresse</Text>
              }
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12,
    backgroundColor: COLORS.card, borderBottomWidth: 1, borderBottomColor: '#f0f0f0',
  },
  backBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  backText: { fontSize: 24, color: COLORS.text },
  headerTitle: { fontSize: 17, fontWeight: 'bold', color: COLORS.text },

  section: { paddingHorizontal: 16, marginTop: 16 },
  sectionLabel: { fontSize: 14, fontWeight: '600', color: COLORS.text, marginBottom: 8 },

  infoBox: {
    backgroundColor: '#E3F2FD', borderRadius: 12, padding: 14,
    borderWidth: 1, borderColor: '#90CAF9',
  },
  infoText: { fontSize: 13, color: '#1565C0', lineHeight: 18, textAlign: 'center' },

  input: {
    backgroundColor: COLORS.card, borderWidth: 1.5, borderColor: '#e0e0e0',
    borderRadius: 14, paddingHorizontal: 16, paddingVertical: 14,
    fontSize: 15, color: COLORS.text,
  },
  textArea: {
    minHeight: 80,
    paddingTop: 14,
  },

  labelRow: { flexDirection: 'row', gap: 10 },
  labelChip: {
    paddingHorizontal: 18, paddingVertical: 9, borderRadius: 20,
    borderWidth: 1.5, borderColor: '#e0e0e0', backgroundColor: COLORS.card
  },
  labelChipActive: { borderColor: COLORS.primary, backgroundColor: '#FFF3E0' },
  labelChipText: { fontSize: 14, color: COLORS.gray, fontWeight: '600' },
  labelChipTextActive: { color: COLORS.primary },

  switchRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: COLORS.card, borderRadius: 14, padding: 16,
  },
  switchLabel: { fontSize: 15, fontWeight: '600', color: COLORS.text },
  switchDesc: { fontSize: 12, color: COLORS.gray, marginTop: 2, maxWidth: 220 },

  saveBtn: {
    backgroundColor: COLORS.primary, borderRadius: 16, paddingVertical: 16,
    alignItems: 'center',
    shadowColor: COLORS.primary, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 8, elevation: 6,
  },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
});
