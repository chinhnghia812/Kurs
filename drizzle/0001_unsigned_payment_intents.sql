ALTER TABLE "payments" ADD COLUMN "sender_address" text;
ALTER TABLE "payments" ADD COLUMN "recipient_address" text;
ALTER TABLE "payments" ADD COLUMN "idempotency_key" text;
ALTER TABLE "payments" ADD COLUMN "unsigned_xdr" text;
ALTER TABLE "payments" ADD COLUMN "unsigned_tx_digest" text;
CREATE UNIQUE INDEX "payments_idempotency_key_idx" ON "payments" USING btree ("idempotency_key");
