export const dynamic = 'force-dynamic'
import { notFound, redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { Header } from '@/components/layout/Header';
import { CompanyDetails } from '@/components/companies/CompanyDetails';

interface Props {
  params: {
    id: string;
  };
}

export async function generateMetadata({ params }: Props) {
  const company = await prisma.company.findUnique({
    where: { id: params.id },
    select: { name: true },
  });
  return { title: company?.name ? `${company.name} | Companies` : 'Company Details' };
}

export default async function CompanyDetailPage({ params }: Props) {
  const session = await getServerSession(authOptions);
  if (!['ADMIN', 'MANAGER'].includes(session?.user?.role ?? '')) {
    redirect('/');
  }

  // Fetch company profile & staff
  const company = await prisma.company.findUnique({
    where: { id: params.id },
    include: {
      users: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          avatar: true,
        },
        orderBy: { name: 'asc' },
      },
    },
  });

  if (!company) {
    notFound();
  }

  // Fetch all related projects where this company is either the client or the owner/executor
  const projects = await prisma.project.findMany({
    where: {
      deletedAt: null,
      OR: [
        { companyId: params.id },
        { ownerCompanyId: params.id },
      ],
    },
    select: {
      id: true,
      name: true,
      status: true,
      progress: true,
      budget: true,
      company: { select: { id: true, name: true } },
      ownerCompany: { select: { id: true, name: true } },
      domains: {
        select: {
          tasks: {
            select: {
              id: true,
              status: true,
            },
          },
        },
      },
    },
    orderBy: { updatedAt: 'desc' },
  });

  const projectIds = projects.map((p) => p.id);

  // Fetch all transactions involving these projects
  const transactions = projectIds.length
    ? await prisma.transaction.findMany({
        where: {
          projectId: { in: projectIds },
        },
        select: {
          id: true,
          type: true,
          amount: true,
          date: true,
          category: true,
          description: true,
          paymentMethod: true,
          project: { select: { id: true, name: true } },
          recordedBy: { select: { id: true, name: true } },
        },
        orderBy: { date: 'desc' },
      })
    : [];

  // Serialize dates for Client Component
  const serializedTransactions = transactions.map((t) => ({
    ...t,
    date: t.date.toISOString(),
  }));

  return (
    <div className="flex flex-col min-h-full">
      <Header
        title={company.name}
        description={`Profile details, related projects, and associated treasury ledger`}
      />
      <div className="flex-1 p-6 animate-fade-in">
        <CompanyDetails
          company={company}
          projects={projects}
          transactions={serializedTransactions}
        />
      </div>
    </div>
  );
}
