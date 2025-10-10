import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Switch,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../../src/constants/Colors';
import { Spacing, FontSize, FontWeight } from '../../../src/constants/Layout';
import { AppTexts } from '../../../src/constants/Texts';

interface SettingsItemProps {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle?: string;
  onPress?: () => void;
  showChevron?: boolean;
  showSwitch?: boolean;
  switchValue?: boolean;
  onSwitchChange?: (value: boolean) => void;
}

const SettingsItem: React.FC<SettingsItemProps> = ({
  icon,
  title,
  subtitle,
  onPress,
  showChevron = true,
  showSwitch = false,
  switchValue = false,
  onSwitchChange,
}) => (
  <TouchableOpacity
    style={styles.settingsItem}
    onPress={onPress}
    disabled={showSwitch}
    activeOpacity={showSwitch ? 1 : 0.7}
  >
    <View style={styles.settingsItemLeft}>
      <View style={styles.settingsIcon}>
        <Ionicons name={icon} size={20} color={Colors.light.primary} />
      </View>
      <View style={styles.settingsTextContainer}>
        <Text style={styles.settingsItemTitle}>{title}</Text>
        {subtitle && <Text style={styles.settingsItemSubtitle}>{subtitle}</Text>}
      </View>
    </View>
    
    {showSwitch ? (
      <Switch
        value={switchValue}
        onValueChange={onSwitchChange}
        trackColor={{ false: Colors.light.border, true: Colors.light.primary }}
        thumbColor={switchValue ? Colors.light.background : Colors.light.muted}
      />
    ) : (
      showChevron && (
        <Ionicons name="chevron-forward" size={20} color={Colors.light.muted} />
      )
    )}
  </TouchableOpacity>
);

