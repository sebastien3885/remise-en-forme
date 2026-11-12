import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { bibliothequeInitiale } from '../domaine/exercices/bibliotheque'
import { profilParDefaut } from '../domaine/profil/profil-par-defaut'
import { baseDeTest } from '../tests/base-de-test'
import type { BaseForme } from './db'
import { exporterAgenda } from './exporter-agenda'
import { genererEtInstallerProgramme } from './generer-programme'
import { creerDepots, type Depots } from './index'
import { annulerSeance } from './modifier-seance'
import { validerSeance } from './valider-seance'

const LUNDI = '2026-11-16'
const MAINTENANT = new Date('2026-11-16T07:00:00.000Z')

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
    profilParDefaut({ dateDebut: LUNDI, maintenant: MAINTENANT }),
    MAINTENANT,
  )
  await genererEtInstallerProgramme({ base, depots, maintenant: MAINTENANT })
})

afterEach(async () => {
  await fermer()
})

function exporter() {
  return exporterAgenda({ depots, maintenant: MAINTENANT, depuis: LUNDI })
}

/** Les UID du fichier, sans le suffixe de domaine. */
function identifiants(ics: string): string[] {
  return ics
    .split('\r\n')
    .filter((ligne) => ligne.startsWith('UID:'))
    .map((ligne) => ligne.slice('UID:'.length).replace('@remise-en-forme', ''))
}

describe('exporterAgenda', () => {
  it('exporte les séances d’entraînement du programme, avec leurs exercices', async () => {
    const resultat = await exporter()

    expect(resultat.evenements).toBeGreaterThan(0)
    expect(resultat.nomDeFichier).toBe('remise-en-forme-seances-2026-11-16.ics')
    expect(resultat.premiere).toBe(LUNDI)
    // Le détail nomme les exercices, pas leurs identifiants.
    expect(resultat.ics).toContain('DESCRIPTION:')
    expect(resultat.ics).not.toContain('Exercice inconnu')
  })

  it('laisse les jours de repos hors de l’agenda', async () => {
    const programme = await depots.programmes.actif()
    const toutes = await depots.seances.prevues.parProgramme(programme!.id)
    const repos = toutes.filter((seance) => seance.type === 'repos')

    const resultat = await exporter()

    // Le programme en contient — au moins un par semaine (chapitre 10).
    expect(repos.length).toBeGreaterThan(0)
    for (const jour of repos) {
      expect(identifiants(resultat.ics)).not.toContain(jour.id)
    }
  })

  it('oublie une séance déjà faite : c’est le réalisé qui fait foi', async () => {
    const programme = await depots.programmes.actif()
    const semaine = await depots.seances.prevues.parSemaine(programme!.id, 1)
    const prevue = semaine.find((seance) => seance.type !== 'repos')!

    const avant = await exporter()
    expect(identifiants(avant.ics)).toContain(prevue.id)

    await validerSeance(
      {
        date: prevue.date,
        prevue,
        type: prevue.type,
        titre: prevue.titre,
        statut: 'faite',
        exercices: prevue.exercices.map((exercice) => ({
          exerciceId: exercice.exerciceId,
          ordre: exercice.ordre,
          reel: exercice.cibles,
        })),
        effort: 6,
        energie: 7,
        douleurs: [],
      },
      { base, depots, maintenant: MAINTENANT },
    )

    const apres = await exporter()
    expect(identifiants(apres.ics)).not.toContain(prevue.id)
    expect(apres.evenements).toBe(avant.evenements - 1)
  })

  it('oublie une séance annulée', async () => {
    const programme = await depots.programmes.actif()
    const semaine = await depots.seances.prevues.parSemaine(programme!.id, 1)
    const prevue = semaine.find((seance) => seance.type !== 'repos')!

    const annulation = await annulerSeance(prevue.id, { base, depots })
    expect(annulation.annulee).toBe(true)

    const resultat = await exporter()
    expect(identifiants(resultat.ics)).not.toContain(prevue.id)
  })

  it('ne rappelle pas le passé', async () => {
    const programme = await depots.programmes.actif()

    // Trois semaines plus tard : tout le début du programme est derrière.
    const resultat = await exporterAgenda({
      depots,
      maintenant: new Date('2026-12-07T07:00:00.000Z'),
    })

    expect(programme).toBeDefined()
    expect(resultat.premiere === undefined || resultat.premiere >= '2026-12-07').toBe(true)
  })

  it('rend un calendrier vide mais valide quand il n’y a rien devant', async () => {
    const resultat = await exporterAgenda({
      depots,
      maintenant: new Date('2030-01-01T07:00:00.000Z'),
    })

    expect(resultat.evenements).toBe(0)
    expect(resultat.premiere).toBeUndefined()
    expect(resultat.ics).toContain('BEGIN:VCALENDAR')
    expect(resultat.ics).not.toContain('BEGIN:VEVENT')
  })

  it('range les séances par date croissante', async () => {
    const resultat = await exporter()
    const dates = resultat.ics
      .split('\r\n')
      .filter((ligne) => ligne.startsWith('DTSTART;VALUE=DATE:'))
      .map((ligne) => ligne.slice('DTSTART;VALUE=DATE:'.length))

    expect(dates).toEqual([...dates].sort())
    expect(dates.at(-1)).toBe(resultat.derniere?.split('-').join(''))
  })
})
