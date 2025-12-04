import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ykrthfilspvupoakanin.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlrcnRoZmlsc3B2dXBvYWthbmluIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ3MjIwNDQsImV4cCI6MjA4MDI5ODA0NH0.n2TycnaRAWJ9fvaL8SPN_F1b8Ozvk_NZtuPWoJgC8bc';

export const supabase = createClient(supabaseUrl, supabaseKey);