import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  ScrollView,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BarCodeScanner } from 'expo-barcode-scanner';
import { Ionicons } from '@expo/vector-icons';
import { productsApi } from '../../src/services/api';
import { Colors } from '../../src/constants/Colors';
import { AppTexts } from '../../src/constants/Texts';
import { Spacing, BorderRadius, FontSize, FontWeight, Shadow } from '../../src/constants/Layout';
import { Product } from '../../src/types';

export default function ScanScreen() {
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [scanned, setScanned] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [product, setProduct] = useState<Product | null>(null);
  const [showProductModal, setShowProductModal] = useState(false);
  const [isScanning, setIsScanning] = useState(false);

  useEffect(() => {
    requestCameraPermission();
  }, []);

  const requestCameraPermission = async () => {
    try {
      const { status } = await BarCodeScanner.requestPermissionsAsync();
      setHasPermission(status === 'granted');
    } catch (error) {
      console.error('Error requesting camera permission:', error);
      setHasPermission(false);
    }
  };

  const handleBarCodeScanned = async ({ type, data }: { type: string; data: string }) => {
    if (scanned || isLoading) return;
    
    setScanned(true);
    setIsLoading(true);

    try {
      const response = await productsApi.getProductByBarcode(data, 'fr');
      
      if (response.success && response.product) {
        setProduct(response.product);
        setShowProductModal(true);
      } else {
        Alert.alert(
          AppTexts.scan.productNotFound,
          'Ce produit n\'est pas encore dans notre base de données.',
          [
            { text: 'OK', onPress: () => resetScan() }
          ]
        );
      }
    } catch (error) {
      console.error('Error scanning product:', error);
      Alert.alert(
        'Erreur',
        'Impossible de récupérer les informations du produit.',
        [
          { text: 'Réessayer', onPress: () => resetScan() }
        ]
      );
    } finally {
      setIsLoading(false);
    }
  };

  const resetScan = () => {
    setScanned(false);
    setProduct(null);
    setShowProductModal(false);
  };

  const startScanning = () => {
    setIsScanning(true);
    resetScan();
  };

  const stopScanning = () => {
    setIsScanning(false);
    resetScan();
  };

  const renderNutrimentValue = (value: number | undefined, unit: string = 'g') => {
    if (value === undefined || value === null) return 'N/A';
    return `${value.toFixed(1)} ${unit}`;
  };

  const getNutriScoreColor = (grade?: string) => {
    switch (grade?.toLowerCase()) {
      case 'a': return '#00A651';
      case 'b': return '#85BB2F';
      case 'c': return '#F2B705';
      case 'd': return '#F39200';
      case 'e': return '#E63027';
      default: return Colors.light.muted;
    }
  };

  const renderProductDetails = () => {
    if (!product) return null;

    return (
      <Modal
        visible={showProductModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowProductModal(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowProductModal(false)}>
              <Ionicons name="close" size={24} color={Colors.light.text} />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Détails du produit</Text>
            <View style={{ width: 24 }} />
          </View>

          <ScrollView style={styles.modalContent} contentContainerStyle={styles.modalScrollContent}>
            {/* Product name */}
            <View style={styles.productHeader}>
              <Text style={styles.productName}>
                {product.product_name_fr || product.product_name || 'Produit sans nom'}
              </Text>
              {product.brands && (
                <Text style={styles.productBrand}>{product.brands}</Text>
              )}
            </View>

            {/* Nutri-Score */}
            {product.nutrition_grades && product.nutrition_grades !== 'unknown' && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Nutri-Score</Text>
                <View style={[styles.nutriScoreBadge, { backgroundColor: getNutriScoreColor(product.nutrition_grades) }]}>
                  <Text style={styles.nutriScoreText}>{product.nutrition_grades.toUpperCase()}</Text>
                </View>
              </View>
            )}

            {/* Nutritional information */}
            {product.nutriments && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Valeurs nutritionnelles ({AppTexts.scan.per100g})</Text>
                <View style={styles.nutrimentsList}>
                  <View style={styles.nutrimentRow}>
                    <Text style={styles.nutrimentLabel}>Calories</Text>
                    <Text style={styles.nutrimentValue}>
                      {renderNutrimentValue(product.nutriments.energy_kcal, 'kcal')}
                    </Text>
                  </View>
                  <View style={styles.nutrimentRow}>
                    <Text style={styles.nutrimentLabel}>Matières grasses</Text>
                    <Text style={styles.nutrimentValue}>
                      {renderNutrimentValue(product.nutriments.fat)}
                    </Text>
                  </View>
                  <View style={styles.nutrimentRow}>
                    <Text style={styles.nutrimentLabel}>Glucides</Text>
                    <Text style={styles.nutrimentValue}>
                      {renderNutrimentValue(product.nutriments.carbohydrates)}
                    </Text>
                  </View>
                  <View style={styles.nutrimentRow}>
                    <Text style={styles.nutrimentLabel}>Sucres</Text>
                    <Text style={styles.nutrimentValue}>
                      {renderNutrimentValue(product.nutriments.sugars)}
                    </Text>
                  </View>
                  <View style={styles.nutrimentRow}>
                    <Text style={styles.nutrimentLabel}>Fibres</Text>
                    <Text style={styles.nutrimentValue}>
                      {renderNutrimentValue(product.nutriments.fiber)}
                    </Text>
                  </View>
                  <View style={styles.nutrimentRow}>
                    <Text style={styles.nutrimentLabel}>Protéines</Text>
                    <Text style={styles.nutrimentValue}>
                      {renderNutrimentValue(product.nutriments.proteins)}
                    </Text>
                  </View>
                  <View style={styles.nutrimentRow}>
                    <Text style={styles.nutrimentLabel}>Sel</Text>
                    <Text style={styles.nutrimentValue}>
                      {renderNutrimentValue(product.nutriments.salt)}
                    </Text>
                  </View>
                </View>
              </View>
            )}

            {/* Ingredients */}
            {(product.ingredients_text_fr || product.ingredients_text) && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Ingrédients</Text>
                <Text style={styles.ingredientsText}>
                  {product.ingredients_text_fr || product.ingredients_text}
                </Text>
              </View>
            )}

            {/* Allergens */}
            {product.allergens_tags && product.allergens_tags.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Allergènes</Text>
                <View style={styles.tagsContainer}>
                  {product.allergens_tags.map((allergen, index) => (
                    <View key={index} style={styles.allergenTag}>
                      <Text style={styles.allergenText}>
                        {allergen.replace('en:', '').replace(/-/g, ' ')}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {/* Categories */}
            {product.categories_tags && product.categories_tags.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Catégories</Text>
                <View style={styles.tagsContainer}>
                  {product.categories_tags.slice(0, 5).map((category, index) => (
                    <View key={index} style={styles.categoryTag}>
                      <Text style={styles.categoryText}>
                        {category.replace('en:', '').replace(/-/g, ' ')}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
            )}
          </ScrollView>

          <View style={styles.modalActions}>
            <TouchableOpacity 
              style={styles.scanAgainButton}
              onPress={() => {
                setShowProductModal(false);
                resetScan();
              }}
            >
              <Text style={styles.scanAgainButtonText}>Scanner un autre produit</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>
    );
  };

  const renderCameraView = () => (
    <View style={styles.cameraContainer}>
      <BarCodeScanner
        onBarCodeScanned={scanned ? undefined : handleBarCodeScanned}
        style={styles.camera}
      >
        <View style={styles.scannerOverlay}>
          <View style={styles.scannerFrame}>
            <View style={[styles.corner, styles.topLeft]} />
            <View style={[styles.corner, styles.topRight]} />
            <View style={[styles.corner, styles.bottomLeft]} />
            <View style={[styles.corner, styles.bottomRight]} />
            
            {/* Scanning line animation */}
            <View style={styles.scanLine} />
          </View>
          
          <Text style={styles.scannerText}>
            Placez le code-barres dans le cadre
          </Text>
          
          {isLoading && (
            <View style={styles.loadingOverlay}>
              <ActivityIndicator size="large" color={Colors.light.background} />
              <Text style={styles.loadingText}>Analyse du produit...</Text>
            </View>
          )}
        </View>
      </BarCodeScanner>
      
      <TouchableOpacity style={styles.stopButton} onPress={stopScanning}>
        <Ionicons name="close" size={24} color={Colors.light.background} />
      </TouchableOpacity>
    </View>
  );

  if (hasPermission === null) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color={Colors.light.primary} />
          <Text style={styles.loadingText}>Demande d'autorisation caméra...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (hasPermission === false) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContent}>
          <Ionicons name="camera" size={64} color={Colors.light.muted} />
          <Text style={styles.permissionTitle}>Accès caméra requis</Text>
          <Text style={styles.permissionText}>
            YaCook a besoin d'accéder à votre caméra pour scanner les codes-barres des produits.
          </Text>
          <TouchableOpacity style={styles.permissionButton} onPress={requestCameraPermission}>
            <Text style={styles.permissionButtonText}>Autoriser l'accès</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (isScanning) {
    return (
      <>
        {renderCameraView()}
        {renderProductDetails()}
      </>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.scanPrompt}>
          <Ionicons name="scan-circle" size={120} color={Colors.light.primary} />
          <Text style={styles.scanTitle}>Scanner un produit</Text>
          <Text style={styles.scanDescription}>
            Scannez le code-barres d'un produit pour obtenir ses informations nutritionnelles et ses ingrédients.
          </Text>
          
          <TouchableOpacity style={styles.startScanButton} onPress={startScanning}>
            <Ionicons name="camera" size={24} color={Colors.light.background} />
            <Text style={styles.startScanButtonText}>Commencer le scan</Text>
          </TouchableOpacity>
        </View>
        
        {/* Recent scans placeholder */}
        <View style={styles.recentScans}>
          <Text style={styles.recentScansTitle}>Derniers scans</Text>
          <Text style={styles.recentScansEmpty}>
            Aucun scan récent. Commencez par scanner votre premier produit !
          </Text>
        </View>
      </View>
      
      {renderProductDetails()}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
  },
  content: {
    flex: 1,
    padding: Spacing.lg,
  },
  scanPrompt: {
    alignItems: 'center',
    marginTop: Spacing.xxl,
  },
  scanTitle: {
    fontSize: FontSize.xxl,
    fontWeight: FontWeight.bold,
    color: Colors.light.text,
    marginTop: Spacing.lg,
    marginBottom: Spacing.md,
  },
  scanDescription: {
    fontSize: FontSize.md,
    color: Colors.light.muted,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: Spacing.xl,
  },
  startScanButton: {
    flexDirection: 'row',
    backgroundColor: Colors.light.primary,
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.xl,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
    ...Shadow.medium,
  },
  startScanButtonText: {
    color: Colors.light.background,
    fontSize: FontSize.lg,
    fontWeight: FontWeight.semibold,
    marginLeft: Spacing.sm,
  },
  recentScans: {
    marginTop: Spacing.xxl,
  },
  recentScansTitle: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.semibold,
    color: Colors.light.text,
    marginBottom: Spacing.md,
  },
  recentScansEmpty: {
    fontSize: FontSize.md,
    color: Colors.light.muted,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  permissionTitle: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    color: Colors.light.text,
    marginTop: Spacing.lg,
    marginBottom: Spacing.md,
  },
  permissionText: {
    fontSize: FontSize.md,
    color: Colors.light.muted,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: Spacing.xl,
  },
  permissionButton: {
    backgroundColor: Colors.light.primary,
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.xl,
    borderRadius: BorderRadius.lg,
  },
  permissionButtonText: {
    color: Colors.light.background,
    fontSize: FontSize.lg,
    fontWeight: FontWeight.semibold,
  },
  cameraContainer: {
    flex: 1,
  },
  camera: {
    flex: 1,
  },
  scannerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scannerFrame: {
    width: 250,
    height: 150,
    position: 'relative',
  },
  corner: {
    position: 'absolute',
    width: 20,
    height: 20,
    borderColor: Colors.light.primary,
  },
  topLeft: {
    top: 0,
    left: 0,
    borderTopWidth: 3,
    borderLeftWidth: 3,
  },
  topRight: {
    top: 0,
    right: 0,
    borderTopWidth: 3,
    borderRightWidth: 3,
  },
  bottomLeft: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 3,
    borderLeftWidth: 3,
  },
  bottomRight: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 3,
    borderRightWidth: 3,
  },
  scanLine: {
    position: 'absolute',
    top: '50%',
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: Colors.light.primary,
  },
  scannerText: {
    color: Colors.light.background,
    fontSize: FontSize.md,
    marginTop: Spacing.xl,
    textAlign: 'center',
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: Colors.light.background,
    fontSize: FontSize.md,
    marginTop: Spacing.md,
  },
  stopButton: {
    position: 'absolute',
    top: 60,
    right: 20,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 25,
    width: 50,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
  },
  modalTitle: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.semibold,
    color: Colors.light.text,
  },
  modalContent: {
    flex: 1,
  },
  modalScrollContent: {
    padding: Spacing.lg,
    paddingBottom: 100,
  },
  productHeader: {
    marginBottom: Spacing.xl,
  },
  productName: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    color: Colors.light.text,
    marginBottom: Spacing.xs,
  },
  productBrand: {
    fontSize: FontSize.lg,
    color: Colors.light.muted,
  },
  section: {
    marginBottom: Spacing.xl,
  },
  sectionTitle: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.semibold,
    color: Colors.light.text,
    marginBottom: Spacing.md,
  },
  nutriScoreBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
  },
  nutriScoreText: {
    color: Colors.light.background,
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
  },
  nutrimentsList: {
    backgroundColor: Colors.light.card,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
  },
  nutrimentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
  },
  nutrimentLabel: {
    fontSize: FontSize.md,
    color: Colors.light.text,
  },
  nutrimentValue: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.medium,
    color: Colors.light.text,
  },
  ingredientsText: {
    fontSize: FontSize.md,
    color: Colors.light.text,
    lineHeight: 20,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  allergenTag: {
    backgroundColor: Colors.light.error + '20',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.sm,
    marginRight: Spacing.xs,
    marginBottom: Spacing.xs,
  },
  allergenText: {
    color: Colors.light.error,
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium,
    textTransform: 'capitalize',
  },
  categoryTag: {
    backgroundColor: Colors.light.card,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.sm,
    marginRight: Spacing.xs,
    marginBottom: Spacing.xs,
  },
  categoryText: {
    color: Colors.light.text,
    fontSize: FontSize.sm,
    textTransform: 'capitalize',
  },
  modalActions: {
    padding: Spacing.lg,
    borderTopWidth: 1,
    borderTopColor: Colors.light.border,
  },
  scanAgainButton: {
    backgroundColor: Colors.light.primary,
    paddingVertical: Spacing.lg,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
  },
  scanAgainButtonText: {
    color: Colors.light.background,
    fontSize: FontSize.lg,
    fontWeight: FontWeight.semibold,
  },
});