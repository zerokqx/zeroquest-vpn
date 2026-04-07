import '@mantine/core/styles.css';
import type { Metadata } from 'next';
import { MantineColorSchemeScript } from './mantine-color-scheme-script';
import { Providers } from './providers';
import { AppHeader } from '@/widgets/header';
import './globals.css';

export const metadata: Metadata = {
  title: 'ZeroQuest VPN',
  description: 'VPN-доступ с личным кабинетом, быстрым подключением и сохранением всех конфигов в профиле.',
};

export const dynamic = 'force-dynamic';

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      data-mantine-color-scheme="light"
      lang="ru"
      suppressHydrationWarning
    >
      <body>
        <div className="app-shell">
          <MantineColorSchemeScript defaultColorScheme="light" />
          <Providers>
            <AppHeader />
            {children}
          </Providers>
        </div>
      </body>
    </html>
  );
}
