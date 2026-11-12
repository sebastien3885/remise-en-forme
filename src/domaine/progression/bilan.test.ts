import { describe, expect, it } from 'vitest'

import { uneSeancePrevue, uneSeanceRealisee } from '../../tests/fixtures'
import type { SeancePrevue, SeanceRealisee } from '../entites'
import { seancesARealiser, seriesDeCharge, statistiquesDeLaSemaine } from './bilan'

const SEMAINE = { semaine: 1, debut: '2026-11-16', fin: '2026-11-22' }

function calculer(
  seancesPrevues: SeancePrevue[],
  seancesRealisees: SeanceRealisee[],
) {
  return statistiquesDeLaSemaine({ ...SEMAINE, seancesPrevues, seancesRealisees })
}

describe('séances à réaliser', () => {
  it('ne compte pas les jours de repos', () => {
    const seances = [
      uneSeancePrevue({ id: 's1', type: 'marche' }),
      uneSeancePrevue({ id: 's2', type: 'repos', exercices: [] }),
    ]

    expect(seancesARealiser(seances).map((seance) => seance.id)).toEqual(['s1'])
  })

  it('ne compte pas une séance annulée ou remplacée', () => {
    const seances = [
      uneSeancePrevue({ id: 's1' }),
      uneSeancePrevue({ id: 's2', statut: 'annulee' }),
      uneSeancePrevue({ id: 's3', statut: 'remplacee' }),
      uneSeancePrevue({ id: 's4', statut: 'deplacee' }),
    ]

    expect(seancesARealiser(seances).map((seance) => seance.id)).toEqual(['s1', 's4'])
  })
})

describe('taux de réalisation', () => {
  it('vaut 1 quand tout est fait', () => {
    const stats = calculer(
      [uneSeancePrevue({ id: 's1' }), uneSeancePrevue({ id: 's2', date: '2026-11-18' })],
      [
        uneSeanceRealisee({ id: 'r1', date: '2026-11-16' }),
        uneSeanceRealisee({ id: 'r2', date: '2026-11-18' }),
      ],
    )

    expect(stats.tauxRealisation).toBe(1)
    expect(stats.seancesFaites).toBe(2)
  })

  it('compte une séance faite en partie pour moitié', () => {
    const stats = calculer(
      [
        uneSeancePrevue({ id: 's1' }),
        uneSeancePrevue({ id: 's2', date: '2026-11-18' }),
        uneSeancePrevue({ id: 's3', date: '2026-11-20' }),
      ],
      [
        uneSeanceRealisee({ id: 'r1', date: '2026-11-16' }),
        uneSeanceRealisee({ id: 'r2', date: '2026-11-18', statut: 'partielle' }),
      ],
    )

    // (1 + 0,5) / 3
    expect(stats.tauxRealisation).toBeCloseTo(0.5)
    expect(stats.seancesPartielles).toBe(1)
  })

  it('compte une séance improvisée : elle a bien été faite', () => {
    const improvisee = uneSeanceRealisee({ id: 'r2', date: '2026-11-18', type: 'velo' })
    delete improvisee.seancePrevueId

    const stats = calculer(
      [uneSeancePrevue({ id: 's1' }), uneSeancePrevue({ id: 's2', date: '2026-11-18' })],
      [uneSeanceRealisee({ id: 'r1', date: '2026-11-16' }), improvisee],
    )

    expect(stats.seancesImprovisees).toBe(1)
    expect(stats.tauxRealisation).toBe(1)
  })

  it('vaut 0 quand rien n’était prévu ni fait', () => {
    expect(calculer([], []).tauxRealisation).toBe(0)
  })

  it('vaut 1 quand rien n’était prévu mais qu’une séance a été faite', () => {
    const improvisee = uneSeanceRealisee({ id: 'r1', date: '2026-11-18' })
    delete improvisee.seancePrevueId

    expect(calculer([], [improvisee]).tauxRealisation).toBe(1)
  })

  it('ignore les séances hors de la semaine', () => {
    const stats = calculer(
      [uneSeancePrevue({ id: 's1' })],
      [
        uneSeanceRealisee({ id: 'r1', date: '2026-11-16' }),
        uneSeanceRealisee({ id: 'r2', date: '2026-11-23' }),
      ],
    )

    expect(stats.seancesFaites).toBe(1)
  })
})

