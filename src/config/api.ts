const envApi = import.meta.env.VITE_API_URL;
const DEFAULT_API = "https://store-repair.sagartmt.com/api";

const finalApiUrl = envApi || DEFAULT_API;

const rawApi = (finalApiUrl || "").trim();
const isBrowser = typeof window !== "undefined";
const shouldUpgradeToHttps =
  isBrowser && window.location.protocol === "https:" && rawApi.startsWith("http://");

// Ensure the base URL always points to the backend /api prefix
const normalizedBase = (shouldUpgradeToHttps
  ? rawApi.replace(/^http:\/\//i, "https://")
  : rawApi
).replace(/\/+$/, "");

export const API_BASE_URL = /\/api$/i.test(normalizedBase)
  ? normalizedBase
  : `${normalizedBase}/api`;

export function getToken(): string | null {
  return localStorage.getItem("token");
}

export function setToken(token: string): void {
  localStorage.setItem("token", token);
}

export function removeToken(): void {
  localStorage.removeItem("token");
}

export function isTokenExpired(token: string | null): boolean {
  if (!token) return true;

  try {
    const decoded = decodeToken(token);
    if (!decoded || typeof decoded.exp !== "number") return true;

    const expirationTime = decoded.exp * 1000;
    const currentTime = Date.now();

    return currentTime >= expirationTime - 5000;
  } catch {
    return true;
  }
}

export function decodeToken(token: string): Record<string, unknown> | null {
  try {
    const base64Url = token.split(".")[1];
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    return JSON.parse(atob(base64)) as Record<string, unknown>;
  } catch (error) {
    console.error("Invalid token:", error);
    return null;
  }
}

export async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {},
  baseUrl: string = API_BASE_URL
): Promise<T> {
  const token = getToken();
  const baseVariants = [baseUrl];
  const trimmedBase = baseUrl.replace(/\/api\/?$/, "");
  if (trimmedBase && trimmedBase !== baseUrl) {
    baseVariants.push(trimmedBase);
  }

  const isFormData = options.body instanceof FormData;
  let lastError: Error | null = null;

  for (let i = 0; i < baseVariants.length; i++) {
    const currentBase = baseVariants[i];
    const isLastBase = i === baseVariants.length - 1;
    const url = `${currentBase}${endpoint}`;

    const headers: Record<string, string> = {
      ...(options.headers as Record<string, string> | undefined),
    };

    if (!isFormData) {
      headers["Content-Type"] = "application/json";
    }

    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    if (isFormData) {
      delete headers["Content-Type"];
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      });

      if (response.ok) {
        return await response.json();
      }

      if (response.status === 401) {
        removeToken();
        if (typeof window !== "undefined" && window.location.pathname !== "/signin" && window.location.pathname !== "/login") {
          window.location.href = "/login";
        }
        throw new Error("Unauthorized");
      }

      const errorText = await response.text();
      let parsedError: { message?: string; error?: string } | null = null;

      try {
        parsedError = JSON.parse(errorText);
      } catch {
        parsedError = { message: errorText || "Request failed" };
      }

      const message = parsedError?.message || parsedError?.error || `HTTP error! status: ${response.status}`;
      const error = new Error(message);

      if (response.status === 404 && !isLastBase) {
        lastError = error;
        continue;
      }

      throw error;
    } catch (error) {
      if (error instanceof Error && /404|Route not found/i.test(error.message) && !isLastBase) {
        lastError = error;
        continue;
      }
      throw error;
    }
  }

  throw lastError || new Error("Request failed");
}

export function handleAuthError(): void {
  removeToken();
  if (typeof window !== "undefined" && window.location.pathname !== "/signin" && window.location.pathname !== "/login") {
    window.location.href = "/login";
  }
}
