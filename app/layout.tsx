import "./globals.css";
import Link from "next/link";
import Script from "next/script";

export const metadata = {
  title: "StarsQ | Decision Intelligence & Capital Analytics for Cinema",
  description: "StarsQ decodes Telugu cinema capital — actor tiers, opening strength, ROI volatility and investment risk. The decision intelligence engine for cinema.",
};

const GA_ID = "G-YL4TLE09CM";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://www.googletagmanager.com" />
        <link rel="dns-prefetch" href="https://www.googletagmanager.com" />
        <link rel="preconnect" href="https://www.google-analytics.com" />
        <link rel="dns-prefetch" href="https://www.google-analytics.com" />
        <link rel="preload" href="/background/bg.webp" as="image" type="image/webp" />
      </head>
      <body>
        <nav className="nav">
          <div className="nav-left">
            <Link href="/" style={{ textDecoration: "none", color: "inherit" }}>StarsQ</Link>
          </div>
          <div className="nav-center">
            <Link href="/">Terminal</Link>
            <Link href="/starquantum">Star Quantum</Link>
            <Link href="/signal">Signal</Link>
            <Link href="/filmlab">FilmLab</Link>
            <Link href="/about">About</Link>
            <Link href="/faq">FAQ</Link>
          </div>
          <div className="nav-spacer" aria-hidden="true" />
        </nav>

        {children}

        <footer className="site-footer">
          <div className="site-footer__inner">
            <div className="site-footer__brand">
              <span className="site-footer__logo">StarsQ</span>
              <span className="site-footer__tag">Cinema Capital Intelligence</span>
            </div>
            <nav className="site-footer__links" aria-label="Footer navigation">
              <Link href="/about">About</Link>
              <Link href="/faq">FAQ</Link>
              <Link href="/disclaimer">Disclaimer</Link>
              <Link href="/faq#methodology">Methodology</Link>
              <a href="mailto:contact@starsq.com">Contact</a>
            </nav>

            {/* ── Social Media Icons ── */}
            <div className="site-footer__social">
              {/* Instagram */}
              <a
                href="https://www.instagram.com/starsqcinema/"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="StarsQ on Instagram"
                className="site-footer__social-btn"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/>
                  <circle cx="12" cy="12" r="4"/>
                  <circle cx="17.5" cy="6.5" r="0.5" fill="currentColor" stroke="none"/>
                </svg>
                <span>Instagram</span>
              </a>
              {/* YouTube */}
              <a
                href="https://www.youtube.com/@StarsQCinema"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="StarsQ on YouTube"
                className="site-footer__social-btn"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22.54 6.42a2.78 2.78 0 0 0-1.95-1.96C18.88 4 12 4 12 4s-6.88 0-8.59.46A2.78 2.78 0 0 0 1.46 6.42 29 29 0 0 0 1 12a29 29 0 0 0 .46 5.58A2.78 2.78 0 0 0 3.41 19.6C5.12 20 12 20 12 20s6.88 0 8.59-.46a2.78 2.78 0 0 0 1.95-1.95A29 29 0 0 0 23 12a29 29 0 0 0-.46-5.58z"/>
                  <polygon points="9.75 15.02 15.5 12 9.75 8.98 9.75 15.02" fill="currentColor" stroke="none"/>
                </svg>
                <span>YouTube</span>
              </a>
            </div>

            <p className="site-footer__legal">
              © {new Date().getFullYear()} StarsQ. Analytical estimates only. Not financial advice.
            </p>
          </div>
        </footer>

        <Script
          src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`}
          strategy="afterInteractive"
        />
        <Script id="google-analytics" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', '${GA_ID}', {
              page_path: window.location.pathname,
            });
          `}
        </Script>
      </body>
    </html>
  );
}
