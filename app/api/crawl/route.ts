import { load } from 'cheerio'
import { NextResponse } from 'next/server'

function formatContent($: ReturnType<typeof load>, selector: string): string {
  const element = $(selector)
  let formatted = ''

  // Process headings
  element.find('h1, h2, h3, h4, h5, h6').each((_, el) => {
    const tagName = $(el).prop('tagName')?.toLowerCase()
    formatted += `\n<${tagName}>${$(el).text().trim()}</${tagName}>\n`
  })

  // Process paragraphs
  element.find('p').each((_, el) => {
    const text = $(el).text().trim()
    if (text) {
      formatted += `\n<p>${text}</p>\n`
    }
  })

  // Process lists
  element.find('ul, ol').each((_, list) => {
    const tagName = $(list).prop('tagName')?.toLowerCase()
    formatted += `\n<${tagName}>\n`
    $(list).find('li').each((_, item) => {
      formatted += `  <li>${$(item).text().trim()}</li>\n`
    })
    formatted += `</${tagName}>\n`
  })

  return formatted || element.text().trim()
}

export async function POST(request: Request) {
  try {
    const { url } = await request.json()

    if (!url) {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 })
    }

    console.log('Fetching URL:', url)
    const response = await fetch(url)
    if (!response.ok) {
      throw new Error(`Failed to fetch URL: ${response.statusText}`)
    }

    const html = await response.text()
    const $ = load(html)

    // Get the page title
    const title = $('title').text().trim()
    console.log('Title:', title)

    // Get meta description
    const description = $('meta[name="description"]').attr('content')?.trim() || ''
    console.log('Description:', description)

    // Get main content with better formatting
    const mainContentSelectors = ['main', 'article', '#content', '.content', '.main']
    let mainContent = ''
    
    // Try each selector until we find content
    for (const selector of mainContentSelectors) {
      if ($(selector).length) {
        mainContent = formatContent($, selector)
        if (mainContent) break
      }
    }

    // Fallback to body if no main content found
    if (!mainContent) {
      mainContent = formatContent($, 'body')
    }

    console.log('Formatted Content Preview:', mainContent.substring(0, 200))

    // Log the full result object
    const result = {
      url,
      title,
      description,
      mainContent: mainContent.slice(0, 5000), // Still limit length
      timestamp: new Date().toISOString()
    }
    
    console.log('Full Cheerio Result:', JSON.stringify(result, null, 2))

    // Format the content for display with better structure
    const formattedContent = `
      <article class="prose lg:prose-xl mx-auto">
        <header class="text-center mb-8">
          <h1 class="text-3xl font-bold mb-4">${title || 'Untitled Page'}</h1>
          ${description ? `<p class="text-xl text-gray-600 mb-4">${description}</p>` : ''}
        </header>
        <section class="content">
          ${mainContent}
        </section>
        <footer class="mt-8 pt-4 border-t text-sm text-gray-500">
          <p>Source: <a href="${url}" target="_blank" rel="noopener noreferrer">${url}</a></p>
          <p>Extracted: ${new Date().toLocaleString()}</p>
        </footer>
      </article>
    `

    return NextResponse.json({ html: formattedContent })
  } catch (error: any) {
    console.error('Scraping error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to scrape the website' },
      { status: 500 }
    )
  }
} 