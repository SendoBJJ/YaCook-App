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
  Image,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BarCodeScanner } from 'expo-barcode-scanner';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { productsApi } from '../../src/services/api';
import { client } from '../../src/api/client';
import { Colors } from '../../src/constants/Colors';
import { AppTexts } from '../../src/constants/Texts';
import { Spacing, BorderRadius, FontSize, FontWeight, Shadow } from '../../src/constants/Layout';
import { Product } from '../../src/types';
import { SmartButton } from '../../src/components/SmartButton';
import { useToast } from '../../src/components/Toast';

type ScanMode = 'barcode' | 'photo';

type PhotoScanResult = {
  matched: boolean;
  confidence?: number;
  product?: {
    ean?: string;
    name: string;
    brand?: string;
    image?: string;
    quantity?: string;
    nutriments?: any;
    nutriscore_grade?: string;
    ingredients_text?: string;
    allergens_tags?: string[];
    categories_tags?: string[];
  };
  candidates?: Array<{
    code?: string;
    name: string;
    brand?: string;
    image?: string;
    confidence: number;
    nutriscore_grade?: string;
  }>;
  error?: string;
  message?: string;
};

export default function ScanScreen() {
  // Mode selection
  const [scanMode, setScanMode] = useState<ScanMode>('barcode');
  
  // Barcode scanning state
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [scanned, setScanned] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  
  // Photo scanning state
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [photoResult, setPhotoResult] = useState<PhotoScanResult | null>(null);
  
  // Common state
  const [isLoading, setIsLoading] = useState(false);
  const [product, setProduct] = useState<Product | null>(null);
  const [showProductModal, setShowProductModal] = useState(false);
  
  const { showToast, ToastComponent } = useToast();

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

  // Barcode scanning handlers
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
        showToast('Produit non trouvé dans la base de données', 'error');
        resetScan();
      }
    } catch (error) {
      console.error('Error scanning product:', error);
      showToast('Impossible de récupérer les informations du produit', 'error');
      resetScan();
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

  // Photo scanning handlers
  const requestMediaPermissions = async (type: 'camera' | 'library'): Promise<boolean> => {
    try {
      let status;
      if (type === 'camera') {
        const result = await ImagePicker.requestCameraPermissionsAsync();
        status = result.status;
      } else {
        const result = await ImagePicker.requestMediaLibraryPermissionsAsync();
        status = result.status;
      }
      
      if (status !== 'granted') {
        showToast('Accès refusé à l\'appareil photo/la galerie', 'error');
        return false;
      }
      return true;
    } catch (error) {
      console.error('Permission error:', error);
      return false;
    }
  };

  const pickImageFromCamera = async () => {
    const hasPermission = await requestMediaPermissions('camera');
    if (!hasPermission) return;

    try {
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        const uri = result.assets[0].uri;
        const fileSize = result.assets[0].fileSize || 0;
        
        // Check file size (8 MB limit)
        if (fileSize > 8 * 1024 * 1024) {
          showToast('Image trop lourde (max. 8 Mo)', 'error');
          return;
        }
        
        setSelectedImage(uri);
        setPhotoResult(null);
      }
    } catch (error) {
      console.error('Camera error:', error);
      showToast('Erreur lors de la prise de photo', 'error');
    }
  };

  const pickImageFromGallery = async () => {
    const hasPermission = await requestMediaPermissions('library');
    if (!hasPermission) return;

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        const uri = result.assets[0].uri;
        const fileSize = result.assets[0].fileSize || 0;
        
        // Check file size (8 MB limit)
        if (fileSize > 8 * 1024 * 1024) {
          showToast('Image trop lourde (max. 8 Mo)', 'error');
          return;
        }
        
        setSelectedImage(uri);
        setPhotoResult(null);
      }
    } catch (error) {
      console.error('Gallery error:', error);
      showToast('Erreur lors de la sélection de l\'image', 'error');
    }
  };

  const removeSelectedImage = () => {
    setSelectedImage(null);
    setPhotoResult(null);
  };

  const analyzePhoto = async () => {
    if (!selectedImage) return;

    setIsAnalyzing(true);
    setPhotoResult(null);

    try {
      // Create form data
      const formData = new FormData();
      
      // Extract filename from URI
      const filename = selectedImage.split('/').pop() || 'photo.jpg';
      const match = /\.(\w+)$/.exec(filename);
      const type = match ? `image/${match[1]}` : 'image/jpeg';
      
      // Append file
      formData.append('file', {
        uri: selectedImage,
        name: filename,
        type: type,
      } as any);

      console.log('📸 Analyzing photo...');
      
      // Call API
      const response = await client.post('/scan/photo', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        params: {
          language: 'fr'
        }
      });

      console.log('✅ Photo analysis result:', response.data);
      
      const result = response.data as PhotoScanResult;
      setPhotoResult(result);

      if (result.matched && result.product) {
        showToast('Analyse terminée ✅', 'success');
      } else if (result.candidates && result.candidates.length > 0) {
        showToast('Plusieurs produits possibles', 'info');
      } else {
        showToast(
          result.error || 'Produit introuvable. Réessayez avec une photo de l\'emballage face avant.',
          'error'
        );
      }
    } catch (error: any) {
      console.error('Photo analysis error:', error);
      
      if (error.response?.status === 400) {
        showToast('Image invalide ou trop lourde (max. 8 Mo)', 'error');
      } else if (error.response?.status === 401) {
        showToast('Session expirée, veuillez vous reconnecter', 'error');
      } else {
        showToast('Service indisponible, réessayez', 'error');
      }
    } finally {
      setIsAnalyzing(false);
    }
  };

  const selectCandidate = async (candidate: any) => {
    if (!candidate.code) {
      showToast('Code produit manquant', 'error');
      return;
    }

    setIsLoading(true);
    try {
      const response = await productsApi.getProductByBarcode(candidate.code, 'fr');
      
      if (response.success && response.product) {
        setProduct(response.product);
        setShowProductModal(true);
      } else {
        showToast('Impossible de charger les détails du produit', 'error');
      }
    } catch (error) {
      console.error('Error loading candidate:', error);
      showToast('Erreur lors du chargement', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const switchToBarcodeMode = () => {
    setScanMode('barcode');
    setSelectedImage(null);
    setPhotoResult(null);
  };

  // Render helpers
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

  // Render mode selector
  const renderModeSelector = () => (
    <View style={styles.modeSelector}>
      <TouchableOpacity
        style={[
          styles.modeButton,
          scanMode === 'barcode' && styles.modeButtonActive
        ]}
        onPress={() => setScanMode('barcode')}
      >
        <Ionicons 
          name="barcode-outline" 
          size={20} 
          color={scanMode === 'barcode' ? Colors.light.primary : Colors.light.muted} 
        />
        <Text style={[
          styles.modeButtonText,
          scanMode === 'barcode' && styles.modeButtonTextActive
        ]}>
          Code-barres
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[
          styles.modeButton,
          scanMode === 'photo' && styles.modeButtonActive
        ]}
        onPress={() => setScanMode('photo')}
      >
        <Ionicons 
          name="camera-outline" 
          size={20} 
          color={scanMode === 'photo' ? Colors.light.primary : Colors.light.muted} 
        />
        <Text style={[
          styles.modeButtonText,
          scanMode === 'photo' && styles.modeButtonTextActive
        ]}>
          Photo (IA)
        </Text>
      </TouchableOpacity>
    </View>
  );

  // Render barcode panel
  const renderBarcodePanel = () => {
    if (hasPermission === null) {
      return (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={Colors.light.primary} />
          <Text style={styles.centerText}>Demande d'autorisation...</Text>
        </View>
      );
    }

    if (hasPermission === false) {
      return (
        <View style={styles.centerContainer}>
          <Ionicons name="camera-off" size={64} color={Colors.light.muted} />
          <Text style={styles.centerTitle}>Accès caméra requis</Text>
          <Text style={styles.centerText}>
            Veuillez autoriser l'accès à la caméra dans les paramètres
          </Text>
          <SmartButton
            style={styles.permissionButton}
            onPress={requestCameraPermission}
          >
            <Text style={styles.buttonText}>Autoriser</Text>
          </SmartButton>
        </View>
      );
    }

    if (!isScanning) {
      return (
        <View style={styles.centerContainer}>
          <Ionicons name="barcode" size={64} color={Colors.light.primary} />
          <Text style={styles.centerTitle}>Scanner un code-barres</Text>
          <Text style={styles.centerText}>
            Placez le code-barres dans le cadre pour scanner
          </Text>
          <SmartButton
            style={styles.startButton}
            onPress={startScanning}
          >
            <Ionicons name="scan" size={20} color={Colors.light.background} />
            <Text style={styles.buttonText}>Commencer le scan</Text>
          </SmartButton>
        </View>
      );
    }

    return (
      <View style={styles.scannerContainer}>
        <BarCodeScanner
          onBarCodeScanned={scanned ? undefined : handleBarCodeScanned}
          style={StyleSheet.absoluteFillObject}
        />
        
        <View style={styles.scannerOverlay}>
          <View style={styles.scannerFrame} />
          <Text style={styles.scannerHint}>
            Placez le code-barres dans le cadre
          </Text>
        </View>

        <TouchableOpacity
          style={styles.closeButton}
          onPress={stopScanning}
        >
          <Ionicons name="close" size={24} color={Colors.light.background} />
        </TouchableOpacity>

        {isLoading && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color={Colors.light.background} />
            <Text style={styles.loadingText}>Recherche du produit...</Text>
          </View>
        )}
      </View>
    );
  };

  // Render photo panel
  const renderPhotoPanel = () => (
    <ScrollView style={styles.photoPanel} contentContainerStyle={styles.photoPanelContent}>
      <Text style={styles.panelTitle}>Scanner avec l'IA</Text>
      <Text style={styles.panelHint}>
        Astuce : prenez la face avant nette, bien éclairée
      </Text>

      {/* Image picker buttons */}
      {!selectedImage && (
        <View style={styles.photoActions}>
          <SmartButton
            style={styles.photoButton}
            onPress={pickImageFromCamera}
          >
            <Ionicons name="camera" size={24} color={Colors.light.background} />
            <Text style={styles.photoButtonText}>Prendre une photo</Text>
          </SmartButton>

          <SmartButton
            style={styles.photoButton}
            onPress={pickImageFromGallery}
          >
            <Ionicons name="images" size={24} color={Colors.light.background} />
            <Text style={styles.photoButtonText}>Choisir depuis la galerie</Text>
          </SmartButton>
        </View>
      )}

      {/* Image preview */}
      {selectedImage && (
        <View style={styles.imagePreviewContainer}>
          <Image source={{ uri: selectedImage }} style={styles.imagePreview} />
          <TouchableOpacity
            style={styles.removeImageButton}
            onPress={removeSelectedImage}
          >
            <Ionicons name="close-circle" size={32} color={Colors.light.error} />
          </TouchableOpacity>
        </View>
      )}

      {/* Analyze button */}
      {selectedImage && !photoResult && (
        <SmartButton
          style={styles.analyzeButton}
          onPress={analyzePhoto}
          disabled={isAnalyzing}
          loading={isAnalyzing}
        >
          <Text style={styles.analyzeButtonText}>
            {isAnalyzing ? 'Analyse en cours...' : 'Analyser'}
          </Text>
        </SmartButton>
      )}

      {/* Results */}
      {photoResult && renderPhotoResults()}
    </ScrollView>
  );

  // Render photo scan results
  const renderPhotoResults = () => {
    if (!photoResult) return null;

    // Single match
    if (photoResult.matched && photoResult.product) {
      const prod = photoResult.product;
      return (
        <View style={styles.resultCard}>
          <Text style={styles.resultTitle}>Produit trouvé ✅</Text>
          <Text style={styles.confidenceText}>
            Confiance: {((photoResult.confidence || 0) * 100).toFixed(0)}%
          </Text>

          {prod.image && (
            <Image source={{ uri: prod.image }} style={styles.productImage} />
          )}

          <Text style={styles.productName}>{prod.name}</Text>
          {prod.brand && <Text style={styles.productBrand}>{prod.brand}</Text>}
          {prod.quantity && <Text style={styles.productQuantity}>{prod.quantity}</Text>}

          {prod.nutriscore_grade && (
            <View style={[styles.nutriScoreBadge, { backgroundColor: getNutriScoreColor(prod.nutriscore_grade) }]}>
              <Text style={styles.nutriScoreText}>{prod.nutriscore_grade.toUpperCase()}</Text>
            </View>
          )}

          <View style={styles.resultActions}>
            <SmartButton
              style={styles.resultButton}
              onPress={() => {
                // Navigate to details or add to list
                showToast('Fonctionnalité à venir', 'info');
              }}
            >
              <Text style={styles.resultButtonText}>Voir détails</Text>
            </SmartButton>

            <SmartButton
              style={styles.analyzeButton}
              onPress={removeSelectedImage}
            >
              <Text style={styles.analyzeButtonText}>Nouvelle analyse</Text>
            </SmartButton>
          </View>
        </View>
      );
    }

    // Candidates
    if (photoResult.candidates && photoResult.candidates.length > 0) {
      return (
        <View style={styles.candidatesContainer}>
          <Text style={styles.resultTitle}>Plusieurs produits possibles</Text>
          <Text style={styles.candidatesHint}>Choisissez le bon produit :</Text>

          {photoResult.candidates.map((candidate, index) => (
            <TouchableOpacity
              key={index}
              style={styles.candidateCard}
              onPress={() => selectCandidate(candidate)}
            >
              {candidate.image && (
                <Image source={{ uri: candidate.image }} style={styles.candidateImage} />
              )}
              
              <View style={styles.candidateInfo}>
                <Text style={styles.candidateName}>{candidate.name}</Text>
                {candidate.brand && (
                  <Text style={styles.candidateBrand}>{candidate.brand}</Text>
                )}
                <Text style={styles.candidateConfidence}>
                  Confiance: {((candidate.confidence || 0) * 100).toFixed(0)}%
                </Text>
              </View>

              <Ionicons name="chevron-forward" size={24} color={Colors.light.muted} />
            </TouchableOpacity>
          ))}

          <SmartButton
            style={styles.retryButton}
            onPress={removeSelectedImage}
          >
            <Text style={styles.retryButtonText}>Nouvelle photo</Text>
          </SmartButton>
        </View>
      );
    }

    // No match
    return (
      <View style={styles.noMatchContainer}>
        <Ionicons name="sad-outline" size={64} color={Colors.light.muted} />
        <Text style={styles.noMatchTitle}>Produit introuvable</Text>
        <Text style={styles.noMatchText}>
          Réessayez avec une photo de l'emballage face avant, bien éclairée
        </Text>

        <View style={styles.noMatchActions}>
          <SmartButton
            style={styles.switchButton}
            onPress={switchToBarcodeMode}
          >
            <Ionicons name="barcode" size={20} color={Colors.light.background} />
            <Text style={styles.switchButtonText}>Scanner le code-barres</Text>
          </SmartButton>

          <SmartButton
            style={styles.retryButton}
            onPress={removeSelectedImage}
          >
            <Text style={styles.retryButtonText}>Nouvelle photo</Text>
          </SmartButton>
        </View>
      </View>
    );
  };

  // Render product details modal (reused from barcode)
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
              <Text style={styles.productNameModal}>
                {product.product_name_fr || product.product_name || 'Produit sans nom'}
              </Text>
              {product.brands && (
                <Text style={styles.productBrandModal}>{product.brands}</Text>
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
                <Text style={styles.sectionTitle}>Valeurs nutritionnelles (pour 100g)</Text>
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
                    <Text style={styles.nutrimentLabel}>Protéines</Text>
                    <Text style={styles.nutrimentValue}>
                      {renderNutrimentValue(product.nutriments.proteins)}
                    </Text>
                  </View>
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
              <Text style={styles.scanAgainText}>Scanner un autre produit</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {renderModeSelector()}
      
      <View style={styles.content}>
        {scanMode === 'barcode' ? renderBarcodePanel() : renderPhotoPanel()}
      </View>

      {renderProductDetails()}
      <ToastComponent />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  content: {
    flex: 1,
  },
  
  // Mode selector
  modeSelector: {
    flexDirection: 'row',
    backgroundColor: Colors.light.background,
    padding: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
  },
  modeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.md,
    gap: Spacing.sm,
  },
  modeButtonActive: {
    backgroundColor: Colors.light.primaryLight,
  },
  modeButtonText: {
    fontSize: FontSize.md,
    color: Colors.light.muted,
    fontWeight: FontWeight.medium,
  },
  modeButtonTextActive: {
    color: Colors.light.primary,
    fontWeight: FontWeight.semiBold,
  },

  // Center container
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
  },
  centerTitle: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.semiBold,
    color: Colors.light.text,
    marginTop: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  centerText: {
    fontSize: FontSize.md,
    color: Colors.light.muted,
    textAlign: 'center',
    marginBottom: Spacing.lg,
  },
  permissionButton: {
    backgroundColor: Colors.light.primary,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
    borderRadius: BorderRadius.md,
    marginTop: Spacing.lg,
  },
  buttonText: {
    color: Colors.light.background,
    fontSize: FontSize.md,
    fontWeight: FontWeight.medium,
  },
  startButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.light.primary,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
    borderRadius: BorderRadius.md,
    marginTop: Spacing.lg,
  },

  // Scanner
  scannerContainer: {
    flex: 1,
    position: 'relative',
  },
  scannerOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  scannerFrame: {
    width: 250,
    height: 250,
    borderWidth: 2,
    borderColor: Colors.light.primary,
    borderRadius: BorderRadius.lg,
    backgroundColor: 'transparent',
  },
  scannerHint: {
    color: Colors.light.background,
    fontSize: FontSize.md,
    marginTop: Spacing.xl,
    textAlign: 'center',
  },
  closeButton: {
    position: 'absolute',
    top: Spacing.xl,
    right: Spacing.xl,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 50,
    padding: Spacing.sm,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: Colors.light.background,
    fontSize: FontSize.md,
    marginTop: Spacing.md,
  },

  // Photo panel
  photoPanel: {
    flex: 1,
  },
  photoPanelContent: {
    padding: Spacing.lg,
  },
  panelTitle: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.semiBold,
    color: Colors.light.text,
    marginBottom: Spacing.sm,
  },
  panelHint: {
    fontSize: FontSize.sm,
    color: Colors.light.muted,
    marginBottom: Spacing.xl,
  },
  photoActions: {
    gap: Spacing.md,
  },
  photoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.light.primary,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  photoButtonText: {
    color: Colors.light.background,
    fontSize: FontSize.md,
    fontWeight: FontWeight.medium,
  },

  // Image preview
  imagePreviewContainer: {
    position: 'relative',
    marginBottom: Spacing.lg,
  },
  imagePreview: {
    width: '100%',
    height: 300,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.light.border,
  },
  removeImageButton: {
    position: 'absolute',
    top: Spacing.sm,
    right: Spacing.sm,
    backgroundColor: Colors.light.background,
    borderRadius: 50,
  },

  // Analyze button
  analyzeButton: {
    backgroundColor: Colors.light.primary,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  analyzeButtonText: {
    color: Colors.light.background,
    fontSize: FontSize.md,
    fontWeight: FontWeight.semiBold,
  },

  // Results
  resultCard: {
    backgroundColor: Colors.light.background,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.light.border,
    marginBottom: Spacing.lg,
  },
  resultTitle: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.semiBold,
    color: Colors.light.text,
    marginBottom: Spacing.sm,
  },
  confidenceText: {
    fontSize: FontSize.sm,
    color: Colors.light.muted,
    marginBottom: Spacing.md,
  },
  productImage: {
    width: '100%',
    height: 200,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.md,
    backgroundColor: Colors.light.border,
  },
  productName: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.semiBold,
    color: Colors.light.text,
    marginBottom: Spacing.xs,
  },
  productBrand: {
    fontSize: FontSize.md,
    color: Colors.light.muted,
    marginBottom: Spacing.xs,
  },
  productQuantity: {
    fontSize: FontSize.sm,
    color: Colors.light.muted,
    marginBottom: Spacing.md,
  },
  nutriScoreBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.sm,
    marginBottom: Spacing.md,
  },
  nutriScoreText: {
    color: Colors.light.background,
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
  },
  resultActions: {
    gap: Spacing.sm,
  },
  resultButton: {
    backgroundColor: Colors.light.background,
    borderWidth: 1,
    borderColor: Colors.light.primary,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
  },
  resultButtonText: {
    color: Colors.light.primary,
    fontSize: FontSize.md,
    fontWeight: FontWeight.medium,
  },

  // Candidates
  candidatesContainer: {
    marginBottom: Spacing.lg,
  },
  candidatesHint: {
    fontSize: FontSize.sm,
    color: Colors.light.muted,
    marginBottom: Spacing.md,
  },
  candidateCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.light.background,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  candidateImage: {
    width: 60,
    height: 60,
    borderRadius: BorderRadius.sm,
    marginRight: Spacing.md,
    backgroundColor: Colors.light.border,
  },
  candidateInfo: {
    flex: 1,
  },
  candidateName: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.medium,
    color: Colors.light.text,
  },
  candidateBrand: {
    fontSize: FontSize.sm,
    color: Colors.light.muted,
    marginTop: Spacing.xs,
  },
  candidateConfidence: {
    fontSize: FontSize.xs,
    color: Colors.light.primary,
    marginTop: Spacing.xs,
  },

  // No match
  noMatchContainer: {
    alignItems: 'center',
    padding: Spacing.xl,
    backgroundColor: Colors.light.background,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  noMatchTitle: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.semiBold,
    color: Colors.light.text,
    marginTop: Spacing.md,
    marginBottom: Spacing.sm,
  },
  noMatchText: {
    fontSize: FontSize.sm,
    color: Colors.light.muted,
    textAlign: 'center',
    marginBottom: Spacing.lg,
  },
  noMatchActions: {
    width: '100%',
    gap: Spacing.sm,
  },
  switchButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.light.primary,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  switchButtonText: {
    color: Colors.light.background,
    fontSize: FontSize.md,
    fontWeight: FontWeight.medium,
  },
  retryButton: {
    backgroundColor: Colors.light.background,
    borderWidth: 1,
    borderColor: Colors.light.primary,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
  },
  retryButtonText: {
    color: Colors.light.primary,
    fontSize: FontSize.md,
    fontWeight: FontWeight.medium,
  },

  // Modal
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
    fontWeight: FontWeight.semiBold,
    color: Colors.light.text,
  },
  modalContent: {
    flex: 1,
  },
  modalScrollContent: {
    padding: Spacing.lg,
  },
  productHeader: {
    marginBottom: Spacing.lg,
  },
  productNameModal: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.semiBold,
    color: Colors.light.text,
    marginBottom: Spacing.xs,
  },
  productBrandModal: {
    fontSize: FontSize.md,
    color: Colors.light.muted,
  },
  section: {
    marginBottom: Spacing.lg,
  },
  sectionTitle: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semiBold,
    color: Colors.light.text,
    marginBottom: Spacing.md,
  },
  nutrimentsList: {
    backgroundColor: Colors.light.backgroundSecondary,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
  },
  nutrimentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
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
    color: Colors.light.primary,
  },
  modalActions: {
    padding: Spacing.lg,
    borderTopWidth: 1,
    borderTopColor: Colors.light.border,
  },
  scanAgainButton: {
    backgroundColor: Colors.light.primary,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
  },
  scanAgainText: {
    color: Colors.light.background,
    fontSize: FontSize.md,
    fontWeight: FontWeight.medium,
  },
});
