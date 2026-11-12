import { describe, expect, it } from 'vitest'

/**
 * Verifie que l'outillage de test est en place : Vitest tourne et IndexedDB
 * est disponible (via fake-indexeddb) pour les tests de la couche stockage.
 */
describe('socle de test', () => {
  it('expose un IndexedDB utilisable dans Node', () => {
    expect(typeof indexedDB).toBe('object')
    expect(indexedDB.open).toBeTypeOf('function')
  })
})
