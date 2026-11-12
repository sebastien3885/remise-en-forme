import { describe, expect, it } from 'vitest'

import { CONFIG_PROGRESSION } from '../../config/progression'
import { unBilan, uneSeancePrevue, uneSeanceRealisee } from '../../tests/fixtures'
import type { SeancePrevue } from '../entites'
import { bibliothequeInitiale } from '../exercices/bibliotheque'
import { contexteDepuisProfil } from '../profil/precautions'
import { profilParDefaut } from '../profil/profil-par-defaut'
import {
  ajustementGlobal,
  appliquerAjustements,
  genererBilan,
  joursDeReposSuffisants,
  remplacementsProposes,
  type EntreeMoteur,
} from './moteur'

const bibliotheque = bibliothequeInitiale(new Date('2026-11-12T08:00:00.000Z'))
const precautions = contexteDepuisProfil(profilParDefaut())
const MAINTENANT = new Date('2026-11-22T20:00:00.000Z')

/** Une semaine type du programme de départ : 6 séances et un jour de repos. */
function semaineType(): SeancePrevue[] {
  return [
    uneSeancePrevue({
      id: 'p-lun',
      date: '2026-11-16',
      type: 'marche',
      titre: 'Marche rapide 30 min',
      exercices: [
        { exerciceId: 'marche-rapide', ordre: 1, cibles: { dureeMinutes: 30 } },
        { exerciceId: 'etirement-mollets', ordre: 2, cibles: { maintienSecondes: 60 } },
      ],
    }),
    uneSeancePrevue({
      id: 'p-mar',
      date: '2026-11-17',
      type: 'renforcement',
      titre: 'Renforcement 15 min',
      exercices: [
        {
          exerciceId: 'squat-sur-chaise',
          ordre: 1,
          cibles: { series: 2, repetitions: 10, reposSecondes: 60 },
        },
        {
          exerciceId: 'gainage-avant-bras',
          ordre: 2,
          cibles: { series: 3, maintienSecondes: 20, reposSecondes: 45 },
        },
      ],
    }),
    uneSeancePrevue({
      id: 'p-jeu',
      date: '2026-11-19',
      type: 'repos',
      titre: 'Repos complet',
      exercices: [],
    }),
    uneSeancePrevue({
      id: 'p-dim',
      date: '2026-11-22',
      type: 'natation',
      titre: 'Natation douce',
      exercices: [{ exerciceId: 'nage-crawl', ordre: 1, cibles: { longueurs: 8, reposSecondes: 40 } }],
    }),
  ]
}

function entree(modifications: Partial<EntreeMoteur> = {}): EntreeMoteur {
  const prevues = semaineType()
  return {
    programmeId: 'programme-1',
    semaine: 1,
    debut: '2026-11-16',
    fin: '2026-11-22',
    dateDebutProgramme: '2026-11-16',
    seancesPrevues: prevues,
    seancesRealisees: [
      uneSeanceRealisee({ id: 'r1', seancePrevueId: 'p-lun', date: '2026-11-16', effort: 5 }),
      uneSeanceRealisee({ id: 'r2', seancePrevueId: 'p-mar', date: '2026-11-17', effort: 5 }),
      uneSeanceRealisee({ id: 'r3', seancePrevueId: 'p-dim', date: '2026-11-22', effort: 5 }),
    ],
    bibliotheque,
    precautions,
    maintenant: MAINTENANT,
    nouvelId: () => 'bilan-genere',
    ...modifications,
  }
}

