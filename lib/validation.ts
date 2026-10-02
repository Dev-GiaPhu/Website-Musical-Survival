import { z } from "zod";

export const usernameSchema = z
  .string()
  .trim()
  .min(3, "Tên người chơi cần ít nhất 3 ký tự.")
  .max(20, "Tên người chơi tối đa 20 ký tự.")
  .regex(/^[a-zA-Z0-9_]+$/, "Chỉ dùng chữ, số và dấu gạch dưới.");

export const profileSchema = z.object({
  displayName: z.string().trim().min(1).max(32)
});

export const newsSchema = z.object({
  title: z.string().trim().min(3).max(120),
  summary: z.string().trim().min(3).max(280),
  content: z.string().trim().min(3).max(20000),
  published: z.boolean().default(false)
});

export const topupSchema = z.object({
  packageId: z.string().uuid()
});
