# NZAIDI Mobile — Guia de Integração React Native & Expo

Este guia oferece implementações completas de referência para equipas que irão programar a aplicação **NZAIDI Mobile** utilizando React Native, Expo e TypeScript.

---

## 1. Armazenamento Seguro de Tokens (`expo-secure-store`)

Nunca utilize `AsyncStorage` comum para credenciais bancárias. Utilize o hardware security module (KeyStore no Android e Keychain no iOS):

```typescript
// services/storage.service.ts
import * as SecureStore from 'expo-secure-store';

const ACCESS_TOKEN_KEY = 'nzaidi_mobile_access_token';
const REFRESH_TOKEN_KEY = 'nzaidi_mobile_refresh_token';
const DEVICE_ID_KEY = 'nzaidi_mobile_device_id';

export const StorageService = {
  async salvarTokens(accessToken: string, refreshToken: string): Promise<void> {
    await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, accessToken, {
      keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK,
    });
    await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, refreshToken, {
      keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK,
    });
  },

  async obterAccessToken(): Promise<string | null> {
    return SecureStore.getItemAsync(ACCESS_TOKEN_KEY);
  },

  async obterRefreshToken(): Promise<string | null> {
    return SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
  },

  async limparSessao(): Promise<void> {
    await SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY);
    await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
  },

  async obterOuCriarDeviceId(): Promise<string> {
    let id = await SecureStore.getItemAsync(DEVICE_ID_KEY);
    if (!id) {
      id = (await import('expo-crypto')).randomUUID();
      await SecureStore.setItemAsync(DEVICE_ID_KEY, id);
    }
    return id;
  },
};
```

---

## 2. Cliente HTTP Axios com Renovação Automática (Silent Refresh)

O interceptor abaixo gerencia a expiração dos 15 minutos do `accessToken`, pausando as requisições em fila para renovar o par de tokens via `POST /auth/refresh` antes de reenviar as requisições pendentes.

```typescript
// services/api.service.ts
import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { StorageService } from './storage.service';

const BASE_URL = 'https://homologacao.nzaidi.ao/api/v1/mobile';

export const api = axios.create({
  baseURL: BASE_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});

let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value?: unknown) => void;
  reject: (reason?: unknown) => void;
}> = [];

const processQueue = (error: Error | null, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

// Interceptor de Requisições: adiciona cabeçalhos obrigatórios
api.interceptors.request.use(async (config: InternalAxiosRequestConfig) => {
  const token = await StorageService.obterAccessToken();
  const deviceId = await StorageService.obterOuCriarDeviceId();

  config.headers['X-Device-Id'] = deviceId;
  config.headers['X-Platform'] = Platform.OS === 'ios' ? 'ios' : 'android';
  config.headers['X-App-Version'] = Constants.expoConfig?.version || '1.0.0';
  config.headers['X-Correlation-Id'] = (await import('expo-crypto')).randomUUID();

  if (token && !config.headers.Authorization) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

// Interceptor de Resposta: Trata 401 e rotaciona o Refresh Token
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    if (error.response?.status === 401 && !originalRequest._retry) {
      if (originalRequest.url?.includes('/auth/login') || originalRequest.url?.includes('/auth/refresh')) {
        return Promise.reject(error);
      }

      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return api(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const refreshToken = await StorageService.obterRefreshToken();
        const deviceId = await StorageService.obterOuCriarDeviceId();

        if (!refreshToken) {
          throw new Error('Nenhum refresh token armazenado.');
        }

        const res = await axios.post(`${BASE_URL}/auth/refresh`, {
          refreshToken,
          deviceId,
        });

        const { accessToken: novoAccessToken, refreshToken: novoRefreshToken } = res.data.dados;
        await StorageService.salvarTokens(novoAccessToken, novoRefreshToken);

        api.defaults.headers.common.Authorization = `Bearer ${novoAccessToken}`;
        processQueue(null, novoAccessToken);

        originalRequest.headers.Authorization = `Bearer ${novoAccessToken}`;
        return api(originalRequest);
      } catch (refreshErr) {
        processQueue(refreshErr as Error, null);
        await StorageService.limparSessao();
        // Redirecionar para tela de autenticação
        return Promise.reject(refreshErr);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);
```

---

## 3. Autenticação Biométrica (`expo-local-authentication`)

Permita ao cliente entrar com FaceID / TouchID / Biometria Android sem digitar a palavra-passe novamente:

```typescript
// services/biometria.service.ts
import * as LocalAuthentication from 'expo-local-authentication';
import { StorageService } from './storage.service';

export const BiometriaService = {
  async verificarDisponibilidade(): Promise<boolean> {
    const temHardware = await LocalAuthentication.hasHardwareAsync();
    const cadastrado = await LocalAuthentication.isEnrolledAsync();
    return temHardware && cadastrado;
  },

  async autenticarComBiometria(): Promise<boolean> {
    const disponivel = await this.verificarDisponibilidade();
    if (!disponivel) return false;

    const resultado = await LocalAuthentication.authenticateAsync({
      promptMessage: 'Autentique-se para aceder ao NZAIDI Mobile',
      fallbackLabel: 'Usar código PIN / Palavra-passe',
      cancelLabel: 'Cancelar',
    });

    if (resultado.success) {
      const token = await StorageService.obterAccessToken();
      return !!token;
    }

    return false;
  },
};
```
