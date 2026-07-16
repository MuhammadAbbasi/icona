'use client';

import { useState, useRef } from 'react';
import { Camera, Loader2, User } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn, getInitials } from '@/lib/utils';
import { useSession } from 'next-auth/react';

interface Props {
  userId: string;
  userName: string;
  initialAvatar?: string | null;
  onSuccess?: (url: string) => void;
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export function AvatarUpload({
  userId,
  userName,
  initialAvatar,
  onSuccess,
  className,
  size = 'lg',
}: Props) {
  const { update: updateSession } = useSession();
  const [avatarUrl, setAvatarUrl] = useState<string | null>(initialAvatar || null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const sizeClasses = {
    sm: 'h-10 w-10 text-xs',
    md: 'h-12 w-12 text-sm',
    lg: 'h-16 w-16 text-lg',
    xl: 'h-24 w-24 text-2xl',
  };

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    await uploadFile(file);
  }

  async function uploadFile(file: File) {
    // Client-side validations
    if (file.size > 2 * 1024 * 1024) {
      setError('File size must be under 2MB.');
      return;
    }

    const allowed = ['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/svg+xml'];
    if (!allowed.includes(file.type)) {
      setError('Allowed formats: PNG, JPG, JPEG, GIF, SVG.');
      return;
    }

    setUploading(true);
    setError('');

    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('type', 'avatars');

      const res = await fetch('/api/uploads', {
        method: 'POST',
        body: fd,
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Upload failed');
      }

      const { url } = await res.json();

      // Update the user's database record with the new avatar URL
      const updateRes = await fetch(`/api/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ avatar: url }),
      });

      if (!updateRes.ok) {
        throw new Error('Failed to save avatar to user profile');
      }

      setAvatarUrl(url);
      
      // Update NextAuth session state so header avatar changes immediately
      await updateSession();

      if (onSuccess) {
        onSuccess(url);
      }
    } catch (err: any) {
      setError(err.message || 'Something went wrong during upload.');
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  }

  const triggerSelect = () => {
    if (!uploading) {
      fileInputRef.current?.click();
    }
  };

  return (
    <div className={cn('flex flex-col items-center gap-1.5', className)}>
      <div
        onClick={triggerSelect}
        className={cn(
          'relative rounded-full overflow-hidden cursor-pointer group border border-border/80 hover:border-primary/50 transition-colors',
          sizeClasses[size]
        )}
      >
        <Avatar className="h-full w-full">
          {avatarUrl && <AvatarImage src={avatarUrl} alt={userName} className="object-cover h-full w-full" />}
          <AvatarFallback className="font-bold bg-primary/10 text-primary h-full w-full flex items-center justify-center">
            {getInitials(userName || 'U')}
          </AvatarFallback>
        </Avatar>

        {/* Hover / Upload overlay */}
        <div className="absolute inset-0 bg-black/45 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
          {uploading ? (
            <Loader2 className="h-5 w-5 text-white animate-spin" />
          ) : (
            <Camera className="h-5 w-5 text-white" />
          )}
        </div>
      </div>

      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept=".png,.jpg,.jpeg,.gif,.svg"
        className="hidden"
        disabled={uploading}
      />

      {error && <span className="text-[10px] text-destructive text-center max-w-xs">{error}</span>}
    </div>
  );
}
