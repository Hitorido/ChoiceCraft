import React, { useState, useEffect } from 'react';
import {
  Modal, View, Text, TouchableOpacity, StyleSheet, Dimensions,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

type MaterialIconName = keyof typeof MaterialIcons.glyphMap;

export type TutorialStep = {
  title: string;
  description: string;
  icon: MaterialIconName;
  position: 'top' | 'center' | 'bottom';
};

interface Props {
  visible: boolean;
  steps: TutorialStep[];
  theme: any;
  onDone: () => void;
  onAskAI?: () => void; // navigates to AI screen
}

const { height: H } = Dimensions.get('window');

export default function TutorialOverlay({ visible, steps, theme, onDone, onAskAI }: Props) {
  const [step, setStep] = useState(0);

  useEffect(() => { if (visible) setStep(0); }, [visible]);

  if (!visible || !steps.length) return null;

  const cur    = steps[step];
  const isLast = step === steps.length - 1;
  const cardTop = cur.position === 'top' ? 90 : cur.position === 'bottom' ? H * 0.52 : H * 0.28;

  return (
    <Modal visible transparent animationType="fade" statusBarTranslucent>
      <View style={styles.backdrop}>
        <View style={[styles.card, { backgroundColor: theme.card, top: cardTop }]}>

          {/* Header */}
          <View style={styles.headerRow}>
            <View style={[styles.iconBadge, { backgroundColor: theme.primary }]}>
              <MaterialIcons name={cur.icon} size={20} color={theme.background} />
            </View>
            <Text style={[styles.counter, { color: theme.placeholder }]}>
              {step + 1} / {steps.length}
            </Text>
          </View>

          {/* Progress dots */}
          <View style={styles.dotsRow}>
            {steps.map((_, i) => (
              <View
                key={i}
                style={[
                  styles.dot,
                  { backgroundColor: i <= step ? theme.primary : theme.border },
                  i === step && styles.dotActive,
                ]}
              />
            ))}
          </View>

          <Text style={[styles.title, { color: theme.text }]}>{cur.title}</Text>
          <Text style={[styles.desc,  { color: theme.placeholder }]}>{cur.description}</Text>

          {/* Ask AI */}
          {onAskAI && (
            <TouchableOpacity
              style={[styles.aiBtn, { borderColor: theme.primary, backgroundColor: theme.surface }]}
              onPress={() => { onDone(); onAskAI(); }}
            >
              <MaterialIcons name="auto-awesome" size={14} color={theme.primary} />
              <Text style={[styles.aiBtnText, { color: theme.primary }]}>Ask AI for more help</Text>
            </TouchableOpacity>
          )}

          {/* Actions */}
          <View style={styles.btnRow}>
            <TouchableOpacity onPress={onDone} style={styles.skipBtn}>
              <Text style={[styles.skipText, { color: theme.placeholder }]}>Skip</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.nextBtn, { backgroundColor: theme.primary }]}
              onPress={() => isLast ? onDone() : setStep(s => s + 1)}
            >
              <Text style={[styles.nextText, { color: theme.background }]}>
                {isLast ? '🎉 Get Started' : 'Next'}
              </Text>
              {!isLast && <MaterialIcons name="arrow-forward" size={16} color={theme.background} />}
            </TouchableOpacity>
          </View>

        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.72)' },
  card: {
    position: 'absolute', left: 20, right: 20,
    borderRadius: 20, padding: 20,
    elevation: 12,
    shadowColor: '#000', shadowOpacity: 0.35,
    shadowOffset: { width: 0, height: 6 }, shadowRadius: 16,
  },
  headerRow: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', marginBottom: 12,
  },
  iconBadge: {
    width: 42, height: 42, borderRadius: 21,
    alignItems: 'center', justifyContent: 'center',
  },
  counter: { fontSize: 12, fontWeight: '600' },
  dotsRow: { flexDirection: 'row', gap: 5, marginBottom: 16 },
  dot: { width: 7, height: 7, borderRadius: 3.5 },
  dotActive: { width: 22 },
  title: { fontSize: 18, fontWeight: '700', marginBottom: 8 },
  desc:  { fontSize: 14, lineHeight: 22, marginBottom: 18 },
  aiBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    borderWidth: 1, borderRadius: 8,
    paddingVertical: 8, paddingHorizontal: 12,
    alignSelf: 'flex-start', marginBottom: 16,
  },
  aiBtnText: { fontSize: 12, fontWeight: '600' },
  btnRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  skipBtn: { padding: 6 },
  skipText: { fontSize: 14, fontWeight: '600' },
  nextBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingVertical: 10, paddingHorizontal: 22, borderRadius: 10,
  },
  nextText: { fontSize: 15, fontWeight: '700' },
});