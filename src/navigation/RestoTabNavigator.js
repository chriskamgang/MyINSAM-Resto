import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import EstuaireTabBar from './EstuaireTabBar';

import RestoDashboardScreen from '../screens/resto/RestoDashboardScreen';
import RestoOrdersScreen from '../screens/resto/RestoOrdersScreen';
import NotificationsScreen from '../screens/profile/NotificationsScreen';
import ProfileScreen from '../screens/profile/ProfileScreen';

const Tab = createBottomTabNavigator();

const TAB_ICONS = {
  Dashboard:     { active: 'grid',          inactive: 'grid-outline' },
  Commandes:     { active: 'receipt',       inactive: 'receipt-outline' },
  Notifications: { active: 'notifications', inactive: 'notifications-outline' },
  Profil:        { active: 'person',        inactive: 'person-outline' },
};

export default function RestoTabNavigator() {
  return (
    <Tab.Navigator
      tabBar={(props) => <EstuaireTabBar {...props} />}
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarIcon: ({ focused, color, size }) => {
          const icons = TAB_ICONS[route.name];
          return <Ionicons name={focused ? icons.active : icons.inactive} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Dashboard" component={RestoDashboardScreen} options={{ tabBarLabel: 'Accueil' }} />
      <Tab.Screen name="Commandes" component={RestoOrdersScreen} />
      <Tab.Screen name="Notifications" component={NotificationsScreen} />
      <Tab.Screen name="Profil" component={ProfileScreen} />
    </Tab.Navigator>
  );
}
