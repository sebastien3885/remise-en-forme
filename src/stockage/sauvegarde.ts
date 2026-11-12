/**
 * Export et import de toutes les données (chapitre 9).
 *
 * « L'export JSON régulier sert de sauvegarde » : c'est le seul filet de
 * l'application, puisque effacer les données du navigateur les supprime. Le
 * critère d'acceptation de l'étape 5 est donc exigeant — « export puis import
 * restituent exactement les mêmes données » — et c'est ce que vérifie le test
 * d'aller-retour.
 *
 * Deux points de mécanique :
 *
 * - **Les photos traversent en texte.** Un `Blob` ne survit pas à `JSON.stringify` :
 *   il devient une URL de données à l'export, et redevient un `Blob` à
 *   l'import. Sans cela la sauvegarde perdrait les photos sans rien dire.
 * - **L'import remplace tout, en une transaction.** Pas de fusion : deux jeux
 *   de données mélangés donneraient des programmes concurrents et des séances
 *   en double. Si une écriture échoue, aucune ne passe.
 */
import { maintenantIso } from '../domaine/dates'
import type { Repas } from '../domaine/entites'
import { csvDesSeances, csvDuJournal } from '../domaine/sauvegarde/csv'
import {
  MARQUEUR_SAUVEGARDE,
  VERSION_SAUVEGARDE,
  type RepasSerialise,
  type Sauvegarde,
} from '../domaine/sauvegarde/schema'
import { db, type BaseForme } from './db'

async function blobVersDataUrl(blob: Blob): Promise<string> {
  const octets = new Uint8Array(await blob.arrayBuffer())
  let binaire = ''
  for (const octet of octets) binaire += String.fromCharCode(octet)
  return 'data:' + (blob.type || 'application/octet-stream') + ';base64,' + btoa(binaire)
}

function dataUrlVersBlob(url: string): Blob {
  const separateur = url.indexOf(',')
  const entete = url.slice(0, separateur)
  const donnees = url.slice(separateur + 1)
  const type = /^data:([^;]+)/.exec(entete)?.[1] ?? 'application/octet-stream'

  const binaire = atob(donnees)
  const octets = new Uint8Array(binaire.length)
  for (let index = 0; index < binaire.length; index += 1) {
    octets[index] = binaire.charCodeAt(index)
  }
  return new Blob([octets], { type })
}

async function serialiserRepas(repas: Repas): Promise<RepasSerialise> {
  const { photo, ...reste } = repas
  return {
    ...reste,
    ...(photo ? { photo: await blobVersDataUrl(photo) } : {}),
  }
}

function deserialiserRepas(repas: RepasSerialise): Repas {
  const { photo, ...reste } = repas
  return {
    ...reste,
    ...(photo ? { photo: dataUrlVersBlob(photo) } : {}),
  }
}

export interface OptionsSauvegarde {
  base?: BaseForme
  maintenant?: Date
}

/** Rassemble tout ce qui est en base dans un objet sérialisable. */
export async function exporterTout(options: OptionsSauvegarde = {}): Promise<Sauvegarde> {
  const base = options.base ?? db
  const maintenant = options.maintenant ?? new Date()

  const [
    profils,
    exercices,
    programmes,
    seancesPrevues,
    seancesRealisees,
    bilans,
    repas,
    hydratation,
    mesures,
  ] = await Promise.all([
    base.profil.toArray(),
    base.exercices.toArray(),
    base.programmes.toArray(),
    base.seancesPrevues.toArray(),
    base.seancesRealisees.toArray(),
    base.bilans.toArray(),
    base.repas.toArray(),
    base.hydratation.toArray(),
    base.mesures.toArray(),
  ])

  return {
    format: MARQUEUR_SAUVEGARDE,
    version: VERSION_SAUVEGARDE,
    exporteeLe: maintenantIso(maintenant),
    profil: profils[0] ?? null,
    exercices,
    programmes,
    seancesPrevues,
    seancesRealisees,
    bilans,
    repas: await Promise.all(repas.map(serialiserRepas)),
    hydratation,
    mesures,
  }
}

/** Le texte du fichier, prêt à être enregistré. */
export async function exporterEnTexte(options: OptionsSauvegarde = {}): Promise<string> {
  return JSON.stringify(await exporterTout(options), null, 2)
}

/** Le CSV des séances réalisées, prêt à ouvrir dans un tableur. */
export async function exporterCsvDesSeances(options: OptionsSauvegarde = {}): Promise<string> {
  const base = options.base ?? db
  const [seances, bibliotheque] = await Promise.all([
    base.seancesRealisees.toArray(),
    base.exercices.toArray(),
  ])
  return csvDesSeances(seances, bibliotheque)
}

/** Le CSV du journal : repas, eau et mesures, une ligne par jour. */
export async function exporterCsvDuJournal(options: OptionsSauvegarde = {}): Promise<string> {
  const base = options.base ?? db
  const [repas, hydratation, mesures] = await Promise.all([
    base.repas.toArray(),
    base.hydratation.toArray(),
    base.mesures.toArray(),
  ])
  return csvDuJournal(repas, hydratation, mesures)
}

export interface ResultatImport {
  profilRestaure: boolean
  exercices: number
  seancesPrevues: number
  seancesRealisees: number
  repas: number
}

/**
 * Remplace toutes les données locales par celles de la sauvegarde.
 *
 * Destructif et volontairement sans fusion : l'appelant doit avoir demandé
 * confirmation.
 */
export async function importerTout(
  sauvegarde: Sauvegarde,
  options: OptionsSauvegarde = {},
): Promise<ResultatImport> {
  const base = options.base ?? db
  const repas = sauvegarde.repas.map(deserialiserRepas)

  await base.transaction('rw', base.tables, async () => {
    await Promise.all(base.tables.map((table) => table.clear()))

    if (sauvegarde.profil) await base.profil.put(sauvegarde.profil)
    if (sauvegarde.exercices.length > 0) await base.exercices.bulkPut(sauvegarde.exercices)
    if (sauvegarde.programmes.length > 0) await base.programmes.bulkPut(sauvegarde.programmes)
    if (sauvegarde.seancesPrevues.length > 0) {
      await base.seancesPrevues.bulkPut(sauvegarde.seancesPrevues)
    }
    if (sauvegarde.seancesRealisees.length > 0) {
      await base.seancesRealisees.bulkPut(sauvegarde.seancesRealisees)
    }
    if (sauvegarde.bilans.length > 0) await base.bilans.bulkPut(sauvegarde.bilans)
    if (repas.length > 0) await base.repas.bulkPut(repas)
    if (sauvegarde.hydratation.length > 0) {
      await base.hydratation.bulkPut(sauvegarde.hydratation)
    }
    if (sauvegarde.mesures.length > 0) await base.mesures.bulkPut(sauvegarde.mesures)
  })

  return {
    profilRestaure: sauvegarde.profil !== null,
    exercices: sauvegarde.exercices.length,
    seancesPrevues: sauvegarde.seancesPrevues.length,
    seancesRealisees: sauvegarde.seancesRealisees.length,
    repas: repas.length,
  }
}
