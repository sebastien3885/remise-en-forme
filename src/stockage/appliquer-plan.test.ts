import { readFileSync } from 'node:fs'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { bibliothequeInitiale } from '../domaine/exercices/bibliotheque'
import { analyserPlan, type PlanImporte } from '../domaine/plans'
import { profilParDefaut } from '../domaine/profil/profil-par-defaut'
import { baseDeTest } from '../tests/base-de-test'
import { appliquerPlan, preparerApercu } from './appliquer-plan'
import type { BaseForme } from './db'
import { creerDepots, type Depots } from './index'

const MAINTENANT = new Date('2026-11-14T10:00:00.000Z')

function planDExemple(nom = 'exemple-plan.json'): PlanImporte {
  const chemin = new URL('../../data/plans/' + nom, import.meta.url)
  const resultat = analyserPlan(JSON.parse(readFileSync(chemin, 'utf8')))
  if (!resultat.valide) throw new Error('exemple invalide : ' + JSON.stringify(resultat.erreurs))
  return resultat.plan
}

function planQuiReferenceUnFantome(): PlanImporte {
  const resultat = analyserPlan({
    format: 'plan-remise-en-forme',
    version: 1,
    nom: 'Plan cassé',
    dateDebut: '2026-11-16',
    exercices: [],
    seances: [
      {
        date: '2026-11-16',
        type: 'marche',
        titre: 'Marche',
        exercices: [{ exerciceId: 'exercice-fantome', cibles: { dureeMinutes: 30 } }],
      },
    ],
  })
  if (!resultat.valide) throw new Error('plan de test invalide')
  return resultat.plan
}

let base: BaseForme
let depots: Depots
let fermer: () => Promise<void>

beforeEach(async () => {
  const ouverte = await baseDeTest()
  base = ouverte.base
  fermer = ouverte.fermer
  depots = creerDepots(base)

  // État de départ réaliste : bibliothèque et profil déjà en place.
  await depots.exercices.enregistrerPlusieurs(bibliothequeInitiale(MAINTENANT))
  await depots.profil.enregistrer(profilParDefaut({ maintenant: MAINTENANT }), MAINTENANT)
})

afterEach(async () => {
  await fermer()
})

describe('preparerApercu', () => {
  it('s’appuie sur la bibliothèque et le profil réellement enregistrés', async () => {
    const apercu = await preparerApercu(planDExemple(), depots)

    expect(apercu.applicable).toBe(true)
    expect(apercu.nombreSeances).toBe(24)
    expect(apercu.exercicesNouveaux).toEqual([])
  })

  it('refuse le plan si la bibliothèque ne contient pas l’exercice attendu', async () => {
    await depots.exercices.effacerTout()

    const apercu = await preparerApercu(planDExemple(), depots)

    expect(apercu.applicable).toBe(false)
    expect(apercu.erreurs.length).toBeGreaterThan(0)
  })
})

describe('appliquerPlan en mode remplacement', () => {
  it('écrit le programme, ses séances, et le rend actif', async () => {
    const resultat = await appliquerPlan(planDExemple(), {
      mode: 'remplacer',
      base,
      depots,
      maintenant: MAINTENANT,
    })

    expect(resultat.applique).toBe(true)
    expect(resultat.seancesEcrites).toBe(28)

    const actif = await depots.programmes.actif()
    expect(actif?.id).toBe(resultat.programmeId)
    expect(actif?.version).toBe(1)
    expect(actif?.motifRevision).toMatch(/Reprise en douceur/)

    const seances = await depots.seances.prevues.parProgramme(actif!.id)
    expect(seances).toHaveLength(28)
    expect(seances[0]?.date).toBe('2026-11-16')
  })

  it('pose les séances aux bonnes semaines', async () => {
    const resultat = await appliquerPlan(planDExemple(), {
      mode: 'remplacer',
      base,
      depots,
      maintenant: MAINTENANT,
    })

    const semaine1 = await depots.seances.prevues.parSemaine(resultat.programmeId!, 1)
    const semaine4 = await depots.seances.prevues.parSemaine(resultat.programmeId!, 4)

    expect(semaine1).toHaveLength(7)
    expect(semaine4).toHaveLength(7)
    expect(semaine1.map((seance) => seance.type)).toEqual([
      'marche',
      'renforcement',
      'marche',
      'repos',
      'renforcement',
      'marche',
      'natation',
    ])
  })

  it('ajoute à la bibliothèque les exercices apportés par le plan', async () => {
    const avant = await depots.exercices.compter()

    const resultat = await appliquerPlan(planDExemple('exemple-plan-exercice-sur-mesure.json'), {
      mode: 'remplacer',
      base,
      depots,
      maintenant: MAINTENANT,
    })

    expect(resultat.applique).toBe(true)
    expect(await depots.exercices.compter()).toBe(avant + 1)

    const ajoute = await depots.exercices.parId('marche-fractionnee')
    expect(ajoute?.origine).toBe('import')
    expect(ajoute?.varianteFacileId).toBe('marche-rapide')
  })

  it('désactive l’ancien programme mais conserve ses séances', async () => {
    const premier = await appliquerPlan(planDExemple(), {
      mode: 'remplacer',
      base,
      depots,
      maintenant: MAINTENANT,
    })
    const second = await appliquerPlan(planDExemple('exemple-plan-exercice-sur-mesure.json'), {
      mode: 'remplacer',
      base,
      depots,
      maintenant: MAINTENANT,
    })

    const actif = await depots.programmes.actif()
    expect(actif?.id).toBe(second.programmeId)
    expect(actif?.version).toBe(2)

    // Jamais d'écrasement (chapitre 7) : l'ancien programme est toujours là,
    // désactivé, avec l'intégralité de ses séances.
    const ancien = await depots.programmes.parId(premier.programmeId!)
    expect(ancien?.actif).toBe(false)
    expect(await depots.seances.prevues.parProgramme(premier.programmeId!)).toHaveLength(28)
    expect(await depots.programmes.compter()).toBe(2)
  })
})

describe('appliquerPlan en mode fusion', () => {
  it('ajoute les séances au programme en cours sans créer de version', async () => {
    const premier = await appliquerPlan(planDExemple(), {
      mode: 'remplacer',
      base,
      depots,
      maintenant: MAINTENANT,
    })

    const fusion = await appliquerPlan(planDExemple('exemple-plan-exercice-sur-mesure.json'), {
      mode: 'fusionner',
      base,
      depots,
      maintenant: MAINTENANT,
    })

    expect(fusion.programmeId).toBe(premier.programmeId)
    expect(await depots.programmes.compter()).toBe(1)
    expect(await depots.seances.prevues.parProgramme(premier.programmeId!)).toHaveLength(30)
  })
})

describe('refus d’un plan incohérent', () => {
  it('n’écrit rien du tout', async () => {
    const programmesAvant = await depots.programmes.compter()
    const seancesAvant = await depots.seances.prevues.compter()

    const resultat = await appliquerPlan(planQuiReferenceUnFantome(), {
      mode: 'remplacer',
      base,
      depots,
      maintenant: MAINTENANT,
    })

    expect(resultat.applique).toBe(false)
    expect(resultat.apercu.applicable).toBe(false)
    expect(resultat.seancesEcrites).toBe(0)
    expect(await depots.programmes.compter()).toBe(programmesAvant)
    expect(await depots.seances.prevues.compter()).toBe(seancesAvant)
  })
})