describe('genererBilan', () => {
  it('rend un bilan en attente de décision', () => {
    const bilan = genererBilan(entree())

    expect(bilan.decision).toBe('en-attente')
    expect(bilan.decideLe).toBeUndefined()
    expect(bilan.programmeGenereId).toBeUndefined()
  })

  it('reprend la semaine, ses bornes et le programme', () => {
    const bilan = genererBilan(entree())

    expect(bilan).toMatchObject({
      id: 'bilan-genere',
      programmeId: 'programme-1',
      semaine: 1,
      debut: '2026-11-16',
      fin: '2026-11-22',
      genereLe: '2026-11-22T20:00:00.000Z',
    })
  })

  it('calcule les statistiques sur le réalisé, pas sur le prévu', () => {
    const bilan = genererBilan(entree())

    // 3 séances prévues hors repos, 3 faites.
    expect(bilan.statistiques.seancesPrevues).toBe(3)
    expect(bilan.statistiques.seancesFaites).toBe(3)
    expect(bilan.statistiques.tauxRealisation).toBe(1)
    expect(bilan.statistiques.effortMoyen).toBe(5)
  })

  it('applique les règles et propose un ajustement expliqué', () => {
    const bilan = genererBilan(entree())

    expect(bilan.reglesAppliquees[0]?.cle).toBe('augmenter')
    expect(ajustementGlobal(bilan)?.facteur).toBe(1.1)
    expect(ajustementGlobal(bilan)?.explication).toBe(
      '+10 % car 3 séances sur 3 réalisées, effort 5/10.',
    )
  })

  it('garde la réponse de fin de semaine', () => {
    const bilan = genererBilan(entree({ ressentiCharge: 'juste-bien' }))

    expect(bilan.ressentiCharge).toBe('juste-bien')
  })

  it('repère un palier à partir de l’historique de toutes les semaines', () => {
    const historique = [1, 2, 3].flatMap((semaine) => [
      uneSeanceRealisee({
        id: 'h' + String(semaine),
        date: ['2026-11-17', '2026-11-24', '2026-12-01'][semaine - 1] ?? '2026-11-17',
        exercices: [{ exerciceId: 'squat-sur-chaise', ordre: 1, reel: { repetitions: 20 } }],
      }),
    ])

    const bilan = genererBilan(
      entree({
        semaine: 3,
        debut: '2026-11-30',
        fin: '2026-12-06',
        seancesRealisees: [],
        seancesPrevues: [],
        historiqueRealise: historique,
      }),
    )

    expect(bilan.reglesAppliquees.some((regle) => regle.cle === 'palier-atteint')).toBe(true)
  })

  it('ne voit aucun palier quand seule la semaine courante est fournie', () => {
    const bilan = genererBilan(entree())

    expect(bilan.reglesAppliquees.some((regle) => regle.cle === 'palier-atteint')).toBe(false)
  })
})

