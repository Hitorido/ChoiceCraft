import React from "react";
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  GestureResponderEvent,
  Platform,
  View,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useDecisions } from "./DecisionContext";

interface Props {
  title: string;
  onPress: (event: GestureResponderEvent) => void;
  disabled?: boolean;
  iconName?: React.ComponentProps<typeof MaterialIcons>["name"];
}

export default function CustomButton({
  title,
  onPress,
  disabled,
  iconName,
}: Props) {
  const { theme } = useDecisions();
  const boolDisabled = !!disabled;

  return (
    <TouchableOpacity
      style={[
        styles.button,
        { backgroundColor: boolDisabled ? theme.disabled : theme.primary },
      ]}
      onPress={onPress}
      disabled={boolDisabled}
      activeOpacity={0.7}
    >
      <View style={styles.content}>
        {iconName && (
          <MaterialIcons
            name={iconName}
            size={18}
            color={theme.background}
            style={styles.icon}
          />
        )}
        <Text style={[styles.text, { color: theme.background }]}>{title}</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 6,
    alignItems: "center",
    marginVertical: 8,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOpacity: 0.2,
        shadowRadius: 3,
        shadowOffset: { width: 0, height: 2 },
      },
      android: { elevation: 3 },
    }),
  },
  content: {
    flexDirection: "row",
    alignItems: "center",
  },
  icon: {
    marginRight: 8,
  },
  text: {
    fontSize: 16,
    fontWeight: "bold",
  },
});
