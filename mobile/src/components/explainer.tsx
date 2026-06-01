import Ionicons from '@expo/vector-icons/Ionicons';
import * as Haptics from 'expo-haptics';
import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { Fonts, GLOSSARY, Palette } from '@/constants/solar';

type Term = keyof typeof GLOSSARY;

interface ExplainerState {
  open: (term: Term) => void;
}
const ExplainerContext = createContext<ExplainerState | undefined>(undefined);

/** Wrap the app once; renders a single shared explainer modal. */
export function ExplainerProvider({ children }: { children: ReactNode }) {
  const [term, setTerm] = useState<Term | null>(null);

  const open = useCallback((t: Term) => {
    Haptics.selectionAsync();
    setTerm(t);
  }, []);

  const entry = term ? GLOSSARY[term] : null;

  return (
    <ExplainerContext.Provider value={{ open }}>
      {children}
      <Modal visible={!!entry} transparent animationType="fade" onRequestClose={() => setTerm(null)}>
        <Pressable style={styles.backdrop} onPress={() => setTerm(null)}>
          <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
            <View style={styles.handle} />
            <Text style={styles.title}>{entry?.title}</Text>
            <Text style={styles.body}>{entry?.body}</Text>
            <Pressable style={styles.btn} onPress={() => setTerm(null)}>
              <Text style={styles.btnText}>Got it</Text>
            </Pressable>
          </Pressable>
        </Pressable>
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
    <Pressable style={styles.learn} onPress={() => open(term)} hitSlop={8}>
      <Text style={styles.learnLabel}>{label}</Text>
      <Ionicons name="help-circle-outline" size={15} color={Palette.textDim} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: '#11151F',
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    padding: 24,
    paddingBottom: 40,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.15)',
    gap: 12,
  },
  handle: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: Palette.border, marginBottom: 6 },
  title: { color: Palette.text, fontSize: 22, fontFamily: Fonts.bold },
  body: { color: Palette.textDim, fontSize: 16, lineHeight: 24, fontFamily: Fonts.regular },
  btn: {
    marginTop: 8,
    backgroundColor: Palette.accent,
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
  },
  btnText: { color: '#fff', fontSize: 16, fontFamily: Fonts.bold },
  learn: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start' },
  learnLabel: { color: Palette.textDim, fontSize: 13, fontFamily: Fonts.medium },
});