describe('appliquerAjustements', () => {
  const bilanAugmente = () => genererBilan(entree())

  it('laisse les dates en place par défaut : les séances sont déjà posées', () => {
    const suivante = appliquerAjustements(semaineType(), bilanAugmente(), {
      maintenant: MAINTENANT,
    })

    expect(suivante.map((seance) => seance.date)).toEqual([
      '2026-11-16',
      '2026-11-17',
      '2026-11-19',
      '2026-11-22',
    ])
    expect(suivante.every((seance) => seance.semaine === 1)).toBe(true)
  })

  it('rattache les séances au programme demandé', () => {
    const suivante = appliquerAjustements(semaineType(), bilanAugmente(), {
      maintenant: MAINTENANT,
      programmeId: 'programme-2',
    })

    expect(suivante.every((seance) => seance.programmeId === 'programme-2')).toBe(true)
  })

  it('décale les dates et le numéro de semaine quand on le demande', () => {
    const suivante = appliquerAjustements(semaineType(), bilanAugmente(), {
      decalageJours: 7,
      maintenant: MAINTENANT,
      nouvelId: (() => {
        let compteur = 0
        return () => 's-' + String(++compteur)
      })(),
    })

    expect(suivante.map((seance) => seance.date)).toEqual([
      '2026-11-23',
      '2026-11-24',
      '2026-11-26',
      '2026-11-29',
    ])
    expect(suivante.every((seance) => seance.semaine === 2)).toBe(true)
  })

  it('n’augmente que les cibles du levier retenu', () => {
    // Premier bilan : le levier est la durée.
    const suivante = appliquerAjustements(semaineType(), bilanAugmente(), {
      maintenant: MAINTENANT,
    })

    const marche = suivante.find((seance) => seance.type === 'marche')
    const renforcement = suivante.find((seance) => seance.type === 'renforcement')
    const natation = suivante.find((seance) => seance.type === 'natation')

    // Durée : 30 → 33 min, et le maintien 60 → 66 s.
    expect(marche?.exercices[0]?.cibles.dureeMinutes).toBe(33)
    expect(marche?.exercices[1]?.cibles.maintienSecondes).toBe(66)

    // Le gainage relève aussi de la durée : 3 × 20 s → 22 s.
    expect(renforcement?.exercices[1]?.cibles.maintienSecondes).toBe(22)

    // L'intensité ne bouge pas : ni les répétitions, ni les longueurs.
    expect(renforcement?.exercices[0]?.cibles.repetitions).toBe(10)
    expect(natation?.exercices[0]?.cibles.longueurs).toBe(8)
  })

  it('ne touche pas aux temps de repos', () => {
    const suivante = appliquerAjustements(semaineType(), bilanAugmente(), {
      maintenant: MAINTENANT,
    })

    const renforcement = suivante.find((seance) => seance.type === 'renforcement')
    expect(renforcement?.exercices[0]?.cibles.reposSecondes).toBe(60)
    expect(renforcement?.exercices[1]?.cibles.reposSecondes).toBe(45)
  })

  it('recopie le jour de repos, donc la semaine proposée en garde un', () => {
    const suivante = appliquerAjustements(semaineType(), bilanAugmente(), {
      maintenant: MAINTENANT,
    })

    expect(suivante.filter((seance) => seance.type === 'repos')).toHaveLength(1)
    expect(joursDeReposSuffisants(suivante)).toBe(true)
  })

  it('remet toutes les séances à faire', () => {
    const suivante = appliquerAjustements(semaineType(), bilanAugmente(), {
      maintenant: MAINTENANT,
    })

    expect(suivante.every((seance) => seance.statut === 'a-faire')).toBe(true)
  })

  it('échange un exercice douloureux contre sa variante plus douce', () => {
    const bilan = genererBilan(
      entree({
        seancesRealisees: [
          uneSeanceRealisee({
            id: 'r1',
            seancePrevueId: 'p-mar',
            date: '2026-11-17',
            effort: 5,
            exercices: [
              {
                exerciceId: 'squat-mi-amplitude',
                ordre: 1,
                reel: { series: 2, repetitions: 10 },
                douleur: 4,
              },
            ],
          }),
          uneSeanceRealisee({
            id: 'r2',
            seancePrevueId: 'p-lun',
            date: '2026-11-18',
            effort: 5,
            exercices: [
              {
                exerciceId: 'squat-mi-amplitude',
                ordre: 1,
                reel: { series: 2, repetitions: 10 },
                douleur: 3,
              },
            ],
          }),
        ],
      }),
    )

    expect(remplacementsProposes(bilan).get('squat-mi-amplitude')).toBe('squat-sur-chaise')

    const semaine = [
      uneSeancePrevue({
        id: 'p1',
        exercices: [
          { exerciceId: 'squat-mi-amplitude', ordre: 1, cibles: { series: 2, repetitions: 10 } },
        ],
      }),
    ]
    const suivante = appliquerAjustements(semaine, bilan, { maintenant: MAINTENANT })

    expect(suivante[0]?.exercices[0]?.exerciceId).toBe('squat-sur-chaise')
    // Les cibles suivent l'exercice : une variante plus douce est déjà un allègement.
    expect(suivante[0]?.exercices[0]?.cibles.repetitions).toBe(10)
  })

  it('réduit la charge quand le bilan le demande', () => {
    const bilan = genererBilan(
      entree({
        seancesRealisees: [
          uneSeanceRealisee({ id: 'r1', seancePrevueId: 'p-lun', date: '2026-11-16', effort: 9 }),
        ],
      }),
    )

    expect(ajustementGlobal(bilan)?.facteur).toBe(0.8)

    const suivante = appliquerAjustements(semaineType(), bilan, { maintenant: MAINTENANT })
    const marche = suivante.find((seance) => seance.type === 'marche')

    expect(marche?.exercices[0]?.cibles.dureeMinutes).toBe(24)
  })

  it('ne change rien quand la charge est maintenue', () => {
    const bilan = unBilan({
      ajustements: [
        { regle: 'maintenir', levier: 'duree', facteur: 1, explication: 'Charge maintenue.' },
      ],
    })

    const suivante = appliquerAjustements(semaineType(), bilan, { maintenant: MAINTENANT })
    const marche = suivante.find((seance) => seance.type === 'marche')

    expect(marche?.exercices[0]?.cibles.dureeMinutes).toBe(30)
  })

  it('laisse de côté les séances annulées ou remplacées', () => {
    const semaine = [
      uneSeancePrevue({ id: 'p1' }),
      uneSeancePrevue({ id: 'p2', date: '2026-11-17', statut: 'annulee' }),
      uneSeancePrevue({ id: 'p3', date: '2026-11-18', statut: 'remplacee' }),
    ]

    const suivante = appliquerAjustements(semaine, bilanAugmente(), { maintenant: MAINTENANT })

    expect(suivante).toHaveLength(1)
  })

  it('tient le plafond de 10 % même si le bilan porte un facteur aberrant', () => {
    // Un bilan bricolé à la main ne doit pas pouvoir faire sauter le
    // garde-fou du chapitre 10.
    const bilanTordu = unBilan({
      ajustements: [
        { regle: 'augmenter', levier: 'duree', facteur: 3, explication: 'Facteur aberrant.' },
      ],
    })

    const suivante = appliquerAjustements(semaineType(), bilanTordu, {
      maintenant: MAINTENANT,
    })
    const marche = suivante.find((seance) => seance.type === 'marche')

    expect(marche?.exercices[0]?.cibles.dureeMinutes).toBe(33)
  })
})

