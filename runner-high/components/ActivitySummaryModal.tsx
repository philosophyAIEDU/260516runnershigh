import React from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { RunSession } from '../types';
import { RouteMapView } from './RouteMapView';
import { formatDuration, formatDistance, formatPace, formatSteps } from '../utils/formatters';
import { calcZonePercentages } from '../utils/calculations';
import { COLORS } from '../constants/colors';

interface Props {
  session: RunSession | null;
  visible: boolean;
  onClose: () => void;
}

const MODE_LABELS: Record<string, { icon: string; label: string; color: string }> = {
  running: { icon: 'body-outline', label: '달리기', color: COLORS.sunsetOrange },
  walking: { icon: 'walk-outline', label: '산책', color: COLORS.success },
  cycling: { icon: 'bicycle-outline', label: '자전거', color: '#60A5FA' },
};

export function ActivitySummaryModal({ session, visible, onClose }: Props) {
  const { width } = useWindowDimensions();
  const mapSize = width - 64;

  if (!session) return null;

  const modeInfo = MODE_LABELS[session.mode] ?? MODE_LABELS.running;
  const zonePercents = session.cyclingZones
    ? calcZonePercentages(session.cyclingZones)
    : null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.root}>
        <LinearGradient
          colors={['#080C1E', '#0D1240', '#1A1F6E']}
          style={StyleSheet.absoluteFill}
        />
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
        >
          {/* 헤더 */}
          <View style={styles.header}>
            <View style={styles.modeBadge}>
              <Ionicons
                name={modeInfo.icon as any}
                size={18}
                color={modeInfo.color}
              />
              <Text style={[styles.modeLabel, { color: modeInfo.color }]}>
                {modeInfo.label} 완료
              </Text>
            </View>
            <Text style={styles.title}>활동 요약</Text>
            <LinearGradient
              colors={[COLORS.sunsetOrange, COLORS.sunsetPink]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.titleLine}
            />
          </View>

          {/* 기본 통계 */}
          <View style={styles.statsGrid}>
            <StatCard label="거리" value={formatDistance(session.distance)} unit="km" />
            <StatCard label="시간" value={formatDuration(session.duration)} unit="" />
            <StatCard label="평균 속도" value={session.averageSpeed.toFixed(1)} unit="km/h" />
            {session.mode !== 'cycling' && (
              <StatCard label="페이스" value={formatPace(session.pace)} unit="/km" />
            )}
          </View>

          {/* 산책: 걸음수 */}
          {session.mode === 'walking' && session.steps != null && (
            <LinearGradient
              colors={['rgba(6,214,160,0.1)', 'rgba(6,214,160,0.05)']}
              style={styles.extraCard}
            >
              <Ionicons name="footsteps-outline" size={20} color={COLORS.success} />
              <View style={styles.extraCardText}>
                <Text style={styles.extraCardValue}>{formatSteps(session.steps)}</Text>
                <Text style={styles.extraCardLabel}>추정 걸음수</Text>
              </View>
              <View style={styles.extraCardRight}>
                <Text style={styles.extraCardValue}>
                  {Math.round(session.steps / (session.duration / 60))}
                </Text>
                <Text style={styles.extraCardLabel}>걸음/분</Text>
              </View>
            </LinearGradient>
          )}

          {/* 달리기: 걸음수 */}
          {session.mode === 'running' && session.steps != null && (
            <LinearGradient
              colors={['rgba(255,123,79,0.1)', 'rgba(255,123,79,0.05)']}
              style={styles.extraCard}
            >
              <Ionicons name="footsteps-outline" size={20} color={COLORS.sunsetOrange} />
              <View style={styles.extraCardText}>
                <Text style={styles.extraCardValue}>{formatSteps(session.steps)}</Text>
                <Text style={styles.extraCardLabel}>추정 걸음수</Text>
              </View>
              <View style={styles.extraCardRight}>
                <Text style={styles.extraCardValue}>
                  {Math.round(session.steps / (session.duration / 60))}
                </Text>
                <Text style={styles.extraCardLabel}>걸음/분</Text>
              </View>
            </LinearGradient>
          )}

          {/* 자전거: Zone 분석 */}
          {session.mode === 'cycling' && zonePercents && (
            <View style={styles.zoneCard}>
              <Text style={styles.zoneTitle}>Zone 분석</Text>
              <ZoneBar label="Zone 1 (회복)" percent={zonePercents.z1} color="#60A5FA" seconds={session.cyclingZones!.zone1} />
              <ZoneBar label="Zone 2 (유산소)" percent={zonePercents.z2} color="#34D399" seconds={session.cyclingZones!.zone2} />
              <ZoneBar label="Zone 3 (파워)" percent={zonePercents.z3} color={COLORS.sunsetOrange} seconds={session.cyclingZones!.zone3} />
              <Text style={styles.zoneNote}>
                Zone 1: &lt;16 km/h · Zone 2: 16–23 km/h · Zone 3: &gt;23 km/h
              </Text>
            </View>
          )}

          {/* 경로 지도 */}
          <View style={styles.mapSection}>
            <Text style={styles.mapTitle}>경로 지도</Text>
            <Text style={styles.mapSubtitle}>파란색 = 느린 구간 · 빨간색 = 빠른 구간</Text>
            {session.coordinates.length >= 2 ? (
              <RouteMapView
                coordinates={session.coordinates}
                width={mapSize}
                height={mapSize * 0.75}
              />
            ) : (
              <View style={[styles.noMap, { width: mapSize, height: mapSize * 0.75 }]}>
                <Ionicons name="location-outline" size={32} color={COLORS.textMuted} />
                <Text style={styles.noMapText}>GPS 경로 데이터 없음</Text>
              </View>
            )}
          </View>

          {/* 완료 버튼 */}
          <TouchableOpacity onPress={onClose} activeOpacity={0.85} style={styles.doneWrapper}>
            <LinearGradient
              colors={[COLORS.sunsetOrange, COLORS.sunsetPink]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.doneButton}
            >
              <Ionicons name="checkmark-circle" size={20} color="#FFF" />
              <Text style={styles.doneText}>확인</Text>
            </LinearGradient>
          </TouchableOpacity>
        </ScrollView>
      </View>
    </Modal>
  );
}

