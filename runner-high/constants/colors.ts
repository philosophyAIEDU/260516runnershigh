// 노을 지는 한강 - 딥 네이비 → 선셋 그라디언트 팔레트
export const COLORS = {
  // 배경
  background: '#080C1E',
  surface: '#0F1530',
  surfaceElevated: '#172040',
  surfaceCard: '#1A2548',

  // 선셋 그라디언트 포인트 컬러
  sunsetOrange: '#FF7B4F',
  sunsetGold: '#FFB347',
  sunsetPink: '#FF6B9D',
  sunsetPurple: '#8B5CF6',
  navyDeep: '#0D1240',
  navyMid: '#1A237E',

  // 주 액션 컬러 (선셋 오렌지)
  primary: '#FF7B4F',
  primaryLight: '#FF9A7A',
  primaryGlow: 'rgba(255, 123, 79, 0.3)',

  // 텍스트
  text: '#F0F4FF',
  textSecondary: '#B8C4E0',
  textMuted: '#6B7A9E',

  // 보조
  border: '#1E2D5A',
  borderLight: '#2A3F6F',
  danger: '#FF4D6D',
  pause: '#FFD166',
  success: '#06D6A0',

  // 그라디언트 배열 (LinearGradient 용)
  gradientSky: ['#080C1E', '#0D1240', '#1A237E'] as const,
  gradientSunset: ['#FF7B4F', '#FF6B9D', '#8B5CF6'] as const,
  gradientCard: ['#1A2548', '#0F1530'] as const,
  gradientHero: ['#080C1E', '#1A237E', '#4A1A6B', '#FF4500'] as const,
};
