import React from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
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
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.date}>{formatDate(run.startTime)}</Text>
        <TouchableOpacity onPress={handleDelete} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Ionicons name="trash-outline" size={18} color={COLORS.textMuted} />
        </TouchableOpacity>
      </View>
      <View style={styles.cardBody}>
        <View style={styles.mainStat}>
          <Text style={styles.distanceValue}>{formatDistance(run.distance)}</Text>
          <Text style={styles.distanceUnit}>km</Text>
        </View>
        <View style={styles.subStats}>
          <View style={styles.subItem}>
            <Ionicons name="time-outline" size={14} color={COLORS.textMuted} />
            <Text style={styles.subValue}>{formatDuration(run.duration)}</Text>
          </View>
          <View style={styles.subItem}>
            <Ionicons name="speedometer-outline" size={14} color={COLORS.textMuted} />
            <Text style={styles.subValue}>{formatPace(run.pace)}/km</Text>
          </View>
          <View style={styles.subItem}>
            <Ionicons name="flash-outline" size={14} color={COLORS.textMuted} />
            <Text style={styles.subValue}>{run.averageSpeed.toFixed(1)} km/h</Text>
          </View>
        </View>
      </View>
    </View>
  );
}

export function RunHistory({ runs, onDelete }: Props) {
  if (runs.length === 0) {
    return (
      <View style={styles.empty}>
        <Ionicons name="footsteps-outline" size={64} color={COLORS.border} />
        <Text style={styles.emptyTitle}>아직 달리기 기록이 없습니다</Text>
        <Text style={styles.emptyDesc}>홈 탭에서 달리기를 시작해보세요!</Text>
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
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  date: {
    color: COLORS.textMuted,
    fontSize: 13,
  },
  cardBody: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  mainStat: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
  },
  distanceValue: {
    color: COLORS.primary,
    fontSize: 42,
    fontWeight: '700',
    letterSpacing: -1,
  },
  distanceUnit: {
    color: COLORS.primary,
    fontSize: 16,
    fontWeight: '500',
  },
  subStats: {
    gap: 6,
    alignItems: 'flex-end',
  },
  subItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  subValue: {
    color: COLORS.textSecondary,
    fontSize: 14,
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingBottom: 80,
  },
  emptyTitle: {
    color: COLORS.text,
    fontSize: 18,
    fontWeight: '600',
  },
  emptyDesc: {
    color: COLORS.textMuted,
    fontSize: 14,
  },
});
