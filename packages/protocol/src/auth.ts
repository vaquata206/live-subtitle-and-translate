import { z } from 'zod';

export const GoogleLoginQuerySchema = z.object({
  returnTo: z.string().max(128).optional(),
});

export const GoogleOAuthCallbackSchema = z
  .object({
    code: z.string().min(1).max(4096).optional(),
    state: z.string().min(32).max(128),
    error: z.string().min(1).max(128).optional(),
  })
  .refine(({ code, error }) => Boolean(code) !== Boolean(error));

export const GoogleTokenResponseSchema = z.object({
  access_token: z.string().min(1).max(8192),
  token_type: z.string().regex(/^bearer$/i),
  expires_in: z.number().int().positive().optional(),
  scope: z.string().max(4096).optional(),
});

export const GoogleUserInfoSchema = z.object({
  sub: z.string().min(1).max(255),
  email: z.email().transform((email) => email.trim().toLowerCase()),
  email_verified: z.boolean(),
  name: z.string().trim().max(200).nullish(),
  picture: z.url().max(2048).nullish(),
});
