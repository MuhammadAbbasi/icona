import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🧹 Cleaning up test & auto-generated organizations from database...');

  // Identify test organizations based on slug / name patterns
  const testOrgs = await prisma.organization.findMany({
    where: {
      OR: [
        { slug: { startsWith: 'e2e-' } },
        { slug: { startsWith: 'pentest-' } },
        { slug: { startsWith: 'a176lab' } },
        { slug: 'icon' },
        { name: { contains: 'Test' } },
        { name: { contains: 'NoPass' } },
        { name: { contains: 'Final Co' } },
        { name: { contains: 'Trial Co' } },
        { name: { contains: 'A176Lab' } },
        { name: { contains: 'PenTest' } },
      ],
      NOT: [
        { id: 'org-icona' },
        { id: 'org-admin-root' },
        { slug: 'alpha-constructions' },
      ],
    },
    select: { id: true, name: true, slug: true },
  });

  console.log(`Found ${testOrgs.length} test organization(s) to remove:`);
  testOrgs.forEach((o) => console.log(` - ${o.name} (${o.slug}) [${o.id}]`));

  for (const org of testOrgs) {
    // Clean up linked entities first if no direct cascade
    await prisma.taskPhoto.deleteMany({ where: { project: { orgId: org.id } } }).catch(() => {});
    await prisma.measurement.deleteMany({ where: { subtask: { task: { domain: { project: { orgId: org.id } } } } } }).catch(() => {});
    await prisma.subtaskQuantityRevision.deleteMany({ where: { revision: { project: { orgId: org.id } } } }).catch(() => {});
    await prisma.subtask.deleteMany({ where: { task: { domain: { project: { orgId: org.id } } } } }).catch(() => {});
    await prisma.task.deleteMany({ where: { domain: { project: { orgId: org.id } } } }).catch(() => {});
    await prisma.domain.deleteMany({ where: { project: { orgId: org.id } } }).catch(() => {});
    await prisma.transaction.deleteMany({ where: { project: { orgId: org.id } } }).catch(() => {});
    await prisma.projectDocument.deleteMany({ where: { project: { orgId: org.id } } }).catch(() => {});
    await prisma.project.deleteMany({ where: { orgId: org.id } }).catch(() => {});
    await prisma.company.deleteMany({ where: { orgId: org.id } }).catch(() => {});
    await prisma.membership.deleteMany({ where: { orgId: org.id } }).catch(() => {});
    await prisma.boardColumn.deleteMany({ where: { orgId: org.id } }).catch(() => {});
    await prisma.user.deleteMany({ where: { orgId: org.id } }).catch(() => {});
    await prisma.organization.delete({ where: { id: org.id } }).catch((err) => {
      console.error(`Failed to delete org ${org.name}:`, err.message);
    });
  }

  const remaining = await prisma.organization.findMany({
    select: { id: true, name: true, slug: true },
  });

  console.log('\n✅ Database cleanup complete. Remaining real organizations:');
  remaining.forEach((r) => console.log(` • ${r.name} (${r.slug})`));
}

main().catch(console.error).finally(() => prisma.$disconnect());
