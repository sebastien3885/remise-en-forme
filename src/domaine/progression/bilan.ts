/**
 * Statistiques d'une semaine, calculées **à partir du réalisé seulement**.
 *
 * C'est la règle de conception du chapitre 4 : « le réalisé est la source de
 * vérité ; le moteur de progression se base sur lui, jamais sur le programme
 * théorique ». Le prévu n'intervient que comme dénominateur du taux de
 * réalisation.
 *
 * Quelques décisions de comptage, qui ne se lisent pas dans le cahier des
 * charges et qu'il faut donc écrire ici :
 *
 * - Les jours de repos prévus ne comptent pas comme des séances à réaliser.
 * - Une séance prévue annulée ou remplacée sort du dénominateur : ce n'est pas
 *   une séance manquée.
 * - Une séance faite en partie compte pour le poids fixé dans la
 *   configuration, 0,5 par défaut.
 * - Une séance improvisée compte au numérateur : elle a bien été faite.
 * - L'effort et l'énergie moyens ne portent que sur les séances faites ou
 *   faites en partie. Une séance sautée n'a pas d'effort à moyenner.
 */
import type { ConfigProgression } from '../../config/progression'
import { CONFIG_PROGRESSION } from '../../config/progression'
import { dansLaPlage, numeroDeSemaineProgramme } from '../dates'
import type {
  ChampCharge,
  DateIso,
  Id,
  MotifAbandon,
  SeancePrevue,
  SeanceRealisee,
  StatistiquesSemaine,
} from '../entites'
import { chargeDe } from './charge'

export interface EntreeStatistiques {
  semaine: number
  debut: DateIso
  fin: DateIso
  seancesPrevues: readonly SeancePrevue[]
  seancesRealisees: readonly SeanceRealisee[]
  config?: ConfigProgression
}

/** Séances prévues qui comptent vraiment comme des séances à réaliser. */
export function seancesARealiser(seances: readonly SeancePrevue[]): SeancePrevue[] {
  return seances.filter(
    (seance) =>
      seance.type !== 'repos' && seance.statut !== 'annulee' && seance.statut !== 'remplacee',
  )
}

function moyenne(valeurs: readonly number[]): number | null {
  if (valeurs.length === 0) return null
  const somme = valeurs.reduce((total, valeur) => total + valeur, 0)
  return somme / valeurs.length
}

export function statistiquesDeLaSemaine(entree: EntreeStatistiques): StatistiquesSemaine {
  const config = entree.config ?? CONFIG_PROGRESSION

  const prevues = seancesARealiser(entree.seancesPrevues)
  const realisees = entree.seancesRealisees.filter((seance) =>
    dansLaPlage(seance.date, entree.debut, entree.fin),
  )

  const faites = realisees.filter((seance) => seance.statut === 'faite')
  const partielles = realisees.filter((seance) => seance.statut === 'partielle')
  const sautees = realisees.filter((seance) => seance.statut === 'sautee')
  const improvisees = realisees.filter(
    (seance) => seance.seancePrevueId === undefined && seance.statut !== 'sautee',
  )

  const effectuees = [...faites, ...partielles]

  const numerateur = faites.length + partielles.length * config.poidsSeancePartielle
  const tauxRealisation =
    prevues.length === 0 ? (effectuees.length > 0 ? 1 : 0) : numerateur / prevues.length

  // Douleurs : au niveau de la séance et au niveau de chaque exercice.
  const douleursParExercice: Record<Id, number> = {}
  let douleurMaximale = 0

  for (const seance of realisees) {
    for (const douleur of seance.douleurs) {
      douleurMaximale = Math.max(douleurMaximale, douleur.intensite)
    }
    for (const exercice of seance.exercices) {
      const intensite = exercice.douleur
      if (intensite === undefined) continue
      douleurMaximale = Math.max(douleurMaximale, intensite)
      if (intensite >= config.douleurRepetee.intensiteMinimale && intensite > 0) {
        douleursParExercice[exercice.exerciceId] =
          (douleursParExercice[exercice.exerciceId] ?? 0) + 1
      }
    }
  }

  const motifs: Partial<Record<MotifAbandon, number>> = {}
  for (const seance of [...sautees, ...partielles]) {
    if (!seance.motif) continue
    motifs[seance.motif] = (motifs[seance.motif] ?? 0) + 1
  }

  return {
    semaine: entree.semaine,
    debut: entree.debut,
    fin: entree.fin,
    seancesPrevues: prevues.length,
    seancesFaites: faites.length,
    seancesPartielles: partielles.length,
    seancesSautees: sautees.length,
    seancesImprovisees: improvisees.length,
    tauxRealisation,
    effortMoyen: moyenne(effectuees.map((seance) => seance.effort)),
    energieMoyenne: moyenne(effectuees.map((seance) => seance.energie)),
    douleurMaximale,
    douleursParExercice,
    motifs,
  }
}

// ----------------------------------------------- historique par exercice

export interface PointDeCharge {
  semaine: number
  valeur: number
}

export interface SerieChargeExercice {
  exerciceId: Id
  /** Grandeur suivie. On ne compare jamais deux grandeurs différentes. */
  champ: ChampCharge
  /** Meilleure charge réalisée par semaine, de la plus ancienne à la plus récente. */
  points: PointDeCharge[]
}

/**
 * Reconstruit, exercice par exercice, la meilleure charge réalisée chaque
 * semaine. C'est ce qui permet de voir un palier : plusieurs semaines de suite
 * à la même valeur.
 *
 * Seules les séances faites ou faites en partie comptent, et seules les
 * mesures portant sur la même grandeur que la première rencontrée : si un
 * exercice a été noté une semaine en minutes et une autre en répétitions, la
 * seconde est ignorée plutôt que comparée de travers.
 */
export function seriesDeCharge(
  seances: readonly SeanceRealisee[],
  dateDebutProgramme: DateIso,
): SerieChargeExercice[] {
  const series = new Map<Id, { champ: ChampCharge; parSemaine: Map<number, number> }>()

  const retenues = [...seances]
    .filter((seance) => seance.statut === 'faite' || seance.statut === 'partielle')
    .sort((a, b) => a.date.localeCompare(b.date))

  for (const seance of retenues) {
    const semaine = numeroDeSemaineProgramme(dateDebutProgramme, seance.date)

    for (const exercice of seance.exercices) {
      const charge = chargeDe(exercice.reel)
      if (!charge) continue

      const existante = series.get(exercice.exerciceId)
      if (!existante) {
        series.set(exercice.exerciceId, {
          champ: charge.champ,
          parSemaine: new Map([[semaine, charge.valeur]]),
        })
        continue
      }

      // Grandeur différente : incomparable, on laisse de côté.
      if (existante.champ !== charge.champ) continue

      const dejaVue = existante.parSemaine.get(semaine)
      existante.parSemaine.set(
        semaine,
        dejaVue === undefined ? charge.valeur : Math.max(dejaVue, charge.valeur),
      )
    }
  }

  return [...series.entries()].map(([exerciceId, { champ, parSemaine }]) => ({
    exerciceId,
    champ,
    points: [...parSemaine.entries()]
      .map(([semaine, valeur]) => ({ semaine, valeur }))
      .sort((a, b) => a.semaine - b.semaine),
  }))
}
