/**
 * Tendance du poids et du tour de taille (chapitre 6).
 *
 * Le cahier des charges est explicite : « courbe de tendance (moyenne
 * glissante), **sans affichage anxiogène du poids du jour** ». Ce module ne
 * rend donc jamais la valeur brute du dernier jour comme résultat principal :
 * il rend la série lissée et son évolution.
 *
 * La moyenne est **glissante et partielle** : dès la première mesure on a un
 * point, calculé sur ce qu'on a. Attendre quatre semaines avant d'afficher
 * quoi que ce soit donnerait un écran vide pendant un mois.
 */
import type { DateIso, MesureCorporelle } from '../entites'

export interface PointMesure {
  date: DateIso
  valeur: number
}

/** Fenêtre par défaut : quatre saisies hebdomadaires, soit environ un mois. */
export const FENETRE_PAR_DEFAUT = 4

export function moyenneGlissante(
  points: readonly PointMesure[],
  fenetre: number = FENETRE_PAR_DEFAUT,
): PointMesure[] {
  if (fenetre < 1) return [...points]

  return points.map((point, index) => {
    const debut = Math.max(0, index - fenetre + 1)
    const tranche = points.slice(debut, index + 1)
    const somme = tranche.reduce((total, courant) => total + courant.valeur, 0)
    return {
      date: point.date,
      valeur: Math.round((somme / tranche.length) * 10) / 10,
    }
  })
}

export interface Tendance {
  /** La série lissée, de la plus ancienne mesure à la plus récente. */
  points: PointMesure[]
  /** Dernière valeur lissée, celle qu'on affiche. */
  derniere: number | undefined
  /**
   * Écart entre la première et la dernière valeur lissée. Négatif quand la
   * tendance descend. `undefined` tant qu'il n'y a qu'un seul point.
   */
  variation: number | undefined
  /** Nombre de mesures réellement saisies. */
  nombreDeMesures: number
}

function serie(
  mesures: readonly MesureCorporelle[],
  champ: 'poidsKg' | 'tourTailleCm',
): PointMesure[] {
  return [...mesures]
    .sort((a, b) => a.date.localeCompare(b.date))
    .flatMap((mesure) => {
      const valeur = mesure[champ]
      return valeur === undefined ? [] : [{ date: mesure.date, valeur }]
    })
}

function construireTendance(points: PointMesure[], fenetre: number): Tendance {
  const lissee = moyenneGlissante(points, fenetre)
  const premiere = lissee[0]?.valeur
  const derniere = lissee[lissee.length - 1]?.valeur

  return {
    points: lissee,
    derniere,
    variation:
      lissee.length > 1 && premiere !== undefined && derniere !== undefined
        ? Math.round((derniere - premiere) * 10) / 10
        : undefined,
    nombreDeMesures: points.length,
  }
}

export function tendanceDuPoids(
  mesures: readonly MesureCorporelle[],
  fenetre: number = FENETRE_PAR_DEFAUT,
): Tendance {
  return construireTendance(serie(mesures, 'poidsKg'), fenetre)
}

export function tendanceDuTourDeTaille(
  mesures: readonly MesureCorporelle[],
  fenetre: number = FENETRE_PAR_DEFAUT,
): Tendance {
  return construireTendance(serie(mesures, 'tourTailleCm'), fenetre)
}
