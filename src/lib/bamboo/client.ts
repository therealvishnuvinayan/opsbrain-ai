import "server-only";

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

export async function getBambooJson<T>(path: string): Promise<T> {
  const url = buildBambooUrl(path);
  const token = getRequiredEnv("BAMBOO_SWAGGER_BEARER_TOKEN");
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12000);

  try {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
      },
      cache: "no-store",
      signal: controller.signal,
    });

    if (!response.ok) {
      const message = await response.text().catch(() => "");
      console.error("Bamboo Swagger request failed", {
        path,
        status: response.status,
        body: message.slice(0, 400),
      });
      throw new Error(`Bamboo request failed with status ${response.status}.`);
    }

    return (await response.json()) as T;
  } catch (error) {
    console.error("Bamboo Swagger request error", {
      path,
      message: error instanceof Error ? error.message : "Unknown Bamboo request error",
    });
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}
