import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { useNavigation } from '@react-navigation/native';
import TutorialOverlay, { TutorialStep } from '../components/TutorialOverlay';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  Alert,
  Modal,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Slider from '@react-native-community/slider';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import { Decision, DecisionOption, Criterion } from '../types/decision';
import { useDecisions } from '../components/DecisionContext';
import DecisionCard from '../components/DecisionCard';
import { useIsFocused } from '@react-navigation/native';

// ─── Category config ──────────────────────────────────────────────────────────

const DEFAULT_CATEGORIES = ['Work', 'Fitness', 'Academics', 'Finance', 'Personal', 'Health', 'Travel', 'Career', 'Relationships'];

const CATEGORY_COLORS: Record<string, string> = {
  'Work':          '#4A90E2',
  'Fitness':       '#E2844A',
  'Academics':     '#9B59B6',
  'Finance':       '#27AE60',
  'Personal':      '#E74C3C',
  'Health':        '#1ABC9C',
  'Travel':        '#F39C12',
  'Career':        '#5C6BC0',
  'Relationships': '#E91E63',
};

function extractJSON(raw: string): string {
  const start = raw.indexOf('{');
  const end   = raw.lastIndexOf('}');
  if (start === -1 || end === -1) throw new Error('No JSON object found in response');
  return raw.slice(start, end + 1);
}

function getCategoryColor(name: string): string {
  if (CATEGORY_COLORS[name]) return CATEGORY_COLORS[name];
  // Deterministic color for custom categories
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  const hue = Math.abs(hash) % 360;
  return `hsl(${hue}, 60%, 45%)`;
}

const categoriesKey = (user: string) => `categories_${user}`;

// ─── helpers ─────────────────────────────────────────────────────────────────

function calculateWeightedScore(criteria: Criterion[]): number {
  const totalWeight = criteria.reduce((sum, c) => sum + c.weight, 0);
  if (totalWeight === 0) return 0;
  return criteria.reduce((sum, c) => sum + c.weight * c.score, 0) / totalWeight;
}

function makeCriterion(name = ''): Criterion {
  return { id: Date.now().toString() + Math.random(), name, weight: 10, score: 5 };
}

function makeOption(baseCriteria: Criterion[], name = ''): DecisionOption {
  return {
    id: Date.now().toString() + Math.random(),
    name,
    notes: '',
    criteria: baseCriteria.map((c) => ({ ...c, score: 5 })),
    finalScore: 0,
  };
}

// ─── StepLabel ────────────────────────────────────────────────────────────────

function StepLabel({ step, label, theme }: { step: number; label: string; theme: any }) {
  return (
    <View style={stepStyles.row}>
      <View style={[stepStyles.badge, { backgroundColor: theme.primary }]}>
        <Text style={[stepStyles.badgeText, { color: theme.background }]}>{step}</Text>
      </View>
      <Text style={[stepStyles.label, { color: theme.text }]}>{label}</Text>
    </View>
  );
}

const stepStyles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', marginBottom: 12, marginTop: 20 },
  badge: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginRight: 8 },
  badgeText: { fontSize: 13, fontWeight: '700' },
  label: { fontSize: 15, fontWeight: '700' },
});

// ─── CircleItem ───────────────────────────────────────────────────────────────

interface CircleItemProps {
  label: string; isActive: boolean; activeColor: string; activeLabelColor: string;
  inactiveColor: string; borderColor: string; textColor: string;
  onPress: () => void; onDelete: () => void; onChangeName: (v: string) => void;
  canDelete: boolean; placeholderColor: string;
}

function CircleItem({ label, isActive, activeColor, activeLabelColor, inactiveColor, borderColor, textColor, onPress, onDelete, onChangeName, canDelete, placeholderColor }: CircleItemProps) {
  return (
    <View style={circleStyles.wrapper}>
      <TouchableOpacity
        style={[circleStyles.circle, { backgroundColor: isActive ? activeColor : inactiveColor, borderColor: isActive ? activeColor : borderColor }]}
        onPress={onPress} activeOpacity={0.8}
      >
        <Text style={[circleStyles.circleText, { color: isActive ? activeLabelColor : textColor }]} numberOfLines={2}>
          {label || '?'}
        </Text>
        {canDelete && (
          <TouchableOpacity style={circleStyles.deleteBtn} onPress={onDelete} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
            <MaterialIcons name="close" size={12} color={isActive ? activeLabelColor : textColor} />
          </TouchableOpacity>
        )}
      </TouchableOpacity>
      <TextInput
        style={[circleStyles.nameInput, { color: textColor, borderBottomColor: isActive ? activeColor : borderColor }]}
        value={label} onChangeText={onChangeName} placeholder="Name"
        placeholderTextColor={placeholderColor} maxLength={12} onFocus={onPress}
      />
    </View>
  );
}

