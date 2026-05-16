import React, { useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useKeepAwake } from 'expo-keep-awake';
import { useRunTracking } from '../../hooks/useRunTracking';
import { useRunHistory } from '../../hooks/useRunHistory';
import { RunStats } from '../../components/RunStats';
import { COLORS } from '../../constants/colors';

export default function HomeScreen() {
  const { runState, duration, distance, pace, averageSpeed, gpsWeak, start, pause, resume, finish, reset } =
    useRunTracking();
  const { addRun } = useRunHistory();

  // 달리는 중 화면 꺼짐 방지
  useKeepAwake();

  const handleStart = useCallback(async () => {
    const success = await start();
    if (!success) {
      Alert.alert(
        'GPS 권한 필요',
        '달리기 추적을 위해 위치 권한이 필요합니다. 설정에서 권한을 허용해주세요.',
        [{ text: '확인' }]
      );
    }
  }, [start]);

  const handleFinish = useCallback(async () => {
    Alert.alert('달리기 종료', '달리기를 종료하고 기록을 저장할까요?', [
      { text: '취소', style: 'cancel' },
      {
        text: '종료',
        style: 'destructive',
        onPress: async () => {
          const session = finish();
          if (session) {
            await addRun(session);
            Alert.alert('저장 완료', `${(session.distance / 1000).toFixed(2)}km 기록이 저장되었습니다!`);
          }
          reset();
        },
      },
    ]);
  }, [finish, addRun, reset]);

  const isIdle = runState === 'IDLE' || runState === 'FINISHED';
  const isRunning = runState === 'RUNNING';
  const isPaused = runState === 'PAUSED';

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        {/* 헤더 */}
        <View style={styles.header}>
          <Text style={styles.title}>Runner's High</Text>
          {gpsWeak && isRunning && (
            <View style={styles.gpsWarning}>
              <Ionicons name="warning-outline" size={14} color={COLORS.warning} />
              <Text style={styles.gpsWarningText}>GPS 신호 약함</Text>
            </View>
          )}
        </View>

        {/* 상태 표시 */}
        <View style={styles.statusRow}>
          <View style={[styles.statusDot, isRunning && styles.statusDotActive]} />
          <Text style={styles.statusText}>
            {isIdle ? '준비' : isRunning ? '달리는 중' : isPaused ? '일시정지' : '완료'}
          </Text>
        </View>

        {/* 통계 */}
        <View style={styles.statsContainer}>
          <RunStats
            duration={duration}
            distance={distance}
            pace={pace}
            averageSpeed={averageSpeed}
          />
        </View>

        {/* 컨트롤 버튼 */}
        <View style={styles.controls}>
          {isIdle && (
            <TouchableOpacity style={styles.startButton} onPress={handleStart} activeOpacity={0.8}>
              <Ionicons name="play" size={32} color="#FFFFFF" />
              <Text style={styles.startButtonText}>달리기 시작</Text>
            </TouchableOpacity>
          )}

          {isRunning && (
            <View style={styles.runningControls}>
              <TouchableOpacity style={styles.pauseButton} onPress={pause} activeOpacity={0.8}>
                <Ionicons name="pause" size={28} color={COLORS.pause} />
                <Text style={styles.pauseButtonText}>일시정지</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.stopButton} onPress={handleFinish} activeOpacity={0.8}>
                <Ionicons name="stop" size={28} color={COLORS.danger} />
                <Text style={styles.stopButtonText}>종료</Text>
              </TouchableOpacity>
            </View>
          )}

          {isPaused && (
            <View style={styles.runningControls}>
              <TouchableOpacity style={styles.resumeButton} onPress={resume} activeOpacity={0.8}>
                <Ionicons name="play" size={28} color={COLORS.primary} />
                <Text style={styles.resumeButtonText}>재개</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.stopButton} onPress={handleFinish} activeOpacity={0.8}>
                <Ionicons name="stop" size={28} color={COLORS.danger} />
                <Text style={styles.stopButtonText}>종료</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
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
    paddingHorizontal: 24,
  },
  header: {
    paddingTop: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    color: COLORS.text,
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  gpsWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: COLORS.surfaceElevated,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  gpsWarningText: {
    color: COLORS.warning,
    fontSize: 12,
    fontWeight: '500',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.border,
  },
  statusDotActive: {
    backgroundColor: COLORS.primary,
  },
  statusText: {
    color: COLORS.textMuted,
    fontSize: 13,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  statsContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  controls: {
    paddingBottom: 32,
    alignItems: 'center',
  },
  startButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 48,
    paddingVertical: 20,
    borderRadius: 50,
    minWidth: 220,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 8,
  },
  startButtonText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  runningControls: {
    flexDirection: 'row',
    gap: 20,
  },
  pauseButton: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: COLORS.surface,
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: COLORS.pause,
    minWidth: 120,
  },
  pauseButtonText: {
    color: COLORS.pause,
    fontSize: 14,
    fontWeight: '600',
  },
  stopButton: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: COLORS.surface,
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: COLORS.danger,
    minWidth: 120,
  },
  stopButtonText: {
    color: COLORS.danger,
    fontSize: 14,
    fontWeight: '600',
  },
  resumeButton: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: COLORS.surface,
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: COLORS.primary,
    minWidth: 120,
  },
  resumeButtonText: {
    color: COLORS.primary,
    fontSize: 14,
    fontWeight: '600',
  },
});
