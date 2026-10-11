import { useEffect, useRef } from 'react'
import { commitEditPixels, readEdit } from '../services/backgroundRemover'

export default function CutoutBrush({ sourceFile, tool, radius, onCommit }) {
  const canvasRef = useRef(null)
  const photoRef = useRef(null)
  const drawing = useRef(false)
  const last = useRef(null)

  useEffect(() => {
    const edit = readEdit(sourceFile)
    const canvas = canvasRef.current
    if (!edit || !canvas) return
    canvas.width = edit.width
    canvas.height = edit.height
    canvas.getContext('2d').putImageData(new ImageData(new Uint8ClampedArray(edit.rgba), edit.width, edit.height), 0, 0)
    const photo = document.createElement('canvas')
    photo.width = edit.width
    photo.height = edit.height
    photo.getContext('2d').putImageData(new ImageData(new Uint8ClampedArray(edit.photo), edit.width, edit.height), 0, 0)
    photoRef.current = photo
  }, [sourceFile])

  function pointFrom(event) {
    const canvas = canvasRef.current
    const rect = canvas.getBoundingClientRect()
    const scale = Math.min(rect.width / canvas.width, rect.height / canvas.height)
    const ox = (rect.width - canvas.width * scale) / 2
    const oy = (rect.height - canvas.height * scale) / 2
    return {
      x: (event.clientX - rect.left - ox) / scale,
      y: (event.clientY - rect.top - oy) / scale,
      scale
    }
  }

  function dab(x, y, scale) {
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    const r = Math.max(6, radius / Math.max(scale, 0.0001))
    ctx.save()
    ctx.beginPath()
    ctx.arc(x, y, r, 0, Math.PI * 2)
    ctx.clip()
    if (tool === 'erase') ctx.clearRect(x - r - 1, y - r - 1, r * 2 + 2, r * 2 + 2)
    else if (photoRef.current) ctx.drawImage(photoRef.current, 0, 0)
    ctx.restore()
  }

  function stroke(from, to) {
    const dist = Math.hypot(to.x - from.x, to.y - from.y)
    const step = Math.max(1, (radius / Math.max(to.scale, 0.0001)) * 0.35)
    const count = Math.max(1, Math.ceil(dist / step))
    for (let i = 0; i <= count; i++) {
      const t = i / count
      dab(from.x + (to.x - from.x) * t, from.y + (to.y - from.y) * t, to.scale)
    }
  }

  async function finish() {
    const canvas = canvasRef.current
    if (!canvas || !sourceFile) return
    const data = canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height)
    const next = await commitEditPixels(sourceFile, data.data)
    if (next) onCommit(next)
  }

  return (
    <canvas
      ref={canvasRef}
      onPointerDown={(event) => {
        event.preventDefault()
        event.currentTarget.setPointerCapture(event.pointerId)
        drawing.current = true
        last.current = pointFrom(event)
        dab(last.current.x, last.current.y, last.current.scale)
      }}
      onPointerMove={(event) => {
        if (!drawing.current || !last.current) return
        event.preventDefault()
        const next = pointFrom(event)
        stroke(last.current, next)
        last.current = next
      }}
      onPointerUp={() => {
        if (!drawing.current) return
        drawing.current = false
        last.current = null
        finish()
      }}
      onPointerCancel={() => {
        drawing.current = false
        last.current = null
      }}
      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'contain', touchAction: 'none', cursor: 'crosshair' }}
    />
  )
}
