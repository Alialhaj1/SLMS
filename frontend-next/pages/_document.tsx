/**
 * Custom Document with RTL/LTR Support
 * Note: dir attribute is set dynamically by LocaleContext
 */

import { Html, Head, Main, NextScript } from 'next/document';

export default function Document() {
  return (
    <Html>
      <Head>
        <meta charSet="utf-8" />
        <meta name="description" content="Smart Logistics Management System - Manage shipments, warehouses, and suppliers efficiently" />
        <link rel="icon" href="/favicon.ico" />
        
        {/* Google Fonts - Support both Arabic and Latin */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link 
          href="https://fonts.googleapis.com/css2?family=Cairo:wght@300;400;500;600;700;800&family=Inter:wght@300;400;500;600;700;800&display=swap" 
          rel="stylesheet" 
        />
      </Head>
      <body className="antialiased">
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
