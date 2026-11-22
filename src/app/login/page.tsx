'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card, CardContent } from '@/components/ui/Card';
import { storeService } from '@/services/store';
import { StoreId, STORE_ACCOUNTS } from '@/types';
import { toast } from 'sonner';
import { 
  Lock, 
  Phone, 
  ArrowRight, 
  ShieldCheck, 
  ArrowLeft, 
  Eye, 
  EyeOff, 
  CheckCircle2,
  UserCheck
} from 'lucide-react';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const storeParam = searchParams.get('store') as StoreId | null;

  // Selected store based on query param or default
  const [selectedStoreId, setSelectedStoreId] = useState<StoreId>(() => {
    return storeParam === 'sangam-traders' ? 'sangam-traders' : 'sangam-sales-automobiles';
  });

  const selectedStore = STORE_ACCOUNTS.find((s) => s.id === selectedStoreId) || STORE_ACCOUNTS[0];

  const [mobile, setMobile] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Sync state if store query param changes
  useEffect(() => {
    if (storeParam === 'sangam-traders' || storeParam === 'sangam-sales-automobiles') {
      setSelectedStoreId(storeParam);
      setMobile('');
      setPassword('');
    }
  }, [storeParam]);

  const handleStoreChange = (storeId: StoreId) => {
    setSelectedStoreId(storeId);
    setMobile('');
    setPassword('');
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      storeService.loginWithMobile(selectedStoreId, mobile, password);

      toast.success(`Welcome, MR. Rajendra Gaikwad!`, {
        description: `Successfully signed in to ${selectedStore.name}.`,
      });

      router.push('/dashboard');
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Invalid mobile number or password.';
      toast.error('Authentication Failed', {
        description: errorMsg,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const isAuto = selectedStoreId === 'sangam-sales-automobiles';

  return (
    <div className="w-full max-w-md space-y-6 relative z-10">
      {/* Top Navigation: Back to JioHotstar Profile Selector */}
      <div className="flex items-center justify-between">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-white transition-colors bg-slate-800/80 hover:bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-700/80"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Switch Store (Who&apos;s logging in?)</span>
        </Link>

        <span className="text-[11px] font-mono text-slate-500 uppercase">
          Owner Portal
        </span>
      </div>

      {/* Account Switcher Tabs */}
      <div className="grid grid-cols-2 p-1 rounded-xl bg-slate-900/90 border border-slate-800 text-xs font-semibold">
        {STORE_ACCOUNTS.map((acc) => {
          const isActive = acc.id === selectedStoreId;
          return (
            <button
              key={acc.id}
              type="button"
              onClick={() => handleStoreChange(acc.id)}
              className={`py-2 px-3 rounded-lg transition-all flex items-center justify-center gap-2 text-center cursor-pointer ${
                isActive
                  ? acc.id === 'sangam-sales-automobiles'
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'bg-emerald-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <span className="truncate">{acc.shortName}</span>
              {isActive && <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />}
            </button>
          );
        })}
      </div>

      {/* Store Header with Circular Logo */}
      <div className="text-center flex flex-col items-center space-y-3">
        <div
          className={`relative w-24 h-24 rounded-full p-1.5 bg-slate-900 border-2 shadow-xl flex items-center justify-center ${
            isAuto ? 'border-blue-500/60 ring-4 ring-blue-500/20' : 'border-emerald-500/60 ring-4 ring-emerald-500/20'
          }`}
        >
          <div className="w-full h-full rounded-full bg-white p-2 flex items-center justify-center overflow-hidden">
            <Image
              src={selectedStore.logoUrl}
              alt={selectedStore.name}
              width={96}
              height={96}
              className="w-full h-full object-contain rounded-full"
              priority
            />
          </div>
        </div>

        <div>
          <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
            {selectedStore.name}
          </h2>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-800/80 border border-slate-700/60 text-xs text-slate-300 font-semibold mt-1">
            <UserCheck className="w-3.5 h-3.5 text-blue-400" />
            <span>Owner: <strong className="text-white">MR. Rajendra Gaikwad</strong></span>
          </div>
        </div>
      </div>

      {/* Login Card */}
      <Card className="border-slate-800 bg-white/95 backdrop-blur-md shadow-2xl">
        <CardContent className="pt-6">
          <form onSubmit={handleLogin} className="space-y-4">
            {/* Mobile Number Field */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700 uppercase tracking-wide flex items-center justify-between">
                <span>Registered Mobile Number</span>
                <span className="text-[11px] font-normal text-slate-400">10 Digits</span>
              </label>
              <Input
                type="tel"
                required
                maxLength={10}
                value={mobile}
                onChange={(e) => setMobile(e.target.value.replace(/[^0-9]/g, ''))}
                placeholder="Enter 10-digit mobile number"
                leftIcon={<Phone className="w-4 h-4 text-slate-400" />}
              />
            </div>

            {/* Password Field */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-700 uppercase tracking-wide">
                  Account Password
                </label>
                <Link
                  href="/forgot-password"
                  className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                >
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <Input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter store password"
                  leftIcon={<Lock className="w-4 h-4 text-slate-400" />}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              variant="primary"
              className={`w-full h-11 text-base mt-2 shadow-lg font-bold ${
                isAuto
                  ? 'bg-blue-600 hover:bg-blue-700 shadow-blue-600/30'
                  : 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/30'
              }`}
              isLoading={isLoading}
              rightIcon={<ArrowRight className="w-4 h-4" />}
            >
              Sign In to {selectedStore.shortName}
            </Button>
          </form>

          {/* Secure System Badge */}
          <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-center gap-2 text-xs text-slate-500 font-medium">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Authorized Access for <strong>MR. Rajendra Gaikwad</strong></span>
          </div>
        </CardContent>
      </Card>

      {/* Footer Credit */}
      <div className="text-center text-xs text-slate-400">
        Developed by{' '}
        <span className="font-semibold text-slate-200">Duocore Software</span> • Hardware & Trading Store ERP
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-[#0a0e17] to-slate-950 flex flex-col justify-center items-center p-4 relative overflow-hidden">
      {/* Background Accent Gradients */}
      <div className="absolute top-10 left-1/2 -translate-x-1/2 w-96 h-96 bg-blue-600/15 rounded-full blur-3xl pointer-events-none" />

      <Suspense
        fallback={
          <div className="text-white text-sm flex items-center gap-2">
            <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            Loading Store Account...
          </div>
        }
      >
        <LoginForm />
      </Suspense>
    </div>
  );
}
