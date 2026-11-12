/**
 * Choix d'une variante, en respectant les précautions du profil.
 *
 * Les deux fonctions servent aux deux règles du chapitre 5 qui changent
 * d'exercice plutôt que de charge :
 *
 * - douleur signalée deux fois sur le même exercice → variante plus douce ;
 * - palier atteint sur un exercice → variante plus difficile.
 *
 * Elles se comportent différemment à dessein. Descendre est un geste de
 * sécurité : on suit la chaîne aussi loin qu'il faut pour trouver un exercice
 * autorisé. Monter est un geste de performance : on ne monte que d'un cran, et
 * si ce cran est écarté par les précautions, on ne propose rien du tout — pas
 * question de sauter par-dessus un exercice interdit pour en trouver un autre.
 */
import type { Exercice, Id } from '../entites'
import { exerciceAutorise, type ContexteExercices } from '../profil/precautions'

function indexer(catalogue: readonly Exercice[]): Map<Id, Exercice> {
  return new Map(catalogue.map((exercice) => [exercice.id, exercice]))
}

/**
 * Variante plus douce autorisée, en descendant la chaîne aussi loin que
 * nécessaire. Rend `undefined` s'il n'y a plus rien de plus doux.
 */
export function variantePlusDouce(
  exercice: Exercice,
  catalogue: readonly Exercice[],
  contexte: ContexteExercices,
): Exercice | undefined {
  const parId = indexer(catalogue)
  const dejaVus = new Set<Id>([exercice.id])

  let courant: Exercice | undefined = exercice
  while (courant?.varianteFacileId) {
    const suivantId: Id = courant.varianteFacileId
    // Garde-fou : une chaîne mal saisie dans un plan importé ne doit pas
    // boucler indéfiniment.
    if (dejaVus.has(suivantId)) return undefined
    dejaVus.add(suivantId)

    const suivant = parId.get(suivantId)
    if (!suivant) return undefined
    if (exerciceAutorise(suivant, contexte)) return suivant

    courant = suivant
  }

  return undefined
}

/**
 * Variante plus difficile, d'un seul cran, et seulement si les précautions
 * l'autorisent. Rend `undefined` sinon.
 */
export function variantePlusDifficile(
  exercice: Exercice,
  catalogue: readonly Exercice[],
  contexte: ContexteExercices,
): Exercice | undefined {
  if (!exercice.varianteDifficileId) return undefined
  if (exercice.varianteDifficileId === exercice.id) return undefined

  const suivant = indexer(catalogue).get(exercice.varianteDifficileId)
  if (!suivant) return undefined

  return exerciceAutorise(suivant, contexte) ? suivant : undefined
}
