import { describe, expect, it } from 'vitest'

import { nouvelId, versSlug } from './identifiants'

describe('nouvelId', () => {
  it('rend des identifiants uniques', () => {
    const lot = new Set(Array.from({ length: 500 }, () => nouvelId()))
    expect(lot.size).toBe(500)
  })
})

describe('versSlug', () => {
  it('met en minuscules et relie par des tirets', () => {
    expect(versSlug('Squat sur chaise')).toBe('squat-sur-chaise')
  })

  it('retire les accents', () => {
    expect(versSlug('Gainage côté droit')).toBe('gainage-cote-droit')
    expect(versSlug('Étirement ischio-jambiers')).toBe('etirement-ischio-jambiers')
  })

  it('écrase la ponctuation et les espaces en trop', () => {
    expect(versSlug('  Pompes (contre le mur)  ')).toBe('pompes-contre-le-mur')
    expect(versSlug('Marche rapide : 30 min')).toBe('marche-rapide-30-min')
    expect(versSlug("Nage libre / crawl")).toBe('nage-libre-crawl')
  })

  it('rend une chaîne vide quand il ne reste rien', () => {
    expect(versSlug('   ')).toBe('')
    expect(versSlug('!!!')).toBe('')
  })

  it('est stable : passer un slug au filtre ne le change pas', () => {
    expect(versSlug('squat-sur-chaise')).toBe('squat-sur-chaise')
  })
})
