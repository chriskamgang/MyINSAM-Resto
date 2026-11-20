import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text, StyleSheet, TouchableOpacity } from 'react-native';
import { COLORS, FONTS } from '../theme';
import EstuaireTabBar from './EstuaireTabBar';
import { Screen, EmptyState } from '../components/ui';
import { Ionicons } from '@expo/vector-icons';
import { useCart } from '../context/CartContext';
import { useMarket } from '../context/MarketContext';
import { useAuth } from '../context/AuthContext';

import HomeScreen    from '../screens/menu/HomeScreen';
import MarketHomeScreen from '../screens/market/MarketHomeScreen';
import CartScreen    from '../screens/cart/CartScreen';
import FavoritesScreen from '../screens/profile/FavoritesScreen';
import ProfileScreen from '../screens/profile/ProfileScreen';

const Tab = createBottomTabNavigator();

const TAB_ICONS = {
  Accueil:   { active: 'home',      inactive: 'home-outline' },
  Marché:    { active: 'basket',    inactive: 'basket-outline' },
  Panier:    { active: 'cart',      inactive: 'cart-outline' },
  Favoris:   { active: 'heart',     inactive: 'heart-outline' },
  Profil:    { active: 'person',    inactive: 'person-outline' },
};

function TabIcon({ name, focused, color, size = 23 }) {
  const icons = TAB_ICONS[name];
  return <Ionicons name={focused ? icons.active : icons.inactive} size={size} color={color} />;
}

function LoginPromptScreen({ navigation, icon, title, message }) {
  return (
    <Screen>
      <EmptyState
        icon={icon}
        title={title}
        message={message}
        actionLabel="Se connecter"
        onAction={() => navigation.navigate('Auth', { screen: 'Login' })}
        style={{ flex: 1, justifyContent: 'center' }}
      />
      <TouchableOpacity
        onPress={() => navigation.navigate('Auth', { screen: 'Register' })}
        style={{ alignItems: 'center', paddingBottom: 40 }}
      >
        <Text style={styles.loginPromptLink}>Pas de compte ? S'inscrire</Text>
      </TouchableOpacity>
    </Screen>
  );
}

function AuthGatedFavorites(props) {
  const { user } = useAuth();
  if (!user) return <LoginPromptScreen {...props} icon="heart-outline" title="Vos favoris" message="Connectez-vous pour retrouver vos restaurants et plats favoris." />;
  return <FavoritesScreen {...props} isTab />;
}

function AuthGatedMarket(props) {
  const { user } = useAuth();
  if (!user) return <LoginPromptScreen {...props} icon="basket-outline" title="Mon Marché" message="Connectez-vous pour faire vos courses au marché." />;
  return <MarketHomeScreen {...props} />;
}

function AuthGatedProfile(props) {
  const { user } = useAuth();
  if (!user) return <LoginPromptScreen {...props} icon="person-outline" title="Votre profil" message="Connectez-vous pour accéder à votre profil et vos paramètres." />;
  return <ProfileScreen {...props} />;
}

export default function TabNavigator() {
  const { totalItems } = useCart();
  const { totalItems: marketItems } = useMarket();
  return (
    <Tab.Navigator
      tabBar={(props) => <EstuaireTabBar {...props} centerRoute="Panier" />}
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarIcon: ({ focused, color, size }) => <TabIcon name={route.name} focused={focused} color={color} size={size} />,
      })}
    >
      <Tab.Screen name="Accueil"   component={HomeScreen} />
      <Tab.Screen name="Marché"   component={AuthGatedMarket} options={{ tabBarBadge: marketItems || undefined }} />
      <Tab.Screen name="Panier"    component={CartScreen} options={{ tabBarBadge: totalItems || undefined }} />
      <Tab.Screen name="Favoris"   component={AuthGatedFavorites} />
      <Tab.Screen name="Profil"    component={AuthGatedProfile} />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  loginPromptLink: { color: COLORS.primary, fontSize: 14, fontFamily: FONTS.semibold },
});
