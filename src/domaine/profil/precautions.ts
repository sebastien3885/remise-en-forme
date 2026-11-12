/**
 * Application des précautions du profil à la bibliothèque (chapitre 10).
 *
 * Deux niveaux, et la différence compte :
 *
 * - **exclusion** : l'exercice ne sera pas proposé. Course, sauts et squats
 *   profonds le sont par défaut.
 * - **signalement** : l'exercice reste proposé, mais avec un avertissement.
 *   C'est le traitement que le chapitre 10 réserve aux mouvements demandant
 *   une flexion marquée du genou, comme le battement de brasse.
 *
 * Chaque exclusion porte son explication en clair : l'écran Réglages doit
 * pouvoir dire *pourquoi* un exercice est écarté, et l'utilisateur reste libre
 * de lever la précaution sous sa responsabilité.
 */
import {
  ORDRE_IMPACT_GENOU,
  type Exercice,
  type Materiel,
  type Precautions,
  type Profil,
} from '../entites'

export const RAISONS_EXCLUSION = [
  'impact-genou',
  'flexion-marquee',
  'exclu-manuellement',
  'materiel-absent',
] as const
export type RaisonExclusion = (typeof RAISONS_EXCLUSION)[number]

export interface Exclusion {
  raison: RaisonExclusion
  explication: string
}

export interface VerdictExercice {
  exerciceId: string
  autorise: boolean
  /** Vide si l'exercice est autorisé. */
  exclusions: Exclusion[]
  /** Avertissements à afficher même quand l'exercice est autorisé. */
  signalements: string[]
}

/** Ce que les précautions ont besoin de savoir du profil. */
export interface ContexteExercices {
  precautions: Precautions
  materiel: Materiel[]
}

/** Extrait du profil ce dont le filtrage a besoin. */
export function contexteDepuisProfil(profil: Profil): ContexteExercices {
  return { precautions: profil.precautions, materiel: profil.materiel }
}

function materielManquant(exercice: Exercice, materielDisponible: Materiel[]): Materiel[] {
  return exercice.materielRequis.filter(
    (requis) => requis !== 'aucun' && !materielDisponible.includes(requis),
  )
}

/** Évalue un exercice au regard des précautions et du matériel déclaré. */
export function evaluerExercice(
  exercice: Exercice,
  contexte: ContexteExercices,
): VerdictExercice {
  const { precautions, materiel } = contexte
  const exclusions: Exclusion[] = []
  const signalements: string[] = []

  if (precautions.exercicesExclusIds.includes(exercice.id)) {
    exclusions.push({
      raison: 'exclu-manuellement',
      explication: 'Écarté à la main dans les réglages.',
    })
  }

  const plafond = ORDRE_IMPACT_GENOU[precautions.impactGenouMaximal]
  if (ORDRE_IMPACT_GENOU[exercice.impactGenou] > plafond) {
    exclusions.push({
      raison: 'impact-genou',
      explication:
        'Impact ' +
        exercice.impactGenou +
        ' sur le genou, au-delà du plafond « ' +
        precautions.impactGenouMaximal +
        ' » fixé dans le profil.',
    })
  }

  if (exercice.flexionMarquee && precautions.exclureFlexionMarquee) {
    exclusions.push({
      raison: 'flexion-marquee',
      explication:
        'Demande une flexion marquée du genou, écartée par les précautions du profil.',
    })
  }

  const manquant = materielManquant(exercice, materiel)
  if (manquant.length > 0) {
    exclusions.push({
      raison: 'materiel-absent',
      explication: 'Demande du matériel non déclaré : ' + manquant.join(', ') + '.',
    })
  }

  // Signalements : l'exercice passe, mais l'utilisateur doit le savoir.
  if (exercice.flexionMarquee && !precautions.exclureFlexionMarquee) {
    signalements.push(
      'Demande une flexion marquée du genou : y aller progressivement et arrêter à la moindre gêne.',
    )
  }
  if (exercice.impactGenou === 'modere' && plafond >= ORDRE_IMPACT_GENOU.modere) {
    signalements.push('Impact modéré sur le genou : rester attentif aux sensations.')
  }

  return {
    exerciceId: exercice.id,
    autorise: exclusions.length === 0,
    exclusions,
    signalements,
  }
}

/** Vrai si l'exercice peut être proposé. */
export function exerciceAutorise(exercice: Exercice, contexte: ContexteExercices): boolean {
  return evaluerExercice(exercice, contexte).autorise
}

/** Les exercices proposables, dans l'ordre reçu. */
export function exercicesAutorises(
  exercices: readonly Exercice[],
  contexte: ContexteExercices,
): Exercice[] {
  return exercices.filter((exercice) => exerciceAutorise(exercice, contexte))
}

/** Les exercices écartés, avec le détail des raisons, pour l'écran Réglages. */
export function exercicesEcartes(
  exercices: readonly Exercice[],
  contexte: ContexteExercices,
): VerdictExercice[] {
  return exercices
    .map((exercice) => evaluerExercice(exercice, contexte))
    .filter((verdict) => !verdict.autorise)
}
