// Paiement par compte GFS (Global Financial Solution).
// Le serveur crée un lien de paiement GFS ; le client l'ouvre et valide avec
// son numéro client GFS + son code PIN. On vérifie ensuite le statut côté serveur.
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';
import { paymentService } from '../../services/paymentService';
import { useCart } from '../../context/CartContext';
import { createThemedStyles, COLORS, FONTS, TYPE, RADIUS, SCREEN_PADDING, formatPrice } from '../../theme';
import { Screen, ScreenHeader, Button, Card } from '../../components/ui';

// Adresse de retour envoyée à GFS (même valeur que GFS_RETURN_URL côté serveur)
const RETURN_URL = 'com.chrisdev237.myinsamresto1://payment/gfs';
export const GFS_COLOR = '#0E5A8A';

export default function GfsPaymentScreen({ route, navigation }) {
  const { order, deliveryMinutes, restaurantId } = route.params;
  const { clearCart, clearRestaurant } = useCart();
  const insets = useSafeAreaInsets();

  const [payment, setPayment] = useState(null);
  const [status, setStatus] = useState('creating'); // creating | pending | completed | failed | error
  const [error, setError] = useState(null);
  const [checking, setChecking] = useState(false);
  const poll = useRef(null);
  const amount = order?.total;

  const checkStatus = useCallback(async (p = payment) => {
    if (!p) return;
    setChecking(true);
    try {
      const res = await paymentService.checkPaymentStatus(p.id);
      const s = String(res.payment.status).toLowerCase();
      if (s === 'completed') {
        clearInterval(poll.current);
        restaurantId ? clearRestaurant(restaurantId) : clearCart();
        setStatus('completed');
      } else if (s === 'failed' || s === 'cancelled') {
        clearInterval(poll.current);
        setStatus('failed');
      }
    } catch (_) {
      // réseau : on réessaiera au prochain tour
    } finally {
      setChecking(false);
    }
  }, [payment, clearCart, clearRestaurant, restaurantId]);

  const openPaymentPage = useCallback(async (p = payment) => {
    if (!p?.payment_url) return;
    try {
      await WebBrowser.openAuthSessionAsync(p.payment_url, RETURN_URL);
    } catch (_) {
      await WebBrowser.openBrowserAsync(p.payment_url);
    }
    // Page fermée (paiement fait, annulé ou retour) → on vérifie tout de suite
    checkStatus(p);
  }, [payment, checkStatus]);

  const start = useCallback(async () => {
    setStatus('creating');
    setError(null);
    try {
      const res = await paymentService.initiateGfsPayment(order.id);
      setPayment(res.payment);
      setStatus('pending');
      openPaymentPage(res.payment);
    } catch (e) {
      setError(e.response?.data?.message || 'Impossible de créer le paiement GFS.');
      setStatus('error');
    }
  }, [order?.id]);

  useEffect(() => { start(); }, []);

  // Vérification automatique toutes les 4 s tant que le paiement est en attente
  useEffect(() => {
    if (status !== 'pending' || !payment) return undefined;
    poll.current = setInterval(() => checkStatus(payment), 4000);
    return () => clearInterval(poll.current);
  }, [status, payment]);

  const goToConfirmation = () => navigation.replace('OrderConfirmation', { order, deliveryMinutes });

  const view = {
    creating:  { icon: 'hourglass-outline', tint: GFS_COLOR, bg: '#E6F0F7', title: 'Préparation du paiement…', text: 'Nous créons votre lien de paiement GFS.' },
    pending:   { icon: 'shield-checkmark-outline', tint: GFS_COLOR, bg: '#E6F0F7', title: 'Validez sur la page GFS', text: 'Saisissez votre numéro client GFS et votre code PIN sur la page qui s’est ouverte. Cet écran se met à jour tout seul.' },
    completed: { icon: 'checkmark', tint: COLORS.white, bg: COLORS.success, title: 'Paiement réussi !', text: 'Votre commande est confirmée. La livraison vous est offerte.' },
    failed:    { icon: 'close', tint: COLORS.white, bg: COLORS.danger, title: 'Paiement non abouti', text: 'Le lien a expiré ou le paiement a été refusé. Vous pouvez réessayer.' },
    error:     { icon: 'alert', tint: COLORS.white, bg: COLORS.danger, title: 'Paiement indisponible', text: error },
  }[status];

  return (
    <Screen>
      <ScreenHeader title="Paiement GFS" onBack={status === 'completed' ? undefined : () => navigation.goBack()} />
      <ScrollView contentContainerStyle={{ padding: SCREEN_PADDING, paddingBottom: 40 + insets.bottom }}>
        <View style={styles.hero}>
          <View style={[styles.illu, { backgroundColor: view.bg }]}>
            {status === 'creating'
              ? <ActivityIndicator color={GFS_COLOR} size="large" />
              : <Ionicons name={view.icon} size={44} color={view.tint} />}
          </View>
          <Text style={[TYPE.h2, styles.center]}>{view.title}</Text>
          <Text style={[TYPE.bodyMuted, styles.center, { marginTop: 6 }]}>{view.text}</Text>
        </View>

        <Card style={{ marginTop: 8 }}>
          <View style={styles.row}>
            <View style={styles.logo}><Text style={styles.logoText}>GFS</Text></View>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>Compte GFS</Text>
              <Text style={TYPE.caption}>Commande #{order?.order_number || order?.id}</Text>
            </View>
            <Text style={styles.amount}>{formatPrice(amount)}</Text>
          </View>
          <View style={styles.freeRow}>
            <Ionicons name="bicycle-outline" size={16} color={COLORS.success} />
            <Text style={styles.freeText}>Livraison offerte avec GFS</Text>
          </View>
        </Card>

        <View style={{ gap: 12, marginTop: 24 }}>
          {status === 'pending' && (
            <>
              <Button title="Ouvrir la page de paiement GFS" icon="open-outline" onPress={() => openPaymentPage()} />
              <Button title="J'ai payé, vérifier" variant="outline" loading={checking} onPress={() => checkStatus()} />
            </>
          )}
          {status === 'completed' && <Button title="Suivre ma commande" iconRight="arrow-forward" onPress={goToConfirmation} />}
          {(status === 'failed' || status === 'error') && (
            <>
              <Button title="Réessayer" icon="refresh" onPress={start} />
              <Button title="Choisir un autre mode de paiement" variant="outline" onPress={() => navigation.goBack()} />
            </>
          )}
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = createThemedStyles({
  hero: { alignItems: 'center', paddingVertical: 24 },
  illu: { width: 96, height: 96, borderRadius: 48, alignItems: 'center', justifyContent: 'center', marginBottom: 18 },
  center: { textAlign: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  logo: { width: 44, height: 44, borderRadius: 12, backgroundColor: GFS_COLOR, alignItems: 'center', justifyContent: 'center' },
  logoText: { fontFamily: FONTS.extrabold, fontSize: 13, color: COLORS.white },
  label: { fontFamily: FONTS.semibold, fontSize: 14, color: COLORS.text },
  amount: { fontFamily: FONTS.bold, fontSize: 16, color: COLORS.text },
  freeRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12,
    backgroundColor: COLORS.successSoft, borderRadius: RADIUS.md, paddingHorizontal: 12, paddingVertical: 8,
  },
  freeText: { fontFamily: FONTS.medium, fontSize: 13, color: COLORS.success },
});
