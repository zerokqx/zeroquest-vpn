import { z } from 'zod';

const LOGIN_PATTERN = /^[a-zA-Z0-9._-]+$/;

export const authCredentialsSchema = z.object({
  login: z
    .string()
    .trim()
    .min(3, 'Логин должен содержать минимум 3 символа')
    .max(24, 'Логин не должен быть длиннее 24 символов')
    .regex(
      LOGIN_PATTERN,
      'Используйте латиницу, цифры, точку, дефис или нижнее подчёркивание'
    ),
  password: z
    .string()
    .min(8, 'Пароль должен содержать минимум 8 символов')
    .max(72, 'Пароль не должен быть длиннее 72 символов'),
});

export const registerFormSchema = authCredentialsSchema
  .extend({
    confirmPassword: z.string().min(1, 'Повторите пароль'),
  })
  .superRefine((value, context) => {
    if (value.password !== value.confirmPassword) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Пароли не совпадают',
        path: ['confirmPassword'],
      });
    }
  });

export type AuthCredentialsInput = z.infer<typeof authCredentialsSchema>;
export type RegisterFormInput = z.infer<typeof registerFormSchema>;
