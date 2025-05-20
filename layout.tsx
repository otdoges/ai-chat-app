// Imports for layout components
import { Button } from "@/components/ui/button"
import { X } from 'lucide-react'
import { ThemeToggle } from "@/components/theme-toggle"

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <header className="h-14 border-b px-4 flex items-center justify-between">
          <h1 className="text-sm font-medium">GitHub AI Models Chat</h1>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Button variant="ghost" size="sm">
              Save conversation
            </Button>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
              <X className="h-4 w-4" />
            </Button>
          </div>
        </header>
        {children}
      </div>
    </div>
  )
}
