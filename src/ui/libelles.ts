/**
 * Mise en mots des mesures, partagée par les écrans.
 *
 * Une cible comme `{ series: 2, repetitions: 10, reposSecondes: 60 }` se lit
 * « 2 × 10, repos 60 s » et pas comme une liste de champs. Le formatage vit
 * ici pour que l'écran Aujourd'hui et l'écran Semaine disent exactement la
 * même chose de la même donnée.
 */
import type { Mesures, MotifAbandon, StatutRealisation } from '../domaine/entites'

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

function pluriel(nombre: number, singulier: string): string {
  return String(nombre) + ' ' + singulier + (nombre > 1 ? 's' : '')
}

/** Résumé court d'une mesure : « 2 × 10, repos 60 s ». */
export function formaterMesures(mesures: Mesures): string {
  const morceaux: string[] = []

  if (mesures.dureeMinutes !== undefined) {
    morceaux.push(String(mesures.dureeMinutes) + ' min')
  }
  if (mesures.distanceMetres !== undefined) {
    morceaux.push(String(mesures.distanceMetres) + ' m')
  }
  if (mesures.longueurs !== undefined) {
    morceaux.push(pluriel(mesures.longueurs, 'longueur'))
  }

  // Les séries ne s'affichent jamais seules : elles multiplient ce qui suit.
  if (mesures.repetitions !== undefined) {
    morceaux.push(
      mesures.series !== undefined
        ? String(mesures.series) + ' × ' + String(mesures.repetitions)
        : String(mesures.repetitions) + ' rép.',
    )
  } else if (mesures.maintienSecondes !== undefined) {
    morceaux.push(
      mesures.series !== undefined
        ? String(mesures.series) + ' × ' + String(mesures.maintienSecondes) + ' s'
        : String(mesures.maintienSecondes) + ' s',
    )
  } else if (mesures.series !== undefined) {
    morceaux.push(pluriel(mesures.series, 'série'))
  }

  if (mesures.maintienSecondes !== undefined && mesures.repetitions !== undefined) {
    morceaux.push('tenue ' + String(mesures.maintienSecondes) + ' s')
  }
  if (mesures.reposSecondes !== undefined && mesures.reposSecondes > 0) {
    morceaux.push('repos ' + String(mesures.reposSecondes) + ' s')
  }

  return morceaux.join(', ')
}

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

export const LIBELLE_MOTIF: Record<MotifAbandon, string> = {
  fatigue: 'Fatigue',
  'manque-de-temps': 'Manque de temps',
  douleur: 'Douleur',
  meteo: 'Météo',
  autre: 'Autre',
}
