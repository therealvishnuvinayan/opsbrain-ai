function isRealSecret(value: string | undefined) {
  if (!value) {
    return false;
  }

  const trimmed = value.trim();

  if (!trimmed) {
    return false;
  }

  return ![
    "your_google_client_id",
    "your_google_client_secret",
    "replace_me",
    "dev_only_replace_with_strong_secret",
  ].includes(trimmed);
}

function isEnabled(value: string | undefined, defaultValue = false) {
  if (!value) {
    return defaultValue;
  }

  const normalized = value.trim().toLowerCase();

  if (!normalized) {
    return defaultValue;
  }

  return ["1", "true", "yes", "on"].includes(normalized);
}

export const isGoogleOAuthConfigured =
  isRealSecret(process.env.GOOGLE_CLIENT_ID) &&
  isRealSecret(process.env.GOOGLE_CLIENT_SECRET);

export const usePrismaAuthAdapter = isEnabled(
  process.env.NEXTAUTH_USE_PRISMA_ADAPTER,
  true
);
