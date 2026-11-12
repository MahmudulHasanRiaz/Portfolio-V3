import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import * as schema from "@repo/database";

const connectionString = process.env.DATABASE_URL!;
const poolClient = postgres(connectionString, { max: 1 });
const db = drizzle(poolClient, { schema });

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: {
      ba_user: schema.baUser,
      ba_session: schema.baSession,
      ba_account: schema.baAccount,
      ba_verification: schema.baVerification,
    },
  }),
  user: { modelName: "ba_user" },
  session: { modelName: "ba_session" },
  account: { modelName: "ba_account" },
  verification: { modelName: "ba_verification" },
  emailAndPassword: { enabled: true },
  databaseHooks: {
    user: {
      create: {
        after: async (user) => {
          const sql = postgres(connectionString, { max: 1 });
          try {
            await sql`
              INSERT INTO users (email, name, is_active)
              VALUES (${user.email}, ${user.name}, true)
              ON CONFLICT (email) DO NOTHING
            `;
          } finally {
            await sql.end();
          }
        },
      },
    },
  },
});
