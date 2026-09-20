import type { Metadata } from 'next';
import { Manrope, Archivo, IBM_Plex_Mono } from 'next/font/google';
import './globals.css';
import { Toaster } from '@/components/ui/toaster';
import { FirebaseClientProvider } from '@/firebase/client-provider';

// Corpo: continuidade com a identidade atual do portal.
const manrope = Manrope({ subsets: ['latin'], variable: '--font-sans' });
// Títulos: grotesca de sinalização — o mesmo parentesco visual de placa e alvará.
const archivo = Archivo({ subsets: ['latin'], weight: ['600', '700', '800'], variable: '--font-display' });
// Dados: CNPJ e códigos CNAE pedem largura fixa para serem conferidos dígito a dígito.
const plexMono = IBM_Plex_Mono({ subsets: ['latin'], weight: ['400', '500', '600'], variable: '--font-mono' });

export const metadata: Metadata = {
  title: 'Agiliza — Portal de licenciamento de empresas no Paraná',
  description: 'Agiliza é o portal de informações sobre licenciamento de empresas no Paraná. Informe o CNPJ ou o CNAE e veja em segundos o que a Vigilância Sanitária, o Corpo de Bombeiros, o Alvará de Funcionamento, o licenciamento Ambiental e a Polícia Civil exigem do seu negócio.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <head>
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
      </head>
      <body className={`${manrope.variable} ${archivo.variable} ${plexMono.variable} font-sans`}>
        <FirebaseClientProvider>
          {children}
          <Toaster />
        </FirebaseClientProvider>
      </body>
    </html>
  );
}
