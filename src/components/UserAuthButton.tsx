'use client'

import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Skeleton } from '@/components/ui/skeleton'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

export function UserAuthButton() {
  const router = useRouter()
  const { user, isLoaded } = useAuth()

  if (!isLoaded) return <Skeleton className="h-8 w-8 rounded-full" />

  if (!user) {
    return (
      <Button
        size="sm"
        variant="outline"
        onClick={() => router.push('/auth')}
      >
        Anmelden
      </Button>
    )
  }

  const initial = user.email?.[0]?.toUpperCase() ?? '?'
  const email = user.email ?? ''

  async function handleLogout() {
    await supabase.auth.signOut()
    window.location.href = '/goals'
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Avatar className="h-8 w-8 cursor-pointer hover:opacity-80 transition-opacity">
          <AvatarFallback className="bg-indigo-600 text-white text-sm font-medium">
            {initial}
          </AvatarFallback>
        </Avatar>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuLabel className="text-xs text-gray-500 font-normal truncate">
          {email}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={handleLogout}
          className="text-red-600 cursor-pointer focus:text-red-600"
        >
          Abmelden
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
