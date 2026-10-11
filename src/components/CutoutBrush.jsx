import { useEffect, useRef, useState } from 'react'
import { commitEditPixels, readEdit } from '../services/backgroundRemover'

const MIN_ZOOM = 1
const MAX_ZOOM = 6

export default function CutoutBrush({ sourceFile, tool, radius, onCommit }) {
  const stageRef = useRef(null)
  const canvasRef = useRef(null)
  const loupeRef = useRef(null)
  const photoRef = useRef(null)
  const pointers = useRef(new Map())
  const drawing = useRef(false)
  const last = useRef(null)
  const pinch = useRef(null)
  const frameRef = useRef({ zoom: 1, panX: 0, panY: 0, fit: 1, stageW: 1, stageH: 1 })
  const undoStack = useRef([])
  const dirty = useRef(false)
  const [undoCount, setUndoCount] = useState(0)
  const [frame, setFrame] = useState(frameRef.current)
  const [size, setSize] = useState({ w: 1, h: 1 })

  function remember(next) {
    frameRef.current = next
    setFrame(next)
  }

  useEffect(() => {
    const edit = readEdit(sourceFile)
    const canvas = canvasRef.current
    const stage = stageRef.current
    if (!edit || !canvas || !stage) return
    canvas.width = edit.width
    canvas.height = edit.height
    canvas.getContext('2d').putImageData(new ImageData(new Uint8ClampedArray(edit.rgba), edit.width, edit.height), 0, 0)
    const photo = document.createElement('canvas')
    photo.width = edit.width
    photo.height = edit.height
    photo.getContext('2d').putImageData(new ImageData(new Uint8ClampedArray(edit.photo), edit.width, edit.height), 0, 0)
    photoRef.current = photo
    setSize({ w: edit.width, h: edit.height })
    const rect = stage.getBoundingClientRect()
    const fit = Math.min(rect.width / edit.width, rect.height / edit.height) || 1
    const next = { zoom: 1, panX: 0, panY: 0, fit, stageW: rect.width, stageH: rect.height }
    frameRef.current = next
    setFrame(next)
    undoStack.current = []
    setUndoCount(0)
  }, [sourceFile])

  function place(view = frameRef.current, box = size) {
    const displayW = box.w * view.fit * view.zoom
    const displayH = box.h * view.fit * view.zoom
    return {
      displayW,
      displayH,
      left: (view.stageW - displayW) / 2 + view.panX,
      top: (view.stageH - displayH) / 2 + view.panY,
      scale: view.fit * view.zoom
    }
  }

  function pointFrom(clientX, clientY) {
    const stage = stageRef.current.getBoundingClientRect()
    const laid = place()
    return {
      x: (clientX - stage.left - laid.left) / laid.scale,
      y: (clientY - stage.top - laid.top) / laid.scale,
      scale: laid.scale
    }
  }

  function dab(x, y, scale) {
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    const r = Math.max(4, radius / Math.max(scale, 0.0001))
    ctx.save()
    ctx.beginPath()
    ctx.arc(x, y, r, 0, Math.PI * 2)
    ctx.clip()
    if (tool === 'erase') ctx.clearRect(x - r - 1, y - r - 1, r * 2 + 2, r * 2 + 2)
    else if (photoRef.current) ctx.drawImage(photoRef.current, 0, 0)
    ctx.restore()
    dirty.current = true
    return r
  }

  function stroke(from, to) {
    const dist = Math.hypot(to.x - from.x, to.y - from.y)
    const step = Math.max(1, (radius / Math.max(to.scale, 0.0001)) * 0.3)
    const count = Math.max(1, Math.ceil(dist / step))
    let radiusPx = 4
    for (let i = 0; i <= count; i++) {
      const t = i / count
      radiusPx = dab(from.x + (to.x - from.x) * t, from.y + (to.y - from.y) * t, to.scale)
    }
    return radiusPx
  }

  function showLoupe(imageX, imageY, clientX, clientY, brushRadius) {
    const loupe = loupeRef.current
    const src = canvasRef.current
    const stage = stageRef.current
    if (!loupe || !src || !stage) return
    const ctx = loupe.getContext('2d')
    const magnify = 3
    const sw = loupe.width / magnify
    const sh = loupe.height / magnify
    ctx.fillStyle = '#d5dbe3'
    ctx.fillRect(0, 0, loupe.width, loupe.height)
    ctx.fillStyle = '#f8fafc'
    for (let y = 0; y < loupe.height; y += 8) {
      for (let x = 0; x < loupe.width; x += 8) {
        if (((x + y) / 8) % 2 < 1) ctx.fillRect(x, y, 8, 8)
      }
    }
    ctx.drawImage(src, imageX - sw / 2, imageY - sh / 2, sw, sh, 0, 0, loupe.width, loupe.height)
    ctx.strokeStyle = '#111827'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.arc(loupe.width / 2, loupe.height / 2, Math.max(6, brushRadius * magnify), 0, Math.PI * 2)
    ctx.stroke()
    const bounds = stage.getBoundingClientRect()
    let left = clientX - bounds.left - loupe.width / 2
    let top = clientY - bounds.top - loupe.height - 28
    left = Math.max(8, Math.min(bounds.width - loupe.width - 8, left))
    if (top < 8) top = Math.min(bounds.height - loupe.height - 8, clientY - bounds.top + 36)
    loupe.style.display = 'block'
    loupe.style.left = `${left}px`
    loupe.style.top = `${top}px`
  }

  function hideLoupe() {
    if (loupeRef.current) loupeRef.current.style.display = 'none'
  }

  async function finish() {
    const canvas = canvasRef.current
    if (!canvas || !sourceFile) return
    const data = canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height)
    const next = await commitEditPixels(sourceFile, data.data)
    if (next) onCommit(next)
  }

  function pushUndo() {
    const canvas = canvasRef.current
    if (!canvas) return
    const data = canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height)
    undoStack.current.push(new Uint8ClampedArray(data.data))
    if (undoStack.current.length > 6) undoStack.current.shift()
    setUndoCount(undoStack.current.length)
  }

  async function undo() {
    const shot = undoStack.current.pop()
    setUndoCount(undoStack.current.length)
    const canvas = canvasRef.current
    if (!shot || !canvas) return
    canvas.getContext('2d').putImageData(new ImageData(shot, canvas.width, canvas.height), 0, 0)
    await finish()
  }

  function setZoom(zoom, panX = frameRef.current.panX, panY = frameRef.current.panY) {
    const nextZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, zoom))
    const view = frameRef.current
    const maxX = (size.w * view.fit * nextZoom) / 2
    const maxY = (size.h * view.fit * nextZoom) / 2
    remember({
      ...view,
      zoom: nextZoom,
      panX: nextZoom === 1 ? 0 : Math.max(-maxX, Math.min(maxX, panX)),
      panY: nextZoom === 1 ? 0 : Math.max(-maxY, Math.min(maxY, panY))
    })
  }

  const laid = place(frame, size)

  return (
    <div
      ref={stageRef}
      style={{ position: 'absolute', inset: 0, overflow: 'hidden', touchAction: 'none' }}
      onPointerDown={(event) => {
        if (event.target !== stageRef.current && event.target !== canvasRef.current) return
        event.preventDefault()
        event.currentTarget.setPointerCapture(event.pointerId)
        pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY })
        if (pointers.current.size >= 2) {
          drawing.current = false
          hideLoupe()
          const pts = [...pointers.current.values()]
          pinch.current = {
            dist: Math.max(1, Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y)),
            zoom: frameRef.current.zoom,
            panX: frameRef.current.panX,
            panY: frameRef.current.panY,
            midX: (pts[0].x + pts[1].x) / 2,
            midY: (pts[0].y + pts[1].y) / 2
          }
          return
        }
        pushUndo()
        drawing.current = true
        const point = pointFrom(event.clientX, event.clientY)
        last.current = point
        const brushRadius = dab(point.x, point.y, point.scale)
        showLoupe(point.x, point.y, event.clientX, event.clientY, brushRadius)
      }}
      onPointerMove={(event) => {
        if (!pointers.current.has(event.pointerId)) return
        pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY })
        if (pointers.current.size >= 2 && pinch.current) {
          const pts = [...pointers.current.values()]
          const dist = Math.max(1, Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y))
          const midX = (pts[0].x + pts[1].x) / 2
          const midY = (pts[0].y + pts[1].y) / 2
          setZoom(
            pinch.current.zoom * (dist / pinch.current.dist),
            pinch.current.panX + (midX - pinch.current.midX),
            pinch.current.panY + (midY - pinch.current.midY)
          )
          return
        }
        if (!drawing.current || !last.current) return
        const next = pointFrom(event.clientX, event.clientY)
        const brushRadius = stroke(last.current, next)
        last.current = next
        showLoupe(next.x, next.y, event.clientX, event.clientY, brushRadius)
      }}
      onPointerUp={(event) => {
        pointers.current.delete(event.pointerId)
        pinch.current = null
        if (pointers.current.size > 0) return
        const wasDirty = dirty.current
        drawing.current = false
        last.current = null
        hideLoupe()
        if (wasDirty) {
          dirty.current = false
          finish()
        }
      }}
      onPointerCancel={(event) => {
        pointers.current.delete(event.pointerId)
        pinch.current = null
        drawing.current = false
        last.current = null
        hideLoupe()
      }}
    >
      <canvas
        ref={canvasRef}
        style={{
          position: 'absolute',
          left: laid.left,
          top: laid.top,
          width: laid.displayW,
          height: laid.displayH,
          touchAction: 'none'
        }}
      />
      <canvas
        ref={loupeRef}
        width={116}
        height={116}
        style={{
          display: 'none',
          position: 'absolute',
          width: 116,
          height: 116,
          borderRadius: '50%',
          border: '3px solid white',
          boxShadow: '0 8px 24px rgba(0,0,0,0.28)',
          pointerEvents: 'none',
          zIndex: 4
        }}
      />
      <div
        onPointerDown={(event) => event.stopPropagation()}
        style={{
          position: 'absolute',
          left: 8,
          right: 8,
          bottom: 8,
          display: 'flex',
          justifyContent: 'center',
          gap: 6,
          zIndex: 5
        }}
      >
        <button type="button" onClick={() => setZoom(frame.zoom / 1.4)} style={chip}>−</button>
        <button type="button" onClick={() => setZoom(frame.zoom * 1.4)} style={chip}>+</button>
        <button type="button" onClick={() => setZoom(1, 0, 0)} style={chip}>Recentrer</button>
        <button type="button" onClick={undo} disabled={undoCount === 0} style={{ ...chip, opacity: undoCount ? 1 : 0.4 }}>Annuler</button>
      </div>
    </div>
  )
}

const chip = {
  border: 'none',
  background: 'white',
  color: '#111827',
  fontWeight: 800,
  fontSize: '0.75rem',
  borderRadius: 12,
  padding: '7px 10px',
  boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
  cursor: 'pointer'
}
