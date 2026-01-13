import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Theme } from '../../constants/Colors';
import { Shadows } from '../../constants/Shadows';

interface TimelineEvent {
  id: string;
  date: string; // DD/MM/YYYY
  title: string;
  type: 'past' | 'upcoming';
  petName: string;
}

interface VaccineTimelineProps {
  events: TimelineEvent[];
  title?: string;
}

export default function VaccineTimeline({ events, title = 'Timeline de Vacinas' }: VaccineTimelineProps) {
  // Ordenar eventos por data
  const sortedEvents = [...events].sort((a, b) => {
    const [dayA, monthA, yearA] = a.date.split('/').map(Number);
    const [dayB, monthB, yearB] = b.date.split('/').map(Number);
    const dateA = new Date(yearA, monthA - 1, dayA);
    const dateB = new Date(yearB, monthB - 1, dayB);
    return dateB.getTime() - dateA.getTime();
  });

  const hasEvents = sortedEvents.length > 0;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
      {hasEvents ? (
        <ScrollView style={styles.timelineContainer} showsVerticalScrollIndicator={false}>
          {sortedEvents.map((event, index) => (
            <View key={event.id} style={styles.eventContainer}>
              <View style={styles.timelineLineContainer}>
                <View 
                  style={[
                    styles.timelineDot, 
                    { backgroundColor: event.type === 'upcoming' ? Theme.primary : Theme.success }
                  ]} 
                />
                {index < sortedEvents.length - 1 && <View style={styles.timelineLine} />}
              </View>
              <View style={[styles.eventCard, event.type === 'upcoming' && styles.eventCardUpcoming]}>
                <View style={styles.eventHeader}>
                  <Ionicons 
                    name={event.type === 'upcoming' ? 'time-outline' : 'checkmark-circle'} 
                    size={20} 
                    color={event.type === 'upcoming' ? Theme.primary : Theme.success} 
                  />
                  <Text style={styles.eventDate}>{event.date}</Text>
                </View>
                <Text style={styles.eventTitle}>{event.title}</Text>
                <Text style={styles.eventPet}>{event.petName}</Text>
              </View>
            </View>
          ))}
        </ScrollView>
      ) : (
        <View style={styles.emptyContainer}>
          <Ionicons name="calendar-outline" size={48} color={Theme.text.light} />
          <Text style={styles.emptyText}>Nenhuma vacina registrada</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    ...Shadows.medium,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Theme.text.primary,
    marginBottom: 16,
  },
  timelineContainer: {
    maxHeight: 400,
  },
  eventContainer: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  timelineLineContainer: {
    width: 40,
    alignItems: 'center',
  },
  timelineDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginTop: 8,
  },
  timelineLine: {
    width: 2,
    flex: 1,
    backgroundColor: Theme.border,
    marginTop: 4,
  },
  eventCard: {
    flex: 1,
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
    padding: 12,
    marginLeft: 12,
  },
  eventCardUpcoming: {
    borderLeftWidth: 3,
    borderLeftColor: Theme.primary,
  },
  eventHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  eventDate: {
    fontSize: 12,
    color: Theme.text.light,
    marginLeft: 6,
  },
  eventTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Theme.text.primary,
    marginBottom: 2,
  },
  eventPet: {
    fontSize: 12,
    color: Theme.text.light,
  },
  emptyContainer: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: Theme.text.light,
    marginTop: 8,
  },
});
