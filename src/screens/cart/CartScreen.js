import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, ActivityIndicator, Image, StatusBar,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useCart } from '../../context/CartContext';
import { useAuth } from '../../context/AuthContext';
import { useFavorites } from '../../context/FavoritesContext';
import { COLORS, FONTS, TYPE, RADIUS, SHADOWS, GRADIENTS, SCREEN_PADDING, formatPrice } from '../../theme';
import { IMAGES } from '../../theme/images';
import { useTabBarSpace } from '../../hooks/useTabBarSpace';
import { Button, Card, SmartImage, EmptyState, Divider, IconButton } from '../../components/ui';

const lineKey = (item) => item.cart_key || item.id;

const optionsLabel = (item) => {
  if (!item.selected_options || Object.keys(item.selected_options).length === 0) return null;
  return Object.values(item.selected_options).flat().map((o) => o?.name).filter(Boolean).join(', ');
};

const deliveryTime = (r) => {
  if (r?.delivery_time_min && r?.delivery_time_max) return `${r.delivery_time_min}-${r.delivery_time_max} min`;
  if (r?.delivery_time_min) return `${r.delivery_time_min} min`;
  return '20-40 min';
};

// ── En-tête orange arrondi (maquette) ──
function CartHeader({ topInset, onBack, onClear }) {
  return (
    <View style={[styles.header, { paddingTop: topInset + 8 }]}>
      <LinearGradient colors={GRADIENTS.primary} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.blobLeft} />
      <LinearGradient colors={GRADIENTS.primary} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.blobRight} />

      <View style={styles.headerRow}>
        <IconButton icon="arrow-back" onPress={onBack} size={46} />
        <View style={{ flex: 1 }} />
        {onClear ? <IconButton icon="trash-outline" onPress={onClear} size={46} /> : null}
      </View>

      <View style={styles.headerBody}>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Mon Panier</Text>
          <Text style={styles.headerSub}>Vos plats sélectionnés</Text>
        </View>
        {IMAGES.cartHeader ? (
          <Image source={IMAGES.cartHeader} style={styles.headerImage} resizeMode="cover" />
        ) : (
          <View style={styles.illu}>
            <View style={styles.illuCart}>
              <Ionicons name="cart" size={52} color={COLORS.primary} />
            </View>
            <View style={styles.illuBag}>
              <Ionicons name="bag-handle" size={26} color={COLORS.white} />
            </View>
          </View>
        )}
      </View>
    </View>
  );
}

// ── Sélecteur de quantité compact en pilule blanche ──
function PillStepper({ value, onMinus, onPlus }) {
  return (
    <View style={styles.pill}>
      <TouchableOpacity onPress={onMinus} hitSlop={6} style={styles.pillBtn}>
        <Ionicons
          name={value <= 1 ? 'trash-outline' : 'remove'}
          size={value <= 1 ? 16 : 18}
          color={value <= 1 ? COLORS.danger : COLORS.text}
        />
      </TouchableOpacity>
      <Text style={styles.pillValue}>{value}</Text>
      <TouchableOpacity onPress={onPlus} hitSlop={6} style={styles.pillBtn}>
        <Ionicons name="add" size={18} color={COLORS.text} />
      </TouchableOpacity>
    </View>
  );
}

