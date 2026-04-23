import { describe, expect, it } from 'vitest';
import {
  REPO_HOST_ALLOWLIST,
  parseRepoDisplayName,
  shortSha,
  validateRepoSource,
} from './repoSource';

describe('validateRepoSource — URL', () => {
  it('accepts https URLs on each allowlisted host', () => {
    for (const host of REPO_HOST_ALLOWLIST) {
      const result = validateRepoSource(`https://${host}/acme/widget`, '');
      expect(result.ok).toBe(true);
      if (result.ok === true) {
        expect(result.url).toMatch(new RegExp(`^https://${host}/acme/widget`));
      }
    }
  });

  it('accepts a .git suffix', () => {
    const result = validateRepoSource('https://github.com/acme/widget.git', '');
    expect(result.ok).toBe(true);
  });

  it('strips www. when checking the allowlist', () => {
    const result = validateRepoSource('https://www.github.com/acme/widget', '');
    expect(result.ok).toBe(true);
  });

  it('rejects blank input with a url-field error', () => {
    const result = validateRepoSource('   ', '');
    expect(result).toEqual({ ok: false, field: 'url', error: 'Repository URL is required.' });
  });

  it('rejects non-https schemes', () => {
    for (const bad of [
      'http://github.com/acme/widget',
      'ssh://github.com/acme/widget',
      'git@github.com:acme/widget.git',
      'file:///tmp/repo',
    ]) {
      const result = validateRepoSource(bad, '');
      expect(result.ok).toBe(false);
    }
  });

  it('rejects embedded credentials', () => {
    const result = validateRepoSource('https://user:token@github.com/acme/widget', '');
    expect(result).toMatchObject({ ok: false, field: 'url' });
    if (result.ok === false) {
      expect(result.error).toMatch(/credentials/i);
    }
  });

  it('rejects disallowed hosts', () => {
    const result = validateRepoSource('https://evil.example.com/acme/widget', '');
    expect(result).toMatchObject({ ok: false, field: 'url' });
    if (result.ok === false) {
      expect(result.error).toMatch(/github\.com.*gitlab\.com.*bitbucket\.org/);
    }
  });

  it('rejects malformed URLs', () => {
    expect(validateRepoSource('not a url', '').ok).toBe(false);
    expect(validateRepoSource('https://', '').ok).toBe(false);
  });

  it('rejects host-only URLs with no repo path', () => {
    const result = validateRepoSource('https://github.com/', '');
    expect(result).toMatchObject({ ok: false, field: 'url' });
    const result2 = validateRepoSource('https://github.com/acme', '');
    expect(result2).toMatchObject({ ok: false, field: 'url' });
  });

  it('rejects URLs longer than 400 characters', () => {
    const long = `https://github.com/acme/${'a'.repeat(500)}`;
    const result = validateRepoSource(long, '');
    expect(result).toMatchObject({ ok: false, field: 'url' });
  });
});

describe('validateRepoSource — ref', () => {
  it('returns ref undefined when blank', () => {
    const result = validateRepoSource('https://github.com/acme/widget', '   ');
    expect(result).toEqual({
      ok: true,
      url: 'https://github.com/acme/widget',
      ref: undefined,
    });
  });

  it('accepts typical git refs', () => {
    for (const ref of ['main', 'release/v1.2.3', 'feature_branch-01', 'v1.0.0']) {
      const result = validateRepoSource('https://github.com/acme/widget', ref);
      expect(result.ok).toBe(true);
      if (result.ok) expect(result.ref).toBe(ref);
    }
  });

  it('rejects shell metacharacters in refs', () => {
    for (const bad of ['; rm -rf /', 'main && echo pwn', '`whoami`', '$(echo x)']) {
      const result = validateRepoSource('https://github.com/acme/widget', bad);
      expect(result).toMatchObject({ ok: false, field: 'ref' });
    }
  });

  it('rejects refs longer than 200 characters', () => {
    const result = validateRepoSource('https://github.com/acme/widget', 'a'.repeat(201));
    expect(result).toMatchObject({ ok: false, field: 'ref' });
  });
});

describe('parseRepoDisplayName', () => {
  it('returns host + path, stripping www. and .git', () => {
    expect(parseRepoDisplayName('https://github.com/acme/widget')).toBe('github.com/acme/widget');
    expect(parseRepoDisplayName('https://www.github.com/acme/widget.git')).toBe(
      'github.com/acme/widget',
    );
  });

  it('returns null for missing or malformed input', () => {
    expect(parseRepoDisplayName(null)).toBeNull();
    expect(parseRepoDisplayName(undefined)).toBeNull();
    expect(parseRepoDisplayName('not a url')).toBeNull();
  });
});

describe('shortSha', () => {
  it('truncates to 7 characters by default', () => {
    expect(shortSha('deadbeefcafebabe')).toBe('deadbee');
  });

  it('honors a custom length', () => {
    expect(shortSha('deadbeefcafebabe', 12)).toBe('deadbeefcafe');
  });

  it('returns null for missing input', () => {
    expect(shortSha(null)).toBeNull();
    expect(shortSha(undefined)).toBeNull();
  });
});
