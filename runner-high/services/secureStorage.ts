import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';

// expo-secure-store는 웹을 지원하지 않으므로 웹에서는 AsyncStorage로 폴백.
// 웹 빌드는 데모/미리보기용이므로 보안 수준 차이는 허용 범위.

const WEB_PREFIX = 'secure_';

export async function setItem(key: string, value: string): Promise<void> {
  if (Platform.OS === 'web') {
    await AsyncStorage.setItem(WEB_PREFIX + key, value);
  } else {
    await SecureStore.setItemAsync(key, value);
  }
}

export async function getItem(key: string): Promise<string | null> {
  if (Platform.OS === 'web') {
    return AsyncStorage.getItem(WEB_PREFIX + key);
  }
  return SecureStore.getItemAsync(key);
}

export async function deleteItem(key: string): Promise<void> {
  if (Platform.OS === 'web') {
    await AsyncStorage.removeItem(WEB_PREFIX + key);
  } else {
    await SecureStore.deleteItemAsync(key);
  }
}
