/**
 * Critère d'acceptation de l'étape 3 : « sur des données de test, chaque règle
 * produit l'ajustement attendu ». Il y a donc au moins un test par ligne du
 * tableau du chapitre 5, plus les bords de chaque seuil.
 */
import { describe, expect, it } from 'vitest'

import { CONFIG_PROGRESSION } from '../../config/progression'
import { desStatistiques, unBilan, unBilanDeProgression } from '../../tests/fixtures'
import { bibliothequeInitiale } from '../exercices/bibliotheque'
import type { BilanHebdo, StatistiquesSemaine } from '../entites'
import { contexteDepuisProfil } from '../profil/precautions'
import { profilParDefaut } from '../profil/profil-par-defaut'
import type { SerieChargeExercice } from './bilan'
import { evaluerRegles, type EntreeRegles } from './regles'

const bibliotheque = bibliothequeInitiale(new Date('2026-11-12T08:00:00.000Z'))
const precautions = contexteDepuisProfil(profilParDefaut())

function entree(modifications: Partial<EntreeRegles> = {}): EntreeRegles {
  return {
    statistiques: desStatistiques(),
    ressentiCharge: null,
    bilansPrecedents: [],
    seriesDeCharge: [],
    bibliotheque,
    precautions,
    ...modifications,
  }
}

function global(resultat: ReturnType<typeof evaluerRegles>) {
  const ajustement = resultat.ajustements.find((candidat) => candidat.exerciceId === undefined)
  if (!ajustement) throw new Error('aucun ajustement global')
  return ajustement
}

function stats(modifications: Partial<StatistiquesSemaine>): StatistiquesSemaine {
  return desStatistiques(modifications)
}

function quatreSemainesDeProgression(): BilanHebdo[] {
  return [4, 3, 2, 1].map((semaine) =>
    unBilanDeProgression({ id: 'bilan-' + String(semaine), semaine }),
  )
}

// ------------------------------------------- règle 1 : augmenter de 10 %

describe('au moins 80 % des séances et effort ≤ 6 : augmenter d’environ 10 %', () => {
  it('propose +10 %', () => {
    const resultat = evaluerRegles(entree())

    expect(resultat.reglesAppliquees[0]?.cle).toBe('augmenter')
    expect(global(resultat).facteur).toBe(1.1)
  })

  it('explique le changement comme le demande le chapitre 5', () => {
    const resultat = evaluerRegles(entree())

    expect(resultat.reglesAppliquees[0]?.explication).toBe(
      '+10 % car 3 séances sur 3 réalisées, effort 5/10.',
    )
  })

  it('accepte le seuil exact de 80 % et un effort de 6 pile', () => {
    const resultat = evaluerRegles(
      entree({
        statistiques: stats({
          seancesPrevues: 5,
          seancesFaites: 4,
          tauxRealisation: 0.8,
          effortMoyen: 6,
        }),
      }),
    )

    expect(resultat.reglesAppliquees[0]?.cle).toBe('augmenter')
  })

  it('ne dépasse jamais le plafond de 10 %', () => {
    // Même avec une configuration bricolée, le plafond du chapitre 10 tient.
    const configTriturée = {
      ...CONFIG_PROGRESSION,
      augmenter: { ...CONFIG_PROGRESSION.augmenter, facteur: 1.5 },
    }

    const resultat = evaluerRegles(entree({ config: configTriturée }))

    expect(global(resultat).facteur).toBe(1.1)
  })
})

// ---------------------------------------------- règle 2 : maintenir

describe('entre 50 et 80 % des séances : maintenir', () => {
  it('maintient la charge à 67 %', () => {
    const resultat = evaluerRegles(
      entree({
        statistiques: stats({
          seancesPrevues: 3,
          seancesFaites: 2,
          tauxRealisation: 2 / 3,
          effortMoyen: 5,
        }),
      }),
    )

    expect(resultat.reglesAppliquees[0]?.cle).toBe('maintenir')
    expect(global(resultat).facteur).toBe(1)
    expect(resultat.reglesAppliquees[0]?.explication).toMatch(/67 %/)
  })

  it('maintient au seuil exact de 50 %', () => {
    const resultat = evaluerRegles(
      entree({
        statistiques: stats({
          seancesPrevues: 4,
          seancesFaites: 2,
          tauxRealisation: 0.5,
          effortMoyen: 5,
        }),
      }),
    )

    expect(resultat.reglesAppliquees[0]?.cle).toBe('maintenir')
  })

  it('maintient quand les séances sont là mais l’effort reste à 7', () => {
    // 7 ne déclenche ni l'augmentation (≤ 6) ni la réduction (≥ 8) : le
    // tableau du chapitre 5 ne dit rien de ce cas, « maintenir » est le défaut.
    const resultat = evaluerRegles(entree({ statistiques: stats({ effortMoyen: 7 }) }))

    expect(resultat.reglesAppliquees[0]?.cle).toBe('maintenir')
    expect(resultat.reglesAppliquees[0]?.explication).toMatch(/au-dessus de 6\/10/)
  })

  it('maintient quand rien n’était prévu ni fait', () => {
    const resultat = evaluerRegles(
      entree({
        statistiques: stats({
          seancesPrevues: 0,
          seancesFaites: 0,
          tauxRealisation: 0,
          effortMoyen: null,
        }),
      }),
    )

    expect(resultat.reglesAppliquees[0]?.cle).toBe('maintenir')
    expect(resultat.reglesAppliquees[0]?.explication).toMatch(/aucune séance prévue ni réalisée/)
  })
})

