export function resolveApiBase(): string {
  if (typeof window !== 'undefined') {
    // In preview/web, always use the platform router
    return '/api';
  }
  // Native builds (EAS, device) can use env
  return process.env.EXPO_PUBLIC_API_BASE_URL?.replace(/\/$/, '') || '/api';
}