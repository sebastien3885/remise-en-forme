import { describe, expect, it } from 'vitest'

import type { ExercicePourMinuterie } from './sequence'
import { dureeTotale, formaterChrono, sequenceDeSeance } from './sequence'

function exercice(
  exerciceId: string,
  nom: string,
  cibles: ExercicePourMinuterie['cibles'],
): ExercicePourMinuterie {
  return { exerciceId, nom, cibles }
}

describe('phases minutées', () => {
  it('transforme une durée en une seule phase de travail', () => {
    const phases = sequenceDeSeance([
      exercice('marche-rapide', 'Marche rapide', { dureeMinutes: 30 }),
    ])

    expect(phases).toEqual([
      {
        genre: 'travail',
        secondes: 1800,
        titre: 'Marche rapide',
        detail: '',
        exerciceId: 'marche-rapide',
      },
    ])
  })

  it('alterne travail et repos sur un gainage de trois séries', () => {
    const phases = sequenceDeSeance([
      exercice('gainage-avant-bras', 'Gainage', {
        series: 3,
        maintienSecondes: 20,
        reposSecondes: 45,
      }),
    ])

    expect(phases.map((phase) => phase.genre + ':' + String(phase.secondes))).toEqual([
      'travail:20',
      'repos:45',
      'travail:20',
      'repos:45',
      'travail:20',
    ])
    expect(phases[0]?.detail).toBe('Série 1 sur 3')
    expect(phases[1]?.detail).toBe('Avant la série 2')
  })

  it('ne met pas de repos après la dernière série', () => {
    const phases = sequenceDeSeance([
      exercice('gainage-avant-bras', 'Gainage', {
        series: 2,
        maintienSecondes: 20,
        reposSecondes: 45,
      }),
    ])

    expect(phases[phases.length - 1]?.genre).toBe('travail')
  })
})

describe('phases sans chronomètre', () => {
  it('laisse les répétitions se terminer au doigt', () => {
    const phases = sequenceDeSeance([
      exercice('squat-sur-chaise', 'Squat sur chaise', {
        series: 2,
        repetitions: 10,
        reposSecondes: 60,
      }),
    ])

    expect(phases[0]?.secondes).toBeUndefined()
    expect(phases[0]?.detail).toBe('Série 1 sur 2 · 10 répétitions')
    expect(phases[1]).toMatchObject({ genre: 'repos', secondes: 60 })
    expect(phases[2]?.detail).toBe('Série 2 sur 2 · 10 répétitions')
  })

  it('fait de même pour les longueurs de bassin', () => {
    const phases = sequenceDeSeance([
      exercice('nage-crawl', 'Crawl', { longueurs: 8, reposSecondes: 40 }),
    ])

    expect(phases).toHaveLength(1)
    expect(phases[0]?.secondes).toBeUndefined()
    expect(phases[0]?.detail).toBe('8 longueurs')
  })
})

describe('enchaînement de plusieurs exercices', () => {
  const seance = [
    exercice('squat-sur-chaise', 'Squat sur chaise', {
      series: 2,
      repetitions: 10,
      reposSecondes: 60,
    }),
    exercice('gainage-avant-bras', 'Gainage', {
      series: 2,
      maintienSecondes: 20,
      reposSecondes: 45,
    }),
    exercice('etirement-mollets', 'Étirement des mollets', { maintienSecondes: 60 }),
  ]

  it('pose un repos entre deux exercices', () => {
    const phases = sequenceDeSeance(seance)
    const apresLeSquat = phases[3]

    expect(apresLeSquat).toMatchObject({
      genre: 'repos',
      secondes: 60,
      detail: 'Avant l’exercice suivant',
    })
  })

  it('ne se termine jamais sur un repos', () => {
    expect(sequenceDeSeance(seance).at(-1)?.genre).toBe('travail')
  })

  it('garde l’ordre des exercices', () => {
    const titres = [...new Set(sequenceDeSeance(seance).map((phase) => phase.titre))]

    expect(titres).toEqual(['Squat sur chaise', 'Repos', 'Gainage', 'Étirement des mollets'])
  })

  it('ignore un exercice sans rien de mesurable', () => {
    const phases = sequenceDeSeance([
      exercice('inconnu', 'Sans cible', {}),
      exercice('marche-rapide', 'Marche rapide', { dureeMinutes: 10 }),
    ])

    expect(phases).toHaveLength(1)
    expect(phases[0]?.titre).toBe('Marche rapide')
  })

  it('rend une séquence vide quand rien n’est mesurable', () => {
    expect(sequenceDeSeance([exercice('inconnu', 'Sans cible', {})])).toEqual([])
  })
})

describe('dureeTotale', () => {
  it('additionne les phases minutées et ignore les autres', () => {
    const phases = sequenceDeSeance([
      exercice('gainage-avant-bras', 'Gainage', {
        series: 2,
        maintienSecondes: 20,
        reposSecondes: 45,
      }),
      exercice('squat-sur-chaise', 'Squat', { series: 2, repetitions: 10 }),
    ])

    // 20 + 45 + 20 + 45 de transition, les squats ne comptent pas.
    expect(dureeTotale(phases)).toBe(130)
  })
})

describe('formaterChrono', () => {
  it('écrit les minutes et les secondes', () => {
    expect(formaterChrono(0)).toBe('0:00')
    expect(formaterChrono(45)).toBe('0:45')
    expect(formaterChrono(60)).toBe('1:00')
    expect(formaterChrono(125)).toBe('2:05')
    expect(formaterChrono(1800)).toBe('30:00')
  })

  it('ne descend pas sous zéro', () => {
    expect(formaterChrono(-5)).toBe('0:00')
  })
})
