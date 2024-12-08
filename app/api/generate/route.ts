import OpenAI from 'openai'
import { NextResponse } from 'next/server'
import FirecrawlApp from '@mendable/firecrawl-js'

// Validate environment variables
if (!process.env.OPENAI_API_KEY) {
  throw new Error('OPENAI_API_KEY environment variable is not set')
}

if (!process.env.FIRECRAWL_API_KEY) {
  throw new Error('FIRECRAWL_API_KEY environment variable is not set')
}

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
})

const firecrawl = new FirecrawlApp({
  apiKey: process.env.FIRECRAWL_API_KEY
})

// Configuration constants
const MAX_PAGES = 1
const POLL_INTERVAL = 2000 // 2 seconds
const MAX_POLL_ATTEMPTS = 10

interface FirecrawlMetadata {
  title: string;
  description: string;
  language?: string;
  sourceURL?: string;
}

interface CrawlResponse {
  success: boolean;
  error?: string;
  id?: string;
}

interface StatusResponse {
  status: 'scraping' | 'completed' | 'failed';
  error?: string;
  data?: Array<{
    markdown: string;
    metadata: FirecrawlMetadata;
  }>;
}

async function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

function normalizeUrl(url: string): string {
  try {
    url = url.trim().replace(',', '.')
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = 'https://' + url
    }
    return new URL(url).toString()
  } catch (error) {
    throw new Error('Please enter a valid URL (e.g., https://example.com)')
  }
}

async function generateReportWithOpenAI(url: string, content: string, instructions: string) {
  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: `You are a professional consultant who generates detailed HTML reports.

Always follow the INSTRUCTIONS provided by the user and structure your response as valid HTML with:
- Semantic HTML5 elements (article, section, header, etc.)
- Proper heading hierarchy (h1, h2, h3)
- Lists (ul, ol) for findings and recommendations
- Paragraphs for detailed analysis
- Tables where appropriate for structured data
Do not include <!DOCTYPE>, <html>, <head>, or <body> tags.`
        },
        {
          role: "user",
          content: `Please analyze the following website content and generate a detailed consultant report.

URL: 
${url}

WEBSITE CONTENT:
${content}

INSTRUCTIONS:
${instructions || 'Provide a comprehensive analysis of the website content.'}

Generate a report that includes:
1. Executive Summary
2. Key Findings
3. Detailed Analysis
4. Recommendations
5. Conclusion

Format the response as clean, semantic HTML that can be directly inserted into a webpage.`
        }
      ],
      temperature: 0.7, // Add some creativity while keeping professional tone
      max_tokens: 2000  // Allow for longer, detailed reports
    })

    const html = completion.choices[0].message.content
    
    // Ensure we got HTML content
    if (!html?.includes('<')) {
      throw new Error('OpenAI did not return HTML content')
    }

    return html
  } catch (error: any) {
    console.error('OpenAI error:', error)
    if (error?.response?.status === 429) {
      throw new Error('OpenAI rate limit exceeded. Please try again in a few minutes.')
    }
    throw new Error('Failed to generate report with AI. Please try again.')
  }
}

export async function POST(request: Request) {
  console.log('Received POST request to /api/generate')
  
  try {
    const { url: rawUrl, instructions, mockContent } = await request.json()
    console.log('Request payload:', { rawUrl, instructions, isTestMode: !!mockContent })

    if (!rawUrl) {
      return NextResponse.json({ error: 'Please enter a URL' }, { status: 400 })
    }

    const url = normalizeUrl(rawUrl)
    
    // If mockContent is provided, skip Firecrawl and use it directly
    if (mockContent) {
      console.log('Test mode: Using mock content')
      const html = await generateReportWithOpenAI(url, mockContent, instructions)
      return NextResponse.json({ html })
    }

    // Normal flow with Firecrawl
    console.log(`Starting crawl (limited to ${MAX_PAGES} pages)...`)
    try {
      const crawlResponse = await firecrawl.crawlUrl(url, {
        limit: MAX_PAGES
      }) as CrawlResponse

      if (!crawlResponse.success || !crawlResponse.id) {
        throw new Error(crawlResponse.error || 'Failed to start website crawl')
      }

      console.log('Crawl started, polling for results...')
      let attempts = 0

      while (attempts < MAX_POLL_ATTEMPTS) {
        console.log(`Polling attempt ${attempts + 1}/${MAX_POLL_ATTEMPTS}...`)
        const statusResponse = await firecrawl.checkCrawlStatus(crawlResponse.id) as StatusResponse

        if (statusResponse.status === 'completed' && statusResponse.data?.[0]) {
          const { markdown } = statusResponse.data[0]
          console.log('Crawl completed, generating report...')
          
          const html = await generateReportWithOpenAI(url, markdown, instructions)
          return NextResponse.json({ html })
        }

        if (statusResponse.status === 'failed') {
          throw new Error(`Website crawl failed: ${statusResponse.error}`)
        }

        await delay(POLL_INTERVAL)
        attempts++
      }

      throw new Error('Website crawl timed out. Please try again.')

    } catch (error: any) {
      console.error('Firecrawl error:', error)
      if (error?.response?.status === 402 || error?.message?.includes('Insufficient credits')) {
        return NextResponse.json(
          { error: 'Insufficient credits' },
          { 
            status: 402,
            statusText: JSON.stringify({
              message: 'Unable to crawl website due to insufficient credits.',
              action: 'Please upgrade your plan at https://firecrawl.dev/pricing or try reducing the request limit.',
              link: 'https://firecrawl.dev/pricing'
            })
          }
        )
      }
      throw error
    }

  } catch (error: any) {
    console.error('API error:', error)
    
    const status = error?.response?.status || error?.statusCode || 500
    const message = error?.message || 'An unexpected error occurred'
    
    return NextResponse.json({ error: message }, { status })
  }
}