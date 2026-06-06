-- Add reference and finalAmount fields to Lead
ALTER TABLE "Lead" ADD COLUMN "reference" TEXT;
ALTER TABLE "Lead" ADD COLUMN "finalAmount" DOUBLE PRECISION;

-- CreateTable EmailLog
CREATE TABLE "EmailLog" (
    "id" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "recipient" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "providerMessageId" TEXT,
    "errorMessage" TEXT,
    "sentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "EmailLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable PaymentRequest
CREATE TABLE "PaymentRequest" (
    "id" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'eur',
    "stripeCheckoutSessionId" TEXT,
    "stripePaymentIntentId" TEXT,
    "checkoutUrl" TEXT,
    "qrCodeDataUrl" TEXT,
    "status" TEXT NOT NULL DEFAULT 'CREATED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "paidAt" TIMESTAMP(3),
    CONSTRAINT "PaymentRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex unique constraint on PaymentRequest.leadId
CREATE UNIQUE INDEX "PaymentRequest_leadId_key" ON "PaymentRequest"("leadId");

-- AddForeignKey EmailLog.leadId -> Lead.id
ALTER TABLE "EmailLog" ADD CONSTRAINT "EmailLog_leadId_fkey"
    FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey PaymentRequest.leadId -> Lead.id
ALTER TABLE "PaymentRequest" ADD CONSTRAINT "PaymentRequest_leadId_fkey"
    FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
