import { describe, expect, it } from 'vitest'

import { uneSeancePrevue, uneSeanceRealisee } from '../../tests/fixtures'
import type { SeancePrevue, SeanceRealisee } from '../entites'
import { recordsParExercice, serieEnCours, semainesTenues } from './historique'

const DEBUT = '2026-11-16' // lundi, semaine 1

/** Lundi de la semaine `numero`. */
function lundi(numero: number): string {
  const jour = new Date(Date.parse(DEBUT + 'T00:00:00.000Z') + (numero - 1) * 7 * 86400000)
  return jour.toISOString().slice(0, 10)
}

/** Une semaine de `prevues` séances, dont `faites` réalisées. */
function semaine(numero: number, prevues: number, faites: number, effort = 5) {
  const seancesPrevues: SeancePrevue[] = []
  const seancesRealisees: SeanceRealisee[] = []

  for (let index = 0; index < prevues; index += 1) {
    const date = new Date(Date.parse(lundi(numero) + 'T00:00:00.000Z') + index * 86400000)
      .toISOString()
      .slice(0, 10)
    const id = 's' + String(numero) + '-' + String(index)

    seancesPrevues.push(uneSeancePrevue({ id, date, semaine: numero }))
    if (index < faites) {
      seancesRealisees.push(
        uneSeanceRealisee({ id: 'r' + id, seancePrevueId: id, date, effort }),
      )
    }
  }

  return { seancesPrevues, seancesRealisees }
}

function assembler(...semaines: ReturnType<typeof semaine>[]) {
  return {
    seancesPrevues: semaines.flatMap((s) => s.seancesPrevues),
    seancesRealisees: semaines.flatMap((s) => s.seancesRealisees),
  }
}

describe('semainesTenues', () => {
  it('récapitule chaque semaine écoulée', () => {
    const { seancesPrevues, seancesRealisees } = assembler(
      semaine(1, 3, 3),
      semaine(2, 3, 1),
    )

    const resume = semainesTenues(seancesPrevues, seancesRealisees, DEBUT, lundi(3))

    expect(resume).toHaveLength(3)
    expect(resume[0]).toMatchObject({ semaine: 1, tauxRealisation: 1, tenue: true })
    expect(resume[1]?.tauxRealisation).toBeCloseTo(1 / 3)
    expect(resume[1]?.tenue).toBe(false)
  })

  it('tient une semaine au même seuil que l’augmentation de charge', () => {
    // 4 séances sur 5 font 80 % : la barre du chapitre 1.
    const { seancesPrevues, seancesRealisees } = assembler(semaine(1, 5, 4))

    const resume = semainesTenues(seancesPrevues, seancesRealisees, DEBUT, lundi(2))

    expect(resume[0]?.tauxRealisation).toBeCloseTo(0.8)
    expect(resume[0]?.tenue).toBe(true)
  })

  it('ne tient pas une semaine à 60 %', () => {
    const { seancesPrevues, seancesRealisees } = assembler(semaine(1, 5, 3))

    expect(semainesTenues(seancesPrevues, seancesRealisees, DEBUT, lundi(2))[0]?.tenue).toBe(
      false,
    )
  })

  it('ne compte pas comme perdue une semaine sans rien de prévu', () => {
    const resume = semainesTenues([], [], DEBUT, lundi(2))

    expect(resume[0]?.tenue).toBe(false)
    expect(resume[0]?.tauxRealisation).toBe(0)
  })
})

describe('serieEnCours', () => {
  it('compte les semaines tenues d’affilée', () => {
    const { seancesPrevues, seancesRealisees } = assembler(
      semaine(1, 3, 3),
      semaine(2, 3, 3),
      semaine(3, 3, 3),
    )
    const resume = semainesTenues(seancesPrevues, seancesRealisees, DEBUT, lundi(4))

    expect(serieEnCours(resume, lundi(4))).toBe(3)
  })

  it('s’arrête à la première semaine manquée', () => {
    const { seancesPrevues, seancesRealisees } = assembler(
      semaine(1, 3, 3),
      semaine(2, 3, 1),
      semaine(3, 3, 3),
    )
    const resume = semainesTenues(seancesPrevues, seancesRealisees, DEBUT, lundi(4))

    expect(serieEnCours(resume, lundi(4))).toBe(1)
  })

  it('ignore la semaine en cours, qui n’est pas encore jouée', () => {
    // Deux semaines pleines, puis une troisième à peine commencée : la série
    // vaut 2, pas 0.
    const { seancesPrevues, seancesRealisees } = assembler(
      semaine(1, 3, 3),
      semaine(2, 3, 3),
      semaine(3, 3, 0),
    )
    const resume = semainesTenues(seancesPrevues, seancesRealisees, DEBUT, lundi(3))

    expect(serieEnCours(resume, lundi(3))).toBe(2)
  })

  it('vaut zéro quand rien n’a encore été tenu', () => {
    const { seancesPrevues, seancesRealisees } = assembler(semaine(1, 3, 0))
    const resume = semainesTenues(seancesPrevues, seancesRealisees, DEBUT, lundi(2))

    expect(serieEnCours(resume, lundi(2))).toBe(0)
  })
})

