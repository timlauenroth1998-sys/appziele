import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'

// pdf-parse is a CommonJS module
// eslint-disable-next-line @typescript-eslint/no-require-imports
const pdf = require('pdf-parse') as (buf: Buffer) => Promise<{ text: string }>
import { chunkText } from '@/lib/chunker'
import { embedTexts } from '@/lib/voyageai'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

const BATCH_SIZE = 10 // embed this many chunks at once

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json({ error: 'Keine Datei übermittelt.' }, { status: 400 })
    }
    if (!file.name.toLowerCase().endsWith('.pdf')) {
      return NextResponse.json({ error: 'Nur PDF-Dateien werden unterstützt.' }, { status: 400 })
    }
    if (file.size > 20 * 1024 * 1024) {
      return NextResponse.json({ error: 'Datei zu groß (max. 20 MB).' }, { status: 400 })
    }

    // Parse PDF
    const buffer = Buffer.from(await file.arrayBuffer())
    const parsed = await pdf(buffer)
    const rawText = parsed.text

    if (!rawText || rawText.trim().length < 100) {
      return NextResponse.json({ error: 'PDF enthält keinen lesbaren Text.' }, { status: 400 })
    }

    // Split into chunks
    const chunks = chunkText(rawText)

    // Create document record
    const supabase = createServerClient()
    const { data: doc, error: docError } = await supabase
      .from('documents')
      .insert({ name: file.name.replace('.pdf', ''), size_bytes: file.size, chunk_count: chunks.length })
      .select('id')
      .single()

    if (docError || !doc) {
      throw new Error(`Supabase Fehler: ${docError?.message}`)
    }

    // Embed and store chunks in batches
    const chunkRows: Array<{ document_id: string; content: string; embedding: number[]; chunk_index: number }> = []

    for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
      const batch = chunks.slice(i, i + BATCH_SIZE)
      const embeddings = await embedTexts(batch)
      batch.forEach((content, j) => {
        chunkRows.push({ document_id: doc.id, content, embedding: embeddings[j], chunk_index: i + j })
      })
    }

    const { error: chunkError } = await supabase.from('document_chunks').insert(chunkRows)
    if (chunkError) throw new Error(`Chunk-Speicherung fehlgeschlagen: ${chunkError.message}`)

    return NextResponse.json({ id: doc.id, name: file.name, chunkCount: chunks.length })
  } catch (err) {
    console.error('[library/upload]', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Upload fehlgeschlagen.' },
      { status: 500 }
    )
  }
}
