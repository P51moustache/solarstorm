import { Ionicons } from '@expo/vector-icons';
import { Link, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useAuthStore } from '@/lib/state/useAuthStore';

export default function SignupPage() {
  const router = useRouter();
  const { plan } = useLocalSearchParams<{ plan?: string }>();
  const { signUpWithEmail, signInWithMagicLink, isLoading, error, clearError } = useAuthStore();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [magicLinkSent, setMagicLinkSent] = useState(false);
  const [useMagicLink, setUseMagicLink] = useState(true);

  const handleSubmit = async () => {
    clearError();

    try {
      if (useMagicLink) {
        await signInWithMagicLink(email);
        setMagicLinkSent(true);
      } else {
        await signUpWithEmail(email, password);
        router.replace('/dashboard');
      }
    } catch {
      // Error is handled by store
    }
  };

  if (magicLinkSent) {
    return (
      <View style={styles.container}>
        <View style={styles.card}>
          <Ionicons name="mail-outline" size={48} color="#00D084" style={styles.icon} />
          <Text style={styles.title}>Check your email</Text>
          <Text style={styles.subtitle}>
            We sent a magic link to {email}. Click the link to create your account.
          </Text>
          <Pressable
            style={styles.secondaryButton}
            onPress={() => setMagicLinkSent(false)}
          >
            <Text style={styles.secondaryButtonText}>Use a different email</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>Create your account</Text>
        <Text style={styles.subtitle}>
          {plan ? `Start your ${plan} plan with a free trial` : 'Get started with SolarStorm for free'}
        </Text>

        {error && (
          <View style={styles.error}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        <View style={styles.form}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              style={styles.input}
              placeholder="you@example.com"
              placeholderTextColor="#6B7394"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
            />
          </View>

          {!useMagicLink && (
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Password</Text>
              <TextInput
                style={styles.input}
                placeholder="At least 8 characters"
                placeholderTextColor="#6B7394"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
              />
            </View>
          )}

          <Pressable
            style={styles.primaryButton}
            onPress={handleSubmit}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#0B1020" />
            ) : (
              <Text style={styles.primaryButtonText}>
                {useMagicLink ? 'Send Magic Link' : 'Create Account'}
              </Text>
            )}
          </Pressable>

          <Pressable onPress={() => setUseMagicLink(!useMagicLink)}>
            <Text style={styles.toggleText}>
              {useMagicLink ? 'Use password instead' : 'Use magic link instead'}
            </Text>
          </Pressable>
        </View>

        <Text style={styles.terms}>
          By signing up, you agree to our Terms of Service and Privacy Policy.
        </Text>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Already have an account? </Text>
          <Link href="/login" asChild>
            <Pressable>
              <Text style={styles.link}>Sign in</Text>
            </Pressable>
          </Link>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0B1020',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    backgroundColor: '#111833',
    borderRadius: 12,
    padding: 32,
    width: '100%',
    maxWidth: 400,
    borderWidth: 1,
    borderColor: '#1E2347',
  },
  icon: {
    alignSelf: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#E6ECFF',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#9AA4C2',
    textAlign: 'center',
    marginBottom: 24,
  },
  error: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  errorText: {
    color: '#EF4444',
    fontSize: 14,
  },
  form: {
    gap: 16,
  },
  inputGroup: {
    gap: 6,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#E6ECFF',
  },
  input: {
    backgroundColor: '#0B1020',
    borderWidth: 1,
    borderColor: '#1E2347',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#E6ECFF',
  },
  primaryButton: {
    backgroundColor: '#00D084',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  primaryButtonText: {
    color: '#0B1020',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#1E2347',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: '#E6ECFF',
    fontSize: 16,
    fontWeight: '600',
  },
  toggleText: {
    color: '#00D084',
    fontSize: 14,
    textAlign: 'center',
  },
  terms: {
    fontSize: 12,
    color: '#6B7394',
    textAlign: 'center',
    marginTop: 16,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 24,
  },
  footerText: {
    color: '#9AA4C2',
    fontSize: 14,
  },
  link: {
    color: '#00D084',
    fontSize: 14,
    fontWeight: '500',
  },
});
