import React, { useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Modal,
  SafeAreaView,
  useWindowDimensions,
  ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { RunSession, ActivityMode } from '../types';
import { formatDate, formatDistance, formatDuration, formatPace, formatSteps } from '../utils/formatters';
import { calcZonePercentages } from '../utils/calculations';
import { RouteMapView } from './RouteMapView';
import { COLORS } from '../constants/colors';

interface Props {
  runs: RunSession[];
  onDelete: (id: string) => void;
}

const MODE_INFO: Record<ActivityMode, { icon: string; label: string; color: string }> = {
  running: { icon: 'body-outline', label: '달리기', color: COLORS.sunsetOrange },
  walking: { icon: 'walk-outline', label: '산책', color: COLORS.success },
  cycling: { icon: 'bicycle-outline', label: '자전거', color: '#60A5FA' },
};

function RunItem({
  run,
  onDelete,
  onViewMap,
}: {
  run: RunSession;
  onDelete: (id: string) => void;
  onViewMap: (run: RunSession) => void;
}) {
  const modeInfo = MODE_INFO[run.mode] ?? MODE_INFO.running;

  const handleDelete = () => {
    Alert.alert('기록 삭제', '이 활동 기록을 삭제할까요?', [
      { text: '취소', style: 'cancel' },
      { text: '삭제', style: 'destructive', onPress: () => onDelete(run.id) },
    ]);
  };

  return (
    <View style={styles.cardWrapper}>
      <LinearGradient colors={['#1A2548', '#0F1530']} style={styles.card}>
        {/* 상단: 날짜 + 모드 + 삭제 */}
        <View style={styles.cardHeader}>
          <View style={styles.cardHeaderLeft}>
            <Ionicons name="calendar-outline" size={12} color={COLORS.textMuted} />
            <Text style={styles.date}>{formatDate(run.startTime)}</Text>
            <View style={[styles.modeBadge, { borderColor: `${modeInfo.color}40`, backgroundColor: `${modeInfo.color}10` }]}>
              <Ionicons name={modeInfo.icon as any} size={11} color={modeInfo.color} />
              <Text style={[styles.modeText, { color: modeInfo.color }]}>{modeInfo.label}</Text>
            </View>
          </View>
          <TouchableOpacity onPress={handleDelete} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="trash-outline" size={16} color={COLORS.textMuted} />
          </TouchableOpacity>
        </View>

        {/* 거리 강조 */}
        <View style={styles.distanceRow}>
          <Text style={styles.distanceValue}>{formatDistance(run.distance)}</Text>
          <Text style={styles.distanceUnit}>km</Text>
          <LinearGradient
            colors={[modeInfo.color, COLORS.sunsetPink]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.distanceBar}
          />
        </View>

        {/* 세부 통계 */}
        <View style={styles.statsRow}>
          <StatChip icon="time-outline" value={formatDuration(run.duration)} />
          {run.mode !== 'cycling' && (
            <StatChip icon="speedometer-outline" value={`${formatPace(run.pace)}/km`} />
          )}
          <StatChip icon="flash-outline" value={`${run.averageSpeed.toFixed(1)} km/h`} />
          {run.steps != null && (
            <StatChip icon="footsteps-outline" value={formatSteps(run.steps)} />
          )}
        </View>

        {/* 자전거 Zone 표시 */}
        {run.mode === 'cycling' && run.cyclingZones && (
          <CyclingZoneMini zones={run.cyclingZones} />
        )}

        {/* 지도 보기 버튼 */}
        {run.coordinates.length >= 2 && (
          <TouchableOpacity
            style={styles.mapBtn}
            onPress={() => onViewMap(run)}
            activeOpacity={0.8}
          >
            <Ionicons name="map-outline" size={14} color={modeInfo.color} />
            <Text style={[styles.mapBtnText, { color: modeInfo.color }]}>경로 지도 보기</Text>
          </TouchableOpacity>
        )}
      </LinearGradient>
      <LinearGradient
        colors={[modeInfo.color, COLORS.sunsetPink, COLORS.sunsetPurple]}
        style={styles.cardAccent}
      />
    </View>
  );
}

function CyclingZoneMini({ zones }: { zones: { zone1: number; zone2: number; zone3: number } }) {
  const p = calcZonePercentages(zones);
  return (
    <View style={styles.zoneBar}>
      {p.z1 > 0 && <View style={[styles.zoneSlice, { flex: p.z1, backgroundColor: '#60A5FA' }]} />}
      {p.z2 > 0 && <View style={[styles.zoneSlice, { flex: p.z2, backgroundColor: '#34D399' }]} />}
      {p.z3 > 0 && <View style={[styles.zoneSlice, { flex: p.z3, backgroundColor: COLORS.sunsetOrange }]} />}
    </View>
  );
}

function StatChip({
  icon,
  value,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  value: string;
}) {
  return (
    <View style={styles.statChip}>
      <Ionicons name={icon} size={12} color={COLORS.sunsetOrange} />
      <Text style={styles.statChipText}>{value}</Text>
    </View>
  );
}

function MapDetailModal({
  run,
  visible,
  onClose,
}: {
  run: RunSession | null;
  visible: boolean;
  onClose: () => void;
}) {
  const { width } = useWindowDimensions();
  const mapW = width - 48;
  const modeInfo = run ? (MODE_INFO[run.mode] ?? MODE_INFO.running) : MODE_INFO.running;
  const zonePercents = run?.cyclingZones ? calcZonePercentages(run.cyclingZones) : null;

  if (!run) return null;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={styles.modalRoot}>
        <LinearGradient colors={['#080C1E', '#0D1240']} style={StyleSheet.absoluteFill} />
        <SafeAreaView style={{ flex: 1 }}>
          <ScrollView contentContainerStyle={styles.modalScroll} showsVerticalScrollIndicator={false}>
            {/* 헤더 */}
            <View style={styles.modalHeader}>
              <View>
                <View style={styles.modalModeBadge}>
                  <Ionicons name={modeInfo.icon as any} size={16} color={modeInfo.color} />
                  <Text style={[styles.modalModeLabel, { color: modeInfo.color }]}>{modeInfo.label}</Text>
                </View>
                <Text style={styles.modalTitle}>{formatDate(run.startTime)} 경로</Text>
              </View>
              <TouchableOpacity onPress={onClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Ionicons name="close" size={24} color={COLORS.textMuted} />
              </TouchableOpacity>
            </View>

            {/* 지도 */}
            <Text style={styles.mapLegendText}>파란색 = 느린 구간 · 빨간색 = 빠른 구간</Text>
            <RouteMapView
              coordinates={run.coordinates}
              width={mapW}
              height={mapW * 0.75}
            />

            {/* 기본 통계 */}
            <View style={styles.modalStats}>
              <MiniStatCard label="거리" value={`${formatDistance(run.distance)} km`} />
              <MiniStatCard label="시간" value={formatDuration(run.duration)} />
              <MiniStatCard label="평균 속도" value={`${run.averageSpeed.toFixed(1)} km/h`} />
              {run.mode !== 'cycling' && (
                <MiniStatCard label="페이스" value={`${formatPace(run.pace)}/km`} />
              )}
              {run.steps != null && (
                <MiniStatCard label="걸음수" value={formatSteps(run.steps)} />
              )}
            </View>

            {/* 자전거 Zone */}
            {run.mode === 'cycling' && zonePercents && (
              <View style={styles.zoneDetail}>
                <Text style={styles.zoneDetailTitle}>Zone 분석</Text>
                <ZoneRow label="Zone 1 (회복)" pct={zonePercents.z1} color="#60A5FA" sec={run.cyclingZones!.zone1} />
                <ZoneRow label="Zone 2 (유산소)" pct={zonePercents.z2} color="#34D399" sec={run.cyclingZones!.zone2} />
                <ZoneRow label="Zone 3 (파워)" pct={zonePercents.z3} color={COLORS.sunsetOrange} sec={run.cyclingZones!.zone3} />
              </View>
            )}

            <TouchableOpacity style={styles.closeBtn} onPress={onClose} activeOpacity={0.8}>
              <Text style={styles.closeBtnText}>닫기</Text>
            </TouchableOpacity>
          </ScrollView>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

function MiniStatCard({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.miniCard}>
      <Text style={styles.miniCardLabel}>{label}</Text>
      <Text style={styles.miniCardValue}>{value}</Text>
    </View>
  );
}

function ZoneRow({ label, pct, color, sec }: { label: string; pct: number; color: string; sec: number }) {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return (
    <View style={styles.zoneRowItem}>
      <Text style={styles.zoneRowLabel}>{label}</Text>
      <View style={styles.zoneRowBar}>
        <View style={[styles.zoneRowFill, { width: `${pct}%`, backgroundColor: color }]} />
      </View>
      <Text style={[styles.zoneRowPct, { color }]}>
        {pct.toFixed(0)}% ({m}:{String(s).padStart(2, '0')})
      </Text>
    </View>
  );
}

export function RunHistory({ runs, onDelete }: Props) {
  const [mapRun, setMapRun] = useState<RunSession | null>(null);

  if (runs.length === 0) {
    return (
      <View style={styles.empty}>
        <LinearGradient
          colors={['rgba(255,123,79,0.1)', 'transparent']}
          style={styles.emptyGlow}
        />
        <Ionicons name="footsteps-outline" size={64} color={COLORS.border} />
        <Text style={styles.emptyTitle}>아직 활동 기록이 없습니다</Text>
        <Text style={styles.emptyDesc}>홈 탭에서 첫 번째 활동을 시작해보세요!</Text>
      </View>
    );
  }

  return (
    <>
      <FlatList
        data={runs}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <RunItem run={item} onDelete={onDelete} onViewMap={setMapRun} />
        )}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
      />
      <MapDetailModal
        run={mapRun}
        visible={mapRun != null}
        onClose={() => setMapRun(null)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  list: {
    padding: 16,
    gap: 12,
  },
  cardWrapper: {
    position: 'relative',
    flexDirection: 'row',
    borderRadius: 18,
    overflow: 'hidden',
  },
  card: {
    flex: 1,
    padding: 16,
    paddingLeft: 20,
    gap: 10,
  },
  cardAccent: {
    width: 3,
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  date: {
    color: COLORS.textMuted,
    fontSize: 12,
  },
  modeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
  },
  modeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  distanceRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 6,
    position: 'relative',
  },
  distanceValue: {
    color: COLORS.text,
    fontSize: 48,
    fontWeight: '700',
    letterSpacing: -1,
    lineHeight: 52,
  },
  distanceUnit: {
    color: COLORS.sunsetOrange,
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  distanceBar: {
    position: 'absolute',
    bottom: -4,
    left: 0,
    width: 80,
    height: 2,
    borderRadius: 1,
  },
  statsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 4,
  },
  statChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.05)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  statChipText: {
    color: COLORS.textSecondary,
    fontSize: 12,
  },
  zoneBar: {
    flexDirection: 'row',
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
    marginTop: 2,
  },
  zoneSlice: {
    height: 6,
  },
  mapBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: COLORS.border,
    alignSelf: 'flex-start',
  },
  mapBtnText: {
    fontSize: 12,
    fontWeight: '600',
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingBottom: 80,
  },
  emptyGlow: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
  },
  emptyTitle: {
    color: COLORS.text,
    fontSize: 17,
    fontWeight: '600',
  },
  emptyDesc: {
    color: COLORS.textMuted,
    fontSize: 14,
    textAlign: 'center',
  },
  // Modal styles
  modalRoot: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  modalScroll: {
    padding: 24,
    gap: 16,
    paddingBottom: 40,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  modalModeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  modalModeLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  modalTitle: {
    color: COLORS.text,
    fontSize: 20,
    fontWeight: '700',
  },
  mapLegendText: {
    color: COLORS.textMuted,
    fontSize: 11,
    marginBottom: 4,
  },
  modalStats: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
  },
  miniCard: {
    backgroundColor: 'rgba(26,37,72,0.9)',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 2,
    minWidth: '45%',
    flex: 1,
  },
  miniCardLabel: {
    color: COLORS.textMuted,
    fontSize: 11,
  },
  miniCardValue: {
    color: COLORS.sunsetOrange,
    fontSize: 16,
    fontWeight: '700',
  },
  zoneDetail: {
    backgroundColor: 'rgba(15,21,48,0.9)',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 10,
  },
  zoneDetailTitle: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  zoneRowItem: {
    gap: 4,
  },
  zoneRowLabel: {
    color: COLORS.textSecondary,
    fontSize: 12,
  },
  zoneRowBar: {
    height: 6,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  zoneRowFill: {
    height: 6,
    borderRadius: 3,
  },
  zoneRowPct: {
    fontSize: 11,
    fontWeight: '600',
  },
  closeBtn: {
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    marginTop: 8,
  },
  closeBtnText: {
    color: COLORS.textSecondary,
    fontSize: 15,
    fontWeight: '600',
  },
});
