/**
 * Types partagés par toutes les entités du chapitre 7.
 *
 * Contraintes du cahier des charges respectées ici : identifiants uniques,
 * dates au format ISO.
 */

/** Identifiant unique. Slug stable pour la bibliothèque, UUID sinon. */
export type Id = string

/** Date seule, au format ISO `AAAA-MM-JJ`. */
export type DateIso = string

/** Instant complet, au format ISO `AAAA-MM-JJThh:mm:ss.sssZ`. */
export type HorodatageIso = string

/** Échelle de ressenti du chapitre 4 : 1 (très faible) à 10 (maximal). */
export type EchelleDix = number

/** Niveau de douleur : 0 signifie aucune douleur, 10 une douleur maximale. */
export type NiveauDouleur = number

/**
 * Catégories d'exercice. Le chapitre 3 en liste quatre ; `velo` est ajouté
 * parce qu'il figure dans le matériel du questionnaire et fait partie des
 * activités privilégiées par le chapitre 10 (faible impact pour le genou),
 * et `autre` sert aux séances improvisées du chapitre 4.
 */
export const CATEGORIES_EXERCICE = [
  'marche',
  'velo',
  'natation',
  'renforcement',
  'mobilite',
  'autre',
] as const
export type CategorieExercice = (typeof CATEGORIES_EXERCICE)[number]

/** Un type de séance reprend les catégories, plus le repos imposé du chapitre 3. */
export const TYPES_SEANCE = [...CATEGORIES_EXERCICE, 'repos'] as const
export type TypeSeance = (typeof TYPES_SEANCE)[number]

/**
 * Impact d'un exercice sur le genou (chapitre 10). Chaque exercice de la
 * bibliothèque en porte un ; le profil fixe le maximum toléré.
 */
export const IMPACTS_GENOU = ['faible', 'modere', 'eleve'] as const
export type ImpactGenou = (typeof IMPACTS_GENOU)[number]

/** Du plus doux au plus risqué, pour comparer un impact à un plafond. */
export const ORDRE_IMPACT_GENOU: Record<ImpactGenou, number> = {
  faible: 0,
  modere: 1,
  eleve: 2,
}

/** Matériel disponible, demandé au questionnaire de départ (chapitre 3). */
export const MATERIELS = ['aucun', 'tapis', 'velo', 'piscine'] as const
export type Materiel = (typeof MATERIELS)[number]

/** Statut d'une séance réalisée (chapitre 4). */
export const STATUTS_REALISATION = ['faite', 'partielle', 'sautee'] as const
export type StatutRealisation = (typeof STATUTS_REALISATION)[number]

/** Motif optionnel d'une séance sautée ou partielle (chapitre 4). */
export const MOTIFS_ABANDON = [
  'fatigue',
  'manque-de-temps',
  'douleur',
  'meteo',
  'autre',
] as const
export type MotifAbandon = (typeof MOTIFS_ABANDON)[number]

/** Unités d'affichage du profil. */
export const UNITES = ['metrique', 'imperial'] as const
export type Unites = (typeof UNITES)[number]

/**
 * Valeurs mesurables d'un exercice. La même forme sert aux cibles du prévu et
 * aux valeurs réelles du réalisé : c'est ce qui permet de les afficher côte à
 * côte (chapitre 4) et de calculer un écart sans conversion.
 */
export interface Mesures {
  dureeMinutes?: number
  distanceMetres?: number
  longueurs?: number
  series?: number
  repetitions?: number
  /** Gainage et autres maintiens statiques, en secondes. */
  maintienSecondes?: number
  reposSecondes?: number
}

/** Les champs de `Mesures` qui portent une charge et peuvent donc progresser. */
export const CHAMPS_CHARGE = [
  'dureeMinutes',
  'distanceMetres',
  'longueurs',
  'series',
  'repetitions',
  'maintienSecondes',
] as const
export type ChampCharge = (typeof CHAMPS_CHARGE)[number]

/** Les leviers de progression du chapitre 5. Un seul bouge à la fois. */
export const LEVIERS = ['duree', 'intensite', 'frequence'] as const
export type Levier = (typeof LEVIERS)[number]