const circleStyles = StyleSheet.create({
  wrapper: { alignItems: 'center', marginRight: 12, width: 68 },
  circle: { width: 64, height: 64, borderRadius: 32, borderWidth: 2, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6 },
  circleText: { fontSize: 11, fontWeight: '700', textAlign: 'center' },
  deleteBtn: { position: 'absolute', top: -2, right: -2, backgroundColor: 'rgba(0,0,0,0.25)', borderRadius: 8, width: 16, height: 16, alignItems: 'center', justifyContent: 'center' },
  nameInput: { marginTop: 6, fontSize: 11, textAlign: 'center', width: 68, borderBottomWidth: 1, paddingBottom: 2 },
});

// ─── RectItem ─────────────────────────────────────────────────────────────────

interface RectItemProps {
  label: string; inactiveColor: string; borderColor: string; textColor: string;
  onDelete: () => void; onChangeName: (v: string) => void; placeholderColor: string;
}

function RectItem({ label, inactiveColor, borderColor, textColor, onDelete, onChangeName, placeholderColor }: RectItemProps) {
  return (
    <View style={rectStyles.wrapper}>
      <View style={[rectStyles.rect, { backgroundColor: inactiveColor, borderColor }]}>
        <TouchableOpacity style={rectStyles.deleteBtn} onPress={onDelete} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
          <MaterialIcons name="close" size={12} color={textColor} />
        </TouchableOpacity>
        <TextInput
          style={[rectStyles.nameInput, { color: textColor }]}
          value={label} onChangeText={onChangeName} placeholder="Option"
          placeholderTextColor={placeholderColor} maxLength={14} textAlign="center"
        />
      </View>
    </View>
  );
}

const rectStyles = StyleSheet.create({
  wrapper: { alignItems: 'center', marginRight: 12, width: 80 },
  rect: { width: 80, height: 56, borderRadius: 10, borderWidth: 2, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6 },
  deleteBtn: { position: 'absolute', top: -2, right: -2, backgroundColor: 'rgba(0,0,0,0.25)', borderRadius: 8, width: 16, height: 16, alignItems: 'center', justifyContent: 'center' },
  nameInput: { fontSize: 11, fontWeight: '600', width: '100%', textAlign: 'center', padding: 0 },
});

// ─── AddShape ─────────────────────────────────────────────────────────────────

function AddShape({ onPress, borderColor, color, rect }: { onPress: () => void; borderColor: string; color: string; rect?: boolean }) {
  return (
    <TouchableOpacity
      style={[rect ? { width: 80, height: 56, borderRadius: 10 } : { width: 64, height: 64, borderRadius: 32 },
        { borderColor, borderStyle: 'dashed', borderWidth: 2, backgroundColor: 'transparent', alignItems: 'center', justifyContent: 'center' }]}
      onPress={onPress} activeOpacity={0.7}
    >
      <MaterialIcons name="add" size={24} color={color} />
    </TouchableOpacity>
  );
}

