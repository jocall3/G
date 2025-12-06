import type { Metadata } from 'next';
import localFont from 'next/font/local'; // For custom local fonts
import './globals.css'; // Global styles for the application

// Define the 'Covenant 50' font.
// IMPORTANT: Replace these paths with your actual font files and ensure they are accessible
// within the `public` directory of your Next.js project.
// For example, if your font files are in `public/fonts/`, the path should start with `/fonts/`.
const covenant50 = localFont({
  src: [
    {
      path: '/fonts/Covenant50-Regular.woff2', // Example: Assumes public/fonts/Covenant50-Regular.woff2
      weight: '400',
      style: 'normal',
    },
    {
      path: '/fonts/Covenant50-Bold.woff2', // Example: Assumes public/fonts/Covenant50-Bold.woff2
      weight: '700',
      style: 'normal',
    },
    // Add more font files for different weights/styles of Covenant 50 if available
  ],
  variable: '--font-covenant50', // This creates CSS variables like --font-covenant50-family
  display: 'swap', // Optimize font loading for better user experience
});

// Metadata for the application, used for SEO and browser tab titles.
export const metadata: Metadata = {
  title: 'InfiniteAI Banking - The Future of Finance',
  description: 'InfiniteAI: Pioneering AI-driven banking solutions. Discover our story and innovative app.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    // The `lang="en"` attribute is important for accessibility.
    // The `covenant50.variable` class applies the CSS variables for the font
    // to the `html` element, making them globally accessible.
    <html lang="en" className={`${covenant50.variable}`}>
      <head>
        {/* Any global meta tags, link tags (e.g., favicons), or script tags
            that need to be in the <head> can be placed here. */}
      </head>
      {/*
        The `body` element serves as the main container for your application's content.
        The `font-sans` class is a Tailwind CSS utility that sets a generic sans-serif font
        as a fallback. The actual 'Covenant 50' font will be applied via `globals.css`
        using the CSS variable `--font-covenant50-family` which is set by `next/font/local`.
        `antialiased` is a common utility for smoother font rendering.
      */}
      <body className="font-sans antialiased">
        {children}
      </body>
    </html>
  );
}