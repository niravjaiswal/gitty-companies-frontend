export const REPO_HOST_ALLOWLIST = ['github.com', 'gitlab.com', 'bitbucket.org'] as const;

const REF_PATTERN = /^[A-Za-z0-9._\-/]+$/;
const REF_MAX_LENGTH = 200;
const URL_MAX_LENGTH = 400;

export interface RepoSourceValidation {
  ok: boolean;
  url?: string;
  ref?: string;
  field?: 'url' | 'ref';
  error?: string;
}

function fail(field: 'url' | 'ref', error: string): RepoSourceValidation {
  return { ok: false, field, error };
}

export function validateRepoSource(urlInput: string, refInput: string): RepoSourceValidation {
  const trimmedUrl = urlInput.trim();
  if (!trimmedUrl) {
    return fail('url', 'Repository URL is required.');
  }
  if (trimmedUrl.length > URL_MAX_LENGTH) {
    return fail('url', `Repository URL must be ${URL_MAX_LENGTH} characters or fewer.`);
  }

  let parsed: URL;
  try {
    parsed = new URL(trimmedUrl);
  } catch {
    return fail('url', 'Repository URL is not a valid URL.');
  }

  if (parsed.protocol !== 'https:') {
    return fail('url', 'Repository URL must start with https://.');
  }

  if (parsed.username || parsed.password) {
    return fail('url', 'URL must not include embedded credentials.');
  }

  const host = parsed.hostname.toLowerCase().replace(/^www\./, '');
  if (!REPO_HOST_ALLOWLIST.includes(host as (typeof REPO_HOST_ALLOWLIST)[number])) {
    return fail(
      'url',
      'Only github.com, gitlab.com, and bitbucket.org repositories are supported.',
    );
  }

  if (parsed.pathname.replace(/\.git$/, '').split('/').filter(Boolean).length < 2) {
    return fail(
      'url',
      'URL must point at a specific repository (e.g. https://github.com/owner/repo).',
    );
  }

  const trimmedRef = refInput.trim();
  let ref: string | undefined;
  if (trimmedRef) {
    if (trimmedRef.length > REF_MAX_LENGTH) {
      return fail('ref', `Ref must be ${REF_MAX_LENGTH} characters or fewer.`);
    }
    if (!REF_PATTERN.test(trimmedRef)) {
      return fail(
        'ref',
        'Ref may only contain letters, numbers, dots, underscores, hyphens, and slashes.',
      );
    }
    ref = trimmedRef;
  }

  return { ok: true, url: parsed.toString(), ref };
}

export function parseRepoDisplayName(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.toLowerCase().replace(/^www\./, '');
    const path = parsed.pathname.replace(/\/$/, '').replace(/\.git$/, '');
    return `${host}${path}`;
  } catch {
    return null;
  }
}

export function shortSha(sha: string | null | undefined, length = 7): string | null {
  if (!sha) return null;
  return sha.slice(0, length);
}
