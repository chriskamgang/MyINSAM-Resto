import React from 'react';
import { View, ActivityIndicator } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import {
  useFonts,
  Poppins_400Regular,
  Poppins_500Medium,
  Poppins_600SemiBold,
  Poppins_700Bold,
  Poppins_800ExtraBold,
} from '@expo-google-fonts/poppins';
import { AuthProvider } from './src/context/AuthContext';
import { CartProvider } from './src/context/CartContext';
import { MarketProvider } from './src/context/MarketContext';
import { DeliveryLocationProvider } from './src/context/DeliveryLocationContext';
import { FavoritesProvider } from './src/context/FavoritesContext';
import AppNavigator from './src/navigation/AppNavigator';
import { COLORS } from './src/theme';
import { useOtaUpdates } from './src/hooks/useOtaUpdates';

export default function App() {
  useOtaUpdates();
  const [fontsLoaded, fontError] = useFonts({
    Poppins_400Regular,
    Poppins_500Medium,
    Poppins_600SemiBold,
    Poppins_700Bold,
    Poppins_800ExtraBold,
  });

  // Si la police échoue (rare), on continue avec la police système plutôt que bloquer l'app
  if (!fontsLoaded && !fontError) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.primary }}>
        <ActivityIndicator size="large" color="#fff" />
      </View>
    );
  }

  // Chaque écran gère sa safe area via <Screen> (src/components/ui),
  // pour permettre les fonds plein écran (connexion, photos de restaurant).
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <AuthProvider>
          <FavoritesProvider>
            <DeliveryLocationProvider>
              <CartProvider>
                <MarketProvider>
                  <StatusBar style="dark" translucent />
                  <AppNavigator />
                </MarketProvider>
              </CartProvider>
            </DeliveryLocationProvider>
          </FavoritesProvider>
        </AuthProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
