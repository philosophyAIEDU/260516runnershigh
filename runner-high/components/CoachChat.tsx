import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { ChatMessage } from '../types';
import { COLORS } from '../constants/colors';

interface Props {
  messages: ChatMessage[];
  loading: boolean;
}

function ChatBubble({ msg }: { msg: ChatMessage }) {
  const isUser = msg.role === 'user';
  return (
    <View style={[styles.bubbleRow, isUser ? styles.bubbleRowUser : styles.bubbleRowModel]}>
      {!isUser && (
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>🏃</Text>
        </View>
      )}
      <View style={[styles.bubble, isUser ? styles.bubbleUser : styles.bubbleModel]}>
        <Text style={[styles.bubbleText, isUser ? styles.bubbleTextUser : styles.bubbleTextModel]}>
          {msg.text}
        </Text>
      </View>
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
          <Text style={styles.emptyHintText}>
            러닝 기록을 바탕으로 맞춤 코칭을 받아보세요.{'\n'}궁금한 점을 자유롭게 물어보세요!
          </Text>
        </View>
      }
      ListFooterComponent={
        loading ? (
          <View style={styles.loadingRow}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>🏃</Text>
            </View>
            <View style={styles.loadingBubble}>
              <ActivityIndicator size="small" color={COLORS.primary} />
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
    marginVertical: 4,
  },
  bubbleRowUser: {
    justifyContent: 'flex-end',
  },
  bubbleRowModel: {
    justifyContent: 'flex-start',
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  avatarText: {
    fontSize: 16,
  },
  bubble: {
    maxWidth: '75%',
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  bubbleUser: {
    backgroundColor: COLORS.primary,
    borderBottomRightRadius: 4,
  },
  bubbleModel: {
    backgroundColor: COLORS.surfaceElevated,
    borderBottomLeftRadius: 4,
  },
  bubbleText: {
    fontSize: 15,
    lineHeight: 22,
  },
  bubbleTextUser: {
    color: '#FFFFFF',
  },
  bubbleTextModel: {
    color: COLORS.text,
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    marginTop: 4,
  },
  loadingBubble: {
    backgroundColor: COLORS.surfaceElevated,
    borderRadius: 18,
    borderBottomLeftRadius: 4,
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  emptyHint: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 60,
    paddingHorizontal: 24,
  },
  emptyHintText: {
    color: COLORS.textMuted,
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 24,
  },
});