describe('effort et énergie moyens', () => {
  it('moyennent les séances faites et partielles', () => {
    const stats = calculer(
      [uneSeancePrevue({ id: 's1' }), uneSeancePrevue({ id: 's2', date: '2026-11-18' })],
      [
        uneSeanceRealisee({ id: 'r1', date: '2026-11-16', effort: 4, energie: 8 }),
        uneSeanceRealisee({
          id: 'r2',
          date: '2026-11-18',
          statut: 'partielle',
          effort: 6,
          energie: 6,
        }),
      ],
    )

    expect(stats.effortMoyen).toBe(5)
    expect(stats.energieMoyenne).toBe(7)
  })

  it('ignorent une séance sautée : elle n’a pas d’effort à moyenner', () => {
    const stats = calculer(
      [uneSeancePrevue({ id: 's1' }), uneSeancePrevue({ id: 's2', date: '2026-11-18' })],
      [
        uneSeanceRealisee({ id: 'r1', date: '2026-11-16', effort: 4 }),
        uneSeanceRealisee({ id: 'r2', date: '2026-11-18', statut: 'sautee', effort: 10 }),
      ],
    )

    expect(stats.effortMoyen).toBe(4)
  })

  it('valent null quand aucune séance n’a été faite', () => {
    const stats = calculer(
      [uneSeancePrevue({ id: 's1' })],
      [uneSeanceRealisee({ id: 'r1', date: '2026-11-16', statut: 'sautee' })],
    )

    expect(stats.effortMoyen).toBeNull()
    expect(stats.energieMoyenne).toBeNull()
  })
})

describe('douleurs', () => {
  it('comptent les signalements par exercice', () => {
    const stats = calculer(
      [uneSeancePrevue({ id: 's1' }), uneSeancePrevue({ id: 's2', date: '2026-11-18' })],
      [
        uneSeanceRealisee({
          id: 'r1',
          date: '2026-11-16',
          exercices: [
            { exerciceId: 'squat-sur-chaise', ordre: 1, reel: { repetitions: 10 }, douleur: 3 },
            { exerciceId: 'pompes-contre-mur', ordre: 2, reel: { repetitions: 8 } },
          ],
        }),
        uneSeanceRealisee({
          id: 'r2',
          date: '2026-11-18',
          exercices: [
            { exerciceId: 'squat-sur-chaise', ordre: 1, reel: { repetitions: 10 }, douleur: 2 },
          ],
        }),
      ],
    )

    expect(stats.douleursParExercice).toEqual({ 'squat-sur-chaise': 2 })
  })

  it('ne comptent pas une douleur à zéro', () => {
    const stats = calculer(
      [uneSeancePrevue({ id: 's1' })],
      [
        uneSeanceRealisee({
          id: 'r1',
          date: '2026-11-16',
          exercices: [
            { exerciceId: 'squat-sur-chaise', ordre: 1, reel: { repetitions: 10 }, douleur: 0 },
          ],
        }),
      ],
    )

    expect(stats.douleursParExercice).toEqual({})
  })

  it('retiennent la douleur la plus forte, séance et exercice confondus', () => {
    const stats = calculer(
      [uneSeancePrevue({ id: 's1' })],
      [
        uneSeanceRealisee({
          id: 'r1',
          date: '2026-11-16',
          douleurs: [{ zone: 'genou', intensite: 4 }],
          exercices: [
            { exerciceId: 'squat-sur-chaise', ordre: 1, reel: { repetitions: 10 }, douleur: 7 },
          ],
        }),
      ],
    )

    expect(stats.douleurMaximale).toBe(7)
  })
})

