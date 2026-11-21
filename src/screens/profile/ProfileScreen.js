import { showAlert } from '../../utils/showAlert';
import React from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, Linking, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Constants from 'expo-constants';
import { useAuth } from '../../context/AuthContext';
import { profileService } from '../../services/profileService';
import { Screen, Card, ListRow, Divider, SmartImage } from '../../components/ui';
import { COLORS, FONTS, TYPE, SHADOWS, SCREEN_PADDING } from '../../theme';
import { useTabBarSpace } from '../../hooks/useTabBarSpace';

const EXTRA = Constants.expoConfig?.extra || {};
// Les liens ne sont ouverts que lorsqu'une page Estuaire Eat est configurée.
const PRIVACY_URL = EXTRA.privacyPolicyUrl;
const TERMS_URL = EXTRA.termsOfServiceUrl;
const SUPPORT_PHONE = (EXTRA.supportPhone || '+237659339778').replace(/\D/g, '');
const SUPPORT_EMAIL = EXTRA.supportEmail || 'support@myinsam.cm';
const APP_VERSION = Constants.expoConfig?.version || '1.0.0';
const BUILD = Platform.OS === 'ios'
  ? Constants.expoConfig?.ios?.buildNumber
  : Constants.expoConfig?.android?.versionCode;
const ANDROID_PACKAGE = Constants.expoConfig?.android?.package;

function openUrl(url) {
  if (!url) { showAlert('Document indisponible', 'Le document officiel Estuaire Eat sera ajouté dès sa publication. Contactez le support pour toute question.'); return; }
  Linking.openURL(url).catch(() => showAlert('Erreur', "Impossible d'ouvrir ce lien."));
}

function Group({ title, children }) {
  const rows = React.Children.toArray(children).filter(Boolean);
  return (
    <View style={styles.group}>
      {title ? <View style={styles.groupHeading}><View style={styles.groupMark} /><Text style={styles.groupTitle}>{title}</Text></View> : null}
      <Card style={styles.groupCard} padded={false}>
        {rows.map((row, i) => (
          <React.Fragment key={i}>
            {i > 0 ? <Divider style={styles.rowDivider} /> : null}
            {row}
          </React.Fragment>
        ))}
      </Card>
    </View>
  );
}

function QuickAction({ icon, label, onPress }) {
  return (
    <TouchableOpacity style={styles.quickAction} onPress={onPress} activeOpacity={0.82} accessibilityLabel={label}>
      <View style={styles.quickIcon}><Ionicons name={icon} size={22} color={COLORS.primary} /></View>
      <Text style={styles.quickLabel} numberOfLines={1}>{label}</Text>
    </TouchableOpacity>
  );
}

