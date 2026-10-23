import { z } from "zod"
export const brandProfileSchema = z.object({
  companyName: z.string().trim().min(1).max(100),
  websiteUrl: z.string().url().refine(value => /^https?:\/\//i.test(value)),
  niche: z.string().trim().max(2000).optional(),
  alternativeNames: z.array(z.string().trim().min(1).max(100)).max(30).optional(),
  competitors: z.array(z.string().trim().min(1).max(200)).max(10).optional(),
  customPrompts: z.array(z.object({ id: z.string().min(1).max(100), text: z.string().trim().min(1).max(1000), enabled: z.boolean() })).max(50).optional(),
})
