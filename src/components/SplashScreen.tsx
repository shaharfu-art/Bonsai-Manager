import React, { useEffect, useState } from 'react'

interface Props {
  onDone: () => void
}

const SplashScreen: React.FC<Props> = ({ onDone }) => {
  const [phase, setPhase] = useState<'visible' | 'out'>('visible')

  useEffect(() => {
    const outTimer = setTimeout(() => setPhase('out'), 3500)
    const doneTimer = setTimeout(() => onDone(), 4200)

    return () => {
      clearTimeout(outTimer)
      clearTimeout(doneTimer)
    }
  }, [onDone])

  return (
    <div
      onClick={onDone}
      className="fixed inset-0 z-[9999] cursor-pointer overflow-hidden bg-[#2d3d2b]"
      style={{
        opacity: phase === 'out' ? 0 : 1,
        transition: phase === 'out' ? 'opacity 0.7s ease-out' : 'none',
      }}
    >
      {/* Fullscreen image */}
      <img
        src="/splash.png"
        alt="YUTAKA"
        className="absolute inset-0 w-full h-full object-cover"
        style={{ objectPosition: '50% 55%' }}
        draggable={false}
      />
    </div>
  )
}

export default SplashScreen
