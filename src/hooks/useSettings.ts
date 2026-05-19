import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../config/supabase';
import { OwnerSettings } from '../types';

const DEFAULT_SETTINGS: OwnerSettings = {
  business_name: 'Sweet Kakes n Treats',
  owner_name: '',
  email: '',
  phone: '',
  address: '',
  labor_cost_percent: 15,
  tax_percent: 10,
  markup_percent: 25,
  currency: 'USD',
  currency_symbol: '$',
};

export function useSettings() {
  const [settings, setSettings] = useState<OwnerSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);

  const fetchSettings = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('owner_settings')
      .select('*')
      .limit(1)
      .single();
    if (!error && data) setSettings(data as OwnerSettings);
    setLoading(false);
  }, []);

  useEffect(() => { fetchSettings(); }, [fetchSettings]);

  const saveSettings = async (updated: Partial<OwnerSettings>): Promise<boolean> => {
    const merged = { ...settings, ...updated };
    const { error } = settings.id
      ? await supabase.from('owner_settings').update(merged).eq('id', settings.id)
      : await supabase.from('owner_settings').insert(merged);
    if (!error) { setSettings(merged); return true; }
    return false;
  };

  return { settings, loading, fetchSettings, saveSettings };
}
