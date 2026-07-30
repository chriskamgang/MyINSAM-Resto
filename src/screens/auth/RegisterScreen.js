import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ScrollView,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import * as AppleAuthentication from 'expo-apple-authentication';
import { useAuth } from '../../context/AuthContext';

WebBrowser.maybeCompleteAuthSession();

export default function RegisterScreen({ navigation }) {
  const { register, googleLogin, appleLogin } = useAuth();
  const [name,     setName]     = useState('');
  const [email,    setEmail]    = useState('');
  const [phone,    setPhone]    = useState('');
  const [password, setPassword] = useState('');
  const [loading,  setLoading]  = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [googleLoading, setGoogleLoading] = useState(false);
  const [appleLoading, setAppleLoading] = useState(false);

  const [request, response, promptAsync] = Google.useAuthRequest({
    androidClientId: '1070472586568-3vfffqq2tcc9kbed4vas1okjnvnal5hm.apps.googleusercontent.com',
    iosClientId: '1070472586568-q700duhak98lua5h6ug6kgpve3dkq3rm.apps.googleusercontent.com',
    webClientId: '1070472586568-njjtn28ulh40e32gd5hslhdckd3a20p0.apps.googleusercontent.com',
  });

  React.useEffect(() => {
    if (response?.type === 'success') {
      const { id_token } = response.params;
      handleGoogleLogin(id_token);
    }
  }, [response]);

  const handleGoogleLogin = async (idToken) => {
    setGoogleLoading(true);
    setErrorMsg('');
    try {
      await googleLogin(idToken);
      navigation.navigate('Main');
    } catch (error) {
      const msg = error.response?.data?.message || 'Erreur de connexion avec Google.';
      setErrorMsg(msg);
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleAppleLogin = async () => {
    setAppleLoading(true);
    setErrorMsg('');
    try {
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });
      const fullName = credential.fullName
        ? `${credential.fullName.givenName || ''} ${credential.fullName.familyName || ''}`.trim()
        : null;
      await appleLogin({
        identityToken: credential.identityToken,
        fullName,
        email: credential.email,
      });
      navigation.navigate('Main');
    } catch (error) {
      if (error.code !== 'ERR_REQUEST_CANCELED') {
        const msg = error.response?.data?.message || 'Erreur de connexion avec Apple.';
        setErrorMsg(msg);
      }
    } finally {
      setAppleLoading(false);
    }
  };

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
      navigation.navigate('Main');
    } catch (error) {
      const msg = error.response?.data?.message
        || (error.code === 'ECONNABORTED' ? 'Le serveur met trop de temps à répondre. Vérifiez votre connexion.'
        : error.message?.includes('Network Error') ? 'Impossible de se connecter au serveur. Vérifiez votre connexion internet.'
        : 'Une erreur est survenue.');
      setErrorMsg(msg);
    } finally {
      setLoading(false);
    }
  };

  const clearError = () => { if (errorMsg) setErrorMsg(''); };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' && !Platform.isPad ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Text style={styles.backText}>← Retour</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Créer un compte</Text>
          <Text style={styles.subtitle}>Rejoignez-nous pour commander</Text>
        </View>

        {/* Formulaire */}
        <View style={styles.form}>
          {errorMsg ? (
            <View style={styles.errorBox}>
              <Ionicons name="alert-circle" size={18} color="#DC2626" />
              <Text style={styles.errorText}>{errorMsg}</Text>
            </View>
          ) : null}

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Nom complet</Text>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={(t) => { setName(t); clearError(); }}
              placeholder="Jean Dupont"
              autoCapitalize="words"
              autoCorrect={false}
              textContentType="name"
              autoComplete="name"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={(t) => { setEmail(t); clearError(); }}
              placeholder="vous@exemple.com"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              textContentType="emailAddress"
              autoComplete="email"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Téléphone</Text>
            <TextInput
              style={styles.input}
              value={phone}
              onChangeText={(t) => { setPhone(t); clearError(); }}
              placeholder="+237 6XX XXX XXX"
              keyboardType="phone-pad"
              autoCapitalize="none"
              autoCorrect={false}
              textContentType="telephoneNumber"
              autoComplete="tel"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Mot de passe</Text>
            <TextInput
              style={styles.input}
              value={password}
              onChangeText={(t) => { setPassword(t); clearError(); }}
              placeholder="Minimum 6 caractères"
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
              textContentType="newPassword"
              autoComplete="new-password"
            />
          </View>

          <TouchableOpacity
            style={[styles.btn, loading && styles.btnDisabled]}
            onPress={handleRegister}
            disabled={loading}
            activeOpacity={0.8}
          >
            {loading
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.btnText}>Créer mon compte</Text>
            }
          </TouchableOpacity>
        </View>

        {/* Divider */}
        <View style={styles.divider}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>ou</Text>
          <View style={styles.dividerLine} />
        </View>

        {/* Google Sign-In */}
        <TouchableOpacity
          style={styles.googleBtn}
          onPress={() => promptAsync()}
          disabled={!request || googleLoading}
          activeOpacity={0.8}
        >
          {googleLoading ? (
            <ActivityIndicator color="#333" />
          ) : (
            <>
              <Ionicons name="logo-google" size={20} color="#DB4437" />
              <Text style={styles.googleBtnText}>Continuer avec Google</Text>
            </>
          )}
        </TouchableOpacity>

        {/* Apple Sign-In */}
        {Platform.OS === 'ios' && (
          <TouchableOpacity
            style={styles.appleBtn}
            onPress={handleAppleLogin}
            disabled={appleLoading}
            activeOpacity={0.8}
          >
            {appleLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons name="logo-apple" size={20} color="#fff" />
                <Text style={styles.appleBtnText}>Continuer avec Apple</Text>
              </>
            )}
          </TouchableOpacity>
        )}

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>Déjà un compte ? </Text>
          <TouchableOpacity onPress={() => navigation.navigate('Login')}>
            <Text style={styles.footerLink}>Se connecter</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex:      { flex: 1, backgroundColor: '#fff' },
  container: { flexGrow: 1, padding: 24, paddingTop: 60 },
  header:    { marginBottom: 32 },
  backBtn:   { marginBottom: 24 },
  backText:  { color: '#FF6B35', fontSize: 16, fontWeight: '600' },
  title:     { fontSize: 28, fontWeight: 'bold', color: '#1a1a1a' },
  subtitle:  { fontSize: 15, color: '#888', marginTop: 6 },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 12,
    padding: 12,
  },
  errorText: { flex: 1, fontSize: 14, color: '#DC2626', fontWeight: '500' },
  form:      { gap: 16 },
  inputGroup: { gap: 6 },
  label:      { fontSize: 14, fontWeight: '600', color: '#333' },
  input: {
    borderWidth: 1.5,
    borderColor: '#e0e0e0',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    color: '#1a1a1a',
    backgroundColor: '#fafafa',
  },
  btn: {
    backgroundColor: '#FF6B35',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
    shadowColor: '#FF6B35',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  btnDisabled: { opacity: 0.7 },
  btnText:     { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  footer:      { flexDirection: 'row', justifyContent: 'center', marginTop: 32 },
  footerText:  { color: '#888', fontSize: 15 },
  footerLink:  { color: '#FF6B35', fontSize: 15, fontWeight: 'bold' },
  divider:     { flexDirection: 'row', alignItems: 'center', marginVertical: 20 },
  dividerLine: { flex: 1, height: 1, backgroundColor: '#e0e0e0' },
  dividerText: { marginHorizontal: 16, color: '#888', fontSize: 14 },
  googleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: '#fff',
    borderWidth: 1.5,
    borderColor: '#e0e0e0',
    borderRadius: 14,
    paddingVertical: 14,
  },
  googleBtnText: { fontSize: 15, fontWeight: '600', color: '#333' },
  appleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: '#000',
    borderRadius: 14,
    paddingVertical: 14,
    marginTop: 10,
  },
  appleBtnText: { fontSize: 15, fontWeight: '600', color: '#fff' },
});
