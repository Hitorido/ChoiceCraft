import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { MaterialIcons } from "@expo/vector-icons";
import { Decision } from "../types/decision";
import { useDecisions } from "../components/DecisionContext";
import { pushReportToSupabase } from "../lib/supabaseSync";

interface Props {
  decision: Decision;
  onEdit?: (d: Decision) => void;
  onDelete?: (id: string) => void;
}

const OVERALL_CRITERION_ID = "__overall__";

const CATEGORY_COLORS: Record<string, string> = {
  'Work': '#4A90E2', 'Fitness': '#E2844A', 'Academics': '#9B59B6',
  'Finance': '#27AE60', 'Personal': '#E74C3C', 'Health': '#1ABC9C',
  'Travel': '#F39C12', 'Career': '#5C6BC0', 'Relationships': '#E91E63',
};

function getCategoryColor(name: string): string {
  if (CATEGORY_COLORS[name]) return CATEGORY_COLORS[name];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return `hsl(${Math.abs(hash) % 360}, 60%, 45%)`;
}

const reportsKey = (user: string) => `reports_${user}`;

export type DecisionReport = {
  id: string;
  decisionId: string;
  title: string;
  savedAt: string; // ISO string
  content: string; // formatted text report
};

export default function DecisionCard({ decision, onEdit, onDelete }: Props) {
  const [expanded, setExpanded] = useState(false);
  const [activeCriterionId, setActiveCriterionId] = useState<string>(OVERALL_CRITERION_ID);
  const { theme, currentUser, userId } = useDecisions();

  const criteria = decision.options?.[0]?.criteria ?? [];
  const activeCriterion = criteria.find((c) => c.id === activeCriterionId) ?? null;

  const bestOption = React.useMemo(() => {
    if (activeCriterionId === OVERALL_CRITERION_ID) {
      return { name: decision.bestOptionName, score: decision.finalScore };
    }
    let bestName = "";
    let bestScore = -Infinity;
    decision.options.forEach((opt) => {
      const score = opt.criteria.find((c) => c.id === activeCriterionId)?.score ?? 0;
      if (score > bestScore) { bestScore = score; bestName = opt.name; }
    });
    return { name: bestName, score: bestScore === -Infinity ? 0 : bestScore };
  }, [activeCriterionId, decision]);

  const getScoreForOption = (optId: string) => {
    const option = decision.options.find((o) => o.id === optId);
    if (!option) return 0;
    if (activeCriterionId === OVERALL_CRITERION_ID) return option.finalScore;
    return option.criteria.find((c) => c.id === activeCriterionId)?.score ?? 0;
  };

  const handleDelete = () => {
    Alert.alert("Delete Decision", `Delete "${decision.title}"?`, [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: () => onDelete?.(decision.id) },
    ]);
  };

  const handlePrintReport = async () => {
    if (!currentUser) {
      Alert.alert("Error", "No user logged in.");
      return;
    }

    // Build report text
    const lines: string[] = [];
    const now = new Date();
    lines.push(`DECISION REPORT`);
    lines.push(`Generated: ${now.toLocaleString()}`);
    lines.push(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    lines.push(`Title: ${decision.title}`);
    lines.push(`Best Option: ${decision.bestOptionName} (${decision.finalScore.toFixed(1)}/10)`);
    lines.push(``);
    lines.push(`CRITERIA:`);
    criteria.forEach((c) => {
      lines.push(`  • ${c.name} (weight: ${c.weight})`);
    });
    lines.push(``);
    lines.push(`OPTIONS & SCORES:`);
    decision.options.forEach((opt) => {
      lines.push(`  ${opt.name === decision.bestOptionName ? "★" : "◦"} ${opt.name} — Overall: ${opt.finalScore.toFixed(1)}`);
      opt.criteria.forEach((c) => {
        lines.push(`      ${c.name}: ${c.score.toFixed(1)}`);
      });
    });
    lines.push(``);
    lines.push(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);

    const report: DecisionReport = {
      id: Date.now().toString(),
      decisionId: decision.id,
      title: decision.title,
      savedAt: now.toISOString(),
      content: lines.join("\n"),
    };

    try {
      const existing = await AsyncStorage.getItem(reportsKey(currentUser));
      const reports: DecisionReport[] = existing ? JSON.parse(existing) : [];
      reports.unshift(report); // newest first
      await AsyncStorage.setItem(reportsKey(currentUser), JSON.stringify(reports));
      // Push report to Supabase
      if (userId) pushReportToSupabase(userId, report);
      Alert.alert("Report Saved", `Report for "${decision.title}" has been saved. View it in your Profile.`);
    } catch (e) {
      Alert.alert("Error", "Could not save report.");
    }
  };

  return (
    <TouchableOpacity
      activeOpacity={0.9}
      onPress={() => setExpanded((prev) => !prev)}
      style={[styles.card, { backgroundColor: theme.card, shadowColor: theme.shadow }]}
    >
      {/* Header */}
      <View style={styles.headerRow}>
        <View style={styles.titleRow}>
          <MaterialIcons name="lightbulb" size={18} color={theme.secondary} />
          <Text style={[styles.title, { color: theme.primary }]}>{decision.title}</Text>
        </View>
        <View style={styles.headerRight}>
          {(decision as any).category && (
            <View style={[styles.catBadge, { backgroundColor: getCategoryColor((decision as any).category) }]}>
              <Text style={styles.catBadgeText}>{(decision as any).category}</Text>
            </View>
          )}
          <MaterialIcons
            name={expanded ? "keyboard-arrow-up" : "keyboard-arrow-down"}
            size={24} color={theme.secondary}
          />
        </View>
      </View>

      {/* Best row */}
      <View style={styles.bestRow}>
        <MaterialIcons name="check-circle" size={16} color={theme.primary} />
        <Text style={[styles.bestText, { color: theme.primary }]}>
          Best: {bestOption.name || "—"} ({bestOption.score.toFixed(1)})
        </Text>
      </View>

      {/* Criteria chips */}
      {expanded && (
        <View style={[styles.criteriaChips, { borderColor: theme.border }]}>
          <TouchableOpacity
            style={[styles.criteriaChip, {
              borderColor: activeCriterionId === OVERALL_CRITERION_ID ? theme.primary : theme.border,
              backgroundColor: activeCriterionId === OVERALL_CRITERION_ID ? theme.primary : theme.card,
            }]}
            onPress={() => setActiveCriterionId(OVERALL_CRITERION_ID)}
          >
            <Text style={{ color: activeCriterionId === OVERALL_CRITERION_ID ? theme.background : theme.text, fontWeight: "600", fontSize: 12 }}>
              Overall
            </Text>
          </TouchableOpacity>

          {criteria.map((c) => (
            <TouchableOpacity
              key={c.id}
              style={[styles.criteriaChip, {
                borderColor: activeCriterionId === c.id ? theme.primary : theme.border,
                backgroundColor: activeCriterionId === c.id ? theme.primary : theme.card,
              }]}
              onPress={() => setActiveCriterionId(c.id)}
            >
              <Text style={{ color: activeCriterionId === c.id ? theme.background : theme.text, fontWeight: "600", fontSize: 12 }}>
                {c.name || "Criterion"}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Options */}
      {expanded && (
        <View style={styles.optionsContainer}>
          {decision.options.map((opt) => {
            const score = getScoreForOption(opt.id);
            const scorePercent = (Math.min(Math.max(score, 0), 10) / 10) * 100;
            const isBest = bestOption.name === opt.name;

            return (
              <View key={opt.id} style={[styles.optionBlock, { borderColor: theme.border }]}>
                <View style={styles.optionHeader}>
                  <Text style={[styles.optionTitle, { color: theme.text }]}>{opt.name}</Text>
                  {isBest && (
                    <View style={[styles.metricPill, { backgroundColor: theme.primary }]}>
                      <MaterialIcons name="check" size={14} color={theme.background} />
                      <Text style={[styles.metricText, { color: theme.background }]}>Best</Text>
                    </View>
                  )}
                </View>

                {opt.notes ? (
                  <Text style={[styles.optionNotes, { color: theme.text }]}>{opt.notes}</Text>
                ) : null}

                <View style={[styles.scoreBarBackground, { backgroundColor: theme.disabled }]}>
                  <View style={[styles.scoreBarFill, { width: `${scorePercent}%`, backgroundColor: theme.primary }]} />
                </View>

                <View style={styles.sliderInfoRow}>
                  <Text style={[styles.slideScore, { color: theme.text }]}>Score: {score.toFixed(1)}</Text>
                  <Text style={[styles.slideHint, { color: theme.placeholder }]}>
                    {activeCriterionId === OVERALL_CRITERION_ID ? "Overall score" : `Criterion: ${activeCriterion?.name || "—"}`}
                  </Text>
                </View>
              </View>
            );
          })}

          {/* Actions: edit, print report, delete */}
          <View style={styles.actions}>
            {onEdit && (
              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: theme.surface, borderColor: theme.border }]}
                onPress={(e) => { e.stopPropagation?.(); onEdit(decision); }}
              >
                <MaterialIcons name="edit" size={18} color={theme.primary} />
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: theme.surface, borderColor: theme.border }]}
              onPress={(e) => { e.stopPropagation?.(); handlePrintReport(); }}
            >
              <MaterialIcons name="print" size={18} color={theme.primary} />
            </TouchableOpacity>

            {onDelete && (
              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: theme.surface, borderColor: '#e53935' }]}
                onPress={(e) => { e.stopPropagation?.(); handleDelete(); }}
              >
                <MaterialIcons name="delete" size={18} color="#e53935" />
              </TouchableOpacity>
            )}
          </View>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 12, padding: 14, marginBottom: 10,
    shadowOpacity: 0.12, shadowOffset: { width: 0, height: 1 },
    shadowRadius: 4, elevation: 3,
  },
  headerRow:  { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  headerRight: { flexDirection: "row", alignItems: "center", gap: 6 },
  titleRow:   { flexDirection: "row", alignItems: "center", flex: 1, marginRight: 8 },
  title:      { fontSize: 16, fontWeight: "bold", marginBottom: 4, marginLeft: 6, flex: 1 },
  catBadge:   { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 },
  catBadgeText: { fontSize: 10, fontWeight: '700', color: '#fff' },
  bestRow:    { flexDirection: "row", alignItems: "center", marginTop: 6 },
  bestText:   { marginLeft: 6, fontWeight: "bold" },

  criteriaChips: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 10, marginBottom: 10 },
  criteriaChip:  { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, borderWidth: 1 },

  optionsContainer: { marginTop: 12 },
  optionBlock:      { borderTopWidth: 1, paddingTop: 8, marginTop: 8 },
  optionHeader:     { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 6 },
  optionTitle:      { fontSize: 14, fontWeight: "600", flex: 1, textAlign: "center" },
  optionNotes:      { marginTop: 6, marginBottom: 6, fontSize: 12, opacity: 0.8 },
  metricPill:       { flexDirection: "row", alignItems: "center", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, marginLeft: 6 },
  metricText:       { fontSize: 12, marginLeft: 4, fontWeight: "600" },
  scoreBarBackground: { height: 8, borderRadius: 4, overflow: "hidden" },
  scoreBarFill:       { height: 8, borderRadius: 4 },
  sliderInfoRow:      { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 8 },
  slideScore:         { fontWeight: "700" },
  slideHint:          { fontSize: 12 },

  actions: { flexDirection: "row", justifyContent: "flex-end", marginTop: 14, gap: 8 },
  actionBtn: {
    borderWidth: 1, borderRadius: 8,
    padding: 8, alignItems: "center", justifyContent: "center",
  },
});