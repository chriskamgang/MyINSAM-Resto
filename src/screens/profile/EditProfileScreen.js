import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  SafeAreaView, ScrollView, Alert, ActivityIndicator,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { profileService } from '../../services/profileService';

const COLORS = { primary: '#FF6B35', bg: '#f8f8f8', card: '#fff', text: '#1a1a1a', gray: '#888' };

export default function EditProfileScreen({ navigation }) {
  const { user, updateUser } = useAuth();
  const [name,    setName]    = useState(user?.name    || '');
  const [phone,   setPhone]   = useState(user?.phone   || '');
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Erreur', 'Le nom est obligatoire.');
      return;
    }
    setLoading(true);
    try {
      const updated = await profileService.updateProfile({ name: name.trim(), phone: phone.trim() });
      updateUser(updated);
      Alert.alert('Succès', 'Profil mis à jour !', [{ text: 'OK', onPress: () => navigation.goBack() }]);
    } catch (e) {
      Alert.alert('Erreur', e.response?.data?.message || 'Impossible de mettre à jour le profil.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <SafeAreaView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Text style={styles.backText}>←</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Modifier le profil</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView contentContainerStyle={{ padding: 20 }} keyboardShouldPersistTaps="handled">
          {/* Avatar */}
          <View style={styles.avatarSection}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{name.charAt(0)?.toUpperCase() || '?'}</Text>
            </View>
          </View>

          {/* Champs */}
          <View style={styles.form}>
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Nom complet *</Text>
              <TextInput
                style={styles.input}
                value={name}
                onChangeText={setName}
                placeholder="Votre nom"
                autoCapitalize="words"
                placeholderTextColor="#aaa"
              />
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Email</Text>
              <TextInput
                style={[styles.input, styles.inputDisabled]}
                value={user?.email || ''}
                editable={false}
                placeholderTextColor="#aaa"
              />
              <Text style={styles.fieldHint}>L'email ne peut pas être modifié</Text>
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Téléphone</Text>
              <TextInput
                style={styles.input}
                value={phone}
                onChangeText={setPhone}
                placeholder="+237 6XX XXX XXX"
                keyboardType="phone-pad"
                placeholderTextColor="#aaa"
              />
            </View>
          </View>

          <TouchableOpacity
            style={[styles.saveBtn, loading && { opacity: 0.7 }]}
            onPress={handleSave}
            disabled={loading}
          >
            {loading
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.saveBtnText}>Enregistrer</Text>
            }
          </TouchableOpacity>
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

  avatarSection: { alignItems: 'center', marginBottom: 28 },
  avatar:     { width: 80, height: 80, borderRadius: 40, backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center' },
  avatarText: { fontSize: 36, fontWeight: 'bold', color: '#fff' },

  form:       { gap: 16, marginBottom: 28 },
  fieldGroup: { gap: 6 },
  label:      { fontSize: 14, fontWeight: '600', color: COLORS.text },
  input: {
    backgroundColor: COLORS.card, borderWidth: 1.5, borderColor: '#e0e0e0',
    borderRadius: 14, paddingHorizontal: 16, paddingVertical: 14,
    fontSize: 15, color: COLORS.text,
  },
  inputDisabled: { backgroundColor: '#f5f5f5', color: COLORS.gray },
  fieldHint: { fontSize: 12, color: COLORS.gray },

  saveBtn: {
    backgroundColor: COLORS.primary, borderRadius: 16, paddingVertical: 16, alignItems: 'center',
    shadowColor: COLORS.primary, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 8, elevation: 6,
  },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
});
