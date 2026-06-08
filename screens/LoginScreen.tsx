import { useState, useRef, useEffect } from "react";
import { Switch, Alert, ScrollView } from "react-native";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
  Image,
  Animated,
  TouchableOpacity,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { useDecisions } from "../components/DecisionContext";
import { MaterialIcons } from "@expo/vector-icons";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "../types/navigation";
import CustomButton from "../components/CustomButton";

type Props = NativeStackScreenProps<RootStackParamList, "Login">;

export default function LoginScreen({ navigation }: Props) {
  const [rememberMe, setRememberMe] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [email, setEmail] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);

  const { login, signUp, darkMode, theme } = useDecisions();
  const insets = useSafeAreaInsets();

  const handleSubmit = async () => {
    if (!username.trim() || !password.trim()) {
      Alert.alert("Missing fields", "Please enter your username and password.");
      return;
    }

    if (isSignUp) {
      if (!email.trim() || !email.includes("@")) {
        Alert.alert("Invalid email", "Please enter a valid email address.");
        return;
      }
      if (password !== confirmPassword) {
        Alert.alert("Password mismatch", "Passwords do not match.");
        return;
      }
      if (password.length < 6) {
        Alert.alert("Weak password", "Password must be at least 6 characters.");
        return;
      }
    }

    setLoading(true);
    try {
      if (isSignUp) {
        await signUp(username.trim(), password, email.trim());
        navigation.replace("Main");
      } else {
        await login(username.trim(), password);
        navigation.replace("Main");
      }
    } catch (err: any) {
      const msg: string = err?.message ?? "Something went wrong. Please try again.";
      // Email confirmation required — show as info, not error
      if (msg.toLowerCase().includes("confirm your account")) {
        Alert.alert("Check your email", msg);
        setIsSignUp(false);
        setPassword("");
        setConfirmPassword("");
        setEmail("");
      } else {
        Alert.alert(isSignUp ? "Sign Up Failed" : "Login Failed", msg);
      }
    } finally {
      setLoading(false);
    }
  };

  const cardOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(cardOpacity, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();
  }, []);

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <StatusBar
        barStyle={darkMode ? "light-content" : "dark-content"}
        backgroundColor={theme.background}
      />
      <LinearGradient
        colors={[theme.gradientStart, theme.gradientEnd]}
        style={StyleSheet.absoluteFill}
      />

      <ScrollView
        contentContainerStyle={[
          styles.container,
          { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24 },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.logoContainer}>
          <Image
            source={require("../assets/logo.png")}
            style={styles.logo}
            resizeMode="cover"
          />
        </View>

        <Animated.View
          style={[
            styles.card,
            {
              opacity: cardOpacity,
              backgroundColor: theme.card,
              shadowColor: theme.shadow,
            },
          ]}
        >
          <Text style={[styles.title, { color: theme.primary }]}>
            {isSignUp ? "Create Account" : "Welcome to ChoiceCraft"}
          </Text>

          <TextInput
            style={[styles.input, { backgroundColor: theme.surface, borderColor: theme.border, color: theme.text }]}
            placeholder="Enter your username"
            value={username}
            onChangeText={setUsername}
            autoCapitalize="none"
            placeholderTextColor={theme.placeholder}
          />

          {isSignUp && (
            <TextInput
              style={[styles.input, { backgroundColor: theme.surface, borderColor: theme.border, color: theme.text }]}
              placeholder="Enter your email"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              placeholderTextColor={theme.placeholder}
            />
          )}

          <View style={[styles.inputWrapper, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <TextInput
              style={[styles.inputInner, { color: theme.text }]}
              placeholder="Enter your password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              placeholderTextColor={theme.placeholder}
            />
            <TouchableOpacity style={styles.eyeBtn} onPress={() => setShowPassword(v => !v)}>
              <MaterialIcons name={showPassword ? "visibility" : "visibility-off"} size={22} color={theme.placeholder} />
            </TouchableOpacity>
          </View>

          {isSignUp && (
            <View style={[styles.inputWrapper, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              <TextInput
                style={[styles.inputInner, { color: theme.text }]}
                placeholder="Confirm your password"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry={!showConfirmPassword}
                placeholderTextColor={theme.placeholder}
              />
              <TouchableOpacity style={styles.eyeBtn} onPress={() => setShowConfirmPassword(v => !v)}>
                <MaterialIcons name={showConfirmPassword ? "visibility" : "visibility-off"} size={22} color={theme.placeholder} />
              </TouchableOpacity>
            </View>
          )}

          {!isSignUp && (
            <View style={styles.row}>
              <View style={styles.rememberContainer}>
                <Switch value={rememberMe} onValueChange={setRememberMe} />
                <Text style={[styles.rememberText, { color: theme.text }]}>Remember Me</Text>
              </View>
              <TouchableOpacity>
                <Text style={[styles.forgotText, { color: theme.primary }]}>Forgot Password?</Text>
              </TouchableOpacity>
            </View>
          )}

          <CustomButton
            title={loading ? (isSignUp ? "Creating…" : "Logging in…") : (isSignUp ? "Sign Up" : "Login")}
            onPress={handleSubmit}
            disabled={loading}
          />

          <View style={styles.registerContainer}>
            <Text style={[styles.registerText, { color: theme.text }]}>
              {isSignUp ? "Already have an account? " : "Don't have an account? "}
            </Text>
            <TouchableOpacity onPress={() => { setIsSignUp(!isSignUp); setConfirmPassword(""); setEmail(""); }}>
              <Text style={[styles.registerLink, { color: theme.primary }]}>
                {isSignUp ? "Login" : "Sign Up"}
              </Text>
            </TouchableOpacity>
          </View>

          <Text style={[styles.orText, { color: theme.placeholder }]}>OR</Text>

          <TouchableOpacity
            style={[styles.googleButton, { backgroundColor: theme.surface, borderColor: theme.border }]}
          >
            <Image source={require("../assets/google.png")} style={styles.googleIcon} resizeMode="contain" />
            <Text style={[styles.googleText, { color: theme.text }]}>Continue with Google</Text>
          </TouchableOpacity>
        </Animated.View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    justifyContent: "center",
    padding: 16,
  },
  card: {
    padding: 20,
    borderRadius: 12,
    shadowOpacity: 0.15,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
    elevation: 4,
    width: "100%",
  },
  title: {
    fontSize: 22,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 24,
  },
  input: {
    borderWidth: 1,
    padding: 12,
    borderRadius: 8,
    marginBottom: 14,
    fontSize: 15,
  },
  logoContainer: {
    alignItems: "center",
    marginBottom: 20,
  },
  logo: {
    width: 140,
    height: 140,
    borderRadius: 70,
  },
  orText: {
    textAlign: "center",
    marginVertical: 14,
    fontWeight: "600",
  },
  googleButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    padding: 12,
    borderRadius: 8,
  },
  googleIcon: {
    width: 22,
    height: 22,
    marginRight: 10,
  },
  googleText: {
    fontSize: 15,
    fontWeight: "600",
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },
  rememberContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  rememberText: {
    marginLeft: 8,
  },
  forgotText: {
    fontWeight: "600",
  },
  registerContainer: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 14,
    marginBottom: 4,
  },
  registerText: {},
  registerLink: {
    fontWeight: "bold",
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 8,
    marginBottom: 14,
    overflow: "hidden",
  },
  inputInner: {
    flex: 1,
    padding: 12,
    fontSize: 15,
  },
  eyeBtn: {
    paddingHorizontal: 12,
    paddingVertical: 12,
    justifyContent: "center",
    alignItems: "center",
  },
});
