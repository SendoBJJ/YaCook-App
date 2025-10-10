/**
 * Get the API base URL for the current environment
 * @returns API base URL - "/api" for preview environments, env variable for others
 */
export function getApiBaseUrl(): string {
  if (typeof window !== "undefined") {
    const host = window.location.host ?? "";
    // If we're inside the Emergent preview domain, use relative /api
    if (host.endsWith(".preview.emergentagent.com")) {
      return "/api";
    }
  }
  // Otherwise (local dev, native, prod web), use EXPO_PUBLIC_API_URL (or fallback)
  return process.env.EXPO_PUBLIC_API_URL ?? process.env.EXPO_PUBLIC_API_BASE_URL ?? "/api";
}