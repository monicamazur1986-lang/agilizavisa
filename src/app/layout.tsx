import type { Metadata } from 'next';
import { Manrope } from 'next/font/google';
import './globals.css';
import { Toaster } from '@/components/ui/toaster';
import { FirebaseClientProvider } from '@/firebase/client-provider';

const manrope = Manrope({ subsets: ['latin'], variable: '--font-sans' });

export const metadata: Metadata = {
  title: 'AgilizaVISA – Licenciamento de empresas no Paraná',
  description: 'Portal informativo para consultar a necessidade de licenciamento sanitário e do Corpo de Bombeiros para empresas no Paraná, direto pelo CNPJ, com base na Resolução SESA nº 1034/2020, no Decreto Estadual nº 10.590/2025 e na Portaria CBMPR nº 476/2025. Em breve, também o alvará de localização.',
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
      <body className={`${manrope.variable} font-sans`}>
        <FirebaseClientProvider>
          {children}
          <Toaster />
        </FirebaseClientProvider>
      </body>
    </html>
  );
}
