import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  TextInput,
  Alert,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useAuth } from '../src/context/AuthContext';
import { shoppingListApi } from '../src/services/api';
import { Colors } from '../src/constants/Colors';
import { Spacing, BorderRadius, FontSize, FontWeight, Shadow } from '../src/constants/Layout';

interface ShoppingItem {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  section: 'légumes' | 'fruits' | 'viandes' | 'poissons' | 'produits_laitiers' | 'épicerie' | 'autre';
  is_checked: boolean;
}

interface ShoppingList {
  items: ShoppingItem[];
  sections: Record<string, {
    items: ShoppingItem[];
    completion_percentage: number;
  }>;
}

const SECTION_NAMES = {
  légumes: { name: 'Légumes', icon: 'leaf' },
  fruits: { name: 'Fruits', icon: 'nutrition' },
  viandes: { name: 'Viandes', icon: 'restaurant' },
  poissons: { name: 'Poissons', icon: 'fish' },
  produits_laitiers: { name: 'Produits laitiers', icon: 'water' },
  épicerie: { name: 'Épicerie', icon: 'basket' },
  autre: { name: 'Autre', icon: 'apps' },
};

export default function ShoppingListScreen() {
  const { user } = useAuth();
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [shoppingList, setShoppingList] = useState<ShoppingList | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newItemName, setNewItemName] = useState('');
  const [newItemQuantity, setNewItemQuantity] = useState('1');
  const [newItemUnit, setNewItemUnit] = useState('');
  const [newItemSection, setNewItemSection] = useState<keyof typeof SECTION_NAMES>('épicerie');
  const [isAddingItem, setIsAddingItem] = useState(false);

  useEffect(() => {
    loadShoppingList();
  }, []);

  const loadShoppingList = async () => {
    try {
      setLoading(true);
      const response = await shoppingListApi.getShoppingList();
      setShoppingList(response);
    } catch (error) {
      console.error('❌ Error loading shopping list:', error);
      Alert.alert('Erreur', 'Impossible de charger la liste de courses');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadShoppingList();
  };

  const toggleItemCheck = async (itemId: string, isChecked: boolean) => {
    try {
      // Optimistic update
      if (shoppingList) {
        const updatedList = {
          ...shoppingList,
          items: shoppingList.items.map(item => 
            item.id === itemId ? { ...item, is_checked: isChecked } : item
          ),
        };
        
        // Recalculate sections
        const sections: Record<string, any> = {};
        updatedList.items.forEach(item => {
          if (!sections[item.section]) {
            sections[item.section] = { items: [], completion_percentage: 0 };
          }
          sections[item.section].items.push(item);
        });
        
        Object.keys(sections).forEach(sectionKey => {
          const sectionItems = sections[sectionKey].items;
          const checkedCount = sectionItems.filter((item: any) => item.is_checked).length;
          sections[sectionKey].completion_percentage = 
            sectionItems.length > 0 ? Math.round((checkedCount / sectionItems.length) * 100) : 0;
        });
        
        updatedList.sections = sections;
        setShoppingList(updatedList);
      }

      await shoppingListApi.updateItem(itemId, { is_checked: isChecked });
    } catch (error) {
      console.error('❌ Error updating item:', error);
      Alert.alert('Erreur', 'Impossible de mettre à jour l\'article');
      // Revert optimistic update
      loadShoppingList();
    }
  };

  const addItem = async () => {
    if (!newItemName.trim()) {
      Alert.alert('Erreur', 'Veuillez saisir le nom de l\'article');
      return;
    }

    try {
      setIsAddingItem(true);
      const newItem = {
        name: newItemName.trim(),
        quantity: parseInt(newItemQuantity) || 1,
        unit: newItemUnit.trim(),
        section: newItemSection,
      };

      await shoppingListApi.addItem(newItem);
      
      // Close modal and reset form
      setShowAddModal(false);
      setNewItemName('');
      setNewItemQuantity('1');
      setNewItemUnit('');
      setNewItemSection('épicerie');
      
      // Reload list
      loadShoppingList();
    } catch (error) {
      console.error('❌ Error adding item:', error);
      Alert.alert('Erreur', 'Impossible d\'ajouter l\'article');
    } finally {
      setIsAddingItem(false);
    }
  };

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Ionicons name="basket-outline" size={80} color={Colors.light.muted} />
      <Text style={styles.emptyStateTitle}>Liste de courses vide</Text>
      <Text style={styles.emptyStateText}>
        Ajoutez vos premiers articles ou importez des ingrédients depuis une recette !
      </Text>
      
      <View style={styles.emptyStateCTAs}>
        <TouchableOpacity 
          style={styles.emptyCTAButton}
          onPress={() => setShowAddModal(true)}
          activeOpacity={0.8}
        >
          <Ionicons name="add" size={20} color={Colors.light.background} />
          <Text style={styles.emptyCTAButtonText}>Ajouter un article</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.emptyCTAButton, styles.secondaryCTAButton]}
          onPress={() => router.push('/community')}
          activeOpacity={0.8}
        >
          <Ionicons name="restaurant" size={20} color={Colors.light.primary} />
          <Text style={[styles.emptyCTAButtonText, styles.secondaryCTAButtonText]}>
            Parcourir les recettes
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderSection = (sectionKey: string, sectionData: any) => {
    const sectionInfo = SECTION_NAMES[sectionKey as keyof typeof SECTION_NAMES];
    const { items, completion_percentage } = sectionData;

    return (
      <View key={sectionKey} style={styles.section}>
        <View style={styles.sectionHeader}>
          <View style={styles.sectionTitle}>
            <Ionicons name={sectionInfo.icon as any} size={20} color={Colors.light.primary} />
            <Text style={styles.sectionName}>{sectionInfo.name}</Text>
            <Text style={styles.itemCount}>({items.length})</Text>
          </View>
          <View style={styles.progressContainer}>
            <Text style={styles.progressText}>{completion_percentage}%</Text>
            <View style={styles.progressBar}>
              <View 
                style={[
                  styles.progressFill, 
                  { width: `${completion_percentage}%` }
                ]} 
              />
            </View>
          </View>
        </View>
        
        <View style={styles.sectionItems}>
          {items.map((item: ShoppingItem) => (
            <TouchableOpacity
              key={item.id}
              style={[styles.shoppingItem, item.is_checked && styles.checkedItem]}
              onPress={() => toggleItemCheck(item.id, !item.is_checked)}
              activeOpacity={0.7}
            >
              <View style={styles.itemLeft}>
                <TouchableOpacity
                  style={[styles.checkbox, item.is_checked && styles.checkedCheckbox]}
                  onPress={() => toggleItemCheck(item.id, !item.is_checked)}
                >
                  {item.is_checked && (
                    <Ionicons name="checkmark" size={16} color={Colors.light.background} />
                  )}
                </TouchableOpacity>
                <View style={styles.itemInfo}>
                  <Text style={[styles.itemName, item.is_checked && styles.checkedItemName]}>
                    {item.name}
                  </Text>
                  <Text style={styles.itemQuantity}>
                    {item.quantity} {item.unit}
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    );
  };

  const renderAddModal = () => (
    <Modal
      visible={showAddModal}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={() => setShowAddModal(false)}
    >
      <SafeAreaView style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <TouchableOpacity onPress={() => setShowAddModal(false)}>
            <Text style={styles.modalCancel}>Annuler</Text>
          </TouchableOpacity>
          <Text style={styles.modalTitle}>Nouvel article</Text>
          <TouchableOpacity 
            onPress={addItem} 
            disabled={isAddingItem || !newItemName.trim()}
          >
            {isAddingItem ? (
              <ActivityIndicator size="small" color={Colors.light.primary} />
            ) : (
              <Text style={[
                styles.modalDone, 
                !newItemName.trim() && styles.modalDisabled
              ]}>
                Ajouter
              </Text>
            )}
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.modalContent}>
          <View style={styles.formGroup}>
            <Text style={styles.formLabel}>Nom de l'article</Text>
            <TextInput
              style={styles.formInput}
              placeholder="Ex: Tomates cerises"
              value={newItemName}
              onChangeText={setNewItemName}
              autoFocus
            />
          </View>

          <View style={styles.formRow}>
            <View style={[styles.formGroup, { flex: 1, marginRight: Spacing.sm }]}>
              <Text style={styles.formLabel}>Quantité</Text>
              <TextInput
                style={styles.formInput}
                placeholder="1"
                value={newItemQuantity}
                onChangeText={setNewItemQuantity}
                keyboardType="numeric"
              />
            </View>

            <View style={[styles.formGroup, { flex: 1, marginLeft: Spacing.sm }]}>
              <Text style={styles.formLabel}>Unité</Text>
              <TextInput
                style={styles.formInput}
                placeholder="kg, pièces..."
                value={newItemUnit}
                onChangeText={setNewItemUnit}
              />
            </View>
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.formLabel}>Catégorie</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.sectionPicker}>
              {Object.entries(SECTION_NAMES).map(([key, info]) => (
                <TouchableOpacity
                  key={key}
                  style={[
                    styles.sectionOption,
                    newItemSection === key && styles.selectedSectionOption
                  ]}
                  onPress={() => setNewItemSection(key as keyof typeof SECTION_NAMES)}
                >
                  <Ionicons 
                    name={info.icon as any} 
                    size={20} 
                    color={newItemSection === key ? Colors.light.background : Colors.light.primary} 
                  />
                  <Text style={[
                    styles.sectionOptionText,
                    newItemSection === key && styles.selectedSectionOptionText
                  ]}>
                    {info.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton} 
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color={Colors.light.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Liste de courses</Text>
        <TouchableOpacity 
          style={styles.addButton}
          onPress={() => setShowAddModal(true)}
        >
          <Ionicons name="add" size={24} color={Colors.light.primary} />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.light.primary} />
          <Text style={styles.loadingText}>Chargement...</Text>
        </View>
      ) : !shoppingList || Object.keys(shoppingList.sections).length === 0 ? (
        <ScrollView
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          contentContainerStyle={styles.scrollContent}
        >
          {renderEmptyState()}
        </ScrollView>
      ) : (
        <ScrollView
          style={styles.scrollView}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          showsVerticalScrollIndicator={false}
        >
          {Object.entries(shoppingList.sections).map(([sectionKey, sectionData]) =>
            renderSection(sectionKey, sectionData)
          )}
        </ScrollView>
      )}

      {renderAddModal()}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
  },
  backButton: {
    padding: Spacing.xs,
  },
  headerTitle: {
    flex: 1,
    fontSize: FontSize.lg,
    fontWeight: FontWeight.semibold,
    color: Colors.light.text,
    textAlign: 'center',
  },
  addButton: {
    padding: Spacing.xs,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: FontSize.md,
    color: Colors.light.muted,
    marginTop: Spacing.md,
  },
  // Empty state styles (similar to Community)
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.xxl,
  },
  emptyStateTitle: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.semibold,
    color: Colors.light.text,
    textAlign: 'center',
    marginTop: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  emptyStateText: {
    fontSize: FontSize.md,
    color: Colors.light.muted,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: Spacing.xl,
  },
  emptyStateCTAs: {
    width: '100%',
    gap: Spacing.md,
  },
  emptyCTAButton: {
    flexDirection: 'row',
    backgroundColor: Colors.light.primary,
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.xl,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadow.medium,
  },
  secondaryCTAButton: {
    backgroundColor: Colors.light.background,
    borderWidth: 2,
    borderColor: Colors.light.primary,
  },
  emptyCTAButtonText: {
    color: Colors.light.background,
    fontSize: FontSize.lg,
    fontWeight: FontWeight.semibold,
    marginLeft: Spacing.sm,
  },
  secondaryCTAButtonText: {
    color: Colors.light.primary,
  },
  // Section styles
  section: {
    margin: Spacing.lg,
    backgroundColor: Colors.light.background,
    borderRadius: BorderRadius.lg,
    ...Shadow.small,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
  },
  sectionTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  sectionName: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.semibold,
    color: Colors.light.text,
    marginLeft: Spacing.sm,
  },
  itemCount: {
    fontSize: FontSize.sm,
    color: Colors.light.muted,
    marginLeft: Spacing.xs,
  },
  progressContainer: {
    alignItems: 'flex-end',
  },
  progressText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium,
    color: Colors.light.primary,
    marginBottom: 4,
  },
  progressBar: {
    width: 60,
    height: 4,
    backgroundColor: Colors.light.border,
    borderRadius: 2,
  },
  progressFill: {
    height: '100%',
    backgroundColor: Colors.light.primary,
    borderRadius: 2,
  },
  sectionItems: {
    padding: Spacing.md,
  },
  shoppingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.sm,
    borderRadius: BorderRadius.md,
  },
  checkedItem: {
    opacity: 0.6,
  },
  itemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: Colors.light.border,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  checkedCheckbox: {
    backgroundColor: Colors.light.primary,
    borderColor: Colors.light.primary,
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.medium,
    color: Colors.light.text,
  },
  checkedItemName: {
    textDecorationLine: 'line-through',
    color: Colors.light.muted,
  },
  itemQuantity: {
    fontSize: FontSize.sm,
    color: Colors.light.muted,
    marginTop: 2,
  },
  // Modal styles
  modalContainer: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
  },
  modalCancel: {
    fontSize: FontSize.md,
    color: Colors.light.muted,
  },
  modalTitle: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.semibold,
    color: Colors.light.text,
  },
  modalDone: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.light.primary,
  },
  modalDisabled: {
    opacity: 0.5,
  },
  modalContent: {
    flex: 1,
    padding: Spacing.lg,
  },
  formGroup: {
    marginBottom: Spacing.lg,
  },
  formRow: {
    flexDirection: 'row',
  },
  formLabel: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.medium,
    color: Colors.light.text,
    marginBottom: Spacing.sm,
  },
  formInput: {
    borderWidth: 1,
    borderColor: Colors.light.border,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    fontSize: FontSize.md,
    color: Colors.light.text,
    backgroundColor: Colors.light.background,
  },
  sectionPicker: {
    marginTop: Spacing.sm,
  },
  sectionOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.light.border,
    borderRadius: BorderRadius.md,
    marginRight: Spacing.sm,
    backgroundColor: Colors.light.background,
  },
  selectedSectionOption: {
    backgroundColor: Colors.light.primary,
    borderColor: Colors.light.primary,
  },
  sectionOptionText: {
    fontSize: FontSize.sm,
    color: Colors.light.primary,
    marginLeft: Spacing.xs,
  },
  selectedSectionOptionText: {
    color: Colors.light.background,
  },
});