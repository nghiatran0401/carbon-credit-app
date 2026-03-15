'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import {
  User as UserIcon,
  Mail,
  Building,
  Shield,
  Calendar,
  Loader2,
  CheckCircle2,
  Sparkles,
  Save,
} from 'lucide-react';
import { useAuth } from '@/components/auth-context';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';

export default function ProfilePage() {
  const { isAuthenticated, user, loading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [company, setCompany] = useState('');
  const [initialProfile, setInitialProfile] = useState({
    firstName: '',
    lastName: '',
    company: '',
  });
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.replace('/auth');
    }
  }, [isAuthenticated, loading, router]);

  useEffect(() => {
    if (user) {
      const profile = {
        firstName: user.firstName ?? '',
        lastName: user.lastName ?? '',
        company: user.company ?? '',
      };
      setFirstName(profile.firstName);
      setLastName(profile.lastName);
      setCompany(profile.company);
      setInitialProfile(profile);
      setDirty(false);
    }
  }, [user]);

  useEffect(() => {
    setDirty(
      firstName !== initialProfile.firstName ||
        lastName !== initialProfile.lastName ||
        company !== initialProfile.company,
    );
  }, [
    company,
    firstName,
    initialProfile.company,
    initialProfile.firstName,
    initialProfile.lastName,
    lastName,
  ]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ firstName, lastName, company: company || null }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to update profile');
      }
      toast({ title: 'Profile updated', description: 'Your changes have been saved.' });
      setInitialProfile({ firstName, lastName, company });
      setDirty(false);
      router.refresh();
    } catch (err: unknown) {
      toast({
        title: 'Error',
        description: err instanceof Error ? err.message : 'Failed to save changes.',
        variant: 'destructive',
      });
    }
    setSaving(false);
  };

  if (loading || !isAuthenticated || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-green-600" />
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-5xl px-4 py-8">
      <div className="mb-8 rounded-2xl border border-emerald-100 bg-gradient-to-r from-emerald-50/90 via-white to-white p-6">
        <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-100/70 px-3 py-1 text-xs font-medium text-emerald-800">
          <Sparkles className="h-3.5 w-3.5" />
          Account Settings
        </div>
        <h1 className="text-3xl font-bold text-gray-900">Profile</h1>
        <p className="mt-1 text-gray-600">Manage your account details and personal information</p>
      </div>

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border-emerald-100">
          <CardContent className="pt-6">
            <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Email</p>
            <p className="mt-1 truncate text-sm font-semibold text-gray-900">{user.email}</p>
          </CardContent>
        </Card>
        <Card className="border-emerald-100">
          <CardContent className="pt-6">
            <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Role</p>
            <Badge
              variant={user.role?.toLowerCase() === 'admin' ? 'default' : 'secondary'}
              className="mt-2"
            >
              {user.role}
            </Badge>
          </CardContent>
        </Card>
        <Card className="border-emerald-100">
          <CardContent className="pt-6">
            <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
              Member since
            </p>
            <p className="mt-1 text-sm font-semibold text-gray-900">
              {new Date(user.createdAt).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </p>
          </CardContent>
        </Card>
        <Card className="border-emerald-100">
          <CardContent className="pt-6">
            <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
              Verification
            </p>
            <p className="mt-1 inline-flex items-center gap-2 text-sm font-semibold text-gray-900">
              <CheckCircle2
                className={`h-4 w-4 ${user.emailVerified ? 'text-emerald-600' : 'text-gray-300'}`}
              />
              {user.emailVerified ? 'Verified' : 'Not verified'}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.05fr_1.4fr]">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Account details</CardTitle>
            <CardDescription>Read-only information linked to your account</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3">
              <Mail className="h-4 w-4 text-gray-400" />
              <div className="min-w-0">
                <p className="text-sm text-gray-500">Email</p>
                <p className="truncate font-medium text-gray-900">{user.email}</p>
              </div>
            </div>
            <Separator />
            <div className="flex items-center gap-3">
              <Shield className="h-4 w-4 text-gray-400" />
              <div>
                <p className="text-sm text-gray-500">Role</p>
                <Badge
                  variant={user.role?.toLowerCase() === 'admin' ? 'default' : 'secondary'}
                  className="mt-0.5"
                >
                  {user.role}
                </Badge>
              </div>
            </div>
            <Separator />
            <div className="flex items-center gap-3">
              <Calendar className="h-4 w-4 text-gray-400" />
              <div>
                <p className="text-sm text-gray-500">Member since</p>
                <p className="font-medium">
                  {new Date(user.createdAt).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </p>
              </div>
            </div>
            <Separator />
            <div className="flex items-center gap-3">
              <CheckCircle2
                className={`h-4 w-4 ${user.emailVerified ? 'text-green-500' : 'text-gray-300'}`}
              />
              <div>
                <p className="text-sm text-gray-500">Email verification</p>
                <p className="font-medium">{user.emailVerified ? 'Verified' : 'Not verified'}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-3">
              <div>
                <CardTitle className="text-lg">Personal Information</CardTitle>
                <CardDescription>Update your public profile details</CardDescription>
              </div>
              {dirty && (
                <Badge variant="secondary" className="bg-amber-100 text-amber-800">
                  Unsaved changes
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">First name</Label>
                <div className="relative">
                  <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    id="firstName"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="pl-10"
                    placeholder="First name"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Last name</Label>
                <Input
                  id="lastName"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="Last name"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="company">Company (optional)</Label>
              <div className="relative">
                <Building className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  id="company"
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  className="pl-10"
                  placeholder="Your company"
                />
              </div>
            </div>
            <div className="flex flex-wrap justify-end gap-2 pt-2">
              <Button
                variant="outline"
                onClick={() => {
                  setFirstName(initialProfile.firstName);
                  setLastName(initialProfile.lastName);
                  setCompany(initialProfile.company);
                }}
                disabled={!dirty || saving}
              >
                Reset
              </Button>
              <Button
                onClick={handleSave}
                disabled={saving || !dirty || !firstName.trim() || !lastName.trim()}
                className="bg-emerald-600 hover:bg-emerald-700"
              >
                {saving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Save changes
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
