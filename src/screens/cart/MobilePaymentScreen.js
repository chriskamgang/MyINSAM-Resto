import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, SafeAreaView,
  TextInput, ActivityIndicator, Alert, Animated,
} from 'react-native';
import { paymentService } from '../../services/paymentService';
import { useCart } from '../../context/CartContext';

const COLORS = {
  primary: '#FF6B35',
  bg: '#F9FAFB',
  card: '#fff',
  text: '#1F2937',
  gray: '#6B7280',
  success: '#10B981',
  warning: '#F59E0B',
};

export default function MobilePaymentScreen({ route, navigation }) {
  const { order, paymentMethod } = route.params;
  const { clearCart } = useCart();

  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [payment, setPayment] = useState(null);
  const [paymentStatus, setPaymentStatus] = useState(null);
  const [checking, setChecking] = useState(false);

  const pulseAnim = useRef(new Animated.Value(1)).current;
  const checkInterval = useRef(null);

  // Animation pulsation quand on attend la confirmation
  useEffect(() => {
    if (payment && paymentStatus === 'pending') {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.1, duration: 800, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1.0, duration: 800, useNativeDriver: true }),
        ])
      ).start();
    }
    return () => pulseAnim.setValue(1);
  }, [payment, paymentStatus]);

  // Polling du statut du paiement
  useEffect(() => {
    if (payment && paymentStatus === 'pending') {
      checkInterval.current = setInterval(async () => {
        await checkStatus();
      }, 5000); // Vérifier toutes les 5 secondes

      return () => clearInterval(checkInterval.current);
    }
  }, [payment, paymentStatus]);

  const handleInitiatePayment = async () => {
    if (!phone || phone.length < 9) {
      Alert.alert('Numéro invalide', 'Veuillez entrer un numéro de téléphone valide');
      return;
    }

    setLoading(true);
    try {
      const result = await paymentService.initiateMobilePayment({
        order_id: order.id,
        phone: phone.trim(),
        payment_method: paymentMethod,
      });

      setPayment(result.payment);
      setPaymentStatus(result.payment.status);

      Alert.alert(
        'Paiement initialisé',
        'Veuillez confirmer le paiement sur votre téléphone en composant votre code PIN.',
        [{ text: 'OK' }]
      );
    } catch (error) {
      const message = error.response?.data?.message || 'Erreur lors de l\'initialisation du paiement';
      Alert.alert('Erreur', message);
    } finally {
      setLoading(false);
    }
  };

  const checkStatus = async () => {
    if (!payment) return;

    setChecking(true);
    try {
      const result = await paymentService.checkPaymentStatus(payment.id);
      setPaymentStatus(result.payment.status);

      if (result.payment.status === 'completed') {
        clearInterval(checkInterval.current);
        Alert.alert(
          'Paiement réussi ! ✅',
          'Votre commande a été payée avec succès.',
          [
            {
              text: 'Voir ma commande',
              onPress: () => {
                clearCart(); // Vider le panier après confirmation du paiement
                navigation.replace('OrderConfirmation', { order: { ...order, id: result.payment.order_id } });
              },
            },
          ]
        );
      } else if (result.payment.status === 'failed' || result.payment.status === 'cancelled') {
        clearInterval(checkInterval.current);
        Alert.alert(
          'Paiement échoué',
          'Le paiement a échoué. Vous pouvez réessayer ou payer à la livraison.',
          [
            { text: 'Réessayer', onPress: () => { setPayment(null); setPaymentStatus(null); } },
            { text: 'Payer à la livraison', onPress: () => navigation.goBack() },
          ]
        );
      }
    } catch (error) {
      console.error('Erreur vérification statut:', error);
    } finally {
      setChecking(false);
    }
  };

  const methodLabel = paymentMethod === 'mtn_momo' ? 'MTN Mobile Money' : 'Orange Money';
  const methodIcon = paymentMethod === 'mtn_momo' ? '📱' : '🍊';

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Paiement {methodLabel}</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.content}>
        {/* Icône et titre */}
        <View style={styles.heroSection}>
          <Text style={styles.methodIcon}>{methodIcon}</Text>
          <Text style={styles.methodTitle}>{methodLabel}</Text>
          <Text style={styles.methodDesc}>
            Montant à payer: <Text style={styles.amountText}>{Number(order.total_amount || order.total).toLocaleString('fr-FR')} XAF</Text>
          </Text>
        </View>

        {!payment ? (
          // Formulaire de saisie du numéro
          <View style={styles.form}>
            <Text style={styles.label}>Numéro de téléphone</Text>
            <TextInput
              style={styles.input}
              placeholder="Ex: 237695509408"
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
              maxLength={15}
              placeholderTextColor={COLORS.gray}
            />
            <Text style={styles.hint}>
              Entrez le numéro {paymentMethod === 'mtn_momo' ? 'MTN' : 'Orange'} Mobile Money qui sera débité
            </Text>

            <TouchableOpacity
              style={[styles.payBtn, loading && { opacity: 0.7 }]}
              onPress={handleInitiatePayment}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.payBtnText}>Initier le paiement</Text>
              )}
            </TouchableOpacity>
          </View>
        ) : (
          // Statut du paiement
          <View style={styles.statusSection}>
            {paymentStatus === 'pending' && (
              <>
                <Animated.View style={[styles.statusIcon, { transform: [{ scale: pulseAnim }] }]}>
                  <Text style={styles.statusIconText}>⏳</Text>
                </Animated.View>
                <Text style={styles.statusTitle}>En attente de confirmation</Text>
                <Text style={styles.statusDesc}>
                  Composez votre code PIN {paymentMethod === 'mtn_momo' ? 'MTN' : 'Orange'} Mobile Money sur votre téléphone pour confirmer le paiement.
                </Text>
                {checking && <ActivityIndicator color={COLORS.primary} style={{ marginTop: 16 }} />}

                <TouchableOpacity style={styles.checkBtn} onPress={checkStatus} disabled={checking}>
                  <Text style={styles.checkBtnText}>Vérifier le statut</Text>
                </TouchableOpacity>
              </>
            )}

            {paymentStatus === 'completed' && (
              <>
                <View style={styles.statusIcon}>
                  <Text style={styles.statusIconText}>✅</Text>
                </View>
                <Text style={[styles.statusTitle, { color: COLORS.success }]}>Paiement réussi !</Text>
                <Text style={styles.statusDesc}>Votre commande a été payée avec succès</Text>
              </>
            )}

            {(paymentStatus === 'failed' || paymentStatus === 'cancelled') && (
              <>
                <View style={styles.statusIcon}>
                  <Text style={styles.statusIconText}>❌</Text>
                </View>
                <Text style={[styles.statusTitle, { color: '#EF4444' }]}>Paiement échoué</Text>
                <Text style={styles.statusDesc}>
                  Le paiement n'a pas pu être effectué. Veuillez réessayer.
                </Text>
              </>
            )}

            <TouchableOpacity
              style={styles.cancelBtn}
              onPress={() => {
                clearInterval(checkInterval.current);
                navigation.goBack();
              }}
            >
              <Text style={styles.cancelBtnText}>Annuler et retourner</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12,
    backgroundColor: COLORS.card, borderBottomWidth: 1, borderBottomColor: '#f0f0f0',
  },
  backBtn:     { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  backText:    { fontSize: 24, color: COLORS.text },
  headerTitle: { fontSize: 17, fontWeight: 'bold', color: COLORS.text },

  content: { flex: 1, padding: 20 },

  heroSection: {
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderRadius: 20,
    padding: 28,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  methodIcon:  { fontSize: 56, marginBottom: 12 },
  methodTitle: { fontSize: 20, fontWeight: '800', color: COLORS.text, marginBottom: 8 },
  methodDesc:  { fontSize: 14, color: COLORS.gray, textAlign: 'center' },
  amountText:  { fontSize: 16, fontWeight: '800', color: COLORS.primary },

  form: {
    backgroundColor: COLORS.card,
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  label: { fontSize: 14, fontWeight: '700', color: COLORS.text, marginBottom: 8 },
  input: {
    backgroundColor: COLORS.bg,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    color: COLORS.text,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    marginBottom: 8,
  },
  hint: { fontSize: 12, color: COLORS.gray, marginBottom: 20, lineHeight: 18 },

  payBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  payBtnText: { color: '#fff', fontSize: 16, fontWeight: '800' },

  statusSection: {
    backgroundColor: COLORS.card,
    borderRadius: 20,
    padding: 28,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  statusIcon: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: COLORS.bg,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  statusIconText: { fontSize: 48 },
  statusTitle:    { fontSize: 20, fontWeight: '800', color: COLORS.text, marginBottom: 10 },
  statusDesc:     { fontSize: 14, color: COLORS.gray, textAlign: 'center', lineHeight: 20, marginBottom: 24 },

  checkBtn: {
    backgroundColor: COLORS.bg,
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderWidth: 1.5,
    borderColor: COLORS.primary,
    marginBottom: 12,
  },
  checkBtnText: { color: COLORS.primary, fontSize: 14, fontWeight: '700' },

  cancelBtn: {
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  cancelBtnText: { color: COLORS.gray, fontSize: 14, fontWeight: '600' },
});