export default function ProfileScreen({ navigation }) {
  const tabSpace = useTabBarSpace();
  const insets = useSafeAreaInsets();
  const { user, logout } = useAuth();

  const handleLogout = () => {
    showAlert(
      'Déconnexion',
      'Voulez-vous vraiment vous déconnecter ?',
      [
        { text: 'Annuler', style: 'cancel' },
        { text: 'Se déconnecter', style: 'destructive', onPress: logout },
      ]
    );
  };

  const handleDeleteAccount = () => {
    showAlert(
      'Supprimer mon compte',
      'Cette action est irréversible. Toutes vos données seront supprimées définitivement. Voulez-vous continuer ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer', style: 'destructive',
          onPress: () => {
            showAlert(
              'Confirmation finale',
              'Êtes-vous absolument certain ? Cette action ne peut pas être annulée.',
              [
                { text: 'Non, garder mon compte', style: 'cancel' },
                {
                  text: 'Oui, supprimer', style: 'destructive',
                  onPress: async () => {
                    try {
                      await profileService.deleteAccount();
                      await logout();
                    } catch (e) {
                      showAlert('Erreur', e.response?.data?.message || 'Impossible de supprimer le compte.');
                    }
                  },
                },
              ]
            );
          },
        },
      ]
    );
  };

  const contactWhatsApp = () => {
    const msg = encodeURIComponent("Bonjour, j'ai besoin d'aide avec l'application Estuaire Eat.");
    Linking.openURL(`https://wa.me/${SUPPORT_PHONE}?text=${msg}`)
      .catch(() => showAlert('Support', `Contactez-nous au +${SUPPORT_PHONE}.`));
  };

  const showAbout = () => {
    showAlert(
      'Estuaire Eat',
      `Version ${APP_VERSION}${BUILD ? ` (${BUILD})` : ''}\nLivraison de repas à Bafoussam.`
    );
  };

  const avatarUri = user?.avatar_url || user?.avatar || user?.photo || null;
  const initial = user?.name?.charAt(0)?.toUpperCase() || '?';
  const goEdit = () => navigation.navigate('EditProfile');
  const goOrders = () => navigation.navigate(user?.role === 'restaurant_admin' ? 'Commandes' : 'Orders');

  return (
    <Screen edges={[]} bg="#FFF8F3" statusBar="light-content">
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: tabSpace + 12 }}
      >
        <LinearGradient colors={['#160904', '#72300C', '#FF7100']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.cover, { paddingTop: insets.top + 14 }]}>
          <View style={styles.coverOrbLarge} />
          <View style={styles.coverOrbSmall} />
          <View style={styles.coverTop}>
            <View><Text style={styles.coverEyebrow}>ESTUAIRE <Text style={styles.coverEat}>EAT_</Text></Text><Text style={styles.coverTitle}>Mon profil</Text></View>
            <View style={styles.coverIcon}><Ionicons name="person-outline" size={22} color="#fff" /></View>
          </View>
          <Text style={styles.coverSub}>Votre espace personnel</Text>
        </LinearGradient>

        {/* Fiche personnelle : les données restent celles du compte connecté. */}
        <View style={styles.profileCard}>
          <View style={styles.profileTop}>
            <TouchableOpacity onPress={goEdit} activeOpacity={0.85} style={styles.avatarRing} accessibilityLabel="Modifier ma photo et mon profil">
              {avatarUri ? (
                <SmartImage uri={avatarUri} style={styles.avatar} fallbackIcon="person" iconSize={30} />
              ) : (
                <View style={[styles.avatar, styles.avatarFallback]}>
                  <Text style={styles.avatarText}>{initial}</Text>
                </View>
              )}
              <View style={styles.avatarCamera}><Ionicons name="camera" size={12} color="#fff" /></View>
            </TouchableOpacity>
            <TouchableOpacity style={styles.editPill} onPress={goEdit} activeOpacity={0.85} accessibilityLabel="Modifier le profil">
              <Ionicons name="create-outline" size={16} color={COLORS.primary} />
              <Text style={styles.editPillText}>Modifier</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.name} numberOfLines={2}>{user?.name || 'Utilisateur'}</Text>
          <View style={styles.profileDetails}>
            {user?.email ? (
              <View style={styles.metaRow}>
                <Ionicons name="mail-outline" size={16} color={COLORS.primary} />
                <Text style={styles.metaText} selectable>{user.email}</Text>
              </View>
            ) : null}
            {user?.phone ? (
              <View style={styles.metaRow}>
                <Ionicons name="call-outline" size={16} color={COLORS.primary} />
                <Text style={styles.metaText} selectable>{user.phone}</Text>
              </View>
            ) : null}
          </View>
          <TouchableOpacity style={styles.profileEditLink} onPress={goEdit} activeOpacity={0.85}>
            <Text style={styles.profileEditText}>Gérer mes informations</Text>
            <Ionicons name="arrow-forward" size={16} color={COLORS.primary} />
          </TouchableOpacity>
        </View>

        <View style={styles.quickRow}>
          <QuickAction icon="receipt-outline" label="Commandes" onPress={goOrders} />
          <QuickAction icon="location-outline" label="Adresses" onPress={() => navigation.navigate('Addresses')} />
          <QuickAction icon="heart-outline" label="Favoris" onPress={() => navigation.navigate('Favorites')} />
        </View>

        <Group title="Mon compte">
          <ListRow icon="person-outline" title="Modifier le profil" subtitle="Photo, nom, téléphone" onPress={goEdit} />
          <ListRow
            icon="location-outline" title="Mes adresses" subtitle="Gérer vos adresses de livraison"
            onPress={() => navigation.navigate('Addresses')}
          />
          <ListRow
            icon="heart-outline" title="Mes favoris" subtitle="Restaurants et plats enregistrés"
            onPress={() => navigation.navigate('Favorites')}
          />
          <ListRow
            icon="notifications-outline" title="Notifications" subtitle="Vos alertes et messages"
            onPress={() => navigation.navigate('Notifications')}
          />
        </Group>

        <Group title="Commandes">
          <ListRow
            icon="receipt-outline" title="Mes commandes" subtitle="Historique de toutes vos commandes"
            onPress={goOrders}
          />
          <ListRow icon="basket-outline" title="Mon Marché" subtitle="Faire mes courses au marché" onPress={() => navigation.navigate('MarketHome')} />
        </Group>

        <Group title="Aide & support">
          <ListRow
            icon="logo-whatsapp" iconColor={COLORS.success} iconBg={COLORS.successSoft}
            title="Nous écrire sur WhatsApp" subtitle={`+${SUPPORT_PHONE}`}
            onPress={contactWhatsApp}
          />
          <ListRow
            icon="mail-outline" title="Envoyer un email" subtitle={SUPPORT_EMAIL}
            onPress={() => openUrl(`mailto:${SUPPORT_EMAIL}`)}
          />
          {Platform.OS === 'android' && ANDROID_PACKAGE ? (
            <ListRow
              icon="star-outline" iconColor={COLORS.star} iconBg={COLORS.warningSoft}
              title="Noter l'application"
              onPress={() => openUrl(`https://play.google.com/store/apps/details?id=${ANDROID_PACKAGE}`)}
            />
          ) : null}
          <ListRow icon="information-circle-outline" title="À propos" subtitle={`Version ${APP_VERSION}`} onPress={showAbout} />
        </Group>

        <Group title="Légal">
          <ListRow
            icon="lock-closed-outline" title="Politique de confidentialité"
            subtitle="Comment nous protégeons vos données"
            onPress={() => openUrl(PRIVACY_URL)}
          />
          <ListRow
            icon="document-text-outline" title="Conditions d'utilisation"
            subtitle="Nos conditions générales"
            onPress={() => openUrl(TERMS_URL)}
          />
        </Group>

        <Group>
          <ListRow icon="log-out-outline" title="Se déconnecter" onPress={handleLogout} danger showChevron={false} />
          <ListRow
            icon="trash-outline" title="Supprimer mon compte" subtitle="Cette action est irréversible"
            onPress={handleDeleteAccount} danger showChevron={false}
          />
        </Group>

        <Text style={styles.version}>
          Estuaire Eat · Version {APP_VERSION}{BUILD ? ` (${BUILD})` : ''}
        </Text>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  cover: { height: 202, paddingHorizontal: SCREEN_PADDING, overflow: 'hidden' },
  coverOrbLarge: { position: 'absolute', width: 230, height: 230, borderRadius: 115, borderWidth: 1, borderColor: 'rgba(255,198,112,0.35)', right: -78, top: 28 },
  coverOrbSmall: { position: 'absolute', width: 142, height: 142, borderRadius: 71, borderWidth: 1, borderColor: 'rgba(255,198,112,0.24)', right: -28, top: 72 },
  coverTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  coverEyebrow: { color: '#fff', fontFamily: FONTS.extrabold, fontStyle: 'italic', fontSize: 13, letterSpacing: 0.4 },
  coverEat: { color: '#FFB13B' },
  coverTitle: { color: '#fff', fontFamily: FONTS.bold, fontSize: 27, lineHeight: 34, marginTop: 13 },
  coverIcon: { width: 42, height: 42, borderRadius: 21, borderWidth: 1, borderColor: 'rgba(255,255,255,0.43)', backgroundColor: 'rgba(255,255,255,0.13)', alignItems: 'center', justifyContent: 'center' },
  coverSub: { color: '#FFE6D6', fontFamily: FONTS.medium, fontSize: 12, marginTop: 3 },
  profileCard: { marginHorizontal: SCREEN_PADDING, marginTop: -27, paddingHorizontal: 18, paddingBottom: 14, borderRadius: 22, backgroundColor: '#fff', ...SHADOWS.md },
  profileTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  avatarRing: {
    width: 90, height: 90, borderRadius: 45, padding: 4,
    borderWidth: 3, borderColor: '#fff', marginTop: -40,
    backgroundColor: '#fff', ...SHADOWS.sm,
  },
  avatar: { width: '100%', height: '100%', borderRadius: 42 },
  avatarFallback: { backgroundColor: '#FFF0E6', alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontFamily: FONTS.bold, fontSize: 33, color: COLORS.primary },
  avatarCamera: { position: 'absolute', right: 0, bottom: 1, width: 24, height: 24, borderRadius: 12, backgroundColor: COLORS.primary, borderWidth: 2, borderColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  name: { fontFamily: FONTS.bold, fontSize: 20, lineHeight: 27, color: COLORS.text, marginTop: 5 },
  profileDetails: { gap: 7, marginTop: 7 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  metaText: { fontFamily: FONTS.regular, fontSize: 12, lineHeight: 18, color: COLORS.textMuted, flex: 1 },
  editPill: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: COLORS.primarySoft, borderRadius: 20,
    paddingHorizontal: 13, paddingVertical: 8, marginTop: 12,
  },
  editPillText: { fontFamily: FONTS.semibold, fontSize: 12, color: COLORS.primary },
  profileEditLink: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: COLORS.divider, marginTop: 13, paddingTop: 11 },
  profileEditText: { fontFamily: FONTS.semibold, fontSize: 11, color: COLORS.primary },

  quickRow: { flexDirection: 'row', gap: 9, marginHorizontal: SCREEN_PADDING, marginTop: 15, marginBottom: 22 },
  quickAction: { flex: 1, height: 79, borderRadius: 18, backgroundColor: '#fff', borderWidth: 1, borderColor: '#F6E6DA', alignItems: 'center', justifyContent: 'center', ...SHADOWS.sm },
  quickIcon: { width: 36, height: 36, borderRadius: 12, backgroundColor: COLORS.primarySoft, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  quickLabel: { fontFamily: FONTS.semibold, fontSize: 10, color: COLORS.text },

  group: { marginHorizontal: SCREEN_PADDING, marginBottom: 19 },
  groupHeading: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 9, marginLeft: 2 },
  groupMark: { width: 4, height: 19, borderRadius: 2, backgroundColor: COLORS.primary },
  groupTitle: {
    fontFamily: FONTS.bold, fontSize: 14, color: COLORS.text,
  },
  groupCard: { paddingHorizontal: 14, paddingVertical: 4, borderRadius: 19, borderWidth: 1, borderColor: '#F6EBE4', ...SHADOWS.sm },
  rowDivider: { marginLeft: 54 },

  version: { ...TYPE.caption, color: COLORS.textLight, textAlign: 'center', marginTop: 4 },
});
