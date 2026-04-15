import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const supabase = createServerClient()
    const { data, error } = await supabase
      .from('documents')
      .select('id, name, size_bytes, chunk_count, created_at')
      .order('created_at', { ascending: false })

    if (error) throw new Error(error.message)
    return NextResponse.json(data ?? [])
  } catch (err) {
    console.error('[library/documents GET]', err)
    return NextResponse.json({ error: 'Dokumente konnten nicht geladen werden.' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { id } = await req.json() as { id: string }
    if (!id) return NextResponse.json({ error: 'ID fehlt.' }, { status: 400 })

    const supabase = createServerClient()
    const { error } = await supabase.from('documents').delete().eq('id', id)
    if (error) throw new Error(error.message)

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[library/documents DELETE]', err)
    return NextResponse.json({ error: 'Löschen fehlgeschlagen.' }, { status: 500 })
  }
}
