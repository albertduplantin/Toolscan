import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { ClerkProvider } from '@clerk/nextjs';
import { frFR } from '@clerk/localizations';
import { Toaster } from 'react-hot-toast';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'ToolScan - Vérification d\'armoires d\'outillage',
  description:
    'Application de vérification d\'armoires d\'outillage par vision par ordinateur et réalité augmentée',
  manifest: '/manifest.json',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider localization={frFR}>
      <html lang="fr" suppressHydrationWarning>
        <head>
          {/* Eruda mobile console for debugging on smartphones */}
          <script src="https://cdn.jsdelivr.net/npm/eruda"></script>
          <script dangerouslySetInnerHTML={{ __html: `eruda.init();` }} />
        </head>
        <body className={inter.className}>
          {children}
          <Toaster position="top-right" />
        </body>
      </html>
    </ClerkProvider>
  );
}