describe('motifs', () => {
  it('comptent les motifs des séances sautées et partielles', () => {
    const stats = calculer(
      [
        uneSeancePrevue({ id: 's1' }),
        uneSeancePrevue({ id: 's2', date: '2026-11-18' }),
        uneSeancePrevue({ id: 's3', date: '2026-11-20' }),
      ],
      [
        uneSeanceRealisee({ id: 'r1', date: '2026-11-16', statut: 'sautee', motif: 'fatigue' }),
        uneSeanceRealisee({ id: 'r2', date: '2026-11-18', statut: 'sautee', motif: 'fatigue' }),
        uneSeanceRealisee({
          id: 'r3',
          date: '2026-11-20',
          statut: 'partielle',
          motif: 'manque-de-temps',
        }),
      ],
    )

    expect(stats.motifs).toEqual({ fatigue: 2, 'manque-de-temps': 1 })
  })
})

describe('séries de charge par exercice', () => {
  it('retiennent la meilleure charge de chaque semaine', () => {
    const seances = [
      uneSeanceRealisee({
        id: 'r1',
        date: '2026-11-16',
        exercices: [{ exerciceId: 'squat-sur-chaise', ordre: 1, reel: { repetitions: 10 } }],
      }),
      uneSeanceRealisee({
        id: 'r2',
        date: '2026-11-18',
        exercices: [{ exerciceId: 'squat-sur-chaise', ordre: 1, reel: { repetitions: 14 } }],
      }),
      uneSeanceRealisee({
        id: 'r3',
        date: '2026-11-25',
        exercices: [{ exerciceId: 'squat-sur-chaise', ordre: 1, reel: { repetitions: 12 } }],
      }),
    ]

    const series = seriesDeCharge(seances, '2026-11-16')

    expect(series).toHaveLength(1)
    expect(series[0]?.exerciceId).toBe('squat-sur-chaise')
    expect(series[0]?.champ).toBe('repetitions')
    expect(series[0]?.points).toEqual([
      { semaine: 1, valeur: 14 },
      { semaine: 2, valeur: 12 },
    ])
  })

  it('ignorent les séances sautées', () => {
    const series = seriesDeCharge(
      [
        uneSeanceRealisee({
          id: 'r1',
          statut: 'sautee',
          exercices: [{ exerciceId: 'squat-sur-chaise', ordre: 1, reel: { repetitions: 10 } }],
        }),
      ],
      '2026-11-16',
    )

    expect(series).toEqual([])
  })

  it('ignorent une mesure qui change de grandeur plutôt que de comparer de travers', () => {
    const seances = [
      uneSeanceRealisee({
        id: 'r1',
        date: '2026-11-16',
        exercices: [{ exerciceId: 'marche-rapide', ordre: 1, reel: { dureeMinutes: 30 } }],
      }),
      uneSeanceRealisee({
        id: 'r2',
        date: '2026-11-23',
        exercices: [{ exerciceId: 'marche-rapide', ordre: 1, reel: { distanceMetres: 3000 } }],
      }),
    ]

    const series = seriesDeCharge(seances, '2026-11-16')

    expect(series[0]?.champ).toBe('dureeMinutes')
    expect(series[0]?.points).toEqual([{ semaine: 1, valeur: 30 }])
  })

  it('suivent plusieurs exercices à la fois', () => {
    const series = seriesDeCharge(
      [
        uneSeanceRealisee({
          id: 'r1',
          exercices: [
            { exerciceId: 'squat-sur-chaise', ordre: 1, reel: { repetitions: 10 } },
            { exerciceId: 'gainage-avant-bras', ordre: 2, reel: { maintienSecondes: 20 } },
          ],
        }),
      ],
      '2026-11-16',
    )

    expect(series.map((serie) => serie.exerciceId).sort()).toEqual([
      'gainage-avant-bras',
      'squat-sur-chaise',
    ])
  })
})
