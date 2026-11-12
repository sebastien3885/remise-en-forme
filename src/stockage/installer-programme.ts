/**
 * Pose un programme et ses séances en base, en une seule transaction.
 *
 * Deux chemins y mènent — l'import d'un plan et la génération du programme
 * initial — et ils doivent se comporter exactement pareil : si une écriture
 * échoue, aucune ne passe, et l'ancienne version n'est jamais effacée, juste
 * désactivée (chapitre 7).
 */
import type { Exercice, Programme, SeancePrevue } from '../domaine/entites'
import type { BaseForme } from './db'

export interface AInstaller {
  programme: Programme
  seances: readonly SeancePrevue[]
  /** Exercices à ajouter ou mettre à jour au passage. */
  exercices?: readonly Exercice[]
  /**
   * Désactive les autres programmes. Faux quand on complète le programme en
   * cours plutôt que d'en créer une version.
   */
  desactiverLesAutres: boolean
}

export async function installerProgramme(base: BaseForme, aInstaller: AInstaller): Promise<void> {
  const { programme, seances, exercices = [], desactiverLesAutres } = aInstaller

  await base.transaction(
    'rw',
    [base.exercices, base.programmes, base.seancesPrevues],
    async () => {
      if (exercices.length > 0) {
        await base.exercices.bulkPut(exercices)
      }

      if (desactiverLesAutres) {
        const anciens = await base.programmes.toArray()
        const aDesactiver = anciens
          .filter((ancien) => ancien.actif && ancien.id !== programme.id)
          .map((ancien) => ({ ...ancien, actif: false }))
        if (aDesactiver.length > 0) {
          await base.programmes.bulkPut(aDesactiver)
        }
      }

      await base.programmes.put(programme)
      if (seances.length > 0) {
        await base.seancesPrevues.bulkPut([...seances])
      }
    },
  )
}
