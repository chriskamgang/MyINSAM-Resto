import { showAlert } from '../../utils/showAlert';
import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useCart } from '../../context/CartContext';
import { useDeliveryLocation } from '../../context/DeliveryLocationContext';
import { useAuth } from '../../context/AuthContext';
import { orderService } from '../../services/orderService';
import { restaurantService } from '../../services/restaurantService';
import { getMenuDay, isDishOrderableToday } from '../../hooks/useMenuDay';
import { profileService } from '../../services/profileService';
import { createThemedStyles, COLORS, FONTS, TYPE, RADIUS, SHADOWS, SCREEN_PADDING, formatPrice } from '../../theme';
import { Screen, ScreenHeader, Button, Input, Card, Badge, Divider, MetaItem } from '../../components/ui';
import { GFS_COLOR } from './GfsPaymentScreen';

// Calcule le temps de livraison via OSRM (routing OpenStreetMap)
async function getDeliveryMinutes(clientLat, clientLon, restLat = 5.4720, restLon = 10.4180) {
  try {
    const url = `https://router.project-osrm.org/route/v1/driving/${restLon},${restLat};${clientLon},${clientLat}?overview=false`;
    const res  = await fetch(url);
    const data = await res.json();
    if (data.code === 'Ok' && data.routes?.length > 0) {
      const durationSec = data.routes[0].duration; // secondes
      return Math.ceil(durationSec / 60); // → minutes
    }
  } catch (e) {
    // silencieux, on retourne null
  }
  return null;
}

// Couleurs de marque des opérateurs (accents uniquement)
const MTN_YELLOW = '#FFCC00';
const ORANGE_BRAND = '#FF7900';

const PAYMENT_METHODS = [
  { key: 'cash',         label: 'Espèces',          iconName: 'cash-outline', desc: 'Payer à la livraison', accent: COLORS.success, soft: COLORS.successSoft, short: null },
  { key: 'mtn_momo',     label: 'MTN Mobile Money', iconName: 'phone-portrait-outline', desc: 'Paiement mobile MTN', accent: MTN_YELLOW, soft: '#FFF8D6', short: 'MTN' },
  { key: 'orange_money', label: 'Orange Money',     iconName: 'phone-portrait-outline', desc: 'Paiement mobile Orange', accent: ORANGE_BRAND, soft: '#FFF0E3', short: 'OM' },
  { key: 'gfs',          label: 'Compte GFS',       iconName: 'wallet-outline', desc: 'N° client GFS + code PIN', accent: GFS_COLOR, soft: '#E6F0F7', short: 'GFS', freeDelivery: true },
];

// Titre d'étape numérotée
function StepTitle({ index, title, icon }) {
  return (
    <View style={styles.stepTitle}>
      <View style={styles.stepNum}><Text style={styles.stepNumText}>{index}</Text></View>
      <Text style={[TYPE.h3, { flex: 1 }]}>{title}</Text>
      {icon ? <Ionicons name={icon} size={18} color={COLORS.primary} /> : null}
    </View>
  );
}

function Radio({ selected, color = COLORS.primary }) {
  return (
    <View style={[styles.radioOuter, selected && { borderColor: color }]}>
      {selected ? <View style={[styles.radioInner, { backgroundColor: color }]} /> : null}
    </View>
  );
}

function AddressOption({ title, address, phone, isDefault, selected, onPress, onRemove, icon = 'location-outline' }) {
  return (
    <TouchableOpacity
      style={[styles.option, selected && styles.optionSelected]}
      onPress={onPress}
      activeOpacity={0.85}
    >
      <View style={[styles.optionIcon, selected && { backgroundColor: COLORS.primary }]}>
        <Ionicons name={icon} size={18} color={selected ? COLORS.white : COLORS.primary} />
      </View>
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Text style={styles.optionTitle} numberOfLines={1}>{title}</Text>
          {isDefault ? <Badge label="Par défaut" /> : null}
        </View>
        <Text style={TYPE.caption} numberOfLines={2}>{address}</Text>
        {phone ? <MetaItem icon="call-outline" label={phone} color={COLORS.primary} size={12} /> : null}
      </View>
      {onRemove ? (
        <TouchableOpacity onPress={onRemove} hitSlop={8}>
          <Ionicons name="close-circle" size={22} color={COLORS.textLight} />
        </TouchableOpacity>
      ) : <Radio selected={selected} />}
    </TouchableOpacity>
  );
}

