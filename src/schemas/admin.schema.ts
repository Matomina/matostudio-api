import { z } from "zod";

export const adminLoginSchema = z.object({
  password: z.string().min(1).max(200),
});

export const leadStatusSchema = z.object({
  status: z.enum(["new", "to_call", "in_discussion", "quote_sent", "won", "lost", "archived"]),
});

export const leadNoteSchema = z.object({
  internalNote: z.string().max(2000).optional().or(z.literal("")),
});

export type AdminLoginPayload = z.infer<typeof adminLoginSchema>;
export type LeadStatus = z.infer<typeof leadStatusSchema>["status"];
