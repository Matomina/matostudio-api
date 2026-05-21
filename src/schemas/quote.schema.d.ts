import { z } from "zod";
export declare const quoteSchema: z.ZodObject<{
    name: z.ZodString;
    email: z.ZodString;
    phone: z.ZodUnion<[z.ZodOptional<z.ZodString>, z.ZodLiteral<"">]>;
    projectType: z.ZodString;
    pageCount: z.ZodNumber;
    options: z.ZodDefault<z.ZodArray<z.ZodString>>;
    deadline: z.ZodString;
    estimate: z.ZodNumber;
    message: z.ZodUnion<[z.ZodOptional<z.ZodString>, z.ZodLiteral<"">]>;
}, z.core.$strip>;
export type QuotePayload = z.infer<typeof quoteSchema>;
//# sourceMappingURL=quote.schema.d.ts.map