'use client'

import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Logo } from "@/components/ui/logo"
import { FileQuestion, Home, ArrowLeft } from "lucide-react"
import Link from "next/link"

export default function NotFound() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md p-8 bg-white shadow-lg">
        <div className="flex flex-col items-center">
          <Logo size="lg" />
          
          <div className="mt-8 p-4 bg-gray-100 rounded-full">
            <FileQuestion className="h-8 w-8 text-[#006039]" />
          </div>
          
          <h1 className="mt-6 text-2xl font-semibold text-gray-900">
            Страница не найдена
          </h1>
          
          <p className="mt-2 text-center text-sm text-gray-600">
            Запрашиваемая страница не существует или была перемещена.
          </p>
          
          <div className="mt-4 text-6xl font-bold text-gray-200">
            404
          </div>
          
          <div className="mt-8 flex gap-3 w-full">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => window.history.back()}
            >
              <ArrowLeft className="mr-2 h-4 w-4 text-[#006039]" />
              Назад
            </Button>
            <Link href="/" className="flex-1">
              <Button className="w-full bg-[#006039] hover:bg-[#006039]/90">
                <Home className="mr-2 h-4 w-4 text-white" />
                На главную
              </Button>
            </Link>
          </div>
        </div>
      </Card>
    </div>
  )
}