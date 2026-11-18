import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, Alert, Animated, Easing } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { paymentService } from '../../services/paymentService';
import { useCart } from '../../context/CartContext';
import { useAuth } from '../../context/AuthContext';
import { COLORS, FONTS, TYPE, RADIUS, SCREEN_PADDING, formatPrice } from '../../theme';
import { Screen, ScreenHeader, Button, Input, Card, Badge } from '../../components/ui';

// Couleurs de marque des opérateurs (accents uniquement)
const OPERATORS = {
  mtn_momo:     { label: 'MTN Mobile Money', short: 'MTN', color: '#FFCC00', soft: '#FFF8D6', fg: '#7A5C00' },
  orange_money: { label: 'Orange Money',     short: 'Orange', color: '#FF7900', soft: '#FFF0E3', fg: '#B35400' },
};

export default function MobilePaymentScreen({ route, navigation }) {
  const { order, paymentMethod, deliveryMinutes } = route.params;
  const { clearCart } = useCart();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();

  const [phone, setPhone] = useState(user?.phone ? String(user.phone) : '');
  const [loading, setLoading] = useState(false);
  const [payment, setPayment] = useState(null);
  const [paymentStatus, setPaymentStatus] = useState(null);
  const [checking, setChecking] = useState(false);

  const pulseAnim = useRef(new Animated.Value(0)).current;
  const pulseLoop = useRef(null);
  const checkInterval = useRef(null);

  const op = OPERATORS[paymentMethod] || OPERATORS.mtn_momo;
  const status = paymentStatus ? String(paymentStatus).toLowerCase() : null;
  const isPending = !!payment && status === 'pending';
  const isCompleted = status === 'completed';
  const isFailed = status === 'failed' || status === 'cancelled';
  const amount = order?.total_amount || order?.total;

  // Animation de pulsation pendant l'attente de confirmation
  useEffect(() => {
    if (isPending) {
      pulseLoop.current = Animated.loop(
        Animated.timing(pulseAnim, { toValue: 1, duration: 1600, easing: Easing.out(Easing.ease), useNativeDriver: true })
      );
      pulseLoop.current.start();
    }
    return () => {
      pulseLoop.current?.stop();
      pulseAnim.setValue(0);
    };
  }, [isPending]);

  // Polling du statut du paiement
  useEffect(() => {
    if (payment && paymentStatus && paymentStatus.toLowerCase() === 'pending') {
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
        clearCart(); // Vider le panier dès la confirmation du paiement
        setPayment((p) => ({ ...p, ...result.payment }));
      } else if (result.payment.status === 'failed' || result.payment.status === 'cancelled') {
        clearInterval(checkInterval.current);
      }
    } catch (error) {
      console.error('Erreur vérification statut:', error);
    } finally {
      setChecking(false);
    }
  };

  const goToConfirmation = () => {
    navigation.replace('OrderConfirmation', {
      order: { ...order, id: payment?.order_id || order.id },
      deliveryMinutes,
    });
  };

  const retry = () => { setPayment(null); setPaymentStatus(null); };

  const leave = () => {
    clearInterval(checkInterval.current);
    navigation.goBack();
  };

  // ── Illustration de statut ──
  const illu = isCompleted
    ? { icon: 'checkmark', color: COLORS.white, bg: COLORS.success, halo: COLORS.successSoft }
    : isFailed
      ? { icon: 'close', color: COLORS.white, bg: COLORS.danger, halo: COLORS.dangerSoft }
      : isPending
        ? { icon: 'phone-portrait-outline', color: COLORS.primary, bg: COLORS.surface, halo: COLORS.primarySoft }
        : { icon: 'wallet-outline', color: COLORS.primary, bg: COLORS.surface, halo: COLORS.primarySoft };

  const ringScale = pulseAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 1.45] });
  const ringOpacity = pulseAnim.interpolate({ inputRange: [0, 1], outputRange: [0.55, 0] });

  const title = isCompleted ? 'Paiement réussi !'
    : isFailed ? 'Paiement échoué'
      : isPending ? 'En attente de confirmation'
        : `Payer avec ${op.label}`;

  const description = isCompleted
    ? 'Votre commande a été payée avec succès. Le restaurant commence la préparation.'
    : isFailed
      ? 'Le paiement n\'a pas pu être effectué. Vous pouvez réessayer ou payer à la livraison.'
      : isPending
        ? `Composez votre code PIN ${op.short} Mobile Money sur votre téléphone pour confirmer le paiement.`
        : `Entrez le numéro ${op.short} Mobile Money qui sera débité.`;

  return (
    <Screen>
      <ScreenHeader
        title="Paiement mobile"
        subtitle={order?.order_number ? `Commande #${order.order_number}` : undefined}
        onBack={isCompleted ? undefined : leave}
      />

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: Math.max(insets.bottom, 16) + 16 }]}
        keyboardShouldPersistTaps="handled"
        automaticallyAdjustKeyboardInsets
        showsVerticalScrollIndicator={false}
      >
        {/* Illustration */}
        <View style={styles.hero}>
          <View style={[styles.halo, { backgroundColor: illu.halo }]}>
            {isPending ? (
              <Animated.View
                pointerEvents="none"
                style={[styles.ring, { opacity: ringOpacity, transform: [{ scale: ringScale }] }]}
              />
            ) : null}
            <View style={[styles.iconCircle, { backgroundColor: illu.bg }]}>
              <Ionicons name={illu.icon} size={isCompleted || isFailed ? 48 : 40} color={illu.color} />
            </View>
          </View>

          <View style={[styles.opBadge, { backgroundColor: op.soft }]}>
            <View style={[styles.opDot, { backgroundColor: op.color }]} />
            <Text style={[styles.opBadgeText, { color: op.fg }]}>{op.label}</Text>
          </View>

          <Text style={[TYPE.h2, styles.center]}>{title}</Text>
          <Text style={[TYPE.bodyMuted, styles.center, { marginTop: 6 }]}>{description}</Text>
        </View>

        {/* Montant */}
        <Card style={styles.amountCard}>
          <View style={{ flex: 1 }}>
            <Text style={TYPE.caption}>Montant à payer</Text>
            <Text style={styles.amount}>{formatPrice(amount)}</Text>
          </View>
          {isCompleted ? <Badge label="Payé" icon="checkmark-circle" color={COLORS.success} bg={COLORS.successSoft} />
            : isFailed ? <Badge label="Échoué" icon="close-circle" color={COLORS.danger} bg={COLORS.dangerSoft} />
              : isPending ? <Badge label="En attente" icon="time-outline" color={COLORS.warning} bg={COLORS.warningSoft} />
                : null}
        </Card>

        {/* Formulaire */}
        {!payment ? (
          <Card>
            <Input
              icon="call-outline"
              label={`Numéro ${op.short}`}
              placeholder="Ex : 237695509408"
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
              maxLength={15}
            />
            <Text style={[TYPE.caption, { marginTop: 8, marginBottom: 16 }]}>
              Vous recevrez une demande de confirmation sur ce numéro.
            </Text>
            <Button title="Initier le paiement" icon="lock-closed-outline" onPress={handleInitiatePayment} loading={loading} />
          </Card>
        ) : null}

        {/* Attente */}
        {isPending ? (
          <>
            <Card style={styles.steps}>
              {[
                'Une notification de paiement arrive sur votre téléphone.',
                `Saisissez votre code PIN ${op.short} pour valider.`,
                'Cet écran se met à jour automatiquement.',
              ].map((t, i) => (
                <View key={i} style={styles.stepRow}>
                  <View style={styles.stepNum}><Text style={styles.stepNumText}>{i + 1}</Text></View>
                  <Text style={[TYPE.body, { flex: 1 }]}>{t}</Text>
                </View>
              ))}
            </Card>
            <View style={styles.waitingRow}>
              <ActivityIndicator size="small" color={COLORS.primary} />
              <Text style={TYPE.caption}>{checking ? 'Vérification en cours…' : 'Vérification automatique toutes les 5 s'}</Text>
            </View>
            <Button title="Vérifier le statut" variant="ghost" icon="refresh" onPress={checkStatus} disabled={checking} size="md" />
            <Button title="Annuler et retourner" variant="outline" onPress={leave} size="md" style={{ marginTop: 10 }} />
          </>
        ) : null}

        {/* Succès */}
        {isCompleted ? (
          <Button title="Voir ma commande" iconRight="arrow-forward" onPress={goToConfirmation} style={{ marginTop: 8 }} />
        ) : null}

        {/* Échec */}
        {isFailed ? (
          <>
            <Button title="Réessayer" icon="refresh" onPress={retry} style={{ marginTop: 8 }} />
            <Button title="Payer à la livraison" variant="outline" icon="cash-outline" onPress={leave} style={{ marginTop: 10 }} />
          </>
        ) : null}

        {/* Statut inconnu renvoyé par le backend */}
        {payment && !isPending && !isCompleted && !isFailed ? (
          <>
            <Button title="Vérifier le statut" variant="ghost" icon="refresh" onPress={checkStatus} loading={checking} size="md" />
            <Button title="Annuler et retourner" variant="outline" onPress={leave} size="md" style={{ marginTop: 10 }} />
          </>
        ) : null}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: SCREEN_PADDING, paddingTop: 8 },
  center: { textAlign: 'center' },

  hero: { alignItems: 'center', paddingTop: 12, paddingBottom: 24, paddingHorizontal: 8 },
  halo: {
    width: 150, height: 150, borderRadius: 75,
    alignItems: 'center', justifyContent: 'center', marginBottom: 18,
  },
  ring: {
    position: 'absolute', width: 150, height: 150, borderRadius: 75,
    borderWidth: 3, borderColor: COLORS.primary,
  },
  iconCircle: {
    width: 96, height: 96, borderRadius: 48,
    alignItems: 'center', justifyContent: 'center',
  },
  opBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 12, paddingVertical: 5, borderRadius: RADIUS.pill, marginBottom: 12,
  },
  opDot: { width: 10, height: 10, borderRadius: 5 },
  opBadgeText: { fontFamily: FONTS.semibold, fontSize: 12 },

  amountCard: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  amount: { fontFamily: FONTS.bold, fontSize: 24, color: COLORS.primary, marginTop: 2 },

  steps: { marginBottom: 14, gap: 12 },
  stepRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  stepNum: {
    width: 26, height: 26, borderRadius: 13, backgroundColor: COLORS.primarySoft,
    alignItems: 'center', justifyContent: 'center',
  },
  stepNumText: { fontFamily: FONTS.bold, fontSize: 12, color: COLORS.primary },
  ussd: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: COLORS.surfaceAlt, borderRadius: RADIUS.md, padding: 10,
  },
  ussdCode: { fontFamily: FONTS.semibold, color: COLORS.text },

  waitingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 14 },
});
