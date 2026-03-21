export interface ScrapeResult {
  url: string;
  title: string;
  content: string;
  links: string[];
  success: boolean;
  error?: string;
}

export interface SearchResult {
  title: string;
  url: string;
  snippet: string;
}

export class HeadlessBrowser {
  private userAgent = 'Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36';

  async scrapePage(url: string): Promise<ScrapeResult> {
    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'User-Agent': this.userAgent,
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
        },
      });

      if (!response.ok) {
        return {
          url,
          title: '',
          content: '',
          links: [],
          success: false,
          error: `HTTP ${response.status}`,
        };
      }

      const html = await response.text();
      
      const title = this.extractTitle(html);
      const content = this.extractContent(html);
      const links = this.extractLinks(html);

      return {
        url,
        title,
        content: content.substring(0, 10000),
        links: links.slice(0, 50),
        success: true,
      };
    } catch (error: any) {
      return {
        url,
        title: '',
        content: '',
        links: [],
        success: false,
        error: error.message || 'Unknown error',
      };
    }
  }

  private extractTitle(html: string): string {
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    return titleMatch ? this.decodeHtmlEntities(titleMatch[1].trim()) : '';
  }

  private extractContent(html: string): string {
    let content = html;
    
    content = content.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
    content = content.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');
    content = content.replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, '');
    content = content.replace(/<header[^>]*>[\s\S]*?<\/header>/gi, '');
    content = content.replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, '');
    content = content.replace(/<aside[^>]*>[\s\S]*?<\/aside>/gi, '');
    
    content = content.replace(/<[^>]+>/g, ' ');
    
    content = content.replace(/\s+/g, ' ');
    
    return this.decodeHtmlEntities(content.trim());
  }

  private extractLinks(html: string): string[] {
    const linkRegex = /<a[^>]+href=["']([^"']+)["'][^>]*>/gi;
    const links: string[] = [];
    let match;

    while ((match = linkRegex.exec(html)) !== null && links.length < 100) {
      const href = match[1];
      if (href && (href.startsWith('http://') || href.startsWith('https://'))) {
        links.push(href);
      }
    }

    return [...new Set(links)];
  }

  private decodeHtmlEntities(text: string): string {
    const entities: Record<string, string> = {
      '&amp;': '&',
      '&lt;': '<',
      '&gt;': '>',
      '&quot;': '"',
      '&#039;': "'",
      '&apos;': "'",
      '&nbsp;': ' ',
      '&#x27;': "'",
      '&#x2F;': '/',
      '&mdash;': '—',
      '&ndash;': '–',
      '&hellip;': '...',
    };

    return text.replace(/&[#\w]+;/g, entity => entities[entity] || entity);
  }

  async searchDuckDuckGo(query: string, numResults: number = 10): Promise<SearchResult[]> {
    const encodedQuery = encodeURIComponent(query);
    const searchUrl = `https://html.duckduckgo.com/html/?q=${encodedQuery}`;

    try {
      const response = await fetch(searchUrl, {
        method: 'GET',
        headers: {
          'User-Agent': this.userAgent,
        },
      });

      if (!response.ok) {
        console.error('[HeadlessBrowser] Search failed:', response.status);
        return [];
      }

      const html = await response.text();
      
      const results: SearchResult[] = [];
      const resultRegex = /<a[^>]+class="result__a"[^>]+href=["']([^"']+)["'][^>]*>([^<]+)<\/a>[\s\S]*?<a[^>]+class="result__snippet"[^>]*>([^<]+)<\/a>/gi;
      
      let match;
      while ((match = resultRegex.exec(html)) !== null && results.length < numResults) {
        const url = this.decodeHtmlEntities(match[1]);
        const title = this.decodeHtmlEntities(match[2].replace(/<[^>]+>/g, '').trim());
        const snippet = this.decodeHtmlEntities(match[3].replace(/<[^>]+>/g, '').trim());
        
        results.push({ title, url, snippet });
      }

      return results;
    } catch (error) {
      console.error('[HeadlessBrowser] Search error:', error);
      return [];
    }
  }

  async scrapeMultipleUrls(urls: string[]): Promise<ScrapeResult[]> {
    const results: ScrapeResult[] = [];
    
    for (const url of urls.slice(0, 5)) {
      const result = await this.scrapePage(url);
      results.push(result);
      
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    return results;
  }

  extractUsefulContent(html: string, maxLength: number = 5000): string {
    const content = this.extractContent(html);
    
    const paragraphs = content.split(/(?<=[.!?])\s+/).filter(p => p.length > 20);
    
    let useful = '';
    for (const p of paragraphs) {
      if ((useful + p).length > maxLength) break;
      useful += p + ' ';
    }

    return useful.trim();
  }
}

export const headlessBrowser = new HeadlessBrowser();
