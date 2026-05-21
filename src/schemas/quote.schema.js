import { z } from "zod";
export const quoteSchema = z.object({
    name: z.string().trim().min(2).max(120),
    email: z.string().trim().email().max(180),
    phone: z.string().trim().max(40).optional().or(z.literal("")),
    projectType: z.string().trim().min(2).max(120),
    pageCount: z.number().int().min(1).max(30),
    options: z.array(z.string().trim().min(1).max(120)).default([]),
    deadline: z.string().trim().min(2).max(120),
    estimate: z.number().min(0).max(100000),
    message: z.string().trim().max(3000).optional().or(z.literal("")),
});
//# sourceMappingURL=quote.schema.js.map