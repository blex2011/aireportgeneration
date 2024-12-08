import { NextResponse } from 'next/server'
import { networkInterfaces } from 'os'

export async function GET() {
  try {
    const nets = networkInterfaces()
    let ip = 'localhost'

    // Look through all network interfaces
    for (const name of Object.keys(nets)) {
      for (const net of nets[name] ?? []) {
        // Skip internal and non-IPv4 addresses
        if (!net.internal && net.family === 'IPv4') {
          ip = net.address
          break
        }
      }
    }

    return NextResponse.json({ ip })
  } catch (error) {
    console.error('Failed to get network IP:', error)
    return NextResponse.json({ ip: 'localhost' })
  }
} 