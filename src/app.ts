import cookieParser from "cookie-parser";
import cors, { type CorsOptions } from "cors";
import express from "express";
import rateLimit from "express-rate-limit";
import helmet from "helmet";

import { env } from "./config/env.js";
import { adminRouter } from "./routes/admin.routes.js";
import { contactRouter } from "./routes/contact.routes.js";
import { healthRouter } from "./routes/health.routes.js";
import { quoteRouter } from "./routes/quote.routes.js";
import { stripeRouter } from "./routes/stripe.routes.js";

export const app = express();

app.set("trust proxy", 1);

app.use(helmet());

const corsOptions: CorsOptions = {
  origin(origin, callback) {
    if (!origin || env.frontendOrigins.includes(origin)) {
      callback(null, true);
      return;
    }
    callback(new Error(`Origin not allowed by CORS: ${origin}`));
  },
  methods: ["GET", "POST", "PATCH"],
  credentials: true,
};

app.use(cors(corsOptions));
app.use(cookieParser());

// Stripe webhook needs raw body — must be registered before express.json()
app.use("/api/stripe/webhook", express.raw({ type: "application/json" }));

app.use(express.json({ limit: "100kb" }));

app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 100,
    standardHeaders: true,
    legacyHeaders: false,
  }),
);

const formRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: "Too many requests. Please try again later." },
});

app.use(healthRouter);
app.use("/api/contact", formRateLimit);
app.use("/api/quote", formRateLimit);
app.use(contactRouter);
app.use(quoteRouter);
app.use(adminRouter);
app.use(stripeRouter);

app.use((_request, response) => {
  response.status(404).json({
    error: "Not found",
  });
});
