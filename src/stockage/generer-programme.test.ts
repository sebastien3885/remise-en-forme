import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { bibliothequeInitiale } from '../domaine/exercices/bibliotheque'
import { profilParDefaut } from '../domaine/profil/profil-par-defaut'
import { baseDeTest } from '../tests/base-de-test'
import type { BaseForme } from './db'
import { genererEtInstallerProgramme } from './generer-programme'
import { creerDepots, type Depots } from './index'
import { validerSeance } from './valider-seance'

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

  it('numérote la regénération, au lieu d’un second « version 1 »', async () => {
    // Sans numéro qui avance, deux programmes portent la même version et
    // l'historique ne sait plus lequel a remplacé l'autre — ni les réglages
    // quoi afficher.
    const premier = await genererEtInstallerProgramme({ base, depots, maintenant: MAINTENANT })
    const second = await genererEtInstallerProgramme({ base, depots, maintenant: MAINTENANT })

    if (!premier.genere || !second.genere) throw new Error('génération attendue')

    expect(premier.resultat.programme.version).toBe(1)
    expect(premier.resultat.programme.motifRevision).toBe('programme initial')

    expect(second.resultat.programme.version).toBe(2)
    expect(second.resultat.programme.motifRevision).toMatch(/régénéré/)

    expect((await depots.programmes.actif())?.version).toBe(2)
  })

  it('remplace le prévu de l’ancienne version, au lieu de s’y ajouter', async () => {
    // Sans cela, deux séances se posaient sur le même jour et l'écran
    // affichait la plus ancienne : régénérer semblait ne rien faire.
    const premier = await genererEtInstallerProgramme({ base, depots, maintenant: MAINTENANT })
    if (!premier.genere) throw new Error('génération attendue')

    await genererEtInstallerProgramme({ base, depots, maintenant: MAINTENANT })

    const anciennes = await depots.seances.prevues.parProgramme(
      premier.resultat.programme.id,
    )

    // Rien n'est effacé (chapitre 7) : tout est là, mais marqué remplacé.
    expect(anciennes).toHaveLength(12 * 7)
    expect(anciennes.every((seance) => seance.statut === 'remplacee')).toBe(true)
    expect(anciennes.every((seance) => seance.remplaceeParId !== undefined)).toBe(true)

    // Et il ne reste qu'une séance visible par jour.
    const unJour = await depots.seances.prevues.parDate('2026-11-16')
    expect(
      unJour.filter((seance) => seance.statut !== 'remplacee' && seance.statut !== 'annulee'),
    ).toHaveLength(1)
  })

  it('ne replanifie pas un jour déjà vécu', async () => {
    const premier = await genererEtInstallerProgramme({ base, depots, maintenant: MAINTENANT })
    if (!premier.genere) throw new Error('génération attendue')

    const lundi = (await depots.seances.prevues.parDate('2026-11-16')).find(
      (seance) => seance.type !== 'repos',
    )
    if (!lundi) throw new Error('séance attendue')

    await validerSeance(
      {
        date: lundi.date,
        prevue: lundi,
        type: lundi.type,
        titre: lundi.titre,
        statut: 'faite',
        exercices: lundi.exercices.map((exercice) => ({
          exerciceId: exercice.exerciceId,
          ordre: exercice.ordre,
          reel: exercice.cibles,
        })),
        effort: 5,
        energie: 7,
        douleurs: [],
      },
      { base, depots, maintenant: MAINTENANT },
    )

    await genererEtInstallerProgramme({ base, depots, maintenant: MAINTENANT })

    const duJour = await depots.seances.prevues.parDate('2026-11-16')
    const vivantes = duJour.filter((seance) => seance.statut !== 'remplacee')

    // La séance vécue garde sa place — son réalisé pointe dessus — et la
    // nouvelle version n'en pose pas d'autre ce jour-là.
    expect(vivantes).toHaveLength(1)
    expect(vivantes[0]?.id).toBe(lundi.id)
    expect(vivantes[0]?.programmeId).toBe(premier.resultat.programme.id)
  })

  it('tient compte du niveau de départ déclaré', async () => {
    // Le cœur du questionnaire : ce qui est déclaré dimensionne les séances.
    await depots.profil.modifier(
      { niveauDepart: { marcheConfortableMetres: 1600, pompesPossibles: 5 } },
      MAINTENANT,
    )

    const resultat = await genererEtInstallerProgramme({ base, depots, maintenant: MAINTENANT })
    if (!resultat.genere) throw new Error('génération attendue')

    const marche = resultat.resultat.seances.find((seance) => seance.type === 'marche')
    const renforcement = resultat.resultat.seances.find(
      (seance) => seance.type === 'renforcement',
    )

    // 1 600 m à 80 m par minute font 20 minutes, pas les 30 par défaut.
    expect(marche?.exercices[0]?.cibles.dureeMinutes).toBe(20)
    // 60 % de 5 pompes, planchonné à 5 : deux séries de 5 au lieu de 8.
    expect(
      renforcement?.exercices.find((exercice) => exercice.exerciceId === 'pompes-contre-mur')
        ?.cibles.repetitions,
    ).toBe(5)
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
