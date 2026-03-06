import Colors from "@/src/constants/Colors";
import { FontAwesome } from "@expo/vector-icons";
import { Link, Stack } from "expo-router";
import { Pressable, useColorScheme } from "react-native";

export default function MenuStack(){
    const scheme = useColorScheme() ?? "light";
    const theme = Colors[scheme];
    return (
        <Stack screenOptions={{
            headerRight: () => (
                        <Link href="/cart" asChild>
                          <Pressable>
                            {({ pressed }) => (
                              <FontAwesome
                                name="shopping-cart"
                                size={25}
                                color={theme.tint}
                                style={{ marginRight: 15, opacity: pressed ? 0.5 : 1 }}
                              />
                            )}
                          </Pressable>
                        </Link>
                      ),
        }}>
            <Stack.Screen  name="index" options={{ title:'Menu'}}/>
        </Stack>
    );
}
