import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function hashPassword(plain: string) {
  return bcrypt.hash(plain, 12);
}

async function main() {
  console.log('🌱 Seeding ICONA ERP & CRM database...');

  const password = await hashPassword('password123');

  // Create default ICONA organization
  const defaultOrg = await prisma.organization.upsert({
    where: { id: 'org-icona' },
    update: { name: 'ICONA Corporate', slug: 'icona' },
    create: { id: 'org-icona', name: 'ICONA Corporate', slug: 'icona', status: 'ACTIVE', baseCurrency: 'PKR' },
  });

  // Default board columns
  const defaultColumns = [
    { id: 'UNDER_REVIEW', label: 'Under Review' },
    { id: 'CONTRACT_FILLED', label: 'Contract Filled' },
    { id: 'ONGOING', label: 'Ongoing' },
    { id: 'UNDER_CUSTOMER_REVIEW', label: 'Under Customer Review' },
    { id: 'COMPLETED', label: 'Completed' },
  ];

  for (const col of defaultColumns) {
    await prisma.boardColumn.upsert({
      where: { id: col.id },
      update: { label: col.label, orgId: defaultOrg.id },
      create: { id: col.id, label: col.label, orgId: defaultOrg.id },
    });
  }

  // Companies / Construction Clients
  const iconaHq = await prisma.company.upsert({
    where: { id: 'company-icona' },
    update: { type: 'MAIN', orgId: defaultOrg.id },
    create: {
      id: 'company-icona',
      name: 'ICONA Corporate HQ',
      type: 'MAIN',
      email: 'admin@icona.pk',
      phone: '+92 42 111 426 62',
      address: 'Gulberg III, Lahore, Pakistan',
      website: 'https://icona.pk',
      orgId: defaultOrg.id,
    },
  });

  const apexBuilders = await prisma.company.upsert({
    where: { id: 'company-apex' },
    update: { orgId: defaultOrg.id },
    create: {
      id: 'company-apex',
      name: 'Apex Builders Ltd.',
      email: 'contact@apexbuilders.pk',
      phone: '+92 321 1234567',
      address: 'Karachi, Pakistan',
      orgId: defaultOrg.id,
    },
  });

  const alphaConstruction = await prisma.company.upsert({
    where: { id: 'company-alpha' },
    update: { orgId: defaultOrg.id },
    create: {
      id: 'company-alpha',
      name: 'Alpha Construction Ltd.',
      email: 'contact@alphaconstruction.pk',
      phone: '+92 300 9876543',
      address: 'Islamabad, Pakistan',
      orgId: defaultOrg.id,
    },
  });

  // Users for ICONA platform & client firms
  const admin = await prisma.user.upsert({
    where: { email: 'admin@icona.pk' },
    update: { orgId: defaultOrg.id, emailVerified: new Date(), role: 'SUPER_ADMIN' },
    create: {
      name: 'ICONA Super Admin',
      email: 'admin@icona.pk',
      password,
      role: 'SUPER_ADMIN',
      companyId: iconaHq.id,
      orgId: defaultOrg.id,
      emailVerified: new Date(),
    },
  });

  const clientAdmin = await prisma.user.upsert({
    where: { email: 'farhan@apexbuilders.pk' },
    update: { orgId: defaultOrg.id, emailVerified: new Date() },
    create: {
      name: 'Farhan Khan',
      email: 'farhan@apexbuilders.pk',
      password,
      role: 'ADMIN',
      companyId: apexBuilders.id,
      orgId: defaultOrg.id,
      emailVerified: new Date(),
    },
  });

  const manager = await prisma.user.upsert({
    where: { email: 'usman@alphaconstruction.pk' },
    update: { orgId: defaultOrg.id, emailVerified: new Date() },
    create: {
      name: 'Usman Ali',
      email: 'usman@alphaconstruction.pk',
      password,
      role: 'MANAGER',
      companyId: alphaConstruction.id,
      orgId: defaultOrg.id,
      emailVerified: new Date(),
    },
  });

  const employee = await prisma.user.upsert({
    where: { email: 'sara@icona.pk' },
    update: { orgId: defaultOrg.id, emailVerified: new Date() },
    create: {
      name: 'Sara Khan',
      email: 'sara@icona.pk',
      password,
      role: 'EMPLOYEE',
      companyId: iconaHq.id,
      orgId: defaultOrg.id,
      emailVerified: new Date(),
    },
  });

  // Memberships
  await prisma.membership.upsert({
    where: { orgId_userId: { orgId: defaultOrg.id, userId: admin.id } },
    update: {},
    create: { orgId: defaultOrg.id, userId: admin.id, roleId: 'ADMIN', status: 'ACTIVE' },
  });

  await prisma.membership.upsert({
    where: { orgId_userId: { orgId: defaultOrg.id, userId: clientAdmin.id } },
    update: {},
    create: { orgId: defaultOrg.id, userId: clientAdmin.id, roleId: 'ADMIN', status: 'ACTIVE' },
  });

  // Teams
  const civilTeam = await prisma.team.upsert({
    where: { id: 'team-civil' },
    update: { orgId: defaultOrg.id },
    create: { id: 'team-civil', name: 'Civil & Structural', description: 'Handles all civil, structural, and foundation works', orgId: defaultOrg.id },
  });

  const mepTeam = await prisma.team.upsert({
    where: { id: 'team-mep' },
    update: { orgId: defaultOrg.id },
    create: { id: 'team-mep', name: 'MEP Team', description: 'Mechanical, Electrical & Plumbing specialists', orgId: defaultOrg.id },
  });

  // Projects — spread across Kanban columns
  const project1 = await prisma.project.upsert({
    where: { id: 'proj-residential' },
    update: { orgId: defaultOrg.id },
    create: {
      id: 'proj-residential',
      name: 'DHA Residential Complex — Block C',
      description: 'Full-scope construction of a 200-unit residential complex.',
      status: 'ONGOING',
      priority: 'HIGH',
      startDate: new Date('2026-01-15'),
      endDate: new Date('2026-12-31'),
      budget: 45000000,
      progress: 38,
      companyId: apexBuilders.id,
      orgId: defaultOrg.id,
    },
  });

  const project2 = await prisma.project.upsert({
    where: { id: 'proj-commercial' },
    update: { orgId: defaultOrg.id },
    create: {
      id: 'proj-commercial',
      name: 'Gulberg Commercial Tower',
      description: 'High-rise 22-floor commercial tower with mixed-use spaces.',
      status: 'UNDER_CUSTOMER_REVIEW',
      priority: 'CRITICAL',
      startDate: new Date('2025-09-01'),
      endDate: new Date('2027-03-31'),
      budget: 180000000,
      progress: 62,
      companyId: alphaConstruction.id,
      orgId: defaultOrg.id,
    },
  });

  // Domains for project1
  const civilDomain = await prisma.domain.upsert({
    where: { id: 'dom-civil' },
    update: {},
    create: { id: 'dom-civil', name: 'Civil Works', color: '#6366f1', projectId: project1.id },
  });

  // Tasks
  const task1 = await prisma.task.upsert({
    where: { id: 'task-foundation' },
    update: {},
    create: {
      id: 'task-foundation',
      title: 'Foundation & Excavation',
      status: 'DONE',
      priority: 'CRITICAL',
      dueDate: new Date('2026-02-28'),
      domainId: civilDomain.id,
      assigneeId: employee.id,
      creatorId: admin.id,
    },
  });

  console.log('✅ ICONA database seed complete!');
  console.log('\n📋 Official ICONA Credentials (Password: password123)');
  console.log('  Super Admin:  admin@icona.pk');
  console.log('  Client Admin: farhan@apexbuilders.pk');
  console.log('  Manager:      usman@alphaconstruction.pk');
  console.log('  Employee:     sara@icona.pk');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
