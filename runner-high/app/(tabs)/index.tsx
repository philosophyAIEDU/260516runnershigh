import React, { useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
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

  useKeepAwake();

  const handleStart = useCallback(async () => {
    const success = await start();
    if (!success) {
      Alert.alert(
        'GPS 권한 필요',
        '달리기 추적을 위해 위치 권한이 필요합니다.',
        [{ text: '확인' }]
      );
    }
  }, [start]);

  const handleFinish = useCallback(async () => {
    Alert.alert('달리기 종료', '기록을 저장하고 종료할까요?', [
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
    <View style={styles.root}>
      {/* 배경 그라디언트: 딥 네이비 → 선셋 */}
      <LinearGradient
        colors={['#080C1E', '#0D1240', '#1A1F6E']}
        style={StyleSheet.absoluteFill}
      />

      {/* 달리는 중일 때 선셋 글로우 */}
      {isRunning && (
        <LinearGradient
          colors={['transparent', 'rgba(255,123,79,0.08)', 'rgba(255,107,157,0.05)']}
          style={styles.glowOverlay}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 1 }}
        />
      )}

      <SafeAreaView style={styles.safe}>
        {/* 헤더 */}
        <View style={styles.header}>
          <View>
            <Text style={styles.appName}>runner's high</Text>
            <Text style={styles.tagline}>한강의 노을처럼</Text>
          </View>
          <View style={styles.headerRight}>
            {gpsWeak && isRunning && (
              <View style={styles.gpsWarning}>
                <Ionicons name="warning-outline" size={13} color={COLORS.pause} />
                <Text style={styles.gpsWarningText}>GPS 약함</Text>
              </View>
            )}
            {/* 상태 인디케이터 */}
            <View style={[styles.statusBadge, isRunning && styles.statusBadgeActive, isPaused && styles.statusBadgePaused]}>
              <View style={[styles.statusDot, isRunning && styles.statusDotActive, isPaused && styles.statusDotPaused]} />
              <Text style={[styles.statusText, isRunning && styles.statusTextActive]}>
                {isIdle ? 'READY' : isRunning ? 'RUNNING' : 'PAUSED'}
              </Text>
            </View>
          </View>
        </View>

        {/* 속도선 장식 */}
        {(isRunning || isPaused) && (
          <View style={styles.speedLines}>
            <LinearGradient colors={['transparent', COLORS.sunsetOrange, 'transparent']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.speedLine} />
            <LinearGradient colors={['transparent', COLORS.sunsetPink, 'transparent']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={[styles.speedLine, styles.speedLineSecond]} />
          </View>
        )}

        {/* 통계 */}
        <View style={styles.statsContainer}>
          <RunStats
            duration={duration}
            distance={distance}
            pace={pace}
            averageSpeed={averageSpeed}
          />
        </View>

        {/* 컨트롤 */}
        <View style={styles.controls}>
          {isIdle && (
            <TouchableOpacity onPress={handleStart} activeOpacity={0.85} style={styles.startWrapper}>
              <LinearGradient
                colors={[COLORS.sunsetOrange, COLORS.sunsetPink]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.startButton}
              >
                <Ionicons name="play" size={28} color="#FFFFFF" />
                <Text style={styles.startButtonText}>달리기 시작</Text>
              </LinearGradient>
              {/* 글로우 효과 */}
              <LinearGradient
                colors={['rgba(255,123,79,0.4)', 'transparent']}
                style={styles.startGlow}
              />
            </TouchableOpacity>
          )}

          {isRunning && (
            <View style={styles.runningControls}>
              <TouchableOpacity style={styles.secondaryBtn} onPress={pause} activeOpacity={0.8}>
                <Ionicons name="pause" size={22} color={COLORS.pause} />
                <Text style={[styles.secondaryBtnText, { color: COLORS.pause }]}>일시정지</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.secondaryBtn, styles.stopBtn]} onPress={handleFinish} activeOpacity={0.8}>
                <Ionicons name="stop" size={22} color={COLORS.danger} />
                <Text style={[styles.secondaryBtnText, { color: COLORS.danger }]}>종료</Text>
              </TouchableOpacity>
            </View>
          )}

          {isPaused && (
            <View style={styles.runningControls}>
              <TouchableOpacity style={styles.resumeWrapper} onPress={resume} activeOpacity={0.85}>
                <LinearGradient
                  colors={[COLORS.sunsetOrange, COLORS.sunsetGold]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.resumeButton}
                >
                  <Ionicons name="play" size={22} color="#FFF" />
                  <Text style={styles.resumeText}>재개</Text>
                </LinearGradient>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.secondaryBtn, styles.stopBtn]} onPress={handleFinish} activeOpacity={0.8}>
                <Ionicons name="stop" size={22} color={COLORS.danger} />
                <Text style={[styles.secondaryBtnText, { color: COLORS.danger }]}>종료</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* 하단 수평선 */}
        <LinearGradient
          colors={['transparent', COLORS.sunsetOrange, COLORS.sunsetPink, 'transparent']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.bottomLine}
        />
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  glowOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  safe: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 8,
  },
  appName: {
    color: COLORS.text,
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: 1,
  },
  tagline: {
    color: COLORS.textMuted,
    fontSize: 11,
    letterSpacing: 2,
    marginTop: 2,
  },
  headerRight: {
    alignItems: 'flex-end',
    gap: 6,
  },
  gpsWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,209,102,0.1)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,209,102,0.3)',
  },
  gpsWarningText: {
    color: COLORS.pause,
    fontSize: 11,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  statusBadgeActive: {
    backgroundColor: 'rgba(255,123,79,0.1)',
    borderColor: 'rgba(255,123,79,0.4)',
  },
  statusBadgePaused: {
    backgroundColor: 'rgba(255,209,102,0.1)',
    borderColor: 'rgba(255,209,102,0.3)',
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.textMuted,
  },
  statusDotActive: {
    backgroundColor: COLORS.sunsetOrange,
  },
  statusDotPaused: {
    backgroundColor: COLORS.pause,
  },
  statusText: {
    color: COLORS.textMuted,
    fontSize: 10,
    letterSpacing: 2,
    fontWeight: '600',
  },
  statusTextActive: {
    color: COLORS.sunsetOrange,
  },
  speedLines: {
    marginHorizontal: 24,
    gap: 3,
    marginBottom: 4,
  },
  speedLine: {
    height: 1,
    borderRadius: 1,
    opacity: 0.6,
  },
  speedLineSecond: {
    width: '60%',
    opacity: 0.3,
  },
  statsContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  controls: {
    paddingBottom: 24,
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  startWrapper: {
    position: 'relative',
    alignItems: 'center',
  },
  startButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingHorizontal: 52,
    paddingVertical: 20,
    borderRadius: 50,
    minWidth: 240,
  },
  startButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  startGlow: {
    position: 'absolute',
    bottom: -20,
    width: 200,
    height: 40,
    borderRadius: 20,
    opacity: 0.5,
  },
  runningControls: {
    flexDirection: 'row',
    gap: 14,
    width: '100%',
  },
  secondaryBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    borderRadius: 20,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: 'rgba(255,209,102,0.3)',
  },
  stopBtn: {
    borderColor: 'rgba(255,77,109,0.3)',
  },
  secondaryBtnText: {
    fontSize: 14,
    fontWeight: '600',
  },
  resumeWrapper: {
    flex: 1,
  },
  resumeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    borderRadius: 20,
  },
  resumeText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  bottomLine: {
    height: 1,
    marginHorizontal: 24,
    marginBottom: 8,
    opacity: 0.5,
  },
});
