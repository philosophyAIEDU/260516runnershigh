import React from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { RunSession } from '../types';
import { formatDate, formatDistance, formatDuration, formatPace } from '../utils/formatters';
import { COLORS } from '../constants/colors';

interface Props {
  runs: RunSession[];
  onDelete: (id: string) => void;
}

function RunItem({ run, onDelete }: { run: RunSession; onDelete: (id: string) => void }) {
  const handleDelete = () => {
    Alert.alert('기록 삭제', '이 달리기 기록을 삭제할까요?', [
      { text: '취소', style: 'cancel' },
      { text: '삭제', style: 'destructive', onPress: () => onDelete(run.id) },
    ]);
  };

  return (
    <View style={styles.cardWrapper}>
      <LinearGradient
        colors={['#1A2548', '#0F1530']}
        style={styles.card}
      >
        {/* 상단: 날짜 + 삭제 */}
        <View style={styles.cardHeader}>
          <View style={styles.dateRow}>
            <Ionicons name="calendar-outline" size={12} color={COLORS.textMuted} />
            <Text style={styles.date}>{formatDate(run.startTime)}</Text>
          </View>
          <TouchableOpacity onPress={handleDelete} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="trash-outline" size={16} color={COLORS.textMuted} />
          </TouchableOpacity>
        </View>

        {/* 거리 강조 */}
        <View style={styles.distanceRow}>
          <Text style={styles.distanceValue}>{formatDistance(run.distance)}</Text>
          <Text style={styles.distanceUnit}>km</Text>
          {/* 선셋 구분선 */}
          <LinearGradient
            colors={[COLORS.sunsetOrange, COLORS.sunsetPink]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.distanceBar}
          />
        </View>

        {/* 세부 통계 */}
        <View style={styles.statsRow}>
          <StatChip icon="time-outline" value={formatDuration(run.duration)} />
          <StatChip icon="speedometer-outline" value={`${formatPace(run.pace)}/km`} />
          <StatChip icon="flash-outline" value={`${run.averageSpeed.toFixed(1)} km/h`} />
        </View>
      </LinearGradient>
      {/* 카드 좌측 선셋 테두리 */}
      <LinearGradient
        colors={[COLORS.sunsetOrange, COLORS.sunsetPink, COLORS.sunsetPurple]}
        style={styles.cardAccent}
      />
    </View>
  );
}

function StatChip({ icon, value }: { icon: React.ComponentProps<typeof Ionicons>['name']; value: string }) {
  return (
    <View style={styles.statChip}>
      <Ionicons name={icon} size={12} color={COLORS.sunsetOrange} />
      <Text style={styles.statChipText}>{value}</Text>
    </View>
  );
}

export function RunHistory({ runs, onDelete }: Props) {
  if (runs.length === 0) {
    return (
      <View style={styles.empty}>
        <LinearGradient
          colors={['rgba(255,123,79,0.1)', 'transparent']}
          style={styles.emptyGlow}
        />
        <Ionicons name="footsteps-outline" size={64} color={COLORS.border} />
        <Text style={styles.emptyTitle}>아직 달리기 기록이 없습니다</Text>
        <Text style={styles.emptyDesc}>홈 탭에서 첫 번째 달리기를 시작해보세요!</Text>
      </View>
    );
  }

  return (
    <FlatList
      data={runs}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => <RunItem run={item} onDelete={onDelete} />}
      contentContainerStyle={styles.list}
      showsVerticalScrollIndicator={false}
    />
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
    marginBottom: 10,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  date: {
    color: COLORS.textMuted,
    fontSize: 12,
  },
  distanceRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 6,
    marginBottom: 12,
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
    gap: 8,
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
});
