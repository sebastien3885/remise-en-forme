import { describe, expect, it } from 'vitest'

import { COTE_MAXIMAL, dimensionsReduites } from './dimensions'

describe('dimensionsReduites', () => {
  it('ramène le plus grand côté à la limite, en gardant les proportions', () => {
    // Une photo de téléphone, 4 : 3, en paysage.
    const reduite = dimensionsReduites({ largeur: 4032, hauteur: 3024 })

    expect(reduite.largeur).toBe(COTE_MAXIMAL)
    expect(reduite.hauteur).toBe(960)
    expect(reduite.largeur / reduite.hauteur).toBeCloseTo(4032 / 3024, 2)
  })

  it('traite le portrait comme le paysage : c’est le plus grand côté qui compte', () => {
    const reduite = dimensionsReduites({ largeur: 3024, hauteur: 4032 })

    expect(reduite.hauteur).toBe(COTE_MAXIMAL)
    expect(reduite.largeur).toBe(960)
  })

  it('n’agrandit jamais une photo déjà petite', () => {
    const petite = { largeur: 640, hauteur: 480 }

    expect(dimensionsReduites(petite)).toEqual(petite)
  })

  it('laisse intacte une photo pile à la limite', () => {
    const limite = { largeur: COTE_MAXIMAL, hauteur: 700 }

    expect(dimensionsReduites(limite)).toEqual(limite)
  })

  it('accepte une limite choisie', () => {
    expect(dimensionsReduites({ largeur: 1000, hauteur: 500 }, 100)).toEqual({
      largeur: 100,
      hauteur: 50,
    })
  })

  it('ne rend jamais un côté nul, même sur une image très allongée', () => {
    // 3000 × 1 : le facteur de réduction écraserait la hauteur sous zéro.
    const reduite = dimensionsReduites({ largeur: 3000, hauteur: 1 })

    expect(reduite.largeur).toBe(COTE_MAXIMAL)
    expect(reduite.hauteur).toBe(1)
  })

  it('arrondit à des pixels entiers', () => {
    const reduite = dimensionsReduites({ largeur: 1333, hauteur: 777 })

    expect(Number.isInteger(reduite.largeur)).toBe(true)
    expect(Number.isInteger(reduite.hauteur)).toBe(true)
  })
})
