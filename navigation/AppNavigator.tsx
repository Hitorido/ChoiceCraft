import React, { useRef, useEffect, useState } from "react";
import {
  Animated,
  Pressable,
  View,
  StyleSheet,
  Dimensions,
} from "react-native";
import Svg, { Path } from "react-native-svg";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator, BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { LinearGradient } from "expo-linear-gradient";
import { MaterialIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { RootStackParamList, BottomTabParamList } from "../types/navigation";
import { useDecisions } from "../components/DecisionContext";

import SplashScreen from "../screens/SplashScreen";
import LoginScreen from "../screens/LoginScreen";
import DashboardScreen from "../screens/DashboardScreen";
import DecisionListScreen from "../screens/DecisionListScreen";
import ProfileScreen from "../screens/ProfileScreen";
import AIScreen from "../screens/AIScreen";
import FloatingAIButton from "../components/FloatingAIButton";

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab   = createBottomTabNavigator<BottomTabParamList>();

const W            = Dimensions.get("window").width;
const BUBBLE_SIZE  = 52;
const BUBBLE_R     = BUBBLE_SIZE / 2;          // 26
const LIFT         = BUBBLE_R;                  // 26 — space above bar for bubble top
const BAR_H        = 60;                        // bar visual height below flat line
const CONTAINER_H  = BAR_H + LIFT;             // 86 total
const NOTCH_HW     = BUBBLE_R + 6;             // 32 — half-width of notch
const NOTCH_DEPTH  = BUBBLE_R + 2;             // 28 — depth of notch below flat line
const SPREAD       = 22;                        // bezier transition width
const DOT_SIZE     = 6;
const CX           = W / 2;

const TAB_CONFIG: Record<keyof BottomTabParamList, {
  icon: React.ComponentProps<typeof MaterialIcons>["name"];
}> = {
  DecisionList: { icon: "list"   },
  Dashboard:    { icon: "home"   },
  Profile:      { icon: "person" },
};

const CENTER_INDEX = 1; // Dashboard is in the middle

// ─── Notch background SVG ─────────────────────────────────────────────────────
// Flat level is at y=LIFT. Notch dips from LIFT to LIFT+NOTCH_DEPTH at center.

function NotchBackground({ color, totalHeight }: { color: string; totalHeight: number }) {
  const L = LIFT;
  const cx = CX;

  const d = [
    `M 0 ${L}`,
    `L ${cx - NOTCH_HW - SPREAD} ${L}`,
    `C ${cx - NOTCH_HW - SPREAD * 0.2} ${L}  ${cx - NOTCH_HW} ${L + NOTCH_DEPTH * 0.55}  ${cx - NOTCH_HW} ${L + NOTCH_DEPTH}`,
    `Q ${cx} ${L + NOTCH_DEPTH + NOTCH_HW * 0.35}  ${cx + NOTCH_HW} ${L + NOTCH_DEPTH}`,
    `C ${cx + NOTCH_HW} ${L + NOTCH_DEPTH * 0.55}  ${cx + NOTCH_HW + SPREAD * 0.2} ${L}  ${cx + NOTCH_HW + SPREAD} ${L}`,
    `L ${W} ${L}`,
    `L ${W} ${totalHeight}`,
    `L 0 ${totalHeight}`,
    `Z`,
  ].join(" ");

  return (
    <Svg width={W} height={totalHeight} style={StyleSheet.absoluteFill}>
      <Path d={d} fill={color} />
    </Svg>
  );
}

// ─── Custom Tab Bar ───────────────────────────────────────────────────────────

function CustomTabBar({ state, navigation }: BottomTabBarProps) {
  const { theme, darkMode } = useDecisions();
  const insets              = useSafeAreaInsets();

  const activeColor     = darkMode ? "#FFFFFF" : "#6A0DAD";
  const inactiveColor   = theme.placeholder;
  const bubbleBg        = darkMode ? "#FFFFFF" : "#6A0DAD";
  const bubbleIconColor = darkMode ? "#1a1a2e" : "#FFFFFF";

  // Dot position for side tabs
  const tabCenters   = useRef<number[]>([]);
  const [layoutReady, setLayoutReady] = useState(false);
  const dotX         = useRef(new Animated.Value(0)).current;

  // Per-tab scale
  const scales = useRef(
    Array.from({ length: 3 }, (_, i) => new Animated.Value(i === state.index ? 1.15 : 1))
  ).current;

  // Bubble scale (pulses slightly when active)
  const bubbleScale = useRef(
    new Animated.Value(state.index === CENTER_INDEX ? 1.06 : 1)
  ).current;

  const animateTo = (index: number) => {
    const cx = tabCenters.current[index];
    if (cx !== undefined) {
      Animated.spring(dotX, {
        toValue: cx - DOT_SIZE / 2,
        useNativeDriver: true,
        speed: 20,
        bounciness: 8,
      }).start();
    }

    // Icon scales
    scales.forEach((s, i) => {
      Animated.spring(s, {
        toValue: i === index ? 1.15 : 1,
        useNativeDriver: true,
        speed: 22,
        bounciness: 5,
      }).start();
    });

    // Bubble pulse
    Animated.spring(bubbleScale, {
      toValue: index === CENTER_INDEX ? 1.06 : 1,
      useNativeDriver: true,
      speed: 18,
      bounciness: 8,
    }).start();
  };

  useEffect(() => {
    if (layoutReady) animateTo(state.index);
  }, [state.index, layoutReady]);

  const handleLayout = (index: number, x: number, w: number) => {
    tabCenters.current[index] = x + w / 2;
    if (tabCenters.current.filter((v) => v !== undefined).length === 3) {
      const cx = tabCenters.current[state.index];
      if (cx !== undefined) dotX.setValue(cx - DOT_SIZE / 2);
      setLayoutReady(true);
    }
  };

  const totalHeight = CONTAINER_H + insets.bottom;

  return (
    <View
      style={{
        height: totalHeight,
        overflow: "visible",
        backgroundColor: "transparent",
      }}
    >
      {/* Notch SVG — solid card color, sits on top of screen gradient */}
      <NotchBackground color={theme.card} totalHeight={totalHeight} />

      {/* Tab buttons row */}
      <View
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          top: LIFT,
          height: BAR_H,
          flexDirection: "row",
        }}
      >
        {state.routes.map((route, index) => {
          const isFocused = state.index === index;
          const isCenter  = index === CENTER_INDEX;
          const { icon }  = TAB_CONFIG[route.name as keyof BottomTabParamList] ?? { icon: "circle" };

          const onPress = () => {
            const event = navigation.emit({ type: "tabPress", target: route.key, canPreventDefault: true });
            if (!isFocused && !event.defaultPrevented) navigation.navigate(route.name);
          };

          if (isCenter) {
            return (
              <View
                key={route.key}
                style={{ flex: 1, alignItems: "center", justifyContent: "flex-start" }}
                onLayout={(e) => {
                  const { x, width } = e.nativeEvent.layout;
                  handleLayout(index, x, width);
                }}
              >
                {/* Bubble sits above bar flat line by LIFT px */}
                <Pressable
                  onPress={onPress}
                  android_ripple={null}
                  style={{ marginTop: -LIFT }}
                >
                  <Animated.View
                    style={{
                      width: BUBBLE_SIZE,
                      height: BUBBLE_SIZE,
                      borderRadius: BUBBLE_R,
                      backgroundColor: bubbleBg,
                      alignItems: "center",
                      justifyContent: "center",
                      transform: [{ scale: bubbleScale }],
                      elevation: 8,
                      shadowColor: bubbleBg,
                      shadowOffset: { width: 0, height: 4 },
                      shadowOpacity: 0.4,
                      shadowRadius: 8,
                    }}
                  >
                    <MaterialIcons name={icon} size={26} color={bubbleIconColor} />
                  </Animated.View>
                </Pressable>
              </View>
            );
          }

          return (
            <Pressable
              key={route.key}
              onPress={onPress}
              android_ripple={null}
              onLayout={(e) => {
                const { x, width } = e.nativeEvent.layout;
                handleLayout(index, x, width);
              }}
              style={{ flex: 1, alignItems: "center", justifyContent: "center" }}
            >
              <Animated.View style={{ transform: [{ scale: scales[index] }] }}>
                <MaterialIcons
                  name={icon}
                  size={24}
                  color={isFocused ? activeColor : inactiveColor}
                />
              </Animated.View>
            </Pressable>
          );
        })}
      </View>

      {/* Sliding dot for side tabs */}
      {layoutReady && (
        <Animated.View
          style={{
            position: "absolute",
            bottom: insets.bottom + 8,
            width: DOT_SIZE,
            height: DOT_SIZE,
            borderRadius: DOT_SIZE / 2,
            backgroundColor: activeColor,
            transform: [{ translateX: dotX }],
          }}
        />
      )}
    </View>
  );
}

