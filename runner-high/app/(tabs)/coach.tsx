import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useGemini } from '../../hooks/useGemini';
import { useRunHistory } from '../../hooks/useRunHistory';
import { CoachChat } from '../../components/CoachChat';
import { formatDate, formatDistance, formatDuration, formatPace } from '../../utils/formatters';
import { COLORS } from '../../constants/colors';

const SYSTEM_PROMPT =
  '당신은 전문 러닝 코치입니다. 사용자의 달리기 기록 데이터를 분석하여 맞춤형 조언을 한국어로 제공합니다. 페이스 개선, 거리 증가, 회복, 부상 예방 등 실용적인 조언을 합니다.';

export default function CoachScreen() {
  const { messages, loading, error, sendMessage, clearMessages, getApiKey } = useGemini();
  const { runs, refresh } = useRunHistory();
  const [input, setInput] = useState('');
  const [hasApiKey, setHasApiKey] = useState<boolean | null>(null);

  useFocusEffect(
    React.useCallback(() => {
      refresh();
      getApiKey().then((key) => setHasApiKey(!!key));
    }, [refresh, getApiKey])
  );

  // 최근 10개 기록을 컨텍스트로 생성
  const buildContext = useCallback(() => {
    const recent = runs.slice(0, 10);
    if (recent.length === 0) return '';
    const lines = recent
      .map(
        (r) =>
          `날짜: ${formatDate(r.startTime)}, 거리: ${formatDistance(r.distance)}km, 시간: ${formatDuration(r.duration)}, 페이스: ${formatPace(r.pace)}/km`
      )
      .join('\n');
    return `최근 달리기 기록:\n${lines}`;
  }, [runs]);

  const handleSend = useCallback(async () => {
    const text = input.trim();
    if (!text || loading) return;
    setInput('');

    const context = buildContext();
    const fullText = context
      ? `${context}\n\n사용자 질문: ${text}`
      : text;

    await sendMessage(fullText, SYSTEM_PROMPT);
  }, [input, loading, buildContext, sendMessage]);

  if (hasApiKey === false) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.noKeyContainer}>
          <Ionicons name="key-outline" size={64} color={COLORS.border} />
          <Text style={styles.noKeyTitle}>Gemini API Key 필요</Text>
          <Text style={styles.noKeyDesc}>
            AI 코치를 사용하려면{'\n'}Gemini API Key를 설정해야 합니다.
          </Text>
          <TouchableOpacity
            style={styles.settingsButton}
            onPress={() => router.push('/(tabs)/settings')}
            activeOpacity={0.8}
          >
            <Ionicons name="settings-outline" size={18} color="#FFFFFF" />
            <Text style={styles.settingsButtonText}>설정으로 이동</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={80}
      >
        <View style={styles.header}>
          <Text style={styles.title}>AI 러닝 코치</Text>
          <TouchableOpacity onPress={clearMessages} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="refresh-outline" size={22} color={COLORS.textMuted} />
          </TouchableOpacity>
        </View>

        {error && (
          <View style={styles.errorBanner}>
            <Ionicons name="alert-circle-outline" size={16} color={COLORS.danger} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        <View style={styles.chatContainer}>
          <CoachChat messages={messages} loading={loading} />
        </View>

        <View style={styles.inputRow}>
          <TextInput
            style={styles.input}
            value={input}
            onChangeText={setInput}
            placeholder="코치에게 질문하세요..."
            placeholderTextColor={COLORS.textMuted}
            multiline
            maxLength={500}
            returnKeyType="send"
            onSubmitEditing={handleSend}
            blurOnSubmit={false}
          />
          <TouchableOpacity
            style={[styles.sendButton, (!input.trim() || loading) && styles.sendButtonDisabled]}
            onPress={handleSend}
            disabled={!input.trim() || loading}
            activeOpacity={0.8}
          >
            <Ionicons name="send" size={20} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
  chatContainer: {
    flex: 1,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 10,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    backgroundColor: COLORS.surface,
  },
  input: {
    flex: 1,
    backgroundColor: COLORS.surfaceElevated,
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: 10,
    color: COLORS.text,
    fontSize: 15,
    maxHeight: 120,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: COLORS.border,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 16,
    marginBottom: 8,
    padding: 12,
    backgroundColor: '#2D1515',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.danger,
  },
  errorText: {
    color: COLORS.danger,
    fontSize: 13,
    flex: 1,
  },
  noKeyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    paddingHorizontal: 40,
  },
  noKeyTitle: {
    color: COLORS.text,
    fontSize: 20,
    fontWeight: '700',
  },
  noKeyDesc: {
    color: COLORS.textMuted,
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 24,
  },
  settingsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 30,
    marginTop: 8,
  },
  settingsButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
