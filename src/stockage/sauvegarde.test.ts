/**
 * Critère d'acceptation de l'étape 5 : « export puis import restituent
 * exactement les mêmes données ».
 *
 * Le test de fond est l'aller-retour : on remplit la base avec un état
 * complet — photo de repas comprise — on exporte en texte, on efface tout, on
 * relit le texte, et on compare table par table.
 */
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { bibliothequeInitiale } from '../domaine/exercices/bibliotheque'
import { profilParDefaut } from '../domaine/profil/profil-par-defaut'
import {
  analyserSauvegarde,
  analyserTexteSauvegarde,
  apercuDeLaSauvegarde,
  nomDeFichier,
} from '../domaine/sauvegarde/sauvegarde'
import { baseDeTest } from '../tests/base-de-test'
import { unBilanDeProgression, uneHydratation, uneMesure, unRepas } from '../tests/fixtures'
import { genererEtInstallerProgramme } from './generer-programme'
import type { BaseForme } from './db'
import { creerDepots, type Depots } from './index'
import { exporterEnTexte, exporterTout, importerTout } from './sauvegarde'
import { validerSeance } from './valider-seance'

const MAINTENANT = new Date('2026-11-22T20:00:00.000Z')
const LUNDI = '2026-11-16'

let base: BaseForme
let depots: Depots
let fermer: () => Promise<void>

/** Une photo minuscule mais réelle, pour que l'encodage soit vraiment testé. */
const PHOTO = new Blob([new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10, 0, 255])], {
  type: 'image/png',
})

beforeEach(async () => {
  const ouverte = await baseDeTest()
  base = ouverte.base
  fermer = ouverte.fermer
  depots = creerDepots(base)
})

afterEach(async () => {
  await fermer()
})

/** Remplit la base d'un état complet : les neuf tables sont servies. */
async function remplirLaBase() {
  await depots.exercices.enregistrerPlusieurs(bibliothequeInitiale(MAINTENANT))
  await depots.profil.enregistrer(
    profilParDefaut({ dateDebut: LUNDI, maintenant: MAINTENANT }),
    MAINTENANT,
  )
  await genererEtInstallerProgramme({ base, depots, maintenant: MAINTENANT })

  const programme = await depots.programmes.actif()
  const premiere = (await depots.seances.prevues.parSemaine(programme!.id, 1)).find(
    (seance) => seance.type !== 'repos',
  )!

  await validerSeance(
    {
      date: premiere.date,
      prevue: premiere,
      type: premiere.type,
      titre: premiere.titre,
      statut: 'faite',
      exercices: premiere.exercices.map((exercice) => ({
        exerciceId: exercice.exerciceId,
        ordre: exercice.ordre,
        reel: exercice.cibles,
      })),
      effort: 5,
      energie: 7,
      douleurs: [{ zone: 'genou', intensite: 2 }],
      note: 'Vent de face.',
    },
    { base, depots, maintenant: MAINTENANT },
  )

  await depots.bilans.enregistrer(unBilanDeProgression({ programmeId: programme!.id }))
  await depots.repas.enregistrer(
    unRepas({ id: 'repas-photo', date: LUNDI, moment: 'dejeuner', photo: PHOTO }),
  )
  await depots.repas.enregistrer(unRepas({ id: 'repas-simple', date: LUNDI, moment: 'diner' }))
  await depots.hydratation.enregistrer(uneHydratation({ date: LUNDI, verres: 6 }))
  await depots.mesures.enregistrer(uneMesure({ id: 'm1', date: LUNDI, poidsKg: 92 }))
}

async function etatComplet() {
  return {
    profil: await base.profil.toArray(),
    exercices: await base.exercices.toArray(),
    programmes: await base.programmes.toArray(),
    seancesPrevues: await base.seancesPrevues.toArray(),
    seancesRealisees: await base.seancesRealisees.toArray(),
    bilans: await base.bilans.toArray(),
    hydratation: await base.hydratation.toArray(),
    mesures: await base.mesures.toArray(),
  }
}

