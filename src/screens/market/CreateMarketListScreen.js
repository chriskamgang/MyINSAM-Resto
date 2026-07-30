import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  SafeAreaView, TextInput, Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useMarket } from '../../context/MarketContext';

const COLORS = { primary: '#FF6B35', bg: '#f8f8f8', card: '#fff', text: '#1a1a1a', gray: '#888' };

function generateId() {
  return Date.now().toString() + Math.random().toString(36).substr(2, 5);
}

function createEmptyItem() {
  return { id: generateId(), name: '', quantity: '', estimatedPrice: '', note: '' };
}

export default function CreateMarketListScreen({ navigation }) {
  const { clearList, addItem } = useMarket();
  const [items, setItems] = useState([createEmptyItem()]);

  const updateItemField = (id, field, value) => {
    setItems(prev => prev.map(item => item.id === id ? { ...item, [field]: value } : item));
  };

  const addNewRow = () => {
    setItems(prev => [...prev, createEmptyItem()]);
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
        quantity: item.quantity.trim(),
        estimatedPrice: item.estimatedPrice.trim(),
        note: item.note.trim(),
      });
    });

    navigation.navigate('MarketOrderSummary');
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.backText}>{'\u2190'}</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Ma liste de courses</Text>
        <View style={{ width: 40 }} />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={0}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ padding: 16, paddingBottom: 160 }}
        >
          <Text style={styles.sectionTitle}>
            <Ionicons name="list-outline" size={16} color={COLORS.text} /> Articles
          </Text>
          <Text style={styles.sectionSubtitle}>
            Ajoutez les articles que vous souhaitez acheter au march\u00e9.
          </Text>

          {items.map((item, index) => (
            <View key={item.id} style={styles.itemCard}>
              <View style={styles.itemCardHeader}>
                <Text style={styles.itemNumber}>Article {index + 1}</Text>
                <TouchableOpacity onPress={() => removeRow(item.id)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <Ionicons name="trash-outline" size={18} color="#ef4444" />
                </TouchableOpacity>
              </View>

              <TextInput
                style={styles.input}
                placeholder="Nom de l'article (ex: Tomates)"
                value={item.name}
                onChangeText={val => updateItemField(item.id, 'name', val)}
                placeholderTextColor="#aaa"
              />

              <View style={styles.rowInputs}>
                <TextInput
                  style={[styles.input, { flex: 1 }]}
                  placeholder="Quantit\u00e9 (ex: 2 tas, 1 kg)"
                  value={item.quantity}
                  onChangeText={val => updateItemField(item.id, 'quantity', val)}
                  placeholderTextColor="#aaa"
                />
                <TextInput
                  style={[styles.input, { flex: 1 }]}
                  placeholder="Prix estim\u00e9 (XAF)"
                  value={item.estimatedPrice}
                  onChangeText={val => updateItemField(item.id, 'estimatedPrice', val)}
                  placeholderTextColor="#aaa"
                  keyboardType="numeric"
                />
              </View>

              <TextInput
                style={styles.input}
                placeholder="Note (optionnel, ex: bien m\u00fbres)"
                value={item.note}
                onChangeText={val => updateItemField(item.id, 'note', val)}
                placeholderTextColor="#aaa"
              />
            </View>
          ))}

          {/* Add item button */}
          <TouchableOpacity style={styles.addItemBtn} onPress={addNewRow} activeOpacity={0.8}>
            <Ionicons name="add-circle-outline" size={22} color={COLORS.primary} />
            <Text style={styles.addItemBtnText}>Ajouter un article</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Footer */}
      <View style={styles.footer}>
        <View style={styles.footerInfo}>
          <Text style={styles.footerLabel}>{validItems.length} article{validItems.length > 1 ? 's' : ''}</Text>
          <Text style={styles.footerTotal}>
            Budget estim\u00e9 : {totalEstimated.toLocaleString('fr-FR')} XAF
          </Text>
        </View>
        <TouchableOpacity
          style={[styles.continueBtn, !canContinue && { opacity: 0.5 }]}
          onPress={handleContinue}
          disabled={!canContinue}
        >
          <Text style={styles.continueBtnText}>Continuer</Text>
          <Ionicons name="arrow-forward-outline" size={18} color="#fff" />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12,
    backgroundColor: COLORS.card, borderBottomWidth: 1, borderBottomColor: '#f0f0f0',
  },
  backBtn:     { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  backText:    { fontSize: 24, color: COLORS.text },
  headerTitle: { fontSize: 17, fontWeight: 'bold', color: COLORS.text },

  sectionTitle:    { fontSize: 15, fontWeight: '700', color: COLORS.text, marginBottom: 4 },
  sectionSubtitle: { fontSize: 13, color: COLORS.gray, marginBottom: 16, lineHeight: 18 },

  itemCard: {
    backgroundColor: COLORS.card, borderRadius: 16, padding: 16,
    marginBottom: 12,
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, elevation: 2,
  },
  itemCardHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: 12,
  },
  itemNumber: { fontSize: 13, fontWeight: '700', color: COLORS.primary },

  input: {
    backgroundColor: '#f9f9f9', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 14, color: COLORS.text, borderWidth: 1, borderColor: '#e5e7eb',
    marginBottom: 8,
  },
  rowInputs: { flexDirection: 'row', gap: 8 },

  addItemBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: COLORS.card, borderRadius: 14, paddingVertical: 14,
    borderWidth: 1.5, borderColor: COLORS.primary, borderStyle: 'dashed',
  },
  addItemBtnText: { fontSize: 15, fontWeight: '600', color: COLORS.primary },

  footer: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    padding: 16, paddingBottom: 32, backgroundColor: COLORS.card,
    borderTopWidth: 1, borderTopColor: '#f0f0f0',
  },
  footerInfo: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: 12,
  },
  footerLabel: { fontSize: 13, color: COLORS.gray },
  footerTotal: { fontSize: 15, fontWeight: '700', color: COLORS.text },
  continueBtn: {
    backgroundColor: COLORS.primary, borderRadius: 16, paddingVertical: 16,
    alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8,
    shadowColor: COLORS.primary, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 8, elevation: 6,
  },
  continueBtnText: { color: '#fff', fontSize: 15, fontWeight: 'bold' },
});
