export interface AccountState {
  id: string;
  role: string;
  status: string;
  username: string | null;
  mustChangePassword: boolean;
  resetVersion: number;
}
