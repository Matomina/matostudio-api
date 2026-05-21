import cors from "cors";
import express from "express";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import { env } from "./config/env.js";
import { contactRouter } from "./routes/contact.routes.js";
import { healthRouter } from "./routes/health.routes.js";
import { quoteRouter } from "./routes/quote.routes.js";
export const app = express();
app.set("trust proxy", 1);
app.use(helmet());
app.use(cors({
    origin: env.frontendOrigin,
    methods: ["GET", "POST"],
}));
app.use(express.json({ limit: "100kb" }));
app.use(rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 100,
    standardHeaders: true,
    legacyHeaders: false,
}));
app.use(healthRouter);
app.use(contactRouter);
app.use(quoteRouter);
app.use((_request, response) => {
    response.status(404).json({
        error: "Not found",
    });
});
//# sourceMappingURL=app.js.map