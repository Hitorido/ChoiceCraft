import { useEffect, useRef } from "react";
import { Text, StyleSheet, ActivityIndicator, StatusBar, Image, Animated } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useDecisions } from "../components/DecisionContext";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "../types/navigation";

type Props = NativeStackScreenProps<RootStackParamList, "Splash">;

export default function SplashScreen({ navigation }: Props) {
  const { theme } = useDecisions();
  const insets = useSafeAreaInsets();
  // animation refs
  const logoScale = useRef(new Animated.Value(0)).current;
  const textOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // kick off logo and text animations, then navigate after delay
    Animated.sequence([
      Animated.spring(logoScale, { toValue: 1, useNativeDriver: true, friction: 4 }),
      Animated.timing(textOpacity, { toValue: 1, duration: 500, useNativeDriver: true }),
    ]).start();

    const timer = setTimeout(() => {
      navigation.replace("Login");
    }, 2500);

    return () => clearTimeout(timer);
  }, []);

  return (
    <LinearGradient
      colors={[theme.gradientStart, theme.gradientEnd]}
      style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}
    >
      <StatusBar barStyle="light-content" backgroundColor={theme.gradientStart} />
      <Animated.Image
        source={require("../assets/logo.png")}
        style={[
          styles.logo,
          { transform: [{ scale: logoScale }] },
        ]}
        resizeMode="cover"
      />
      <Animated.Text style={[styles.title, { opacity: textOpacity, color: theme.primary }]}>ChoiceCraft</Animated.Text>
      <Animated.Text style={[styles.slogan, { opacity: textOpacity, color: theme.text }]}>Turn Choices Into Clear Decisions.</Animated.Text>
      <ActivityIndicator size="large" color={theme.primary} style={styles.spinner} />
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
  },
  title: {
    fontSize: 32,
    fontWeight: "bold",
    color: "white",
    marginBottom: 8,
  },
  slogan: {
    fontSize: 16,
    color: "white",
    marginBottom: 20,
  },
  logo: {
    width: 200,
    height: 200,
    marginBottom: 20,
    borderRadius: 100,
  },
  spinner: {
    marginTop: 10,
  },
});