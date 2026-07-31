import Link from "next/link"
import { Logo } from "@/components/Logo"

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="dark min-h-screen bg-[#0a0a0a] flex flex-col items-center justify-center px-4">
      <Link href="/" className="flex items-center gap-2 mb-8 text-gray-400 hover:text-white transition-colors">
        <Logo className="w-[50px] h-[50px] text-amber-400" />
        <span className="font-semibold">ReadShelf</span>
      </Link>
      {children}
    </div>
  )
}
