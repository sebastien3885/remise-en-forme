/**
 * Mesure et ajustement de la charge d'un exercice.
 *
 * Une séance peut porter une durée, une distance, des longueurs, des séries et
 * répétitions, un maintien. Pour comparer deux semaines, il faut un seul
 * nombre : c'est le rôle de `chargeDe`, qui retient le champ **dominant** d'une
 * mesure. On ne compare jamais des champs différents entre eux — 30 minutes de
 * marche et 8 longueurs ne se additionnent pas.
 *
 * Chaque champ appartient à un levier (chapitre 5) : la durée et le maintien
 * relèvent de la durée, les longueurs, la distance et les répétitions de
 * l'intensité. Comme un seul levier bouge par semaine, seuls les champs du
 * levier retenu sont ajustés.
 */
import type { ConfigProgression } from '../../config/progression'
import { CHAMPS_CHARGE, type ChampCharge, type Levier, type Mesures } from '../entites'

/** Levier auquel appartient chaque champ de charge. */
export const LEVIER_PAR_CHAMP: Record<ChampCharge, Levier> = {
  dureeMinutes: 'duree',
  maintienSecondes: 'duree',
  distanceMetres: 'intensite',
  longueurs: 'intensite',
  series: 'intensite',
  repetitions: 'intensite',
}

/**
 * Plus petit pas significatif par champ. On ne propose pas 2 017 mètres : la
 * distance avance par tranches de 100.
 */
export const PAS_PAR_CHAMP: Record<ChampCharge, number> = {
  dureeMinutes: 1,
  maintienSecondes: 1,
  distanceMetres: 100,
  longueurs: 1,
  series: 1,
  repetitions: 1,
}

export interface Charge {
  champ: ChampCharge
  /** Volume total : pour les séries, séries × répétitions. */
  valeur: number
}

/**
 * Charge dominante d'une mesure, ou `undefined` si la mesure ne porte aucune
 * quantité (un jour de repos, par exemple).
 *
 * L'ordre de priorité va du plus spécifique au plus général : les longueurs
 * passent devant la distance, qui passe devant la durée.
 */
export function chargeDe(mesures: Mesures): Charge | undefined {
  if (mesures.longueurs !== undefined) {
    return { champ: 'longueurs', valeur: mesures.longueurs }
  }
  if (mesures.distanceMetres !== undefined) {
    return { champ: 'distanceMetres', valeur: mesures.distanceMetres }
  }
  if (mesures.dureeMinutes !== undefined) {
    return { champ: 'dureeMinutes', valeur: mesures.dureeMinutes }
  }
  if (mesures.repetitions !== undefined) {
    return { champ: 'repetitions', valeur: (mesures.series ?? 1) * mesures.repetitions }
  }
  if (mesures.maintienSecondes !== undefined) {
    return { champ: 'maintienSecondes', valeur: (mesures.series ?? 1) * mesures.maintienSecondes }
  }
  return undefined
}

/** Levier dominant d'une mesure, pour savoir si un ajustement la concerne. */
export function levierDe(mesures: Mesures): Levier | undefined {
  const charge = chargeDe(mesures)
  return charge ? LEVIER_PAR_CHAMP[charge.champ] : undefined
}

/** Ramène un facteur entre le plancher et le plafond de la configuration. */
export function facteurPlafonne(facteur: number, config: ConfigProgression): number {
  const { augmentationMaximale, reductionMaximale } = config.plafonds
  return Math.min(Math.max(facteur, reductionMaximale), augmentationMaximale)
}

/**
 * Applique un facteur à une valeur entière.
 *
 * En augmentation, on arrondit **vers le bas** pour ne pas dépasser le facteur
 * demandé. Si l'arrondi ne bouge pas — 8 longueurs × 1,1 fait 8,8, donc encore
 * 8 — on avance du plus petit pas possible, à condition que la configuration
 * l'autorise. En réduction, on arrondit vers le haut, pour ne pas retirer plus
 * que demandé, et jamais en dessous d'un pas.
 */
export function ajusterValeur(
  valeur: number,
  facteur: number,
  pas: number,
  autoriserLePlusPetitPas: boolean,
): number {
  if (facteur === 1) return valeur

  const cible = valeur * facteur

  if (facteur > 1) {
    const arrondi = Math.floor(cible / pas) * pas
    if (arrondi > valeur) return arrondi
    return autoriserLePlusPetitPas ? valeur + pas : valeur
  }

  const arrondi = Math.ceil(cible / pas) * pas
  return Math.max(arrondi, pas)
}

/**
 * Ajuste les champs d'une mesure qui relèvent du levier retenu.
 *
 * `reposSecondes` n'est jamais touché : le repos est de la récupération, pas de
 * la charge. `series` ne l'est pas non plus — c'est le nombre de répétitions
 * qui porte l'intensité, ce qui évite de faire bouger deux choses à la fois.
 */
export function ajusterMesures(
  mesures: Mesures,
  levier: Levier,
  facteur: number,
  config: ConfigProgression,
): Mesures {
  const plafonne = facteurPlafonne(facteur, config)
  if (plafonne === 1) return { ...mesures }

  const ajustees: Mesures = { ...mesures }
  const autoriserLePlusPetitPas = config.plafonds.autoriserLePlusPetitPas

  for (const champ of CHAMPS_CHARGE) {
    if (champ === 'series') continue
    if (LEVIER_PAR_CHAMP[champ] !== levier) continue

    const valeur = mesures[champ]
    if (valeur === undefined) continue

    ajustees[champ] = ajusterValeur(
      valeur,
      plafonne,
      PAS_PAR_CHAMP[champ],
      autoriserLePlusPetitPas,
    )
  }

  return ajustees
}

/**
 * Variation relative entre deux charges du même champ, ou `undefined` si elles
 * ne portent pas sur la même grandeur.
 */
export function variationRelative(avant: Charge, apres: Charge): number | undefined {
  if (avant.champ !== apres.champ) return undefined
  if (avant.valeur === 0) return apres.valeur === 0 ? 0 : Number.POSITIVE_INFINITY
  return (apres.valeur - avant.valeur) / avant.valeur
}
