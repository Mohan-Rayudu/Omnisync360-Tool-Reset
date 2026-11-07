/**
 * Sanitizes and extracts clean readable text from raw email HTML bodies.
 * Removes head, styles, scripts, HTML tags, and decodes HTML entities.
 */
export function cleanEmailHtml(rawHtml: string | null | undefined): string {
  if (!rawHtml) return 'No message content.';

  let text = rawHtml;

  // 1. Remove style, script, head, link, and meta tags with their contents
  text = text.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');
  text = text.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
  text = text.replace(/<head[^>]*>[\s\S]*?<\/head>/gi, '');
  text = text.replace(/<xml[^>]*>[\s\S]*?<\/xml>/gi, '');

  // 2. Normalize common line breaks
  text = text.replace(/<br\s*[\/]?>/gi, '\n');
  text = text.replace(/<\/(p|div|tr|li|h[1-6])>/gi, '\n');
  text = text.replace(/<\/(blockquote)>/gi, '\n');

  // 3. Strip all remaining HTML tags
  text = text.replace(/<[^>]+>/g, '');

  // 4. Decode common HTML entities
  text = text.replace(/&nbsp;/gi, ' ');
  text = text.replace(/&amp;/gi, '&');
  text = text.replace(/&lt;/gi, '<');
  text = text.replace(/&gt;/gi, '>');
  text = text.replace(/&quot;/gi, '"');
  text = text.replace(/&#39;/gi, "'");
  text = text.replace(/&apos;/gi, "'");
  text = text.replace(/&ndash;/gi, '–');
  text = text.replace(/&mdash;/gi, '—');
  text = text.replace(/&bull;/gi, '•');

  // 5. Clean up excessive whitespace and blank lines
  text = text.replace(/\r\n/g, '\n');
  text = text.replace(/[ \t]+/g, ' ');
  text = text.replace(/\n\s*\n\s*\n+/g, '\n\n');

  return text.trim() || 'No text content in this email.';
}
