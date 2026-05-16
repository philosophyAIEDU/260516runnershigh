import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Alert,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as secureStorage from '../../services/secureStorage';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { testApiKey } from '../../services/geminiService';
import { maskApiKey } from '../../utils/formatters';
import { COLORS } from '../../constants/colors';

const SECURE_KEY = 'gemini_api_key';

export default function SettingsScreen() {
  const [storedKey, setStoredKey] = useState<string | null>(null);
  const [inputKey, setInputKey] = useState('');
  const [showInput, setShowInput] = useState(false);
  const [testing, setTesting] = useState(false);
  const [saving, setSaving] = useState(false);

  const loadKey = useCallback(async () => {
    const key = await secureStorage.getItem(SECURE_KEY);
    setStoredKey(key);
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      loadKey();
    }, [loadKey])
  );

  const handleSave = async () => {
    const key = inputKey.trim();
    if (!key) {
      Alert.alert('오류', 'API Key를 입력해주세요.');
      return;
    }
    setSaving(true);
    try {
      await secureStorage.setItem(SECURE_KEY, key);
      setStoredKey(key);
      setInputKey('');
      setShowInput(false);
      Alert.alert('저장 완료', 'API Key가 안전하게 저장되었습니다.');
    } catch {
      Alert.alert('오류', 'API Key 저장에 실패했습니다.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = () => {
    Alert.alert('API Key 삭제', '저장된 API Key를 삭제할까요?', [
      { text: '취소', style: 'cancel' },
      {
        text: '삭제',
        style: 'destructive',
        onPress: async () => {
          await secureStorage.deleteItem(SECURE_KEY);
          setStoredKey(null);
          setInputKey('');
          setShowInput(false);
        },
      },
    ]);
  };

  const handleTest = async () => {
    const key = storedKey ?? inputKey.trim();
    if (!key) {
      Alert.alert('오류', '먼저 API Key를 입력하거나 저장해주세요.');
      return;
    }
    setTesting(true);
    const valid = await testApiKey(key);
    setTesting(false);
    Alert.alert(
      valid ? '연결 성공' : '연결 실패',
      valid ? 'API Key가 유효합니다. AI 코치를 사용할 수 있습니다.' : 'API Key가 유효하지 않습니다. 다시 확인해주세요.'
    );
  };

  return (
    <View style={styles.root}>
      <LinearGradient colors={['#080C1E', '#0D1240', '#1A1F6E']} style={StyleSheet.absoluteFill} />
      <SafeAreaView style={styles.safe}>
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          {/* 헤더 */}
          <View style={styles.header}>
            <Text style={styles.title}>설정</Text>
            <LinearGradient
              colors={[COLORS.sunsetOrange, COLORS.sunsetPink]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.titleUnderline}
            />
          </View>

          {/* API Key 섹션 */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Gemini API Key</Text>
            <Text style={styles.sectionDesc}>
              AI 러닝 코치 기능에 필요합니다. Key는 기기에 암호화 저장됩니다.
            </Text>

            {storedKey && !showInput && (
              <LinearGradient
                colors={['rgba(255,123,79,0.08)', 'rgba(26,37,72,0.9)']}
                style={styles.storedCard}
              >
                {/* 좌측 선셋 라인 */}
                <LinearGradient
                  colors={[COLORS.sunsetOrange, COLORS.sunsetPink]}
                  style={styles.cardAccent}
                />
                <View style={styles.storedKeyRow}>
                  <Ionicons name="key" size={15} color={COLORS.sunsetOrange} />
                  <Text style={styles.storedKeyText}>{maskApiKey(storedKey)}</Text>
                  <View style={styles.activeTag}>
                    <Text style={styles.activeTagText}>활성</Text>
                  </View>
                </View>
                <View style={styles.keyActions}>
                  <TouchableOpacity style={styles.actionBtn} onPress={() => setShowInput(true)} activeOpacity={0.8}>
                    <Ionicons name="pencil-outline" size={15} color={COLORS.textSecondary} />
                    <Text style={styles.actionBtnText}>변경</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.actionBtn, styles.actionBtnDanger]} onPress={handleDelete} activeOpacity={0.8}>
                    <Ionicons name="trash-outline" size={15} color={COLORS.danger} />
                    <Text style={[styles.actionBtnText, { color: COLORS.danger }]}>삭제</Text>
                  </TouchableOpacity>
                </View>
              </LinearGradient>
            )}

            {(!storedKey || showInput) && (
              <View style={styles.inputSection}>
                <TextInput
                  style={styles.apiInput}
                  value={inputKey}
                  onChangeText={setInputKey}
                  placeholder="API Key를 입력하세요"
                  placeholderTextColor={COLORS.textMuted}
                  secureTextEntry
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                <View style={styles.inputActions}>
                  <TouchableOpacity onPress={handleSave} disabled={saving} activeOpacity={0.85} style={styles.saveWrapper}>
                    <LinearGradient
                      colors={[COLORS.sunsetOrange, COLORS.sunsetPink]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={styles.saveBtn}
                    >
                      {saving
                        ? <ActivityIndicator size="small" color="#FFF" />
                        : <Ionicons name="save-outline" size={17} color="#FFF" />
                      }
                      <Text style={styles.saveBtnText}>저장</Text>
                    </LinearGradient>
                  </TouchableOpacity>
                  {showInput && (
                    <TouchableOpacity style={styles.cancelBtn} onPress={() => { setShowInput(false); setInputKey(''); }} activeOpacity={0.8}>
                      <Text style={styles.cancelBtnText}>취소</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            )}

            {/* 유효성 테스트 */}
            <TouchableOpacity onPress={handleTest} disabled={testing} activeOpacity={0.8} style={styles.testBtn}>
              {testing
                ? <ActivityIndicator size="small" color={COLORS.sunsetOrange} />
                : <Ionicons name="checkmark-circle-outline" size={17} color={COLORS.sunsetOrange} />
              }
              <Text style={styles.testBtnText}>{testing ? '검증 중...' : 'API Key 유효성 테스트'}</Text>
            </TouchableOpacity>
          </View>

          {/* 앱 정보 */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>앱 정보</Text>
            <LinearGradient colors={['#1A2548', '#0F1530']} style={styles.infoCard}>
              <InfoRow icon="footsteps-outline" label="앱 이름" value="Runner's High" />
              <View style={styles.infoDivider} />
              <InfoRow icon="code-slash-outline" label="버전" value="1.0.0" />
              <View style={styles.infoDivider} />
              <InfoRow icon="phone-portrait-outline" label="플랫폼" value="iOS / Android" />
            </LinearGradient>
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

function InfoRow({
  icon,
  label,
  value,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  value: string;
}) {
  return (
    <View style={styles.infoRow}>
      <Ionicons name={icon} size={15} color={COLORS.sunsetOrange} />
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
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
  container: {
    padding: 24,
    gap: 28,
  },
  header: {
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
  section: {
    gap: 12,
  },
  sectionTitle: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  sectionDesc: {
    color: COLORS.textMuted,
    fontSize: 13,
    lineHeight: 20,
  },
  storedCard: {
    borderRadius: 16,
    padding: 16,
    paddingLeft: 20,
    gap: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.border,
    position: 'relative',
  },
  cardAccent: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 3,
  },
  storedKeyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  storedKeyText: {
    color: COLORS.text,
    fontSize: 14,
    fontFamily: 'monospace',
    flex: 1,
  },
  activeTag: {
    backgroundColor: 'rgba(255,123,79,0.15)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,123,79,0.4)',
  },
  activeTagText: {
    color: COLORS.sunsetOrange,
    fontSize: 11,
    fontWeight: '600',
  },
  keyActions: {
    flexDirection: 'row',
    gap: 10,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.06)',
    paddingVertical: 9,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  actionBtnDanger: {
    borderColor: 'rgba(255,77,109,0.3)',
  },
  actionBtnText: {
    color: COLORS.textSecondary,
    fontSize: 13,
    fontWeight: '500',
  },
  inputSection: {
    gap: 10,
  },
  apiInput: {
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: COLORS.text,
    fontSize: 14,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    fontFamily: 'monospace',
  },
  inputActions: {
    flexDirection: 'row',
    gap: 10,
  },
  saveWrapper: {
    flex: 1,
  },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
  },
  saveBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
  cancelBtn: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  cancelBtnText: {
    color: COLORS.textMuted,
    fontSize: 15,
  },
  testBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: 'rgba(255,123,79,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,123,79,0.3)',
  },
  testBtnText: {
    color: COLORS.sunsetOrange,
    fontSize: 14,
    fontWeight: '500',
  },
  infoCard: {
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingVertical: 4,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 13,
  },
  infoLabel: {
    color: COLORS.textMuted,
    fontSize: 14,
    flex: 1,
  },
  infoValue: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: '500',
  },
  infoDivider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginHorizontal: 16,
  },
});
