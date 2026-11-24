import Ionicons from '@expo/vector-icons/Ionicons';
import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';
import { Modal, StyleSheet, Text, View } from 'react-native';

import { Button, Tappable } from '@/components/ui';
import { GLOSSARY } from '@/constants/solar';
import { colors, iconSize, motion, radii, space, textStyles } from '@/theme';

type Term = keyof typeof GLOSSARY;

interface ExplainerState {
  open: (term: Term) => void;
}
const ExplainerContext = createContext<ExplainerState | undefined>(undefined);

/** Wrap the app once; renders a single shared explainer modal. */
export function ExplainerProvider({ children }: { children: ReactNode }) {
  const [term, setTerm] = useState<Term | null>(null);

  const open = useCallback((t: Term) => {
    motion.haptics.select();
    setTerm(t);
  }, []);

  const entry = term ? GLOSSARY[term] : null;

  return (
    <ExplainerContext.Provider value={{ open }}>
      {children}
      <Modal visible={!!entry} transparent animationType="fade" onRequestClose={() => setTerm(null)}>
        <Tappable style={styles.backdrop} onPress={() => setTerm(null)} feedback="none" accessibilityLabel="Close explainer">
          <Tappable style={styles.sheet} onPress={(e) => e.stopPropagation()} feedback="none" accessibilityRole="none">
            <View style={styles.handle} />
            <Text style={styles.title}>{entry?.title}</Text>
            <Text style={styles.body}>{entry?.body}</Text>
            <Button label="Got it" onPress={() => setTerm(null)} style={styles.btn} />
          </Tappable>
        </Tappable>
      </Modal>
    </ExplainerContext.Provider>
  );
}

export function useExplainer() {
  const ctx = useContext(ExplainerContext);
  if (!ctx) throw new Error('useExplainer must be used within ExplainerProvider');
  return ctx;
}

/** A small "label · why?" affordance that opens the explainer for a term. */
export function LearnMore({ term, label }: { term: Term; label: string }) {
  const { open } = useExplainer();
  return (
    <Tappable style={styles.learn} onPress={() => open(term)} hitSlop={8} feedback="none">
      <Text style={styles.learnLabel}>{label}</Text>
      <Ionicons name="help-circle-outline" size={iconSize.xs} color={colors.textMuted} />
    </Tappable>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: colors.scrim, justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: colors.surfaceFloating,
    borderTopLeftRadius: radii.sheet,
    borderTopRightRadius: radii.sheet,
    padding: space[6],
    paddingBottom: space[10],
    borderTopWidth: StyleSheet.hairlineWidth,
    borderColor: colors.borderStrong,
    gap: space[3],
  },
  handle: { alignSelf: 'center', width: 40, height: 4, borderRadius: radii.xs, backgroundColor: colors.border, marginBottom: space[1.5] },
  title: { ...textStyles.sheetTitle, color: colors.text },
  body: { ...textStyles.bodyLarge, color: colors.textMuted },
  btn: { marginTop: space[2] },
  learn: { flexDirection: 'row', alignItems: 'center', gap: space[1], alignSelf: 'flex-start' },
  learnLabel: { ...textStyles.footnoteStrong, color: colors.textMuted },
});
