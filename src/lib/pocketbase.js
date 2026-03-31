import PocketBase from 'pocketbase'

export const pb = new PocketBase(import.meta.env.VITE_PB_URL || 'https://buyhelp-leads.fly.dev')

// Mantém auth válida entre sessões (PocketBase salva no localStorage automaticamente)
pb.autoCancellation(false)
