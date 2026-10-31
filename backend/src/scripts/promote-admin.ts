// Bootstrap the first super admin: staff roles cannot self-register (api-spec §3.2) and
// PATCH /admin/users/:id/role needs an admin already. Register normally first, then:
//   npm run admin:promote -- someone@example.com
import { connectDatabase, disconnectDatabase } from "../config/db";
import { userRepository } from "../repositories/user.repository";

async function main() {
  const email = process.argv[2]?.trim();
  if (!email || !email.includes("@")) {
    console.error("Usage: npm run admin:promote -- <registered-email>");
    process.exitCode = 1;
    return;
  }

  await connectDatabase();
  try {
    const user = await userRepository.updateRoleByEmail(email, "super_admin");
    if (!user) {
      console.error(`No user with email ${email}. Register through /auth first.`);
      process.exitCode = 1;
      return;
    }
    // The role lives in the JWT, so it applies after the user logs in again.
    console.log(`${user.email} (${user.token}) is now super_admin. Log out and log in again.`);
  } finally {
    await disconnectDatabase();
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
