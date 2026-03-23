import "server-only";

import { buildCacheKey, getOrSetMemoryCache } from "@/lib/ops/runtime/memory-cache";
import { retryAsync, withTimeout } from "@/lib/ops/runtime/external-request";

export class BambooRequestError extends Error {
  status?: number;
  path: string;
  responseBody?: string;

  constructor(path: string, message: string, options?: { status?: number; responseBody?: string }) {
    super(message);
    this.name = "BambooRequestError";
    this.path = path;
    this.status = options?.status;
    this.responseBody = options?.responseBody;
  }
}

function getRequiredEnv(name: "BAMBOO_SWAGGER_BASE_URL" | "BAMBOO_SWAGGER_BEARER_TOKEN") {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(`${name} is not configured.`);
  }

  return value;
}

function buildBambooUrl(path: string) {
  const baseUrl = getRequiredEnv("BAMBOO_SWAGGER_BASE_URL").replace(/\/+$/, "");
  const nextPath = path.startsWith("/") ? path : `/${path}`;
  return `${baseUrl}${nextPath}`;
}

type BambooQueryValue = string | number | boolean | null | undefined;

function buildUrlWithQuery(path: string, query?: Record<string, BambooQueryValue>) {
  const url = new URL(buildBambooUrl(path));

  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value === null || value === undefined || value === "") {
        continue;
      }

      url.searchParams.set(key, String(value));
    }
  }

  return url.toString();
}

export async function getBambooJson<T>(
  path: string,
  query?: Record<string, BambooQueryValue>
): Promise<T> {
  const cacheKey = buildCacheKey(["bamboo", path, query ?? null]);

  return getOrSetMemoryCache(cacheKey, 30_000, async () => {
    const url = buildUrlWithQuery(path, query);
    const token = getRequiredEnv("BAMBOO_SWAGGER_BEARER_TOKEN");

    try {
      return await retryAsync({
        attempts: 2,
        retryDelayMs: 300,
        shouldRetry: (error) => {
          if (error instanceof BambooRequestError) {
            return error.status !== undefined && error.status >= 500;
          }

          return error instanceof Error && error.message.toLowerCase().includes("timeout");
        },
        factory: async () =>
          withTimeout(
            async (signal) => {
              const response = await fetch(url, {
                method: "GET",
                headers: {
                  Accept: "application/json",
                  Authorization: `Bearer ${token}`,
                },
                cache: "no-store",
                signal,
              });

              if (!response.ok) {
                const message = await response.text().catch(() => "");
                console.error("Bamboo Swagger request failed", {
                  path,
                  status: response.status,
                  body: message.slice(0, 400),
                });
                throw new BambooRequestError(
                  path,
                  `Bamboo request failed with status ${response.status}.`,
                  {
                    status: response.status,
                    responseBody: message.slice(0, 400),
                  }
                );
              }

              return (await response.json()) as T;
            },
            12_000,
            `Bamboo request timed out for ${path}.`
          ),
      });
    } catch (error) {
      console.error("Bamboo Swagger request error", {
        path,
        message: error instanceof Error ? error.message : "Unknown Bamboo request error",
      });
      throw error;
    }
  });
}
