import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Alert,
  Modal,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useKeepAwake } from 'expo-keep-awake';
import { useRunTracking } from '../../hooks/useRunTracking';
import { useRunHistory } from '../../hooks/useRunHistory';
import { RunStats } from '../../components/RunStats';
import { ActivitySummaryModal } from '../../components/ActivitySummaryModal';
import { ActivityMode, RunSession } from '../../types';
import { COLORS } from '../../constants/colors';

const MODES: { key: ActivityMode; icon: string; label: string; color: string }[] = [
  { key: 'running', icon: 'body-outline', label: '달리기', color: COLORS.sunsetOrange },
  { key: 'walking', icon: 'walk-outline', label: '산책', color: COLORS.success },
  { key: 'cycling', icon: 'bicycle-outline', label: '자전거', color: '#60A5FA' },
];

export default function HomeScreen() {
  const {
    runState,
    duration,
    distance,
    pace,
    averageSpeed,
    currentSpeed,
    gpsWeak,
    mode,
    start,
    pause,
    resume,
    finish,
    reset,
  } = useRunTracking();
  const { addRun } = useRunHistory();
  useKeepAwake();

  const [selectedMode, setSelectedMode] = useState<ActivityMode>('running');
  const [summarySession, setSummarySession] = useState<RunSession | null>(null);
  const [summaryVisible, setSummaryVisible] = useState(false);
  const [confirmVisible, setConfirmVisible] = useState(false);

  const handleStart = useCallback(async () => {
    const success = await start(selectedMode);
    if (!success) {
      Alert.alert('GPS 권한 필요', '활동 추적을 위해 위치 권한이 필요합니다.', [{ text: '확인' }]);
    }
  }, [start, selectedMode]);

  const handleFinishPress = useCallback(() => {
    setConfirmVisible(true);
  }, []);

  const handleConfirmFinish = useCallback(async () => {
    setConfirmVisible(false);
    const session = finish();
    if (!session) {
      reset();
      return;
    }
    try {
      await addRun(session);
      setSummarySession(session);
      setSummaryVisible(true);
    } catch {
      Alert.alert('저장 실패', '기록 저장에 실패했습니다. 다시 시도해주세요.');
      reset();
    }
  }, [finish, addRun, reset]);

  const handleCancelFinish = useCallback(() => {
    setConfirmVisible(false);
  }, []);

  const handleSummaryClose = useCallback(() => {
    setSummaryVisible(false);
    setSummarySession(null);
    reset();
  }, [reset]);

  const isIdle = runState === 'IDLE' || runState === 'FINISHED';
  const isRunning = runState === 'RUNNING';
  const isPaused = runState === 'PAUSED';
  const activeModeInfo = MODES.find((m) => m.key === (isIdle ? selectedMode : mode));

  const statusLabel = isIdle ? 'READY' : isRunning
    ? (mode === 'running' ? 'RUNNING' : mode === 'walking' ? 'WALKING' : 'CYCLING')
    : 'PAUSED';

  return (
    <View style={styles.root}>
      <LinearGradient
        colors={['#080C1E', '#0D1240', '#1A1F6E']}
        style={StyleSheet.absoluteFill}
      />

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
            <Text style={styles.tagline}>즐거운 활동, 즐거운 삶</Text>
          </View>
          <View style={styles.headerRight}>
            {gpsWeak && isRunning && (
              <View style={styles.gpsWarning}>
                <Ionicons name="warning-outline" size={13} color={COLORS.pause} />
                <Text style={styles.gpsWarningText}>GPS 약함</Text>
              </View>
            )}
            <View style={[
              styles.statusBadge,
              isRunning && styles.statusBadgeActive,
              isPaused && styles.statusBadgePaused,
            ]}>
              <View style={[
                styles.statusDot,
                isRunning && styles.statusDotActive,
                isPaused && styles.statusDotPaused,
              ]} />
              <Text style={[styles.statusText, isRunning && styles.statusTextActive]}>
                {statusLabel}
              </Text>
            </View>
          </View>
        </View>

        {/* 속도선 장식 */}
        {(isRunning || isPaused) && (
          <View style={styles.speedLines}>
            <LinearGradient
              colors={['transparent', activeModeInfo?.color ?? COLORS.sunsetOrange, 'transparent']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.speedLine}
            />
            <LinearGradient
              colors={['transparent', COLORS.sunsetPink, 'transparent']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={[styles.speedLine, styles.speedLineSecond]}
            />
          </View>
        )}

        {/* 통계 */}
        <View style={styles.statsContainer}>
          <RunStats
            duration={duration}
            distance={distance}
            pace={pace}
            averageSpeed={averageSpeed}
            currentSpeed={currentSpeed}
            mode={isIdle ? selectedMode : mode}
          />
        </View>

        {/* 컨트롤 */}
        <View style={styles.controls}>
          {isIdle && (
            <>
              {/* 모드 선택기 */}
              <View style={styles.modeSelector}>
                {MODES.map((m) => {
                  const active = selectedMode === m.key;
                  return (
                    <TouchableOpacity
                      key={m.key}
                      onPress={() => setSelectedMode(m.key)}
                      activeOpacity={0.8}
                      style={[styles.modeBtn, active && { borderColor: m.color, backgroundColor: `${m.color}15` }]}
                    >
                      <Ionicons
                        name={m.icon as any}
                        size={20}
                        color={active ? m.color : COLORS.textMuted}
                      />
                      <Text style={[styles.modeBtnText, active && { color: m.color }]}>
                        {m.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* 시작 버튼 */}
              <TouchableOpacity onPress={handleStart} activeOpacity={0.85} style={styles.startWrapper}>
                <LinearGradient
                  colors={
                    selectedMode === 'running'
                      ? [COLORS.sunsetOrange, COLORS.sunsetPink]
                      : selectedMode === 'walking'
                      ? ['#06D6A0', '#0EA5E9']
                      : ['#3B82F6', '#8B5CF6']
                  }
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.startButton}
                >
                  <Ionicons name="play" size={28} color="#FFFFFF" />
                  <Text style={styles.startButtonText}>
                    {selectedMode === 'running' ? '달리기 시작' : selectedMode === 'walking' ? '산책 시작' : '자전거 시작'}
                  </Text>
                </LinearGradient>
                <LinearGradient
                  colors={[`${activeModeInfo?.color ?? COLORS.sunsetOrange}60`, 'transparent']}
                  style={styles.startGlow}
                />
              </TouchableOpacity>
            </>
          )}

          {isRunning && (
            <View style={styles.runningControls}>
              <TouchableOpacity style={styles.secondaryBtn} onPress={pause} activeOpacity={0.8}>
                <Ionicons name="pause" size={22} color={COLORS.pause} />
                <Text style={[styles.secondaryBtnText, { color: COLORS.pause }]}>일시정지</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.secondaryBtn, styles.stopBtn]}
                onPress={handleFinishPress}
                activeOpacity={0.8}
              >
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
              <TouchableOpacity
                style={[styles.secondaryBtn, styles.stopBtn]}
                onPress={handleFinishPress}
                activeOpacity={0.8}
              >
                <Ionicons name="stop" size={22} color={COLORS.danger} />
                <Text style={[styles.secondaryBtnText, { color: COLORS.danger }]}>종료</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        <LinearGradient
          colors={['transparent', activeModeInfo?.color ?? COLORS.sunsetOrange, COLORS.sunsetPink, 'transparent']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.bottomLine}
        />
      </SafeAreaView>

      {/* 활동 완료 요약 모달 */}
      <ActivitySummaryModal
        session={summarySession}
        visible={summaryVisible}
        onClose={handleSummaryClose}
      />

      {/* 종료 확인 모달 */}
      <Modal
        visible={confirmVisible}
        transparent
        animationType="fade"
        onRequestClose={handleCancelFinish}
      >
        <View style={styles.confirmOverlay}>
          <View style={styles.confirmBox}>
            <Text style={styles.confirmTitle}>
              {MODES.find((m) => m.key === mode)?.label ?? '활동'} 종료
            </Text>
            <Text style={styles.confirmMessage}>기록을 저장하고 종료할까요?</Text>
            <View style={styles.confirmButtons}>
              <TouchableOpacity
                style={styles.confirmCancelBtn}
                onPress={handleCancelFinish}
                activeOpacity={0.8}
              >
                <Text style={styles.confirmCancelText}>취소</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.confirmStopBtn}
                onPress={handleConfirmFinish}
                activeOpacity={0.8}
              >
                <Text style={styles.confirmStopText}>종료</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
    gap: 14,
  },
  modeSelector: {
    flexDirection: 'row',
    gap: 10,
    width: '100%',
  },
  modeBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 12,
    borderRadius: 16,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  modeBtnText: {
    color: COLORS.textMuted,
    fontSize: 12,
    fontWeight: '600',
  },
  startWrapper: {
    position: 'relative',
    alignItems: 'center',
    width: '100%',
  },
  startButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingHorizontal: 52,
    paddingVertical: 20,
    borderRadius: 50,
    width: '100%',
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
  confirmOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  confirmBox: {
    width: '100%',
    backgroundColor: '#0D1240',
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,77,109,0.3)',
    gap: 16,
  },
  confirmTitle: {
    color: COLORS.text,
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
  },
  confirmMessage: {
    color: COLORS.textSecondary,
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  confirmButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 4,
  },
  confirmCancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
  },
  confirmCancelText: {
    color: COLORS.textSecondary,
    fontSize: 15,
    fontWeight: '600',
  },
  confirmStopBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: 'rgba(255,77,109,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255,77,109,0.5)',
    alignItems: 'center',
  },
  confirmStopText: {
    color: COLORS.danger,
    fontSize: 15,
    fontWeight: '700',
  },
});
