import React from 'react';
import { View } from 'react-native';
import { Screen, ScreenHeader, EmptyState } from '../../components/ui';

// La carte de suivi utilise react-native-maps sur Android/iOS.
// Ce repli garde le reste de l'application prévisualisable dans un navigateur.
export default function OrderTrackingScreen({ navigation }) {
  return (
    <Screen>
      <ScreenHeader title="Suivi de commande" onBack={() => navigation.goBack()} />
      <View style={{ flex: 1, justifyContent: 'center' }}>
        <EmptyState
          icon="map-outline"
          title="Carte disponible sur mobile"
          message="Le suivi sur carte s'affiche dans l'application Android ou iOS."
          actionLabel="Retour aux commandes"
          onAction={() => navigation.navigate('Main', { screen: 'Commandes' })}
        />
      </View>
    </Screen>
  );
}
