import * as SecureStore from "expo-secure-store";

const ACCESS = "mk_access";
const REFRESH = "mk_refresh";

export async function saveTokens(access: string, refresh?: string) {
  await SecureStore.setItemAsync(ACCESS, access);
  if (refresh) await SecureStore.setItemAsync(REFRESH, refresh);
}

export async function saveAccess(access: string) {
  await SecureStore.setItemAsync(ACCESS, access);
}

export async function loadTokens(): Promise<{ access: string | null; refresh: string | null }> {
  const access = await SecureStore.getItemAsync(ACCESS);
  const refresh = await SecureStore.getItemAsync(REFRESH);
  return { access, refresh };
}

export async function clearTokens() {
  await SecureStore.deleteItemAsync(ACCESS);
  await SecureStore.deleteItemAsync(REFRESH);
}
