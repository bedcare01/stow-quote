import { z } from "zod";
const option = z.object({ description:z.string().trim().min(1).max(200), pricePence:z.number().int().nonnegative() });
export const quoteInputSchema = z.object({
  customerName:z.string().trim().min(1).max(150), customerEmail:z.email(),
  seatingFullPricePence:z.number().int().nonnegative(), deliveryCostPence:z.number().int().nonnegative(),
  additionalOptions:z.array(option).max(50), specification:z.record(z.string(), z.unknown())
});
