import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { formatDuration, formatDistance, formatPace, formatSteps } from '../utils/formatters';
import { estimateSteps, getCyclingZone, getCyclingZoneLabel } from '../utils/calculations';
import { ActivityMode } from '../types';
import { COLORS } from '../constants/colors';

interface Props {
  duration: number;
  distance: number;
  pace: number;
  averageSpeed: number;
  currentSpeed: number;
  mode: ActivityMode;
}

export function RunStats({ duration, distance, pace, averageSpeed, currentSpeed, mode }: Props) {
  const steps = mode !== 'cycling' ? estimateSteps(distance, mode === 'walking' ? 'walking' : 'running') : 0;
  const currentZone = mode === 'cycling' ? getCyclingZone(currentSpeed) : null;

  return (
    <View style={styles.container}>
      {/* 메인 거리 표시 */}
      <View style={styles.primary}>
        <Text style={styles.distanceLabel}>DISTANCE</Text>
        <View style={styles.distanceRow}>
          <Text style={styles.distanceValue}>{formatDistance(distance)}</Text>
          <Text style={styles.distanceUnit}>km</Text>
        </View>
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

      {/* 모드별 보조 통계 */}
      {mode === 'running' && (
        <View style={styles.secondaryRow}>
          <StatCard label="페이스" value={formatPace(pace)} unit="분:초/km" />
          <StatCard label="평균 속도" value={averageSpeed.toFixed(1)} unit="km/h" />
        </View>
      )}

      {mode === 'walking' && (
        <View style={styles.secondaryRow}>
          <StatCard
            label="추정 걸음수"
            value={formatSteps(steps)}
            unit="걸음"
            icon="footsteps-outline"
          />
          <StatCard
            label="속도"
            value={averageSpeed.toFixed(1)}
            unit="km/h"
          />
        </View>
      )}

      {mode === 'cycling' && (
        <>
          <View style={styles.secondaryRow}>
            <StatCard label="현재 속도" value={currentSpeed.toFixed(1)} unit="km/h" />
            <StatCard label="평균 속도" value={averageSpeed.toFixed(1)} unit="km/h" />
          </View>
          {currentZone && (
            <View style={styles.zoneIndicator}>
              <ZoneDot zone={currentZone} />
              <Text style={[styles.zoneText, { color: zoneColor(currentZone) }]}>
                {getCyclingZoneLabel(currentZone)}
              </Text>
            </View>
          )}
        </>
      )}
    </View>
  );
}

function StatCard({
  label,
  value,
  unit,
  icon,
}: {
  label: string;
  value: string;
  unit: string;
  icon?: React.ComponentProps<typeof Ionicons>['name'];
}) {
  return (
    <LinearGradient
      colors={['rgba(26,37,72,0.8)', 'rgba(15,21,48,0.8)']}
      style={styles.statCard}
    >
      <Text style={styles.statLabel}>{label}</Text>
      <View style={styles.statValueRow}>
        {icon && <Ionicons name={icon} size={14} color={COLORS.sunsetOrange} />}
        <Text style={styles.statValue}>{value}</Text>
      </View>
      <Text style={styles.statUnit}>{unit}</Text>
    </LinearGradient>
  );
}

function ZoneDot({ zone }: { zone: 1 | 2 | 3 }) {
  return (
    <View style={[styles.zoneDot, { backgroundColor: zoneColor(zone) }]} />
  );
}

function zoneColor(zone: 1 | 2 | 3): string {
  if (zone === 1) return '#60A5FA';
  if (zone === 2) return '#34D399';
  return COLORS.sunsetOrange;
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
  statValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  statValue: {
    color: COLORS.sunsetOrange,
    fontSize: 26,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  statUnit: {
    color: COLORS.textMuted,
    fontSize: 10,
  },
  zoneIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  zoneDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  zoneText: {
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
});
