import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { bibliothequeInitiale } from '../domaine/exercices/bibliotheque'
import { profilParDefaut } from '../domaine/profil/profil-par-defaut'
import { baseDeTest } from '../tests/base-de-test'
import type { BaseForme } from './db'
import { genererEtInstallerProgramme } from './generer-programme'
import { creerDepots, type Depots } from './index'

const MAINTENANT = new Date('2026-11-12T09:00:00.000Z')

let base: BaseForme
let depots: Depots
let fermer: () => Promise<void>

beforeEach(async () => {
  const ouverte = await baseDeTest()
  base = ouverte.base
  fermer = ouverte.fermer
  depots = creerDepots(base)

  await depots.exercices.enregistrerPlusieurs(bibliothequeInitiale(MAINTENANT))
  await depots.profil.enregistrer(
    profilParDefaut({ dateDebut: '2026-11-16', maintenant: MAINTENANT }),
    MAINTENANT,
  )
})

afterEach(async () => {
  await fermer()
})

describe('génération du programme initial', () => {
  it('pose douze semaines et les rend actives', async () => {
    const resultat = await genererEtInstallerProgramme({ base, depots, maintenant: MAINTENANT })

    expect(resultat.genere).toBe(true)

    const actif = await depots.programmes.actif()
    expect(actif?.version).toBe(1)
    expect(actif?.motifRevision).toBe('programme initial')

    const seances = await depots.seances.prevues.parProgramme(actif!.id)
    expect(seances).toHaveLength(12 * 7)
  })

  it('retrouve les séances semaine par semaine', async () => {
    await genererEtInstallerProgramme({ base, depots, maintenant: MAINTENANT })
    const actif = await depots.programmes.actif()

    const semaine1 = await depots.seances.prevues.parSemaine(actif!.id, 1)
    expect(semaine1).toHaveLength(7)
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

  it('retrouve la séance du jour par sa date', async () => {
    await genererEtInstallerProgramme({ base, depots, maintenant: MAINTENANT })

    const lundi = await depots.seances.prevues.parDate('2026-11-16')
    expect(lundi).toHaveLength(1)
    expect(lundi[0]?.titre).toBe('Marche rapide 30 min')
  })

  it('désactive le programme précédent sans effacer ses séances', async () => {
    const premier = await genererEtInstallerProgramme({ base, depots, maintenant: MAINTENANT })
    const second = await genererEtInstallerProgramme({ base, depots, maintenant: MAINTENANT })

    if (!premier.genere || !second.genere) throw new Error('génération attendue')

    const ancien = await depots.programmes.parId(premier.resultat.programme.id)
    expect(ancien?.actif).toBe(false)
    expect(await depots.seances.prevues.parProgramme(ancien!.id)).toHaveLength(12 * 7)
    expect(await depots.programmes.compter()).toBe(2)
  })

  it('survit à un rechargement', async () => {
    await genererEtInstallerProgramme({ base, depots, maintenant: MAINTENANT })

    base.close()
    await base.open()

    const relus = creerDepots(base)
    expect((await relus.programmes.actif())?.motifRevision).toBe('programme initial')
    expect(await relus.seances.prevues.compter()).toBe(12 * 7)
  })
})

describe('refus de générer', () => {
  it('refuse sans profil', async () => {
    await depots.profil.effacer()

    const resultat = await genererEtInstallerProgramme({ base, depots, maintenant: MAINTENANT })

    expect(resultat).toEqual({ genere: false, raison: 'Aucun profil enregistré.' })
    expect(await depots.programmes.compter()).toBe(0)
  })

  it('refuse avec une bibliothèque vide', async () => {
    await depots.exercices.effacerTout()

    const resultat = await genererEtInstallerProgramme({ base, depots, maintenant: MAINTENANT })

    expect(resultat.genere).toBe(false)
    expect(await depots.seances.prevues.compter()).toBe(0)
  })

  it('refuse, en l’expliquant, quand les précautions ne laissent rien', async () => {
    const profil = await depots.profil.lire()
    const exclusions = (await depots.exercices.tous()).map((exercice) => exercice.id)
    await depots.profil.enregistrer(
      { ...profil!, precautions: { ...profil!.precautions, exercicesExclusIds: exclusions } },
      MAINTENANT,
    )

    const resultat = await genererEtInstallerProgramme({ base, depots, maintenant: MAINTENANT })

    expect(resultat.genere).toBe(false)
    if (resultat.genere) return
    expect(resultat.raison).toMatch(/aucun exercice disponible/)
    expect(await depots.programmes.compter()).toBe(0)
  })
})
