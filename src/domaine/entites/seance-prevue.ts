/**
 * Entité Séance prévue (chapitre 7) : ce qui est planifié.
 *
 * Séparée de la séance réalisée pour pouvoir toujours comparer le prévu et le
 * réalisé (chapitre 4).
 */
import type { DateIso, HorodatageIso, Id, Mesures, TypeSeance } from './communs'

/** État de planification d'une séance, avant toute réalisation. */
export const STATUTS_PLANIFICATION = ['a-faire', 'deplacee', 'remplacee', 'annulee'] as const
export type StatutPlanification = (typeof STATUTS_PLANIFICATION)[number]

/** Un exercice de la séance, avec ses cibles. */
export interface ExercicePrevu {
  exerciceId: Id
  /** Position dans la séance, à partir de 1. */
  ordre: number
  cibles: Mesures
  /** Consigne propre à cette séance, si elle diffère de la bibliothèque. */
  consigne?: string
}

export interface SeancePrevue {
  id: Id
  programmeId: Id
  date: DateIso
  /** Numéro de semaine dans le programme, à partir de 1. */
  semaine: number
  type: TypeSeance
  /** Titre affiché : « Marche rapide 30 min ». */
  titre: string
  exercices: ExercicePrevu[]
  statut: StatutPlanification
  /** Date d'origine quand la séance a été déplacée, pour garder la trace. */
  deplaceeDepuis?: DateIso
  /** Séance qui remplace celle-ci, si elle a été échangée. */
  remplaceeParId?: Id
  notes?: string
  creeLe: HorodatageIso
}
