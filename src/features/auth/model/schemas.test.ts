import { describe, expect, it } from 'vitest';
import { authCredentialsSchema, registerFormSchema } from './schemas';

describe('auth schemas', () => {
  it('accepts valid credentials', () => {
    const result = authCredentialsSchema.safeParse({
      login: 'zerok_test',
      password: 'super-pass-123',
    });

    expect(result.success).toBe(true);
  });

  it('rejects invalid login', () => {
    const result = authCredentialsSchema.safeParse({
      login: 'кириллица',
      password: 'super-pass-123',
    });

    expect(result.success).toBe(false);
  });

  it('rejects mismatched register passwords', () => {
    const result = registerFormSchema.safeParse({
      login: 'zerok_test',
      password: 'super-pass-123',
      confirmPassword: 'different-pass-123',
    });

    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.path).toEqual(['confirmPassword']);
  });
});
