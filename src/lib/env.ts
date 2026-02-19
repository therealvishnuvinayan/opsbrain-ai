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

export const isGoogleOAuthConfigured =
  isRealSecret(process.env.GOOGLE_CLIENT_ID) &&
  isRealSecret(process.env.GOOGLE_CLIENT_SECRET);
