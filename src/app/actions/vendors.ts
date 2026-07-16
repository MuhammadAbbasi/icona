'use server';

import { revalidatePath } from 'next/cache';
import { getServerSession } from 'next-auth';
import { z } from 'zod';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export interface Vendor {
  id: string;
  name: string;
  supplies: string | null;
  contactName: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  notes: string | null;
}

async function requireStaff() {
  const session = await getServerSession(authOptions);
  return ['ADMIN', 'MANAGER'].includes(session?.user?.role ?? '');
}

const vendorSchema = z.object({
  name:        z.string().trim().min(1, 'Vendor name is required'),
  supplies:    z.string().trim().optional().nullable(),
  contactName: z.string().trim().optional().nullable(),
  phone:       z.string().trim().optional().nullable(),
  email:       z.string().trim().optional().nullable(),
  address:     z.string().trim().optional().nullable(),
  notes:       z.string().trim().optional().nullable(),
});

export type VendorInput = z.infer<typeof vendorSchema>;

export interface VendorResult {
  ok: boolean;
  error?: string;
  vendor?: Vendor;
}

const norm = (v: VendorInput) => ({
  name: v.name.trim(),
  supplies: v.supplies?.trim() || null,
  contactName: v.contactName?.trim() || null,
  phone: v.phone?.trim() || null,
  email: v.email?.trim() || null,
  address: v.address?.trim() || null,
  notes: v.notes?.trim() || null,
});

export async function createVendor(input: VendorInput): Promise<VendorResult> {
  if (!(await requireStaff())) return { ok: false, error: 'Forbidden: Admin/Manager only.' };
  const parsed = vendorSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.errors[0].message };

  const vendor = await prisma.vendor.create({ data: norm(parsed.data) });
  revalidatePath('/team');
  return { ok: true, vendor };
}

export async function updateVendor(id: string, input: VendorInput): Promise<VendorResult> {
  if (!(await requireStaff())) return { ok: false, error: 'Forbidden: Admin/Manager only.' };
  const parsed = vendorSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.errors[0].message };

  const vendor = await prisma.vendor.update({ where: { id }, data: norm(parsed.data) });
  revalidatePath('/team');
  return { ok: true, vendor };
}

export async function deleteVendor(id: string): Promise<VendorResult> {
  if (!(await requireStaff())) return { ok: false, error: 'Forbidden: Admin/Manager only.' };
  await prisma.vendor.delete({ where: { id } });
  revalidatePath('/team');
  return { ok: true };
}
