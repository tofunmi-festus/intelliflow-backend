export type SupabaseUserRow = {
  id: string;
  username: string;
  email?: string | null;
  password_hash: string;
  access_code?: string | null;
  business_name?: string | null;
  current_access_token?: string | null;
};
