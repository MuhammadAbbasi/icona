import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash('password123', 12);

  // Ensure default organization exists
  let org = await prisma.organization.findFirst({ where: { slug: 'icona-admin' } });
  if (!org) {
    org = await prisma.organization.create({
      data: {
        id: 'org-admin-root',
        name: 'ICONA Corporate Admin',
        slug: 'icona-admin',
        status: 'ACTIVE',
        billingStatus: 'ACTIVE',
      },
    });
  }

  // Create or update Super Admin user
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@icona.pk' },
    update: {
      password: passwordHash,
      role: 'SUPER_ADMIN',
      status: 'ACTIVE',
      emailVerified: new Date(),
      orgId: org.id,
    },
    create: {
      name: 'ICONA Super Admin',
      email: 'admin@icona.pk',
      password: passwordHash,
      role: 'SUPER_ADMIN',
      status: 'ACTIVE',
      emailVerified: new Date(),
      orgId: org.id,
    },
  });

  console.log('Super Admin account created/updated:', adminUser.email);
}

main().catch(console.error).finally(() => prisma.$disconnect());
