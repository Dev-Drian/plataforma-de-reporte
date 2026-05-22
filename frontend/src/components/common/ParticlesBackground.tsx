import { motion, useMotionValue, useSpring } from 'framer-motion'
import { useEffect, useMemo, useRef, useState } from 'react'

interface ParticlesBackgroundProps {
  className?: string
  intensity?: 'low' | 'medium' | 'high'
  color?: string
}

interface Particle {
  id: number
  x: number
  y: number
  delay: number
  duration: number
  size: number
  opacity: number
  vx: number
  vy: number
  mouseInfluence: number
}

export default function ParticlesBackground({ 
  className = '', 
  intensity = 'medium',
  color = 'rgba(255, 255, 255, 0.5)'
}: ParticlesBackgroundProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  
  // Valores de movimiento suave para el mouse
  const mouseX = useMotionValue(0.5)
  const mouseY = useMotionValue(0.5)
  const smoothMouseX = useSpring(mouseX, { stiffness: 50, damping: 20 })
  const smoothMouseY = useSpring(mouseY, { stiffness: 50, damping: 20 })
  
  const [mousePos, setMousePos] = useState({ x: 0.5, y: 0.5 })

  // Sincronizar valores suaves con estado para reactividad
  useEffect(() => {
    const unsubscribeX = smoothMouseX.on('change', (latest) => {
      setMousePos(prev => ({ ...prev, x: latest }))
    })
    const unsubscribeY = smoothMouseY.on('change', (latest) => {
      setMousePos(prev => ({ ...prev, y: latest }))
    })
    
    return () => {
      unsubscribeX()
      unsubscribeY()
    }
  }, [smoothMouseX, smoothMouseY])

  // Optimizar número de partículas según intensidad
  const particleCount = useMemo(() => {
    return intensity === 'low' ? 40 : intensity === 'medium' ? 60 : 80
  }, [intensity])

  // Memoizar partículas para evitar recálculos
  const particles = useMemo(() => {
    return Array.from({ length: particleCount }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      delay: Math.random() * 3,
      duration: 20 + Math.random() * 15,
      size: 3 + Math.random() * 4,
      opacity: 0.4 + Math.random() * 0.4,
      vx: (Math.random() - 0.5) * 0.3,
      vy: (Math.random() - 0.5) * 0.3,
      // Factor de influencia del mouse (algunas partículas más sensibles)
      mouseInfluence: 0.3 + Math.random() * 0.4,
    })) as Particle[]
  }, [particleCount])

  // Manejar movimiento del mouse con throttling para mejor rendimiento
  useEffect(() => {
    let rafId: number | null = null
    
    const handleMouseMove = (e: MouseEvent) => {
      if (!containerRef.current) return
      
      if (rafId) return // Throttle con requestAnimationFrame
      
      rafId = requestAnimationFrame(() => {
        const rect = containerRef.current!.getBoundingClientRect()
        const x = (e.clientX - rect.left) / rect.width
        const y = (e.clientY - rect.top) / rect.height
        
        mouseX.set(x)
        mouseY.set(y)
        rafId = null
      })
    }

    const container = containerRef.current
    if (container) {
      container.addEventListener('mousemove', handleMouseMove, { passive: true })
      return () => {
        container.removeEventListener('mousemove', handleMouseMove)
        if (rafId) cancelAnimationFrame(rafId)
      }
    }
  }, [mouseX, mouseY])

  return (
    <div 
      ref={containerRef}
      className={`absolute inset-0 overflow-hidden pointer-events-none ${className}`}
      style={{ willChange: 'transform' }}
    >
      {particles.map((particle) => (
        <Particle
          key={particle.id}
          particle={particle}
          color={color}
          mouseX={mousePos.x}
          mouseY={mousePos.y}
        />
      ))}
      
      {/* Líneas conectivas optimizadas - solo para medium y high */}
      {intensity !== 'low' && (
        <Connections 
          particles={particles.slice(0, Math.floor(particles.length / 2))}
          color={color}
        />
      )}
    </div>
  )
}

