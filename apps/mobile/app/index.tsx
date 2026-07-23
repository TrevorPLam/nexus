/**
 * MODULE: Mobile Home Screen
 *
 * Responsibility:
 * Main landing screen for the mobile application. Provides navigation to the
 * Work and Calendar domains.
 *
 * Boundaries:
 * - High-level navigation only.
 * - No data fetching or business logic.
 *
 * Critical invariants:
 * - Must be accessible to authenticated users.
 *
 * Side effects:
 * - None.
 *
 * Change risk:
 * - Low. UI/Navigation only.
 *
 * Links:
 * - apps/mobile/app/work/index.tsx
 * - apps/mobile/app/calendar/index.tsx
 *
 * Tags:
 * - domain: mobile
 * - risk: low
 * - layer: presentation
 *
 * File:
 * - apps/mobile/app/index.tsx
 *
 * Last updated:
 * - July 23, 2026
 */

import { useRouter } from 'expo-router';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';

export default function HomeScreen() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Life OS</Text>
      <Text style={styles.subtitle}>Personal productivity system</Text>

      <View style={styles.buttonContainer}>
        <TouchableOpacity style={styles.button} onPress={() => router.push('/work')}>
          <Text style={styles.buttonText}>Work</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.button} onPress={() => router.push('/calendar')}>
          <Text style={styles.buttonText}>Calendar</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 40,
  },
  buttonContainer: {
    width: '100%',
    gap: 15,
  },
  button: {
    backgroundColor: '#007AFF',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});
