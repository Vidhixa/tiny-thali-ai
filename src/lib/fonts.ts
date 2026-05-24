import { Baloo_2, Poppins } from 'next/font/google';

export const baloo = Baloo_2({
  subsets: ['latin'],
  variable: '--font-baloo',
  weight: ['400', '700'], // Regular and Bold
});

export const poppins = Poppins({
  subsets: ['latin'],
  variable: '--font-poppins',
  weight: ['400', '500', '600', '700'], // Regular, Medium, SemiBold, Bold
});
