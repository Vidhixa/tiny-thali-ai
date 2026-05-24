import type { Metadata } from 'next';
import { baloo, poppins } from '@/lib/fonts';
import './globals.css';
import { Toaster } from "@/components/ui/toaster";
import { SetupProvider } from '@/contexts/SetupContext';
import { FirebaseProvider } from '@/contexts/FirebaseContext';


export const metadata: Metadata = {
  title: 'Tiny Thali Taster',
  description: 'Personalized Thalis for Your Little One',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${baloo.variable} ${poppins.variable} antialiased`}>
        <FirebaseProvider>
          <SetupProvider>
            {children}
            <Toaster />
          </SetupProvider>
        </FirebaseProvider>
      </body>
    </html>
  );
}