// ─── MainTabs ─────────────────────────────────────────────────────────────────

function MainTabs() {
  return (
    <Tab.Navigator
      id="main"
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{
        headerShown: false,
        sceneStyle: { backgroundColor: "transparent" },
      }}
    >
      <Tab.Screen name="DecisionList" component={DecisionListScreen} />
      <Tab.Screen name="Dashboard"    component={DashboardScreen} />
      <Tab.Screen name="Profile"      component={ProfileScreen} />
    </Tab.Navigator>
  );
}

// ─── MainTabsWithAI ───────────────────────────────────────────────────────────

function MainTabsWithAI() {
  const insets    = useSafeAreaInsets();
  const { theme } = useDecisions();
  return (
    <View style={{ flex: 1, backgroundColor: theme.gradientEnd }}>
      <MainTabs />
      <FloatingAIButton
        style={{ position: "absolute", bottom: insets.bottom + CONTAINER_H + 12, right: 20 }}
      />
    </View>
  );
}

// ─── AppNavigator ─────────────────────────────────────────────────────────────

export default function AppNavigator() {
  return (
    <Stack.Navigator id="root" screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Splash" component={SplashScreen} />
      <Stack.Screen name="Login"  component={LoginScreen} />
      <Stack.Screen name="Main"   component={MainTabsWithAI} />
      <Stack.Screen
        name="AIChat"
        component={AIScreen}
        options={{ presentation: "modal" }}
      />
    </Stack.Navigator>
  );
}