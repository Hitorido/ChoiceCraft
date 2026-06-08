import React, { useState, useEffect, useRef, useCallback } from "react";
import TutorialOverlay, { TutorialStep } from "../components/TutorialOverlay";
import {
  pushChatMessageToSupabase,
  clearChatFromSupabase,
  fetchChatFromSupabase,
} from "../lib/supabaseSync";
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  ActivityIndicator,
  Alert,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MaterialIcons, Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useNavigation } from "@react-navigation/native";
import { RootStackParamList } from "../types/navigation";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useDecisions } from "../components/DecisionContext";
import { useIsFocused } from "@react-navigation/native";

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string; // stored as ISO string for AsyncStorage
};

type AIChatNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  "AIChat"
>;

const chatKey = (user: string) => `chat_history_${user}`;

export default function AIScreen() {
  const navigation = useNavigation<AIChatNavigationProp>();
  const { apiKey, theme, darkMode, currentUser, userId } = useDecisions();
  const insets = useSafeAreaInsets();

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showWelcome, setShowWelcome] = useState(true);
  const flatListRef = useRef<FlatList>(null);

  // ── Load chat history for current user ───────────────────────────────────
  useEffect(() => {
    if (!currentUser || !userId) return;
    (async () => {
      try {
        const stored = await AsyncStorage.getItem(chatKey(currentUser));
        if (stored) {
          const parsed: Message[] = JSON.parse(stored);
          setMessages(parsed);
          if (parsed.length > 0) setShowWelcome(false);
        } else {
          // Nothing local — try Supabase
          const remote = await fetchChatFromSupabase(userId);
          if (remote.length > 0) {
            setMessages(remote);
            setShowWelcome(false);
            AsyncStorage.setItem(chatKey(currentUser), JSON.stringify(remote));
          }
        }
      } catch (e) {
        console.warn("Failed to load chat history", e);
      }
    })();
  }, [currentUser, userId]);

  const { tutorialsSeenMap, markTutorialSeen, tutorialsLoaded } =
    useDecisions();
  const [showTutorial, setShowTutorial] = useState(false);
  const isFocused = useIsFocused();
  const tutorialShownRef = useRef(false);

  useEffect(() => {
    if (!tutorialsSeenMap["ai"]) tutorialShownRef.current = false;
    if (
      tutorialsLoaded &&
      !tutorialsSeenMap["ai"] &&
      isFocused &&
      !tutorialShownRef.current
    ) {
      tutorialShownRef.current = true;
      const t = setTimeout(() => setShowTutorial(true), 600);
      return () => clearTimeout(t);
    }
  }, [tutorialsLoaded, tutorialsSeenMap, isFocused]);

  const AI_STEPS: TutorialStep[] = [
    {
      icon: "smart-toy",
      title: "Meet Your AI Helper",
      description:
        "This is your personal decision-making assistant, powered by Gemini AI. Ask it anything!",
      position: "center",
    },
    {
      icon: "send",
      title: "Ask a Question",
      description:
        'Type in the box below and tap Send. Try asking: "What criteria should I use for buying a laptop?"',
      position: "bottom",
    },
    {
      icon: "history",
      title: "Chat History",
      description:
        "Your conversations are saved per account. Tap the 🗑️ icon in the top-right to clear the history anytime.",
      position: "top",
    },
    {
      icon: "auto-awesome",
      title: "Pro Tip",
      description:
        'Inside the "New Decision" form, use the AI button to get criteria and option suggestions for any specific decision.',
      position: "center",
    },
  ];

  // ── Persist whenever messages change ─────────────────────────────────────
  useEffect(() => {
    if (!currentUser || messages.length === 0) return;
    AsyncStorage.setItem(chatKey(currentUser), JSON.stringify(messages)).catch(
      () => {},
    );
  }, [messages, currentUser]);

  const scrollToBottom = useCallback(() => {
    flatListRef.current?.scrollToEnd({ animated: true });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // ── Send message ──────────────────────────────────────────────────────────
  const sendMessage = async () => {
    if (!input.trim() || isLoading || !apiKey) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input.trim(),
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);
    setShowWelcome(false);
    Keyboard.dismiss();

    const systemPrompt = `You are a helpful decision-making assistant. Help users make better decisions, analyze options, suggest criteria, or give advice. Be concise, insightful, and encouraging. Context: user "${currentUser}".`;

    try {
      const prompt = `${systemPrompt}\n\nUser: ${userMessage.content}`;
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
        },
      );

      const text = await response.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch {
        throw new Error("Invalid response");
      }

      if (!response.ok)
        throw new Error(
          `API error: ${data?.error?.message || response.statusText}`,
        );

      const aiContent =
        data.candidates?.[0]?.content?.parts?.[0]?.text ||
        "Sorry, no response.";
      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: aiContent
          .replace(/\*\*(.*?)\*\*/g, "$1")
          .replace(/<[^>]*>/g, "")
          .trim(),
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, aiMessage]);
      // Push messages to Supabase
      if (userId) {
        pushChatMessageToSupabase(userId, userMessage);
        pushChatMessageToSupabase(userId, aiMessage);
      }
    } catch (error: any) {
      const errorMsg = error.message.includes("key")
        ? "API key issue. Check Profile."
        : error.message;
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: `Oops: ${errorMsg}`,
          timestamp: new Date().toISOString(),
        },
      ]);
      Alert.alert("Error", errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  const clearChat = () => {
    Alert.alert("Clear Chat", "Delete all messages?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Clear",
        style: "destructive",
        onPress: () => {
          setMessages([]);
          setShowWelcome(true);
          if (currentUser)
            AsyncStorage.removeItem(chatKey(currentUser)).catch(() => {});
          // Clear Supabase chat
          if (userId) clearChatFromSupabase(userId);
        },
      },
    ]);
  };

  const formatTime = (iso: string) => {
    try {
      return new Date(iso).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return "";
    }
  };

  // ── Colors ────────────────────────────────────────────────────────────────
  // Header: always use a light color so it's visible on the gradient
  const headerTextColor = "#FFFFFF";
  // User bubble: primary color, text always white
  const userBubbleBg = theme.primary;
  const userTextColor = darkMode ? "#1a1a1a" : "#FFFFFF";
  const userTimeColor = darkMode
    ? "rgba(0,0,0,0.55)"
    : "rgba(255,255,255,0.75)";
  // AI bubble: card color, text uses theme
  const aiBubbleBg = theme.surface;
  const aiTextColor = theme.text;
  const aiTimeColor = darkMode ? "rgba(255,255,255,0.55)" : "rgba(0,0,0,0.45)";

  // ── Render message ────────────────────────────────────────────────────────
  const renderMessage = ({ item }: { item: Message }) => {
    const isUser = item.role === "user";
    return (
      <View
        style={[
          styles.messageContainer,
          isUser ? styles.userRow : styles.aiRow,
        ]}
      >
        {!isUser && (
          <View style={styles.aiAvatar}>
            <MaterialIcons name="smart-toy" size={20} color={theme.primary} />
          </View>
        )}
        <View
          style={[
            styles.bubble,
            isUser ? styles.userBubble : styles.aiBubble,
            { backgroundColor: isUser ? userBubbleBg : aiBubbleBg },
          ]}
        >
          <Text
            style={[
              styles.messageText,
              { color: isUser ? userTextColor : aiTextColor },
            ]}
          >
            {item.content}
          </Text>
          <Text
            style={[
              styles.timestamp,
              { color: isUser ? userTimeColor : aiTimeColor },
            ]}
          >
            {formatTime(item.timestamp)}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <LinearGradient
      colors={[theme.gradientStart, theme.gradientEnd]}
      style={[styles.container, { paddingTop: insets.top }]}
    >
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={insets.bottom + 80}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.headerBtn}
          >
            <Ionicons name="arrow-back" size={24} color={headerTextColor} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: headerTextColor }]}>
            AI Helper
          </Text>
          <TouchableOpacity onPress={clearChat} style={styles.headerBtn}>
            <MaterialIcons
              name="delete-outline"
              size={24}
              color={headerTextColor}
            />
          </TouchableOpacity>
        </View>

        {/* Messages */}
        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderMessage}
          keyExtractor={(item) => item.id}
          style={styles.list}
          contentContainerStyle={styles.listContent}
          keyboardShouldPersistTaps="handled"
        />

        {/* Welcome */}
        {showWelcome && messages.length === 0 && (
          <View style={styles.welcome}>
            <MaterialIcons name="smart-toy" size={52} color={theme.primary} />
            <Text style={[styles.welcomeTitle, { color: "#FFFFFF" }]}>
              AI Helper
            </Text>
            <Text
              style={[styles.welcomeSub, { color: "rgba(255,255,255,0.75)" }]}
            >
              Ask me anything about your decisions!
            </Text>
          </View>
        )}

        {/* Input bar */}
        <View
          style={[
            styles.inputBar,
            {
              backgroundColor: darkMode
                ? "rgba(255,255,255,0.08)"
                : "rgba(255,255,255,0.95)",
              borderTopColor: darkMode
                ? "rgba(255,255,255,0.1)"
                : "rgba(0,0,0,0.08)",
            },
          ]}
        >
          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: darkMode ? "rgba(255,255,255,0.1)" : "#F5F5F5",
                color: darkMode ? "#FFFFFF" : "#1a1a1a",
              },
            ]}
            placeholder="Ask AI for help..."
            placeholderTextColor={
              darkMode ? "rgba(255,255,255,0.4)" : "rgba(0,0,0,0.35)"
            }
            value={input}
            onChangeText={setInput}
            multiline
            onSubmitEditing={sendMessage}
            blurOnSubmit={false}
          />
          <TouchableOpacity
            style={[
              styles.sendBtn,
              {
                backgroundColor: theme.primary,
                opacity: !input.trim() || isLoading ? 0.5 : 1,
              },
            ]}
            onPress={sendMessage}
            disabled={!input.trim() || isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <MaterialIcons name="send" size={20} color="#FFFFFF" />
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
      <TutorialOverlay
        visible={showTutorial}
        steps={AI_STEPS}
        theme={theme}
        onDone={() => {
          setShowTutorial(false);
          markTutorialSeen("ai");
        }}
      />
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  flex: { flex: 1 },

  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 12,
    backgroundColor: "rgba(0,0,0,0.12)",
  },
  headerBtn: { padding: 8 },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: "700",
    textAlign: "center",
  },

  list: { flex: 1, paddingHorizontal: 16 },
  listContent: { paddingVertical: 16, flexGrow: 1 },

  messageContainer: { flexDirection: "row", marginVertical: 4 },
  userRow: { justifyContent: "flex-end" },
  aiRow: { justifyContent: "flex-start", alignItems: "flex-end" },

  aiAvatar: { marginRight: 8, marginBottom: 4 },

  bubble: {
    maxWidth: "78%",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 18,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  userBubble: { borderBottomRightRadius: 4 },
  aiBubble: { borderBottomLeftRadius: 4 },

  messageText: { fontSize: 15, lineHeight: 21 },
  timestamp: {
    fontSize: 11,
    marginTop: 4,
    textAlign: "right",
  },

  welcome: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 60,
    alignItems: "center",
    justifyContent: "center",
    padding: 40,
  },
  welcomeTitle: {
    fontSize: 24,
    fontWeight: "700",
    marginTop: 14,
    marginBottom: 6,
  },
  welcomeSub: { fontSize: 15, textAlign: "center" },

  inputBar: {
    flexDirection: "row",
    alignItems: "flex-end",
    padding: 12,
    borderTopWidth: 1,
  },
  input: {
    flex: 1,
    borderRadius: 22,
    paddingHorizontal: 18,
    paddingVertical: 10,
    marginRight: 10,
    fontSize: 15,
    maxHeight: 120,
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
});
