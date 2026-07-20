import React, { useCallback, useState } from 'react';
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
    finish,
    reset,
  } = useRunTracking();
  const { addRun } = useRunHistory();
  useKeepAwake();

  const [selectedMode, setSelectedMode] = useState<ActivityMode>('running');
  const [summarySession, setSummarySession] = useState<RunSession | null>(null);
  const [summaryVisible, setSummaryVisible] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleStart = useCallback(async () => {
    const success = await start(selectedMode);
    if (!success) {
      Alert.alert('GPS 권한 필요', '활동 추적을 위해 위치 권한이 필요합니다.', [{ text: '확인' }]);
    }
  }, [start, selectedMode]);

  const handleRecord = useCallback(async () => {
    if (saving) return;
    setSaving(true);
    try {
      const session = await finish();
      if (!session) {
        reset();
        return;
      }
      await addRun(session);
      setSummarySession(session);
      setSummaryVisible(true);
    } catch (e) {
      console.error('기록 저장 실패:', e);
      reset();
      Alert.alert('저장 실패', '기록 저장에 실패했습니다.\n잠시 후 다시 시도해주세요.');
    } finally {
      setSaving(false);
    }
  }, [finish, addRun, reset, saving]);

  const handleSummaryClose = useCallback(() => {
    setSummaryVisible(false);
    setSummarySession(null);
    reset();
  }, [reset]);

  const isIdle = runState === 'IDLE' || runState === 'FINISHED';
  const isActive = runState === 'RUNNING' || runState === 'PAUSED';
  const activeModeInfo = MODES.find((m) => m.key === (isIdle ? selectedMode : mode));

  const statusLabel = isIdle ? 'READY'
    : mode === 'running' ? 'RUNNING'
    : mode === 'walking' ? 'WALKING'
    : 'CYCLING';

  return (
    <View style={styles.root}>
      <LinearGradient
        colors={['#080C1E', '#0D1240', '#1A1F6E']}
        style={StyleSheet.absoluteFill}
      />

      {isActive && (
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
            {gpsWeak && isActive && (
              <View style={styles.gpsWarning}>
                <Ionicons name="warning-outline" size={13} color={COLORS.pause} />
                <Text style={styles.gpsWarningText}>GPS 약함</Text>
              </View>
            )}
            <View style={[
              styles.statusBadge,
              isActive && styles.statusBadgeActive,
            ]}>
              <View style={[
                styles.statusDot,
                isActive && styles.statusDotActive,
              ]} />
              <Text style={[styles.statusText, isActive && styles.statusTextActive]}>
                {statusLabel}
              </Text>
            </View>
          </View>
        </View>

        {/* 속도선 장식 */}
        {isActive && (
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

          {/* 기록 버튼 */}
          {isActive && (
            <TouchableOpacity
              onPress={handleRecord}
              activeOpacity={0.85}
              style={styles.recordWrapper}
              disabled={saving}
            >
              <LinearGradient
                colors={[COLORS.sunsetOrange, COLORS.sunsetPink]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={[styles.recordButton, saving && styles.recordButtonDisabled]}
              >
                <Ionicons name="bookmark" size={26} color="#FFFFFF" />
                <Text style={styles.recordButtonText}>
                  {saving ? '저장 중...' : '기록'}
                </Text>
              </LinearGradient>
              <LinearGradient
                colors={[`${COLORS.sunsetOrange}60`, 'transparent']}
                style={styles.recordGlow}
              />
            </TouchableOpacity>
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
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.textMuted,
  },
  statusDotActive: {
    backgroundColor: COLORS.sunsetOrange,
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
  recordWrapper: {
    position: 'relative',
    alignItems: 'center',
    width: '100%',
  },
  recordButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingHorizontal: 52,
    paddingVertical: 20,
    borderRadius: 50,
    width: '100%',
  },
  recordButtonDisabled: {
    opacity: 0.6,
  },
  recordButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  recordGlow: {
    position: 'absolute',
    bottom: -20,
    width: 200,
    height: 40,
    borderRadius: 20,
    opacity: 0.5,
  },
  bottomLine: {
    height: 1,
    marginHorizontal: 24,
    marginBottom: 8,
    opacity: 0.5,
  },
});