export default function CheckoutScreen({ navigation, route }) {
  const { groups, discount: cartDiscount, coupon: cartCoupon, couponRestaurantId, clearRestaurant } = useCart();
  const restaurantId = route?.params?.restaurantId;
  const group = groups.find((entry) => String(entry.restaurant?.id) === String(restaurantId));
  const items = group?.items || [];
  const subtotal = group?.subtotal || 0;
  const cartRestaurant = group?.restaurant;
  const cartDeliveryFee = cartCoupon?.type === 'free_delivery' && String(couponRestaurantId) === String(restaurantId) ? 0 : (group?.deliveryFee || 0);
  const coupon = String(couponRestaurantId) === String(restaurantId) ? cartCoupon : null;
  const discount = coupon ? cartDiscount : 0;
  const { location, setLocation, selectSavedAddress } = useDeliveryLocation();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();

  const [addresses, setAddresses] = useState([]);
  const [selectedAddress, setSelectedAddress] = useState(null);
  const [tempAddress, setTempAddress] = useState(null); // adresse non enregistrée (id 'temp')
  const [paymentMethod, setPaymentMethod] = useState('cash');
  // Paiement GFS → livraison offerte (le serveur applique la même règle)
  const deliveryFee = paymentMethod === 'gfs' ? 0 : cartDeliveryFee;
  const total = Math.max(0, subtotal + deliveryFee - discount);
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingAddresses, setLoadingAddresses] = useState(true);
  const [estimate, setEstimate] = useState(null); // minutes OSRM pour l'adresse choisie
  const [estimating, setEstimating] = useState(false);

  // Saisie rapide d'adresse (sans l'enregistrer)
  const [showQuickAddress, setShowQuickAddress] = useState(false);
  const [quickAddressQuery, setQuickAddressQuery] = useState('');
  const [searchingAddress, setSearchingAddress] = useState(false);
  const [addressSuggestions, setAddressSuggestions] = useState([]);
  const [quickAddressPhone, setQuickAddressPhone] = useState('');

  const searchTimer = useRef(null);
  const prefilled = useRef(false);   // pré-remplissage depuis « Livrer à … » fait une seule fois
  const userPicked = useRef(false);  // l'utilisateur a choisi lui-même une adresse

  // Invité : la commande nécessite un compte → redirection vers la connexion
  useEffect(() => {
    if (!user) {
      navigation.replace('Auth', { screen: 'Login' });
      return undefined;
    }
    loadAddresses();
    return () => clearTimeout(searchTimer.current);
  }, [user]);

  const loadAddresses = async () => {
    try {
      const data = await profileService.getAddresses();
      const list = Array.isArray(data) ? data : [];
      setAddresses(list);
      // Garde la sélection de l'utilisateur si elle existe encore (ex. retour d'AddAddress)
      setSelectedAddress((prev) => {
        if (prev?.id === 'temp') return prev;
        if (prev && list.some((a) => a.id === prev.id)) return list.find((a) => a.id === prev.id);
        if (userPicked.current && prev) return prev;
        return list.find((a) => a.is_default) || list[0] || prev || null;
      });
    } catch (e) {
      console.error('Erreur adresses:', e);
    } finally {
      setLoadingAddresses(false);
    }
  };

  // Pré-remplit l'adresse depuis la position de livraison choisie à l'accueil
  useEffect(() => {
    if (loadingAddresses || prefilled.current || userPicked.current || !location) return;
    prefilled.current = true;

    if (location.addressId) {
      const match = addresses.find((a) => String(a.id) === String(location.addressId));
      if (match) { setSelectedAddress(match); return; }
    }
    if (location.address || (location.latitude && location.longitude)) {
      const temp = {
        id: 'temp',
        address: location.address || location.label,
        latitude: location.latitude ?? null,
        longitude: location.longitude ?? null,
        phone: null,
        label: location.source === 'gps' ? 'Ma position actuelle' : (location.label || 'Adresse de livraison'),
        is_default: false,
      };
      setTempAddress(temp);
      setSelectedAddress(temp);
    }
  }, [loadingAddresses, location, addresses]);

  // Estimation OSRM dès qu'une adresse avec coordonnées est choisie
  useEffect(() => {
    let cancelled = false;
    setEstimate(null);
    if (!selectedAddress?.latitude || !selectedAddress?.longitude) return undefined;
    setEstimating(true);
    getDeliveryMinutes(
      parseFloat(selectedAddress.latitude),
      parseFloat(selectedAddress.longitude),
      cartRestaurant?.latitude ? parseFloat(cartRestaurant.latitude) : undefined,
      cartRestaurant?.longitude ? parseFloat(cartRestaurant.longitude) : undefined
    ).then((m) => { if (!cancelled) setEstimate(m); })
      .finally(() => { if (!cancelled) setEstimating(false); });
    return () => { cancelled = true; };
  }, [selectedAddress?.id, selectedAddress?.latitude, selectedAddress?.longitude]);

  // Recherche d'adresse avec Nominatim
  const searchAddress = async (query) => {
    if (!query.trim()) {
      setAddressSuggestions([]);
      return;
    }
    setSearchingAddress(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=5&accept-language=fr&countrycodes=cm`,
        { headers: { 'User-Agent': 'RestaurantDeliveryApp/1.0' } }
      );
      const data = await res.json();
      setAddressSuggestions(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error('Erreur recherche adresse:', e);
      setAddressSuggestions([]);
    } finally {
      setSearchingAddress(false);
    }
  };

  // Anti-rebond : Nominatim limite à ~1 requête / seconde
  const onQuickQueryChange = (text) => {
    setQuickAddressQuery(text);
    clearTimeout(searchTimer.current);
    if (!text.trim()) { setAddressSuggestions([]); return; }
    searchTimer.current = setTimeout(() => searchAddress(text), 500);
  };

  const closeQuickAddress = () => {
    clearTimeout(searchTimer.current);
    setShowQuickAddress(false);
    setQuickAddressQuery('');
    setAddressSuggestions([]);
  };

  const selectQuickAddress = (suggestion) => {
    const temp = {
      id: 'temp',
      address: suggestion.display_name,
      latitude: parseFloat(suggestion.lat),
      longitude: parseFloat(suggestion.lon),
      phone: quickAddressPhone.trim() || null,
      label: 'Adresse temporaire',
      is_default: false,
    };
    userPicked.current = true;
    setTempAddress(temp);
    setSelectedAddress(temp);
    closeQuickAddress();
    // Synchronise « Livrer à … » de l'accueil
    setLocation?.({
      label: suggestion.display_name.split(',')[0],
      address: suggestion.display_name,
      latitude: temp.latitude,
      longitude: temp.longitude,
      addressId: null,
      source: 'address',
    });
  };

  const pickSavedAddress = (addr) => {
    userPicked.current = true;
    setSelectedAddress(addr);
    selectSavedAddress?.(addr);
  };

  const removeTempAddress = () => {
    setTempAddress(null);
    if (selectedAddress?.id === 'temp') {
      setSelectedAddress(addresses.find((a) => a.is_default) || addresses[0] || null);
    }
  };

  const handleOrder = async () => {
    if (!cartRestaurant || items.length === 0) {
      showAlert('Panier vide', 'Ce restaurant ne contient plus de plats dans votre panier.');
      navigation.goBack();
      return;
    }
    if (!selectedAddress) {
      showAlert('Adresse manquante', 'Veuillez sélectionner une adresse de livraison.');
      return;
    }

    setLoading(true);
    try {
      // Le panier peut rester ouvert pendant un changement de jour ou de disponibilité.
      const fresh = await restaurantService.getMenu(cartRestaurant.id);
      const menuItems = (fresh?.menu || []).flatMap((category) => category.items || []);
      const day = getMenuDay();
      const unavailable = items.find((entry) => {
        const current = menuItems.find((dish) => String(dish.id) === String(entry.id));
        return !current || !isDishOrderableToday(current, day);
      });
      if (unavailable) throw new Error(`« ${unavailable.name} » n'est plus disponible ce ${day.label}. Actualisez votre panier.`);
      if (fresh?.restaurant?.is_open === false) throw new Error('Ce restaurant est actuellement fermé.');
      const minimum = Number(fresh?.restaurant?.minimum_order ?? cartRestaurant.minimum_order) || 0;
      if (subtotal < minimum) throw new Error(`Le minimum de commande est de ${formatPrice(minimum)}.`);
      // Adresse temporaire : on la crée d'abord
      let addressId = selectedAddress.id;
      if (selectedAddress.id === 'temp') {
        const newAddr = await profileService.addAddress({
          label: 'Commande rapide',
          address: selectedAddress.address,
          latitude: selectedAddress.latitude,
          longitude: selectedAddress.longitude,
          phone: selectedAddress.phone,
          is_default: false,
        });
        // Le serveur répond { message, address: { id, ... } }
        addressId = newAddr?.address?.id ?? newAddr?.id;
        if (!addressId) throw new Error("L'adresse n'a pas pu être enregistrée. Réessayez.");
      }

      const orderData = {
        restaurant_id: cartRestaurant.id,
        address_id: addressId,
        payment_method: paymentMethod,
        special_instructions: note.trim() || null,
        coupon_code: coupon?.code || null,
        items: items.map(item => ({
          menu_item_id: item.id,
          quantity: item.quantity,
          options: item.selected_options || null, // le serveur lit « options »
        })),
      };

      const result = await orderService.createOrder(orderData);
      const order = result.order || result; // Le backend renvoie { message, order }

      // Temps de livraison via OSRM (réutilise l'estimation déjà calculée)
      let deliveryMinutes = estimate;
      if (deliveryMinutes == null && selectedAddress?.latitude && selectedAddress?.longitude) {
        deliveryMinutes = await getDeliveryMinutes(
          parseFloat(selectedAddress.latitude),
          parseFloat(selectedAddress.longitude),
          cartRestaurant?.latitude ? parseFloat(cartRestaurant.latitude) : undefined,
          cartRestaurant?.longitude ? parseFloat(cartRestaurant.longitude) : undefined
        );
      }

      // Paiement mobile money → écran de paiement
      // NE PAS vider le panier ici, on le videra après confirmation du paiement
      if (paymentMethod === 'mtn_momo' || paymentMethod === 'orange_money') {
        navigation.replace('MobilePayment', { order, paymentMethod, deliveryMinutes, restaurantId });
        return;
      }

      // Compte GFS → page de paiement GFS (panier vidé après confirmation)
      if (paymentMethod === 'gfs') {
        navigation.replace('GfsPayment', { order, deliveryMinutes, restaurantId });
        return;
      }

      // Sinon (espèces) → confirmation directe et panier vidé
      clearRestaurant(restaurantId);
      navigation.replace('OrderConfirmation', { order, deliveryMinutes });
    } catch (e) {
      const msg = e.response?.data?.message
        || (!e.isAxiosError && e.message)
        || 'Une erreur est survenue lors de la commande.';
      showAlert('Erreur', msg);
    } finally {
      setLoading(false);
    }
  };

  const isMobile = paymentMethod === 'mtn_momo' || paymentMethod === 'orange_money';
  const isOnline = isMobile || paymentMethod === 'gfs';

  return (
    <Screen>
      <ScreenHeader
        title="Finaliser la commande"
        subtitle={cartRestaurant?.name}
        onBack={() => navigation.goBack()}
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        automaticallyAdjustKeyboardInsets
        contentContainerStyle={{ paddingHorizontal: SCREEN_PADDING, paddingTop: 8, paddingBottom: 130 + insets.bottom }}
      >
        {/* 1. Adresse de livraison */}
        <Card style={styles.section}>
          <StepTitle index={1} title="Adresse de livraison" icon="location-outline" />

          {loadingAddresses ? (
            <ActivityIndicator color={COLORS.primary} style={{ marginVertical: 16 }} />
          ) : (
            <>
              {tempAddress ? (
                <AddressOption
                  title={tempAddress.label === 'Adresse temporaire' ? 'Adresse rapide' : tempAddress.label}
                  address={tempAddress.address}
                  phone={tempAddress.phone}
                  icon={tempAddress.label === 'Ma position actuelle' ? 'navigate-outline' : 'location-outline'}
                  selected={selectedAddress?.id === 'temp'}
                  onPress={() => { userPicked.current = true; setSelectedAddress(tempAddress); }}
                  onRemove={removeTempAddress}
                />
              ) : null}

              {addresses.map((addr) => (
                <AddressOption
                  key={addr.id}
                  title={addr.label || 'Adresse'}
                  address={addr.address}
                  phone={addr.phone}
                  isDefault={addr.is_default}
                  icon={/maison|home/i.test(addr.label || '') ? 'home-outline' : /bureau|travail|work/i.test(addr.label || '') ? 'briefcase-outline' : 'location-outline'}
                  selected={selectedAddress?.id === addr.id}
                  onPress={() => pickSavedAddress(addr)}
                />
              ))}

              {!tempAddress && addresses.length === 0 && !showQuickAddress ? (
                <View style={styles.noAddress}>
                  <Ionicons name="map-outline" size={26} color={COLORS.primary} />
                  <Text style={[TYPE.bodyMuted, { textAlign: 'center' }]}>Aucune adresse enregistrée</Text>
                </View>
              ) : null}

              {showQuickAddress ? (
                <View style={styles.quickBox}>
                  <Input
                    icon="search-outline"
                    label="Saisir votre adresse"
                    placeholder="Ex : Tamdja, Bafoussam"
                    value={quickAddressQuery}
                    onChangeText={onQuickQueryChange}
                    autoFocus
                    right={searchingAddress ? <ActivityIndicator size="small" color={COLORS.primary} /> : null}
                  />
                  {addressSuggestions.length > 0 ? (
                    <View style={styles.suggestions}>
                      {addressSuggestions.map((item, i) => (
                        <TouchableOpacity
                          key={item.place_id}
                          style={[styles.suggestion, i > 0 && styles.suggestionBorder]}
                          onPress={() => selectQuickAddress(item)}
                        >
                          <Ionicons name="location-outline" size={16} color={COLORS.primary} />
                          <Text style={styles.suggestionText} numberOfLines={2}>{item.display_name}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  ) : null}
                  <Input
                    icon="call-outline"
                    label="Téléphone (optionnel)"
                    placeholder="6XX XX XX XX"
                    value={quickAddressPhone}
                    onChangeText={setQuickAddressPhone}
                    keyboardType="phone-pad"
                    style={{ marginTop: 10 }}
                  />
                  <TouchableOpacity onPress={closeQuickAddress} style={styles.cancelLink}>
                    <Text style={styles.cancelLinkText}>Annuler</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={styles.addrActions}>
                  <TouchableOpacity style={styles.addrAction} onPress={() => setShowQuickAddress(true)}>
                    <Ionicons name="create-outline" size={16} color={COLORS.primary} />
                    <Text style={styles.addrActionText}>Saisir une adresse</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.addrAction}
                    onPress={() => navigation.navigate('AddAddress', { onSave: loadAddresses })}
                  >
                    <Ionicons name="add" size={18} color={COLORS.primary} />
                    <Text style={styles.addrActionText}>Nouvelle adresse</Text>
                  </TouchableOpacity>
                </View>
              )}

              {selectedAddress?.latitude && selectedAddress?.longitude ? (
                <View style={styles.eta}>
                  <Ionicons name="bicycle-outline" size={18} color={COLORS.primary} />
                  {estimating ? (
                    <Text style={styles.etaText}>Calcul du temps de livraison…</Text>
                  ) : estimate != null ? (
                    <Text style={styles.etaText}>
                      Livraison estimée : <Text style={styles.etaStrong}>~{15 + estimate} min</Text>
                    </Text>
                  ) : (
                    <Text style={styles.etaText}>Livraison estimée : <Text style={styles.etaStrong}>30–45 min</Text></Text>
                  )}
                </View>
              ) : null}
            </>
          )}
        </Card>

        {/* 2. Mode de paiement */}
        <Card style={styles.section}>
          <StepTitle index={2} title="Mode de paiement" icon="card-outline" />
          {PAYMENT_METHODS.map((pm) => {
            const selected = paymentMethod === pm.key;
            return (
              <TouchableOpacity
                key={pm.key}
                style={[styles.option, selected && { borderColor: pm.accent, backgroundColor: pm.soft }]}
                onPress={() => setPaymentMethod(pm.key)}
                activeOpacity={0.85}
              >
                <View style={[styles.payLogo, { backgroundColor: pm.short ? pm.accent : pm.soft }]}>
                  {pm.short ? (
                    <Text style={[styles.payLogoText, { color: pm.key === 'mtn_momo' ? COLORS.text : COLORS.white }]}>{pm.short}</Text>
                  ) : (
                    <Ionicons name={pm.iconName} size={22} color={pm.accent} />
                  )}
                </View>
                <View style={{ flex: 1 }}>
                  <View style={styles.optionTitleRow}>
                    <Text style={styles.optionTitle}>{pm.label}</Text>
                    {pm.freeDelivery && cartDeliveryFee > 0 ? (
                      <View style={styles.freeBadge}><Text style={styles.freeBadgeText}>Livraison offerte</Text></View>
                    ) : null}
                  </View>
                  <Text style={TYPE.caption}>{pm.desc}</Text>
                </View>
                <Radio selected={selected} color={pm.key === 'mtn_momo' ? '#E0B000' : pm.accent} />
              </TouchableOpacity>
            );
          })}
          {isMobile ? (
            <View style={styles.infoNote}>
              <Ionicons name="information-circle-outline" size={16} color={COLORS.info} />
              <Text style={styles.infoNoteText}>
                Vous confirmerez le paiement sur votre téléphone à l'étape suivante.
              </Text>
            </View>
          ) : null}
          {paymentMethod === 'gfs' ? (
            <View style={styles.infoNote}>
              <Ionicons name="information-circle-outline" size={16} color={COLORS.info} />
              <Text style={styles.infoNoteText}>
                Vous validerez avec votre numéro client GFS et votre code PIN à l'étape suivante.
              </Text>
            </View>
          ) : null}
        </Card>

        {/* 3. Note pour le livreur */}
        <Card style={styles.section}>
          <StepTitle index={3} title="Note pour le livreur" icon="chatbubble-ellipses-outline" />
          <Input
            icon="document-text-outline"
            placeholder="Instructions particulières pour la préparation ou la livraison… (optionnel)"
            value={note}
            onChangeText={setNote}
            multiline
            numberOfLines={3}
          />
        </Card>

        {/* 4. Récapitulatif */}
        <Card style={styles.section}>
          <StepTitle index={4} title="Récapitulatif" icon="receipt-outline" />
          {items.map((item) => (
            <View key={item.cart_key || item.id} style={styles.sumItem}>
              <View style={styles.qtyPill}><Text style={styles.qtyPillText}>{item.quantity}×</Text></View>
              <Text style={styles.sumName} numberOfLines={1}>{item.name}</Text>
              <Text style={styles.sumValue}>
                {formatPrice(Number(item.effective_price || item.price) * item.quantity)}
              </Text>
            </View>
          ))}
          <Divider style={{ marginVertical: 10 }} />
          <View style={styles.sumRow}>
            <Text style={TYPE.bodyMuted}>Sous-total</Text>
            <Text style={styles.sumValue}>{formatPrice(subtotal)}</Text>
          </View>
          <View style={styles.sumRow}>
            <Text style={TYPE.bodyMuted}>Livraison</Text>
            <Text style={[styles.sumValue, deliveryFee === 0 && { color: COLORS.success }]}>
              {deliveryFee === 0 ? (paymentMethod === 'gfs' && cartDeliveryFee > 0 ? 'Offerte (GFS)' : 'Gratuite') : formatPrice(deliveryFee)}
            </Text>
          </View>
          {discount > 0 ? (
            <View style={styles.sumRow}>
              <Text style={[TYPE.bodyMuted, { color: COLORS.success }]}>
                Réduction{coupon?.code ? ` (${coupon.code})` : ''}
              </Text>
              <Text style={[styles.sumValue, { color: COLORS.success }]}>-{formatPrice(discount)}</Text>
            </View>
          ) : null}
          <Divider style={{ marginVertical: 10 }} />
          <View style={styles.sumRow}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.totalValue}>{formatPrice(total)}</Text>
          </View>
        </Card>
      </ScrollView>

      {/* Barre de paiement fixe */}
      <View style={[styles.bar, { paddingBottom: Math.max(insets.bottom, 12) + 4 }]}>
        <View style={styles.barTotal}>
          <Text style={TYPE.caption}>Total à payer</Text>
          <Text style={styles.barTotalValue}>{formatPrice(total)}</Text>
        </View>
        <Button
          title={isOnline ? 'Payer maintenant' : 'Confirmer'}
          iconRight="arrow-forward"
          onPress={handleOrder}
          loading={loading}
          style={{ flex: 1 }}
        />
      </View>
    </Screen>
  );
}

