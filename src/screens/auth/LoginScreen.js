import React, { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { useSocialAuth, networkErrorMessage } from '../../hooks/useSocialAuth';
import AuthLayout, { AuthError, OrDivider, SocialButtons } from '../../components/AuthLayout';
import { Input, Button } from '../../components/ui';
import { COLORS, FONTS } from '../../theme';

const LAST_EMAIL_KEY = '@last_login_email';

export default function LoginScreen({ navigation }) {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Pré-remplit l'email de la dernière connexion (la session elle-même reste
  // enregistrée : l'utilisateur n'a pas à se reconnecter à chaque ouverture)
  useEffect(() => {
    AsyncStorage.getItem(LAST_EMAIL_KEY).then((v) => { if (v) setEmail(v); }).catch(() => {});
  }, []);

  const goHome = () => navigation.navigate('Main');
  const social = useSocialAuth({ onSuccess: goHome, onError: setErrorMsg });

  const handleLogin = async () => {
    setErrorMsg('');
    if (!email.trim() || !password.trim()) {
      setErrorMsg('Veuillez remplir tous les champs.');
      return;
    }
    setLoading(true);
    try {
      await login(email.trim(), password);
      AsyncStorage.setItem(LAST_EMAIL_KEY, email.trim()).catch(() => {});
      goHome();
    } catch (error) {
      setErrorMsg(networkErrorMessage(error, 'Email ou mot de passe incorrect.'));
    } finally {
      setLoading(false);
    }
  };

  const forgotPassword = () => navigation.navigate('ForgotPassword', { email: email.trim() });

  return (
    <AuthLayout
      title="Bon retour !"
      titleIcon="hand-left"
      subtitle="Connectez-vous pour retrouver vos restaurants préférés et commander vos plats facilement."
      onBack={navigation.canGoBack() ? () => navigation.goBack() : undefined}
      footer={(
        <View style={styles.footer}>
          <Text style={styles.footerText}>Pas encore de compte ?</Text>
          <TouchableOpacity onPress={() => navigation.navigate('Register')} style={styles.footerLinkRow} hitSlop={8}>
            <Text style={styles.footerLink}>S'inscrire</Text>
            <Ionicons name="chevron-forward" size={15} color={COLORS.primary} />
          </TouchableOpacity>
          {/* Les visiteurs peuvent parcourir les restaurants et remplir leur panier sans compte */}
          <TouchableOpacity onPress={goHome} style={styles.guest} hitSlop={8}>
            <Text style={styles.guestText}>Continuer sans compte</Text>
          </TouchableOpacity>
        </View>
      )}
    >
      <AuthError message={errorMsg} />

      <View style={{ gap: 14 }}>
        <Input
          icon="mail-outline"
          label="Adresse e-mail"
          value={email}
          onChangeText={(t) => { setEmail(t); setErrorMsg(''); }}
          placeholder="exemple@domaine.com"
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          textContentType="emailAddress"
          autoComplete="email"
        />
        <Input
          icon="lock-closed-outline"
          label="Mot de passe"
          value={password}
          onChangeText={(t) => { setPassword(t); setErrorMsg(''); }}
          placeholder="Entrez votre mot de passe"
          secureTextEntry={!showPass}
          textContentType="password"
          autoComplete="password"
          onSubmitEditing={handleLogin}
          right={(
            <TouchableOpacity onPress={() => setShowPass(!showPass)} hitSlop={10} style={{ padding: 4 }}>
              <Ionicons name={showPass ? 'eye-outline' : 'eye-off-outline'} size={20} color={COLORS.text} />
            </TouchableOpacity>
          )}
        />
      </View>

      <TouchableOpacity style={styles.forgot} onPress={forgotPassword} hitSlop={8}>
        <Text style={styles.forgotText}>Mot de passe oublié ?</Text>
        <Ionicons name="chevron-forward" size={13} color={COLORS.primary} />
      </TouchableOpacity>

      <Button title="Se connecter" iconRight="arrow-forward" onPress={handleLogin} loading={loading} />

      <OrDivider />
      <SocialButtons social={social} />
    </AuthLayout>
  );
}

const styles = StyleSheet.create({
  forgot: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-end', gap: 2, marginTop: 12, marginBottom: 20 },
  forgotText: { fontFamily: FONTS.medium, fontSize: 13, color: COLORS.primary },
  footer: { alignItems: 'center', marginTop: 28, gap: 4 },
  footerText: { fontFamily: FONTS.regular, fontSize: 13, color: COLORS.textMuted },
  footerLinkRow: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  footerLink: { fontFamily: FONTS.semibold, fontSize: 15, color: COLORS.primary },
  guest: { marginTop: 14, paddingVertical: 4 },
  guestText: { fontFamily: FONTS.medium, fontSize: 13, color: COLORS.textMuted, textDecorationLine: 'underline' },
});
