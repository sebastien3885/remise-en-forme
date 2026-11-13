/**
 * Pose un programme et ses séances en base, en une seule transaction.
 *
 * Deux chemins y mènent — l'import d'un plan et la génération du programme
 * initial — et ils doivent se comporter exactement pareil : si une écriture
 * échoue, aucune ne passe, et l'ancienne version n'est jamais effacée, juste
 * désactivée (chapitre 7).
 *
 * **Une version remplace le prévu de la précédente.** Désactiver l'ancien
 * programme ne suffisait pas : ses séances restaient posées au calendrier, à
 * côté des nouvelles, et les écrans affichaient la plus ancienne — régénérer
 * semblait ne rien faire. Elles passent maintenant en `remplacee` et pointent
 * vers celle qui prend leur place, comme le fait déjà l'acceptation d'un
 * bilan.
 *
 * **Mais on ne replanifie pas un jour déjà vécu.** Une séance réalisée pointe
 * vers sa séance prévue : celle-là garde sa place, et le nouveau programme ne
 * pose rien ce jour-là. Sans cette règle, une régénération réécrirait le passé
 * — exactement ce que le chapitre 7 interdit.
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
    [base.exercices, base.programmes, base.seancesPrevues, base.seancesRealisees],
    async () => {
      if (exercices.length > 0) {
        await base.exercices.bulkPut(exercices)
      }

      let aPoser = [...seances]

      if (desactiverLesAutres) {
        const anciens = await base.programmes.toArray()
        const aDesactiver = anciens
          .filter((ancien) => ancien.actif && ancien.id !== programme.id)
          .map((ancien) => ({ ...ancien, actif: false }))
        if (aDesactiver.length > 0) {
          await base.programmes.bulkPut(aDesactiver)
        }

        const realisees = await base.seancesRealisees.toArray()
        const joursVecus = new Set(realisees.map((realisee) => realisee.date))

        aPoser = aPoser.filter((seance) => !joursVecus.has(seance.date))
        const remplacantesParDate = new Map(aPoser.map((seance) => [seance.date, seance.id]))

        const dansLaPeriode = await base.seancesPrevues
          .where('date')
          .between(programme.dateDebut, programme.dateFin, true, true)
          .toArray()

        const remplacees: SeancePrevue[] = dansLaPeriode
          .filter(
            (ancienne) =>
              ancienne.programmeId !== programme.id &&
              ancienne.statut !== 'annulee' &&
              ancienne.statut !== 'remplacee' &&
              !joursVecus.has(ancienne.date),
          )
          .map((ancienne) => {
            const remplacante = remplacantesParDate.get(ancienne.date)
            return {
              ...ancienne,
              statut: 'remplacee' as const,
              ...(remplacante ? { remplaceeParId: remplacante } : {}),
            }
          })

        if (remplacees.length > 0) {
          await base.seancesPrevues.bulkPut(remplacees)
        }
      }

      await base.programmes.put(programme)
      if (aPoser.length > 0) {
        await base.seancesPrevues.bulkPut(aPoser)
      }
    },
  )
}
