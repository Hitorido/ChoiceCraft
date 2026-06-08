import { useState, useEffect, useRef } from "react";
import TutorialOverlay, { TutorialStep } from "../components/TutorialOverlay";
import { useNavigation } from "@react-navigation/native";
import {
  View,
  Text,
  StyleSheet,
  Switch,
  SafeAreaView,
  Image,
  StatusBar,
  Modal,
  ScrollView,
  TouchableOpacity,
  Alert,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { LinearGradient } from "expo-linear-gradient";
import { MaterialIcons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useDecisions } from "../components/DecisionContext";
import {
  deleteReportFromSupabase,
  fetchReportsFromSupabase,
} from "../lib/supabaseSync";
import CustomButton from "../components/CustomButton";
import type { DecisionReport } from "../components/DecisionCard";
import { useIsFocused } from "@react-navigation/native";
import type { BottomTabScreenProps } from "@react-navigation/bottom-tabs";
import type { BottomTabParamList } from "../types/navigation";

type Props = BottomTabScreenProps<BottomTabParamList, "Profile">;

const reportsKey = (user: string) => `reports_${user}`;

export default function ProfileScreen(props: Props) {
  const {
    decisions,
    currentUser,
    profilePic,
    setProfilePic,
    logout,
    darkMode,
    toggleDarkMode,
    theme,
    tutorialsSeenMap,
    markTutorialSeen,
    resetAllTutorials,
    tutorialsLoaded,
    userId,
  } = useDecisions();

  const [showTutorial, setShowTutorial] = useState(false);
  const [reportsVisible, setReportsVisible] = useState(false);
  const [reports, setReports] = useState<DecisionReport[]>([]);
  const [selectedReport, setSelectedReport] = useState<DecisionReport | null>(
    null,
  );

  const loadReports = async () => {
    if (!currentUser || !userId) return;
    try {
      const stored = await AsyncStorage.getItem(reportsKey(currentUser));
      if (stored) {
        setReports(JSON.parse(stored));
      } else {
        // Fetch from Supabase if no local data
        const remote = await fetchReportsFromSupabase(userId);
        if (remote.length > 0) {
          setReports(remote);
          AsyncStorage.setItem(reportsKey(currentUser), JSON.stringify(remote));
        }
      }
    } catch {
      setReports([]);
    }
  };

  const deleteReport = async (id: string) => {
    if (!currentUser) return;
    Alert.alert("Delete Report", "Remove this report?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          const updated = reports.filter((r) => r.id !== id);
          setReports(updated);
          setSelectedReport(null);
          await AsyncStorage.setItem(
            reportsKey(currentUser),
            JSON.stringify(updated),
          );
          // Delete from Supabase
          if (userId) deleteReportFromSupabase(id);
        },
      },
    ]);
  };

  const isFocused = useIsFocused();
  const tutorialShownRef = useRef(false);

  useEffect(() => {
    if (!tutorialsSeenMap["profile"]) tutorialShownRef.current = false;
    if (
      tutorialsLoaded &&
      !tutorialsSeenMap["profile"] &&
      isFocused &&
      !tutorialShownRef.current
    ) {
      tutorialShownRef.current = true;
      const t = setTimeout(() => setShowTutorial(true), 600);
      return () => clearTimeout(t);
    }
  }, [tutorialsLoaded, tutorialsSeenMap, isFocused]);

  const PROFILE_STEPS: TutorialStep[] = [
    {
      icon: "manage-accounts",
      title: "Your Profile",
      description:
        'View your username, total decisions, and profile photo. Tap "Change Photo" to update your avatar.',
      position: "top",
    },
    {
      icon: "description",
      title: "Saved Reports",
      description:
        'Tap "View Saved Reports" to see decision reports you\'ve saved using the 🖨️ print icon on any decision card.',
      position: "center",
    },
    {
      icon: "dark-mode",
      title: "Dark Mode",
      description:
        "Toggle between dark and light theme here — the setting is saved and applies across the entire app.",
      position: "bottom",
    },
    {
      icon: "school",
      title: "Replay Tutorial",
      description:
        'You can replay the tutorial anytime by tapping "Replay Tutorial" below. It resets all screens.',
      position: "bottom",
    },
  ];

  const formatDate = (iso: string) => {
    try {
      return new Date(iso).toLocaleString();
    } catch {
      return iso;
    }
  };

  return (
    <LinearGradient
      colors={[theme.gradientStart, theme.gradientEnd]}
      style={styles.background}
    >
      <StatusBar
        barStyle={darkMode ? "light-content" : "dark-content"}
        backgroundColor={theme.gradientStart}
      />
      <SafeAreaView style={styles.container}>
        <View
          style={[
            styles.card,
            { backgroundColor: theme.card, shadowColor: theme.shadow },
          ]}
        >
          {profilePic ? (
            <Image source={{ uri: profilePic }} style={styles.avatar} />
          ) : (
            <View
              style={[
                styles.avatarPlaceholder,
                { backgroundColor: theme.disabled },
              ]}
            />
          )}
          <Text style={[styles.text, { color: theme.text }]}>
            Username: {currentUser}
          </Text>
          <Text style={[styles.text, { color: theme.text }]}>
            Total decisions: {decisions.length}
          </Text>

          <CustomButton
            title="Change Photo"
            onPress={async () => {
              const { status } =
                await ImagePicker.requestMediaLibraryPermissionsAsync();
              if (status !== "granted") return;
              const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: true,
                aspect: [1, 1],
                quality: 0.7,
              });
              if (!result.canceled && result.assets?.length)
                setProfilePic(result.assets[0].uri);
            }}
          />

          <CustomButton
            title="Logout"
            onPress={() => {
              logout();
              props.navigation.getParent()?.navigate("Login");
            }}
          />
        </View>

        {/* View Reports button */}
        <TouchableOpacity
          style={[
            styles.reportsBtn,
            { backgroundColor: theme.card, borderColor: theme.primary },
          ]}
          onPress={() => {
            loadReports();
            setReportsVisible(true);
          }}
          activeOpacity={0.85}
        >
          <MaterialIcons name="description" size={20} color={theme.primary} />
          <Text style={[styles.reportsBtnText, { color: theme.primary }]}>
            View Saved Reports
          </Text>
        </TouchableOpacity>

        <View style={styles.switchRow}>
          <Text style={[styles.text, { color: theme.text }]}>Dark Mode</Text>
          <Switch value={darkMode} onValueChange={toggleDarkMode} />
        </View>

        <TouchableOpacity
          style={[
            styles.replayBtn,
            { borderColor: theme.border, backgroundColor: theme.card },
          ]}
          onPress={() => {
            Alert.alert(
              "Replay Tutorial",
              "This will reset the tutorial for all screens. Continue?",
              [
                { text: "Cancel", style: "cancel" },
                {
                  text: "Reset",
                  onPress: async () => {
                    await resetAllTutorials();
                    Alert.alert(
                      "Done",
                      "Tutorial reset! It will show on your next visit to each screen.",
                    );
                  },
                },
              ],
            );
          }}
        >
          <MaterialIcons name="school" size={18} color={theme.primary} />
          <Text style={[styles.replayBtnText, { color: theme.primary }]}>
            Replay Tutorial
          </Text>
        </TouchableOpacity>
      </SafeAreaView>

      {/* ── Reports List Modal ────────────────────────────────────────────── */}
      <Modal visible={reportsVisible} animationType="slide">
        <View
          style={[styles.modalWrapper, { backgroundColor: theme.background }]}
        >
          <View
            style={[styles.modalHeader, { borderBottomColor: theme.border }]}
          >
            <TouchableOpacity
              onPress={() => {
                setReportsVisible(false);
                setSelectedReport(null);
              }}
            >
              <MaterialIcons name="close" size={24} color={theme.text} />
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: theme.text }]}>
              Saved Reports
            </Text>
            <View style={{ width: 24 }} />
          </View>

          {reports.length === 0 ? (
            <View style={styles.emptyReports}>
              <MaterialIcons
                name="description"
                size={48}
                color={theme.placeholder}
              />
              <Text style={[styles.emptyText, { color: theme.placeholder }]}>
                No reports yet. Tap the print icon on a decision to save one.
              </Text>
            </View>
          ) : (
            <ScrollView contentContainerStyle={{ padding: 16 }}>
              {reports.map((report) => (
                <TouchableOpacity
                  key={report.id}
                  style={[
                    styles.reportItem,
                    { backgroundColor: theme.card, borderColor: theme.border },
                  ]}
                  onPress={() => setSelectedReport(report)}
                  activeOpacity={0.8}
                >
                  <View style={styles.reportItemRow}>
                    <MaterialIcons
                      name="description"
                      size={20}
                      color={theme.primary}
                    />
                    <View style={{ flex: 1, marginLeft: 10 }}>
                      <Text
                        style={[styles.reportItemTitle, { color: theme.text }]}
                        numberOfLines={1}
                      >
                        {report.title}
                      </Text>
                      <Text
                        style={[
                          styles.reportItemDate,
                          { color: theme.placeholder },
                        ]}
                      >
                        {formatDate(report.savedAt)}
                      </Text>
                    </View>
                    <TouchableOpacity
                      onPress={() => deleteReport(report.id)}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <MaterialIcons
                        name="delete-outline"
                        size={20}
                        color="#e53935"
                      />
                    </TouchableOpacity>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}
        </View>
      </Modal>

      {/* ── Single Report View Modal ──────────────────────────────────────── */}
      <Modal visible={!!selectedReport} animationType="slide">
        <View
          style={[styles.modalWrapper, { backgroundColor: theme.background }]}
        >
          <View
            style={[styles.modalHeader, { borderBottomColor: theme.border }]}
          >
            <TouchableOpacity onPress={() => setSelectedReport(null)}>
              <MaterialIcons name="arrow-back" size={24} color={theme.text} />
            </TouchableOpacity>
            <Text
              style={[styles.modalTitle, { color: theme.text }]}
              numberOfLines={1}
            >
              {selectedReport?.title}
            </Text>
            <TouchableOpacity
              onPress={() => selectedReport && deleteReport(selectedReport.id)}
            >
              <MaterialIcons name="delete-outline" size={22} color="#e53935" />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={{ padding: 20 }}>
            <Text style={[styles.reportMeta, { color: theme.placeholder }]}>
              Saved: {selectedReport ? formatDate(selectedReport.savedAt) : ""}
            </Text>
            <Text style={[styles.reportContent, { color: theme.text }]}>
              {selectedReport?.content}
            </Text>
          </ScrollView>
        </View>
      </Modal>
      <TutorialOverlay
        visible={showTutorial}
        steps={PROFILE_STEPS}
        theme={theme}
        onDone={() => {
          setShowTutorial(false);
          markTutorialSeen("profile");
        }}
        onAskAI={() => props.navigation.getParent()?.navigate("AIChat")}
      />
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  replayBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 20,
    marginTop: 12,
    justifyContent: "center",
  },
  replayBtnText: { fontSize: 14, fontWeight: "700" },

  background: { flex: 1 },
  container: { flex: 1, padding: 16, justifyContent: "center" },

  card: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    alignItems: "center",
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 2,
    elevation: 2,
  },
  text: { fontSize: 18, marginBottom: 12, textAlign: "center" },
  avatar: { width: 100, height: 100, borderRadius: 50, marginBottom: 12 },
  avatarPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: 12,
  },

  reportsBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 20,
    marginBottom: 16,
    justifyContent: "center",
  },
  reportsBtnText: { fontSize: 15, fontWeight: "700" },

  switchRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 4,
  },

  // Modal
  modalWrapper: { flex: 1 },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  modalTitle: { fontSize: 17, fontWeight: "700", flex: 1, textAlign: "center" },

  emptyReports: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 40,
    gap: 16,
  },
  emptyText: { fontSize: 14, textAlign: "center", lineHeight: 20 },

  reportItem: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    marginBottom: 10,
  },
  reportItemRow: { flexDirection: "row", alignItems: "center" },
  reportItemTitle: { fontSize: 15, fontWeight: "600", marginBottom: 2 },
  reportItemDate: { fontSize: 12 },

  reportMeta: { fontSize: 12, marginBottom: 16 },
  reportContent: { fontSize: 13, lineHeight: 20, fontFamily: "monospace" },
});
