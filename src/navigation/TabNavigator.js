import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View, Text, StyleSheet } from 'react-native';
import { useCart } from '../context/CartContext';

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

function TabIcon({ name, focused }) {
  const icons = {
    Menu:      focused ? '🍔' : '🍔',
    Panier:    focused ? '🛒' : '🛒',
    Commandes: focused ? '📦' : '📦',
    Profil:    focused ? '👤' : '👤',
  };
  return (
    <Text style={{ fontSize: 22, opacity: focused ? 1 : 0.5 }}>
      {icons[name]}
    </Text>
  );
}

function CartTabIcon({ focused }) {
  const { totalItems } = useCart();
  return (
    <View>
      <Text style={{ fontSize: 22, opacity: focused ? 1 : 0.5 }}>🛒</Text>
      {totalItems > 0 && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{totalItems > 99 ? '99+' : totalItems}</Text>
        </View>
      )}
    </View>
  );
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
        tabBarIcon: ({ focused }) => {
          if (route.name === 'Panier') return <CartTabIcon focused={focused} />;
          return <TabIcon name={route.name} focused={focused} />;
        },
      })}
    >
      <Tab.Screen name="Menu"      component={HomeScreen} />
      <Tab.Screen name="Panier"    component={CartScreen} />
      <Tab.Screen name="Commandes" component={OrdersScreen} />
      <Tab.Screen name="Profil"    component={ProfileScreen} />
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
});
