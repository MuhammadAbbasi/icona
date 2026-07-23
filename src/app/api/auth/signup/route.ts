import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { systemPrisma, prisma } from '@/lib/prisma';
import { withTenantContext } from '@/lib/tenantPrisma';
import { seedChartOfAccounts } from '@/lib/ledger/coa';
import { sendVerificationEmail } from '@/lib/verifyEmail';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, email, password, orgName, slug } = body;

    if (!name || !email || !password || !orgName || !slug) {
      return NextResponse.json(
        { error: 'All fields are required.' },
        { status: 400 }
      );
    }

    const cleanEmail = email.toLowerCase().trim();
    const cleanSlug = slug.toLowerCase().trim().replace(/[^a-z0-9-]/g, '');

    if (cleanSlug.length < 3) {
      return NextResponse.json(
        { error: 'Slug must be at least 3 alphanumeric characters.' },
        { status: 400 }
      );
    }

    // Validate password strength against NIST 12+ character security standards & name/company blocklist
    const { validatePasswordStrength } = await import('@/lib/password');
    const pwdResult = validatePasswordStrength(password, { userName: name, companyName: orgName, email });
    if (!pwdResult.valid) {
      return NextResponse.json(
        { error: pwdResult.message || 'Password does not meet security requirements.' },
        { status: 400 }
      );
    }

    // 1. Check if email is already taken globally
    const existingUser = await systemPrisma.user.findUnique({
      where: { email: cleanEmail },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: 'A user with this email address already exists.' },
        { status: 400 }
      );
    }

    // 2. Check if organization slug is already taken globally
    const existingOrg = await systemPrisma.organization.findUnique({
      where: { slug: cleanSlug },
    });

    if (existingOrg) {
      return NextResponse.json(
        { error: 'This organization slug / subdomain is already taken.' },
        { status: 400 }
      );
    }

    // 3. Provision the new tenant organization and its administrator
    const hashedPassword = await bcrypt.hash(password, 12);

    const result = await systemPrisma.$transaction(async (tx) => {
      // Create Organization
      const org = await tx.organization.create({
        data: {
          name: orgName.trim(),
          slug: cleanSlug,
          status: 'ACTIVE',
          baseCurrency: 'PKR',
          locale: 'en-PK',
          timezone: 'Asia/Karachi',
          taxRate: 15.0,
        },
      });

      // Create main Company profile for the tenant
      const company = await tx.company.create({
        data: {
          name: `${orgName.trim()} (Main)`,
          type: 'MAIN',
          email: cleanEmail,
          orgId: org.id,
        },
      });

      // Create Administrator User
      const user = await tx.user.create({
        data: {
          name: name.trim(),
          email: cleanEmail,
          password: hashedPassword,
          role: 'ADMIN',
          status: 'ACTIVE',
          companyId: company.id,
          orgId: org.id,
        },
      });

      // Create Membership
      await tx.membership.create({
        data: {
          orgId: org.id,
          userId: user.id,
          roleId: 'ADMIN',
          status: 'ACTIVE',
        },
      });

      // Provision default board columns for the organization
      const defaultColumns = [
        { id: 'UNDER_REVIEW', label: 'Under Review' },
        { id: 'CONTRACT_FILLED', label: 'Contract Filled' },
        { id: 'ONGOING', label: 'Ongoing' },
        { id: 'UNDER_CUSTOMER_REVIEW', label: 'Under Customer Review' },
        { id: 'COMPLETED', label: 'Completed' },
      ];

      for (const col of defaultColumns) {
        await tx.boardColumn.create({
          data: {
            id: `${org.id}_${col.id}`, // Unique ID scoped per organization
            label: col.label,
            orgId: org.id,
          },
        });
      }

      return { org, user };
    });

    // 4. Seed the Chart of Accounts under the context of the newly created organization
    await withTenantContext(result.org.id, async () => {
      await seedChartOfAccounts(prisma);
    });

    // 5. Send the email-verification link. Login is blocked until it is clicked;
    // if delivery fails here, a login attempt re-sends it (see auth.ts).
    try {
      await sendVerificationEmail(cleanEmail, result.user.name);
    } catch (mailError) {
      console.error('Signup verification email failed to send:', mailError);
    }

    return NextResponse.json(
      {
        message: 'Organization provisioned successfully.',
        requiresVerification: true,
        org: {
          id: result.org.id,
          name: result.org.name,
          slug: result.org.slug,
        },
        user: {
          id: result.user.id,
          name: result.user.name,
          email: result.user.email,
        },
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Error during organization signup:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred during signup.' },
      { status: 500 }
    );
  }
}
