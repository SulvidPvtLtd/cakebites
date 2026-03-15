import React, {
  PropsWithChildren,
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from "react";
import { Animated, StyleSheet, Text, View } from "react-native";
import { useColorScheme } from "@components/useColorScheme";
import Colors from "@constants/Colors";

type ToastKind = "success" | "error" | "info";

type ToastPayload = {
  message: string;
  kind: ToastKind;
};

type ToastContextValue = {
  showToast: (message: string, kind?: ToastKind, durationMs?: number) => void;
};

const ToastContext = createContext<ToastContextValue | undefined>(undefined);
const DEFAULT_DURATION = 2400;

export default function ToastProvider({ children }: PropsWithChildren) {
  const [toast, setToast] = useState<ToastPayload | null>(null);
  const opacity = useRef(new Animated.Value(0)).current;
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = useCallback(
    (message: string, kind: ToastKind = "info", durationMs = DEFAULT_DURATION) => {
      if (!message) return;

      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }

      setToast({ message, kind });
      Animated.timing(opacity, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }).start();

      timeoutRef.current = setTimeout(() => {
        Animated.timing(opacity, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }).start(() => setToast(null));
      }, durationMs);
    },
    [opacity],
  );

  const value = useMemo(() => ({ showToast }), [showToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastHost toast={toast} opacity={opacity} />
    </ToastContext.Provider>
  );
}

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within ToastProvider");
  }
  return context;
};

type ToastHostProps = {
  toast: ToastPayload | null;
  opacity: Animated.Value;
};

const ToastHost = ({ toast, opacity }: ToastHostProps) => {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? "light"];

  if (!toast) return null;

  const backgroundColor =
    toast.kind === "success"
      ? theme.success
      : toast.kind === "error"
        ? theme.error
        : theme.tint;

  return (
    <View pointerEvents="none" style={styles.host}>
      <Animated.View style={[styles.toast, { backgroundColor, opacity }]}>
        <Text style={[styles.text, { color: theme.card }]}>{toast.message}</Text>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  host: {
    position: "absolute",
    left: 16,
    right: 16,
    top: 56,
    alignItems: "center",
    zIndex: 999,
  },
  toast: {
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    minWidth: "70%",
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 4,
  },
  text: {
    fontSize: 14,
    fontWeight: "600",
    textAlign: "center",
  },
});
