import React, { useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useRunHistory } from '../../hooks/useRunHistory';
import { RunHistory } from '../../components/RunHistory';
import { formatDistance, formatPace } from '../../utils/formatters';
import { COLORS } from '../../constants/colors';

export default function HistoryScreen() {
  const { runs, loading, refresh, removeRun, totalDistance, totalCount, averagePace } = useRunHistory();

  // 화면 포커스될 때마다 새로고침
  useFocusEffect(
    React.useCallback(() => {
      refresh();
    }, [refresh])
  );

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>달리기 기록</Text>
        </View>

        {/* 전체 통계 요약 */}
        {totalCount > 0 && (
          <View style={styles.summaryCard}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryValue}>{formatDistance(totalDistance)}</Text>
              <Text style={styles.summaryLabel}>총 거리 (km)</Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryItem}>
              <Text style={styles.summaryValue}>{totalCount}</Text>
              <Text style={styles.summaryLabel}>총 횟수</Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryItem}>
              <Text style={styles.summaryValue}>{formatPace(averagePace)}</Text>
              <Text style={styles.summaryLabel}>평균 페이스</Text>
            </View>
          </View>
        )}

        <RunHistory runs={runs} onDelete={removeRun} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 8,
  },
  title: {
    color: COLORS.text,
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  summaryCard: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginBottom: 8,
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
  },
  summaryValue: {
    color: COLORS.primary,
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  summaryLabel: {
    color: COLORS.textMuted,
    fontSize: 11,
    marginTop: 4,
    textAlign: 'center',
  },
  summaryDivider: {
    width: 1,
    backgroundColor: COLORS.border,
    marginVertical: 4,
  },
});
