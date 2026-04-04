import { describe, expect, it } from 'vitest';
import { normalizeNextPath, resolvePostAuthRedirectPath } from './navigation';

describe('navigation helpers', () => {
  it('normalizes unsafe next path to dashboard', () => {
    expect(normalizeNextPath(null)).toBe('/dashboard');
    expect(normalizeNextPath('https://evil.test')).toBe('/dashboard');
    expect(normalizeNextPath('//evil.test')).toBe('/dashboard');
  });

  it('keeps safe local path', () => {
    expect(normalizeNextPath('/admin')).toBe('/admin');
  });

  it('redirects admin from default dashboard to admin screen', () => {
    expect(
      resolvePostAuthRedirectPath({ role: 'admin' }, '/dashboard')
    ).toBe('/admin');
  });

  it('keeps explicit next path for customer', () => {
    expect(
      resolvePostAuthRedirectPath({ role: 'customer' }, '/dashboard')
    ).toBe('/dashboard');
  });
});
