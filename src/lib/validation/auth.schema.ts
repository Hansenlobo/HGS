import { z } from "zod";

export const loginSchema = z.object({
  username: z.string().trim().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
});

export type LoginValues = z.infer<typeof loginSchema>;

export const bootstrapAdminSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  username: z.string().trim().min(3, "Username must be at least 3 characters"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export type BootstrapAdminValues = z.infer<typeof bootstrapAdminSchema>;
