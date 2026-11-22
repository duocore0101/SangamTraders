'use client';

import React, { useState, useEffect } from 'react';
import { SettingsLayout } from '@/components/settings/SettingsLayout';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { storeService } from '@/services/store';
import { BusinessSettings } from '@/types';
import { toast } from 'sonner';
import { Save, Store, Sparkles } from 'lucide-react';

export default function BusinessSettingsPage() {
  const [settings, setSettings] = useState<BusinessSettings | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setSettings(storeService.getSettings());
  }, []);

  if (!settings) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      storeService.updateSettings(settings);
      toast.success('Business settings updated successfully!');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error updating settings';
      toast.error(msg);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <SettingsLayout title="Business Store Profile">
      <div className="max-w-3xl space-y-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Store className="w-5 h-5 text-blue-600" />
                Store Identity & Legal Details
              </CardTitle>
              <p className="text-xs text-slate-500">
                These details appear on your printed GST invoices, receipts, and headers
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <Input
                    label="Business Name"
                    required
                    value={settings.shopName}
                    onChange={(e) => setSettings({ ...settings, shopName: e.target.value })}
                  />
                </div>

                <div className="sm:col-span-2">
                  <Input
                    label="Store Subtitle / Tagline"
                    value={settings.tagline}
                    onChange={(e) => setSettings({ ...settings, tagline: e.target.value })}
                  />
                </div>

                <div>
                  <Input
                    label="Primary Business Phone"
                    required
                    value={settings.phone}
                    onChange={(e) => setSettings({ ...settings, phone: e.target.value })}
                  />
                </div>

                <div>
                  <Input
                    label="Official Billing Email"
                    type="email"
                    required
                    value={settings.email}
                    onChange={(e) => setSettings({ ...settings, email: e.target.value })}
                  />
                </div>

                <div>
                  <Input
                    label="Store GSTIN"
                    value={settings.gstin || ''}
                    onChange={(e) => setSettings({ ...settings, gstin: e.target.value })}
                    placeholder="07AAAAA0000A1Z5"
                  />
                </div>

                <div>
                  <Input
                    label="Registered State"
                    required
                    value={settings.state}
                    onChange={(e) => setSettings({ ...settings, state: e.target.value })}
                    placeholder="Delhi"
                  />
                </div>

                <div className="sm:col-span-2">
                  <Input
                    label="Shop Address / Market Location"
                    required
                    value={settings.address}
                    onChange={(e) => setSettings({ ...settings, address: e.target.value })}
                  />
                </div>

                <div>
                  <Input
                    label="Postal Pincode"
                    required
                    value={settings.pincode}
                    onChange={(e) => setSettings({ ...settings, pincode: e.target.value })}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Invoice Numbering Format</CardTitle>
              <p className="text-xs text-slate-500">Configure voucher series prefix and sequence numbers</p>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Input
                    label="Invoice Prefix"
                    required
                    value={settings.invoicePrefix}
                    onChange={(e) => setSettings({ ...settings, invoicePrefix: e.target.value })}
                    placeholder="SS-INV-"
                  />
                </div>

                <div>
                  <Input
                    label="Next Invoice Sequence #"
                    type="number"
                    required
                    value={settings.nextInvoiceNumber}
                    onChange={(e) =>
                      setSettings({ ...settings, nextInvoiceNumber: parseInt(e.target.value) || 1001 })
                    }
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button type="submit" variant="primary" isLoading={isSaving} leftIcon={<Save className="w-4 h-4" />}>
              Save Business Profile
            </Button>
          </div>
        </form>
      </div>
    </SettingsLayout>
  );
}

