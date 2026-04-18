import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// POST /api/users - Create a new anonymous user
export async function POST() {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('users')
      .insert({})
      .select('id, created_at')
      .single()

    if (error) {
      console.error('Error creating user:', error)
      return NextResponse.json(
        { error: 'Failed to create user' },
        { status: 500 }
      )
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    )
  }
}
