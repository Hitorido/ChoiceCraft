import { useEffect, useRef, useState } from "react";
import { View, Text, StyleSheet, Image, Alert } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import * as ImagePicker from "expo-image-picker";
import { BottomTabScreenProps } from "@react-navigation/bottom-tabs";
import { BottomTabParamList } from "../types/navigation";
import CustomButton from "../components/CustomButton";
import { useDecisions } from "../components/DecisionContext";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import TutorialOverlay, { TutorialStep } from '../components/TutorialOverlay';
import { useIsFocused } from '@react-navigation/native';

type Props = BottomTabScreenProps<BottomTabParamList, "Dashboard">;

export default function DashboardScreen({ navigation }: Props) {
  const { decisions, currentUser, logout, profilePic, setProfilePic, apiKey, darkMode, theme, tutorialsSeenMap, markTutorialSeen, tutorialsLoaded } = useDecisions();
  const insets = useSafeAreaInsets();
  const isFocused = useIsFocused();
  const tutorialShownRef = useRef(false);

  const [avgScore, setAvgScore] = useState<number>(0);
  const [aiSuggestion, setAiSuggestion] = useState<string | null>(null);

  useEffect(() => {
    if (decisions.length === 0) {
      setAvgScore(0);
      return;
    }
    const total = decisions.reduce((sum, d) => sum + d.finalScore, 0);
    setAvgScore(total / decisions.length);
  }, [decisions]);
const [showTutorial, setShowTutorial] = useState(false);

useEffect(() => {
  if (!tutorialsSeenMap['dashboard']) tutorialShownRef.current = false;
  if (
    tutorialsLoaded &&
    !tutorialsSeenMap['dashboard'] &&
    isFocused &&
    !tutorialShownRef.current
  ) {
    tutorialShownRef.current = true;
    const t = setTimeout(() => setShowTutorial(true), 600);
    return () => clearTimeout(t);
  }
}, [tutorialsLoaded, tutorialsSeenMap, isFocused]);


const DASHBOARD_STEPS: TutorialStep[] = [
  {
    icon: 'waving-hand',
    title: 'Welcome to ChoiceCraft! 👋',
    description: "This is your Dashboard — your home base. Let's take a quick tour so you know where everything is.",
    position: 'center',
  },
  {
    icon: 'account-circle',
    title: 'Your Profile',
    description: 'Your avatar and username appear at the top. Tap "Change Photo" to personalize your account.',
    position: 'top',
  },
  {
    icon: 'bar-chart',
    title: 'Your Stats',
    description: 'See how many decisions you\'ve made and your average score across all of them at a glance.',
    position: 'center',
  },
  {
    icon: 'touch-app',
    title: 'Navigation',
    description: 'Use "View Decisions" to manage your list, or "Profile" for settings, saved reports, and dark mode.',
    position: 'bottom',
  },
];

  return (
    <LinearGradient
      colors={[theme.gradientStart, theme.gradientEnd]}
      style={[
        styles.container,
        { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 16 },
      ]}
    >
      {profilePic ? (
        <Image
          source={{ uri: profilePic }}
          style={[styles.avatar, { borderColor: theme.primary }]}
        />
      ) : (
        <View style={[styles.avatarPlaceholder, { backgroundColor: theme.disabled }]} />
      )}

      <Text style={[styles.heading, { color: theme.text }]}>Hello, {currentUser}</Text>

      <View style={[styles.card, { backgroundColor: theme.card, shadowColor: theme.shadow }]}> 
        <Text style={[styles.statLabel, { color: theme.text }]}>Total Decisions</Text>
        <Text style={[styles.statValue, { color: theme.primary }]}>{decisions.length}</Text>
      </View>

      <View style={[styles.card, { backgroundColor: theme.card, shadowColor: theme.shadow }]}> 
        <Text style={[styles.statLabel, { color: theme.text }]}>Average Score</Text>
        <Text style={[styles.statValue, { color: theme.primary }]}> 
          {avgScore.toFixed(2)}
        </Text>
      </View>

      <CustomButton
        title="Change Photo"
        onPress={async () => {
          const { status } =
            await ImagePicker.requestMediaLibraryPermissionsAsync();
          if (status !== "granted") return;

          const result =
            await ImagePicker.launchImageLibraryAsync({
              mediaTypes: ImagePicker.MediaTypeOptions.Images,
              allowsEditing: true,
              aspect: [1, 1],
              quality: 0.7,
            });

          if (!result.canceled && result.assets?.length) {
            setProfilePic(result.assets[0].uri);
          }
        }}
      />

      <CustomButton
        title="View Decisions"
        onPress={() => navigation.navigate("DecisionList")}
      />

      <CustomButton
        title="Profile"
        onPress={() => navigation.navigate("Profile")}
      />

      <CustomButton
        title="Logout"
        onPress={() => {
          logout();
          navigation.getParent()?.navigate("Login");
        }}
      />
            <TutorialOverlay
        visible={showTutorial}
        steps={DASHBOARD_STEPS}
        theme={theme}
        onDone={() => {
          setShowTutorial(false);
          markTutorialSeen('dashboard');
        }}
        onAskAI={() => navigation.getParent()?.navigate('AIChat')}
      />
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    justifyContent: "center",
  },

  heading: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 24,
    textAlign: "center",
  },

  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignSelf: "center",
    marginBottom: 12,
    borderWidth: 3,
  },

  avatarPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignSelf: "center",
    marginBottom: 12,
  },

  card: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 3,
  },

  statLabel: {
    fontSize: 16,
  },

  statValue: {
    fontSize: 18,
    fontWeight: "bold",
  },
});