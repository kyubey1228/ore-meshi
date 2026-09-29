import { Platform } from 'react-native';
import * as Crypto from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';
import * as WebBrowser from 'expo-web-browser';
import { authenticatedSession, exchangeAuthCode, revokeSession, WEB_URL, type AuthUser } from './api';

const RETURN_URI = 'ore-meshi://auth/callback';
const TOKEN_KEY = 'ore-meshi.mobile-access-token';

function base64Url(bytes: Uint8Array) {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

async function challengeFor(verifier: string) {
  const digest = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, verifier, { encoding: Crypto.CryptoEncoding.BASE64 });
  return digest.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

export async function loadMobileUser(): Promise<AuthUser | null> {
  if (Platform.OS === 'web') return null;
  const token = await SecureStore.getItemAsync(TOKEN_KEY);
  if (!token) return null;
  const session = await authenticatedSession(token);
  if (!session) await SecureStore.deleteItemAsync(TOKEN_KEY);
  return session?.user ?? null;
}

export async function signInToMobile(): Promise<AuthUser> {
  if (Platform.OS === 'web') throw new Error('ネイティブログインはiOSまたはAndroidアプリで確認してください。');
  const verifier = base64Url(await Crypto.getRandomBytesAsync(64));
  const state = base64Url(await Crypto.getRandomBytesAsync(24));
  const params = new URLSearchParams({ code_challenge: await challengeFor(verifier), state, return_uri: RETURN_URI });
  const result = await WebBrowser.openAuthSessionAsync(`${WEB_URL}/mobile-auth/start?${params}`, RETURN_URI);
  if (result.type !== 'success') throw new Error(result.type === 'cancel' ? 'ログインをキャンセルしました。' : 'Xログインを完了できませんでした。');
  const callback = new URL(result.url);
  if (callback.searchParams.get('state') !== state) throw new Error('ログイン確認情報が一致しません。');
  const code = callback.searchParams.get('code');
  if (!code) throw new Error('ログイン認証コードを受け取れませんでした。');
  const exchanged = await exchangeAuthCode(code, verifier);
  await SecureStore.setItemAsync(TOKEN_KEY, exchanged.accessToken);
  const session = await authenticatedSession(exchanged.accessToken);
  if (!session) { await SecureStore.deleteItemAsync(TOKEN_KEY); throw new Error('ログイン情報を確認できませんでした。'); }
  return session.user;
}

export async function signOutFromMobile() {
  if (Platform.OS === 'web') return;
  const token = await SecureStore.getItemAsync(TOKEN_KEY);
  if (token) await revokeSession(token).catch(() => undefined);
  await SecureStore.deleteItemAsync(TOKEN_KEY);
}
