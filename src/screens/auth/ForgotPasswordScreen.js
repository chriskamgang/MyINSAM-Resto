// Mot de passe oublié en 2 étapes : 1) email → code envoyé par WhatsApp / email,
// 2) code + nouveau mot de passe → connexion automatique.
import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { authService } from '../../services/authService';
import { networkErrorMessage } from '../../hooks/useSocialAuth';
import AuthLayout, { AuthError } from '../../components/AuthLayout';
import { Input, Button } from '../../components/ui';
import { createThemedStyles, COLORS, FONTS, TYPE, RADIUS } from '../../theme';

const RESEND_DELAY = 60; // secondes avant de pouvoir redemander un code

export default function ForgotPasswordScreen({ navigation, route }) {
  const { resetPassword } = useAuth();
  const [step, setStep] = useState('email'); // 'email' | 'code'
  const [email, setEmail] = useState(route.params?.email || '');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [info, setInfo] = useState('');
  const [countdown, setCountdown] = useState(0);

  useEffect(() => {
    if (countdown <= 0) return undefined;
    const t = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [countdown]);

  const sendCode = async () => {
    setErrorMsg('');
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) {
      setErrorMsg('Entrez une adresse e-mail valide.');
      return;
    }
    setLoading(true);
    try {
      const res = await authService.forgotPassword(email.trim());
      setInfo(res?.message || 'Un code vous a été envoyé.');
      setStep('code');
      setCountdown(RESEND_DELAY);
    } catch (error) {
      setErrorMsg(error.response?.status === 429
        ? 'Trop de demandes. Patientez quelques minutes avant de réessayer.'
        : networkErrorMessage(error, "Impossible d'envoyer le code. Réessayez."));
    } finally {
      setLoading(false);
    }
  };

  const submitReset = async () => {
    setErrorMsg('');
    if (!/^\d{6}$/.test(code.trim())) {
      setErrorMsg('Le code contient 6 chiffres.');
      return;
    }
    if (password.length < 6) {
      setErrorMsg('Le mot de passe doit contenir au moins 6 caractères.');
      return;
    }
    setLoading(true);
    try {
      await resetPassword(email.trim(), code.trim(), password);
      navigation.navigate('Main');
    } catch (error) {
      setErrorMsg(error.response?.status === 429
        ? 'Trop de tentatives. Patientez quelques minutes.'
        : networkErrorMessage(error, 'Code invalide ou expiré.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      compactHero
      title={step === 'email' ? 'Mot de passe oublié' : 'Nouveau mot de passe'}
      subtitle={step === 'email'
        ? 'Entrez votre adresse e-mail. Nous vous envoyons un code de vérification par WhatsApp et par e-mail.'
        : `Saisissez le code à 6 chiffres reçu pour ${email.trim()}, puis choisissez un nouveau mot de passe.`}
      onBack={() => (step === 'code' ? setStep('email') : navigation.goBack())}
    >
      <AuthError message={errorMsg} />

      {step === 'email' ? (
        <>
          <Input
            icon="mail-outline"
            label="Adresse e-mail"
            value={email}
            onChangeText={(t) => { setEmail(t); setErrorMsg(''); }}
            placeholder="exemple@domaine.com"
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="email"
            onSubmitEditing={sendCode}
            style={{ marginBottom: 22 }}
          />
          <Button title="Recevoir le code" iconRight="arrow-forward" onPress={sendCode} loading={loading} />
        </>
      ) : (
        <>
          {info ? (
            <View style={styles.info}>
              <Ionicons name="logo-whatsapp" size={18} color={COLORS.success} />
              <Text style={styles.infoText}>{info}</Text>
            </View>
          ) : null}
          <View style={{ gap: 14, marginBottom: 22 }}>
            <Input
              icon="keypad-outline"
              label="Code de vérification"
              value={code}
              onChangeText={(t) => { setCode(t.replace(/\D/g, '').slice(0, 6)); setErrorMsg(''); }}
              placeholder="123456"
              keyboardType="number-pad"
              textContentType="oneTimeCode"
              autoComplete="sms-otp"
              maxLength={6}
            />
            <Input
              icon="lock-closed-outline"
              label="Nouveau mot de passe"
              value={password}
              onChangeText={(t) => { setPassword(t); setErrorMsg(''); }}
              placeholder="Minimum 6 caractères"
              secureTextEntry={!showPass}
              autoCapitalize="none"
              autoCorrect={false}
              textContentType="newPassword"
              autoComplete="new-password"
              onSubmitEditing={submitReset}
              right={(
                <TouchableOpacity onPress={() => setShowPass(!showPass)} hitSlop={10} style={{ padding: 4 }}>
                  <Ionicons name={showPass ? 'eye-outline' : 'eye-off-outline'} size={20} color={COLORS.text} />
                </TouchableOpacity>
              )}
            />
          </View>
          <Button title="Changer le mot de passe" iconRight="checkmark" onPress={submitReset} loading={loading} />
          <TouchableOpacity style={styles.resend} onPress={sendCode} disabled={countdown > 0 || loading} hitSlop={8}>
            <Text style={[styles.resendText, countdown > 0 && { color: COLORS.textLight }]}>
              {countdown > 0 ? `Renvoyer le code dans ${countdown} s` : 'Renvoyer le code'}
            </Text>
          </TouchableOpacity>
        </>
      )}
    </AuthLayout>
  );
}

const styles = createThemedStyles({
  info: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 8, backgroundColor: COLORS.successSoft,
    borderRadius: RADIUS.md, padding: 12, marginBottom: 14,
  },
  infoText: { ...TYPE.caption, flex: 1, color: COLORS.text },
  resend: { alignSelf: 'center', marginTop: 18, paddingVertical: 4 },
  resendText: { fontFamily: FONTS.semibold, fontSize: 14, color: COLORS.primary },
});
