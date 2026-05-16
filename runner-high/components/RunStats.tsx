import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { formatDuration, formatDistance, formatPace } from '../utils/formatters';
import { COLORS } from '../constants/colors';

interface Props {
  duration: number;     // seconds
  distance: number;     // meters
  pace: number;         // seconds/km
  averageSpeed: number; // km/h
}

export function RunStats({ duration, distance, pace, averageSpeed }: Props) {
  return (
    <View style={styles.container}>
      <View style={styles.primary}>
        <Text style={styles.distanceLabel}>거리</Text>
        <Text style={styles.distanceValue}>{formatDistance(distance)}</Text>
        <Text style={styles.distanceUnit}>km</Text>
      </View>

      <View style={styles.timerRow}>
        <Text style={styles.timer}>{formatDuration(duration)}</Text>
      </View>

      <View style={styles.secondaryRow}>
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>페이스</Text>
          <Text style={styles.statValue}>{formatPace(pace)}</Text>
          <Text style={styles.statUnit}>분:초/km</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>평균 속도</Text>
          <Text style={styles.statValue}>{averageSpeed.toFixed(1)}</Text>
          <Text style={styles.statUnit}>km/h</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  primary: {
    alignItems: 'center',
    marginBottom: 8,
  },
  distanceLabel: {
    color: COLORS.textMuted,
    fontSize: 14,
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  distanceValue: {
    color: COLORS.primary,
    fontSize: 80,
    fontWeight: '700',
    lineHeight: 90,
    letterSpacing: -2,
  },
  distanceUnit: {
    color: COLORS.primary,
    fontSize: 22,
    fontWeight: '500',
  },
  timerRow: {
    marginVertical: 16,
  },
  timer: {
    color: COLORS.text,
    fontSize: 48,
    fontWeight: '300',
    letterSpacing: 4,
    fontVariant: ['tabular-nums'],
  },
  secondaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    paddingHorizontal: 32,
    gap: 0,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statLabel: {
    color: COLORS.textMuted,
    fontSize: 12,
    letterSpacing: 1,
    marginBottom: 4,
  },
  statValue: {
    color: COLORS.text,
    fontSize: 28,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  statUnit: {
    color: COLORS.textMuted,
    fontSize: 11,
    marginTop: 2,
  },
  divider: {
    width: 1,
    height: 48,
    backgroundColor: COLORS.border,
    marginHorizontal: 16,
  },
});
