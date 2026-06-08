import React, { useEffect } from 'react';
import { Animated, TouchableOpacity, StyleSheet, ViewProps, Easing } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { RootStackParamList } from '../types/navigation';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useDecisions } from './DecisionContext';

type AIChatNavigationProp = NativeStackNavigationProp<RootStackParamList, 'AIChat'>;

interface Props extends ViewProps {}

export default function FloatingAIButton({ style, ...props }: Props) {
  const navigation = useNavigation<AIChatNavigationProp>();
  const { theme } = useDecisions();

  const scaleValue = React.useRef(new Animated.Value(1)).current;
  const pulseValue = React.useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const pulseAnim = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseValue, {
          toValue: 1.15,
          duration: 2000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseValue, {
          toValue: 1,
          duration: 2000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );
    pulseAnim.start();

    return () => pulseAnim.stop();
  }, [pulseValue]);

  const onPress = () => {
    Animated.sequence([
      Animated.timing(scaleValue, {
        toValue: 0.95,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(scaleValue, {
        toValue: 1,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start(() => {
      navigation.navigate('AIChat');
    });
  };

  return (
    <Animated.View
      style={[
        styles.container,
        {
          bottom: 24,
          right: 20,
          backgroundColor: theme.primary,
          shadowColor: theme.shadow,
          transform: [{ scale: pulseValue }],
        },
        style,
      ]}
      {...props}
    >
      <TouchableOpacity onPress={onPress} activeOpacity={0.8} style={styles.button}>
        <Animated.View style={{ transform: [{ scale: scaleValue }] }}>
          <MaterialIcons name="smart-toy" size={24} color={theme.background} />
        </Animated.View>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    zIndex: 1000,
  },
  button: {
    width: '100%',
    height: '100%',
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