type AISuggestion = { criteria: string[]; options: string[]; advice: string; };

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function DecisionListScreen() {
  const { decisions, addDecision, deleteDecision, updateDecision, theme, darkMode, apiKey, currentUser, tutorialsSeenMap, markTutorialSeen, tutorialsLoaded} = useDecisions();
  const isFocused = useIsFocused();
  const tutorialShownRef = useRef(false);
  const insets = useSafeAreaInsets();

  const activeCircleColor     = darkMode ? '#FFFFFF' : '#7C3AED';
  const activeCircleTextColor = darkMode ? '#1a1a2e' : '#FFFFFF';

  // ── Category state ──────────────────────────────────────────────────────
  const [categories, setCategories]         = useState<string[]>(DEFAULT_CATEGORIES);
  const [activeCategory, setActiveCategory] = useState<string>('All');
  const [addCatVisible, setAddCatVisible]   = useState(false);
  const [newCatName, setNewCatName]         = useState('');

  useEffect(() => {
    if (!currentUser) return;
    (async () => {
      try {
        const stored = await AsyncStorage.getItem(categoriesKey(currentUser));
        if (stored) {
          const custom: string[] = JSON.parse(stored);
          // Merge defaults + custom, deduplicate
          setCategories([...DEFAULT_CATEGORIES, ...custom.filter((c) => !DEFAULT_CATEGORIES.includes(c))]);
        }
      } catch {}
    })();
  }, [currentUser]);

  const saveCustomCategories = async (all: string[]) => {
    if (!currentUser) return;
    const custom = all.filter((c) => !DEFAULT_CATEGORIES.includes(c));
    await AsyncStorage.setItem(categoriesKey(currentUser), JSON.stringify(custom)).catch(() => {});
  };

  const handleAddCategory = () => {
    const name = newCatName.trim();
    if (!name) return;
    if (categories.some((c) => c.toLowerCase() === name.toLowerCase())) {
      Alert.alert('Already exists', 'A category with this name already exists.');
      return;
    }
    const updated = [...categories, name];
    setCategories(updated);
    saveCustomCategories(updated);
    setActiveCategory(name);
    setNewCatName('');
    setAddCatVisible(false);
  };

  const navigation = useNavigation<any>();
const [showTutorial, setShowTutorial] = useState(false);

useEffect(() => {
  if (!tutorialsSeenMap['decisions']) tutorialShownRef.current = false;
  if (
    tutorialsLoaded &&
    !tutorialsSeenMap['decisions'] &&
    isFocused &&
    !tutorialShownRef.current
  ) {
    tutorialShownRef.current = true;
    const t = setTimeout(() => setShowTutorial(true), 600);
    return () => clearTimeout(t);
  }
}, [tutorialsLoaded, tutorialsSeenMap, isFocused]);


const DECISIONS_STEPS: TutorialStep[] = [
  {
    icon: 'lightbulb',
    title: 'Your Decisions',
    description: 'Every decision you create lives here. Each card shows the best option and its score.',
    position: 'center',
  },
  {
    icon: 'label',
    title: 'Categories',
    description: 'Filter decisions by category using the chips at the top. Swipe left to see more. Tap "+ New" to add your own.',
    position: 'top',
  },
  {
    icon: 'add-circle',
    title: 'Add a Decision',
    description: 'Tap the purple ＋ button (bottom-left) to create a new decision. You\'ll set a title, criteria, and options.',
    position: 'bottom',
  },
  {
    icon: 'smart-toy',
    title: 'AI Assistant',
    description: 'The 🤖 button (bottom-right) opens your AI Helper. Ask it to suggest criteria, score options, or give advice.',
    position: 'bottom',
  },
  {
    icon: 'expand-more',
    title: 'Decision Cards',
    description: 'Tap any card to expand scores. Switch between criteria to compare options, edit ✏️, print 🖨️, or delete 🗑️.',
    position: 'center',
  },
];

  // ── Modal state ─────────────────────────────────────────────────────────
  const [modalVisible, setModalVisible]         = useState(false);
  const [editingDecision, setEditingDecision]   = useState<Decision | null>(null);
  const [title, setTitle]                       = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('Personal');
  const [criteria, setCriteria]                 = useState<Criterion[]>([makeCriterion('Criterion 1')]);
  const [options, setOptions]                   = useState<DecisionOption[]>([]);
  const [activeCritId, setActiveCritId]         = useState<string>('');

  // AI state
  const [aiLoading, setAiLoading]               = useState(false);
  const [aiPanelVisible, setAiPanelVisible]     = useState(false);
  const [aiAdvice, setAiAdvice]                 = useState('');
  const [aiSuggestions, setAiSuggestions]       = useState<AISuggestion | null>(null);
  const [autoScoreLoading, setAutoScoreLoading] = useState(false);

  const openModal = () => {
    const firstCrit = makeCriterion('Criterion 1');
    setCriteria([firstCrit]);
    setOptions([]);
    setActiveCritId(firstCrit.id);
    setTitle('');
    setSelectedCategory(activeCategory !== 'All' ? activeCategory : 'Personal');
    setEditingDecision(null);
    setAiPanelVisible(false);
    setAiSuggestions(null);
    setAiAdvice('');
    setModalVisible(true);
  };

  const openEditModal = (decision: Decision) => {
    const normalizedOptions = decision.options.map((o) => ({
      ...o, criteria: o.criteria.map((c) => ({ ...c, weight: 10 })),
    }));
    const normalizedCriteria = normalizedOptions[0]?.criteria ?? [makeCriterion('Criterion 1')];
    setTitle(decision.title);
    setSelectedCategory((decision as any).category ?? 'Personal');
    setCriteria(normalizedCriteria);
    setOptions(normalizedOptions);
    setActiveCritId(normalizedCriteria[0]?.id ?? '');
    setEditingDecision(decision);
    setAiPanelVisible(false);
    setAiSuggestions(null);
    setAiAdvice('');
    setModalVisible(true);
  };

  // ── Criteria helpers ────────────────────────────────────────────────────

  const addCriterion = (name?: string) => {
    const c = makeCriterion(name ?? `Criterion ${criteria.length + 1}`);
    setCriteria((prev) => [...prev, c]);
    setOptions((prev) => prev.map((o) => ({ ...o, criteria: [...o.criteria, { ...c, score: 5 }] })));
    setActiveCritId(c.id);
  };

  const removeCriterion = (id: string) => {
    if (criteria.length === 1) return;
    const remaining = criteria.filter((c) => c.id !== id);
    setCriteria(remaining);
    setOptions((prev) => prev.map((o) => ({ ...o, criteria: o.criteria.filter((c) => c.id !== id) })));
    if (activeCritId === id) setActiveCritId(remaining[0]?.id ?? '');
  };

  const updateCriterionName = (id: string, name: string) => {
    setCriteria((prev) => prev.map((c) => (c.id === id ? { ...c, name } : c)));
    setOptions((prev) => prev.map((o) => ({ ...o, criteria: o.criteria.map((c) => (c.id === id ? { ...c, name } : c)) })));
  };

  // ── Option helpers ──────────────────────────────────────────────────────

  const addOption = (name?: string) => {
    const o = makeOption(criteria, name ?? `Option ${options.length + 1}`);
    setOptions((prev) => [...prev, o]);
  };

  const removeOption = (id: string) => setOptions((prev) => prev.filter((o) => o.id !== id));

  const updateOptionName = (id: string, name: string) =>
    setOptions((prev) => prev.map((o) => (o.id === id ? { ...o, name } : o)));

  const updateOptionScore = (optId: string, critId: string, val: number) => {
    setOptions((prev) =>
      prev.map((o) => o.id === optId
        ? { ...o, criteria: o.criteria.map((c) => (c.id === critId ? { ...c, score: val } : c)) }
        : o)
    );
  };

  // ── Computed ────────────────────────────────────────────────────────────

  const computed = useMemo(() => {
    const scored = options.map((o) => ({ ...o, finalScore: calculateWeightedScore(o.criteria) }));
    const best = scored.reduce(
      (b, o) => (o.finalScore > b.finalScore ? o : b),
      { name: '', finalScore: 0 } as { name: string; finalScore: number }
    );
    return { options: scored, bestOptionName: best.name, finalScore: best.finalScore };
  }, [options]);

  const activeCrit = criteria.find((c) => c.id === activeCritId);

  // ── Filtered decisions ──────────────────────────────────────────────────

  const filteredDecisions = useMemo(() => {
    if (activeCategory === 'All') return decisions;
    return decisions.filter((d) => (d as any).category === activeCategory);
  }, [decisions, activeCategory]);

  // ── AI helpers ──────────────────────────────────────────────────────────

  const askAI = useCallback(async () => {
    if (!apiKey) { Alert.alert('No API Key', 'Add your Gemini API key in Profile settings first.'); return; }
    if (!title.trim()) { Alert.alert('Add a title', 'Enter a decision title first.'); return; }
    setAiLoading(true); setAiPanelVisible(true); setAiAdvice(''); setAiSuggestions(null);
    const existingCriteria = criteria.map((c) => c.name).filter(Boolean).join(', ');
    const existingOptions  = options.map((o) => o.name).filter(Boolean).join(', ');
    const prompt = `You are a decision-making assistant. The user is trying to decide: "${title}".
${existingCriteria ? `They already have these criteria: ${existingCriteria}.` : ''}
${existingOptions ? `They already have these options: ${existingOptions}.` : ''}
Respond ONLY with a valid JSON object (no markdown, no backticks):
{"criteria":["up to 4 short criteria names"],"options":["up to 4 short option names"],"advice":"2-3 sentence practical advice"}`;
    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
        { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error?.message || 'API error');
      const raw = data.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
      const parsed: AISuggestion = JSON.parse(extractJSON(raw));
      setAiSuggestions(parsed); setAiAdvice(parsed.advice ?? '');
    } catch (e: any) { setAiAdvice(`Could not get AI suggestions: ${e.message}`); }
    finally { setAiLoading(false); }
  }, [apiKey, title, criteria, options]);

  const applySuggestedCriterion = (name: string) => {
    if (!criteria.some((c) => c.name.toLowerCase() === name.toLowerCase())) addCriterion(name);
  };
  const applySuggestedOption = (name: string) => {
    if (!options.some((o) => o.name.toLowerCase() === name.toLowerCase())) addOption(name);
  };

  const autoScore = useCallback(async () => {
    if (!apiKey) { Alert.alert('No API Key', 'Add your Gemini API key in Profile settings first.'); return; }
    const namedCriteria = criteria.filter((c) => c.name.trim());
    const namedOptions  = options.filter((o) => o.name.trim());
    if (!namedCriteria.length || !namedOptions.length) { Alert.alert('Not enough info', 'Add and name at least one criterion and one option.'); return; }
    setAutoScoreLoading(true);
    const prompt = `You are a decision-making assistant. The user is deciding: "${title}".
Criteria: ${namedCriteria.map((c) => c.name).join(', ')}
Options: ${namedOptions.map((o) => o.name).join(', ')}
Score each option on each criterion 0-10. Be realistic and differentiated.
Respond ONLY with valid JSON: {"scores":{"<option>":{"<criterion>":<number>}}}`;
    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
        { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error?.message || 'API error');
      const raw    = data.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
      const parsed: { scores: Record<string, Record<string, number>> } = JSON.parse(extractJSON(raw));
      setOptions((prev) => prev.map((opt) => {
        const optScores = parsed.scores[opt.name];
        if (!optScores) return opt;
        return { ...opt, criteria: opt.criteria.map((c) => { const s = optScores[c.name]; return s !== undefined ? { ...c, score: Math.min(10, Math.max(0, s)) } : c; }) };
      }));
      Alert.alert('Done!', 'AI has scored all options. Review and adjust the sliders if needed.');
    } catch (e: any) { Alert.alert('Error', `Could not auto-score: ${e.message}`); }
    finally { setAutoScoreLoading(false); }
  }, [apiKey, title, criteria, options]);

  // ── Submit ──────────────────────────────────────────────────────────────

  const handleSubmit = () => {
    if (!title.trim()) return Alert.alert('Error', 'Please enter a decision title.');
    if (options.length === 0) return Alert.alert('Error', 'Add at least one option.');
    if (criteria.some((c) => !c.name.trim())) return Alert.alert('Error', 'Please name all criteria.');
    if (options.some((o) => !o.name.trim())) return Alert.alert('Error', 'Please name all options.');
    const payload = {
      id: editingDecision?.id ?? Date.now().toString(),
      title: title.trim(),
      category: selectedCategory,
      options: computed.options,
      bestOptionName: computed.bestOptionName,
      finalScore: computed.finalScore,
    } as Decision;
    if (editingDecision) { updateDecision(payload); } else { addDecision(payload); }
    setModalVisible(false);
    setEditingDecision(null);
  };

  // ─── render ───────────────────────────────────────────────────────────────

  return (
    <LinearGradient colors={[theme.gradientStart, theme.gradientEnd]} style={[styles.container, { paddingTop: insets.top + 16 }]}>
      <Text style={[styles.heading, { color: theme.text }]}>Decisions</Text>

      {/* ── Category filter row ── */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.catRow}
        contentContainerStyle={{ paddingHorizontal: 16, gap: 8, alignItems: 'center' }}
      >
        {/* All chip */}
        <TouchableOpacity
          style={[styles.catChip, { backgroundColor: activeCategory === 'All' ? theme.primary : theme.card, borderColor: theme.primary }]}
          onPress={() => setActiveCategory('All')}
        >
          <Text style={[styles.catChipText, { color: activeCategory === 'All' ? theme.background : theme.primary }]}>All</Text>
        </TouchableOpacity>

        {categories.map((cat) => {
          const isActive = activeCategory === cat;
          const catColor = getCategoryColor(cat);
          return (
            <TouchableOpacity
              key={cat}
              style={[styles.catChip, { backgroundColor: isActive ? catColor : theme.card, borderColor: catColor }]}
              onPress={() => setActiveCategory(cat)}
            >
              <Text style={[styles.catChipText, { color: isActive ? '#fff' : catColor }]}>{cat}</Text>
            </TouchableOpacity>
          );
        })}

        {/* Add category chip */}
        <TouchableOpacity
          style={[styles.catChip, { backgroundColor: 'transparent', borderColor: theme.border, borderStyle: 'dashed' }]}
          onPress={() => setAddCatVisible(true)}
        >
          <MaterialIcons name="add" size={14} color={theme.placeholder} />
          <Text style={[styles.catChipText, { color: theme.placeholder }]}>New</Text>
        </TouchableOpacity>
      </ScrollView>

      <FlatList
        data={filteredDecisions}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingBottom: insets.bottom + 110, paddingHorizontal: 16 }}
        renderItem={({ item }) => <DecisionCard decision={item} onDelete={deleteDecision} onEdit={openEditModal} />}
        ListEmptyComponent={
          <Text style={[styles.empty, { color: theme.placeholder }]}>
            {activeCategory === 'All' ? 'No decisions yet. Tap + to add one.' : `No decisions in "${activeCategory}" yet.`}
          </Text>
        }
      />

      {/* FAB */}
      <TouchableOpacity
        style={[styles.fab, { backgroundColor: theme.primary, bottom: insets.bottom + 11 }]}
        activeOpacity={0.85}
        onPress={openModal}
      >
        <MaterialIcons name="add" size={30} color={darkMode ? '#1a1a2e' : '#fff'} />
      </TouchableOpacity>

      {/* ── Add Category Modal ── */}
      <Modal visible={addCatVisible} animationType="fade" transparent>
        <View style={styles.overlayBg}>
          <View style={[styles.addCatBox, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <Text style={[styles.addCatTitle, { color: theme.text }]}>New Category</Text>
            <TextInput
              style={[styles.addCatInput, { backgroundColor: theme.surface, color: theme.text, borderColor: theme.border }]}
              placeholder="e.g. Hobbies"
              placeholderTextColor={theme.placeholder}
              value={newCatName}
              onChangeText={setNewCatName}
              autoFocus
              maxLength={20}
              onSubmitEditing={handleAddCategory}
            />
            <View style={styles.addCatBtns}>
              <TouchableOpacity
                style={[styles.addCatBtn, { backgroundColor: theme.surface, borderColor: theme.border }]}
                onPress={() => { setAddCatVisible(false); setNewCatName(''); }}
              >
                <Text style={[styles.addCatBtnText, { color: theme.text }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.addCatBtn, { backgroundColor: theme.primary }]}
                onPress={handleAddCategory}
              >
                <Text style={[styles.addCatBtnText, { color: theme.background }]}>Add</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── Decision Modal ── */}
      <Modal visible={modalVisible} animationType="slide">
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={[styles.modalWrapper, { backgroundColor: theme.background }]}>

            <View style={[styles.modalHeader, { borderBottomColor: theme.border }]}>
              <TouchableOpacity onPress={() => setModalVisible(false)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <MaterialIcons name="close" size={24} color={theme.text} />
              </TouchableOpacity>
              <Text style={[styles.modalTitle, { color: theme.text }]}>{editingDecision ? 'Edit Decision' : 'New Decision'}</Text>
              <TouchableOpacity onPress={handleSubmit}>
                <Text style={[styles.saveBtn, { color: theme.primary }]}>Save</Text>
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.modalScroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

              {/* Step 1 — Title */}
              <StepLabel step={1} label="What's the decision?" theme={theme} />
              <TextInput
                style={[styles.input, { backgroundColor: theme.surface, color: theme.text, borderColor: theme.border }]}
                placeholder="e.g. Which laptop should I buy?"
                placeholderTextColor={theme.placeholder}
                value={title}
                onChangeText={setTitle}
              />

              {/* Step 2 — Category */}
              <StepLabel step={2} label="Category" theme={theme} />
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingBottom: 8 }}>
                {categories.map((cat) => {
                  const isSelected = selectedCategory === cat;
                  const catColor   = getCategoryColor(cat);
                  return (
                    <TouchableOpacity
                      key={cat}
                      style={[styles.catChip, { backgroundColor: isSelected ? catColor : theme.surface, borderColor: catColor }]}
                      onPress={() => setSelectedCategory(cat)}
                    >
                      <Text style={[styles.catChipText, { color: isSelected ? '#fff' : catColor }]}>{cat}</Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              {/* AI Button */}
              <TouchableOpacity
                style={[styles.aiBtn, { backgroundColor: theme.card, borderColor: theme.primary, marginTop: 10 }]}
                onPress={askAI} activeOpacity={0.8} disabled={aiLoading}
              >
                {aiLoading ? <ActivityIndicator size="small" color={theme.primary} /> : <MaterialIcons name="auto-awesome" size={18} color={theme.primary} />}
                <Text style={[styles.aiBtnText, { color: theme.primary }]}>{aiLoading ? 'Thinking…' : 'Ask AI for suggestions'}</Text>
              </TouchableOpacity>

              {/* AI Panel */}
              {aiPanelVisible && (
                <View style={[styles.aiPanel, { backgroundColor: theme.surface, borderColor: theme.primary }]}>
                  <View style={styles.aiPanelHeader}>
                    <MaterialIcons name="auto-awesome" size={16} color={theme.primary} />
                    <Text style={[styles.aiPanelTitle, { color: theme.primary }]}>AI Suggestions</Text>
                    <TouchableOpacity onPress={() => setAiPanelVisible(false)} style={{ marginLeft: 'auto' }}>
                      <MaterialIcons name="close" size={16} color={theme.placeholder} />
                    </TouchableOpacity>
                  </View>
                  {aiLoading && <Text style={[styles.aiLoading, { color: theme.placeholder }]}>Generating suggestions…</Text>}
                  {aiAdvice && !aiLoading && <Text style={[styles.aiAdvice, { color: theme.text }]}>{aiAdvice}</Text>}
                  {aiSuggestions && !aiLoading && (
                    <>
                      {aiSuggestions.criteria.length > 0 && (
                        <>
                          <Text style={[styles.aiSubLabel, { color: theme.placeholder }]}>Suggested criteria — tap to add:</Text>
                          <View style={styles.chipRow}>
                            {aiSuggestions.criteria.map((name, i) => {
                              const added = criteria.some((c) => c.name.toLowerCase() === name.toLowerCase());
                              return (
                                <TouchableOpacity key={i} style={[styles.chip, { backgroundColor: added ? theme.primary : theme.card, borderColor: theme.primary }]}
                                  onPress={() => applySuggestedCriterion(name)} disabled={added}>
                                  <Text style={[styles.chipText, { color: added ? theme.background : theme.primary }]}>{added ? '✓ ' : '+ '}{name}</Text>
                                </TouchableOpacity>
                              );
                            })}
                          </View>
                        </>
                      )}
                      {aiSuggestions.options.length > 0 && (
                        <>
                          <Text style={[styles.aiSubLabel, { color: theme.placeholder }]}>Suggested options — tap to add:</Text>
                          <View style={styles.chipRow}>
                            {aiSuggestions.options.map((name, i) => {
                              const added = options.some((o) => o.name.toLowerCase() === name.toLowerCase());
                              return (
                                <TouchableOpacity key={i} style={[styles.chip, { backgroundColor: added ? theme.secondary : theme.card, borderColor: theme.secondary }]}
                                  onPress={() => applySuggestedOption(name)} disabled={added}>
                                  <Text style={[styles.chipText, { color: added ? theme.background : theme.secondary }]}>{added ? '✓ ' : '+ '}{name}</Text>
                                </TouchableOpacity>
                              );
                            })}
                          </View>
                        </>
                      )}
                    </>
                  )}
                </View>
              )}

              {/* Step 3 — Criteria */}
              <StepLabel step={3} label="Criteria" theme={theme} />
              <Text style={[styles.hint, { color: theme.placeholder }]}>Tap a circle to select it, then rate your options below.</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.shapeRow} contentContainerStyle={{ paddingRight: 8, alignItems: 'flex-start' }}>
                {criteria.map((c) => (
                  <CircleItem
                    key={c.id} label={c.name} isActive={activeCritId === c.id}
                    activeColor={activeCircleColor} activeLabelColor={activeCircleTextColor}
                    inactiveColor={theme.surface} borderColor={theme.border}
                    textColor={theme.text} placeholderColor={theme.placeholder}
                    onPress={() => setActiveCritId(c.id)} onDelete={() => removeCriterion(c.id)}
                    onChangeName={(v) => updateCriterionName(c.id, v)} canDelete={criteria.length > 1}
                  />
                ))}
                <View style={{ alignItems: 'center', justifyContent: 'center', marginBottom: 24 }}>
                  <AddShape onPress={() => addCriterion()} borderColor={theme.primary} color={theme.primary} />
                </View>
              </ScrollView>

              {/* Step 4 — Options */}
              <StepLabel step={4} label="Options" theme={theme} />
              <Text style={[styles.hint, { color: theme.placeholder }]}>Add your choices, then score them using the sliders below.</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.shapeRow} contentContainerStyle={{ paddingRight: 8, alignItems: 'flex-start' }}>
                {options.map((o) => (
                  <RectItem
                    key={o.id} label={o.name} inactiveColor={theme.surface}
                    borderColor={theme.border} textColor={theme.text}
                    placeholderColor={theme.placeholder}
                    onDelete={() => removeOption(o.id)} onChangeName={(v) => updateOptionName(o.id, v)}
                  />
                ))}
                <View style={{ alignItems: 'center', justifyContent: 'center', marginBottom: 24 }}>
                  <AddShape onPress={() => addOption()} borderColor={theme.primary} color={theme.primary} rect />
                </View>
              </ScrollView>

              {/* Scoring panel */}
              {activeCrit && options.length > 0 && (
                <View style={[styles.scoringPanel, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                  <View style={styles.scoringHeader}>
                    <View style={[styles.scoringDot, { backgroundColor: activeCircleColor }]} />
                    <Text style={[styles.scoringTitle, { color: theme.text }]}>
                      Scoring on: <Text style={{ color: activeCircleColor, fontWeight: '700' }}>{activeCrit.name || 'this criterion'}</Text>
                    </Text>
                    <TouchableOpacity style={[styles.autoScoreBtn, { borderColor: theme.primary, backgroundColor: theme.card }]}
                      onPress={autoScore} disabled={autoScoreLoading} activeOpacity={0.8}>
                      {autoScoreLoading ? <ActivityIndicator size="small" color={theme.primary} /> : <MaterialIcons name="auto-awesome" size={13} color={theme.primary} />}
                      <Text style={[styles.autoScoreBtnText, { color: theme.primary }]}>{autoScoreLoading ? 'Scoring…' : 'Auto Score'}</Text>
                    </TouchableOpacity>
                  </View>
                  {options.map((opt) => {
                    const critScore = opt.criteria.find((c) => c.id === activeCritId)?.score ?? 5;
                    return (
                      <View key={opt.id} style={styles.optionScoreRow}>
                        <View style={styles.optionScoreLabelRow}>
                          <Text style={[styles.optionScoreName, { color: theme.text }]} numberOfLines={1}>{opt.name || '—'}</Text>
                          <Text style={[styles.optionScoreVal, { color: activeCircleColor }]}>{critScore.toFixed(1)}</Text>
                        </View>
                        <Slider style={styles.slider} minimumValue={0} maximumValue={10} step={0.5} value={critScore}
                          onValueChange={(v) => updateOptionScore(opt.id, activeCritId, v)}
                          minimumTrackTintColor={activeCircleColor} maximumTrackTintColor={theme.border} thumbTintColor={activeCircleColor} />
                      </View>
                    );
                  })}
                </View>
              )}

              {/* Best preview */}
              {options.length > 1 && computed.bestOptionName && (
                <View style={[styles.bestPreview, { backgroundColor: theme.card, borderColor: theme.primary }]}>
                  <MaterialIcons name="emoji-events" size={18} color={theme.primary} />
                  <Text style={[styles.bestPreviewText, { color: theme.primary }]}>
                    Best so far: {computed.bestOptionName} ({computed.finalScore.toFixed(1)})
                  </Text>
                </View>
              )}

              <TouchableOpacity style={[styles.submitBtn, { backgroundColor: theme.primary }]} onPress={handleSubmit} activeOpacity={0.85}>
                <Text style={[styles.submitBtnText, { color: theme.background }]}>Save Decision</Text>
              </TouchableOpacity>

            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
            <TutorialOverlay
        visible={showTutorial}
        steps={DECISIONS_STEPS}
        theme={theme}
        onDone={() => {
          setShowTutorial(false);
          markTutorialSeen('decisions');
        }}
        onAskAI={() => navigation.getParent()?.navigate('AIChat')}
      />
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  heading:   { fontSize: 28, fontWeight: 'bold', marginBottom: 4, textAlign: 'left', paddingHorizontal: 16 },
  empty:     { textAlign: 'center', marginTop: 60, fontSize: 15 },

  catRow: { marginBottom: 6, maxHeight: 46 },
  catChip: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, borderWidth: 1.5 },
  catChipText: { fontSize: 12, fontWeight: '700' },

  fab: {
    position: 'absolute', left: 24, width: 58, height: 58, borderRadius: 29,
    alignItems: 'center', justifyContent: 'center', elevation: 3,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.15, shadowRadius: 2,
  },

  // Add category modal
  overlayBg:   { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },
  addCatBox:   { width: '100%', borderRadius: 16, padding: 20, borderWidth: 1 },
  addCatTitle: { fontSize: 17, fontWeight: '700', marginBottom: 14 },
  addCatInput: { borderWidth: 1, borderRadius: 10, padding: 12, fontSize: 15, marginBottom: 16 },
  addCatBtns:  { flexDirection: 'row', gap: 10, justifyContent: 'flex-end' },
  addCatBtn:   { borderWidth: 1, borderRadius: 10, paddingHorizontal: 18, paddingVertical: 10 },
  addCatBtnText: { fontSize: 14, fontWeight: '600' },

  // Decision modal
  modalWrapper: { flex: 1 },
  modalHeader:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1 },
  modalTitle:   { fontSize: 17, fontWeight: '700' },
  saveBtn:      { fontSize: 16, fontWeight: '700' },
  modalScroll:  { padding: 16, paddingBottom: 48 },

  input: { borderWidth: 1, padding: 14, borderRadius: 12, fontSize: 15, marginBottom: 4 },
  hint:  { fontSize: 12, marginBottom: 10, marginTop: -6 },
  shapeRow: { marginBottom: 4 },

  aiBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderRadius: 10, paddingVertical: 10, paddingHorizontal: 14, marginBottom: 4, alignSelf: 'flex-start' },
  aiBtnText: { fontSize: 14, fontWeight: '600' },
  aiPanel: { borderWidth: 1, borderRadius: 14, padding: 14, marginTop: 10, marginBottom: 4 },
  aiPanelHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 },
  aiPanelTitle: { fontSize: 14, fontWeight: '700' },
  aiLoading: { fontSize: 13, fontStyle: 'italic', marginBottom: 4 },
  aiAdvice:  { fontSize: 13, lineHeight: 19, marginBottom: 10, fontStyle: 'italic', opacity: 0.9 },
  aiSubLabel: { fontSize: 11, marginBottom: 6, marginTop: 4 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
  chip: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5 },
  chipText: { fontSize: 12, fontWeight: '600' },

  scoringPanel:  { borderWidth: 1, borderRadius: 16, padding: 14, marginTop: 4, marginBottom: 12 },
  scoringHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 14, gap: 8 },
  scoringDot:    { width: 10, height: 10, borderRadius: 5 },
  scoringTitle:  { fontSize: 13, fontWeight: '600', flex: 1 },
  autoScoreBtn:  { flexDirection: 'row', alignItems: 'center', gap: 4, borderWidth: 1, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 5 },
  autoScoreBtnText: { fontSize: 11, fontWeight: '700' },

  optionScoreRow:      { marginBottom: 10 },
  optionScoreLabelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 },
  optionScoreName:     { fontSize: 13, fontWeight: '600', flex: 1 },
  optionScoreVal:      { fontSize: 13, fontWeight: '700', minWidth: 28, textAlign: 'right' },
  slider:              { width: '100%', height: 34 },

  bestPreview:     { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderRadius: 10, padding: 12, marginTop: 4, marginBottom: 4 },
  bestPreviewText: { fontSize: 14, fontWeight: '700' },
  submitBtn:       { marginTop: 20, borderRadius: 14, paddingVertical: 16, alignItems: 'center' },
  submitBtnText:   { fontSize: 16, fontWeight: '700' },
});