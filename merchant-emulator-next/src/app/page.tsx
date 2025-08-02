'use client'

import { useEffect, useState } from 'react'
import dynamic from 'next/dynamic'

// Dynamic imports to avoid SSR issues
const DeviceManager = dynamic(() => import('@/components/device-manager').then(mod => mod.DeviceManager), {
  ssr: false,
  loading: () => <div>Loading devices...</div>
})

const MerchantManager = dynamic(() => import('@/components/merchant-manager').then(mod => mod.MerchantManager), {
  ssr: false,
  loading: () => <div>Loading merchants...</div>
})

const TrafficControl = dynamic(() => import('@/components/traffic-control').then(mod => mod.TrafficControl), {
  ssr: false,
  loading: () => <div>Loading traffic control...</div>
})

const LogsViewer = dynamic(() => import('@/components/logs-viewer').then(mod => mod.LogsViewer), {
  ssr: false,
  loading: () => <div>Loading logs...</div>
})

export default function Home() {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    // Start device health check service
    fetch('/api/health-check', { method: 'POST' })
    
    return () => {
      // Stop health check on unmount
      fetch('/api/health-check', { method: 'DELETE' })
    }
  }, [])

  if (!mounted) {
    return (
      <main className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-3xl font-bold mb-8">Merchant Emulator</h1>
          <p>Loading...</p>
        </div>
      </main>
    )
  }
  
  return (
    <main className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <h1 className="text-3xl font-bold mb-8">Merchant Emulator</h1>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <DeviceManager />
          <MerchantManager />
        </div>
        
        <TrafficControl />
        
        <LogsViewer />
      </div>
    </main>
  )
}