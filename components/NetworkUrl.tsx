'use client'

import { useState, useEffect } from 'react'

export function NetworkUrl() {
  const [ipAddress, setIpAddress] = useState<string>('localhost')

  useEffect(() => {
    // Function to get local IP address
    const getLocalIp = async () => {
      try {
        const response = await fetch('/api/network-ip')
        const data = await response.json()
        if (data.ip) {
          setIpAddress(data.ip)
        }
      } catch (error) {
        console.error('Failed to get network IP:', error)
      }
    }

    getLocalIp()
  }, [])

  return (
    <div className="fixed top-2 right-2 text-xs text-gray-500 bg-white/80 p-2 rounded shadow-sm z-50">
      Network URL: http://{ipAddress}:3000
    </div>
  )
} 