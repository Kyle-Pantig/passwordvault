import { useQuery } from '@tanstack/react-query'

interface VaultData {
  credentials: any[]
  categories: any[]
  subscription: any
  folderLocks: any[]
  sharedFolders: any[]
  invitations: any[]
  twoFactorEnabled: boolean
}

export function useVaultData() {
  return useQuery({
    queryKey: ['vault-data'],
    queryFn: async (): Promise<VaultData> => {
      const response = await fetch('/api/vault-data')
      if (!response.ok) {
        throw new Error('Failed to load vault data')
      }
      const { data } = await response.json()
      return data
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 5 * 60 * 1000, // 5 minutes
    retry: 1,
  })
}
