import { z } from "zod";
export const contactSchema = z.object({
    name: z.string().trim().min(2).max(120),
    email: z.string().trim().email().max(180),
    phone: z.string().trim().max(40).optional().or(z.literal("")),
    projectType: z.string().trim().min(2).max(120),
    budget: z.string().trim().min(2).max(120),
    timeline: z.string().trim().min(2).max(120),
    message: z.string().trim().min(10).max(3000),
});
//# sourceMappingURL=contact.schema.js.map