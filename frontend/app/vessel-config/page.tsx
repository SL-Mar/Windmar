'use client';

import { useState, useEffect } from 'react';
import Header from '@/components/Header';
import Card from '@/components/Card';
import { Ship, Save, RotateCcw } from 'lucide-react';
import { apiClient, VesselSpecs } from '@/lib/api';

const DEFAULT_SPECS: VesselSpecs = {
  dwt: 49000,
  loa: 183,
  beam: 32,
  draft_laden: 11.8,
  draft_ballast: 6.5,
  mcr_kw: 8840,
  sfoc_at_mcr: 171,
  service_speed_laden: 14.5,
  service_speed_ballast: 15.0,
};

export default function VesselConfigPage() {
  const [specs, setSpecs] = useState<VesselSpecs>(DEFAULT_SPECS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    loadSpecs();
  }, []);

  const loadSpecs = async () => {
    try {
      const data = await apiClient.getVesselSpecs();
      setSpecs(data);
    } catch (error) {
      console.error('Failed to load specs:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);

    try {
      await apiClient.updateVesselSpecs(specs);
      setMessage({ type: 'success', text: 'Vessel specifications updated successfully!' });
    } catch (error) {
      console.error('Failed to save specs:', error);
      setMessage({ type: 'error', text: 'Failed to update vessel specifications.' });
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setSpecs(DEFAULT_SPECS);
    setMessage(null);
  };

  const updateSpec = (key: keyof VesselSpecs, value: number) => {
    setSpecs((prev) => ({ ...prev, [key]: value }));
    setMessage(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-maritime flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-400" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-maritime">
      <Header />

      <main className="container mx-auto px-4 pt-24 pb-12">
        {/* Hero Section */}
        <div className="mb-8">
          <h2 className="text-4xl font-bold text-white mb-3">Vessel Configuration</h2>
          <p className="text-gray-300 text-lg">
            Configure vessel specifications for accurate fuel calculations
          </p>
        </div>

        <div className="max-w-4xl mx-auto">
          {/* Message */}
          {message && (
            <div
              className={`mb-6 p-4 rounded-lg ${
                message.type === 'success'
                  ? 'bg-green-500/10 border border-green-500/20 text-green-300'
                  : 'bg-red-500/10 border border-red-500/20 text-red-300'
              }`}
            >
              {message.text}
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Dimensions */}
            <Card title="Vessel Dimensions" icon={<Ship className="w-5 h-5" />}>
              <div className="space-y-4">
                <InputField
                  label="Deadweight Tonnage (DWT)"
                  value={specs.dwt}
                  onChange={(v) => updateSpec('dwt', v)}
                  unit="MT"
                />
                <InputField
                  label="Length Overall (LOA)"
                  value={specs.loa}
                  onChange={(v) => updateSpec('loa', v)}
                  unit="m"
                />
                <InputField
                  label="Beam"
                  value={specs.beam}
                  onChange={(v) => updateSpec('beam', v)}
                  unit="m"
                />
                <InputField
                  label="Draft (Laden)"
                  value={specs.draft_laden}
                  onChange={(v) => updateSpec('draft_laden', v)}
                  unit="m"
                />
                <InputField
                  label="Draft (Ballast)"
                  value={specs.draft_ballast}
                  onChange={(v) => updateSpec('draft_ballast', v)}
                  unit="m"
                />
              </div>
            </Card>

            {/* Engine & Performance */}
            <Card title="Engine & Performance" icon={<Ship className="w-5 h-5" />}>
              <div className="space-y-4">
                <InputField
                  label="Main Engine MCR"
                  value={specs.mcr_kw}
                  onChange={(v) => updateSpec('mcr_kw', v)}
                  unit="kW"
                />
                <InputField
                  label="SFOC at MCR"
                  value={specs.sfoc_at_mcr}
                  onChange={(v) => updateSpec('sfoc_at_mcr', v)}
                  unit="g/kWh"
                />
                <InputField
                  label="Service Speed (Laden)"
                  value={specs.service_speed_laden}
                  onChange={(v) => updateSpec('service_speed_laden', v)}
                  unit="kts"
                  step={0.1}
                />
                <InputField
                  label="Service Speed (Ballast)"
                  value={specs.service_speed_ballast}
                  onChange={(v) => updateSpec('service_speed_ballast', v)}
                  unit="kts"
                  step={0.1}
                />
              </div>
            </Card>
          </div>

          {/* Actions */}
          <div className="mt-8 flex items-center justify-between">
            <button
              onClick={handleReset}
              className="flex items-center space-x-2 px-6 py-3 bg-maritime-dark text-gray-300 rounded-lg hover:bg-maritime-light transition-colors"
            >
              <RotateCcw className="w-5 h-5" />
              <span>Reset to Default</span>
            </button>

            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center space-x-2 px-8 py-3 bg-gradient-ocean text-white font-semibold rounded-lg shadow-ocean hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              <Save className="w-5 h-5" />
              <span>{saving ? 'Saving...' : 'Save Changes'}</span>
            </button>
          </div>

          {/* Info Box */}
          <Card className="mt-8 bg-primary-500/10 border-primary-500/20">
            <div className="flex items-start space-x-3">
              <Ship className="w-5 h-5 text-primary-400 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="text-sm font-semibold text-white mb-2">About Vessel Configuration</h4>
                <p className="text-sm text-gray-300 leading-relaxed">
                  These specifications are used to calculate fuel consumption based on the Holtrop-Mennen
                  resistance prediction method. Accurate values will improve the precision of route optimization
                  and fuel estimates. Default values are for a typical MR Product Tanker (49k DWT).
                </p>
              </div>
            </div>
          </Card>
        </div>
      </main>
    </div>
  );
}

function InputField({
  label,
  value,
  onChange,
  unit,
  step = 1,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  unit: string;
  step?: number;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-300 mb-2">{label}</label>
      <div className="relative">
        <input
          type="number"
          value={value}
          onChange={(e) => onChange(parseFloat(e.target.value))}
          step={step}
          className="w-full bg-maritime-dark border border-white/10 rounded-lg px-4 py-3 pr-16 text-white focus:outline-none focus:border-primary-400 transition-colors"
        />
        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-gray-400">
          {unit}
        </span>
      </div>
    </div>
  );
}
