import { z } from "zod";

export const userRoleEnum = z.enum(["ADMIN", "STAFF"]);

export const createUserSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  username: z
    .string()
    .trim()
    .min(3, "Username must be at least 3 characters")
    .regex(/^[a-zA-Z0-9._-]+$/, "Only letters, numbers, dots, dashes and underscores"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  role: userRoleEnum,
  pin: z
    .string()
    .trim()
    .optional()
    .transform((v) => (v ? v : undefined)),
});

export type CreateUserValues = z.infer<typeof createUserSchema>;

export const updateUserSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  role: userRoleEnum,
  pin: z
    .string()
    .trim()
    .optional()
    .transform((v) => (v ? v : undefined)),
});

export type UpdateUserValues = z.infer<typeof updateUserSchema>;

export const resetPasswordSchema = z.object({
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export type ResetPasswordValues = z.infer<typeof resetPasswordSchema>;
