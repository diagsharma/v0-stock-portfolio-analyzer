'use client'

import { LogOut } from 'lucide-react'
import { toast } from 'sonner'

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Skeleton } from '@/components/ui/skeleton'
import { useUser } from '@/components/auth/use-user'

/** Google's mark, so the button reads as an official sign-in affordance. */
function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M23.06 12.25c0-.85-.08-1.67-.22-2.45H12v4.63h6.2a5.3 5.3 0 0 1-2.3 3.48v2.89h3.72c2.17-2 3.44-4.95 3.44-8.55Z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.1 0 5.7-1.03 7.62-2.8l-3.72-2.88c-1.03.69-2.35 1.1-3.9 1.1-3 0-5.55-2.03-6.46-4.76H1.69v2.98A11.99 11.99 0 0 0 12 24Z"
      />
      <path
        fill="#FBBC05"
        d="M5.54 14.66a7.2 7.2 0 0 1 0-4.6V7.08H1.69a12 12 0 0 0 0 10.76l3.85-3.18Z"
      />
      <path
        fill="#EA4335"
        d="M12 4.75c1.69 0 3.2.58 4.4 1.72l3.3-3.3C17.7 1.28 15.1 0 12 0 7.39 0 3.4 2.65 1.69 6.5l3.85 2.98C6.45 6.78 9 4.75 12 4.75Z"
      />
    </svg>
  )
}

export function UserMenu() {
  const { user, isLoading, supabase, isConfigured } = useUser()

  // Without Supabase configured there is no account to sign in to, and the
  // app still runs anonymously, so the control is simply not shown.
  if (!isConfigured) {
    return null
  }

  if (isLoading) {
    return <Skeleton className="h-9 w-32" />
  }

  const signIn = async () => {
    const { error } = await supabase!.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    })

    if (error) {
      toast.error('Could not start sign-in', { description: error.message })
    }
  }

  if (!user) {
    return (
      <Button variant="outline" onClick={signIn} className="gap-2">
        <GoogleIcon />
        Sign in with Google
      </Button>
    )
  }

  const email = user.email ?? ''
  const name = (user.user_metadata?.full_name as string | undefined) ?? email
  const avatarUrl = user.user_metadata?.avatar_url as string | undefined

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="gap-2 px-2">
          <Avatar>
            {avatarUrl && <AvatarImage src={avatarUrl} alt="" />}
            <AvatarFallback>{(name[0] ?? '?').toUpperCase()}</AvatarFallback>
          </Avatar>
          <span className="hidden max-w-[12rem] truncate sm:inline">{name}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel className="truncate font-normal text-muted-foreground">
          {email}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => supabase!.auth.signOut()}>
          <LogOut className="mr-2 h-4 w-4" />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
