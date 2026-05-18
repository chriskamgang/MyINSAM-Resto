import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';

import HomeScreen    from '../screens/menu/HomeScreen';
import CartScreen    from '../screens/cart/CartScreen';
import OrdersScreen  from '../screens/orders/OrdersScreen';
import ProfileScreen from '../screens/profile/ProfileScreen';

const Tab = createBottomTabNavigator();

const COLORS = {
  primary:  '#FF6B35',
  inactive: '#999',
  bg:       '#fff',
};

const TAB_ICONS = {
  Accueil:   { active: 'home',      inactive: 'home-outline' },
  Panier:    { active: 'cart',      inactive: 'cart-outline' },
  Commandes: { active: 'receipt',   inactive: 'receipt-outline' },
  Profil:    { active: 'person',    inactive: 'person-outline' },
};

function CartTabIcon({ focused, color }) {
  const { totalItems } = useCart();
  return (
    <View>
      <Ionicons name={focused ? 'cart' : 'cart-outline'} size={24} color={color} />
      {totalItems > 0 && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{totalItems > 99 ? '99+' : totalItems}</Text>
        </View>
      )}
    </View>
  );
}

function LoginPromptScreen({ navigation, icon, title, message }) {
  return (
    <View style={styles.loginPrompt}>
      <Ionicons name={icon} size={64} color="#ddd" />
      <Text style={styles.loginPromptTitle}>{title}</Text>
      <Text style={styles.loginPromptMessage}>{message}</Text>
      <TouchableOpacity
        style={styles.loginPromptBtn}
        onPress={() => navigation.navigate('Auth', { screen: 'Login' })}
      >
        <Text style={styles.loginPromptBtnText}>Se connecter</Text>
      </TouchableOpacity>
      <TouchableOpacity
        onPress={() => navigation.navigate('Auth', { screen: 'Register' })}
        style={{ marginTop: 12 }}
      >
        <Text style={styles.loginPromptLink}>Pas de compte ? S'inscrire</Text>
      </TouchableOpacity>
    </View>
  );
}

function AuthGatedCart(props) {
  const { user } = useAuth();
  if (!user) return <LoginPromptScreen {...props} icon="cart-outline" title="Votre panier" message="Connectez-vous pour ajouter des articles et passer commande." />;
  return <CartScreen {...props} />;
}

function AuthGatedOrders(props) {
  const { user } = useAuth();
  if (!user) return <LoginPromptScreen {...props} icon="receipt-outline" title="Vos commandes" message="Connectez-vous pour voir l'historique de vos commandes." />;
  return <OrdersScreen {...props} />;
}

function AuthGatedProfile(props) {
  const { user } = useAuth();
  if (!user) return <LoginPromptScreen {...props} icon="person-outline" title="Votre profil" message="Connectez-vous pour acceder a votre profil et vos parametres." />;
  return <ProfileScreen {...props} />;
}

export default function TabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: COLORS.inactive,
        tabBarStyle: {
          backgroundColor: COLORS.bg,
          borderTopWidth: 0,
          elevation: 20,
          shadowColor: '#000',
          shadowOpacity: 0.08,
          shadowRadius: 10,
          height: 65,
          paddingBottom: 10,
          paddingTop: 8,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
        },
        tabBarIcon: ({ focused, color }) => {
          if (route.name === 'Panier') return <CartTabIcon focused={focused} color={color} />;
          const iconName = focused ? TAB_ICONS[route.name].active : TAB_ICONS[route.name].inactive;
          return <Ionicons name={iconName} size={24} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Accueil"   component={HomeScreen} />
      <Tab.Screen name="Panier"    component={AuthGatedCart} />
      <Tab.Screen name="Commandes" component={AuthGatedOrders} />
      <Tab.Screen name="Profil"    component={AuthGatedProfile} />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  badge: {
    position: 'absolute',
    right: -6,
    top: -4,
    backgroundColor: '#FF6B35',
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 3,
  },
  badgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  loginPrompt: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    paddingHorizontal: 40,
  },
  loginPromptTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#1F2937',
    marginTop: 20,
    marginBottom: 8,
  },
  loginPromptMessage: {
    fontSize: 15,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 28,
  },
  loginPromptBtn: {
    backgroundColor: '#FF6B35',
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 48,
    shadowColor: '#FF6B35',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  loginPromptBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  loginPromptLink: {
    color: '#FF6B35',
    fontSize: 15,
    fontWeight: '600',
  },
});
