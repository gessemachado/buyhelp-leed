import { useState, useEffect } from 'react'
import { Network } from '@capacitor/network'

export function useNetworkStatus() {
  const [isOnline, setIsOnline] = useState(true)

  useEffect(() => {
    // Status inicial
    Network.getStatus()
      .then(status => setIsOnline(status.connected))
      .catch(() => setIsOnline(navigator.onLine))

    // Ouvir mudanças
    let listenerHandle = null
    Network.addListener('networkStatusChange', status => {
      setIsOnline(status.connected)
    }).then(handle => {
      listenerHandle = handle
    }).catch(() => {
      // Fallback para eventos do browser
      const onOnline  = () => setIsOnline(true)
      const onOffline = () => setIsOnline(false)
      window.addEventListener('online', onOnline)
      window.addEventListener('offline', onOffline)
    })

    return () => {
      if (listenerHandle) listenerHandle.remove()
    }
  }, [])

  return isOnline
}
