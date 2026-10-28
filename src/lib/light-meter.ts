/**
 * Light Meter utility — measures ambient light using camera or sensor
 */

export interface LightReading {
  lux: number
  method: 'camera' | 'sensor'
  period: 'morning' | 'noon' | 'evening'
}

/**
 * Detect current time period
 */
export function getCurrentPeriod(): 'morning' | 'noon' | 'evening' {
  const hour = new Date().getHours()
  if (hour >= 6 && hour < 10) return 'morning'
  if (hour >= 10 && hour < 15) return 'noon'
  return 'evening'
}

/**
 * Check if device supports light measurement
 */
export function isLightMeterSupported(): { supported: boolean; method: 'camera' | 'sensor' | 'none'; reason?: string } {
  // Check for AmbientLightSensor (best accuracy)
  if ('AmbientLightSensor' in window) {
    return { supported: true, method: 'sensor' }
  }

  // Check for camera (fallback — most phones)
  if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
    return { supported: true, method: 'camera' }
  }

  return { supported: false, method: 'none', reason: 'noSupport' }
}

/**
 * Measure light using camera
 * Takes a short video frame and calculates average luminance → estimates lux
 */
export async function measureWithCamera(): Promise<number> {
  const stream = await navigator.mediaDevices.getUserMedia({
    video: { facingMode: 'environment', width: 320, height: 240 }
  })

  // Create video element to capture frame
  const video = document.createElement('video')
  video.srcObject = stream
  video.autoplay = true
  await new Promise(resolve => { video.onloadeddata = resolve })

  // Wait a moment for exposure to stabilize
  await new Promise(resolve => setTimeout(resolve, 1500))

  // Capture frame to canvas
  const canvas = document.createElement('canvas')
  canvas.width = video.videoWidth || 320
  canvas.height = video.videoHeight || 240
  const ctx = canvas.getContext('2d')!
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height)

  // Stop camera
  stream.getTracks().forEach(track => track.stop())

  // Calculate average luminance from pixels
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
  const pixels = imageData.data
  let totalLuminance = 0
  const pixelCount = pixels.length / 4

  for (let i = 0; i < pixels.length; i += 4) {
    const r = pixels[i]
    const g = pixels[i + 1]
    const b = pixels[i + 2]
    // Perceived luminance formula
    totalLuminance += (0.2126 * r + 0.7152 * g + 0.0722 * b)
  }

  const avgLuminance = totalLuminance / pixelCount // 0-255

  // Convert to estimated lux (rough calibration)
  // Outdoor full sun ≈ 100,000 lux → camera saturates around 240+
  // Indoor bright ≈ 500-1000 lux → camera shows ~50-80
  // This is approximate — better phones give better results
  const lux = Math.round((avgLuminance / 255) * 120000)

  return Math.max(100, Math.min(120000, lux))
}

/**
 * Measure light using AmbientLightSensor API
 */
export async function measureWithSensor(): Promise<number> {
  return new Promise((resolve, reject) => {
    try {
      const sensor = new (window as any).AmbientLightSensor({ frequency: 1 })
      let reading = 0

      sensor.addEventListener('reading', () => {
        reading = sensor.illuminance
      })

      sensor.addEventListener('error', (e: any) => {
        reject(new Error(e.error?.message || 'Sensor error'))
      })

      sensor.start()

      // Take reading after 2 seconds
      setTimeout(() => {
        sensor.stop()
        resolve(Math.round(reading))
      }, 2000)
    } catch (err) {
      reject(err)
    }
  })
}

/**
 * Categorize lux value
 */
export function categorizeLux(avgLux: number): string {
  if (avgLux < 500) return 'deep_shade'
  if (avgLux < 2000) return 'shade'
  if (avgLux < 10000) return 'partial_shade'
  if (avgLux < 25000) return 'bright_indirect'
  if (avgLux < 50000) return 'direct_sun'
  return 'full_sun'
}

/**
 * Get human readable category name
 */
export function categoryLabel(category: string, isRtl: boolean): string {
  const labels: Record<string, { he: string; en: string }> = {
    deep_shade: { he: 'צל עמוק', en: 'Deep shade' },
    shade: { he: 'צל', en: 'Shade' },
    partial_shade: { he: 'צל חלקי', en: 'Partial shade' },
    bright_indirect: { he: 'אור בהיר עקיף', en: 'Bright indirect' },
    direct_sun: { he: 'שמש ישירה', en: 'Direct sun' },
    full_sun: { he: 'שמש מלאה', en: 'Full sun' },
  }
  return isRtl ? (labels[category]?.he ?? category) : (labels[category]?.en ?? category)
}

/**
 * Get category emoji
 */
export function categoryEmoji(category: string): string {
  const emojis: Record<string, string> = {
    deep_shade: '🌑',
    shade: '🌥️',
    partial_shade: '⛅',
    bright_indirect: '🌤️',
    direct_sun: '☀️',
    full_sun: '🔆',
  }
  return emojis[category] ?? '☀️'
}
