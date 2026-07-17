import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Toaster } from '@/components/ui/toaster';
import { FirebaseClientProvider } from '@/firebase/client-provider';

import { HeaderBanner } from '@/components/HeaderBanner';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'AgilizaVISA – Paraná',
  description: 'Portal informativo para consultar a classificação de risco sanitário de empresas no Paraná, com base na Resolução SESA nº 1034/2020 e Decreto Estadual nº 10.590/2025.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <head>
        <link rel="icon" href="https://picsum.photos/seed/1/32/32" />
      </head>
      <body className={inter.className}>
        <FirebaseClientProvider>
          <HeaderBanner />
          {children}
          <Toaster />
        </FirebaseClientProvider>
      </body>
    </html>
  );
}