function StatCard({ label, value, unit }: { label: string; value: string; unit: string }) {
  return (
    <LinearGradient
      colors={['rgba(26,37,72,0.9)', 'rgba(15,21,48,0.9)']}
      style={styles.statCard}
    >
      <Text style={styles.statCardLabel}>{label}</Text>
      <Text style={styles.statCardValue}>{value}</Text>
      {unit ? <Text style={styles.statCardUnit}>{unit}</Text> : null}
    </LinearGradient>
  );
}

function ZoneBar({
  label,
  percent,
  color,
  seconds,
}: {
  label: string;
  percent: number;
  color: string;
  seconds: number;
}) {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return (
    <View style={styles.zoneRow}>
      <Text style={styles.zoneLabel}>{label}</Text>
      <View style={styles.zoneBarBg}>
        <View style={[styles.zoneBarFill, { width: `${percent}%`, backgroundColor: color }]} />
      </View>
      <Text style={[styles.zonePercent, { color }]}>
        {percent.toFixed(0)}%{' '}
        <Text style={styles.zoneSecs}>
          ({mins}:{String(secs).padStart(2, '0')})
        </Text>
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scroll: {
    padding: 24,
    paddingBottom: 48,
    gap: 20,
  },
  header: {
    gap: 6,
    marginBottom: 4,
  },
  modeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  modeLabel: {
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  title: {
    color: COLORS.text,
    fontSize: 26,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  titleLine: {
    width: 48,
    height: 2,
    borderRadius: 1,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  statCard: {
    minWidth: '45%',
    flex: 1,
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 2,
  },
  statCardLabel: {
    color: COLORS.textMuted,
    fontSize: 11,
    letterSpacing: 0.5,
  },
  statCardValue: {
    color: COLORS.sunsetOrange,
    fontSize: 26,
    fontWeight: '700',
    marginTop: 4,
    fontVariant: ['tabular-nums'],
  },
  statCardUnit: {
    color: COLORS.textMuted,
    fontSize: 10,
  },
  extraCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  extraCardText: {
    flex: 1,
    gap: 2,
  },
  extraCardRight: {
    alignItems: 'flex-end',
    gap: 2,
  },
  extraCardValue: {
    color: COLORS.text,
    fontSize: 22,
    fontWeight: '700',
  },
  extraCardLabel: {
    color: COLORS.textMuted,
    fontSize: 11,
  },
  zoneCard: {
    backgroundColor: 'rgba(15,21,48,0.9)',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 10,
  },
  zoneTitle: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 4,
  },
  zoneRow: {
    gap: 6,
  },
  zoneLabel: {
    color: COLORS.textSecondary,
    fontSize: 12,
    fontWeight: '500',
  },
  zoneBarBg: {
    height: 8,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  zoneBarFill: {
    height: 8,
    borderRadius: 4,
  },
  zonePercent: {
    fontSize: 12,
    fontWeight: '600',
  },
  zoneSecs: {
    color: COLORS.textMuted,
    fontWeight: '400',
  },
  zoneNote: {
    color: COLORS.textMuted,
    fontSize: 10,
    marginTop: 2,
  },
  mapSection: {
    gap: 6,
  },
  mapTitle: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: '600',
  },
  mapSubtitle: {
    color: COLORS.textMuted,
    fontSize: 11,
    marginBottom: 4,
  },
  noMap: {
    backgroundColor: '#0A0E24',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  noMapText: {
    color: COLORS.textMuted,
    fontSize: 13,
  },
  doneWrapper: {
    marginTop: 8,
  },
  doneButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 18,
    borderRadius: 50,
  },
  doneText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700',
  },
});
