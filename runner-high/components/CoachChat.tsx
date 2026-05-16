import React, { useRef, useEffect } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { ChatMessage } from '../types';
import { COLORS } from '../constants/colors';

interface Props {
  messages: ChatMessage[];
  loading: boolean;
}

function ChatBubble({ msg }: { msg: ChatMessage }) {
  const isUser = msg.role === 'user';
  return (
    <View style={[styles.bubbleRow, isUser ? styles.rowUser : styles.rowModel]}>
      {!isUser && (
        <LinearGradient
          colors={[COLORS.sunsetOrange, COLORS.sunsetPink]}
          style={styles.avatar}
        >
          <Text style={styles.avatarText}>rh</Text>
        </LinearGradient>
      )}
      {isUser ? (
        <LinearGradient
          colors={[COLORS.sunsetOrange, COLORS.sunsetPink]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.bubble, styles.bubbleUser]}
        >
          <Text style={styles.textUser}>{msg.text}</Text>
        </LinearGradient>
      ) : (
        <View style={[styles.bubble, styles.bubbleModel]}>
          <Text style={styles.textModel}>{msg.text}</Text>
        </View>
      )}
    </View>
  );
}

export function CoachChat({ messages, loading }: Props) {
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, [messages]);

  return (
    <FlatList
      ref={flatListRef}
      data={messages}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => <ChatBubble msg={item} />}
      contentContainerStyle={styles.list}
      showsVerticalScrollIndicator={false}
      ListEmptyComponent={
        <View style={styles.emptyHint}>
          <LinearGradient
            colors={['rgba(255,123,79,0.08)', 'transparent']}
            style={styles.emptyGlow}
          />
          <Text style={styles.emptyEmoji}>🌅</Text>
          <Text style={styles.emptyTitle}>AI 러닝 코치</Text>
          <Text style={styles.emptyDesc}>
            달리기 기록을 분석해 맞춤 코칭을 제공합니다.{'\n'}
            페이스, 거리, 회복에 대해 무엇이든 물어보세요.
          </Text>
        </View>
      }
      ListFooterComponent={
        loading ? (
          <View style={styles.loadingRow}>
            <LinearGradient
              colors={[COLORS.sunsetOrange, COLORS.sunsetPink]}
              style={styles.avatar}
            >
              <Text style={styles.avatarText}>rh</Text>
            </LinearGradient>
            <View style={styles.loadingBubble}>
              <ActivityIndicator size="small" color={COLORS.sunsetOrange} />
            </View>
          </View>
        ) : null
      }
    />
  );
}

const styles = StyleSheet.create({
  list: {
    padding: 16,
    gap: 12,
    flexGrow: 1,
  },
  bubbleRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    marginVertical: 2,
  },
  rowUser: { justifyContent: 'flex-end' },
  rowModel: { justifyContent: 'flex-start' },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  bubble: {
    maxWidth: '75%',
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  bubbleUser: {
    borderBottomRightRadius: 4,
  },
  bubbleModel: {
    backgroundColor: COLORS.surfaceCard,
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  textUser: {
    color: '#FFFFFF',
    fontSize: 15,
    lineHeight: 22,
  },
  textModel: {
    color: COLORS.text,
    fontSize: 15,
    lineHeight: 22,
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    marginTop: 4,
  },
  loadingBubble: {
    backgroundColor: COLORS.surfaceCard,
    borderRadius: 18,
    borderBottomLeftRadius: 4,
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  emptyHint: {
    flex: 1,
    alignItems: 'center',
    paddingTop: 60,
    paddingHorizontal: 32,
    gap: 12,
  },
  emptyGlow: {
    position: 'absolute',
    top: 30,
    width: 200,
    height: 200,
    borderRadius: 100,
  },
  emptyEmoji: {
    fontSize: 48,
  },
  emptyTitle: {
    color: COLORS.text,
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  emptyDesc: {
    color: COLORS.textMuted,
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 22,
  },
});