// ----------------------------------------------- règle 3 : réduire de 20 %

describe('moins de 50 % des séances, ou effort ≥ 8 : réduire d’environ 20 %', () => {
  it('réduit quand une séance sur trois a été faite', () => {
    const resultat = evaluerRegles(
      entree({
        statistiques: stats({
          seancesPrevues: 3,
          seancesFaites: 1,
          tauxRealisation: 1 / 3,
          effortMoyen: 5,
        }),
      }),
    )

    expect(resultat.reglesAppliquees[0]?.cle).toBe('reduire')
    expect(global(resultat).facteur).toBe(0.8)
    expect(resultat.reglesAppliquees[0]?.explication).toMatch(/^-20 %/)
  })

  it('réduit sur un effort de 8, même avec toutes les séances faites', () => {
    const resultat = evaluerRegles(entree({ statistiques: stats({ effortMoyen: 8 }) }))

    expect(resultat.reglesAppliquees[0]?.cle).toBe('reduire')
    expect(resultat.reglesAppliquees[0]?.explication).toMatch(/effort moyen de 8\/10/)
  })

  it('invite à chercher les causes', () => {
    const resultat = evaluerRegles(entree({ statistiques: stats({ effortMoyen: 9 }) }))

    expect(resultat.reglesAppliquees[0]?.explication).toMatch(/fatigue, planning, douleurs/)
  })

  it('ne réduit pas encore à 50 %', () => {
    const resultat = evaluerRegles(
      entree({ statistiques: stats({ tauxRealisation: 0.5, effortMoyen: 5 }) }),
    )

    expect(resultat.reglesAppliquees[0]?.cle).not.toBe('reduire')
  })
})

// -------------------------------------- règle 4 : douleur répétée

describe('douleur signalée deux fois sur le même exercice', () => {
  it('propose la variante plus douce et suggère un avis médical', () => {
    const resultat = evaluerRegles(
      entree({
        statistiques: stats({ douleursParExercice: { 'squat-mi-amplitude': 2 } }),
      }),
    )

    const parExercice = resultat.ajustements.find(
      (ajustement) => ajustement.exerciceId === 'squat-mi-amplitude',
    )

    expect(parExercice?.regle).toBe('douleur-repetee')
    expect(parExercice?.remplacementParId).toBe('squat-sur-chaise')
    expect(parExercice?.avisMedicalSuggere).toBe(true)
    expect(parExercice?.explication).toMatch(/Douleur signalée 2 fois/)
    expect(parExercice?.explication).toMatch(/avis médical/)
  })

  it('ne se déclenche pas sur un seul signalement', () => {
    const resultat = evaluerRegles(
      entree({ statistiques: stats({ douleursParExercice: { 'squat-mi-amplitude': 1 } }) }),
    )

    expect(resultat.ajustements.filter((a) => a.regle === 'douleur-repetee')).toHaveLength(0)
  })

  it('cumule les signalements sur la fenêtre configurée', () => {
    // Une douleur cette semaine, une la semaine dernière : cela fait deux.
    const resultat = evaluerRegles(
      entree({
        statistiques: stats({ douleursParExercice: { 'squat-mi-amplitude': 1 } }),
        bilansPrecedents: [
          unBilan({
            statistiques: desStatistiques({ douleursParExercice: { 'squat-mi-amplitude': 1 } }),
          }),
        ],
      }),
    )

    expect(
      resultat.ajustements.some((a) => a.regle === 'douleur-repetee'),
    ).toBe(true)
  })

  it('le dit franchement quand il n’y a pas de variante plus douce', () => {
    const resultat = evaluerRegles(
      entree({ statistiques: stats({ douleursParExercice: { 'marche-tranquille': 2 } }) }),
    )

    const parExercice = resultat.ajustements.find(
      (ajustement) => ajustement.exerciceId === 'marche-tranquille',
    )

    expect(parExercice?.remplacementParId).toBeUndefined()
    expect(parExercice?.explication).toMatch(/aucune variante plus douce/)
  })

  it('empêche l’augmentation de charge la même semaine', () => {
    // Précaution assumée, et désactivable dans la configuration.
    const resultat = evaluerRegles(
      entree({ statistiques: stats({ douleursParExercice: { 'squat-mi-amplitude': 2 } }) }),
    )

    expect(resultat.reglesAppliquees[0]?.cle).toBe('maintenir')
    expect(global(resultat).facteur).toBe(1)
    expect(resultat.reglesAppliquees[0]?.explication).toMatch(/douleur s’est répétée/)
  })

  it('laisse augmenter si la configuration le permet', () => {
    const config = {
      ...CONFIG_PROGRESSION,
      douleurRepetee: { ...CONFIG_PROGRESSION.douleurRepetee, bloqueAugmentation: false },
    }

    const resultat = evaluerRegles(
      entree({
        statistiques: stats({ douleursParExercice: { 'squat-mi-amplitude': 2 } }),
        config,
      }),
    )

    expect(resultat.reglesAppliquees[0]?.cle).toBe('augmenter')
  })
})

