import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import * as schema from "@repo/database";

const connectionString = process.env.DATABASE_URL!;
const poolClient = postgres(connectionString, { max: 1 });
const db = drizzle(poolClient, { schema });

// Social login parity with the Hono Worker instance (apps/api/src/auth.ts):
// same providers, same safety flags. THIS INSTANCE IS NOT ON THE REQUEST
// PATH — the admin app validates sessions through Hono (see
// src/lib/get-server-session.ts) and the browser talks to /api/auth/*,
// which proxies to Hono. So its providers are sourced from env vars
// (GOOGLE_CLIENT_ID/SECRET, GITHUB_CLIENT_ID/SECRET) as a static
// fallback, while the LIVE config comes from Settings → Social Login
// (settings-table key "social_login") and is read by the Hono instance
// with a 60 s TTL cache. Keep the two in sync: if a provider option
// changes here, change it in apps/api/src/auth.ts too, and vice versa.
function envProvider(
  clientId: string | undefined,
  clientSecret: string | undefined,
) {
  return clientId && clientSecret ? { clientId, clientSecret } : null;
}

const googleEnv = envProvider(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
);
const githubEnv = envProvider(
  process.env.GITHUB_CLIENT_ID,
  process.env.GITHUB_CLIENT_SECRET,
);

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
  account: {
    modelName: "ba_account",
    // Mirror of the Hono instance — see apps/api/src/auth.ts for the
    // full reasoning (admin users have emailVerified=false from email
    // sign-up, so the default linking gate would refuse every link;
    // disableImplicitSignUp above removes the takeover the gate guards
    // against; requireLocalEmailVerified is deprecated in 1.7.x).
    accountLinking: {
      enabled: true,
      trustedProviders: ["google", "github"],
      requireLocalEmailVerified: false,
    },
  },
  verification: { modelName: "ba_verification" },
  emailAndPassword: { enabled: true },
  // Only providers with both env halves are registered; an absent env
  // pair means "not configured", exactly like an unconfigured provider
  // in Settings on the Hono side.
  socialProviders: {
    ...(googleEnv
      ? {
          google: {
            ...googleEnv,
            // NO self-registration through social (mirror of the Hono
            // instance): only an email that already has a ba_user row
            // can sign in with Google/GitHub.
            disableImplicitSignUp: true,
          },
        }
      : {}),
    ...(githubEnv
      ? {
          github: {
            ...githubEnv,
            disableImplicitSignUp: true,
          },
        }
      : {}),
  },
  // OAuth failures go back to the admin login page with ?error=<code>
  // (mirror of the Hono instance; the default /error page does not
  // exist in the admin app).
  onAPIError: {
    errorURL: "/auth/login",
  },
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
