ALTER TABLE "Quote" ADD COLUMN "storefrontRequestId" TEXT;
ALTER TABLE "Quote" ADD COLUMN "storefrontTokenHash" TEXT;
ALTER TABLE "Quote" ADD COLUMN "configurationFingerprint" TEXT;
CREATE UNIQUE INDEX "Quote_shop_storefrontRequestId_key" ON "Quote"("shop", "storefrontRequestId");
