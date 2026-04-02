import Colors from "@/src/constants/Colors";
import { FontAwesome } from "@expo/vector-icons";
import { Link, Stack } from "expo-router";
import { Pressable, View, useColorScheme } from "react-native";

export default function MenuStack() {
  const scheme = useColorScheme() ?? "light";
  const theme = Colors[scheme];
  return (
    <Stack>
      <Stack.Screen
        name="index"
        options={{
          title: "Menu",
          headerRight: () => (
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <Link href="/(admin)/delivery-settings" asChild>
                <Pressable hitSlop={8}>
                  {({ pressed }) => (
                    <FontAwesome
                      name="truck"
                      size={21}
                      color={theme.tint}
                      style={{ opacity: pressed ? 0.5 : 1, marginRight: 14 }}
                    />
                  )}
                </Pressable>
              </Link>
              <Link href="/(admin)/menu/create" asChild>
                <Pressable>
                  {({ pressed }) => (
                    <FontAwesome
                      name="plus-square-o"
                      size={25}
                      color={theme.tint}
                      style={{ marginRight: 15, opacity: pressed ? 0.5 : 1 }}
                    />
                  )}
                </Pressable>
              </Link>
            </View>
          ),
        }}
      />
    </Stack>
  );
}
