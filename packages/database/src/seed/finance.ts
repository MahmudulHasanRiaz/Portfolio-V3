import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import * as schema from "../schema";

export async function seedFinance(db: PostgresJsDatabase<typeof schema>) {
  const paymentMethods = await db.insert(schema.paymentMethods).values([
    {
      name: "bKash",
      type: "mobile_banking",
      isActive: true,
    },
    {
      name: "Bank Transfer",
      type: "bank",
      isActive: true,
    },
    {
      name: "Cash",
      type: "cash",
      isActive: true,
    },
  ]).returning();

  await db.insert(schema.financePayments).values({
    sourceType: "freelance_project",
    amount: "3000",
    currency: "USD",
    paymentMethodId: paymentMethods.find(p => p.name === "bKash")!.id,
    paymentDate: "2026-05-20",
    paymentType: "advance",
    notes: "Initial deposit for Restaurant Booking System project",
  });

  await db.insert(schema.financeExpenses).values({
    sourceType: "general",
    category: "Software & Tools",
    description: "Annual subscription - JetBrains All Products Pack",
    amount: "649",
    currency: "USD",
    paymentMethodId: paymentMethods.find(p => p.name === "Bank Transfer")!.id,
    expenseDate: "2026-01-15",
    receiptUrl: "/receipts/jetbrains-2026.pdf",
  });

  console.log(`Seeded ${paymentMethods.length} payment methods, 1 payment, 1 expense`);
}