function CartLine({ item, favorite, onToggleFavorite, onIncrease, onDecrease, onDelete }) {
  const unitPrice = Number(item.effective_price ?? item.price) || 0;
  const basePrice = Number(item.price) || 0;
  const discountPct = basePrice > unitPrice && unitPrice > 0 ? Math.round((1 - unitPrice / basePrice) * 100) : 0;
  const options = optionsLabel(item);
  return (
    <View style={styles.line}>
      <View>
        <SmartImage uri={item.image} style={styles.lineImage} iconSize={26} />
        {discountPct > 0 ? (
          <View style={styles.promoTag}><Text style={styles.promoTagText}>-{discountPct}%</Text></View>
        ) : null}
      </View>

      <View style={{ flex: 1 }}>
        <View style={styles.lineTop}>
          <Text style={styles.lineName} numberOfLines={2}>{item.name}</Text>
          <TouchableOpacity onPress={onToggleFavorite} hitSlop={8}>
            <Ionicons name={favorite ? 'heart' : 'heart-outline'} size={20} color={favorite ? COLORS.primary : COLORS.textMuted} />
          </TouchableOpacity>
        </View>
        {options ? (
          <Text style={styles.lineOptions} numberOfLines={2}>{options}</Text>
        ) : item.description ? (
          <Text style={styles.lineDesc} numberOfLines={2}>{item.description}</Text>
        ) : null}
        <View style={styles.lineBottom}>
          <View style={{ flexShrink: 1 }}>
            <Text style={styles.linePrice}>{formatPrice(unitPrice * item.quantity)}</Text>
            {item.quantity > 1 ? <Text style={TYPE.caption}>{formatPrice(unitPrice)} / unité</Text> : null}
          </View>
          <PillStepper
            value={item.quantity}
            onPlus={onIncrease}
            onMinus={() => (item.quantity <= 1 ? onDelete() : onDecrease())}
          />
        </View>
      </View>
    </View>
  );
}

function SummaryRow({ icon, label, value, color }) {
  return (
    <View style={styles.sumRow}>
      <Ionicons name={icon} size={18} color={color || COLORS.textMuted} />
      <Text style={[styles.sumLabel, color && { color }]}>{label}</Text>
      <Text style={[styles.sumValue, color && { color }]}>{value}</Text>
    </View>
  );
}