describe('aller-retour export puis import', () => {
  it('restitue exactement les mêmes données', async () => {
    await remplirLaBase()
    const avant = await etatComplet()

    const texte = await exporterEnTexte({ base, maintenant: MAINTENANT })

    await Promise.all(base.tables.map((table) => table.clear()))
    expect(await base.exercices.count()).toBe(0)

    const analyse = analyserTexteSauvegarde(texte)
    expect(analyse.valide).toBe(true)
    if (!analyse.valide) return

    await importerTout(analyse.sauvegarde, { base })

    expect(await etatComplet()).toEqual(avant)
  })

  it('rend la photo d’un repas intacte, octet pour octet', async () => {
    // Le piège : un Blob ne traverse pas JSON.stringify. Sans encodage, la
    // sauvegarde perdrait les photos sans rien dire.
    await remplirLaBase()

    const texte = await exporterEnTexte({ base, maintenant: MAINTENANT })
    await Promise.all(base.tables.map((table) => table.clear()))

    const analyse = analyserTexteSauvegarde(texte)
    if (!analyse.valide) throw new Error('sauvegarde invalide')
    await importerTout(analyse.sauvegarde, { base })

    const relu = await depots.repas.parId('repas-photo')
    expect(relu?.photo).toBeInstanceOf(Blob)
    expect(relu?.photo?.type).toBe('image/png')

    const octets = new Uint8Array(await relu!.photo!.arrayBuffer())
    expect([...octets]).toEqual([137, 80, 78, 71, 13, 10, 26, 10, 0, 255])
  })

  it('laisse les repas sans photo sans photo', async () => {
    await remplirLaBase()
    const sauvegarde = await exporterTout({ base, maintenant: MAINTENANT })

    const simple = sauvegarde.repas.find((repas) => repas.id === 'repas-simple')
    expect(simple?.photo).toBeUndefined()
  })

  it('remplace les données existantes au lieu de les fusionner', async () => {
    await remplirLaBase()
    const sauvegarde = await exporterTout({ base, maintenant: MAINTENANT })

    // Une deuxième base de données, qu'on écrase avec la sauvegarde.
    await depots.repas.enregistrer(
      unRepas({ id: 'intrus', date: '2026-12-01', moment: 'collation' }),
    )
    expect(await depots.repas.compter()).toBe(3)

    await importerTout(sauvegarde, { base })

    expect(await depots.repas.compter()).toBe(2)
    expect(await depots.repas.parId('intrus')).toBeUndefined()
  })

  it('restitue une base vide sans erreur', async () => {
    const sauvegarde = await exporterTout({ base, maintenant: MAINTENANT })

    expect(sauvegarde.profil).toBeNull()
    const resultat = await importerTout(sauvegarde, { base })

    expect(resultat.profilRestaure).toBe(false)
    expect(await base.exercices.count()).toBe(0)
  })
})

describe('contrôle du fichier', () => {
  it('refuse un JSON qui n’est pas une sauvegarde', async () => {
    const resultat = analyserSauvegarde({ exercices: [] })

    expect(resultat.valide).toBe(false)
    if (resultat.valide) return
    expect(resultat.erreurs.map((erreur) => erreur.chemin)).toContain('format')
  })

  it('refuse un fichier illisible', () => {
    const resultat = analyserTexteSauvegarde('{ pas du json')

    expect(resultat.valide).toBe(false)
    if (resultat.valide) return
    expect(resultat.erreurs[0]?.chemin).toBe('fichier')
  })

  it('refuse une sauvegarde abîmée plutôt que de l’écrire à moitié', async () => {
    await remplirLaBase()
    const sauvegarde = await exporterTout({ base, maintenant: MAINTENANT })

    const abimee = {
      ...sauvegarde,
      seancesRealisees: [{ ...sauvegarde.seancesRealisees[0], effort: 42 }],
    }

    expect(analyserSauvegarde(abimee).valide).toBe(false)
  })

  it('refuse une version de format inconnue', async () => {
    await remplirLaBase()
    const sauvegarde = await exporterTout({ base, maintenant: MAINTENANT })

    expect(analyserSauvegarde({ ...sauvegarde, version: 2 }).valide).toBe(false)
  })
})

describe('aperçu avant import', () => {
  it('résume ce que le fichier contient', async () => {
    await remplirLaBase()
    const sauvegarde = await exporterTout({ base, maintenant: MAINTENANT })

    const apercu = apercuDeLaSauvegarde(sauvegarde)

    expect(apercu.aUnProfil).toBe(true)
    expect(apercu.exercices).toBe(33)
    expect(apercu.seancesPrevues).toBe(7 * 12)
    expect(apercu.seancesRealisees).toBe(1)
    expect(apercu.repas).toBe(2)
    expect(apercu.photos).toBe(1)
    expect(apercu.mesures).toBe(1)
    expect(apercu.premiereSeance).toBe(LUNDI)
  })
})

describe('nom du fichier', () => {
  it('est lisible et triable', () => {
    expect(nomDeFichier('2026-11-22T20:05:00.000Z')).toBe(
      'remise-en-forme-2026-11-22-20h05.json',
    )
  })
})