// --------------------------------------- règle 5 : semaine allégée

describe('quatre semaines de progression d’affilée : semaine allégée', () => {
  it('propose -30 % pour récupérer', () => {
    const resultat = evaluerRegles(entree({ bilansPrecedents: quatreSemainesDeProgression() }))

    expect(resultat.reglesAppliquees[0]?.cle).toBe('semaine-allegee')
    expect(global(resultat).facteur).toBe(0.7)
    expect(resultat.reglesAppliquees[0]?.explication).toMatch(
      /-30 % pour récupérer, après 4 semaines/,
    )
  })

  it('passe devant l’augmentation', () => {
    // La semaine est excellente : sans cette règle, elle monterait encore.
    const resultat = evaluerRegles(
      entree({
        statistiques: stats({ effortMoyen: 4 }),
        bilansPrecedents: quatreSemainesDeProgression(),
      }),
    )

    expect(resultat.reglesAppliquees[0]?.cle).toBe('semaine-allegee')
  })

  it('ne se déclenche pas après trois semaines seulement', () => {
    const resultat = evaluerRegles(
      entree({ bilansPrecedents: quatreSemainesDeProgression().slice(0, 3) }),
    )

    expect(resultat.reglesAppliquees[0]?.cle).toBe('augmenter')
  })

  it('ne compte pas une progression refusée par l’utilisateur', () => {
    const bilans = quatreSemainesDeProgression()
    const refuse = bilans[1]
    if (refuse) bilans[1] = { ...refuse, decision: 'refuse' }

    const resultat = evaluerRegles(entree({ bilansPrecedents: bilans }))

    expect(resultat.reglesAppliquees[0]?.cle).toBe('augmenter')
  })

  it('cède le pas à la réduction : une mauvaise semaine prime', () => {
    const resultat = evaluerRegles(
      entree({
        statistiques: stats({ tauxRealisation: 0.2, effortMoyen: 9 }),
        bilansPrecedents: quatreSemainesDeProgression(),
      }),
    )

    expect(resultat.reglesAppliquees[0]?.cle).toBe('reduire')
  })
})

// ------------------------------------------- règle 6 : palier atteint

