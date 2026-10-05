import { createClient } from '@supabase/supabase-js';

// Chỉ dùng cho đăng nhập, upload file và realtime. Mọi thao tác ghi dữ liệu đi qua API.
export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY,
);
