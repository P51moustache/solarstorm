import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Card, Pill, ScreenTitle } from '@/components/ui-kit';
import { MONETIZATION_ENABLED } from '@/constants/flags';
import { Palette } from '@/constants/solar';
import { useAuth } from '@/lib/auth';

const TIER_LABEL: Record<string, { label: string; color: string }> = {
  free: { label: 'Free', color: Palette.textDim },
  plus: { label: 'Plus', color: Palette.accent },
  pro: { label: 'Pro', color: Palette.warn },
};

export default function AccountScreen() {
  const { user, tier, loading, configured, signIn, signUp, signOut } = useAuth();
  const router = useRouter();

  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function submit() {
    setBusy(true);
    setError(null);
    setNotice(null);
    const fn = mode === 'signin' ? signIn : signUp;
    const { error: err } = await fn(email.trim(), password);
    setBusy(false);
    if (err) setError(err);
    else if (mode === 'signup') setNotice('Check your email to confirm your account, then sign in.');
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <ScreenTitle title="Account" subtitle="Sync alerts, locations & subscription" />

          {!configured ? (
            <Card>
              <Text style={styles.dim}>
                Sign-in is unavailable — Supabase credentials aren&apos;t configured. Add them to
                {' '}.env.local and restart the dev server.
              </Text>
            </Card>
          ) : loading ? (
            <View style={styles.center}>
              <ActivityIndicator color={Palette.accent} />
            </View>
          ) : user ? (
            // ---- Signed in ----
            <>
              <Card>
                <Text style={styles.label}>Signed in as</Text>
                <Text style={styles.email}>{user.email}</Text>
                {MONETIZATION_ENABLED ? (
                  <View style={styles.tierRow}>
                    <Text style={styles.dim}>Subscription</Text>
                    <Pill text={TIER_LABEL[tier].label} color={TIER_LABEL[tier].color} />
                  </View>
                ) : null}
              </Card>

              {MONETIZATION_ENABLED ? (
                tier === 'free' ? (
                  <Pressable
                    style={({ pressed }) => [styles.primaryBtn, pressed && styles.pressed]}
                    onPress={() => router.push('/paywall')}>
                    <Text style={styles.primaryBtnText}>Upgrade to Plus or Pro</Text>
                  </Pressable>
                ) : (
                  <Pressable
                    style={({ pressed }) => [styles.secondaryBtn, pressed && styles.pressed]}
                    onPress={() => router.push('/paywall')}>
                    <Text style={styles.secondaryBtnText}>Manage subscription</Text>
                  </Pressable>
                )
              ) : null}

              <Pressable
                style={({ pressed }) => [styles.ghostBtn, pressed && styles.pressed]}
                onPress={signOut}>
                <Text style={styles.ghostBtnText}>Sign out</Text>
              </Pressable>
            </>
          ) : (
            // ---- Signed out: auth form ----
            <>
              <Card>
                <View style={styles.segmented}>
                  <Segment label="Sign In" active={mode === 'signin'} onPress={() => setMode('signin')} />
                  <Segment label="Create Account" active={mode === 'signup'} onPress={() => setMode('signup')} />
                </View>

                <TextInput
                  style={styles.input}
                  placeholder="Email"
                  placeholderTextColor={Palette.textFaint}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  autoComplete="email"
                  value={email}
                  onChangeText={setEmail}
                />
                <TextInput
                  style={styles.input}
                  placeholder="Password"
                  placeholderTextColor={Palette.textFaint}
                  secureTextEntry
                  value={password}
                  onChangeText={setPassword}
                />

                {error ? <Text style={styles.error}>{error}</Text> : null}
                {notice ? <Text style={styles.notice}>{notice}</Text> : null}

                <Pressable
                  style={({ pressed }) => [styles.primaryBtn, pressed && styles.pressed]}
                  onPress={submit}
                  disabled={busy || !email || !password}>
                  {busy ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.primaryBtnText}>
                      {mode === 'signin' ? 'Sign In' : 'Create Account'}
                    </Text>
                  )}
                </Pressable>
              </Card>
              <Text style={styles.dim}>
                Your account syncs alert thresholds and saved locations across devices.
              </Text>
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function Segment({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={[styles.segment, active && styles.segmentActive]}>
      <Text style={[styles.segmentText, active && styles.segmentTextActive]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: 'transparent' },
  flex: { flex: 1 },
  content: { padding: 16, gap: 14, paddingBottom: 120 },
  center: { paddingVertical: 60, alignItems: 'center' },
  label: { color: Palette.textDim, fontSize: 13, fontWeight: '600' },
  email: { color: Palette.text, fontSize: 20, fontWeight: '700', marginTop: 2 },
  tierRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 16 },
  dim: { color: Palette.textDim, fontSize: 13 },
  segmented: { flexDirection: 'row', backgroundColor: Palette.surfaceAlt, borderRadius: 12, padding: 4, marginBottom: 16 },
  segment: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 9 },
  segmentActive: { backgroundColor: Palette.accent },
  segmentText: { color: Palette.textDim, fontWeight: '700', fontSize: 14 },
  segmentTextActive: { color: '#fff' },
  input: {
    backgroundColor: Palette.surfaceAlt,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: Palette.text,
    fontSize: 16,
    marginBottom: 12,
  },
  primaryBtn: {
    backgroundColor: Palette.accent,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 4,
  },
  primaryBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  secondaryBtn: {
    backgroundColor: Palette.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Palette.border,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
  },
  secondaryBtnText: { color: Palette.text, fontSize: 16, fontWeight: '700' },
  ghostBtn: { paddingVertical: 14, alignItems: 'center' },
  ghostBtnText: { color: Palette.danger, fontSize: 15, fontWeight: '600' },
  pressed: { opacity: 0.7 },
  error: { color: Palette.danger, fontSize: 13, marginBottom: 10 },
  notice: { color: Palette.good, fontSize: 13, marginBottom: 10 },
});
