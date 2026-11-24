import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button, Card, Field, Pill, ScreenTitle, Tappable } from '@/components/ui';
import { MONETIZATION_ENABLED } from '@/constants/flags';
import { useAuth } from '@/lib/auth';
import { colors, fontSize, fonts, layout, radii, space, textStyles } from '@/theme';

const TIER_LABEL: Record<string, { label: string; color: string }> = {
  free: { label: 'Free', color: colors.textMuted },
  plus: { label: 'Plus', color: colors.accent },
  pro: { label: 'Pro', color: colors.warn },
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
              <ActivityIndicator color={colors.accent} />
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
                    <Pill
                      text={(TIER_LABEL[tier] ?? TIER_LABEL.free).label}
                      color={(TIER_LABEL[tier] ?? TIER_LABEL.free).color}
                    />
                  </View>
                ) : null}
              </Card>

              {MONETIZATION_ENABLED ? (
                tier === 'free' ? (
                  <Button
                    label="Upgrade to Plus or Pro"
                    style={styles.primaryBtn}
                    onPress={() => router.push('/paywall')}
                  />
                ) : (
                  <Button
                    variant="outline"
                    label="Manage subscription"
                    onPress={() => router.push('/paywall')}
                  />
                )
              ) : null}

              <Button variant="danger" size="compact" label="Sign out" onPress={signOut} />
            </>
          ) : (
            // ---- Signed out: auth form ----
            <>
              <Card>
                <View style={styles.segmented}>
                  <Segment label="Sign In" active={mode === 'signin'} onPress={() => setMode('signin')} />
                  <Segment label="Create Account" active={mode === 'signup'} onPress={() => setMode('signup')} />
                </View>

                <View style={styles.inputWrap}>
                  <Field
                    placeholder="Email"
                    autoCapitalize="none"
                    keyboardType="email-address"
                    autoComplete="email"
                    value={email}
                    onChangeText={setEmail}
                  />
                </View>
                <View style={styles.inputWrap}>
                  <Field
                    placeholder="Password"
                    secureTextEntry
                    value={password}
                    onChangeText={setPassword}
                  />
                </View>

                {error ? <Text style={styles.error}>{error}</Text> : null}
                {notice ? <Text style={styles.notice}>{notice}</Text> : null}

                <Button
                  label={mode === 'signin' ? 'Sign In' : 'Create Account'}
                  style={styles.primaryBtn}
                  onPress={submit}
                  disabled={!email || !password}
                  loading={busy}
                />
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
    <Tappable onPress={onPress} feedback="none" style={[styles.segment, active && styles.segmentActive]}>
      <Text style={[styles.segmentText, active && styles.segmentTextActive]}>{label}</Text>
    </Tappable>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: 'transparent' },
  flex: { flex: 1 },
  content: { padding: layout.screenPadding, gap: space[3.5], paddingBottom: layout.tabBarClearance },
  center: { paddingVertical: layout.emptyStatePadding, alignItems: 'center' },
  label: { fontSize: fontSize.footnote, fontFamily: fonts.semibold, color: colors.textMuted },
  email: { fontSize: fontSize.title3, fontFamily: fonts.bold, color: colors.text, marginTop: space[0.5] },
  tierRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: space[4] },
  dim: { ...textStyles.footnote, color: colors.textMuted },
  segmented: { flexDirection: 'row', backgroundColor: colors.surfaceRaised, borderRadius: radii.md, padding: space[1], marginBottom: space[4] },
  segment: { flex: 1, paddingVertical: space[2.5], alignItems: 'center', borderRadius: radii.sm },
  segmentActive: { backgroundColor: colors.accent },
  segmentText: { fontSize: fontSize.subhead, fontFamily: fonts.bold, color: colors.textMuted },
  segmentTextActive: { color: colors.onAccent },
  inputWrap: { marginBottom: space[3] },
  primaryBtn: { marginTop: space[1] },
  error: { ...textStyles.footnote, color: colors.danger, marginBottom: space[2.5] },
  notice: { ...textStyles.footnote, color: colors.good, marginBottom: space[2.5] },
});
