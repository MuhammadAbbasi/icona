import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const orgs = await prisma.organization.findMany({
    select: {
      id: true,
      name: true,
      slug: true,
      status: true,
      billingStatus: true,
      createdAt: true,
      _count: {
        select: { users: true, projects: true }
      }
    },
    orderBy: { createdAt: 'desc' }
  });

  console.log('--- DB ORGANIZATIONS ---');
  console.log(JSON.stringify(orgs, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
