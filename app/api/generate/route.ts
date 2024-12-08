import OpenAI from 'openai'
import { NextResponse } from 'next/server'
import { aiConfig } from '@/utils/ai-config'
import FirecrawlApp from '@mendable/firecrawl-js'

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

// Initialize Firecrawl client
const firecrawl = new FirecrawlApp({
  apiKey: process.env.FIRECRAWL_API_KEY,
})

interface OpenAIError extends Error {
  code?: string;
  param?: string;
  type?: string;
  status?: number;
}

async function generateReportWithOpenAI(url: string, content: string, instructions: string) {
  const model = aiConfig.models[aiConfig.defaultModel]
  
  try {
    const completion = await openai.chat.completions.create({
      model: model.name,
      messages: [
        {
          role: "system",
          content: "You are a professional consultant who analyzes websites and generates detailed reports. Your reports should be well-structured, using appropriate HTML tags for formatting."
        },
        {
          role: "user",
          content: `Please analyze this website (${url}) and generate a detailed consultant report. Here's the content to analyze:\n\n${content}\n\nAdditional instructions: ${instructions}`
        }
      ],
      max_tokens: model.completionTokens,
    })

    const report = completion.choices[0]?.message?.content
    if (!report) {
      throw new Error('No report content generated')
    }

    return report
  } catch (error) {
    const openAIError = error as OpenAIError
    
    if (openAIError.code === 'context_length_exceeded') {
      throw new Error(
        'The content is too long for analysis. Please try with a smaller section of the website.'
      )
    }
    
    if (openAIError.code === 'rate_limit_exceeded') {
      throw new Error(
        'OpenAI rate limit exceeded. Please try again in a few minutes.'
      )
    }

    if (openAIError.status === 429) {
      throw new Error(
        'Too many requests. Please try again in a few minutes.'
      )
    }

    if (openAIError.status === 400) {
      throw new Error(
        'Invalid request to AI service. Please try with different content.'
      )
    }

    throw new Error(
      'Failed to generate report. Please try again.'
    )
  }
}

export async function POST(request: Request) {
  try {
    const { url, instructions, mockContent } = await request.json()

    if (!url) {
      return NextResponse.json(
        { error: 'URL is required' },
        { status: 400 }
      )
    }

    let content = mockContent
    if (!content) {
      try {
        const response = await firecrawl.crawlUrl(url, {
          limit: 1,
        })
        
        if (!response.success || !response.data?.[0]?.markdown) {
          throw new Error('Failed to crawl website')
        }
        
        content = response.data[0].markdown
      } catch (crawlError) {
        if (crawlError instanceof Error && 
            (crawlError.message.includes('402') || crawlError.message.includes('Insufficient credits'))) {
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
        throw crawlError
      }
    }

    try {
      const report = await generateReportWithOpenAI(url, content, instructions)
      return NextResponse.json({ html: report })
    } catch (aiError) {
      if (aiError instanceof Error) {
        return NextResponse.json(
          { error: aiError.message },
          { status: aiError.message.includes('rate limit') ? 429 : 400 }
        )
      }
      throw aiError
    }

  } catch (error: unknown) {
    console.error('Error generating report:', error)
    const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred'
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    )
  }
}