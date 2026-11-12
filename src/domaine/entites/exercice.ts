/**
 * Entité Exercice (chapitre 7) : la bibliothèque.
 *
 * Chaque exercice porte un niveau d'impact sur le genou, comme l'exige le
 * chapitre 10, et peut désigner une variante plus facile et une variante plus
 * difficile — ce sont elles que le moteur de progression propose quand une
 * douleur se répète ou qu'un palier est atteint (chapitre 5).
 */
import type {
  CategorieExercice,
  HorodatageIso,
  Id,
  ImpactGenou,
  Materiel,
} from './communs'

/** D'où vient l'exercice, pour savoir ce qu'un réimport peut écraser. */
export const ORIGINES_EXERCICE = ['bibliotheque', 'import', 'utilisateur'] as const
export type OrigineExercice = (typeof ORIGINES_EXERCICE)[number]

export interface Exercice {
  /** Slug stable (`squat-sur-chaise`) : lisible dans les plans JSON. */
  id: Id
  nom: string
  categorie: CategorieExercice
  /** Description courte, une phrase ou deux. */
  description: string
  musclesTravailles: string[]
  /** Variante plus facile, vers laquelle on redescend en cas de douleur. */
  varianteFacileId?: Id
  /** Variante plus difficile, proposée quand un palier est atteint. */
  varianteDifficileId?: Id
  contreIndications: string[]
  /** Impact sur le genou (chapitre 10). */
  impactGenou: ImpactGenou
  /** Demande une flexion marquée du genou : signalé, pas exclu d'office. */
  flexionMarquee: boolean
  materielRequis: Materiel[]
  /** Consigne de sécurité rappelée pendant la séance (chapitre 10). */
  consigneSecurite?: string
  origine: OrigineExercice
  creeLe: HorodatageIso
}
