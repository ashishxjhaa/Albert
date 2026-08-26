import { z } from "zod";

export const RegisterSchema = z.object({
  name: z.string().min(5),
  email: z.email(),
  password: z.string().min(6),
  image: z.string().optional(),
});

export const LoginSchema = z.object({
  email: z.email(),
  password: z.string().min(6),
});

export type RegisterInput = z.infer<typeof RegisterSchema>;
export type LoginInput = z.infer<typeof LoginSchema>;
