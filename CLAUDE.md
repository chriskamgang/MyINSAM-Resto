# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

MyINSAM Resto is a React Native (Expo SDK 54) mobile app for restaurant food delivery in Bafoussam, Cameroon. JavaScript only (no TypeScript). French UI labels, English code.

## Build & Run Commands

```bash
# Install dependencies
npm install

# Start Expo dev server
npx expo start

# Native prebuild (generates android/ and ios/ directories)
npx expo prebuild --platform android
npx expo prebuild --platform ios

# Run on specific platform
npx expo run:android
npx expo run:ios
```

No test framework is configured — there are no test scripts or test files.

## Architecture

### App Structure

Entry: `index.js` → `App.js` → wraps the app in `GestureHandlerRootView` → `SafeAreaProvider` → `AuthProvider` → `CartProvider` → `AppNavigator`.

### Navigation (React Navigation v7)

- **AppNavigator** (`src/navigation/AppNavigator.js`): Switches between auth and main flows based on `user` state from AuthContext.
- **AuthNavigator**: Stack — Splash → Onboarding → Login → Register.
- **TabNavigator**: 4 bottom tabs — Menu (Home), Panier (Cart), Commandes (Orders), Profil (Profile). Additional screens (ItemDetail, Checkout, MobilePayment, OrderConfirmation, OrderDetail, OrderTracking, AddAddress, Addresses, EditProfile, Notifications) are rendered as stack screens above the tabs.

### State Management (React Context)

- **AuthContext** (`src/context/AuthContext.js`): Holds `user`, `token`, `loading`. Persists token to AsyncStorage. Provides `login`, `register`, `logout`, `updateUser`.
- **CartContext** (`src/context/CartContext.js`): In-memory cart with `items`, `coupon`, `discount`, `subtotal`, `deliveryFee`, `total`. Cart is only cleared after successful payment confirmation.

### API Layer (`src/services/`)

- **api.js**: Axios instance with 15s timeout. Base URL switches between local dev (`localhost:8002/api` on iOS, `10.0.2.2:8002/api` on Android) and production (`https://restaurant.iues-insambot.com/api`). Request interceptor injects Bearer token; response interceptor clears credentials on 401.
- **authService.js**: Login, register, logout, me, stored user retrieval.
- **menuService.js**: Fetches restaurant and menu from hardcoded restaurant ID 1.
- **orderService.js**: CRUD for orders, tracking, cancellation, coupon validation, ratings.
- **paymentService.js**: Mobile money payment initiation (MTN/Orange) and status polling.
- **profileService.js**: Profile CRUD, address management, notifications.

### External APIs

- **Nominatim (OpenStreetMap)**: Address autocomplete in CheckoutScreen.
- **OSRM**: Delivery time estimation based on routing distance.

## Key Conventions

- All components are functional with React Hooks.
- Styling uses `StyleSheet.create()` inline per component.
- Primary color: `#FF6B35`, secondary: `#FF8E53`.
- Currency: XAF (CFA Franc), formatted with French locale.
- Delivery fee: 500 XAF (or free with applicable coupon).
- Error handling pattern: try/catch with `Alert.alert()` for user feedback.

## CI/CD

Codemagic (`codemagic.yaml`) handles builds: Android (APK/AAB → Google Play internal track) and iOS (→ App Store Connect). Both use Node 20.11.0 and run `expo prebuild` before native compilation.

## Known Issues

- `react-native-maps` MapView was removed from app code (still in dependencies) due to crashes — see commits fa0adf3/ddd1e31.
