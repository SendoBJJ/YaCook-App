export function apiBase() {
  if (typeof window !== 'undefined') return '/api'; // preview web
  // native/local fallback:
  const base = process.env.EXPO_PUBLIC_API_BASE_URL || 'http://localhost:8001';
  return base.replace(/\/+$/, '') + '/api';
}