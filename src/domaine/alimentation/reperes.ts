/**
 * Évaluation des repères alimentaires d'une journée (chapitre 6).
 *
 * Module pur. Deux principes le gouvernent :
 *
 * - **On ne juge que ce qui a été écrit.** Un repère dont la donnée manque
 *   n'est ni tenu ni manqué : il est hors jeu. Compter un repas non saisi
 *   comme un échec transformerait un journal en registre de fautes, ce que le
 *   chapitre 6 refuse explicitement.
 * - **On compte des jours, jamais des calories.** Le garde-fou du chapitre 6
 *   interdit toute cible chiffrée restrictive générée par l'application.
 */
import type { ConfigReperes, IdRepere } from '../../config/reperes'
import { CONFIG_REPERES } from '../../config/reperes'
import type { DateIso, Hydratation, Repas } from '../entites'

export interface EtatRepere {
  id: IdRepere
  libelle: string
  /** Faux quand la donnée manque : le repère est hors jeu ce jour-là. */
  applicable: boolean
  tenu: boolean
}

export interface JourAlimentaire {
  date: DateIso
  repas: readonly Repas[]
  hydratation: Hydratation | undefined
}

/** Un jour compte comme renseigné dès qu'un repas y a été noté. */
export function jourRenseigne(jour: JourAlimentaire): boolean {
  return jour.repas.length > 0
}

function evaluerUnRepere(
  id: IdRepere,
  jour: JourAlimentaire,
  config: ConfigReperes,
): { applicable: boolean; tenu: boolean } {
  const principaux = jour.repas.filter((repas) =>
    config.repasPrincipaux.includes(repas.moment),
  )

  switch (id) {
    case 'legumes':
      return {
        applicable: principaux.length > 0,
        tenu: principaux.length > 0 && principaux.every((repas) => repas.bilanRapide.legumes),
      }

    case 'proteines':
      return {
        applicable: principaux.length > 0,
        tenu: principaux.length > 0 && principaux.every((repas) => repas.bilanRapide.proteines),
      }

    case 'sansBoissonSucree':
      // Toutes les prises comptent, collations comprises.
      return {
        applicable: jour.repas.length > 0,
        tenu: jour.repas.length > 0 && jour.repas.every((repas) => !repas.bilanRapide.boissonSucree),
      }

    case 'hydratation':
      return {
        applicable: jour.hydratation !== undefined,
        tenu:
          jour.hydratation !== undefined &&
          jour.hydratation.verres >= jour.hydratation.objectif,
      }
  }
}

/** L'état de chaque repère actif, pour une journée. */
export function evaluerJour(
  jour: JourAlimentaire,
  config: ConfigReperes = CONFIG_REPERES,
): EtatRepere[] {
  return config.reperes
    .filter((repere) => repere.actif)
    .map((repere) => ({
      id: repere.id,
      libelle: repere.libelle,
      ...evaluerUnRepere(repere.id, jour, config),
    }))
}

/**
 * Une journée est tenue quand **tous les repères applicables** le sont, et
 * qu'au moins un l'était. Un jour sans rien de noté n'est pas une journée
 * tenue, mais ce n'est pas non plus une journée ratée.
 */
export function jourTenu(etats: readonly EtatRepere[]): boolean {
  const applicables = etats.filter((etat) => etat.applicable)
  return applicables.length > 0 && applicables.every((etat) => etat.tenu)
}

// ------------------------------------------------ score de régularité

export interface JourDeLaSemaineAlimentaire {
  date: DateIso
  renseigne: boolean
  tenu: boolean
  etats: EtatRepere[]
}

export interface ScoreRegularite {
  jours: JourDeLaSemaineAlimentaire[]
  joursRenseignes: number
  joursTenus: number
  /** Cible du chapitre 1 : au moins 5 jours de journal par semaine. */
  objectifJours: number
  /** Vrai quand le journal a été tenu assez souvent dans la semaine. */
  atteint: boolean
}

/**
 * Score hebdomadaire de régularité (chapitre 6), affiché à côté du bilan
 * sportif. Il mesure la **régularité du journal**, pas la qualité de
 * l'alimentation : c'est l'indicateur du chapitre 1.
 */
export function scoreDeRegularite(
  jours: readonly JourAlimentaire[],
  config: ConfigReperes = CONFIG_REPERES,
): ScoreRegularite {
  const detail = jours.map((jour) => {
    const etats = evaluerJour(jour, config)
    return {
      date: jour.date,
      renseigne: jourRenseigne(jour),
      tenu: jourTenu(etats),
      etats,
    }
  })

  const joursRenseignes = detail.filter((jour) => jour.renseigne).length

  return {
    jours: detail,
    joursRenseignes,
    joursTenus: detail.filter((jour) => jour.tenu).length,
    objectifJours: config.regularite.joursRenseignesParSemaine,
    atteint: joursRenseignes >= config.regularite.joursRenseignesParSemaine,
  }
}
