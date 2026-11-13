import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { statistiquesDeLaSemaine } from '../domaine/progression/bilan'
import { baseDeTest } from '../tests/base-de-test'
import { uneSeancePrevue } from '../tests/fixtures'
import type { BaseForme } from './db'
import { creerDepots, type Depots } from './index'
import { annulerValidation, validerSeance } from './valider-seance'

const MAINTENANT = new Date('2026-11-16T19:00:00.000Z')

let base: BaseForme
let depots: Depots
let fermer: () => Promise<void>

const prevue = uneSeancePrevue({
  id: 'prevue-lundi',
  date: '2026-11-16',
  titre: 'Marche rapide 30 min',
  exercices: [{ exerciceId: 'marche-rapide', ordre: 1, cibles: { dureeMinutes: 30 } }],
})

beforeEach(async () => {
  const ouverte = await baseDeTest()
  base = ouverte.base
  fermer = ouverte.fermer
  depots = creerDepots(base)
  await depots.seances.prevues.enregistrer(prevue)
})

afterEach(async () => {
  await fermer()
})

function saisieFaite(modifications: Record<string, unknown> = {}) {
  return {
    date: '2026-11-16',
    prevue,
    type: 'marche' as const,
    titre: prevue.titre,
    statut: 'faite' as const,
    exercices: [{ exerciceId: 'marche-rapide', ordre: 1, reel: { dureeMinutes: 28 } }],
    effort: 5,
    energie: 7,
    douleurs: [],
    ...modifications,
  }
}

describe('validerSeance', () => {
  it('enregistre le réalisé et le relie à la séance prévue', async () => {
    const realisee = await validerSeance(saisieFaite(), {
      base,
      depots,
      maintenant: MAINTENANT,
    })

    expect(realisee.seancePrevueId).toBe('prevue-lundi')
    expect(realisee.statut).toBe('faite')
    expect(realisee.exercices[0]?.reel).toEqual({ dureeMinutes: 28 })
    expect(realisee.saisieLe).toBe('2026-11-16T19:00:00.000Z')

    const relue = await depots.seances.realisees.pourSeancePrevue('prevue-lundi')
    expect(relue?.id).toBe(realisee.id)
  })

  it('ne touche pas à la séance prévue', async () => {
    await validerSeance(saisieFaite(), { base, depots, maintenant: MAINTENANT })

    const toujoursPrevue = await depots.seances.prevues.parId('prevue-lundi')
    expect(toujoursPrevue?.exercices[0]?.cibles).toEqual({ dureeMinutes: 30 })
    expect(toujoursPrevue?.statut).toBe('a-faire')
  })

  it('valider deux fois corrige, au lieu de créer un doublon', async () => {
    // Le piège : une hésitation du pouce au bord du bassin ferait compter
    // deux séances au moteur.
    const premiere = await validerSeance(saisieFaite({ effort: 5 }), {
      base,
      depots,
      maintenant: MAINTENANT,
    })
    const seconde = await validerSeance(saisieFaite({ effort: 8 }), {
      base,
      depots,
      maintenant: MAINTENANT,
    })

    expect(seconde.id).toBe(premiere.id)
    expect(await depots.seances.realisees.compter()).toBe(1)
    expect((await depots.seances.realisees.parId(premiere.id))?.effort).toBe(8)
  })

  it('garde le motif, la note et la douleur', async () => {
    const realisee = await validerSeance(
      saisieFaite({
        statut: 'partielle',
        motif: 'fatigue',
        note: 'Vent de face tout le long.',
        douleurs: [{ zone: 'genou', intensite: 3 }],
        exercices: [
          { exerciceId: 'marche-rapide', ordre: 1, reel: { dureeMinutes: 15 }, douleur: 3 },
        ],
      }),
      { base, depots, maintenant: MAINTENANT },
    )

    expect(realisee.motif).toBe('fatigue')
    expect(realisee.note).toBe('Vent de face tout le long.')
    expect(realisee.douleurs).toEqual([{ zone: 'genou', intensite: 3 }])
    expect(realisee.exercices[0]?.douleur).toBe(3)
  })

  it('garde le sommeil déclaré, et n’en invente pas', async () => {
    const avec = await validerSeance(saisieFaite({ heuresSommeil: 7 }), {
      base,
      depots,
      maintenant: MAINTENANT,
    })
    expect(avec.heuresSommeil).toBe(7)

    // Facultatif : une nuit qu'on ne sait pas chiffrer reste absente, elle ne
    // devient pas un zéro que le journal prendrait pour une nuit blanche.
    const sans = await validerSeance(saisieFaite({}), {
      base,
      depots,
      maintenant: MAINTENANT,
    })
    expect(sans.heuresSommeil).toBeUndefined()
  })

  it('n’invente ni effort ni énergie pour une séance sautée', async () => {
    const realisee = await validerSeance(
      {
        date: '2026-11-16',
        prevue,
        type: 'marche',
        titre: prevue.titre,
        statut: 'sautee',
        motif: 'meteo',
        exercices: [],
        douleurs: [],
      },
      { base, depots, maintenant: MAINTENANT },
    )

    expect(realisee.effort).toBeUndefined()
    expect(realisee.energie).toBeUndefined()
    expect(realisee.motif).toBe('meteo')
  })

  it('retrouve une séance improvisée par sa date et son titre', async () => {
    const improvisee = {
      date: '2026-11-17',
      type: 'velo' as const,
      titre: 'Balade à vélo',
      statut: 'faite' as const,
      exercices: [],
      effort: 4,
      energie: 8,
      douleurs: [],
    }

    const premiere = await validerSeance(improvisee, { base, depots, maintenant: MAINTENANT })
    const corrigee = await validerSeance(
      { ...improvisee, effort: 6 },
      { base, depots, maintenant: MAINTENANT },
    )

    expect(corrigee.id).toBe(premiere.id)
    expect(corrigee.seancePrevueId).toBeUndefined()
    expect(await depots.seances.realisees.compter()).toBe(1)
  })
})

describe('annulerValidation', () => {
  it('retire le réalisé et laisse le prévu à faire', async () => {
    const realisee = await validerSeance(saisieFaite(), {
      base,
      depots,
      maintenant: MAINTENANT,
    })

    await annulerValidation(realisee.id, { base, depots })

    expect(await depots.seances.realisees.compter()).toBe(0)
    expect((await depots.seances.prevues.parId('prevue-lundi'))?.statut).toBe('a-faire')
  })
})

describe('une séance sautée ne fausse pas les moyennes', () => {
  it('reste hors du calcul de l’effort moyen', async () => {
    await validerSeance(saisieFaite({ effort: 4, energie: 8 }), {
      base,
      depots,
      maintenant: MAINTENANT,
    })
    await validerSeance(
      {
        date: '2026-11-18',
        type: 'marche',
        titre: 'Marche rapide 30 min',
        statut: 'sautee',
        exercices: [],
        douleurs: [],
      },
      { base, depots, maintenant: MAINTENANT },
    )

    const realisees = await depots.seances.realisees.parPlage('2026-11-16', '2026-11-22')
    const statistiques = statistiquesDeLaSemaine({
      semaine: 1,
      debut: '2026-11-16',
      fin: '2026-11-22',
      seancesPrevues: [prevue],
      seancesRealisees: realisees,
    })

    expect(statistiques.seancesSautees).toBe(1)
    expect(statistiques.effortMoyen).toBe(4)
    expect(statistiques.energieMoyenne).toBe(8)
  })
})
