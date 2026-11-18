import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useMarket } from '../../context/MarketContext';
import { COLORS, FONTS, TYPE, RADIUS, SHADOWS, SCREEN_PADDING, formatPrice } from '../../theme';
import {
  Screen, ScreenHeader, Card, Input, Button, Chip, QuantityStepper, Badge,
} from '../../components/ui';

// Unités courantes au marché ; « autre » permet une quantité libre (ex : « 1 régime »)
const UNITS = [
  { key: 'kg',     label: 'kg',     plural: 'kg' },
  { key: 'tas',    label: 'tas',    plural: 'tas' },
  { key: 'piece',  label: 'pièce',  plural: 'pièces' },
  { key: 'botte',  label: 'botte',  plural: 'bottes' },
  { key: 'litre',  label: 'litre',  plural: 'litres' },
  { key: 'sac',    label: 'sac',    plural: 'sacs' },
  { key: 'other',  label: 'Autre',  plural: '' },
];

const SUGGESTIONS = ['Tomates', 'Oignons', 'Plantain', 'Huile', 'Riz', 'Poisson', 'Piment', 'Ndolè'];

function generateId() {
  return Date.now().toString() + Math.random().toString(36).substr(2, 5);
}

function createEmptyItem(name = '') {
  return { id: generateId(), name, count: 1, unit: 'kg', customQuantity: '', estimatedPrice: '', note: '' };
}

// Construit la quantité texte envoyée à l'API (format libre, ex : « 2 kg », « 3 tas »)
function quantityText(item) {
  if (item.unit === 'other') return item.customQuantity.trim();
  const u = UNITS.find(x => x.key === item.unit) || UNITS[0];
  return `${item.count} ${item.count > 1 ? u.plural : u.label}`;
}

