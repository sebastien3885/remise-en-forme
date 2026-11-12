/**
 * Mise en mots des mesures, partagée par les écrans.
 *
 * Une cible comme `{ series: 2, repetitions: 10, reposSecondes: 60 }` se lit
 * « 2 × 10, repos 60 s » et pas comme une liste de champs. Le formatage vit
 * ici pour que l'écran Aujourd'hui et l'écran Semaine disent exactement la
 * même chose de la même donnée.
 */
import type {
  ChampCharge,
  Mesures,
  MomentRepas,
  MotifAbandon,
  StatutRealisation,
  TypeSeance,
} from '../domaine/entites'

/** Unité à afficher derrière une charge mesurée. */
export const UNITE_DU_CHAMP: Record<ChampCharge, string> = {
  dureeMinutes: 'min',
  maintienSecondes: 's',
  distanceMetres: 'm',
  longueurs: 'longueurs',
  repetitions: 'répétitions',
  series: 'séries',
}

/**
 * Nom en clair d'une grandeur mesurée, pour l'éditeur d'objectifs : on y
 * choisit « Durée en minutes », pas `dureeMinutes`.
 */
export const LIBELLE_CHAMP_CHARGE: Record<ChampCharge, string> = {
  dureeMinutes: 'Durée en minutes',
  maintienSecondes: 'Maintien en secondes',
  distanceMetres: 'Distance en mètres',
  longueurs: 'Longueurs de piscine',
  repetitions: 'Répétitions d’affilée',
  series: 'Séries',
}

export interface ChampMesure {
  champ: keyof Mesures
  libelle: string
  unite: string
  /** Pas du champ numérique, pour les boutons haut / bas du clavier. */
  pas: number
}

/** Les champs modifiables à la validation, dans l'ordre où on les lit. */
export const CHAMPS_MESURES: readonly ChampMesure[] = [
  { champ: 'dureeMinutes', libelle: 'Durée', unite: 'min', pas: 1 },
  { champ: 'distanceMetres', libelle: 'Distance', unite: 'm', pas: 100 },
  { champ: 'longueurs', libelle: 'Longueurs', unite: '', pas: 1 },
  { champ: 'series', libelle: 'Séries', unite: '', pas: 1 },
  { champ: 'repetitions', libelle: 'Répétitions', unite: '', pas: 1 },
  { champ: 'maintienSecondes', libelle: 'Maintien', unite: 's', pas: 5 },
  { champ: 'reposSecondes', libelle: 'Repos', unite: 's', pas: 15 },
]

/**
 * Résumé court d'une mesure : « 2 × 10, repos 60 s ». Vit dans le domaine,
 * parce que l'export CSV s'en sert aussi ; réexporté ici pour que les écrans
 * n'aient qu'un seul point d'entrée.
 */
export { formaterMesures } from '../domaine/mesures'

/**
 * Le chiffre qu'on met en gros sur l'écran du jour. Formaté en UTC, comme les
 * dates ISO qu'il reçoit : sans cela, un décalage de fuseau afficherait la
 * veille.
 */
export function chiffreMarquant(
  mesures: Mesures,
): { valeur: number; unite: string } | undefined {
  if (mesures.dureeMinutes !== undefined) {
    return { valeur: mesures.dureeMinutes, unite: 'min' }
  }
  if (mesures.longueurs !== undefined) {
    return {
      valeur: mesures.longueurs,
      unite: mesures.longueurs > 1 ? 'longueurs' : 'longueur',
    }
  }
  if (mesures.distanceMetres !== undefined) {
    return { valeur: mesures.distanceMetres, unite: 'm' }
  }
  if (mesures.repetitions !== undefined) {
    return {
      valeur: (mesures.series ?? 1) * mesures.repetitions,
      unite: 'répétitions',
    }
  }
  return undefined
}

const FORMAT_LONG = new Intl.DateTimeFormat('fr-FR', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  timeZone: 'UTC',
})

const FORMAT_COURT = new Intl.DateTimeFormat('fr-FR', {
  weekday: 'short',
  day: 'numeric',
  timeZone: 'UTC',
})

/** « lundi 16 novembre ». */
export function formaterDateLongue(date: string): string {
  return FORMAT_LONG.format(new Date(date + 'T00:00:00.000Z'))
}

/** « lun. 16 ». */
export function formaterDateCourte(date: string): string {
  return FORMAT_COURT.format(new Date(date + 'T00:00:00.000Z'))
}

export const LIBELLE_STATUT: Record<StatutRealisation, string> = {
  faite: 'Faite',
  partielle: 'Faite en partie',
  sautee: 'Sautée',
}

export const LIBELLE_TYPE_SEANCE: Record<TypeSeance, string> = {
  marche: 'Marche',
  velo: 'Vélo',
  natation: 'Natation',
  renforcement: 'Renforcement',
  mobilite: 'Mobilité',
  autre: 'Autre',
  repos: 'Repos',
}

/** Les types qu'on propose pour une activité improvisée. Le repos n'en est pas une. */
export const TYPES_PROPOSABLES: readonly TypeSeance[] = [
  'marche',
  'velo',
  'natation',
  'renforcement',
  'mobilite',
  'autre',
]

export const LIBELLE_MOMENT: Record<MomentRepas, string> = {
  'petit-dejeuner': 'Petit-déjeuner',
  dejeuner: 'Déjeuner',
  diner: 'Dîner',
  collation: 'Collation',
}

export const LIBELLE_MOTIF: Record<MotifAbandon, string> = {
  fatigue: 'Fatigue',
  'manque-de-temps': 'Manque de temps',
  douleur: 'Douleur',
  meteo: 'Météo',
  autre: 'Autre',
}

/** 148 532 → « 145 ko ». Pour dire le poids d'une photo sans faire un cours. */
export function formaterPoids(octets: number): string {
  if (octets < 1024) return String(octets) + ' o'

  const ko = octets / 1024
  if (ko < 1024) return String(Math.round(ko)) + ' ko'

  return (ko / 1024).toFixed(1).replace('.', ',') + ' Mo'
}
