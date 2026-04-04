export interface User {
  id: string;
  login: string;
  role: 'admin' | 'customer';
  createdAt: string;
}
