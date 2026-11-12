/**
 * Entité Séance réalisée (chapitre 7) : ce qui a vraiment eu lieu.
 *
 * C'est la source de vérité du moteur de progression (règle de conception du
 * chapitre 4). Le lien vers la séance prévue est facultatif : une activité
 * improvisée se note sans avoir été planifiée.
 */
import type {
  DateIso,
  EchelleDix,
  HorodatageIso,
  Id,
  Mesures,
  MotifAbandon,
  NiveauDouleur,
  StatutRealisation,
  TypeSeance,
} from './communs'

/** Douleur localisée, signalée pendant ou après la séance (chapitre 10). */
export interface Douleur {
  /** Zone en slug, cohérente avec les antécédents du profil : `genou`. */
  zone: string
  intensite: NiveauDouleur
  gonflement?: boolean
  /** Sensation d'instabilité du genou : motif d'arrêt et d'avis médical. */
  instabilite?: boolean
}

/** Un exercice tel qu'il a été fait. */
export interface ExerciceRealise {
  exerciceId: Id
  ordre: number
  /** Valeurs réelles, préremplies avec les cibles puis corrigées. */
  reel: Mesures
  /**
   * Douleur ressentie sur cet exercice précis, 0 si aucune. C'est ce champ que
   * lit la règle « douleur signalée deux fois sur le même exercice ».
   */
  douleur?: NiveauDouleur
  /** L'exercice a été écourté ou abandonné en cours de séance. */
  abandonne?: boolean
}

export interface SeanceRealisee {
  id: Id
  /** Séance prévue correspondante, absente si la séance était improvisée. */
  seancePrevueId?: Id
  date: DateIso
  type: TypeSeance
  titre: string
  statut: StatutRealisation
  /** Motif optionnel quand la séance est sautée ou partielle. */
  motif?: MotifAbandon
  exercices: ExerciceRealise[]
  /**
   * Ressenti de l'effort, 1 à 10 (chapitre 4).
   *
   * Absent pour une séance **sautée** : elle n'a pas eu lieu, elle n'a donc
   * pas d'effort à déclarer. Mettre un chiffre par défaut reviendrait à
   * fabriquer une donnée que le moteur de progression finirait par lire.
   */
  effort?: EchelleDix
  /** État général : énergie du moment, 1 à 10. Absent si la séance est sautée. */
  energie?: EchelleDix
  /** Douleurs signalées pour la séance entière. */
  douleurs: Douleur[]
  /** Sommeil de la nuit précédente, en heures. */
  heuresSommeil?: number
  note?: string
  saisieLe: HorodatageIso
}
