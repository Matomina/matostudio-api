import type { ContactPayload } from "../schemas/contact.schema.js";
import type { QuotePayload } from "../schemas/quote.schema.js";
export declare function sendContactEmail(payload: ContactPayload): Promise<{
    mode: string;
    sent: boolean;
}>;
export declare function sendQuoteEmail(payload: QuotePayload): Promise<{
    mode: string;
    sent: boolean;
}>;
//# sourceMappingURL=mail.service.d.ts.map