import { Link, Stack } from 'expo-router';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS } from '../constants/colors';

export default function NotFoundScreen() {
  return (
    <>
      <Stack.Screen options={{ title: '페이지 없음' }} />
      <View style={styles.container}>
        <Text style={styles.title}>페이지를 찾을 수 없습니다.</Text>
        <Link href="/(tabs)" style={styles.link}>
          <Text style={styles.linkText}>홈으로 이동</Text>
        </Link>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.background,
    gap: 16,
  },
  title: {
    color: COLORS.text,
    fontSize: 18,
  },
  link: {},
  linkText: {
    color: COLORS.primary,
    fontSize: 16,
  },
});
