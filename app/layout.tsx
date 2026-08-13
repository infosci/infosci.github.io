import type { Metadata } from "next";
import localFont from "next/font/local";
import { SiteNav } from "@/components/SiteNav";
import "./globals.css";

const googleSansFlex = localFont({
  src: "./fonts/GoogleSansFlex-Variable.woff2",
  variable: "--font-google-sans-flex",
  weight: "100 900",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://datalab.yonsei.ac.kr"),
  title: {
    default: "Yonsei DataLab",
    template: "%s · Yonsei DataLab",
  },
  description:
    "DataLab at Yonsei University conducts data-driven research in science of science, mental health informatics, and digital humanities.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      // Dark by default, as on ddun.ai; the inline script below flips to light
      // only for visitors who chose it. suppressHydrationWarning because that
      // script and ThemeToggle mutate the class outside React's render.
      className={`${googleSansFlex.variable} h-full antialiased dark`}
      suppressHydrationWarning
    >
      <body className="flex min-h-full flex-col">
        {/* No-flash: runs before paint, removing `dark` only for visitors who
            previously switched to light. The dark default needs no script. */}
        <script
          dangerouslySetInnerHTML={{
            __html:
              "try{if(localStorage.theme==='light')document.documentElement.classList.remove('dark')}catch(e){}",
          }}
        />
        <SiteNav />
        <main className="mx-auto w-full max-w-5xl flex-1 px-6 pb-20">{children}</main>
        <footer className="mx-auto w-full max-w-5xl px-6 pb-10 text-sm text-zinc-500 dark:text-zinc-500">
          DataLab · Yonsei University
        </footer>
      </body>
    </html>
  );
}