describe('recordsParExercice', () => {
  const noms = new Map([
    ['marche-rapide', 'Marche rapide'],
    ['squat-sur-chaise', 'Squat sur chaise'],
  ])

  function realisee(date: string, exercices: SeanceRealisee['exercices']): SeanceRealisee {
    return uneSeanceRealisee({ id: 'r-' + date, date, exercices })
  }

  it('retient le meilleur résultat et le jour où il a été fait', () => {
    const seances = [
      realisee('2026-11-16', [
        { exerciceId: 'marche-rapide', ordre: 1, reel: { dureeMinutes: 20 } },
      ]),
      realisee('2026-11-23', [
        { exerciceId: 'marche-rapide', ordre: 1, reel: { dureeMinutes: 35 } },
      ]),
      realisee('2026-11-30', [
        { exerciceId: 'marche-rapide', ordre: 1, reel: { dureeMinutes: 28 } },
      ]),
    ]

    const [record] = recordsParExercice(seances, noms, DEBUT)

    expect(record).toMatchObject({
      exerciceId: 'marche-rapide',
      nom: 'Marche rapide',
      champ: 'dureeMinutes',
      meilleur: 35,
      dateDuMeilleur: '2026-11-23',
      dernier: 28,
      nombreDeSeances: 3,
    })
  })

  it('rend la progression semaine par semaine', () => {
    const seances = [
      realisee('2026-11-16', [
        { exerciceId: 'marche-rapide', ordre: 1, reel: { dureeMinutes: 20 } },
      ]),
      realisee('2026-11-18', [
        { exerciceId: 'marche-rapide', ordre: 1, reel: { dureeMinutes: 25 } },
      ]),
      realisee('2026-11-23', [
        { exerciceId: 'marche-rapide', ordre: 1, reel: { dureeMinutes: 30 } },
      ]),
    ]

    const [record] = recordsParExercice(seances, noms, DEBUT)

    // La semaine garde sa meilleure valeur, pas la dernière.
    expect(record?.points).toEqual([
      { semaine: 1, valeur: 25 },
      { semaine: 2, valeur: 30 },
    ])
  })

  it('compte le volume des séries', () => {
    const seances = [
      realisee('2026-11-16', [
        { exerciceId: 'squat-sur-chaise', ordre: 1, reel: { series: 2, repetitions: 10 } },
      ]),
    ]

    expect(recordsParExercice(seances, noms, DEBUT)[0]).toMatchObject({
      champ: 'repetitions',
      meilleur: 20,
    })
  })

  it('ignore les séances sautées', () => {
    const sautee = uneSeanceRealisee({
      id: 'r1',
      date: '2026-11-16',
      statut: 'sautee',
      exercices: [{ exerciceId: 'marche-rapide', ordre: 1, reel: { dureeMinutes: 30 } }],
    })

    expect(recordsParExercice([sautee], noms, DEBUT)).toEqual([])
  })

  it('ne compare pas des minutes à des répétitions', () => {
    const seances = [
      realisee('2026-11-16', [
        { exerciceId: 'marche-rapide', ordre: 1, reel: { dureeMinutes: 30 } },
      ]),
      realisee('2026-11-23', [
        { exerciceId: 'marche-rapide', ordre: 1, reel: { repetitions: 100 } },
      ]),
    ]

    const [record] = recordsParExercice(seances, noms, DEBUT)

    expect(record?.champ).toBe('dureeMinutes')
    expect(record?.meilleur).toBe(30)
    expect(record?.nombreDeSeances).toBe(1)
  })

  it('classe les exercices les plus pratiqués d’abord', () => {
    const seances = [
      realisee('2026-11-16', [
        { exerciceId: 'marche-rapide', ordre: 1, reel: { dureeMinutes: 30 } },
        { exerciceId: 'squat-sur-chaise', ordre: 2, reel: { series: 2, repetitions: 10 } },
      ]),
      realisee('2026-11-18', [
        { exerciceId: 'marche-rapide', ordre: 1, reel: { dureeMinutes: 30 } },
      ]),
    ]

    expect(recordsParExercice(seances, noms, DEBUT).map((r) => r.exerciceId)).toEqual([
      'marche-rapide',
      'squat-sur-chaise',
    ])
  })
})
