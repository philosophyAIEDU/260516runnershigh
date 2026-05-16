import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { formatDuration, formatDistance, formatPace } from '../utils/formatters';
import { COLORS } from '../constants/colors';

interface Props {
  duration: number;
  distance: number;
  pace: number;
  averageSpeed: number;
}

export function RunStats({ duration, distance, pace, averageSpeed }: Props) {
  return (
    <View style={styles.container}>
      {/* 메인 거리 표시 */}
      <View style={styles.primary}>
        <Text style={styles.distanceLabel}>DISTANCE</Text>
        <View style={styles.distanceRow}>
          <Text style={styles.distanceValue}>{formatDistance(distance)}</Text>
          <Text style={styles.distanceUnit}>km</Text>
        </View>
        {/* 선셋 언더라인 */}
        <LinearGradient
          colors={COLORS.gradientSunset}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.underline}
        />
      </View>

      {/* 타이머 */}
      <View style={styles.timerContainer}>
        <Text style={styles.timer}>{formatDuration(duration)}</Text>
      </View>

      {/* 보조 통계 */}
      <View style={styles.secondaryRow}>
        <LinearGradient
          colors={['rgba(26,37,72,0.8)', 'rgba(15,21,48,0.8)']}
          style={styles.statCard}
        >
          <Text style={styles.statLabel}>페이스</Text>
          <Text style={styles.statValue}>{formatPace(pace)}</Text>
          <Text style={styles.statUnit}>분:초/km</Text>
        </LinearGradient>

        <LinearGradient
          colors={['rgba(26,37,72,0.8)', 'rgba(15,21,48,0.8)']}
          style={styles.statCard}
        >
          <Text style={styles.statLabel}>평균 속도</Text>
          <Text style={styles.statValue}>{averageSpeed.toFixed(1)}</Text>
          <Text style={styles.statUnit}>km/h</Text>
        </LinearGradient>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  primary: {
    alignItems: 'center',
    marginBottom: 4,
  },
  distanceLabel: {
    color: COLORS.textMuted,
    fontSize: 12,
    letterSpacing: 4,
    marginBottom: 8,
  },
  distanceRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 6,
  },
  distanceValue: {
    color: COLORS.text,
    fontSize: 88,
    fontWeight: '700',
    lineHeight: 96,
    letterSpacing: -3,
  },
  distanceUnit: {
    color: COLORS.sunsetOrange,
    fontSize: 24,
    fontWeight: '600',
    marginBottom: 12,
  },
  underline: {
    width: 200,
    height: 2,
    borderRadius: 1,
    marginTop: 4,
  },
  timerContainer: {
    marginVertical: 20,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    backgroundColor: 'rgba(255,123,79,0.06)',
  },
  timer: {
    color: COLORS.text,
    fontSize: 44,
    fontWeight: '200',
    letterSpacing: 6,
    fontVariant: ['tabular-nums'],
  },
  secondaryRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
    paddingHorizontal: 24,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 2,
  },
  statLabel: {
    color: COLORS.textMuted,
    fontSize: 11,
    letterSpacing: 1,
  },
  statValue: {
    color: COLORS.sunsetOrange,
    fontSize: 26,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
    marginTop: 4,
  },
  statUnit: {
    color: COLORS.textMuted,
    fontSize: 10,
  },
});
