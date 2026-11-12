/**
 * L'historique du programme en cours : semaines tenues, série, records.
 *
 * Les séances traversent les versions de programme — une révision en crée une
 * nouvelle — donc tout se lit par **plage de dates**, pas par identifiant de
 * programme, et les séances remplacées ou annulées sont écartées par les
 * fonctions du domaine.
 */
import { useLiveQuery } from 'dexie-react-hooks'

import { aujourdhui } from '../../domaine/dates'
import type { Programme } from '../../domaine/entites'
import {
  recordsParExercice,
  serieEnCours,
  semainesTenues,
  type RecordExercice,
  type SemaineTenue,
} from '../../domaine/progression/historique'
import { depots } from '../../stockage'

export interface VueHistorique {
  programme: Programme | undefined
  semaines: SemaineTenue[]
  /** Semaines tenues d'affilée, la semaine en cours exclue. */
  serie: number
  records: RecordExercice[]
}

export function useHistorique(): VueHistorique | undefined {
  return useLiveQuery(async (): Promise<VueHistorique> => {
    const programme = await depots.programmes.actif()
    const jour = aujourdhui()

    if (!programme) {
      return { programme: undefined, semaines: [], serie: 0, records: [] }
    }

    const [prevues, realisees, bibliotheque] = await Promise.all([
      depots.seances.prevues.parPlage(programme.dateDebut, jour),
      depots.seances.realisees.parPlage(programme.dateDebut, jour),
      depots.exercices.tous(),
    ])

    const semaines = semainesTenues(prevues, realisees, programme.dateDebut, jour)
    const nomParId = new Map(bibliotheque.map((exercice) => [exercice.id, exercice.nom]))

    return {
      programme,
      semaines,
      serie: serieEnCours(semaines, jour),
      records: recordsParExercice(realisees, nomParId, programme.dateDebut),
    }
  }, [])
}
