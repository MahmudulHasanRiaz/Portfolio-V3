import postgres from "postgres";
import { getDatabaseConfig } from "../config";
import { randomUUID } from "crypto";

async function main() {
  const config = getDatabaseConfig();
  const sql = postgres(config.DATABASE_URL, { max: 1 });

  const email = process.env.SEED_EMAIL || "admin@example.com";
  const password = process.env.SEED_PASSWORD || "password123";
  const name = process.env.SEED_NAME || "Admin";

  const existing = await sql`SELECT id FROM ba_user WHERE email = ${email} LIMIT 1`;

  if (existing.length > 0) {
    console.log(`User ${email} already exists.`);
    const internal = await sql`SELECT id FROM users WHERE email = ${email} LIMIT 1`;
    let internalId: string;
    if (internal.length === 0) {
      internalId = randomUUID();
      await sql`INSERT INTO users (id, email, name, is_active) VALUES (${internalId}, ${email}, ${name}, true)`;
      console.log(`Synced internal user for ${email}`);
    } else if (internal[0]) {
      internalId = internal[0].id;
    } else {
      throw new Error(`User not found and could not be created for ${email}`);
    }
    const hasRole = await sql`SELECT 1 FROM user_roles ur JOIN roles r ON ur.role_id = r.id WHERE ur.user_id = ${internalId} AND r.name = 'Super Admin' LIMIT 1`;
    if (hasRole.length === 0) {
      const role = await sql`SELECT id FROM roles WHERE name = 'Super Admin' LIMIT 1`;
      if (role.length > 0) {
        const roleId = role[0]?.id;
        if (roleId) {
          await sql`INSERT INTO user_roles (user_id, role_id) VALUES (${internalId}, ${roleId})`;
          console.log(`Assigned Super Admin role.`);
        }
      }
    }
    await sql.end();
    return;
  }

  const { hashPassword } = await import("@better-auth/utils/password");
  const hashed = await hashPassword(password);
  const userId = randomUUID();
  const accountId = randomUUID();

  await sql`
    INSERT INTO ba_user (id, email, name, email_verified, created_at, updated_at)
    VALUES (${userId}, ${email}, ${name}, true, now(), now())
  `;

  await sql`
    INSERT INTO ba_account (id, user_id, account_id, provider_id, password, created_at, updated_at)
    VALUES (${accountId}, ${userId}, ${userId}, 'credential', ${hashed}, now(), now())
  `;

  const existingInternal = await sql`SELECT id FROM users WHERE email = ${email} LIMIT 1`;
  let internalId: string;
  if (existingInternal.length > 0) {
    internalId = existingInternal[0]?.id ?? randomUUID();
  } else {
    internalId = randomUUID();
    await sql`INSERT INTO users (id, email, name, is_active) VALUES (${internalId}, ${email}, ${name}, true)`;
  }

  const role = await sql`SELECT id FROM roles WHERE name = 'Super Admin' LIMIT 1`;

  if (role.length > 0) {
    if (role[0]) {
      await sql`INSERT INTO user_roles (user_id, role_id) VALUES (${internalId}, ${role[0].id})`;
    }
  }

  console.log(`Created user: ${email} / ${password}`);
  await sql.end();
  process.exit(0);
}

main().catch((error) => {
  console.error("Failed:", error);
  process.exit(1);
});
