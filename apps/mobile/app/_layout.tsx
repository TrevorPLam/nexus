import { Stack } from 'expo-router';

export default function RootLayout() {
  return (
    <Stack screenOptions={{ headerShown: true }}>
      <Stack.Screen name="index" options={{ title: 'Life OS' }} />
      <Stack.Screen name="work/index" options={{ title: 'Work' }} />
      <Stack.Screen name="calendar/index" options={{ title: 'Calendar' }} />
    </Stack>
  );
}
