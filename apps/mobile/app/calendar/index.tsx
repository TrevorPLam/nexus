import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';

export default function CalendarScreen() {
  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView}>
        <Text style={styles.sectionTitle}>Calendars</Text>
        <View style={styles.card}>
          <Text style={styles.cardText}>
            No calendars yet. Create your first calendar to get started.
          </Text>
          <TouchableOpacity style={styles.cardButton}>
            <Text style={styles.cardButtonText}>Create Calendar</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.sectionTitle}>Events</Text>
        <View style={styles.card}>
          <Text style={styles.cardText}>
            No events scheduled. Create an event to add it to your calendar.
          </Text>
          <TouchableOpacity style={styles.cardButton}>
            <Text style={styles.cardButtonText}>Create Event</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollView: {
    flex: 1,
    padding: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 20,
    marginBottom: 10,
  },
  card: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 8,
    marginBottom: 20,
  },
  cardText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 15,
  },
  cardButton: {
    backgroundColor: '#007AFF',
    padding: 12,
    borderRadius: 6,
    alignItems: 'center',
  },
  cardButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
});
