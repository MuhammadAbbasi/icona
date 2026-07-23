import { PrismaClient } from '@prisma/client';
import { sendSecurityUpgradeEmail } from '../src/lib/verifyEmail';

const prisma = new PrismaClient();

async function main() {
  console.log('🛡 Running ICONA Legacy User Credential Security Audit & Email Dispatch...');

  const users = await prisma.user.findMany({
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      status: true,
      emailVerified: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'desc' },
  });

  console.log(`Found ${users.length} registered user account(s) in database.\n`);

  let dispatchedCount = 0;

  for (const user of users) {
    const isUnverified = !user.emailVerified;
    // Check if account was created prior to current date/policy update
    const statusText = isUnverified ? 'UNVERIFIED EMAIL' : 'VERIFIED';
    console.log(` • User: ${user.name} <${user.email}> [Role: ${user.role}] - Status: ${statusText}`);

    if (isUnverified && user.status === 'ACTIVE') {
      try {
        console.log(`   └─ Sending Security Upgrade & Password Reset Email to <${user.email}>...`);
        await sendSecurityUpgradeEmail(user.email, user.name);
        dispatchedCount++;
        console.log(`   └─ ✅ Email dispatched successfully.`);
      } catch (err: any) {
        console.error(`   └─ ❌ Failed to dispatch email to <${user.email}>:`, err.message);
      }
    }
  }

  console.log(`\n✅ Security audit complete! Dispatched ${dispatchedCount} legacy user upgrade email(s).`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