const styles = createThemedStyles({
  section: { marginBottom: 16 },
  stepTitle: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14 },
  stepNum: {
    width: 26, height: 26, borderRadius: 13, backgroundColor: COLORS.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  stepNumText: { fontFamily: FONTS.bold, fontSize: 13, color: COLORS.white },

  option: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    borderRadius: RADIUS.lg, padding: 12, marginBottom: 10,
    borderWidth: 1.5, borderColor: COLORS.border, backgroundColor: COLORS.surface,
  },
  optionSelected: { borderColor: COLORS.primary, backgroundColor: COLORS.primarySoft },
  optionIcon: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.primarySoft,
    alignItems: 'center', justifyContent: 'center',
  },
  optionTitle: { fontFamily: FONTS.semibold, fontSize: 14, color: COLORS.text, flexShrink: 1 },
  optionTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  freeBadge: { backgroundColor: COLORS.successSoft, borderRadius: RADIUS.pill, paddingHorizontal: 8, paddingVertical: 2 },
  freeBadgeText: { fontFamily: FONTS.semibold, fontSize: 10, color: COLORS.success },

  radioOuter: {
    width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: COLORS.textLight,
    alignItems: 'center', justifyContent: 'center',
  },
  radioInner: { width: 11, height: 11, borderRadius: 6 },

  noAddress: { alignItems: 'center', gap: 6, paddingVertical: 12 },
  addrActions: { flexDirection: 'row', gap: 10, marginTop: 2 },
  addrAction: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    height: 44, borderRadius: RADIUS.pill, backgroundColor: COLORS.primarySoft,
  },
  addrActionText: { fontFamily: FONTS.medium, fontSize: 13, color: COLORS.primary },

  quickBox: { marginTop: 2 },
  suggestions: {
    backgroundColor: COLORS.surface, borderRadius: RADIUS.md, marginTop: 8,
    borderWidth: 1, borderColor: COLORS.border, overflow: 'hidden', ...SHADOWS.sm,
  },
  suggestion: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12 },
  suggestionBorder: { borderTopWidth: 1, borderTopColor: COLORS.divider },
  suggestionText: { ...TYPE.caption, color: COLORS.text, flex: 1 },
  cancelLink: { alignSelf: 'center', paddingVertical: 10, paddingHorizontal: 16 },
  cancelLinkText: { fontFamily: FONTS.medium, fontSize: 13, color: COLORS.textMuted },

  eta: {
    flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12,
    backgroundColor: COLORS.surfaceAlt, borderRadius: RADIUS.md, paddingHorizontal: 12, paddingVertical: 10,
  },
  etaText: { ...TYPE.caption, color: COLORS.text, flex: 1 },
  etaStrong: { fontFamily: FONTS.semibold, color: COLORS.primary },

  payLogo: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  payLogoText: { fontFamily: FONTS.extrabold, fontSize: 13 },
  infoNote: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: COLORS.infoSoft, borderRadius: RADIUS.md, padding: 10,
  },
  infoNoteText: { ...TYPE.caption, color: COLORS.info, flex: 1 },

  sumItem: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 5 },
  qtyPill: {
    minWidth: 32, paddingHorizontal: 6, height: 24, borderRadius: 8, backgroundColor: COLORS.primarySoft,
    alignItems: 'center', justifyContent: 'center',
  },
  qtyPillText: { fontFamily: FONTS.semibold, fontSize: 12, color: COLORS.primary },
  sumName: { ...TYPE.body, flex: 1 },
  sumRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 3 },
  sumValue: { fontFamily: FONTS.semibold, fontSize: 14, color: COLORS.text },
  totalLabel: { fontFamily: FONTS.semibold, fontSize: 16, color: COLORS.text },
  totalValue: { fontFamily: FONTS.bold, fontSize: 20, color: COLORS.primary },

  bar: {
    position: 'absolute', left: 0, right: 0, bottom: 0,
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: COLORS.surface, paddingHorizontal: SCREEN_PADDING, paddingTop: 14,
    borderTopLeftRadius: RADIUS.xl, borderTopRightRadius: RADIUS.xl, ...SHADOWS.lg,
  },
  barTotal: { minWidth: 100 },
  barTotalValue: { fontFamily: FONTS.bold, fontSize: 18, color: COLORS.text },
});