describe('joursDeReposSuffisants', () => {
  it('accepte une semaine à six jours d’entraînement', () => {
    const seances = [
      '2026-11-16',
      '2026-11-17',
      '2026-11-18',
      '2026-11-19',
      '2026-11-20',
      '2026-11-21',
    ].map((date, index) => uneSeancePrevue({ id: 'p' + String(index), date }))

    expect(joursDeReposSuffisants(seances)).toBe(true)
  })

  it('refuse une semaine sans aucun jour libre', () => {
    const seances = [
      '2026-11-16',
      '2026-11-17',
      '2026-11-18',
      '2026-11-19',
      '2026-11-20',
      '2026-11-21',
      '2026-11-22',
    ].map((date, index) => uneSeancePrevue({ id: 'p' + String(index), date }))

    expect(joursDeReposSuffisants(seances)).toBe(false)
  })

  it('compte une séance de type repos comme un jour libre', () => {
    const seances = [
      '2026-11-16',
      '2026-11-17',
      '2026-11-18',
      '2026-11-19',
      '2026-11-20',
      '2026-11-21',
    ].map((date, index) => uneSeancePrevue({ id: 'p' + String(index), date }))
    seances.push(
      uneSeancePrevue({ id: 'repos', date: '2026-11-22', type: 'repos', exercices: [] }),
    )

    expect(joursDeReposSuffisants(seances)).toBe(true)
  })

  it('ne compte pas deux séances du même jour comme deux jours', () => {
    const seances = [
      uneSeancePrevue({ id: 'p1', date: '2026-11-16' }),
      uneSeancePrevue({ id: 'p2', date: '2026-11-16' }),
    ]

    expect(joursDeReposSuffisants(seances, CONFIG_PROGRESSION)).toBe(true)
  })
})
