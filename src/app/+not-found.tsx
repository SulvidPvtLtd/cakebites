import { Link, Stack } from 'expo-router';
import { StyleSheet, useColorScheme } from "react-native";
import Colors from "@/src/constants/Colors";

import { Text, View } from '@components/Themed';

export default function NotFoundScreen() {
  const scheme = useColorScheme() ?? "light";
  const theme = Colors[scheme];
  return (
    <>
      <Stack.Screen options={{ title: 'Oops!' }} />
      <View style={styles.container}>
        <Text style={[styles.title, { color: theme.textPrimary }]}>
          This screen doesn't exist.
        </Text>

        <Link href="/" style={styles.link}>
          <Text style={[styles.linkText, { color: theme.tint }]}>Go to home screen!</Text>
        </Link>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  link: {
    marginTop: 15,
    paddingVertical: 15,
  },
  linkText: {
    fontSize: 14,
  },
});
