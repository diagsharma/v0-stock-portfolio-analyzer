import { NextResponse } from 'next/server'

import { requireUser } from '@/lib/supabase/auth'
import type { Asset, SavedPortfolio } from '@/lib/types'

const MAX_ASSETS = 10
const TICKER_PATTERN = /^[A-Z]{1,5}$/

function mapRow(row: Record<string, unknown>): SavedPortfolio {
  return {
    id: row.id as string,
    name: row.name as string,
    assets: (row.assets as Asset[]) ?? [],
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  }
}

export async function GET() {
  const auth = await requireUser()

  if ('error' in auth) return auth.error

  const { supabase, user } = auth

  const { data, error: queryError } = await supabase
    .from('saved_portfolios')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  if (queryError) {
    return NextResponse.json({ error: queryError.message }, { status: 500 })
  }

  return NextResponse.json((data ?? []).map(mapRow))
}

export async function POST(request: Request) {
  const auth = await requireUser()

  if ('error' in auth) return auth.error

  const { supabase, user } = auth

  const body = (await request.json()) as { name?: string; assets?: Asset[] }
  const assets = body.assets ?? []

  if (assets.length === 0 || assets.length > MAX_ASSETS) {
    return NextResponse.json(
      { error: `A portfolio needs between 1 and ${MAX_ASSETS} assets` },
      { status: 400 }
    )
  }

  const cleaned: Asset[] = assets.map((asset) => ({
    id: String(asset.id),
    symbol: String(asset.symbol).trim().toUpperCase(),
    weight: Number(asset.weight),
  }))

  if (cleaned.some((asset) => !TICKER_PATTERN.test(asset.symbol))) {
    return NextResponse.json({ error: 'Every symbol must be 1-5 letters' }, { status: 400 })
  }

  const totalWeight = cleaned.reduce((sum, asset) => sum + asset.weight, 0)

  if (!Number.isFinite(totalWeight) || Math.abs(totalWeight - 100) > 0.01) {
    return NextResponse.json({ error: 'Asset weights must sum to 100%' }, { status: 400 })
  }

  const { data, error: insertError } = await supabase
    .from('saved_portfolios')
    .insert({
      // Taken from the session, never from the request body, so a caller
      // cannot write a row into someone else's account.
      user_id: user.id,
      name: body.name?.trim() || 'Untitled portfolio',
      assets: cleaned,
    })
    .select()
    .single()

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 })
  }

  return NextResponse.json(mapRow(data), { status: 201 })
}
