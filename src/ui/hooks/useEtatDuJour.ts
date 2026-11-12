/**
 * Tout ce que l'écran « Aujourd'hui » a besoin de savoir, en une requête.
 *
 * Le hook ne décide de rien : il rassemble la séance prévue du jour, sa
 * réalisation éventuelle, les exercices qu'elle contient et l'état de la
 * semaine. Les règles d'affichage restent dans l'écran, les règles métier
 * dans le domaine.
 */
import { useLiveQuery } from 'dexie-react-hooks'

import { aujourdhui, numeroDeSemaineProgramme, plageDeSemaine } from '../../domaine/dates'
import type {
  DateIso,
  Exercice,
  ExercicePrevu,
  Hydratation,
  Programme,
  SeancePrevue,
  SeanceRealisee,
} from '../../domaine/entites'
import { seancesARealiser } from '../../domaine/progression/bilan'
import { depots } from '../../stockage'

export interface ExerciceDuJour extends ExercicePrevu {
  /** Absent si le plan référence un exercice retiré de la bibliothèque. */
  exercice: Exercice | undefined
}

export interface EtatSemaine {
  numero: number
  prevues: number
  faites: number
}

export interface EtatDuJour {
  date: DateIso
  programme: Programme | undefined
  prevue: SeancePrevue | undefined
  realisee: SeanceRealisee | undefined
  /** Activités notées en plus de la séance du jour. */
  improvisees: SeanceRealisee[]
  exercices: ExerciceDuJour[]
  semaine: EtatSemaine
  hydratation: Hydratation | undefined
  objectifVerres: number
}

export function useEtatDuJour(date: DateIso = aujourdhui()): EtatDuJour | undefined {
  return useLiveQuery(async (): Promise<EtatDuJour> => {
    const [profil, programme] = await Promise.all([
      depots.profil.lire(),
      depots.programmes.actif(),
    ])

    const duJour = await depots.seances.prevues.parDate(date)
    const prevue = duJour.find(
      (seance) => seance.statut !== 'annulee' && seance.statut !== 'remplacee',
    )

    // Une activité improvisée ne remplace jamais la séance du jour : les deux
    // ont eu lieu, et l'écran doit montrer les deux.
    const realiseesDuJour = await depots.seances.realisees.parDate(date)
    const nonLiees = realiseesDuJour.filter((seance) => seance.seancePrevueId === undefined)
    const realisee = prevue
      ? realiseesDuJour.find((seance) => seance.seancePrevueId === prevue.id)
      : nonLiees[0]
    const improvisees = prevue ? nonLiees : nonLiees.slice(1)

    const exercices: ExerciceDuJour[] = prevue
      ? await Promise.all(
          [...prevue.exercices]
            .sort((a, b) => a.ordre - b.ordre)
            .map(async (exercicePrevu) => ({
              ...exercicePrevu,
              exercice: await depots.exercices.parId(exercicePrevu.exerciceId),
            })),
        )
      : []

    const { debut, fin } = plageDeSemaine(date)
    const [prevuesSemaine, realiseesSemaine] = await Promise.all([
      depots.seances.prevues.parPlage(debut, fin),
      depots.seances.realisees.parPlage(debut, fin),
    ])

    return {
      date,
      programme,
      prevue,
      realisee,
      improvisees,
      exercices,
      semaine: {
        numero: programme ? numeroDeSemaineProgramme(programme.dateDebut, date) : 0,
        prevues: seancesARealiser(prevuesSemaine).length,
        faites: realiseesSemaine.filter(
          (seance) => seance.statut === 'faite' || seance.statut === 'partielle',
        ).length,
      },
      hydratation: await depots.hydratation.duJour(date),
      objectifVerres: profil?.objectifVerresEau ?? 8,
    }
  }, [date])
}
