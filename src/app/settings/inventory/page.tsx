'use client';

import React, { useState, useEffect } from 'react';
import { SettingsLayout } from '@/components/settings/SettingsLayout';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { storeService } from '@/services/store';
import { BusinessSettings } from '@/types';
import { toast } from 'sonner';
import { Save, Boxes, ShieldAlert } from 'lucide-react';

export default function InventorySettingsPage() {
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
      toast.success('Inventory rules updated successfully!');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error updating settings';
      toast.error(msg);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <SettingsLayout title="Inventory & Stock Policies">
      <div className="max-w-3xl space-y-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Boxes className="w-5 h-5 text-blue-600" />
                Warehouse Stock Thresholds & Alerts
              </CardTitle>
              <p className="text-xs text-slate-500">
                Configure automatic reorder warning triggers and stock monitoring behavior
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Input
                  label="Global Low-Stock Alert Threshold (Units)"
                  type="number"
                  min="1"
                  required
                  value={settings.lowStockNotificationThreshold}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      lowStockNotificationThreshold: parseInt(e.target.value) || 5,
                    })
                  }
                  helperText="Default minimum buffer before an item flags as 'Low Stock' on dashboard and inventory"
                />
              </div>

              <div className="pt-3 border-t border-slate-100">
                <label className="text-xs font-semibold text-slate-700 uppercase tracking-wide block mb-2">
                  Negative Stock Policy
                </label>
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/90 space-y-3">
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="radio"
                      name="negativeStock"
                      checked={!settings.allowNegativeStock}
                      onChange={() => setSettings({ ...settings, allowNegativeStock: false })}
                      className="mt-1 text-blue-600 focus:ring-blue-500"
                    />
                    <div>
                      <span className="text-sm font-bold text-slate-900 block">
                        Strict Stock Validation (Recommended)
                      </span>
                      <span className="text-xs text-slate-500">
                        Never allow sales billing if physical stock count is insufficient. Protects audit accuracy and guarantees atomic inventory deduction.
                      </span>
                    </div>
                  </label>

                  <label className="flex items-start gap-3 cursor-pointer pt-2 border-t border-slate-200/60">
                    <input
                      type="radio"
                      name="negativeStock"
                      checked={settings.allowNegativeStock}
                      onChange={() => setSettings({ ...settings, allowNegativeStock: true })}
                      className="mt-1 text-blue-600 focus:ring-blue-500"
                    />
                    <div>
                      <span className="text-sm font-bold text-slate-900 block">
                        Permit Negative Balances (Loose Mode)
                      </span>
                      <span className="text-xs text-slate-500">
                        Allow billing to complete even if stock drops below zero (useful if goods arrived at counter before vendor purchase entry was recorded).
                      </span>
                    </div>
                  </label>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button type="submit" variant="primary" isLoading={isSaving} leftIcon={<Save className="w-4 h-4" />}>
              Save Inventory Rules
            </Button>
          </div>
        </form>
      </div>
    </SettingsLayout>
  );
}

