import { describe, expect, it } from 'vitest'

import type { ObjectifPersonnel } from '../entites'
import { uneSeanceRealisee } from '../../tests/fixtures'
import {
  avancementDesObjectifs,
  avancementObjectif,
  indicateurMesurable,
} from './objectifs'

const MARCHE_30: ObjectifPersonnel = {
  id: 'marche-30-min',
  libelle: 'Marcher 30 minutes d’affilée',
  indicateur: 'dureeMinutes',
  cible: 30,
  unite: 'min',
}

const NAGE_4: ObjectifPersonnel = {
  id: 'natation-4-longueurs',
  libelle: 'Nager 4 longueurs sans arrêt',
  indicateur: 'longueurs',
  cible: 4,
  unite: 'longueurs',
}

describe('indicateurMesurable', () => {
  it('reconnaît les grandeurs que les séances portent', () => {
    expect(indicateurMesurable('dureeMinutes')).toBe(true)
    expect(indicateurMesurable('longueurs')).toBe(true)
    expect(indicateurMesurable('repetitions')).toBe(true)
  })

  it('refuse ce que l’application ne mesure pas', () => {
    expect(indicateurMesurable('bonneHumeur')).toBe(false)
    expect(indicateurMesurable('')).toBe(false)
  })
})

describe('avancementObjectif', () => {
  it('rend la part de la cible atteinte', () => {
    const seances = [
      uneSeanceRealisee({
        id: 'a',
        date: '2026-11-12',
        exercices: [{ exerciceId: 'marche-rapide', ordre: 1, reel: { dureeMinutes: 18 } }],
      }),
    ]

    const avancement = avancementObjectif(MARCHE_30, seances)

    expect(avancement.meilleur).toBe(18)
    expect(avancement.dateDuMeilleur).toBe('2026-11-12')
    expect(avancement.part).toBeCloseTo(0.6)
    expect(avancement.atteint).toBe(false)
  })

  it('garde la meilleure valeur, pas la dernière', () => {
    const seances = [
      uneSeanceRealisee({
        id: 'a',
        date: '2026-11-12',
        exercices: [{ exerciceId: 'marche-rapide', ordre: 1, reel: { dureeMinutes: 25 } }],
      }),
      uneSeanceRealisee({
        id: 'b',
        date: '2026-11-14',
        exercices: [{ exerciceId: 'marche-rapide', ordre: 1, reel: { dureeMinutes: 12 } }],
      }),
    ]

    expect(avancementObjectif(MARCHE_30, seances).meilleur).toBe(25)
    expect(avancementObjectif(MARCHE_30, seances).dateDuMeilleur).toBe('2026-11-12')
  })

  it('ne somme jamais les exercices d’une séance', () => {
    // Trois marches de dix minutes ne font pas une demi-heure d'affilée.
    const seances = [
      uneSeanceRealisee({
        id: 'a',
        exercices: [
          { exerciceId: 'marche-rapide', ordre: 1, reel: { dureeMinutes: 10 } },
          { exerciceId: 'marche-rapide', ordre: 2, reel: { dureeMinutes: 10 } },
          { exerciceId: 'marche-rapide', ordre: 3, reel: { dureeMinutes: 10 } },
        ],
      }),
    ]

    const avancement = avancementObjectif(MARCHE_30, seances)

    expect(avancement.meilleur).toBe(10)
    expect(avancement.atteint).toBe(false)
  })

  it('ne multiplie pas les séries par les répétitions', () => {
    // Vingt pompes d'affilée, ce n'est pas deux séries de dix.
    const objectif: ObjectifPersonnel = {
      id: 'pompes-20',
      libelle: '20 pompes d’affilée',
      indicateur: 'repetitions',
      cible: 20,
      unite: 'répétitions',
    }
    const seances = [
      uneSeanceRealisee({
        exercices: [
          { exerciceId: 'pompes', ordre: 1, reel: { series: 2, repetitions: 10 } },
        ],
      }),
    ]

    expect(avancementObjectif(objectif, seances).meilleur).toBe(10)
    expect(avancementObjectif(objectif, seances).atteint).toBe(false)
  })

  it('retient le premier jour où la cible est tombée', () => {
    const seances = [
      uneSeanceRealisee({
        id: 'a',
        date: '2026-11-12',
        exercices: [{ exerciceId: 'nage', ordre: 1, reel: { longueurs: 4 } }],
      }),
      uneSeanceRealisee({
        id: 'b',
        date: '2026-11-19',
        exercices: [{ exerciceId: 'nage', ordre: 1, reel: { longueurs: 6 } }],
      }),
    ]

    const avancement = avancementObjectif(NAGE_4, seances)

    expect(avancement.atteint).toBe(true)
    expect(avancement.atteintLe).toBe('2026-11-12')
    expect(avancement.meilleur).toBe(6)
    expect(avancement.dateDuMeilleur).toBe('2026-11-19')
  })

  it('borne la jauge à la cible, même dépassée', () => {
    const seances = [
      uneSeanceRealisee({
        exercices: [{ exerciceId: 'nage', ordre: 1, reel: { longueurs: 12 } }],
      }),
    ]

    expect(avancementObjectif(NAGE_4, seances).part).toBe(1)
  })

  it('ne compte que le réalisé des séances faites ou partielles', () => {
    // Une séance sautée n'a pas eu lieu : elle ne fait avancer personne.
    const seances = [
      uneSeanceRealisee({
        statut: 'sautee',
        motif: 'fatigue',
        exercices: [{ exerciceId: 'nage', ordre: 1, reel: { longueurs: 8 } }],
      }),
    ]

    const avancement = avancementObjectif(NAGE_4, seances)

    expect(avancement.meilleur).toBeUndefined()
    expect(avancement.part).toBe(0)
    expect(avancement.atteint).toBe(false)
  })

  it('compte une séance partielle pour ce qu’elle a donné', () => {
    const seances = [
      uneSeanceRealisee({
        statut: 'partielle',
        exercices: [{ exerciceId: 'nage', ordre: 1, reel: { longueurs: 2 } }],
      }),
    ]

    expect(avancementObjectif(NAGE_4, seances).meilleur).toBe(2)
  })

  it('laisse hors jeu un objectif qu’on ne sait pas mesurer', () => {
    // Ni tenu ni manqué : afficher 0 % serait un reproche fabriqué.
    const objectif: ObjectifPersonnel = {
      id: 'dormir-mieux',
      libelle: 'Mieux dormir',
      indicateur: 'qualiteDuSommeil',
      cible: 8,
      unite: 'h',
    }

    const avancement = avancementObjectif(objectif, [uneSeanceRealisee()])

    expect(avancement.mesurable).toBe(false)
    expect(avancement.part).toBe(0)
    expect(avancement.atteint).toBe(false)
    expect(avancement.meilleur).toBeUndefined()
  })

  it('ignore la date d’atteinte enregistrée sur l’objectif', () => {
    // Une cible qu'on relève ne garde pas la médaille de l'ancienne.
    const releve: ObjectifPersonnel = { ...NAGE_4, cible: 10, atteintLe: '2026-10-01' }

    const avancement = avancementObjectif(releve, [
      uneSeanceRealisee({
        exercices: [{ exerciceId: 'nage', ordre: 1, reel: { longueurs: 4 } }],
      }),
    ])

    expect(avancement.atteint).toBe(false)
    expect(avancement.atteintLe).toBeUndefined()
  })

  it('tient sans historique', () => {
    const avancement = avancementObjectif(MARCHE_30, [])

    expect(avancement.mesurable).toBe(true)
    expect(avancement.meilleur).toBeUndefined()
    expect(avancement.part).toBe(0)
  })

  it('tient une cible nulle sans diviser par zéro', () => {
    const objectif: ObjectifPersonnel = { ...NAGE_4, cible: 0 }

    const avancement = avancementObjectif(objectif, [
      uneSeanceRealisee({
        exercices: [{ exerciceId: 'nage', ordre: 1, reel: { longueurs: 3 } }],
      }),
    ])

    expect(Number.isFinite(avancement.part)).toBe(true)
    expect(avancement.part).toBe(0)
    expect(avancement.atteint).toBe(false)
  })
})

describe('avancementDesObjectifs', () => {
  it('garde l’ordre du profil', () => {
    const avancements = avancementDesObjectifs([NAGE_4, MARCHE_30], [])

    expect(avancements.map((avancement) => avancement.objectif.id)).toEqual([
      'natation-4-longueurs',
      'marche-30-min',
    ])
  })

  it('rend une liste vide pour un profil sans objectif', () => {
    expect(avancementDesObjectifs([], [uneSeanceRealisee()])).toEqual([])
  })
})
