import React from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Colors } from '../src/constants/Colors';
import { Spacing, BorderRadius, FontSize, FontWeight, Shadow } from '../src/constants/Layout';
import { SmartButton } from '../src/components/SmartButton';

export default function PaywallScreen() {
  const handleUpgrade = () => {
    // For now, just show a success message and go back
    // In production, this would integrate with payment provider
    alert('Paiement en cours de développement. Cette fonctionnalité sera bientôt disponible !');
    router.back();
  };

  const handleClose = () => {
    router.back();
  };

  const premiumFeatures = [
    {
      icon: 'restaurant',
      title: 'Plans de repas IA',
      description: 'Générez des plans de repas personnalisés avec l\'intelligence artificielle',
    },
    {
      icon: 'nutrition',
      title: 'Analyse nutritionnelle',
      description: 'Suivez vos macros et micronutriments en détail',
    },
    {
      icon: 'calendar',
      title: 'Planification illimitée',
      description: 'Créez autant de plans de repas que vous le souhaitez',
    },
    {
      icon: 'heart',
      title: 'Recettes exclusives',
      description: 'Accédez à des recettes premium de chefs professionnels',
    },
    {
      icon: 'stats-chart',
      title: 'Statistiques avancées',
      description: 'Analysez vos progrès avec des rapports détaillés',
    },
    {
      icon: 'people',
      title: 'Support prioritaire',
      description: 'Assistance rapide de notre équipe dédiée',
    },
  ];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
          <Ionicons name="close" size={28} color={Colors.light.text} />
        </TouchableOpacity>
      </View>

      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero Section */}
        <View style={styles.hero}>
          <View style={styles.premiumBadge}>
            <Ionicons name="star" size={32} color={Colors.light.warning} />
          </View>
          <Text style={styles.title}>YaCook Premium</Text>
          <Text style={styles.subtitle}>
            Débloquez toutes les fonctionnalités pour une expérience culinaire optimale
          </Text>
        </View>

        {/* Features List */}
        <View style={styles.featuresContainer}>
          {premiumFeatures.map((feature, index) => (
            <View key={index} style={styles.featureCard}>
              <View style={styles.featureIconContainer}>
                <Ionicons 
                  name={feature.icon as any} 
                  size={24} 
                  color={Colors.light.primary} 
                />
              </View>
              <View style={styles.featureContent}>
                <Text style={styles.featureTitle}>{feature.title}</Text>
                <Text style={styles.featureDescription}>{feature.description}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* Pricing */}
        <View style={styles.pricingCard}>
          <View style={styles.pricingHeader}>
            <Text style={styles.pricingLabel}>Prix mensuel</Text>
            <View style={styles.pricingAmount}>
              <Text style={styles.pricingPrice}>9,99 €</Text>
              <Text style={styles.pricingPeriod}>/mois</Text>
            </View>
          </View>
          <Text style={styles.pricingDescription}>
            Annulation possible à tout moment • Sans engagement
          </Text>
        </View>

        {/* CTA Button */}
        <SmartButton 
          style={styles.upgradeButton}
          onPress={handleUpgrade}
          accessibilityLabel="Passer à Premium"
        >
          <Ionicons name="star" size={20} color="#fff" style={{ marginRight: 8 }} />
          <Text style={styles.upgradeButtonText}>Passer à Premium</Text>
        </SmartButton>

        {/* Footer Note */}
        <Text style={styles.footerNote}>
          En continuant, vous acceptez nos conditions d'utilisation et notre politique de confidentialité.
        </Text>
      </ScrollView>
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
    justifyContent: 'flex-end',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  closeButton: {
    padding: Spacing.xs,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xl,
  },
  hero: {
    alignItems: 'center',
    paddingVertical: Spacing.xl,
  },
  premiumBadge: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.light.warning + '20',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.lg,
  },
  title: {
    fontSize: FontSize.xxl,
    fontWeight: FontWeight.bold,
    color: Colors.light.text,
    marginBottom: Spacing.sm,
  },
  subtitle: {
    fontSize: FontSize.md,
    color: Colors.light.muted,
    textAlign: 'center',
    paddingHorizontal: Spacing.xl,
    lineHeight: 22,
  },
  featuresContainer: {
    marginTop: Spacing.lg,
  },
  featureCard: {
    flexDirection: 'row',
    backgroundColor: Colors.light.card,
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.md,
    ...Shadow.small,
  },
  featureIconContainer: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.light.primary + '15',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  featureContent: {
    flex: 1,
  },
  featureTitle: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.light.text,
    marginBottom: 4,
  },
  featureDescription: {
    fontSize: FontSize.sm,
    color: Colors.light.muted,
    lineHeight: 18,
  },
  pricingCard: {
    backgroundColor: Colors.light.primary + '10',
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    marginTop: Spacing.lg,
    marginBottom: Spacing.lg,
    borderWidth: 2,
    borderColor: Colors.light.primary,
  },
  pricingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  pricingLabel: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.medium,
    color: Colors.light.text,
  },
  pricingAmount: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  pricingPrice: {
    fontSize: FontSize.xxl,
    fontWeight: FontWeight.bold,
    color: Colors.light.primary,
  },
  pricingPeriod: {
    fontSize: FontSize.md,
    color: Colors.light.muted,
    marginLeft: 4,
  },
  pricingDescription: {
    fontSize: FontSize.sm,
    color: Colors.light.muted,
    textAlign: 'center',
  },
  upgradeButton: {
    flexDirection: 'row',
    backgroundColor: Colors.light.primary,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadow.medium,
  },
  upgradeButtonText: {
    color: '#fff',
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
  },
  footerNote: {
    fontSize: FontSize.xs,
    color: Colors.light.muted,
    textAlign: 'center',
    marginTop: Spacing.lg,
    lineHeight: 16,
  },
});
