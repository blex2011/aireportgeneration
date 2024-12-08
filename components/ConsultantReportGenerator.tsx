'use client'

import { useState } from 'react'
import { Header } from '@/components/Header'
import { Footer } from '@/components/Footer'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Underline from '@tiptap/extension-underline'
import TextAlign from '@tiptap/extension-text-align'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Bold, Italic, Underline as UnderlineIcon, AlignLeft, AlignCenter, AlignRight, List, Copy } from 'lucide-react'
import { toast } from 'sonner'
import { NetworkUrl } from './NetworkUrl'

export default function ConsultantReportGenerator() {
  const [reportContent, setReportContent] = useState('<p>Your report content goes here...</p>')
  const [url, setUrl] = useState('')
  const [instructions, setInstructions] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
    ],
    content: reportContent,
    onUpdate: ({ editor }) => {
      setReportContent(editor.getHTML())
    },
    editorProps: {
      attributes: {
        class: 'min-h-[500px] w-full h-full outline-none',
      },
    },
  })

  const normalizeUrl = (input: string): string => {
    let url = input.trim()
    if (url && !url.startsWith('http://') && !url.startsWith('https://')) {
      url = 'https://' + url
    }
    return url
  }

  const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUrl(e.target.value)
  }

  const processWithOpenAI = async (url: string, mockContent?: string) => {
    try {
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url,
          instructions: instructions || 'Please analyze this website and provide a detailed consultant report.',
          mockContent // Only used in test mode
        }),
      })

      const data = await response.json()
      console.log('OpenAI Response:', { status: response.status, data })

      if (!response.ok) {
        toast.error(data.error || 'Failed to generate report')
        return
      }

      if (!data.html) {
        toast.error('No report content received')
        return
      }

      setReportContent(data.html)
      editor?.commands.setContent(data.html)
      
      toast.success('Report Generated', {
        description: 'Your report has been generated successfully.',
      })
    } catch (err) {
      console.error('Error generating report:', err)
      toast.error('Failed to generate report with AI')
    }
  }

  const handleGenerateReport = async (isTestMode = false) => {
    if (!url) {
      toast.error('Please enter a URL')
      return
    }

    const normalizedUrl = normalizeUrl(url)
    setUrl(normalizedUrl)
    setIsLoading(true)

    try {
      if (isTestMode) {
        // In test mode, skip Firecrawl and use mock content
        await processWithOpenAI(normalizedUrl, 'This is mock content for testing OpenAI integration.')
      } else {
        // Normal flow with Firecrawl
        const response = await fetch('/api/generate', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            url: normalizedUrl,
            instructions: instructions || 'Please analyze this website and provide a detailed consultant report.'
          }),
        })

        const data = await response.json()
        console.log('Response:', { status: response.status, data })

        if (!response.ok) {
          if (response.status === 402) {
            toast.error('Insufficient Credits', {
              description: 'Unable to crawl website due to insufficient credits. Please upgrade your plan.',
              action: {
                label: 'Upgrade Plan',
                onClick: () => window.open('https://firecrawl.dev/pricing', '_blank'),
              },
            })
          } else {
            toast.error(data.error || 'Failed to generate report')
          }
          return
        }

        await processWithOpenAI(normalizedUrl)
      }
    } catch (err) {
      console.error('Error:', err)
      toast.error('Failed to process request')
    } finally {
      setIsLoading(false)
    }
  }

  const handleCheerioExtract = async () => {
    if (!url) {
      toast.error('Please enter a URL')
      return
    }

    const normalizedUrl = normalizeUrl(url)
    setUrl(normalizedUrl)
    setIsLoading(true)

    try {
      // First extract content with Cheerio
      const response = await fetch('/api/crawl', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url: normalizedUrl }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to extract content')
      }

      if (!data.html) {
        throw new Error('No content received from scraper')
      }

      // Now send to OpenAI for report generation
      const aiResponse = await fetch('/api/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url: normalizedUrl,
          instructions: instructions || 'Please analyze this website and provide a detailed consultant report.',
          mockContent: data.html // Pass the extracted content to OpenAI
        }),
      })

      const aiData = await aiResponse.json()

      if (!aiResponse.ok) {
        throw new Error(aiData.error || 'Failed to generate report')
      }

      if (!aiData.html) {
        throw new Error('No report content received')
      }

      setReportContent(aiData.html)
      editor?.commands.setContent(aiData.html)
      
      toast.success('Report Generated', {
        description: 'Content extracted and analyzed successfully.',
      })
    } catch (err: any) {
      console.error('Processing error:', err)
      toast.error('Failed to process content', {
        description: err.message || 'An unexpected error occurred',
      })
    } finally {
      setIsLoading(false)
    }
  }

  if (!editor) {
    return null
  }

  return (
    <div className="min-h-screen flex flex-col">
      <NetworkUrl />
      <Header />
      <main className="flex-grow container mx-auto px-4 py-8">
        <div className="mb-6 space-y-4">
          <div className="flex flex-col gap-4">
            <Input
              type="url"
              placeholder="Enter website URL (e.g., https://example.com)"
              value={url}
              onChange={handleUrlChange}
              className="flex-grow"
              disabled={isLoading}
            />
            <Input
              type="text"
              placeholder="Enter instructions for the report (optional)"
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              className="flex-grow"
              disabled={isLoading}
            />
            <div className="flex justify-end gap-2">
              <Button 
                onClick={handleCheerioExtract}
                variant="outline"
                className="w-full sm:w-auto"
                disabled={isLoading}
              >
                {isLoading ? 'Processing...' : 'Generate with Cheerio'}
              </Button>
              <Button 
                onClick={() => handleGenerateReport(true)}
                variant="outline"
                className="w-full sm:w-auto"
                disabled={isLoading}
              >
                {isLoading ? 'Testing...' : 'Test with OpenAI'}
              </Button>
              <Button 
                onClick={() => handleGenerateReport(false)}
                className="w-full sm:w-auto"
                disabled={isLoading}
              >
                {isLoading ? 'Generating...' : 'Generate with Firecrawl'}
              </Button>
            </div>
          </div>
        </div>
        <div className="border border-input rounded-md p-4 w-full bg-background flex flex-col h-[600px]">
          <div className="mb-4 flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={() => editor.chain().focus().toggleBold().run()}
              data-active={editor.isActive('bold')}
              disabled={isLoading}
            >
              <Bold className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={() => editor.chain().focus().toggleItalic().run()}
              data-active={editor.isActive('italic')}
              disabled={isLoading}
            >
              <Italic className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={() => editor.chain().focus().toggleUnderline().run()}
              data-active={editor.isActive('underline')}
              disabled={isLoading}
            >
              <UnderlineIcon className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={() => editor.chain().focus().toggleBulletList().run()}
              data-active={editor.isActive('bulletList')}
              disabled={isLoading}
            >
              <List className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={() => editor.chain().focus().setTextAlign('left').run()}
              data-active={editor.isActive({ textAlign: 'left' })}
              disabled={isLoading}
            >
              <AlignLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={() => editor.chain().focus().setTextAlign('center').run()}
              data-active={editor.isActive({ textAlign: 'center' })}
              disabled={isLoading}
            >
              <AlignCenter className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={() => editor.chain().focus().setTextAlign('right').run()}
              data-active={editor.isActive({ textAlign: 'right' })}
              disabled={isLoading}
            >
              <AlignRight className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={() => {
                // Get the editor content element
                const editorContent = document.querySelector('.ProseMirror')
                if (editorContent) {
                  // Create a selection range
                  const range = document.createRange()
                  range.selectNodeContents(editorContent)
                  
                  // Create a selection
                  const selection = window.getSelection()
                  if (selection) {
                    // Clear any existing selection
                    selection.removeAllRanges()
                    // Add our range
                    selection.addRange(range)
                    
                    try {
                      // Execute copy command
                      document.execCommand('copy')
                      // Clear the selection
                      selection.removeAllRanges()
                      toast.success('Content copied to clipboard')
                    } catch (err) {
                      console.error('Copy failed:', err)
                      toast.error('Failed to copy content')
                    }
                  }
                }
              }}
              disabled={isLoading}
            >
              <Copy className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex-grow overflow-y-auto">
            <EditorContent 
              editor={editor} 
              className="prose prose-sm sm:prose lg:prose-lg max-w-none h-full"
            />
          </div>
        </div>
      </main>
      <Footer />
    </div>
  )
}

