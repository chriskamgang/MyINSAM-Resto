import React, { useState, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuth } from '../context/AuthContext';
import { ActivityIndicator, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import AuthNavigator   from './AuthNavigator';
import TabNavigator    from './TabNavigator';
import RestoTabNavigator from './RestoTabNavigator';
import RestaurantScreen        from '../screens/menu/RestaurantScreen';
import ItemDetailScreen        from '../screens/menu/ItemDetailScreen';
import CheckoutScreen          from '../screens/cart/CheckoutScreen';
import MobilePaymentScreen     from '../screens/cart/MobilePaymentScreen';
import GfsPaymentScreen        from '../screens/cart/GfsPaymentScreen';
import OrderConfirmationScreen from '../screens/cart/OrderConfirmationScreen';
import OrderDetailScreen       from '../screens/orders/OrderDetailScreen';
import OrderTrackingScreen     from '../screens/orders/OrderTrackingScreen';
import AddAddressScreen        from '../screens/profile/AddAddressScreen';
import AddressesScreen         from '../screens/profile/AddressesScreen';
import EditProfileScreen       from '../screens/profile/EditProfileScreen';
import NotificationsScreen     from '../screens/profile/NotificationsScreen';
import FavoritesScreen         from '../screens/profile/FavoritesScreen';
import MarketHomeScreen             from '../screens/market/MarketHomeScreen';
import CreateMarketListScreen      from '../screens/market/CreateMarketListScreen';
import MarketOrderSummaryScreen    from '../screens/market/MarketOrderSummaryScreen';
import MarketOrderDetailScreen     from '../screens/market/MarketOrderDetailScreen';
import MarketOrderTrackingScreen   from '../screens/market/MarketOrderTrackingScreen';
import RestoOrderDetailScreen      from '../screens/resto/RestoOrderDetailScreen';

const Stack = createNativeStackNavigator();

export default function AppNavigator() {
  const { user, loading } = useAuth();
  const [onboardingSeen, setOnboardingSeen] = useState(null);

  useEffect(() => {
    AsyncStorage.getItem('@onboarding_done').then(val => {
      setOnboardingSeen(!!val);
    }).catch(() => setOnboardingSeen(false));
  }, []);

  if (loading || onboardingSeen === null) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FF6B35' }}>
        <ActivityIndicator size="large" color="#fff" />
      </View>
    );
  }

  const isRestaurantAdmin = user?.role === 'restaurant_admin';

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }} initialRouteName={onboardingSeen ? 'Main' : 'Auth'}>
        {/* Main screen — switches based on role */}
        <Stack.Screen name="Main" component={isRestaurantAdmin ? RestoTabNavigator : TabNavigator} />

        {/* Restaurant admin screens */}
        <Stack.Screen name="RestoOrderDetail" component={RestoOrderDetailScreen} />

        {/* Menu browsing */}
        <Stack.Screen name="Restaurant"         component={RestaurantScreen} />
        <Stack.Screen name="ItemDetail"         component={ItemDetailScreen} />

        {/* Auth screens */}
        <Stack.Screen name="Auth"               component={AuthNavigator} />

        {/* Client screens */}
        <Stack.Screen name="Checkout"           component={CheckoutScreen} />
        <Stack.Screen name="MobilePayment"      component={MobilePaymentScreen} />
        <Stack.Screen name="GfsPayment"         component={GfsPaymentScreen} />
        <Stack.Screen name="OrderConfirmation"  component={OrderConfirmationScreen} />
        <Stack.Screen name="OrderDetail"        component={OrderDetailScreen} />
        <Stack.Screen name="OrderTracking"      component={OrderTrackingScreen} />
        <Stack.Screen name="AddAddress"         component={AddAddressScreen} />
        <Stack.Screen name="Addresses"          component={AddressesScreen} />
        <Stack.Screen name="EditProfile"        component={EditProfileScreen} />
        <Stack.Screen name="Notifications"      component={NotificationsScreen} />
        <Stack.Screen name="Favorites"          component={FavoritesScreen} />

        {/* Market screens */}
        <Stack.Screen name="MarketHome"          component={MarketHomeScreen} />
        <Stack.Screen name="CreateMarketList"    component={CreateMarketListScreen} />
        <Stack.Screen name="MarketOrderSummary"  component={MarketOrderSummaryScreen} />
        <Stack.Screen name="MarketOrderDetail"   component={MarketOrderDetailScreen} />
        <Stack.Screen name="MarketOrderTracking" component={MarketOrderTrackingScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
