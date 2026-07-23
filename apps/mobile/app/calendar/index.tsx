import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  FlatList,
} from 'react-native';
import { usePowerSync, useQuery } from '@powersync/react';
import { db } from '../../powersync';

interface Calendar {
  id: string;
  name: string;
  description: string | null;
  color: string;
  is_default: boolean;
}

interface Event {
  id: string;
  title: string;
  start: string;
  end: string;
  is_all_day: boolean;
  calendar_id: string;
}

export default function CalendarScreen() {
  const [view, setView] = useState<'calendars' | 'events' | 'scheduling'>('calendars');
  const [selectedCalendar, setSelectedCalendar] = useState<Calendar | null>(null);
  const powersync = usePowerSync();

  // Query calendars from PowerSync
  const { data: calendars, isLoading: calendarsLoading } = useQuery(
    db.selectFrom('calendars').selectAll(),
  );

  // Query events from PowerSync
  const { data: events, isLoading: eventsLoading } = useQuery(db.selectFrom('events').selectAll());

  const handleCalendarPress = (calendar: Calendar) => {
    setSelectedCalendar(calendar);
    setView('events');
  };

  const renderCalendarItem = ({ item }: { item: Calendar }) => (
    <TouchableOpacity style={styles.item} onPress={() => handleCalendarPress(item)}>
      <View style={[styles.colorDot, { backgroundColor: item.color }]} />
      <View style={styles.itemContent}>
        <Text style={styles.itemTitle}>{item.name}</Text>
        {item.description && <Text style={styles.itemDescription}>{item.description}</Text>}
      </View>
    </TouchableOpacity>
  );

  const renderEventItem = ({ item }: { item: Event }) => {
    const startDate = new Date(item.start);
    const endDate = new Date(item.end);
    const timeStr = item.is_all_day
      ? 'All day'
      : `${startDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - ${endDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;

    return (
      <View style={styles.item}>
        <View style={styles.itemContent}>
          <Text style={styles.itemTitle}>{item.title}</Text>
          <Text style={styles.itemDescription}>{timeStr}</Text>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Calendar</Text>
        <View style={styles.viewToggle}>
          <TouchableOpacity
            style={[styles.toggleButton, view === 'calendars' && styles.toggleButtonActive]}
            onPress={() => setView('calendars')}
          >
            <Text
              style={[
                styles.toggleButtonText,
                view === 'calendars' && styles.toggleButtonTextActive,
              ]}
            >
              Calendars
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.toggleButton, view === 'events' && styles.toggleButtonActive]}
            onPress={() => setView('events')}
          >
            <Text
              style={[styles.toggleButtonText, view === 'events' && styles.toggleButtonTextActive]}
            >
              Events
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.toggleButton, view === 'scheduling' && styles.toggleButtonActive]}
            onPress={() => setView('scheduling')}
          >
            <Text
              style={[
                styles.toggleButtonText,
                view === 'scheduling' && styles.toggleButtonTextActive,
              ]}
            >
              Scheduling
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.content}>
        {view === 'calendars' && (
          <View style={styles.section}>
            {calendarsLoading ? (
              <ActivityIndicator style={styles.loader} />
            ) : calendars && calendars.length > 0 ? (
              <FlatList
                data={calendars}
                renderItem={renderCalendarItem}
                keyExtractor={(item) => item.id}
                scrollEnabled={false}
              />
            ) : (
              <View style={styles.emptyState}>
                <Text style={styles.emptyText}>No calendars yet</Text>
                <TouchableOpacity style={styles.button}>
                  <Text style={styles.buttonText}>Create Calendar</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}

        {view === 'events' && (
          <View style={styles.section}>
            {selectedCalendar && (
              <View style={styles.selectedCalendar}>
                <Text style={styles.selectedCalendarTitle}>{selectedCalendar.name}</Text>
                <TouchableOpacity onPress={() => setSelectedCalendar(null)}>
                  <Text style={styles.clearSelection}>Clear</Text>
                </TouchableOpacity>
              </View>
            )}
            {eventsLoading ? (
              <ActivityIndicator style={styles.loader} />
            ) : events && events.length > 0 ? (
              <FlatList
                data={
                  selectedCalendar
                    ? events.filter((e) => e.calendar_id === selectedCalendar.id)
                    : events
                }
                renderItem={renderEventItem}
                keyExtractor={(item) => item.id}
                scrollEnabled={false}
              />
            ) : (
              <View style={styles.emptyState}>
                <Text style={styles.emptyText}>No events scheduled</Text>
                <TouchableOpacity style={styles.button}>
                  <Text style={styles.buttonText}>Create Event</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}

        {view === 'scheduling' && (
          <View style={styles.section}>
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>Scheduling links coming soon</Text>
              <Text style={styles.emptyDescription}>
                Create booking links for others to schedule time with you
              </Text>
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  viewToggle: {
    flexDirection: 'row',
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
    padding: 4,
  },
  toggleButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    alignItems: 'center',
  },
  toggleButtonActive: {
    backgroundColor: '#3b82f6',
  },
  toggleButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6b7280',
  },
  toggleButtonTextActive: {
    color: '#fff',
  },
  content: {
    flex: 1,
  },
  section: {
    padding: 20,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  colorDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 12,
  },
  itemContent: {
    flex: 1,
  },
  itemTitle: {
    fontSize: 16,
    fontWeight: '500',
  },
  itemDescription: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 2,
  },
  selectedCalendar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
    marginBottom: 16,
  },
  selectedCalendarTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  clearSelection: {
    fontSize: 14,
    color: '#3b82f6',
  },
  loader: {
    padding: 20,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 16,
    color: '#6b7280',
    marginBottom: 16,
  },
  emptyDescription: {
    fontSize: 14,
    color: '#9ca3af',
    textAlign: 'center',
    marginBottom: 16,
  },
  button: {
    backgroundColor: '#3b82f6',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
