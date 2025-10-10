import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
} from 'react-native';
import { Link, router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../src/context/AuthContext';
import { Colors } from '../../src/constants/Colors';
import { AppTexts } from '../../src/constants/Texts';
import { Spacing, BorderRadius, FontSize, FontWeight } from '../../src/constants/Layout';
import { SmartButton } from '../../src/components/SmartButton';

export default function LoginScreen() {
  const { login } = useAuth();
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Cross-platform safe setters (handles RN onChangeText and web onChange)
  const toStr = (v: any) => typeof v === 'string' ? v : (v?.target?.value ?? '');
  const handleEmailChange = (v: any) => setEmail(toStr(v));
  const handlePasswordChange = (v: any) => setPassword(toStr(v));

  const handleLogin = async () => {
    console.log('🔐 Login button clicked!', { email: email.trim(), passwordLength: password.length });
    
    if (!email.trim() || !password.trim()) {
      console.log('❌ Validation failed: empty fields');
      Alert.alert('Erreur', 'Veuillez remplir tous les champs');
      return;
    }

    try {
      setIsLoading(true);
      console.log('🚀 Starting login process...');
      
      // Log the attempt for debugging
      console.log('🔐 Login attempt to:', process.env.EXPO_PUBLIC_API_BASE_URL + '/auth/login');
      
      await login({ email: email.trim(), password });
      console.log('✅ Login successful, redirecting...');
      router.replace('/(tabs)');
    } catch (error: any) {
      console.error('❌ Login error:', {
        message: error.message,
        status: error.response?.status,
        url: process.env.EXPO_PUBLIC_API_BASE_URL + '/auth/login',
        timestamp: new Date().toISOString()
      });
      
      // Enhanced French error messages
      let errorMessage = 'Connexion impossible — réessayez plus tard';
      
      if (error.response?.status === 401) {
        errorMessage = 'Email ou mot de passe incorrect';
      } else if (error.response?.status >= 500) {
        errorMessage = 'Erreur du serveur — réessayez dans quelques minutes';
      } else if (!error.response) {
        errorMessage = 'Problème de connexion — vérifiez votre internet';
      }
      
      Alert.alert('Erreur de connexion', errorMessage);
    } finally {
      console.log('🏁 Login process finished');
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.appName}>YaCook</Text>
            <Text style={styles.tagline}>Y'a quoi ? YaCook !</Text>
          </View>

          {/* Login Form */}
          <View style={styles.form}>
            <Text style={styles.title}>{AppTexts.auth.loginTitle}</Text>

            <View style={styles.inputContainer}>
              <Ionicons name="mail-outline" size={20} color={Colors.light.muted} />
              <TextInput
                style={styles.input}
                placeholder={AppTexts.auth.email}
                placeholderTextColor={Colors.light.muted}
                value={email}
                onChangeText={handleEmailChange}   // RN
                onChange={handleEmailChange}       // web
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            <View style={styles.inputContainer}>
              <Ionicons name="lock-closed-outline" size={20} color={Colors.light.muted} />
              <TextInput
                style={styles.input}
                placeholder={AppTexts.auth.password}
                placeholderTextColor={Colors.light.muted}
                value={password}
                onChangeText={handlePasswordChange}   // RN
                onChange={handlePasswordChange}       // web
                secureTextEntry={!showPassword}
                autoCapitalize="none"
              />
              <SmartButton
                onPress={() => setShowPassword(!showPassword)}
                style={styles.showPasswordButton}
                accessibilityLabel={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
              >
                <Ionicons
                  name={showPassword ? "eye-off-outline" : "eye-outline"}
                  size={20}
                  color={Colors.light.muted}
                />
              </SmartButton>
            </View>

            <SmartButton
              style={styles.loginButton}
              onPress={handleLogin}
              disabled={isLoading}
              loading={isLoading}
              textStyle={styles.loginButtonText}
              accessibilityLabel="Se connecter"
            >
              {AppTexts.auth.signIn}
            </SmartButton>

            <Link href="/auth/register" style={styles.linkContainer}>
              <Text style={styles.linkText}>
                {AppTexts.auth.noAccount}{' '}
                <Text style={styles.link}>{AppTexts.auth.signUp}</Text>
              </Text>
            </Link>
          </View>

          {/* Social Login */}
          <View style={styles.socialSection}>
            <View style={styles.dividerContainer}>
              <View style={styles.divider} />
              <Text style={styles.dividerText}>ou</Text>
              <View style={styles.divider} />
            </View>

            <SmartButton
              style={styles.socialButton}
              onPress={() => Alert.alert('Google OAuth', 'Fonctionnalité bientôt disponible')}
              accessibilityLabel="Se connecter avec Google"
            >
              <Ionicons name="logo-google" size={20} color={Colors.light.text} />
              <Text style={styles.socialButtonText}>Continuer avec Google</Text>
            </SmartButton>

            <SmartButton
              style={styles.socialButton}
              onPress={() => Alert.alert('Apple OAuth', 'Fonctionnalité bientôt disponible')}
              accessibilityLabel="Se connecter avec Apple"
            >
              <Ionicons name="logo-apple" size={20} color={Colors.light.text} />
              <Text style={styles.socialButtonText}>Continuer avec Apple</Text>
            </SmartButton>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.xl,
  },
  header: {
    alignItems: 'center',
    marginBottom: Spacing.xl * 2,
  },
  appName: {
    fontSize: FontSize.xxl,
    fontWeight: FontWeight.bold,
    color: Colors.light.primary,
    marginBottom: Spacing.xs,
  },
  tagline: {
    fontSize: FontSize.md,
    color: Colors.light.muted,
    fontStyle: 'italic',
  },
  form: {
    flex: 1,
  },
  title: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.semiBold,
    color: Colors.light.text,
    marginBottom: Spacing.xl,
    textAlign: 'center',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.light.border,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Platform.OS === 'ios' ? Spacing.md : Spacing.sm,
    marginBottom: Spacing.lg,
    backgroundColor: Colors.light.background,
  },
  input: {
    flex: 1,
    fontSize: FontSize.md,
    color: Colors.light.text,
    marginLeft: Spacing.sm,
    minHeight: 44,
  },
  showPasswordButton: {
    padding: Spacing.xs,
  },
  loginButton: {
    backgroundColor: Colors.light.primary,
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    alignItems: 'center',
    marginTop: Spacing.lg,
    minHeight: 48,
  },
  loginButtonText: {
    color: Colors.light.background,
    fontSize: FontSize.md,
    fontWeight: FontWeight.medium,
  },
  linkContainer: {
    marginTop: Spacing.lg,
    alignItems: 'center',
  },
  linkText: {
    fontSize: FontSize.sm,
    color: Colors.light.muted,
    textAlign: 'center',
  },
  link: {
    color: Colors.light.primary,
    fontWeight: FontWeight.medium,
  },
  socialSection: {
    marginTop: Spacing.xl,
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: Spacing.lg,
  },
  divider: {
    flex: 1,
    height: 1,
    backgroundColor: Colors.light.border,
  },
  dividerText: {
    fontSize: FontSize.sm,
    color: Colors.light.muted,
    marginHorizontal: Spacing.md,
  },
  socialButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.light.border,
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
    backgroundColor: Colors.light.background,
    minHeight: 48,
  },
  socialButtonText: {
    fontSize: FontSize.md,
    color: Colors.light.text,
    marginLeft: Spacing.sm,
    fontWeight: FontWeight.medium,
  },
});