export default function CartScreen({ navigation }) {
  const tabSpace = useTabBarSpace();
  const insets = useSafeAreaInsets();
  const {
    items, subtotal, deliveryFee, discount, total, totalItems,
    addItem, removeItem, deleteItem, clearCart, applyCoupon, removeCoupon, coupon,
    restaurant: cartRestaurant,
  } = useCart();
  const { user } = useAuth();
  const { isFavorite, toggleFavorite } = useFavorites();
  const isGuest = !user;
  const [couponInput, setCouponInput] = useState('');
  const [couponLoading, setCouponLoading] = useState(false);

  const goToLogin = () => navigation.navigate('Auth', { screen: 'Login' });
  const goBack = () => (navigation.canGoBack() ? navigation.goBack() : navigation.navigate('Main', { screen: 'Accueil' }));

  const handleApplyCoupon = async () => {
    if (isGuest) { goToLogin(); return; }
    if (!couponInput.trim()) return;
    setCouponLoading(true);
    try {
      await applyCoupon(couponInput.trim());
      setCouponInput('');
    } catch (e) {
      Alert.alert('Coupon invalide', e.message || 'Ce code promo n\'est pas valide.');
    } finally {
      setCouponLoading(false);
    }
  };

  const handleClearCart = () => {
    Alert.alert(
      'Vider le panier',
      'Supprimer tous les articles du panier ?',
      [
        { text: 'Annuler', style: 'cancel' },
        { text: 'Vider', style: 'destructive', onPress: clearCart },
      ]
    );
  };

  const handleDelete = (item) => {
    Alert.alert(
      'Retirer l\'article',
      `Retirer « ${item.name} » du panier ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        { text: 'Retirer', style: 'destructive', onPress: () => deleteItem(lineKey(item)) },
      ]
    );
  };

  const handleFavorite = async (item) => {
    const ok = await toggleFavorite?.('item', item);
    if (ok === false) goToLogin();
  };

  if (items.length === 0) {
    return (
      <View style={styles.root}>
        <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
        <CartHeader topInset={insets.top} onBack={goBack} />
        <View style={[styles.emptyWrap, { paddingBottom: tabSpace }]}>
          <EmptyState
            icon="bag-handle-outline"
            title="Votre panier est vide"
            message="Parcourez les restaurants de Bafoussam et ajoutez vos plats préférés."
            actionLabel="Découvrir les restaurants"
            onAction={() => navigation.navigate('Main', { screen: 'Accueil' })}
          />
        </View>
      </View>
    );
  }

  const barBottom = tabSpace - 4; // au-dessus de la barre d'onglets (et du bouton Panier surélevé)
  const isOpen = cartRestaurant?.is_open !== false;

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        automaticallyAdjustKeyboardInsets
        contentContainerStyle={{ paddingBottom: barBottom + (isGuest ? 116 : 80) }}
      >
        <CartHeader topInset={insets.top} onBack={goBack} onClear={handleClearCart} />

        <View style={styles.body}>
          {/* Restaurant + plats */}
          <Card style={styles.group}>
            {cartRestaurant ? (
              <>
                <View style={styles.resto}>
                  <SmartImage
                    uri={cartRestaurant.logo || cartRestaurant.cover_image}
                    style={styles.restoLogo}
                    fallbackIcon="storefront-outline"
                    iconSize={20}
                  />
                  <View style={{ flex: 1 }}>
                    <View style={styles.restoNameRow}>
                      <Text style={styles.restoName} numberOfLines={1}>{cartRestaurant.name}</Text>
                    </View>
                    <View style={styles.restoMeta}>
                      <Ionicons name="time-outline" size={13} color={COLORS.textMuted} />
                      <Text style={TYPE.caption}>Livraison : {deliveryTime(cartRestaurant)}</Text>
                    </View>
                  </View>
                  <View style={[styles.openPill, !isOpen && { backgroundColor: COLORS.dangerSoft }]}>
                    <View style={[styles.openDot, !isOpen && { backgroundColor: COLORS.danger }]} />
                    <Text style={[styles.openText, !isOpen && { color: COLORS.danger }]}>{isOpen ? 'Ouvert' : 'Fermé'}</Text>
                  </View>
                </View>
                <Divider style={{ marginVertical: 12 }} />
              </>
            ) : null}

            {items.map((item, i) => (
              <View key={String(lineKey(item))}>
                {i > 0 ? <Divider style={{ marginVertical: 12 }} /> : null}
                <CartLine
                  item={item}
                  favorite={!!isFavorite?.('item', item.id)}
                  onToggleFavorite={() => handleFavorite(item)}
                  onIncrease={() => addItem(item, 1)}
                  onDecrease={() => removeItem(lineKey(item))}
                  onDelete={() => handleDelete(item)}
                />
              </View>
            ))}
          </Card>

          {/* Code promo */}
          {coupon ? (
            <View style={styles.couponApplied}>
              <View style={styles.couponAppliedIcon}>
                <Ionicons name="pricetag" size={16} color={COLORS.success} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.couponAppliedTitle}>Code « {coupon.code} » appliqué</Text>
                <Text style={styles.couponAppliedSub}>Vous économisez {formatPrice(discount)}</Text>
              </View>
              <TouchableOpacity onPress={removeCoupon} hitSlop={8}>
                <Ionicons name="close-circle" size={22} color={COLORS.textLight} />
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.promo}>
              <View style={styles.promoTop}>
                <LinearGradient colors={GRADIENTS.primary} style={styles.giftTile}>
                  <Ionicons name="gift" size={24} color={COLORS.white} />
                </LinearGradient>
                <View style={{ flex: 1 }}>
                  <Text style={styles.promoTitle}>Code promo ?</Text>
                  <Text style={styles.promoCaption}>
                    {isGuest
                      ? 'Connectez-vous pour utiliser un code promo.'
                      : 'Entrez votre code pour bénéficier d\'une réduction'}
                  </Text>
                </View>
              </View>
              <View style={styles.promoInputRow}>
                <TextInput
                  style={styles.promoInput}
                  placeholder="Code promo"
                  value={couponInput}
                  onChangeText={setCouponInput}
                  autoCapitalize="characters"
                  placeholderTextColor={COLORS.textLight}
                  returnKeyType="done"
                  onSubmitEditing={handleApplyCoupon}
                  editable={!isGuest}
                  onPressIn={isGuest ? goToLogin : undefined}
                />
                <TouchableOpacity
                  style={[styles.promoBtn, !isGuest && !couponInput.trim() && { opacity: 0.5 }]}
                  onPress={handleApplyCoupon}
                  disabled={couponLoading || (!isGuest && !couponInput.trim())}
                >
                  {couponLoading
                    ? <ActivityIndicator size="small" color={COLORS.white} />
                    : <Ionicons name={isGuest ? 'log-in-outline' : 'arrow-forward'} size={20} color={COLORS.white} />}
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Récapitulatif */}
          <Card style={styles.summary}>
            <View style={styles.summaryTitle}>
              <Ionicons name="receipt" size={22} color={COLORS.primary} />
              <Text style={TYPE.h3}>Récapitulatif</Text>
            </View>
            <SummaryRow
              icon="bag-handle-outline"
              label={`Sous-total (${totalItems} article${totalItems > 1 ? 's' : ''})`}
              value={formatPrice(subtotal)}
            />
            <SummaryRow
              icon="bicycle-outline"
              label="Frais de livraison"
              value={deliveryFee === 0 ? 'Gratuite' : formatPrice(deliveryFee)}
              color={deliveryFee === 0 ? COLORS.success : null}
            />
            {discount > 0 ? (
              <SummaryRow icon="pricetag-outline" label="Réduction" value={`- ${formatPrice(discount)}`} color={COLORS.success} />
            ) : null}
            <Divider style={{ marginVertical: 12 }} />
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Total à payer</Text>
              <Text style={styles.totalValue}>{formatPrice(total)}</Text>
            </View>
          </Card>
        </View>
      </ScrollView>

      {/* Bouton principal, au-dessus de la barre d'onglets */}
      <View style={[styles.bar, { bottom: barBottom }]} pointerEvents="box-none">
        {isGuest ? (
          <View style={styles.guestNote}>
            <Ionicons name="person-circle-outline" size={16} color={COLORS.primary} />
            <Text style={styles.guestNoteText}>Connectez-vous pour finaliser votre commande</Text>
          </View>
        ) : null}
        <Button
          title="Passer la commande"
          icon="card-outline"
          iconRight="arrow-forward"
          onPress={() => (isGuest ? goToLogin() : navigation.navigate('Checkout'))}
          style={{ borderRadius: RADIUS.pill }}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.bg },

  // En-tête
  header: { paddingHorizontal: SCREEN_PADDING, paddingBottom: 18, overflow: 'hidden' },
  blobLeft: {
    position: 'absolute', top: -170, left: -120, width: 300, height: 260,
    borderBottomRightRadius: 200, borderBottomLeftRadius: 120, transform: [{ rotate: '-12deg' }],
  },
  blobRight: {
    position: 'absolute', top: -90, right: -90, width: 220, height: 220, borderRadius: 110,
  },
  headerRow: { flexDirection: 'row', alignItems: 'center' },
  headerBody: { flexDirection: 'row', alignItems: 'flex-end', marginTop: 8, paddingLeft: 36 },
  headerTitle: { fontFamily: FONTS.bold, fontSize: 22, lineHeight: 30, color: COLORS.text },
  headerSub: { fontFamily: FONTS.medium, fontSize: 13, color: COLORS.text },
  headerImage: { width: 150, height: 98, marginTop: -30, borderRadius: 20, borderWidth: 3, borderColor: COLORS.surface },
  illu: { width: 130, height: 96, marginTop: -36, alignItems: 'flex-end', justifyContent: 'flex-end' },
  illuCart: {
    width: 88, height: 88, borderRadius: 44, backgroundColor: COLORS.surface,
    alignItems: 'center', justifyContent: 'center', ...SHADOWS.md,
  },
  illuBag: {
    position: 'absolute', top: 0, left: 10, width: 50, height: 50, borderRadius: 25,
    backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center',
    borderWidth: 3, borderColor: COLORS.surface, ...SHADOWS.primary,
  },

  body: { paddingHorizontal: 14 },
  emptyWrap: { flex: 1, justifyContent: 'center' },

  // Carte restaurant
  group: { marginBottom: 14, padding: 14 },
  resto: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  restoLogo: { width: 48, height: 48, borderRadius: 24, borderWidth: 2, borderColor: COLORS.surface, ...SHADOWS.sm },
  restoNameRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  restoName: { fontFamily: FONTS.bold, fontSize: 16, color: COLORS.text, flexShrink: 1 },
  restoMeta: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 1 },
  openPill: {
    flexDirection: 'row', alignItems: 'center', gap: 5, alignSelf: 'flex-start',
    backgroundColor: COLORS.successSoft, borderRadius: RADIUS.pill, paddingHorizontal: 10, paddingVertical: 4,
  },
  openDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: COLORS.success },
  openText: { fontFamily: FONTS.semibold, fontSize: 12, color: COLORS.success },

  // Ligne de plat
  line: { flexDirection: 'row', gap: 12 },
  lineImage: { width: 110, height: 92, borderRadius: RADIUS.md },
  promoTag: {
    position: 'absolute', top: -6, right: -8, backgroundColor: COLORS.danger,
    borderRadius: RADIUS.pill, paddingHorizontal: 8, paddingVertical: 2,
  },
  promoTagText: { fontFamily: FONTS.bold, fontSize: 11, color: COLORS.white },
  lineTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 6 },
  lineName: { fontFamily: FONTS.bold, fontSize: 14, lineHeight: 19, color: COLORS.text, flex: 1 },
  lineDesc: { ...TYPE.caption, marginTop: 2 },
  lineOptions: { ...TYPE.caption, color: COLORS.primary, marginTop: 2 },
  lineBottom: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 6, marginTop: 6 },
  linePrice: { fontFamily: FONTS.bold, fontSize: 16, color: COLORS.primary },

  pill: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.surface,
    borderRadius: RADIUS.pill, paddingHorizontal: 4, height: 36, ...SHADOWS.sm,
    borderWidth: 1, borderColor: COLORS.divider,
  },
  pillBtn: { width: 28, height: 28, alignItems: 'center', justifyContent: 'center' },
  pillValue: { fontFamily: FONTS.semibold, fontSize: 15, color: COLORS.text, minWidth: 20, textAlign: 'center' },

  // Code promo
  promo: {
    backgroundColor: COLORS.primarySoft, borderRadius: RADIUS.xl, padding: 14, marginBottom: 14,
    borderWidth: 1, borderColor: COLORS.primaryLight,
  },
  promoTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  giftTile: { width: 46, height: 46, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  promoTitle: { fontFamily: FONTS.bold, fontSize: 15, color: COLORS.text },
  promoCaption: { fontFamily: FONTS.regular, fontSize: 11, lineHeight: 15, color: COLORS.textMuted },
  promoInputRow: {
    flexDirection: 'row', alignItems: 'center', marginTop: 12,
    backgroundColor: COLORS.surface, borderRadius: RADIUS.pill, height: 48, paddingLeft: 16, paddingRight: 4,
    borderWidth: 1, borderColor: COLORS.primaryLight,
  },
  promoInput: { flex: 1, fontFamily: FONTS.medium, fontSize: 14, color: COLORS.text, paddingVertical: 0 },
  promoBtn: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  couponApplied: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: COLORS.successSoft, borderRadius: RADIUS.xl, padding: 14, marginBottom: 14,
  },
  couponAppliedIcon: {
    width: 38, height: 38, borderRadius: 19, backgroundColor: COLORS.surface,
    alignItems: 'center', justifyContent: 'center',
  },
  couponAppliedTitle: { fontFamily: FONTS.semibold, fontSize: 13, color: COLORS.success },
  couponAppliedSub: { ...TYPE.caption, color: COLORS.success },

  // Récapitulatif
  summary: { marginBottom: 8 },
  summaryTitle: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  sumRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 5 },
  sumLabel: { ...TYPE.body, color: COLORS.textMuted, flex: 1 },
  sumValue: { fontFamily: FONTS.semibold, fontSize: 14, color: COLORS.text },
  totalRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  totalLabel: { fontFamily: FONTS.bold, fontSize: 17, color: COLORS.text },
  totalValue: { fontFamily: FONTS.bold, fontSize: 22, color: COLORS.primary },

  // Barre du bas
  bar: { position: 'absolute', left: 14, right: 14 },
  guestNote: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, alignSelf: 'center',
    backgroundColor: COLORS.surface, borderRadius: RADIUS.pill, paddingHorizontal: 14, paddingVertical: 6,
    marginBottom: 10, ...SHADOWS.sm,
  },
  guestNoteText: { fontFamily: FONTS.medium, fontSize: 12, color: COLORS.text },
});