describe('palier atteint sur un exercice', () => {
  function serie(exerciceId: string, valeurs: number[]): SerieChargeExercice {
    return {
      exerciceId,
      champ: 'repetitions',
      points: valeurs.map((valeur, index) => ({ semaine: index + 1, valeur })),
    }
  }

  it('propose la variante plus difficile après trois semaines à l’arrêt', () => {
    const resultat = evaluerRegles(
      entree({ seriesDeCharge: [serie('squat-sur-chaise', [20, 20, 20])] }),
    )

    const parExercice = resultat.ajustements.find(
      (ajustement) => ajustement.exerciceId === 'squat-sur-chaise',
    )

    expect(parExercice?.regle).toBe('palier-atteint')
    expect(parExercice?.remplacementParId).toBe('squat-mi-amplitude')
    expect(parExercice?.explication).toMatch(/Palier sur « Squat sur chaise » : 3 semaines à 20/)
  })

  it('tolère une variation de 2 %, pas davantage', () => {
    const dansLaTolerance = evaluerRegles(
      entree({ seriesDeCharge: [serie('squat-sur-chaise', [100, 100, 98])] }),
    )
    const horsTolerance = evaluerRegles(
      entree({ seriesDeCharge: [serie('squat-sur-chaise', [100, 100, 90])] }),
    )

    expect(dansLaTolerance.ajustements.some((a) => a.regle === 'palier-atteint')).toBe(true)
    expect(horsTolerance.ajustements.some((a) => a.regle === 'palier-atteint')).toBe(false)
  })

  it('ne voit pas de palier quand la charge progresse', () => {
    const resultat = evaluerRegles(
      entree({ seriesDeCharge: [serie('squat-sur-chaise', [16, 18, 20])] }),
    )

    expect(resultat.ajustements.some((a) => a.regle === 'palier-atteint')).toBe(false)
  })

  it('ne voit pas de palier sur deux semaines seulement', () => {
    const resultat = evaluerRegles(
      entree({ seriesDeCharge: [serie('squat-sur-chaise', [20, 20])] }),
    )

    expect(resultat.ajustements.some((a) => a.regle === 'palier-atteint')).toBe(false)
  })

  it('exige des semaines consécutives : un trou n’est pas un palier', () => {
    const resultat = evaluerRegles(
      entree({
        seriesDeCharge: [
          {
            exerciceId: 'squat-sur-chaise',
            champ: 'repetitions',
            points: [
              { semaine: 1, valeur: 20 },
              { semaine: 2, valeur: 20 },
              { semaine: 5, valeur: 20 },
            ],
          },
        ],
      }),
    )

    expect(resultat.ajustements.some((a) => a.regle === 'palier-atteint')).toBe(false)
  })

  it('se tait quand aucune variante plus difficile n’est atteignable', () => {
    // La marche avec dénivelé n'a pas de cran au-dessus (la course est écartée).
    const resultat = evaluerRegles(
      entree({ seriesDeCharge: [serie('marche-avec-denivele', [30, 30, 30])] }),
    )

    expect(resultat.ajustements.some((a) => a.regle === 'palier-atteint')).toBe(false)
  })

  it('ne propose rien de plus dur la semaine où l’on réduit', () => {
    const resultat = evaluerRegles(
      entree({
        statistiques: stats({ tauxRealisation: 0.2, effortMoyen: 9 }),
        seriesDeCharge: [serie('squat-sur-chaise', [20, 20, 20])],
      }),
    )

    expect(resultat.reglesAppliquees[0]?.cle).toBe('reduire')
    expect(resultat.ajustements.some((a) => a.regle === 'palier-atteint')).toBe(false)
  })

  it('ne propose rien de plus dur sur un exercice douloureux', () => {
    const resultat = evaluerRegles(
      entree({
        statistiques: stats({ douleursParExercice: { 'squat-sur-chaise': 2 } }),
        seriesDeCharge: [serie('squat-sur-chaise', [20, 20, 20])],
      }),
    )

    expect(resultat.ajustements.some((a) => a.regle === 'palier-atteint')).toBe(false)
    expect(resultat.ajustements.some((a) => a.regle === 'douleur-repetee')).toBe(true)
  })

  it('s’ajoute à la décision globale au lieu de la remplacer', () => {
    const resultat = evaluerRegles(
      entree({ seriesDeCharge: [serie('squat-sur-chaise', [20, 20, 20])] }),
    )

    expect(resultat.reglesAppliquees.map((regle) => regle.cle)).toEqual([
      'augmenter',
      'palier-atteint',
    ])
  })
})

// --------------------------------- ressenti de fin de semaine et levier

describe('réponse « trop dur » en fin de semaine', () => {
  it('empêche l’augmentation', () => {
    const resultat = evaluerRegles(entree({ ressentiCharge: 'trop-dur' }))

    expect(resultat.reglesAppliquees[0]?.cle).toBe('maintenir')
    expect(resultat.reglesAppliquees[0]?.explication).toMatch(/jugée trop dure/)
  })

  it('ne gêne pas quand la charge est jugée juste', () => {
    const resultat = evaluerRegles(entree({ ressentiCharge: 'juste-bien' }))

    expect(resultat.reglesAppliquees[0]?.cle).toBe('augmenter')
  })
})

describe('un seul levier à la fois', () => {
  it('commence par le premier levier de la configuration', () => {
    expect(evaluerRegles(entree()).levier).toBe('duree')
  })

  it('passe au levier suivant après une semaine qui a bougé', () => {
    const resultat = evaluerRegles(entree({ bilansPrecedents: [unBilanDeProgression()] }))

    expect(resultat.levier).toBe('intensite')
  })

  it('garde le même levier après une semaine de maintien', () => {
    const maintien = unBilan({
      ajustements: [
        { regle: 'maintenir', levier: 'intensite', facteur: 1, explication: 'Charge maintenue.' },
      ],
    })

    expect(evaluerRegles(entree({ bilansPrecedents: [maintien] })).levier).toBe('intensite')
  })

  it('n’émet qu’un seul ajustement global, avec un seul levier', () => {
    const resultat = evaluerRegles(
      entree({ seriesDeCharge: [{ exerciceId: 'squat-sur-chaise', champ: 'repetitions', points: [] }] }),
    )

    const globaux = resultat.ajustements.filter((a) => a.exerciceId === undefined)
    expect(globaux).toHaveLength(1)
    expect(new Set(resultat.ajustements.map((a) => a.levier)).size).toBe(1)
  })
})
