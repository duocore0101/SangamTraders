'use client';

import React, { useState, useEffect } from 'react';
import { SettingsLayout } from '@/components/settings/SettingsLayout';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/Table';
import { storeService } from '@/services/store';
import { UserProfile } from '@/types';
import { formatDate } from '@/lib/utils';
import { Users, ShieldCheck, KeyRound, CheckCircle2 } from 'lucide-react';

export default function UserSettingsPage() {
  const [profiles, setProfiles] = useState<UserProfile[]>([]);

  const loadProfiles = () => {
    setProfiles(storeService.getProfiles());
  };

  useEffect(() => {
    loadProfiles();
  }, []);

  return (
    <SettingsLayout title="Administrator Accounts & Access Control">
      <div className="max-w-4xl space-y-6">
        {/* Administrator Accounts Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5 text-blue-600" />
              Administrator Accounts & Ownership
            </CardTitle>
            <p className="text-xs text-slate-500">
              Authorized system administrator credentials with unrestricted access to all store modules
            </p>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Administrator</TableHead>
                  <TableHead>Email Address</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead className="text-center">Assigned Role</TableHead>
                  <TableHead>Registered</TableHead>
                  <TableHead className="text-right">Access Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {profiles.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-bold text-slate-900 text-xs">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-purple-100 text-purple-700 font-bold flex items-center justify-center text-xs">
                          {p.fullName.slice(0, 2).toUpperCase()}
                        </div>
                        <span>{p.fullName}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-xs text-slate-600 font-mono">
                      {p.email}
                    </TableCell>
                    <TableCell className="text-xs text-slate-600">
                      {p.phone || '—'}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="purple">
                        ADMIN
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-slate-400">
                      {formatDate(p.createdAt)}
                    </TableCell>
                    <TableCell className="text-right">
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Full Access
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Roles Permission Information Card */}
        <div className="p-6 rounded-2xl bg-gradient-to-br from-purple-50/80 via-white to-blue-50/50 border border-purple-200 space-y-4">
          <div className="flex items-center gap-2.5 text-purple-950 font-black text-base">
            <div className="p-2 bg-purple-600 text-white rounded-xl shadow-xs">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3>ADMINISTRATOR ACCESS & PRIVILEGES</h3>
              <p className="text-xs text-slate-500 font-normal">
                Single unified administrative security model for Sangam Sales and Sangam Automobiles & Sangam Traders
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 text-xs text-slate-700">
            <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-1">
              <p className="font-bold text-slate-900 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" />
                POS Billing & Audit Ledgers
              </p>
              <p className="text-slate-500 text-[11px] leading-relaxed">
                Full authority to create, print, download, and cancel GST and Non-GST sales invoices, and inspect customer debt ledgers.
              </p>
            </div>

            <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-1">
              <p className="font-bold text-slate-900 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" />
                Inventory & Stock Adjustments
              </p>
              <p className="text-slate-500 text-[11px] leading-relaxed">
                Add, edit, bulk import via Excel, delete products, correct stock levels, and audit all physical stock movements.
              </p>
            </div>

            <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-1">
              <p className="font-bold text-slate-900 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" />
                Purchases & Supplier Accounts
              </p>
              <p className="text-slate-500 text-[11px] leading-relaxed">
                Record inward purchase invoices from suppliers, track vendor outstanding balances, and adjust purchase costs.
              </p>
            </div>

            <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-1">
              <p className="font-bold text-slate-900 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" />
                Business Settings & Tax Slabs
              </p>
              <p className="text-slate-500 text-[11px] leading-relaxed">
                Manage shop name, address, GSTIN, terms and conditions, invoice series prefixes, and database connectivity.
              </p>
            </div>
          </div>
        </div>
      </div>
    </SettingsLayout>
  );
}
