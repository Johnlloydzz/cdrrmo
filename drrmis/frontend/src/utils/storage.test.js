import test from 'node:test'
import assert from 'node:assert/strict'

import { getStoredUser, setStoredUser, clearStoredUser } from './storage.js'

function createStorage(initial = {}) {
  const store = new Map(Object.entries(initial))

  return {
    getItem(key) {
      return store.has(key) ? store.get(key) : null
    },
    setItem(key, value) {
      store.set(key, String(value))
    },
    removeItem(key) {
      store.delete(key)
    },
    clear() {
      store.clear()
    },
  }
}

test('returns null when no stored user exists', () => {
  global.window = { localStorage: createStorage() }
  assert.equal(getStoredUser(), null)
})

test('parses and returns a stored user object', () => {
  global.window = {
    localStorage: createStorage({ drrmis_user: JSON.stringify({ name: 'Ana', role: 'Admin' }) }),
  }

  assert.deepEqual(getStoredUser(), { name: 'Ana', role: 'Admin' })
})

test('cleans up invalid stored user data', () => {
  const storage = createStorage({ drrmis_user: '{invalid-json' })
  global.window = { localStorage: storage }

  assert.equal(getStoredUser(), null)
  assert.equal(storage.getItem('drrmis_user'), null)
})

test('stores and clears user data safely', () => {
  const storage = createStorage()
  global.window = { localStorage: storage }

  setStoredUser({ name: 'Rico', role: 'Responder' })
  assert.equal(storage.getItem('drrmis_user'), JSON.stringify({ name: 'Rico', role: 'Responder' }))

  clearStoredUser()
  assert.equal(storage.getItem('drrmis_user'), null)
})
