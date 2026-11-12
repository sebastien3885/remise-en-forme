/**
 * Entité Hydratation (chapitre 7) : le compteur de verres d'eau.
 *
 * La date sert de clé : il n'y a qu'une ligne par jour, et l'invariant est
 * porté par le stockage plutôt que par du code de vérification.
 */
import type { DateIso, HorodatageIso } from './communs'

export interface Hydratation {
  /** Clé primaire : un jour, une ligne. */
  date: DateIso
  verres: number
  /** Objectif du jour, recopié du profil pour garder l'historique juste. */
  objectif: number
  misAJourLe: HorodatageIso
}
