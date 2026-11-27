import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { useSocialAuth, networkErrorMessage } from '../../hooks/useSocialAuth';
import AuthLayout, { AuthError, OrDivider, SocialButtons } from '../../components/AuthLayout';
import { Input, Button } from '../../components/ui';
import { createThemedStyles, COLORS, FONTS } from '../../theme';

export default function RegisterScreen({ navigation }) {
  const { register } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const goHome = () => navigation.navigate('Main');
  const social = useSocialAuth({ onSuccess: goHome, onError: setErrorMsg });
  const clearError = () => { if (errorMsg) setErrorMsg(''); };

  const handleRegister = async () => {
    setErrorMsg('');
    if (!name.trim() || !email.trim() || !phone.trim() || !password.trim()) {
      setErrorMsg('Veuillez remplir tous les champs.');
      return;
    }
    if (password.length < 6) {
      setErrorMsg('Le mot de passe doit contenir au moins 6 caractères.');
      return;
    }
    setLoading(true);
    try {
      await register(name.trim(), email.trim(), phone.trim(), password);
      goHome();
    } catch (error) {
      setErrorMsg(networkErrorMessage(error, 'Une erreur est survenue.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      compactHero
      title="Créer un compte"
      subtitle="Rejoignez Estuaire Eat et faites-vous livrer vos plats préférés."
      onBack={() => navigation.goBack()}
      footer={(
        <View style={styles.footer}>
          <Text style={styles.footerText}>Déjà un compte ?</Text>
          <TouchableOpacity onPress={() => navigation.navigate('Login')} style={styles.footerLinkRow} hitSlop={8}>
            <Text style={styles.footerLink}>Se connecter</Text>
            <Ionicons name="chevron-forward" size={15} color={COLORS.primary} />
          </TouchableOpacity>
        </View>
      )}
    >
      <AuthError message={errorMsg} />

      <View style={{ gap: 14, marginBottom: 22 }}>
        <Input
          icon="person-outline"
          label="Nom complet"
          value={name}
          onChangeText={(t) => { setName(t); clearError(); }}
          placeholder="Jean Dupont"
          autoCapitalize="words"
          autoCorrect={false}
          textContentType="name"
          autoComplete="name"
        />
        <Input
          icon="mail-outline"
          label="Adresse e-mail"
          value={email}
          onChangeText={(t) => { setEmail(t); clearError(); }}
          placeholder="exemple@domaine.com"
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          textContentType="emailAddress"
          autoComplete="email"
        />
        <Input
          icon="call-outline"
          label="Téléphone"
          value={phone}
          onChangeText={(t) => { setPhone(t); clearError(); }}
          placeholder="+237 6XX XXX XXX"
          keyboardType="phone-pad"
          textContentType="telephoneNumber"
          autoComplete="tel"
        />
        <Input
          icon="lock-closed-outline"
          label="Mot de passe"
          value={password}
          onChangeText={(t) => { setPassword(t); clearError(); }}
          placeholder="Minimum 6 caractères"
          secureTextEntry={!showPass}
          autoCapitalize="none"
          autoCorrect={false}
          textContentType="newPassword"
          autoComplete="new-password"
          onSubmitEditing={handleRegister}
          right={(
            <TouchableOpacity onPress={() => setShowPass(!showPass)} hitSlop={10} style={{ padding: 4 }}>
              <Ionicons name={showPass ? 'eye-outline' : 'eye-off-outline'} size={20} color={COLORS.text} />
            </TouchableOpacity>
          )}
        />
      </View>

      <Button title="Créer mon compte" iconRight="arrow-forward" onPress={handleRegister} loading={loading} />

      <OrDivider />
      <SocialButtons social={social} />
    </AuthLayout>
  );
}

const styles = createThemedStyles({
  footer: { alignItems: 'center', marginTop: 28, gap: 4 },
  footerText: { fontFamily: FONTS.regular, fontSize: 13, color: COLORS.textMuted },
  footerLinkRow: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  footerLink: { fontFamily: FONTS.semibold, fontSize: 15, color: COLORS.primary },
});
