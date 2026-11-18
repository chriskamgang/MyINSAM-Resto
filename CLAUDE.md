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
- Styling uses `StyleSheet.create()` per component, but colors, fonts, radii, shadows and `formatPrice()` come from `src/theme/index.js` — never redefine a local `COLORS` object.
- Shared UI components live in `src/components/ui/index.js` (Screen, ScreenHeader, Button, Input, Card, Chip, Badge, SmartImage, EmptyState…). Use `SmartImage` for every remote image.
- Font is Poppins (loaded in App.js). Use `fontFamily: FONTS.x`, never `fontWeight` (breaks custom fonts on Android).
- App.js has no global SafeAreaView: each screen handles the top inset via `<Screen>` or `useSafeAreaInsets()`. The tab bars are `position: 'absolute'`, so tab screens add `TAB_BAR_SPACE` bottom padding.
- Local design images (login background, home banner, category tiles) are registered in `src/theme/images.js`; `null` entries fall back to gradients/emoji.
- Delivery location ("Livrer à …") is held in `src/context/DeliveryLocationContext.js` and pre-fills Checkout.
- Guests can browse and fill the cart; login is required only at checkout.
- Primary color: `#FF6B35`, secondary: `#FF8E53`, screen background: cream `#FFF9F5`.
- Currency: XAF (CFA Franc), formatted with French locale.
- Delivery fee: 500 XAF (or free with applicable coupon).
- Error handling pattern: try/catch with `Alert.alert()` for user feedback.

## CI/CD

Codemagic (`codemagic.yaml`) handles builds: Android (APK/AAB → Google Play internal track) and iOS (→ App Store Connect). Both use Node 20.11.0 and run `expo prebuild` before native compilation.

## OTA updates (EAS Update)

`expo-updates` is configured in `app.json` (channel `production` via `updates.requestHeaders`). `runtimeVersion` is a fixed string (`"1.0.7"`), decoupled from `version`, so store versions with identical native code (Android 1.0.7, iOS 1.0.8) share the same OTA updates. JS/asset-only changes ship with `eas update --channel production --message "..."`. Any native change (new native module, permission, plugin, Expo SDK upgrade) requires bumping `runtimeVersion` AND a new store build, otherwise old binaries would receive incompatible JS.

## Known Issues

- `react-native-maps` MapView was removed from most app code due to crashes — see commits fa0adf3/ddd1e31. It is still used behind a toggle in `OrderTrackingScreen.js`; don't add it elsewhere.
