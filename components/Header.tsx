import { BookOpen } from 'lucide-react'

export function Header() {
  return (
    <header className="bg-primary text-primary-foreground py-4">
      <div className="container mx-auto px-4">
        <div className="flex items-center space-x-2">
          <BookOpen className="h-6 w-6" />
          <h1 className="text-2xl font-bold">Consultant Report Generator</h1>
        </div>
      </div>
    </header>
  )
}