export default function CreateMarketListScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { clearList, addItem } = useMarket();
  const [items, setItems] = useState([createEmptyItem()]);

  const updateItemField = (id, field, value) => {
    setItems(prev => prev.map(item => item.id === id ? { ...item, [field]: value } : item));
  };

  const addNewRow = () => {
    setItems(prev => [...prev, createEmptyItem()]);
  };

  const addSuggestion = (name) => {
    setItems(prev => {
      const emptyIdx = prev.findIndex(i => !i.name.trim());
      if (emptyIdx >= 0) return prev.map((i, idx) => (idx === emptyIdx ? { ...i, name } : i));
      return [...prev, createEmptyItem(name)];
    });
  };

  const removeRow = (id) => {
    if (items.length === 1) {
      Alert.alert('Info', 'Vous devez avoir au moins un article.');
      return;
    }
    setItems(prev => prev.filter(item => item.id !== id));
  };

  const totalEstimated = items.reduce((sum, item) => {
    const price = Number(item.estimatedPrice) || 0;
    return sum + price;
  }, 0);

  const validItems = items.filter(item => item.name.trim().length > 0);
  const canContinue = validItems.length > 0;

  const handleContinue = () => {
    if (!canContinue) {
      Alert.alert('Liste vide', 'Ajoutez au moins un article avec un nom.');
      return;
    }

    // Clear existing context items and add new ones
    clearList();
    validItems.forEach(item => {
      addItem({
        name: item.name.trim(),
        quantity: quantityText(item),
        estimatedPrice: item.estimatedPrice.trim(),
        note: item.note.trim(),
      });
    });

    navigation.navigate('MarketOrderSummary');
  };

  const usedNames = items.map(i => i.name.trim().toLowerCase());

  return (
    <Screen>
      <ScreenHeader title="Ma liste de courses" onBack={() => navigation.goBack()} />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' && !Platform.isPad ? 'padding' : undefined}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.scroll}
        >
          <Text style={TYPE.h2}>Que voulez-vous acheter ?</Text>
          <Text style={[TYPE.bodyMuted, { marginTop: 2 }]}>
            Ajoutez les articles que vous souhaitez acheter au marché.
          </Text>

          {/* Suggestions rapides */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.suggestScroll}
            contentContainerStyle={styles.suggestRow}
            keyboardShouldPersistTaps="handled"
          >
            {SUGGESTIONS.filter(s => !usedNames.includes(s.toLowerCase())).map(s => (
              <Chip key={s} label={s} icon="add" onPress={() => addSuggestion(s)} style={styles.suggestChip} />
            ))}
          </ScrollView>

          {items.map((item, index) => (
            <Card key={item.id} style={styles.itemCard}>
              <View style={styles.itemCardHeader}>
                <View style={styles.itemNumber}>
                  <Text style={styles.itemNumberText}>{index + 1}</Text>
                </View>
                <Text style={[TYPE.title, { flex: 1 }]} numberOfLines={1}>
                  {item.name.trim() || `Article ${index + 1}`}
                </Text>
                <TouchableOpacity
                  style={styles.trashBtn}
                  onPress={() => removeRow(item.id)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Ionicons name="trash-outline" size={17} color={COLORS.danger} />
                </TouchableOpacity>
              </View>

              <Input
                icon="nutrition-outline"
                label="Article"
                placeholder="Ex : Tomates"
                value={item.name}
                onChangeText={val => updateItemField(item.id, 'name', val)}
                style={styles.field}
              />

              <Text style={styles.fieldLabel}>Quantité</Text>
              <View style={styles.qtyRow}>
                {item.unit !== 'other' ? (
                  <QuantityStepper
                    value={item.count}
                    onChange={val => updateItemField(item.id, 'count', val)}
                    min={1}
                    max={99}
                    size="sm"
                  />
                ) : null}
                <Badge
                  label={quantityText(item) || 'À préciser'}
                  icon="scale-outline"
                  color={COLORS.success}
                  bg={COLORS.successSoft}
                  style={{ alignSelf: 'center' }}
                />
              </View>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.unitRow}
                keyboardShouldPersistTaps="handled"
              >
                {UNITS.map(u => (
                  <Chip
                    key={u.key}
                    label={u.label}
                    active={item.unit === u.key}
                    onPress={() => updateItemField(item.id, 'unit', u.key)}
                    style={styles.unitChip}
                  />
                ))}
              </ScrollView>
              {item.unit === 'other' ? (
                <Input
                  icon="create-outline"
                  placeholder="Précisez (ex : 1 régime, 3 boîtes)"
                  value={item.customQuantity}
                  onChangeText={val => updateItemField(item.id, 'customQuantity', val)}
                  style={styles.field}
                />
              ) : null}

              <Input
                icon="pricetag-outline"
                label="Prix estimé (FCFA)"
                placeholder="Ex : 1500"
                value={item.estimatedPrice}
                onChangeText={val => updateItemField(item.id, 'estimatedPrice', val.replace(/[^0-9]/g, ''))}
                keyboardType="numeric"
                style={styles.field}
              />

              <Input
                icon="chatbubble-ellipses-outline"
                label="Note (optionnel)"
                placeholder="Ex : bien mûres"
                value={item.note}
                onChangeText={val => updateItemField(item.id, 'note', val)}
              />
            </Card>
          ))}

          {/* Add item button */}
          <TouchableOpacity style={styles.addItemBtn} onPress={addNewRow} activeOpacity={0.8}>
            <Ionicons name="add-circle-outline" size={22} color={COLORS.primary} />
            <Text style={styles.addItemBtnText}>Ajouter un article</Text>
          </TouchableOpacity>
        </ScrollView>

        {/* Footer */}
        <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 16) }]}>
          <View style={styles.footerInfo}>
            <View>
              <Text style={TYPE.caption}>
                {validItems.length} article{validItems.length > 1 ? 's' : ''}
              </Text>
              <Text style={styles.footerTotalLabel}>Budget estimé</Text>
            </View>
            <Text style={styles.footerTotal}>{formatPrice(totalEstimated)}</Text>
          </View>
          <Button
            title="Continuer"
            iconRight="arrow-forward"
            onPress={handleContinue}
            disabled={!canContinue}
          />
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingHorizontal: SCREEN_PADDING, paddingTop: 8, paddingBottom: 24 },

  suggestScroll: { marginHorizontal: -SCREEN_PADDING, marginTop: 14, marginBottom: 18 },
  suggestRow: { paddingHorizontal: SCREEN_PADDING, gap: 8 },
  suggestChip: { height: 36, paddingHorizontal: 12 },

  itemCard: { marginBottom: 14 },
  itemCardHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  itemNumber: {
    width: 28, height: 28, borderRadius: 14, backgroundColor: COLORS.primarySoft,
    alignItems: 'center', justifyContent: 'center',
  },
  itemNumberText: { fontFamily: FONTS.bold, fontSize: 13, color: COLORS.primary },
  trashBtn: {
    width: 34, height: 34, borderRadius: 17, backgroundColor: COLORS.dangerSoft,
    alignItems: 'center', justifyContent: 'center',
  },

  field: { marginBottom: 10 },
  fieldLabel: { ...TYPE.label, marginTop: 2, marginBottom: 8, marginLeft: 2 },
  qtyRow: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 10 },
  unitRow: { gap: 6, paddingBottom: 12 },
  unitChip: { height: 34, paddingHorizontal: 12 },

  addItemBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: COLORS.surface, borderRadius: RADIUS.lg, paddingVertical: 16,
    borderWidth: 1.5, borderColor: COLORS.primary, borderStyle: 'dashed',
  },
  addItemBtnText: { fontFamily: FONTS.semibold, fontSize: 15, color: COLORS.primary },

  footer: {
    paddingHorizontal: SCREEN_PADDING, paddingTop: 14, backgroundColor: COLORS.surface,
    borderTopLeftRadius: RADIUS.xl, borderTopRightRadius: RADIUS.xl, ...SHADOWS.lg,
  },
  footerInfo: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12,
  },
  footerTotalLabel: { fontFamily: FONTS.medium, fontSize: 14, color: COLORS.text },
  footerTotal: { fontFamily: FONTS.bold, fontSize: 20, color: COLORS.primary },
});
