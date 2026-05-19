import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://jjfahgpuyujrgnfhjcrp.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpqZmFoZ3B1eXVqcmduZmhqY3JwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkxNDcwODgsImV4cCI6MjA5NDcyMzA4OH0.b6BvdErLxHZ0S3l5WXIJjer-dNwwfFGQYX8g8zJPM7s';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false,
  },
});
