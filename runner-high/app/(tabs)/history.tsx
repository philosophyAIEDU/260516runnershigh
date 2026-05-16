import React from 'react';
import { View, Text, StyleSheet, SafeAreaView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from 'expo-router';
import { useRunHistory } from '../../hooks/useRunHistory';
import { RunHistory } from '../../components/RunHistory';
import { formatDistance, formatPace } from '../../utils/formatters';
import { COLORS } from '../../constants/colors';

export default function HistoryScreen() {
  const { runs, refresh, removeRun, totalDistance, totalCount, averagePace } = useRunHistory();

  useFocusEffect(
    React.useCallback(() => {
      refresh();
    }, [refresh])
  );

  return (
    <View style={styles.root}>
      <LinearGradient
        colors={['#080C1E', '#0D1240', '#1A1F6E']}
        style={StyleSheet.absoluteFill}
      />
      <SafeAreaView style={styles.safe}>
        {/* 헤더 */}
        <View style={styles.header}>
          <Text style={styles.title}>달리기 기록</Text>
          <LinearGradient
            colors={[COLORS.sunsetOrange, COLORS.sunsetPink]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.titleUnderline}
          />
        </View>

        {/* 전체 통계 요약 */}
        {totalCount > 0 && (
          <View style={styles.summaryWrapper}>
            <LinearGradient
              colors={['rgba(255,123,79,0.12)', 'rgba(139,92,246,0.08)']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.summaryCard}
            >
              <View style={styles.summaryItem}>
                <Text style={styles.summaryValue}>{formatDistance(totalDistance)}</Text>
                <Text style={styles.summaryLabel}>총 거리 km</Text>
              </View>
              <LinearGradient
                colors={['transparent', COLORS.border, 'transparent']}
                style={styles.summaryDivider}
              />
              <View style={styles.summaryItem}>
                <Text style={styles.summaryValue}>{totalCount}</Text>
                <Text style={styles.summaryLabel}>총 횟수</Text>
              </View>
              <LinearGradient
                colors={['transparent', COLORS.border, 'transparent']}
                style={styles.summaryDivider}
              />
              <View style={styles.summaryItem}>
                <Text style={styles.summaryValue}>{formatPace(averagePace)}</Text>
                <Text style={styles.summaryLabel}>평균 페이스</Text>
              </View>
            </LinearGradient>
          </View>
        )}

        <RunHistory runs={runs} onDelete={removeRun} />
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  safe: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 12,
    gap: 8,
  },
  title: {
    color: COLORS.text,
    fontSize: 24,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  titleUnderline: {
    width: 48,
    height: 2,
    borderRadius: 1,
  },
  summaryWrapper: {
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 18,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  summaryCard: {
    flexDirection: 'row',
    paddingVertical: 18,
    paddingHorizontal: 12,
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  summaryValue: {
    color: COLORS.sunsetOrange,
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  summaryLabel: {
    color: COLORS.textMuted,
    fontSize: 11,
    textAlign: 'center',
  },
  summaryDivider: {
    width: 1,
    marginVertical: 4,
  },
});
