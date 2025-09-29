import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Switch,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useAuth } from '../../src/context/AuthContext';
import { Colors } from '../../src/constants/Colors';
import { Spacing, BorderRadius, FontSize, FontWeight, Shadow } from '../../src/constants/Layout';

export default function ProfileSettingsScreen() {
  const { user, logout } = useAuth();
  const [notifications, setNotifications] = useState(true);
  const [locationTracking, setLocationTracking] = useState(false);
  const [marketingEmails, setMarketingEmails] = useState(true);

  const handleLogout = () => {
    Alert.alert(
      'Déconnexion',
      'Êtes-vous sûr de vouloir vous déconnecter ?',
      [
        { text: 'Annuler', style: 'cancel' },
        { 
          text: 'Déconnecter', 
          style: 'destructive',
          onPress: logout
        }
      ]
    );
  };

  const handleExportData = () => {
    Alert.alert(
      'Exporter les données',
      'Votre demande d\'export de données sera traitée sous 48h. Vous recevrez un email avec vos données.'
    );
  };

  const renderProfileHeader = () => {
    const initials = user?.first_name?.charAt(0)?.toUpperCase() || 'U';
    
    return (
      <View style={styles.profileHeader}>
        <View style={styles.profileAvatar}>
          <Text style={styles.avatarText}>{initials}</Text>
        </View>
        <View style={styles.profileInfo}>
          <Text style={styles.profileName}>
            {user?.first_name} {user?.last_name}
          </Text>
          <Text style={styles.profileEmail}>{user?.email}</Text>
          <View style={styles.profileStats}>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>12</Text>
              <Text style={styles.statLabel}>Recettes</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>8</Text>
              <Text style={styles.statLabel}>Sauvegardées</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>156</Text>
              <Text style={styles.statLabel}>Abonnés</Text>
            </View>
          </View>
        </View>
        <TouchableOpacity style={styles.editButton}>
          <Ionicons name="pencil" size={16} color={Colors.light.primary} />
        </TouchableOpacity>
      </View>
    );
  };

  const renderSettingSection = (title: string, children: React.ReactNode) => (
    <View style={styles.settingSection}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );

  const renderSettingItem = (
    icon: string, 
    title: string, 
    subtitle?: string, 
    onPress?: () => void,
    rightElement?: React.ReactNode,
    showArrow = true
  ) => (
    <TouchableOpacity 
      style={styles.settingItem} 
      onPress={onPress}
      activeOpacity={onPress ? 0.7 : 1}
    >
      <View style={styles.settingLeft}>
        <Ionicons name={icon as any} size={24} color={Colors.light.primary} />
        <View style={styles.settingText}>
          <Text style={styles.settingTitle}>{title}</Text>
          {subtitle && <Text style={styles.settingSubtitle}>{subtitle}</Text>}
        </View>
      </View>
      <View style={styles.settingRight}>
        {rightElement}
        {showArrow && onPress && (
          <Ionicons name="chevron-forward" size={20} color={Colors.light.muted} />
        )}
      </View>
    </TouchableOpacity>
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
        <Text style={styles.headerTitle}>Profil & Réglages</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Profile Header */}
        {renderProfileHeader()}

        {/* Language & Units */}
        {renderSettingSection('Préférences', (
          <>
            {renderSettingItem(
              'language',
              'Langue',
              'Français',
              () => Alert.alert('Langue', 'Français est déjà sélectionné')
            )}
            {renderSettingItem(
              'speedometer',
              'Unités de mesure',
              'Système métrique',
              () => Alert.alert('Unités', 'Système métrique est déjà sélectionné')
            )}
          </>
        ))}

        {/* Notifications */}
        {renderSettingSection('Notifications', (
          <>
            {renderSettingItem(
              'notifications',
              'Notifications push',
              'Recevoir les notifications sur cet appareil',
              undefined,
              <Switch
                value={notifications}
                onValueChange={setNotifications}
                trackColor={{ false: Colors.light.border, true: Colors.light.primary }}
                thumbColor={Colors.light.background}
              />,
              false
            )}
            {renderSettingItem(
              'mail',
              'Emails marketing',
              'Recevoir les newsletters et promotions',
              undefined,
              <Switch
                value={marketingEmails}
                onValueChange={setMarketingEmails}
                trackColor={{ false: Colors.light.border, true: Colors.light.primary }}
                thumbColor={Colors.light.background}
              />,
              false
            )}
          </>
        ))}

        {/* Privacy & Data */}
        {renderSettingSection('Confidentialité et données', (
          <>
            {renderSettingItem(
              'location',
              'Suivi de localisation',
              'Améliorer les recommandations locales',
              undefined,
              <Switch
                value={locationTracking}
                onValueChange={setLocationTracking}
                trackColor={{ false: Colors.light.border, true: Colors.light.primary }}
                thumbColor={Colors.light.background}
              />,
              false
            )}
            {renderSettingItem(
              'download',
              'Exporter mes données',
              'Télécharger toutes vos données',
              handleExportData
            )}
            {renderSettingItem(
              'shield-checkmark',
              'Politique de confidentialité',
              'Consulter notre politique',
              () => Alert.alert('Politique', 'Ouverture de la politique de confidentialité...')
            )}
          </>
        ))}

        {/* Account Actions */}
        {renderSettingSection('Compte', (
          <>
            {renderSettingItem(
              'log-out',
              'Déconnexion',
              'Se déconnecter de ce compte',
              handleLogout,
              undefined,
              false
            )}
          </>
        ))}

        {/* App Info */}
        <View style={styles.appInfo}>
          <Text style={styles.appInfoText}>YaCook v1.0.0</Text>
          <Text style={styles.appInfoText}>© 2024 YaCook. Tous droits réservés.</Text>
        </View>
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
  placeholder: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.lg,
    backgroundColor: Colors.light.background,
    marginBottom: Spacing.lg,
  },
  profileAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: Colors.light.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  avatarText: {
    color: Colors.light.background,
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.semibold,
    color: Colors.light.text,
  },
  profileEmail: {
    fontSize: FontSize.sm,
    color: Colors.light.muted,
    marginTop: 2,
  },
  profileStats: {
    flexDirection: 'row',
    marginTop: Spacing.md,
    gap: Spacing.lg,
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.light.text,
  },
  statLabel: {
    fontSize: FontSize.xs,
    color: Colors.light.muted,
    marginTop: 2,
  },
  editButton: {
    padding: Spacing.sm,
  },
  settingSection: {
    backgroundColor: Colors.light.background,
    marginBottom: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  sectionTitle: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    color: Colors.light.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.light.background,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingText: {
    marginLeft: Spacing.md,
    flex: 1,
  },
  settingTitle: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.medium,
    color: Colors.light.text,
  },
  settingSubtitle: {
    fontSize: FontSize.sm,
    color: Colors.light.muted,
    marginTop: 2,
  },
  settingRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  appInfo: {
    alignItems: 'center',
    paddingVertical: Spacing.xl,
  },
  appInfoText: {
    fontSize: FontSize.xs,
    color: Colors.light.muted,
    marginBottom: 4,
  },
});