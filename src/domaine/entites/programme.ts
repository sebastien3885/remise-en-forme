/**
 * Entité Programme (chapitre 7) : le plan en cours.
 *
 * Jamais d'écrasement : une révision crée une nouvelle version et l'ancienne
 * reste consultable. Une seule version est `actif` à la fois.
 */
import type { DateIso, HorodatageIso, Id } from './communs'

export interface Programme {
  id: Id
  /** 1 pour le programme initial, puis incrémenté à chaque révision. */
  version: number
  dateDebut: DateIso
  dateFin: DateIso
  /** Pourquoi cette version existe : « programme initial », « +10 % car ... ». */
  motifRevision: string
  /** Bilan hebdomadaire qui a déclenché cette version, s'il y en a un. */
  bilanDeclencheurId?: Id
  /** Version dont celle-ci est issue, pour remonter l'historique. */
  versionPrecedenteId?: Id
  actif: boolean
  creeLe: HorodatageIso
}
