import { Stack} from "expo-router";


export default function OrderStack() {
  return (
    <Stack>
      <Stack.Screen name="list" options={{ headerShown: false }} />
      <Stack.Screen
        name="[id]/refund"
        options={{ presentation: "modal", title: "Refund Payment" }}
      />
    </Stack>
  );
}
