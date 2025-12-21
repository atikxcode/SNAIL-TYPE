import TypingTest from "@/components/TypingTest";
import Link from 'next/link';

export default function Home() {
  return (
    <main className="min-h-screen bg-bg-dark text-text-sub flex flex-col font-mono selection:bg-caret-color selection:text-bg-dark">
      {/* Top Navigation Bar */}
      <header className="px-12 py-8 w-full max-w-7xl mx-auto flex justify-between items-center z-10 transition-opacity duration-300">
        <div className="flex items-center gap-4 group cursor-pointer">
          <div className="text-3xl text-caret-color">
            {/* Snail Icon or similar */}
            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z" /></svg>
          </div>
          <h1 className="text-3xl font-bold text-text-main relative">
            snailType
            <span className="text-[10px] absolute -top-1 -right-8 text-text-sub border border-text-sub rounded px-1">v1.0</span>
          </h1>
        </div>

        <nav className="flex items-center gap-6 text-text-sub">
          <Link href="/shortcuts" className="hover:text-text-main transition-colors" title="Keyboard Shortcuts"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="4" width="20" height="16" rx="2" /><path d="M6 8h.001M10 8h.001M14 8h.001M18 8h.001M6 12h.001M10 12h.001M14 12h.001M18 12h.001M6 16h.001M10 16h5" /></svg></Link>
          <Link href="/about" className="hover:text-text-main transition-colors" title="About"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><path d="M12 16v-4M12 8h.01" /></svg></Link>
          <Link href="/settings" className="hover:text-text-main transition-colors" title="Settings"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.38a2 2 0 0 0-.73-2.73l-.15-.1a2 2 0 0 1-1-1.72v-.51a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" /><circle cx="12" cy="12" r="3" /></svg></Link>

          <div className="w-px h-6 bg-text-sub opacity-20 mx-2"></div>

          <Link href="/dashboard" className="flex items-center gap-2 hover:text-text-main transition-colors" title="Profile">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
          </Link>
        </nav>
      </header>

      <TypingTest />

      <footer className="p-8 text-center text-xs text-text-sub opacity-60 mt-auto flex justify-center gap-8">
        <span className="flex items-center gap-1"><span className="bg-text-sub/20 px-1 rounded">tab</span> + <span className="bg-text-sub/20 px-1 rounded">enter</span> restart</span>
        <span className="flex items-center gap-1"><span className="bg-text-sub/20 px-1 rounded">esc</span> - end test</span>
      </footer>
    </main>
  );
}