export default function SettingsScreen() {
  const [pushNotifications, setPushNotifications] = useState(true);
  const [inAppNotifications, setInAppNotifications] = useState(true);
  const [emailNotifications, setEmailNotifications] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  
  // Units settings
  const [units, setUnits] = useState('métrique');
  
  // Food preferences
  const [foodPreferences, setFoodPreferences] = useState({
    végétarien: false,
    végan: false,
    halal: false,
    casher: false,
    sans_lactose: false,
    sans_gluten: false,
    sans_noix: false,
  });

  const handleNotificationSetting = (type: string, value: boolean) => {
    switch (type) {
      case 'push':
        setPushNotifications(value);
        break;
      case 'inApp':
        setInAppNotifications(value);
        break;
      case 'email':
        setEmailNotifications(value);
        break;
    }
    // TODO: Save to backend or local storage
  };

  const handlePrivacySettings = () => {
    Alert.alert('Confidentialité', 'Paramètres de confidentialité à venir');
  };

  const handleDataExport = () => {
    Alert.alert(
      'Export des données',
      'Vous pouvez exporter vos données personnelles. Cette fonctionnalité sera disponible prochainement.',
      [{ text: 'OK' }]
    );
  };

  const handleUnitsChange = () => {
    Alert.alert(
      'Unités',
      'Choisissez le système d\'unités',
      [
        { text: 'Métrique (kg, g, L, ml)', onPress: () => setUnits('métrique') },
        { text: 'Impérial (lb, oz, fl oz)', onPress: () => setUnits('impérial') },
        { text: 'Annuler', style: 'cancel' },
      ]
    );
  };

  const toggleFoodPreference = (preference: string) => {
    setFoodPreferences(prev => ({
      ...prev,
      [preference]: !prev[preference],
    }));
    // TODO: Save to backend or local storage
  };

  const handleChangePassword = () => {
    Alert.alert('Changer le mot de passe', 'Cette fonctionnalité sera disponible prochainement.');
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Supprimer le compte',
      'Êtes-vous sûr de vouloir supprimer définitivement votre compte ? Cette action est irréversible.',
      [
        { text: 'Annuler', style: 'cancel' },
        { 
          text: 'Supprimer', 
          style: 'destructive',
          onPress: () => {
            // TODO: Implement account deletion
            Alert.alert('Fonctionnalité', 'Suppression de compte à venir');
          }
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Notifications Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Notifications</Text>
          <View style={styles.settingsContainer}>
            <SettingsItem
              icon="notifications-outline"
              title="Notifications push"
              subtitle="Recevoir des notifications sur votre appareil"
              showSwitch={true}
              switchValue={pushNotifications}
              onSwitchChange={(value) => handleNotificationSetting('push', value)}
            />
            <SettingsItem
              icon="phone-portrait-outline"
              title="Notifications dans l'app"
              subtitle="Afficher les notifications dans l'application"
              showSwitch={true}
              switchValue={inAppNotifications}
              onSwitchChange={(value) => handleNotificationSetting('inApp', value)}
            />
            <SettingsItem
              icon="mail-outline"
              title="Notifications email"
              subtitle="Recevoir des emails de notification"
              showSwitch={true}
              switchValue={emailNotifications}
              onSwitchChange={(value) => handleNotificationSetting('email', value)}
            />
          </View>
        </View>

        {/* Appearance Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Apparence</Text>
          <View style={styles.settingsContainer}>
            <SettingsItem
              icon="moon-outline"
              title="Mode sombre"
              subtitle="Utiliser le thème sombre (bientôt disponible)"
              showSwitch={true}
              switchValue={darkMode}
              onSwitchChange={setDarkMode}
            />
          </View>
        </View>

        {/* Units & Preferences */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Préférences</Text>
          <View style={styles.settingsContainer}>
            <SettingsItem
              icon="calculator-outline"
              title="Unités"
              subtitle={`Système ${units}`}
              onPress={handleUnitsChange}
            />
          </View>
        </View>

        {/* Food Preferences */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Préférences alimentaires</Text>
          <View style={styles.settingsContainer}>
            <View style={styles.foodPreferencesContainer}>
              {Object.entries(foodPreferences).map(([key, value]) => (
                <TouchableOpacity
                  key={key}
                  style={[
                    styles.foodPreferencePill,
                    value && styles.foodPreferencePillActive
                  ]}
                  onPress={() => toggleFoodPreference(key)}
                >
                  <Text style={[
                    styles.foodPreferenceText,
                    value && styles.foodPreferenceTextActive
                  ]}>
                    {key.replace('_', ' ')}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>

        {/* Privacy & Security */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Confidentialité et sécurité</Text>
          <View style={styles.settingsContainer}>
            <SettingsItem
              icon="key-outline"
              title="Changer le mot de passe"
              subtitle="Modifier votre mot de passe"
              onPress={handleChangePassword}
            />
            <SettingsItem
              icon="shield-outline"
              title="Confidentialité"
              subtitle="Gérer vos paramètres de confidentialité"
              onPress={handlePrivacySettings}
            />
            <SettingsItem
              icon="download-outline"
              title="Exporter mes données"
              subtitle="Télécharger une copie de vos données"
              onPress={handleDataExport}
            />
          </View>
        </View>

        {/* App Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>À propos</Text>
          <View style={styles.settingsContainer}>
            <SettingsItem
              icon="information-circle-outline"
              title="Version de l'application"
              subtitle="1.0.0"
              showChevron={false}
            />
            <SettingsItem
              icon="document-text-outline"
              title="Conditions d'utilisation"
              onPress={() => Alert.alert('Info', 'Conditions d\'utilisation à venir')}
            />
            <SettingsItem
              icon="shield-checkmark-outline"
              title="Politique de confidentialité"
              onPress={() => Alert.alert('Info', 'Politique de confidentialité à venir')}
            />
          </View>
        </View>

        {/* Danger Zone */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Zone de danger</Text>
          <View style={styles.settingsContainer}>
            <SettingsItem
              icon="trash-outline"
              title="Supprimer mon compte"
              subtitle="Supprimer définitivement votre compte"
              onPress={handleDeleteAccount}
              showChevron={false}
            />
          </View>
        </View>

        {/* Bottom Spacing */}
        <View style={styles.bottomSpacing} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.card,
  },
  scrollView: {
    flex: 1,
  },
  section: {
    marginTop: Spacing.xl,
  },
  sectionTitle: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    color: Colors.light.muted,
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.sm,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  settingsContainer: {
    backgroundColor: Colors.light.background,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: Colors.light.border,
  },
  settingsItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.light.border,
    backgroundColor: Colors.light.background,
  },
  settingsItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingsIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.light.card,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  settingsTextContainer: {
    flex: 1,
  },
  settingsItemTitle: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.medium,
    color: Colors.light.text,
  },
  settingsItemSubtitle: {
    fontSize: FontSize.sm,
    color: Colors.light.muted,
    marginTop: 2,
  },
  bottomSpacing: {
    height: 60,
  },
});