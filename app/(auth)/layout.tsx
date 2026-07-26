import { BookOpen } from "lucide-react"
import Link from "next/link"

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#0a0a0a] flex flex-col items-center justify-center px-4">
      <Link href="/" className="flex items-center gap-2 mb-8 text-gray-400 hover:text-white transition-colors">
        <BookOpen className="w-5 h-5 text-violet-400" />
        <span className="font-semibold">ReadShelf</span>
      </Link>
      {children}
    </div>
  )
}
