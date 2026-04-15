const CHUNK_SIZE = 1500  // characters per chunk
const CHUNK_OVERLAP = 200 // overlap between chunks

export function chunkText(text: string): string[] {
  // Normalize whitespace
  const normalized = text.replace(/\r\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim()

  if (normalized.length <= CHUNK_SIZE) return [normalized]

  const chunks: string[] = []
  let start = 0

  while (start < normalized.length) {
    let end = start + CHUNK_SIZE

    if (end < normalized.length) {
      // Try to break at paragraph boundary
      const paraBreak = normalized.lastIndexOf('\n\n', end)
      if (paraBreak > start + CHUNK_SIZE / 2) {
        end = paraBreak
      } else {
        // Fall back to sentence boundary
        const sentBreak = normalized.lastIndexOf('. ', end)
        if (sentBreak > start + CHUNK_SIZE / 2) {
          end = sentBreak + 1
        }
      }
    }

    const chunk = normalized.slice(start, end).trim()
    if (chunk.length > 50) chunks.push(chunk) // skip tiny fragments

    start = end - CHUNK_OVERLAP
    if (start >= normalized.length) break
  }

  return chunks
}
