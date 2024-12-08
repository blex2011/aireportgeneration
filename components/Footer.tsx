export function Footer() {
  return (
    <footer className="bg-secondary text-secondary-foreground py-4 w-full mt-8">
      <div className="container mx-auto px-4 text-center">
        <p>&copy; {new Date().getFullYear()} Consultant Report Generator. All rights reserved.</p>
      </div>
    </footer>
  )
}

