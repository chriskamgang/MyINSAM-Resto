import { Alert, Platform } from 'react-native';

// React Native Web laisse Alert.alert vide. Cette façade garde les mêmes actions
// sur mobile et utilise les dialogues natifs du navigateur sur le web.
export function showAlert(title, message = '', buttons) {
  if (Platform.OS !== 'web') return Alert.alert(title, message, buttons);
  const description = [title, message].filter(Boolean).join('\n\n');
  if (!buttons?.length) { window.alert(description); return; }
  const cancel = buttons.find((button) => button.style === 'cancel');
  const action = buttons.find((button) => button.style === 'destructive')
    || [...buttons].reverse().find((button) => button !== cancel);
  if (!action) { window.alert(description); return; }
  if (!cancel || window.confirm(description)) action.onPress?.();
  else cancel.onPress?.();
}
