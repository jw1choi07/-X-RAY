import Image from "next/image";

export function SiteHeader() {
  return (
    <header className="fixed top-0 right-0 z-50 flex items-center gap-3 px-6 py-5 md:px-10">
      <div className="text-right">
        <p className="text-[10px] font-semibold tracking-[0.2em] text-neutral-400 uppercase">
          Size up your terms
        </p>
        <h1 className="text-lg font-bold tracking-tight text-neutral-900 md:text-xl">약관 X-ray</h1>
      </div>
      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white shadow-md ring-1 ring-neutral-200">
        <Image src="/logo.svg" alt="약관 X-ray 로고" width={28} height={28} priority />
      </div>
    </header>
  );
}
