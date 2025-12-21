// app/layout.js
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import AuthButtons from "@/components/AuthButtons";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: "SnailType - Advanced Typing Practice",
  description: "Improve your typing speed with personalized training plans and AI coaching",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <header className="sticky top-0 z-10 bg-white/80 dark:bg-black/80 backdrop-blur-sm border-b border-gray-200 dark:border-gray-800">
          <div className="container mx-auto px-4 py-3 flex justify-between items-center">
            <div className="text-xl font-bold">
              <a href="/">SnailType</a>
            </div>
            <div className="flex items-center space-x-4">
              <nav className="hidden md:block">
                <ul className="flex space-x-6">
                  <li><a href="/" className="text-sm hover:underline">Home</a></li>
                  <li><a href="/dashboard" className="text-sm hover:underline">Dashboard</a></li>
                  <li><a href="/leaderboard" className="text-sm hover:underline">Leaderboard</a></li>
                </ul>
              </nav>
              <AuthButtons />
            </div>
          </div>
        </header>
        <main>
          {children}
        </main>
        <footer className="border-t border-gray-200 dark:border-gray-800 py-8 mt-12">
          <div className="container mx-auto px-4 text-center text-sm text-gray-500">
            <p>© {new Date().getFullYear()} SnailType - Advanced Typing Practice</p>
          </div>
        </footer>
      </body>
    </html>
  );
}