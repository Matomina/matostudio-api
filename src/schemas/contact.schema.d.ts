import { z } from "zod";
export declare const contactSchema: z.ZodObject<{
    name: z.ZodString;
    email: z.ZodString;
    phone: z.ZodUnion<[z.ZodOptional<z.ZodString>, z.ZodLiteral<"">]>;
    projectType: z.ZodString;
    budget: z.ZodString;
    timeline: z.ZodString;
    message: z.ZodString;
}, z.core.$strip>;
export type ContactPayload = z.infer<typeof contactSchema>;
//# sourceMappingURL=contact.schema.d.ts.map