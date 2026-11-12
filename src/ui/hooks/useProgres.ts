/**
 * Ce que l'écran Progrès a besoin de savoir pour une semaine donnée.
 *
 * Les statistiques sont recalculées en direct à partir du réalisé, même quand
 * aucun bilan n'a encore été fait : l'écran peut donc montrer où en est la
 * semaine en cours sans rien décider.
 */
import { useLiveQuery } from 'dexie-react-hooks'

import { aujourdhui, numeroDeSemaineProgramme, plageDeSemaine } from '../../domaine/dates'
import type {
  BilanHebdo,
  DateIso,
  Programme,
  StatistiquesSemaine,
} from '../../domaine/entites'
import { statistiquesDeLaSemaine } from '../../domaine/progression/bilan'
import { depots } from '../../stockage'

export interface VueProgres {
  debut: DateIso
  fin: DateIso
  numero: number
  programme: Programme | undefined
  /** Le bilan de cette semaine, s'il a déjà été fait. */
  bilan: BilanHebdo | undefined
  /** L'état de la semaine, calculé en direct sur le réalisé. */
  statistiques: StatistiquesSemaine
  /** Faux tant que le dimanche n'est pas passé. */
  semaineTerminee: boolean
  /** Un bilan d'une autre semaine attend une décision. */
  bilanEnAttenteAilleurs: BilanHebdo | undefined
}

export function useProgres(reference: DateIso): VueProgres | undefined {
  return useLiveQuery(async (): Promise<VueProgres> => {
    const { debut, fin } = plageDeSemaine(reference)
    const programme = await depots.programmes.actif()

    const [seancesPrevues, seancesRealisees, bilans] = await Promise.all([
      depots.seances.prevues.parPlage(debut, fin),
      depots.seances.realisees.parPlage(debut, fin),
      depots.bilans.historique(),
    ])

    const numero = programme ? numeroDeSemaineProgramme(programme.dateDebut, reference) : 0
    const bilan = bilans.find((candidat) => candidat.debut === debut)

    return {
      debut,
      fin,
      numero,
      programme,
      bilan,
      statistiques: statistiquesDeLaSemaine({
        semaine: numero,
        debut,
        fin,
        seancesPrevues,
        seancesRealisees,
      }),
      semaineTerminee: aujourdhui() > fin,
      bilanEnAttenteAilleurs: bilans.find(
        (candidat) => candidat.decision === 'en-attente' && candidat.debut !== debut,
      ),
    }
  }, [reference])
}
