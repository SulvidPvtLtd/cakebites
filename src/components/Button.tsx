// Button.tsx
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  ActivityIndicator,
  useColorScheme,
  Platform,
} from 'react-native';
import { forwardRef } from 'react';
import Colors from '@constants/Colors';

type ButtonProps = {
  text: string;
  loading?: boolean;
} & React.ComponentPropsWithoutRef<typeof Pressable>;

const Button = forwardRef<View | null, ButtonProps>(
  ({ text, loading = false, disabled, ...pressableProps }, ref) => {
    const colorScheme = useColorScheme() ?? 'light';
    const theme = Colors[colorScheme];

    const isDisabled = disabled || loading;

    return (
      <Pressable
        ref={ref}
        {...pressableProps}
        disabled={isDisabled}
        accessibilityRole="button"
        accessibilityState={{ disabled: isDisabled }}
        style={({ pressed }) => [
          styles.container,
          {
            backgroundColor: isDisabled
              ? theme.placeholder
              : theme.tint,
            opacity: pressed && !isDisabled ? 0.85 : 1,
            pointerEvents: isDisabled ? 'none' : 'auto',
          },
        ]}
      >
        {loading ? (
          <ActivityIndicator color={theme.textPrimary} />
        ) : (
          <Text style={[styles.text, { color: theme.textPrimary }]}>
            {text}
          </Text>
        )}
      </Pressable>
    );
  }
);

const styles = StyleSheet.create({
  container: {
    paddingVertical: 14,
    paddingHorizontal: 24,
    alignItems: 'center',
    borderRadius: 999,
    marginVertical: 10,

    ...(Platform.OS === 'web'
      ? {
          boxShadow: '0px 4px 12px rgba(0,0,0,0.15)',
        }
      : {
          elevation: 3,
        }),
  },
  text: {
    fontSize: 16,
    fontWeight: '600',
  },
});

export default Button;
