/**
 * Ce que l'écran Semaine a besoin de savoir, jour par jour.
 *
 * Le hook prépare surtout la **comparaison du prévu et du réalisé**, exercice
 * par exercice : c'est le critère d'acceptation de l'étape 2, et le faire ici
 * évite que l'écran recoupe deux listes à la main au milieu du rendu.
 */
import { useLiveQuery } from 'dexie-react-hooks'

import { joursDeLaSemaine, numeroDeSemaineProgramme, plageDeSemaine } from '../../domaine/dates'
import type {
  DateIso,
  Id,
  Programme,
  SeancePrevue,
  SeanceRealisee,
} from '../../domaine/entites'
import { seancesARealiser } from '../../domaine/progression/bilan'
import { depots } from '../../stockage'
import { formaterMesures } from '../libelles'

export interface LigneComparaison {
  exerciceId: Id
  nom: string
  prevu: string
  /** Vide tant que la séance n'a pas été saisie. */
  reel: string
  /** Vrai quand le réel diffère du prévu : la ligne mérite l'œil. */
  differe: boolean
}

export interface JourDeLaSemaine {
  date: DateIso
  prevue: SeancePrevue | undefined
  realisee: SeanceRealisee | undefined
  /** Activités notées en plus de la séance prévue. */
  improvisees: SeanceRealisee[]
  comparaison: LigneComparaison[]
}

export interface VueSemaine {
  debut: DateIso
  fin: DateIso
  numero: number
  programme: Programme | undefined
  jours: JourDeLaSemaine[]
  prevues: number
  faites: number
}

export function useSemaine(reference: DateIso): VueSemaine | undefined {
  return useLiveQuery(async (): Promise<VueSemaine> => {
    const { debut, fin } = plageDeSemaine(reference)

    const [programme, prevues, realisees, bibliotheque] = await Promise.all([
      depots.programmes.actif(),
      depots.seances.prevues.parPlage(debut, fin),
      depots.seances.realisees.parPlage(debut, fin),
      depots.exercices.tous(),
    ])

    const nomParId = new Map(bibliotheque.map((exercice) => [exercice.id, exercice.nom]))

    const jours: JourDeLaSemaine[] = joursDeLaSemaine(reference).map((date) => {
      const prevue = prevues.find(
        (seance) =>
          seance.date === date && seance.statut !== 'annulee' && seance.statut !== 'remplacee',
      )

      // Une activité improvisée ne remplace jamais la séance prévue : les
      // deux ont eu lieu, et la semaine doit montrer les deux.
      const duJour = realisees.filter((seance) => seance.date === date)
      const nonLiees = duJour.filter((seance) => seance.seancePrevueId === undefined)
      const realisee = prevue
        ? duJour.find((seance) => seance.seancePrevueId === prevue.id)
        : nonLiees[0]
      const improvisees = prevue ? nonLiees : nonLiees.slice(1)

      const comparaison: LigneComparaison[] = (prevue?.exercices ?? [])
        .slice()
        .sort((a, b) => a.ordre - b.ordre)
        .map((exercicePrevu) => {
          const fait = realisee?.exercices.find(
            (candidat) => candidat.exerciceId === exercicePrevu.exerciceId,
          )
          const prevu = formaterMesures(exercicePrevu.cibles)
          const reel = fait ? formaterMesures(fait.reel) : ''

          return {
            exerciceId: exercicePrevu.exerciceId,
            nom: nomParId.get(exercicePrevu.exerciceId) ?? exercicePrevu.exerciceId,
            prevu,
            reel,
            differe: reel !== '' && reel !== prevu,
          }
        })

      return {
        date,
        prevue,
        realisee,
        improvisees,
        comparaison,
      }
    })

    return {
      debut,
      fin,
      numero: programme ? numeroDeSemaineProgramme(programme.dateDebut, reference) : 0,
      programme,
      jours,
      prevues: seancesARealiser(prevues).length,
      faites: realisees.filter(
        (seance) => seance.statut === 'faite' || seance.statut === 'partielle',
      ).length,
    }
  }, [reference])
}
