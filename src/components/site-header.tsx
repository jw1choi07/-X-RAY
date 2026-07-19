import Image from "next/image";

export function SiteHeader() {
  return (
    <header className="fixed top-0 inset-x-0 z-50 flex items-center justify-between px-6 py-4 md:px-10">
      <div className="flex items-center gap-2.5 rounded-full bg-white/70 py-1.5 pr-4 pl-1.5 shadow-sm ring-1 ring-black/5 backdrop-blur-md dark:bg-neutral-900/70 dark:ring-white/10">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white shadow-sm ring-1 ring-neutral-200 dark:bg-neutral-800 dark:ring-neutral-700">
          <Image src="/logo.svg" alt="약관 X-ray 로고" width={20} height={20} priority />
        </div>
        <h1 className="text-sm font-bold tracking-tight text-neutral-900 dark:text-white">약관 X-ray</h1>
      </div>

      <a
        href="https://github.com/jw1choi07/-X-RAY"
        target="_blank"
        rel="noopener noreferrer"
        className="hidden items-center gap-1.5 rounded-full bg-white/70 px-4 py-2 text-xs font-medium text-neutral-500 shadow-sm ring-1 ring-black/5 backdrop-blur-md transition-colors hover:text-neutral-800 sm:flex dark:bg-neutral-900/70 dark:text-neutral-400 dark:ring-white/10 dark:hover:text-neutral-100"
      >
        Powered by Upstage Solar
      </a>
    </header>
  );
}
