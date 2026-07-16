import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import fs from 'fs';
import path from 'path';

export async function GET() {
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const session = await getServerSession(authOptions);
  if (session?.user?.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const info: any = {
    currentTime: new Date().toISOString(),
    cwd: process.cwd(),
    dirname: __dirname,
  };

  try {
    // Current directory contents
    info.currentDirFiles = fs.readdirSync(process.cwd());
  } catch (err: any) {
    info.currentDirError = err.message;
  }

  try {
    // Parent directory contents
    const parentDir = path.join(process.cwd(), '..');
    info.parentDir = parentDir;
    info.parentDirFiles = fs.readdirSync(parentDir);
  } catch (err: any) {
    info.parentDirError = err.message;
  }

  try {
    // Check public_html or other potential web roots
    const homeDir = path.join(process.cwd(), '../..');
    info.homeDir = homeDir;
    info.homeDirFiles = fs.readdirSync(homeDir);
  } catch (err: any) {
    info.homeDirError = err.message;
  }

  // Check symlink details
  try {
    const parentDir = path.join(process.cwd(), '..');
    const targetAssets = path.join(parentDir, 'assets');
    const targetNext = path.join(parentDir, '_next');

    info.symlinks = {
      assets: {
        exists: fs.existsSync(targetAssets),
        isSymlink: false,
        pointsTo: null,
      },
      next: {
        exists: fs.existsSync(targetNext),
        isSymlink: false,
        pointsTo: null,
      }
    };

    if (fs.existsSync(targetAssets)) {
      const stats = fs.lstatSync(targetAssets);
      info.symlinks.assets.isSymlink = stats.isSymbolicLink();
      if (stats.isSymbolicLink()) {
        info.symlinks.assets.pointsTo = fs.readlinkSync(targetAssets);
      }
    }

    if (fs.existsSync(targetNext)) {
      const stats = fs.lstatSync(targetNext);
      info.symlinks.next.isSymlink = stats.isSymbolicLink();
      if (stats.isSymbolicLink()) {
        info.symlinks.next.pointsTo = fs.readlinkSync(targetNext);
      }
    }
  } catch (err: any) {
    info.symlinksError = err.message;
  }

  return NextResponse.json(info);
}
