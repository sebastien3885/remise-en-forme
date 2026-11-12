/**
 * Ce que l'écran Alimentation a besoin de savoir pour une journée.
 *
 * Le score de régularité porte sur la semaine entière, pas sur le jour : c'est
 * ainsi que le chapitre 6 le définit, « à côté du bilan sportif ».
 */
import { useLiveQuery } from 'dexie-react-hooks'

import {
  evaluerJour,
  jourTenu,
  scoreDeRegularite,
  type EtatRepere,
  type ScoreRegularite,
} from '../../domaine/alimentation/reperes'
import {
  tendanceDuPoids,
  tendanceDuTourDeTaille,
  type Tendance,
} from '../../domaine/alimentation/tendance'
import { ficheDeLaSemaine, type Fiche } from '../../domaine/alimentation/fiches'
import {
  joursDeLaSemaine,
  numeroDeSemaineProgramme,
  plageDeSemaine,
} from '../../domaine/dates'
import type {
  DateIso,
  DefiChoisi,
  Hydratation,
  MesureCorporelle,
  Repas,
} from '../../domaine/entites'
import { depots } from '../../stockage'

export interface VueAlimentation {
  date: DateIso
  repas: Repas[]
  hydratation: Hydratation | undefined
  objectifVerres: number
  reperes: EtatRepere[]
  tenu: boolean
  score: ScoreRegularite
  tendancePoids: Tendance
  tendanceTaille: Tendance
  derniereMesure: MesureCorporelle | undefined
  /** Option du chapitre 6 : masquer le poids si le suivi devient stressant. */
  masquerPoids: boolean
  /** Lundi de la semaine affichée. */
  debutSemaine: DateIso
  /** La fiche d'éducation alimentaire de la semaine (chapitre 6). */
  fiche: Fiche
  /** Le défi en cours, s'il a été choisi pour cette semaine. */
  defi: DefiChoisi | undefined
}

export function useAlimentation(date: DateIso): VueAlimentation | undefined {
  return useLiveQuery(async (): Promise<VueAlimentation> => {
    const { debut, fin } = plageDeSemaine(date)

    const [profil, programme, repas, hydratation, repasDeLaSemaine, mesures] =
      await Promise.all([
        depots.profil.lire(),
        depots.programmes.actif(),
        depots.repas.duJour(date),
        depots.hydratation.duJour(date),
        depots.repas.parPlage(debut, fin),
        depots.mesures.toutes(),
      ])

    // Sans programme, on commence quand même par la première fiche.
    const semaine = programme ? numeroDeSemaineProgramme(programme.dateDebut, date) : 1
    const defi = profil?.defiEnCours

    const hydratationsDeLaSemaine = await Promise.all(
      joursDeLaSemaine(date).map(async (jour) => ({
        jour,
        hydratation: await depots.hydratation.duJour(jour),
      })),
    )

    const joursAlimentaires = hydratationsDeLaSemaine.map(({ jour, hydratation: eau }) => ({
      date: jour,
      repas: repasDeLaSemaine.filter((candidat) => candidat.date === jour),
      hydratation: eau,
    }))

    const reperes = evaluerJour({ date, repas, hydratation })

    return {
      date,
      repas,
      hydratation,
      objectifVerres: profil?.objectifVerresEau ?? 8,
      reperes,
      tenu: jourTenu(reperes),
      score: scoreDeRegularite(joursAlimentaires),
      tendancePoids: tendanceDuPoids(mesures),
      tendanceTaille: tendanceDuTourDeTaille(mesures),
      derniereMesure: mesures[mesures.length - 1],
      masquerPoids: profil?.masquerPoids ?? false,
      debutSemaine: debut,
      fiche: ficheDeLaSemaine(semaine),
      // Un défi choisi la semaine dernière n'est plus celui de cette semaine.
      defi: defi?.debutSemaine === debut ? defi : undefined,
    }
  }, [date])
}
