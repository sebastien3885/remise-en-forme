import { describe, expect, it } from 'vitest'

import { uneMesure } from '../../tests/fixtures'
import type { MesureCorporelle } from '../entites'
import { moyenneGlissante, tendanceDuPoids, tendanceDuTourDeTaille } from './tendance'

function mesures(valeurs: [string, number | undefined][]): MesureCorporelle[] {
  return valeurs.map(([date, poids], index) =>
    uneMesure({
      id: 'm' + String(index),
      date,
      ...(poids === undefined ? { poidsKg: undefined } : { poidsKg: poids }),
    }),
  )
}

describe('moyenneGlissante', () => {
  it('lisse sur la fenêtre demandée', () => {
    const points = [
      { date: '1', valeur: 10 },
      { date: '2', valeur: 20 },
      { date: '3', valeur: 30 },
      { date: '4', valeur: 40 },
    ]

    expect(moyenneGlissante(points, 2).map((p) => p.valeur)).toEqual([10, 15, 25, 35])
  })

  it('donne un point dès la première mesure, sur ce qu’on a', () => {
    // Attendre quatre semaines avant d'afficher quoi que ce soit laisserait
    // un écran vide pendant un mois.
    const points = [
      { date: '1', valeur: 92 },
      { date: '2', valeur: 90 },
    ]

    expect(moyenneGlissante(points, 4).map((p) => p.valeur)).toEqual([92, 91])
  })

  it('arrondit au dixième', () => {
    const points = [
      { date: '1', valeur: 92.4 },
      { date: '2', valeur: 91.1 },
      { date: '3', valeur: 90.9 },
    ]

    expect(moyenneGlissante(points, 3)[2]?.valeur).toBe(91.5)
  })

  it('rend une liste vide pour une liste vide', () => {
    expect(moyenneGlissante([], 4)).toEqual([])
  })
})

describe('tendanceDuPoids', () => {
  it('rend la série lissée, pas les valeurs brutes', () => {
    const tendance = tendanceDuPoids(
      mesures([
        ['2026-11-01', 92],
        ['2026-11-08', 91],
        ['2026-11-15', 91.5],
        ['2026-11-22', 90],
      ]),
      2,
    )

    expect(tendance.points.map((p) => p.valeur)).toEqual([92, 91.5, 91.3, 90.8])
    expect(tendance.derniere).toBe(90.8)
    expect(tendance.nombreDeMesures).toBe(4)
  })

  it('mesure la variation du premier au dernier point lissé', () => {
    const tendance = tendanceDuPoids(
      mesures([
        ['2026-11-01', 92],
        ['2026-11-08', 90],
      ]),
      1,
    )

    expect(tendance.variation).toBe(-2)
  })

  it('ne rend aucune variation avec une seule mesure', () => {
    const tendance = tendanceDuPoids(mesures([['2026-11-01', 92]]))

    expect(tendance.variation).toBeUndefined()
    expect(tendance.derniere).toBe(92)
  })

  it('trie les mesures par date avant de lisser', () => {
    const tendance = tendanceDuPoids(
      mesures([
        ['2026-11-15', 90],
        ['2026-11-01', 92],
      ]),
      1,
    )

    expect(tendance.points.map((p) => p.date)).toEqual(['2026-11-01', '2026-11-15'])
  })

  it('ignore une mesure sans poids', () => {
    const tendance = tendanceDuPoids(
      mesures([
        ['2026-11-01', 92],
        ['2026-11-08', undefined],
        ['2026-11-15', 90],
      ]),
      1,
    )

    expect(tendance.nombreDeMesures).toBe(2)
    expect(tendance.points.map((p) => p.valeur)).toEqual([92, 90])
  })

  it('rend une tendance vide sans mesure', () => {
    const tendance = tendanceDuPoids([])

    expect(tendance.points).toEqual([])
    expect(tendance.derniere).toBeUndefined()
    expect(tendance.nombreDeMesures).toBe(0)
  })
})

describe('tendanceDuTourDeTaille', () => {
  it('suit le tour de taille indépendamment du poids', () => {
    const tendance = tendanceDuTourDeTaille(
      [
        uneMesure({ id: 'm1', date: '2026-11-01', poidsKg: 92, tourTailleCm: 104 }),
        uneMesure({ id: 'm2', date: '2026-11-15', poidsKg: 91, tourTailleCm: 102 }),
      ],
      1,
    )

    expect(tendance.points.map((p) => p.valeur)).toEqual([104, 102])
    expect(tendance.variation).toBe(-2)
  })
})
