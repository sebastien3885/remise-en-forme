/**
 * Séquence de minuterie d'une séance (chapitre 3 : « minuterie intégrée
 * travail / repos pour les séries »).
 *
 * Le module est pur : il transforme une liste d'exercices et leurs cibles en
 * une suite de phases. Le décompte lui-même vit dans l'interface.
 *
 * Deux choix méritent d'être écrits :
 *
 * - **Une phase de travail n'a pas toujours de durée.** Un gainage de 20 s se
 *   décompte ; dix squats, non. Pour ces phases, `secondes` est absent et
 *   c'est l'utilisateur qui dit quand il a fini — c'est ce que fait un
 *   minuteur d'entraînement réel, et c'est plus honnête que d'inventer une
 *   durée par répétition.
 * - **Pas de repos après la dernière série.** Un minuteur qui fait patienter
 *   une minute alors que la séance est finie se fait éteindre.
 */
import type { Id, Mesures } from '../entites'

export const GENRES_PHASE = ['travail', 'repos'] as const
export type GenrePhase = (typeof GENRES_PHASE)[number]

export interface Phase {
  genre: GenrePhase
  /** Absent quand la phase se termine au doigt plutôt qu'au chronomètre. */
  secondes?: number
  /** Nom de l'exercice concerné. */
  titre: string
  /** « Série 2 sur 3 », « 10 répétitions », … */
  detail: string
  exerciceId: Id
}

export interface ExercicePourMinuterie {
  exerciceId: Id
  nom: string
  cibles: Mesures
}

function detailDuTravail(cibles: Mesures, serie: number, series: number): string {
  const morceaux: string[] = []

  if (series > 1) {
    morceaux.push('Série ' + String(serie) + ' sur ' + String(series))
  }
  if (cibles.repetitions !== undefined) {
    morceaux.push(String(cibles.repetitions) + ' répétitions')
  }
  if (cibles.longueurs !== undefined) {
    morceaux.push(String(cibles.longueurs) + (cibles.longueurs > 1 ? ' longueurs' : ' longueur'))
  }
  if (cibles.distanceMetres !== undefined) {
    morceaux.push(String(cibles.distanceMetres) + ' m')
  }

  return morceaux.join(' · ')
}

/** Durée d'une phase de travail, ou `undefined` si elle se termine au doigt. */
function dureeDuTravail(cibles: Mesures): number | undefined {
  if (cibles.maintienSecondes !== undefined) return cibles.maintienSecondes
  if (cibles.dureeMinutes !== undefined) return cibles.dureeMinutes * 60
  return undefined
}

/**
 * Construit la suite des phases. Les exercices arrivent dans l'ordre de la
 * séance ; ceux qui ne portent aucune cible mesurable sont ignorés.
 */
export function sequenceDeSeance(exercices: readonly ExercicePourMinuterie[]): Phase[] {
  const phases: Phase[] = []

  for (const exercice of exercices) {
    const { cibles } = exercice
    const series = cibles.series ?? 1
    const duree = dureeDuTravail(cibles)

    // Rien à minuter : ni durée, ni répétitions, ni distance.
    if (
      duree === undefined &&
      cibles.repetitions === undefined &&
      cibles.longueurs === undefined &&
      cibles.distanceMetres === undefined
    ) {
      continue
    }

    for (let serie = 1; serie <= series; serie += 1) {
      phases.push({
        genre: 'travail',
        titre: exercice.nom,
        detail: detailDuTravail(cibles, serie, series),
        exerciceId: exercice.exerciceId,
        ...(duree !== undefined ? { secondes: duree } : {}),
      })

      const estDerniereSerie = serie === series
      if (cibles.reposSecondes !== undefined && cibles.reposSecondes > 0 && !estDerniereSerie) {
        phases.push({
          genre: 'repos',
          secondes: cibles.reposSecondes,
          titre: 'Repos',
          detail: 'Avant la série ' + String(serie + 1),
          exerciceId: exercice.exerciceId,
        })
      }
    }

    // Repos entre deux exercices, mais jamais après le dernier.
    const estDernierExercice = exercice === exercices[exercices.length - 1]
    if (
      cibles.reposSecondes !== undefined &&
      cibles.reposSecondes > 0 &&
      !estDernierExercice &&
      phases.length > 0
    ) {
      phases.push({
        genre: 'repos',
        secondes: cibles.reposSecondes,
        titre: 'Repos',
        detail: 'Avant l’exercice suivant',
        exerciceId: exercice.exerciceId,
      })
    }
  }

  // Une séquence ne se termine jamais sur un repos.
  while (phases.length > 0 && phases[phases.length - 1]?.genre === 'repos') {
    phases.pop()
  }

  return phases
}

/** Durée totale des phases minutées, en secondes. */
export function dureeTotale(phases: readonly Phase[]): number {
  return phases.reduce((total, phase) => total + (phase.secondes ?? 0), 0)
}

/** « 2:05 », « 0:45 ». */
export function formaterChrono(secondes: number): string {
  const entier = Math.max(0, Math.round(secondes))
  const minutes = Math.floor(entier / 60)
  const reste = entier % 60
  return String(minutes) + ':' + String(reste).padStart(2, '0')
}
