import { useEffect, useRef, useState } from 'react'

const MIN_STEP = 3
const MAX_POINTS = 160

function simplify(points) {
  if (points.length <= MAX_POINTS) return points
  const step = points.length / MAX_POINTS
  const out = []
  for (let i = 0; i < MAX_POINTS; i++) out.push(points[Math.floor(i * step)])
  return out
}

/**
 * Entoure la pièce au doigt, de façon grossière.
 * Rend un tracé fermé en coordonnées de la photo entière (0..1).
 */
export default function LassoSelect({ imageUrl, onDone }) {
  const stageRef = useRef(null)
  const pointsRef = useRef([])
  const activeId = useRef(null)
  const [natural, setNatural] = useState(null)
  const [box, setBox] = useState({ w: 1, h: 1 })
  const [path, setPath] = useState([])
  const [hint, setHint] = useState('Entoure la pièce du doigt, sans chercher la précision.')

  useEffect(() => {
    const img = new Image()
    img.onload = () => setNatural({ w: img.naturalWidth || img.width, h: img.naturalHeight || img.height })
    img.src = imageUrl
  }, [imageUrl])

  useEffect(() => {
    const stage = stageRef.current
    if (!stage) return undefined
    const measure = () => {
      const rect = stage.getBoundingClientRect()
      setBox({ w: rect.width || 1, h: rect.height || 1 })
    }
    measure()
    const observer = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(measure) : null
    observer?.observe(stage)
    return () => observer?.disconnect()
  }, [])

  // Rectangle où la photo est réellement affichée (object-fit: contain).
  const shown = (() => {
    if (!natural) return { left: 0, top: 0, w: box.w, h: box.h }
    const scale = Math.min(box.w / natural.w, box.h / natural.h)
    const w = natural.w * scale
    const h = natural.h * scale
    return { left: (box.w - w) / 2, top: (box.h - h) / 2, w, h }
  })()

  function localPoint(event) {
    const rect = stageRef.current.getBoundingClientRect()
    const x = Math.min(shown.left + shown.w, Math.max(shown.left, event.clientX - rect.left))
    const y = Math.min(shown.top + shown.h, Math.max(shown.top, event.clientY - rect.top))
    return { x, y }
  }

  function begin(event) {
    if (activeId.current !== null || !natural) return
    event.preventDefault()
    event.currentTarget.setPointerCapture(event.pointerId)
    activeId.current = event.pointerId
    const first = localPoint(event)
    pointsRef.current = [first]
    setPath([first])
  }

  function move(event) {
    if (event.pointerId !== activeId.current) return
    const next = localPoint(event)
    const last = pointsRef.current[pointsRef.current.length - 1]
    if (Math.hypot(next.x - last.x, next.y - last.y) < MIN_STEP) return
    pointsRef.current.push(next)
    setPath([...pointsRef.current])
  }

  function end(event) {
    if (event.pointerId !== activeId.current) return
    activeId.current = null
    const points = pointsRef.current
    let minX = Infinity
    let minY = Infinity
    let maxX = -Infinity
    let maxY = -Infinity
    for (const p of points) {
      minX = Math.min(minX, p.x)
      minY = Math.min(minY, p.y)
      maxX = Math.max(maxX, p.x)
      maxY = Math.max(maxY, p.y)
    }
    const covered = ((maxX - minX) * (maxY - minY)) / (shown.w * shown.h || 1)
    if (points.length < 8 || covered < 0.03) {
      setHint('Trace plus grand : fais le tour complet de la pièce.')
      pointsRef.current = []
      setPath([])
      return
    }
    const normalized = simplify(points).map((p) => ({
      x: (p.x - shown.left) / shown.w,
      y: (p.y - shown.top) / shown.h
    }))
    onDone(normalized)
  }

  function cancel(event) {
    if (event.pointerId !== activeId.current) return
    activeId.current = null
    pointsRef.current = []
    setPath([])
  }

  const d = path.length ? `M ${path.map((p) => `${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' L ')} Z` : ''

  return (
    <div
      ref={stageRef}
      style={{ position: 'absolute', inset: 0, touchAction: 'none', cursor: 'crosshair' }}
      onPointerDown={begin}
      onPointerMove={move}
      onPointerUp={end}
      onPointerCancel={cancel}
    >
      <img
        src={imageUrl}
        alt="Photo à entourer"
        draggable={false}
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'contain', pointerEvents: 'none', userSelect: 'none' }}
      />
      <svg width={box.w} height={box.h} style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
        {d && (
          <>
            <path d={d} fill="rgba(99,102,241,0.18)" stroke="white" strokeWidth="6" strokeLinejoin="round" />
            <path d={d} fill="none" stroke="#111827" strokeWidth="2.5" strokeDasharray="8 6" strokeLinejoin="round" />
          </>
        )}
      </svg>
      <div
        style={{
          position: 'absolute',
          left: 10,
          right: 10,
          bottom: 10,
          padding: '8px 12px',
          borderRadius: 14,
          background: 'rgba(17,24,39,0.78)',
          color: 'white',
          fontSize: '0.75rem',
          fontWeight: 700,
          textAlign: 'center',
          pointerEvents: 'none'
        }}
      >
        {hint}
      </div>
    </div>
  )
}
