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
    if (valid) {
      Alert.alert('성공', 'API Key가 유효합니다! AI 코치를 사용할 수 있습니다. ✅');
    } else {
      Alert.alert('실패', 'API Key가 유효하지 않습니다. 다시 확인해주세요. ❌');
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>설정</Text>

        {/* API Key 섹션 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Gemini API Key</Text>
          <Text style={styles.sectionDesc}>
            AI 러닝 코치 기능을 사용하려면 Google Gemini API Key가 필요합니다.
            Key는 기기에 암호화되어 안전하게 저장됩니다.
          </Text>

          {/* 저장된 키 표시 */}
          {storedKey && !showInput && (
            <View style={styles.storedKeyCard}>
              <View style={styles.storedKeyRow}>
                <Ionicons name="key" size={16} color={COLORS.primary} />
                <Text style={styles.storedKeyValue}>{maskApiKey(storedKey)}</Text>
                <View style={styles.activeTag}>
                  <Text style={styles.activeTagText}>활성</Text>
                </View>
              </View>
              <View style={styles.keyActions}>
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => setShowInput(true)}
                  activeOpacity={0.8}
                >
                  <Ionicons name="pencil-outline" size={16} color={COLORS.text} />
                  <Text style={styles.actionButtonText}>변경</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionButton, styles.actionButtonDanger]}
                  onPress={handleDelete}
                  activeOpacity={0.8}
                >
                  <Ionicons name="trash-outline" size={16} color={COLORS.danger} />
                  <Text style={[styles.actionButtonText, { color: COLORS.danger }]}>삭제</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Key 입력 폼 */}
          {(!storedKey || showInput) && (
            <View style={styles.inputSection}>
              <TextInput
                style={styles.apiKeyInput}
                value={inputKey}
                onChangeText={setInputKey}
                placeholder="API Key를 입력하세요"
                placeholderTextColor={COLORS.textMuted}
                secureTextEntry
                autoCapitalize="none"
                autoCorrect={false}
              />
              <View style={styles.inputActions}>
                <TouchableOpacity
                  style={styles.saveButton}
                  onPress={handleSave}
                  disabled={saving}
                  activeOpacity={0.8}
                >
                  {saving ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Ionicons name="save-outline" size={18} color="#FFFFFF" />
                  )}
                  <Text style={styles.saveButtonText}>저장</Text>
                </TouchableOpacity>
                {showInput && (
                  <TouchableOpacity
                    style={styles.cancelButton}
                    onPress={() => { setShowInput(false); setInputKey(''); }}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.cancelButtonText}>취소</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          )}

          {/* 테스트 버튼 */}
          <TouchableOpacity
            style={styles.testButton}
            onPress={handleTest}
            disabled={testing}
            activeOpacity={0.8}
          >
            {testing ? (
              <ActivityIndicator size="small" color={COLORS.primary} />
            ) : (
              <Ionicons name="checkmark-circle-outline" size={18} color={COLORS.primary} />
            )}
            <Text style={styles.testButtonText}>
              {testing ? '검증 중...' : 'API Key 유효성 테스트'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* 앱 정보 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>앱 정보</Text>
          <View style={styles.infoCard}>
            <InfoRow icon="footsteps-outline" label="앱 이름" value="Runner's High" />
            <InfoRow icon="code-slash-outline" label="버전" value="1.0.0" />
            <InfoRow icon="phone-portrait-outline" label="플랫폼" value="iOS / Android" />
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function InfoRow({ icon, label, value }: { icon: React.ComponentProps<typeof Ionicons>['name']; label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Ionicons name={icon} size={16} color={COLORS.textMuted} />
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  container: {
    padding: 24,
    gap: 24,
  },
  title: {
    color: COLORS.text,
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  section: {
    gap: 12,
  },
  sectionTitle: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  sectionDesc: {
    color: COLORS.textMuted,
    fontSize: 13,
    lineHeight: 20,
  },
  storedKeyCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 12,
  },
  storedKeyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  storedKeyValue: {
    color: COLORS.text,
    fontSize: 15,
    fontFamily: 'monospace',
    flex: 1,
  },
  activeTag: {
    backgroundColor: '#0D3D2B',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  activeTagText: {
    color: COLORS.primary,
    fontSize: 11,
    fontWeight: '600',
  },
  keyActions: {
    flexDirection: 'row',
    gap: 10,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.surfaceElevated,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    flex: 1,
    justifyContent: 'center',
  },
  actionButtonDanger: {
    borderWidth: 1,
    borderColor: '#3D1515',
  },
  actionButtonText: {
    color: COLORS.text,
    fontSize: 13,
    fontWeight: '500',
  },
  inputSection: {
    gap: 10,
  },
  apiKeyInput: {
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: COLORS.text,
    fontSize: 15,
    borderWidth: 1,
    borderColor: COLORS.border,
    fontFamily: 'monospace',
  },
  inputActions: {
    flexDirection: 'row',
    gap: 10,
  },
  saveButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: COLORS.primary,
    paddingVertical: 14,
    borderRadius: 14,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
  cancelButton: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: COLORS.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButtonText: {
    color: COLORS.textMuted,
    fontSize: 15,
  },
  testButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  testButtonText: {
    color: COLORS.primary,
    fontSize: 15,
    fontWeight: '500',
  },
  infoCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    padding: 4,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
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
});
