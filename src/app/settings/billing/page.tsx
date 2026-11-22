'use client';

import React, { useState, useEffect } from 'react';
import { SettingsLayout } from '@/components/settings/SettingsLayout';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { storeService } from '@/services/store';
import { BusinessSettings, PaymentMethod } from '@/types';
import { toast } from 'sonner';
import { Save, Receipt } from 'lucide-react';

export default function BillingSettingsPage() {
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
      toast.success('Billing & Invoicing preferences saved!');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error updating settings';
      toast.error(msg);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <SettingsLayout title="Billing & POS Settings">
      <div className="max-w-3xl space-y-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Receipt className="w-5 h-5 text-blue-600" />
                POS Defaults & Taxation
              </CardTitle>
              <p className="text-xs text-slate-500">
                Default rates applied when creating fresh counter sales bills
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <Select
                    label="Default GST Tax Slab (%)"
                    value={settings.defaultGstRate}
                    onChange={(e) =>
                      setSettings({ ...settings, defaultGstRate: parseFloat(e.target.value) || 0 })
                    }
                  >
                    <option value={0}>0% (Tax Exempt)</option>
                    <option value={5}>5% GST</option>
                    <option value={12}>12% GST</option>
                    <option value={18}>18% GST (Standard)</option>
                    <option value={28}>28% GST</option>
                  </Select>
                </div>

                <div>
                  <Input
                    label="Default Discount Rate (%)"
                    type="number"
                    min="0"
                    max="100"
                    value={settings.defaultDiscountRate}
                    onChange={(e) =>
                      setSettings({ ...settings, defaultDiscountRate: parseFloat(e.target.value) || 0 })
                    }
                  />
                </div>

                <div>
                  <Select
                    label="Default Payment Method"
                    value={settings.defaultPaymentMethod}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        defaultPaymentMethod: e.target.value as PaymentMethod,
                      })
                    }
                  >
                    <option value="cash">Cash Counter</option>
                    <option value="upi">UPI (GPay / PhonePe)</option>
                    <option value="card">Card POS Terminal</option>
                    <option value="bank_transfer">Bank Transfer (NEFT)</option>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Invoice Footer & Legal Terms</CardTitle>
              <p className="text-xs text-slate-500">
                Clauses printed on customer bills, return policy, and brand warranty notices
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 tracking-wide uppercase mb-1">
                  Invoice Footer Message
                </label>
                <Input
                  value={settings.invoiceFooter}
                  onChange={(e) => setSettings({ ...settings, invoiceFooter: e.target.value })}
                  placeholder="Thank you for visiting Sangam Sales and Automobiles!"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 tracking-wide uppercase mb-1">
                  Terms and Conditions (Printed on A4 PDF)
                </label>
                <textarea
                  rows={4}
                  value={settings.termsAndConditions}
                  onChange={(e) => setSettings({ ...settings, termsAndConditions: e.target.value })}
                  className="w-full bg-white border border-slate-300 rounded-lg p-3 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button type="submit" variant="primary" isLoading={isSaving} leftIcon={<Save className="w-4 h-4" />}>
              Save Billing Defaults
            </Button>
          </div>
        </form>
      </div>
    </SettingsLayout>
  );
}

