import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Link, router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../src/context/AuthContext';
import { Colors } from '../../src/constants/Colors';
import { AppTexts } from '../../src/constants/Texts';
import { Spacing, BorderRadius, FontSize, FontWeight } from '../../src/constants/Layout';

export default function RegisterScreen() {
  const { register } = useAuth();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleRegister = async () => {
    if (!firstName.trim() || !email.trim() || !password.trim() || !confirmPassword.trim()) {
      Alert.alert('Erreur', 'Veuillez remplir tous les champs obligatoires');
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Erreur', 'Les mots de passe ne correspondent pas');
      return;
    }

    if (password.length < 8) {
      Alert.alert('Erreur', 'Le mot de passe doit contenir au moins 8 caractères');
      return;
    }

    try {
      setIsLoading(true);
      await register({ 
        email: email.toLowerCase().trim(), 
        password,
        first_name: firstName.trim(),
        last_name: lastName.trim() || undefined,
      });
      router.replace('/(tabs)');
    } catch (error: any) {
      Alert.alert('Erreur d\'inscription', error.message);
    } finally {
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
            <Text style={styles.appName}>{AppTexts.appName}</Text>
            <Text style={styles.tagline}>{AppTexts.appTagline}</Text>
          </View>

          {/* Register Form */}
          <View style={styles.form}>
            <Text style={styles.title}>{AppTexts.auth.signupTitle}</Text>
            
            <View style={styles.row}>
              <View style={[styles.inputContainer, { flex: 1, marginRight: Spacing.sm }]}>
                <Text style={styles.label}>{AppTexts.auth.firstName} *</Text>
                <TextInput
                  style={styles.input}
                  value={firstName}
                  onChangeText={setFirstName}
                  placeholder="Prénom"
                  placeholderTextColor={Colors.light.muted}
                  autoCapitalize="words"
                  textContentType="givenName"
                />
              </View>
              
              <View style={[styles.inputContainer, { flex: 1, marginLeft: Spacing.sm }]}>
                <Text style={styles.label}>{AppTexts.auth.lastName}</Text>
                <TextInput
                  style={styles.input}
                  value={lastName}
                  onChangeText={setLastName}
                  placeholder="Nom"
                  placeholderTextColor={Colors.light.muted}
                  autoCapitalize="words"
                  textContentType="familyName"
                />
              </View>
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>{AppTexts.auth.email} *</Text>
              <TextInput
                style={styles.input}
                value={email}
                onChangeText={setEmail}
                placeholder="votre.email@example.com"
                placeholderTextColor={Colors.light.muted}
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                textContentType="emailAddress"
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>{AppTexts.auth.password} *</Text>
              <View style={styles.passwordContainer}>
                <TextInput
                  style={[styles.input, styles.passwordInput]}
                  value={password}
                  onChangeText={setPassword}
                  placeholder="Votre mot de passe (min. 8 caractères)"
                  placeholderTextColor={Colors.light.muted}
                  secureTextEntry={!showPassword}
                  autoComplete="password-new"
                  textContentType="newPassword"
                />
                <TouchableOpacity
                  style={styles.eyeButton}
                  onPress={() => setShowPassword(!showPassword)}
                >
                  <Ionicons
                    name={showPassword ? 'eye-off' : 'eye'}
                    size={20}
                    color={Colors.light.muted}
                  />
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>{AppTexts.auth.confirmPassword} *</Text>
              <View style={styles.passwordContainer}>
                <TextInput
                  style={[styles.input, styles.passwordInput]}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  placeholder="Confirmer le mot de passe"
                  placeholderTextColor={Colors.light.muted}
                  secureTextEntry={!showConfirmPassword}
                  autoComplete="password-new"
                  textContentType="newPassword"
                />
                <TouchableOpacity
                  style={styles.eyeButton}
                  onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  <Ionicons
                    name={showConfirmPassword ? 'eye-off' : 'eye'}
                    size={20}
                    color={Colors.light.muted}
                  />
                </TouchableOpacity>
              </View>
            </View>

            <TouchableOpacity 
              style={[styles.registerButton, isLoading && styles.disabledButton]} 
              onPress={handleRegister}
              onClick={handleRegister}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color={Colors.light.background} />
              ) : (
                <Text style={styles.registerButtonText}>{AppTexts.auth.createAccount}</Text>
              )}
            </TouchableOpacity>

            {/* Social Login */}
            <View style={styles.socialContainer}>
              <View style={styles.divider}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>ou</Text>
                <View style={styles.dividerLine} />
              </View>

              <TouchableOpacity style={styles.socialButton}>
                <Ionicons name="logo-google" size={20} color={Colors.light.text} />
                <Text style={styles.socialButtonText}>
                  {AppTexts.auth.continueWithGoogle}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.socialButton}>
                <Ionicons name="logo-apple" size={20} color={Colors.light.text} />
                <Text style={styles.socialButtonText}>
                  {AppTexts.auth.continueWithApple}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Sign in link */}
            <View style={styles.signinContainer}>
              <Text style={styles.signinText}>{AppTexts.auth.alreadyHaveAccount}</Text>
              <Link href="/auth/login" asChild>
                <TouchableOpacity onClick={() => router.push('/auth/login')}>
                  <Text style={styles.signinLink}>{AppTexts.auth.signIn}</Text>
                </TouchableOpacity>
              </Link>
            </View>
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
    justifyContent: 'center',
    padding: Spacing.lg,
  },
  header: {
    alignItems: 'center',
    marginBottom: Spacing.xl,
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
    textAlign: 'center',
  },
  form: {
    width: '100%',
  },
  title: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.semibold,
    color: Colors.light.text,
    textAlign: 'center',
    marginBottom: Spacing.xl,
  },
  row: {
    flexDirection: 'row',
    marginBottom: 0,
  },
  inputContainer: {
    marginBottom: Spacing.lg,
  },
  label: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium,
    color: Colors.light.text,
    marginBottom: Spacing.xs,
  },
  input: {
    borderWidth: 1,
    borderColor: Colors.light.border,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    fontSize: FontSize.md,
    color: Colors.light.text,
    backgroundColor: Colors.light.background,
  },
  passwordContainer: {
    position: 'relative',
  },
  passwordInput: {
    paddingRight: 50,
  },
  eyeButton: {
    position: 'absolute',
    right: Spacing.md,
    top: '50%',
    transform: [{ translateY: -10 }],
  },
  registerButton: {
    backgroundColor: Colors.light.primary,
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  disabledButton: {
    opacity: 0.7,
  },
  registerButtonText: {
    color: Colors.light.background,
    fontSize: FontSize.lg,
    fontWeight: FontWeight.semibold,
  },
  socialContainer: {
    marginBottom: Spacing.xl,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: Colors.light.border,
  },
  dividerText: {
    marginHorizontal: Spacing.lg,
    color: Colors.light.muted,
    fontSize: FontSize.sm,
  },
  socialButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.light.border,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    backgroundColor: Colors.light.background,
  },
  socialButtonText: {
    marginLeft: Spacing.md,
    fontSize: FontSize.md,
    color: Colors.light.text,
    fontWeight: FontWeight.medium,
  },
  signinContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  signinText: {
    fontSize: FontSize.md,
    color: Colors.light.muted,
  },
  signinLink: {
    fontSize: FontSize.md,
    color: Colors.light.primary,
    fontWeight: FontWeight.semibold,
    marginLeft: Spacing.xs,
  },
});