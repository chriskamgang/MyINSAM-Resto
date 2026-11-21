// L'app est verrouillée en portrait (screenOrientation="portrait"), ce qui fait déduire à
// Google Play l'exigence android.hardware.screen.portrait et exclut tablettes, Chromebooks
// et Android XR. On la déclare facultative pour garder ces appareils compatibles.
const { withAndroidManifest } = require('expo/config-plugins');

const FEATURE = 'android.hardware.screen.portrait';

module.exports = function withOptionalScreenPortrait(config) {
  return withAndroidManifest(config, (cfg) => {
    const manifest = cfg.modResults.manifest;
    const features = manifest['uses-feature'] || [];
    const existing = features.find((f) => f.$['android:name'] === FEATURE);
    if (existing) existing.$['android:required'] = 'false';
    else features.push({ $: { 'android:name': FEATURE, 'android:required': 'false' } });
    manifest['uses-feature'] = features;
    return cfg;
  });
};
