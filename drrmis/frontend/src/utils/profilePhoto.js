// Profile picture helpers. The picture lives in the database (not Firebase),
// is shrunk in the browser before upload, and is cached per user so the
// header, sidebar and profile panel all show the same picture.
import { useEffect, useState } from 'react'
import { apiGet, apiPut } from './api'

const KEY = (id) => `drrmis_photo_${id}`
const subs = new Set()
const memory = {}      // userId -> data URL or null
const fetched = new Set()

const safeGet = (id) => { try { return localStorage.getItem(KEY(id)) } catch { return null } }
const safeSet = (id, v) => { try { v ? localStorage.setItem(KEY(id), v) : localStorage.removeItem(KEY(id)) } catch { /* ignore */ } }
const emit = () => subs.forEach(f => f())

function setPhoto(id, photo) {
  memory[id] = photo || null
  safeSet(id, photo)
  emit()
}

export function usePhoto(userId) {
  const [, tick] = useState(0)
  useEffect(() => {
    const f = () => tick(n => n + 1)
    subs.add(f)
    return () => subs.delete(f)
  }, [])
  useEffect(() => {
    if (!userId || fetched.has(userId)) return
    fetched.add(userId)
    apiGet('/auth/photo').then(r => setPhoto(userId, r?.photo)).catch(() => { fetched.delete(userId) })
  }, [userId])
  if (!userId) return null
  if (!(userId in memory)) memory[userId] = safeGet(userId)
  return memory[userId]
}

export async function savePhoto(userId, photo) {
  const r = await apiPut('/auth/photo', { photo })
  setPhoto(userId, r?.photo)
}

// Shrink to a small square JPEG (about 192 px, 30 KB or less)
export function shrinkImage(file, { size = 192, maxChars = 40000 } = {}) {
  return new Promise((resolve, reject) => {
    if (!/^image\/(jpeg|png|webp)$/.test(file.type)) return reject(new Error('Please choose a JPG, PNG or WebP picture.'))
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      URL.revokeObjectURL(url)
      const side = Math.min(img.width, img.height)
      const canvas = document.createElement('canvas')
      canvas.width = canvas.height = size
      const ctx = canvas.getContext('2d')
      ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, size, size)
      ctx.drawImage(img, (img.width - side) / 2, (img.height - side) / 2, side, side, 0, 0, size, size)
      let q = 0.85, out = canvas.toDataURL('image/jpeg', q)
      while (out.length > maxChars && q > 0.3) { q -= 0.1; out = canvas.toDataURL('image/jpeg', q) }
      out.length > maxChars ? reject(new Error('The picture is still too big. Try another one.')) : resolve(out)
    }
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('That file could not be read as a picture.')) }
    img.src = url
  })
}