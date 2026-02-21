import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ScrollView,
  ActivityIndicator, Alert,
} from 'react-native';
import { useAuth } from '../../context/AuthContext';

export default function RegisterScreen({ navigation }) {
  const { register } = useAuth();
  const [name,     setName]     = useState('');
  const [email,    setEmail]    = useState('');
  const [phone,    setPhone]    = useState('');
  const [password, setPassword] = useState('');
  const [loading,  setLoading]  = useState(false);

  const handleRegister = async () => {
    if (!name.trim() || !email.trim() || !phone.trim() || !password.trim()) {
      Alert.alert('Erreur', 'Veuillez remplir tous les champs.');
      return;
    }
    if (password.length < 6) {
      Alert.alert('Erreur', 'Le mot de passe doit contenir au moins 6 caractères.');
      return;
    }
    setLoading(true);
    try {
      await register(name.trim(), email.trim(), phone.trim(), password);
    } catch (error) {
      const msg = error.response?.data?.message || 'Une erreur est survenue.';
      Alert.alert('Inscription échouée', msg);
    } finally {
      setLoading(false);
    }
  };

  const Field = ({ label, value, onChangeText, placeholder, keyboardType, secureTextEntry, autoCapitalize }) => (
    <View style={styles.inputGroup}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        keyboardType={keyboardType}
        secureTextEntry={secureTextEntry}
        autoCapitalize={autoCapitalize || 'none'}
        autoCorrect={false}
      />
    </View>
  );

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
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
          <Field label="Nom complet"    value={name}     onChangeText={setName}     placeholder="Jean Dupont"           autoCapitalize="words" />
          <Field label="Email"          value={email}    onChangeText={setEmail}    placeholder="vous@exemple.com"      keyboardType="email-address" />
          <Field label="Téléphone"      value={phone}    onChangeText={setPhone}    placeholder="+237 6XX XXX XXX"      keyboardType="phone-pad" />
          <Field label="Mot de passe"   value={password} onChangeText={setPassword} placeholder="Minimum 6 caractères" secureTextEntry />

          <TouchableOpacity
            style={[styles.btn, loading && styles.btnDisabled]}
            onPress={handleRegister}
            disabled={loading}
          >
            {loading
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.btnText}>Créer mon compte</Text>
            }
          </TouchableOpacity>
        </View>

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
});
