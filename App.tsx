import { NavigationContainer } from "@react-navigation/native";
import { StatusBar } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import AppNavigator from "./navigation/AppNavigator";
import { DecisionProvider, useDecisions } from "./components/DecisionContext";

function AppContent() {
  const { darkMode, theme } = useDecisions(); // ✅ safe, inside provider
  return (
    <>
      <StatusBar
        backgroundColor={theme.background}
        barStyle={darkMode ? "light-content" : "dark-content"}
      />
      <NavigationContainer>
        <AppNavigator />
      </NavigationContainer>
    </>
  );
}

export default function App() {
  return (
    <DecisionProvider>
      <SafeAreaProvider>
        <AppContent />
      </SafeAreaProvider>
    </DecisionProvider>
  );
}