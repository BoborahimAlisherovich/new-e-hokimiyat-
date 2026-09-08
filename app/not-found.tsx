import Link from "next/link"
import { Button } from "@/components/ui/button"

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-[70vh] max-w-xl flex-col justify-center gap-4 p-6">
      <h1 className="text-2xl font-semibold">Sahifa topilmadi</h1>
      <p className="text-sm text-muted-foreground">Manzil noto‘g‘ri yoki sahifa o‘chirilgan bo‘lishi mumkin.</p>
      <div className="flex gap-2">
        <Button asChild>
          <Link href="/dashboard">Dashboard</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/">Bosh sahifa</Link>
        </Button>
      </div>
    </main>
  )
}

