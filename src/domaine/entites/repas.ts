/**
 * Entité Repas (chapitre 7) : le journal alimentaire.
 *
 * Volontairement léger (chapitre 6) : du texte libre, une photo facultative et
 * quatre questions fermées. Aucun comptage de calories en v1, aucune cible
 * chiffrée générée automatiquement.
 */
import type { DateIso, HorodatageIso, Id } from './communs'

export const MOMENTS_REPAS = ['petit-dejeuner', 'dejeuner', 'diner', 'collation'] as const
export type MomentRepas = (typeof MOMENTS_REPAS)[number]

/** Le « bilan rapide » du chapitre 6 : quatre oui / non, un tap chacun. */
export interface BilanRapideRepas {
  legumes: boolean
  proteines: boolean
  boissonSucree: boolean
  copieux: boolean
}

export interface Repas {
  id: Id
  date: DateIso
  moment: MomentRepas
  /** Texte libre, peut rester vide si seul le bilan rapide est renseigné. */
  description: string
  /**
   * Photo facultative, stockée telle quelle dans IndexedDB. L'export JSON de
   * l'étape 5 devra l'encoder en base64 pour qu'une sauvegarde soit complète.
   */
  photo?: Blob
  bilanRapide: BilanRapideRepas
  saisieLe: HorodatageIso
}
