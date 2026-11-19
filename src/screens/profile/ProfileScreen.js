import React from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, Linking, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import { useAuth } from '../../context/AuthContext';
import { profileService } from '../../services/profileService';
import { Screen, Card, ListRow, Divider, SmartImage } from '../../components/ui';
import { COLORS, FONTS, TYPE, RADIUS, SHADOWS, SCREEN_PADDING } from '../../theme';
import { useTabBarSpace } from '../../hooks/useTabBarSpace';

const EXTRA = Constants.expoConfig?.extra || {};
// app.json contient encore des URL d'exemple (votresite.com) : on retombe alors sur les pages du site.
const pickUrl = (value, fallback) => (value && !/votresite\.com/.test(value) ? value : fallback);
const PRIVACY_URL = pickUrl(EXTRA.privacyPolicyUrl, 'https://restaurant.iues-insambot.com/privacy-policy');
const TERMS_URL = pickUrl(EXTRA.termsOfServiceUrl, 'https://restaurant.iues-insambot.com/terms-of-service');
const SUPPORT_PHONE = (EXTRA.supportPhone || '+237659339778').replace(/\D/g, '');
const SUPPORT_EMAIL = EXTRA.supportEmail || 'support@myinsam.cm';
const APP_VERSION = Constants.expoConfig?.version || '1.0.0';
const BUILD = Platform.OS === 'ios'
  ? Constants.expoConfig?.ios?.buildNumber
  : Constants.expoConfig?.android?.versionCode;
const ANDROID_PACKAGE = Constants.expoConfig?.android?.package;

function openUrl(url) {
  Linking.openURL(url).catch(() => Alert.alert('Erreur', "Impossible d'ouvrir ce lien."));
}

function Group({ title, children }) {
  const rows = React.Children.toArray(children).filter(Boolean);
  return (
    <View style={styles.group}>
      {title ? <Text style={styles.groupTitle}>{title}</Text> : null}
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

export default function ProfileScreen({ navigation }) {
  const tabSpace = useTabBarSpace();
  const { user, logout } = useAuth();

  const handleLogout = () => {
    Alert.alert(
      'Déconnexion',
      'Voulez-vous vraiment vous déconnecter ?',
      [
        { text: 'Annuler', style: 'cancel' },
        { text: 'Se déconnecter', style: 'destructive', onPress: logout },
      ]
    );
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Supprimer mon compte',
      'Cette action est irréversible. Toutes vos données seront supprimées définitivement. Voulez-vous continuer ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer', style: 'destructive',
          onPress: () => {
            Alert.alert(
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
                      Alert.alert('Erreur', e.response?.data?.message || 'Impossible de supprimer le compte.');
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
      .catch(() => Alert.alert('Support', `Contactez-nous au +${SUPPORT_PHONE}.`));
  };

  const showAbout = () => {
    Alert.alert(
      'Estuaire Eat',
      `Version ${APP_VERSION}${BUILD ? ` (${BUILD})` : ''}\nLivraison de repas à Bafoussam.`
    );
  };

  const avatarUri = user?.avatar_url || user?.avatar || user?.photo || null;
  const initial = user?.name?.charAt(0)?.toUpperCase() || '?';
  const goEdit = () => navigation.navigate('EditProfile');

  return (
    <Screen>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: tabSpace }}
      >
        <View style={styles.titleRow}>
          <Text style={TYPE.h1}>Mon profil</Text>
        </View>

        {/* ── Carte d'identité ── */}
        <Card style={styles.profileCard}>
          <TouchableOpacity onPress={goEdit} activeOpacity={0.85} style={styles.avatarRing}>
            {avatarUri ? (
              <SmartImage uri={avatarUri} style={styles.avatar} fallbackIcon="person" iconSize={30} />
            ) : (
              <View style={[styles.avatar, styles.avatarFallback]}>
                <Text style={styles.avatarText}>{initial}</Text>
              </View>
            )}
          </TouchableOpacity>

          <View style={{ flex: 1 }}>
            <Text style={styles.name} numberOfLines={1}>{user?.name || 'Utilisateur'}</Text>
            {user?.email ? (
              <View style={styles.metaRow}>
                <Ionicons name="mail-outline" size={13} color={COLORS.textMuted} />
                <Text style={styles.metaText} numberOfLines={1}>{user.email}</Text>
              </View>
            ) : null}
            {user?.phone ? (
              <View style={styles.metaRow}>
                <Ionicons name="call-outline" size={13} color={COLORS.textMuted} />
                <Text style={styles.metaText} numberOfLines={1}>{user.phone}</Text>
              </View>
            ) : null}
          </View>

          <TouchableOpacity style={styles.editPill} onPress={goEdit} activeOpacity={0.85}>
            <Ionicons name="create-outline" size={14} color={COLORS.primary} />
            <Text style={styles.editPillText}>Modifier</Text>
          </TouchableOpacity>
        </Card>

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
            onPress={() => navigation.navigate('Orders')}
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
  titleRow: { paddingHorizontal: SCREEN_PADDING, paddingTop: 12, paddingBottom: 16 },

  profileCard: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    marginHorizontal: SCREEN_PADDING, marginBottom: 24,
  },
  avatarRing: {
    width: 74, height: 74, borderRadius: 37, padding: 3,
    borderWidth: 2.5, borderColor: COLORS.primary,
  },
  avatar: { width: '100%', height: '100%', borderRadius: 34 },
  avatarFallback: { backgroundColor: COLORS.primarySoft, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontFamily: FONTS.bold, fontSize: 26, color: COLORS.primary },
  name: { ...TYPE.h3, marginBottom: 2 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 1 },
  metaText: { ...TYPE.caption, flexShrink: 1 },
  editPill: {
    flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start',
    backgroundColor: COLORS.primarySoft, borderRadius: RADIUS.pill,
    paddingHorizontal: 12, paddingVertical: 7,
  },
  editPillText: { fontFamily: FONTS.semibold, fontSize: 12, color: COLORS.primary },

  group: { marginHorizontal: SCREEN_PADDING, marginBottom: 20 },
  groupTitle: {
    fontFamily: FONTS.semibold, fontSize: 12, color: COLORS.textMuted,
    textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 8, marginLeft: 4,
  },
  groupCard: { paddingHorizontal: 14, paddingVertical: 4, ...SHADOWS.sm },
  rowDivider: { marginLeft: 54 },

  version: { ...TYPE.caption, color: COLORS.textLight, textAlign: 'center', marginTop: 4 },
});
