import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuth } from '../context/AuthContext';
import { ActivityIndicator, View } from 'react-native';

import AuthNavigator   from './AuthNavigator';
import TabNavigator    from './TabNavigator';
import ItemDetailScreen        from '../screens/menu/ItemDetailScreen';
import CheckoutScreen          from '../screens/cart/CheckoutScreen';
import MobilePaymentScreen     from '../screens/cart/MobilePaymentScreen';
import OrderConfirmationScreen from '../screens/cart/OrderConfirmationScreen';
import OrderDetailScreen       from '../screens/orders/OrderDetailScreen';
import OrderTrackingScreen     from '../screens/orders/OrderTrackingScreen';
import AddAddressScreen        from '../screens/profile/AddAddressScreen';
import AddressesScreen         from '../screens/profile/AddressesScreen';
import EditProfileScreen       from '../screens/profile/EditProfileScreen';
import NotificationsScreen     from '../screens/profile/NotificationsScreen';

const Stack = createNativeStackNavigator();

export default function AppNavigator() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FF6B35' }}>
        <ActivityIndicator size="large" color="#fff" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {user ? (
          <>
            <Stack.Screen name="Main"               component={TabNavigator} />
            <Stack.Screen name="ItemDetail"         component={ItemDetailScreen} />
            <Stack.Screen name="Checkout"           component={CheckoutScreen} />
            <Stack.Screen name="MobilePayment"      component={MobilePaymentScreen} />
            <Stack.Screen name="OrderConfirmation"  component={OrderConfirmationScreen} />
            <Stack.Screen name="OrderDetail"        component={OrderDetailScreen} />
            <Stack.Screen name="OrderTracking"      component={OrderTrackingScreen} />
            <Stack.Screen name="AddAddress"         component={AddAddressScreen} />
            <Stack.Screen name="Addresses"          component={AddressesScreen} />
            <Stack.Screen name="EditProfile"        component={EditProfileScreen} />
            <Stack.Screen name="Notifications"      component={NotificationsScreen} />
          </>
        ) : (
          <Stack.Screen name="Auth" component={AuthNavigator} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
