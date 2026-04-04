'use client';

import dynamic from 'next/dynamic';

const AdminPage = dynamic(
  () => import('./admin-page').then((module) => module.AdminPage),
  {
    ssr: false,
  }
);

export function AdminShell() {
  return <AdminPage />;
}
