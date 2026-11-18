import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Alert, KeyboardAvoidingView, Platform, TouchableOpacity, ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { profileService } from '../../services/profileService';
import { useAvatarUpload } from '../../hooks/useAvatarUpload';
import { Screen, ScreenHeader, Input, Button, SmartImage } from '../../components/ui';
import { COLORS, FONTS, TYPE, SHADOWS, SCREEN_PADDING } from '../../theme';

export default function EditProfileScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { user, updateUser } = useAuth();
  const [name,    setName]    = useState(user?.name    || '');
  const [phone,   setPhone]   = useState(user?.phone   || '');
  const [loading, setLoading] = useState(false);
  const [nameError, setNameError] = useState('');

  const avatarUri = user?.avatar_url || user?.avatar || user?.photo || null;
  const { chooseAvatar, uploading, preview } = useAvatarUpload();
  const initial = name.trim().charAt(0).toUpperCase() || '?';

  const handleSave = async () => {
    if (!name.trim()) {
      setNameError('Le nom est obligatoire.');
      return;
    }
    setNameError('');
    setLoading(true);
    try {
      const result = await profileService.updateProfile({ name: name.trim(), phone: phone.trim() });
      // On fusionne : si l'API ne renvoie qu'une partie du profil, on ne perd pas le reste (rôle, email…)
      updateUser({ ...user, ...(result?.user || result || {}) });
      Alert.alert('Succès', 'Profil mis à jour !', [{ text: 'OK', onPress: () => navigation.goBack() }]);
    } catch (e) {
      Alert.alert('Erreur', e.response?.data?.message || 'Impossible de mettre à jour le profil.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen>
      <ScreenHeader title="Modifier le profil" onBack={() => navigation.goBack()} />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' && !Platform.isPad ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Avatar */}
          <View style={styles.avatarSection}>
            <TouchableOpacity style={styles.avatarRing} onPress={chooseAvatar} disabled={uploading} activeOpacity={0.85}>
              {preview ? (
                <SmartImage source={{ uri: preview }} style={styles.avatar} />
              ) : avatarUri ? (
                <SmartImage uri={avatarUri} style={styles.avatar} fallbackIcon="person" iconSize={36} />
              ) : (
                <View style={[styles.avatar, styles.avatarFallback]}>
                  <Text style={styles.avatarText}>{initial}</Text>
                </View>
              )}
              {uploading ? (
                <View style={styles.avatarOverlay}><ActivityIndicator color={COLORS.white} /></View>
              ) : null}
              <View style={styles.cameraBadge}>
                <Ionicons name="camera" size={15} color={COLORS.white} />
              </View>
            </TouchableOpacity>
            <Text style={styles.changePhoto} onPress={chooseAvatar}>{uploading ? 'Envoi en cours…' : 'Changer la photo'}</Text>
            <Text style={styles.avatarName} numberOfLines={1}>{name.trim() || 'Votre nom'}</Text>
            {user?.email ? <Text style={TYPE.caption}>{user.email}</Text> : null}
          </View>

          <View style={styles.form}>
            <Input
              icon="person-outline"
              label="Nom complet *"
              value={name}
              onChangeText={(v) => { setName(v); if (nameError) setNameError(''); }}
              placeholder="Votre nom"
              autoCapitalize="words"
              error={nameError}
            />

            <View>
              <Input
                icon="mail-outline"
                label="Email"
                value={user?.email || ''}
                editable={false}
                inputStyle={{ color: COLORS.textMuted }}
                right={<Ionicons name="lock-closed-outline" size={16} color={COLORS.textLight} />}
              />
              <Text style={styles.hint}>L'email ne peut pas être modifié</Text>
            </View>

            <Input
              icon="call-outline"
              label="Téléphone"
              value={phone}
              onChangeText={setPhone}
              placeholder="+237 6XX XXX XXX"
              keyboardType="phone-pad"
            />
          </View>
        </ScrollView>

        {/* Bouton d'enregistrement collant */}
        <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 16) }]}>
          <Button title="Enregistrer" icon="checkmark" onPress={handleSave} loading={loading} />
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { padding: SCREEN_PADDING, paddingBottom: 32 },

  avatarSection: { alignItems: 'center', marginBottom: 28, marginTop: 4 },
  avatarRing: {
    width: 104, height: 104, borderRadius: 52, padding: 4,
    borderWidth: 3, borderColor: COLORS.primary, marginBottom: 12,
  },
  avatar: { width: '100%', height: '100%', borderRadius: 46 },
  avatarFallback: { backgroundColor: COLORS.primarySoft, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontFamily: FONTS.bold, fontSize: 38, color: COLORS.primary },
  avatarName: { ...TYPE.h3 },
  avatarOverlay: {
    ...StyleSheet.absoluteFillObject, borderRadius: 52, backgroundColor: 'rgba(0,0,0,0.35)',
    alignItems: 'center', justifyContent: 'center',
  },
  cameraBadge: {
    position: 'absolute', right: -2, bottom: -2, width: 32, height: 32, borderRadius: 16,
    backgroundColor: COLORS.primary, borderWidth: 3, borderColor: COLORS.surface,
    alignItems: 'center', justifyContent: 'center',
  },
  changePhoto: { fontFamily: FONTS.semibold, fontSize: 13, color: COLORS.primary, marginTop: -4, marginBottom: 8 },

  form: { gap: 14 },
  hint: { ...TYPE.caption, color: COLORS.textLight, marginTop: 4, marginLeft: 6 },

  footer: {
    paddingHorizontal: SCREEN_PADDING, paddingTop: 12,
    backgroundColor: COLORS.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24,
    ...SHADOWS.lg,
  },
});