// Componente de partícula individual para mejor rendimiento
function Particle({ 
  particle, 
  color, 
  mouseX,
  mouseY
}: { 
  particle: Particle
  color: string
  mouseX: number
  mouseY: number
}) {
  // Calcular influencia del mouse
  const mouseOffsetX = (mouseX - 0.5) * particle.mouseInfluence * 60
  const mouseOffsetY = (mouseY - 0.5) * particle.mouseInfluence * 60

  return (
    <motion.div
      className="absolute rounded-full"
      style={{
        left: `${particle.x}%`,
        top: `${particle.y}%`,
        width: `${particle.size}px`,
        height: `${particle.size}px`,
        backgroundColor: color,
        opacity: particle.opacity,
        boxShadow: `0 0 ${particle.size * 2}px ${color}`,
        willChange: 'transform, opacity',
      }}
      animate={{
        x: [
          mouseOffsetX,
          particle.vx * 200 + mouseOffsetX * 0.5,
          particle.vx * 400 + mouseOffsetX,
          particle.vx * 200 + mouseOffsetX * 0.5,
          mouseOffsetX
        ],
        y: [
          mouseOffsetY,
          particle.vy * 200 + mouseOffsetY * 0.5,
          particle.vy * 400 + mouseOffsetY,
          particle.vy * 200 + mouseOffsetY * 0.5,
          mouseOffsetY
        ],
        opacity: [
          particle.opacity * 0.4,
          particle.opacity,
          particle.opacity * 0.9,
          particle.opacity,
          particle.opacity * 0.4
        ],
        scale: [1, 1.2, 1.3, 1.2, 1],
      }}
      transition={{
        duration: particle.duration,
        repeat: Infinity,
        delay: particle.delay,
        ease: 'easeInOut',
      }}
    />
  )
}

// Componente de conexiones optimizado
function Connections({ particles, color }: { particles: Particle[], color: string }) {
  const connections = useMemo(() => {
    const conns: Array<{ from: Particle; to: Particle; distance: number }> = []
    particles.forEach((particle, i) => {
      const nearby = particles
        .slice(i + 1, Math.min(i + 6, particles.length)) // Only check the next 5 particles
        .map(p => ({
          ...p,
          distance: Math.sqrt(
            Math.pow(particle.x - p.x, 2) + Math.pow(particle.y - p.y, 2)
          )
        }))
        .filter(p => p.distance < 15)
        .slice(0, 1) // Solo 1 conexión por partícula para mejor rendimiento
      
      nearby.forEach(nearbyParticle => {
        conns.push({
          from: particle,
          to: nearbyParticle,
          distance: nearbyParticle.distance,
        })
      })
    })
    return conns
  }, [particles])

  return (
    <div className="absolute inset-0">
      {connections.map((conn, i) => {
        const angle = Math.atan2(
          conn.to.y - conn.from.y,
          conn.to.x - conn.from.x
        ) * 180 / Math.PI
        
        return (
          <motion.div
            key={`line-${conn.from.id}-${conn.to.id}`}
            className="absolute origin-left"
            style={{
              left: `${conn.from.x}%`,
              top: `${conn.from.y}%`,
              width: `${conn.distance}%`,
              height: '1px',
              background: `linear-gradient(90deg, ${color}, transparent)`,
              transform: `rotate(${angle}deg)`,
              transformOrigin: 'left center',
              willChange: 'opacity',
            }}
            initial={{ opacity: 0 }}
            animate={{ 
              opacity: [0, 0.3, 0.15, 0.3, 0],
            }}
            transition={{
              duration: 4 + Math.random() * 2,
              repeat: Infinity,
              delay: i * 0.05,
              ease: 'easeInOut',
            }}
          />
        )
      })}
    </div>
  )
}
