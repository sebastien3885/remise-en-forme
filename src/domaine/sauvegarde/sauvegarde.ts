/**
 * Lecture et aperçu d'un fichier de sauvegarde (chapitre 9).
 *
 * Module pur : il contrôle et résume, il n'écrit rien. L'import remplace
 * toutes les données locales, donc l'aperçu est la dernière occasion de voir
 * ce qu'on s'apprête à recevoir — et de se raviser.
 */
import { formaterProblemes, problemeDeJson, type ProblemeDeFormat } from '../erreurs-zod'
import { schemaSauvegarde, type Sauvegarde } from './schema'

export type AnalyseSauvegarde =
  | { valide: true; sauvegarde: Sauvegarde }
  | { valide: false; erreurs: ProblemeDeFormat[] }

export function analyserSauvegarde(donnees: unknown): AnalyseSauvegarde {
  const resultat = schemaSauvegarde.safeParse(donnees)
  if (resultat.success) return { valide: true, sauvegarde: resultat.data }
  return { valide: false, erreurs: formaterProblemes(resultat.error.issues) }
}

export function analyserTexteSauvegarde(texte: string): AnalyseSauvegarde {
  let donnees: unknown
  try {
    donnees = JSON.parse(texte)
  } catch (erreur) {
    return { valide: false, erreurs: [problemeDeJson(erreur)] }
  }
  return analyserSauvegarde(donnees)
}

export interface ApercuSauvegarde {
  exporteeLe: string
  aUnProfil: boolean
  exercices: number
  programmes: number
  seancesPrevues: number
  seancesRealisees: number
  bilans: number
  repas: number
  joursDHydratation: number
  mesures: number
  photos: number
  /** Date de la première et de la dernière séance réalisée, s'il y en a. */
  premiereSeance: string | undefined
  derniereSeance: string | undefined
}

export function apercuDeLaSauvegarde(sauvegarde: Sauvegarde): ApercuSauvegarde {
  const dates = sauvegarde.seancesRealisees.map((seance) => seance.date).sort()

  return {
    exporteeLe: sauvegarde.exporteeLe,
    aUnProfil: sauvegarde.profil !== null,
    exercices: sauvegarde.exercices.length,
    programmes: sauvegarde.programmes.length,
    seancesPrevues: sauvegarde.seancesPrevues.length,
    seancesRealisees: sauvegarde.seancesRealisees.length,
    bilans: sauvegarde.bilans.length,
    repas: sauvegarde.repas.length,
    joursDHydratation: sauvegarde.hydratation.length,
    mesures: sauvegarde.mesures.length,
    photos: sauvegarde.repas.filter((repas) => repas.photo !== undefined).length,
    premiereSeance: dates[0],
    derniereSeance: dates[dates.length - 1],
  }
}

/** Nom de fichier proposé : lisible, triable, sans caractère gênant. */
export function nomDeFichier(exporteeLe: string): string {
  const jour = exporteeLe.slice(0, 10)
  const heure = exporteeLe.slice(11, 16).replace(':', 'h')
  return 'remise-en-forme-' + jour + '-' + heure + '.json'
}
