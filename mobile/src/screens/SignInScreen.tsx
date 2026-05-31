import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useAuth } from '../state/useAuth';
import { theme } from '../lib/theme';

export function SignInScreen() {
  const { signIn, signUp, error, clearError } = useAuth();
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const submit = async () => {
    setBusy(true);
    setNotice(null);
    try {
      if (mode === 'signin') {
        await signIn(email.trim(), password);
      } else {
        await signUp(email.trim(), password);
        setNotice('Check your email to confirm your account, then sign in.');
        setMode('signin');
      }
    } catch {
      // error surfaced via store
    } finally {
      setBusy(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Text style={styles.logo}>SolarStorm</Text>
      <Text style={styles.subtitle}>Space-weather alerts, your way</Text>

      <TextInput
        style={styles.input}
        placeholder="Email"
        placeholderTextColor={theme.muted}
        autoCapitalize="none"
        keyboardType="email-address"
        value={email}
        onChangeText={(t) => {
          setEmail(t);
          clearError();
        }}
      />
      <TextInput
        style={styles.input}
        placeholder="Password"
        placeholderTextColor={theme.muted}
        secureTextEntry
        value={password}
        onChangeText={(t) => {
          setPassword(t);
          clearError();
        }}
      />

      {error ? <Text style={styles.error}>{error}</Text> : null}
      {notice ? <Text style={styles.notice}>{notice}</Text> : null}

      <TouchableOpacity style={styles.button} onPress={submit} disabled={busy}>
        {busy ? (
          <ActivityIndicator color={theme.bg} />
        ) : (
          <Text style={styles.buttonText}>{mode === 'signin' ? 'Sign in' : 'Create account'}</Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity onPress={() => setMode(mode === 'signin' ? 'signup' : 'signin')}>
        <Text style={styles.switch}>
          {mode === 'signin' ? 'New here? Create an account' : 'Have an account? Sign in'}
        </Text>
      </TouchableOpacity>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.bg, padding: 24, justifyContent: 'center' },
  logo: { color: theme.text, fontSize: 34, fontWeight: '800', textAlign: 'center' },
  subtitle: { color: theme.muted, textAlign: 'center', marginTop: 6, marginBottom: 32 },
  input: {
    backgroundColor: theme.card,
    borderColor: theme.border,
    borderWidth: 1,
    borderRadius: 12,
    color: theme.text,
    padding: 14,
    marginBottom: 12,
  },
  button: {
    backgroundColor: theme.emerald,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonText: { color: theme.bg, fontWeight: '700', fontSize: 16 },
  switch: { color: theme.emerald, textAlign: 'center', marginTop: 20 },
  error: { color: theme.danger, marginBottom: 8 },
  notice: { color: theme.emerald, marginBottom: 8 },
});
