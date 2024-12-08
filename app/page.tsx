'use client'

import ConsultantReportGenerator from "@/components/ConsultantReportGenerator"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"

export default function Home() {
  return (
    <>
      <Button 
        className="fixed top-4 right-4 z-50"
        onClick={() => toast('Hello!')}
      >
        Test Toast
      </Button>
      <ConsultantReportGenerator />
    </>
  )
}

