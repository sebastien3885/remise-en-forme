/**
 * Lecture de l'historique : séries tenues, records, progression par exercice
 * (chapitre 4, « Consultation »).
 *
 * Module pur, comme le reste du moteur : il reçoit des séances et rend des
 * chiffres. Rien n'est lu ni écrit ici.
 *
 * Une décision à écrire : **une semaine est « tenue » au même seuil que
 * celui de l'augmentation de charge**, 80 % par défaut. C'est aussi la cible
 * du chapitre 1 — « séances réalisées / prévues : au moins 80 % ». Avoir deux
 * barres différentes, une pour progresser et une pour la série, donnerait des
 * encouragements qui ne veulent rien dire.
 */
import { CONFIG_PROGRESSION, type ConfigProgression } from '../../config/progression'
import { ajouterJours, lundiDeLaSemaine, numeroDeSemaineProgramme } from '../dates'
import type {
  ChampCharge,
  DateIso,
  Id,
  SeancePrevue,
  SeanceRealisee,
} from '../entites'
import { statistiquesDeLaSemaine } from './bilan'
import { chargeDe } from './charge'

// ------------------------------------------------------ semaines tenues

export interface SemaineTenue {
  semaine: number
  debut: DateIso
  fin: DateIso
  tauxRealisation: number
  effortMoyen: number | null
  tenue: boolean
}

/**
 * Récapitule chaque semaine écoulée du programme, de la plus ancienne à la
 * plus récente. Les semaines à venir ne sont pas reprises : elles n'ont rien
 * à récapituler.
 */
export function semainesTenues(
  seancesPrevues: readonly SeancePrevue[],
  seancesRealisees: readonly SeanceRealisee[],
  dateDebutProgramme: DateIso,
  jusqua: DateIso,
  config: ConfigProgression = CONFIG_PROGRESSION,
): SemaineTenue[] {
  const premierLundi = lundiDeLaSemaine(dateDebutProgramme)
  const derniereSemaine = numeroDeSemaineProgramme(dateDebutProgramme, jusqua)
  const seuil = config.augmenter.tauxRealisationAPartirDe

  const semaines: SemaineTenue[] = []

  for (let numero = 1; numero <= derniereSemaine; numero += 1) {
    const debut = ajouterJours(premierLundi, (numero - 1) * 7)
    const fin = ajouterJours(debut, 6)

    const statistiques = statistiquesDeLaSemaine({
      semaine: numero,
      debut,
      fin,
      seancesPrevues: seancesPrevues.filter(
        (seance) => seance.date >= debut && seance.date <= fin,
      ),
      seancesRealisees: seancesRealisees.filter(
        (seance) => seance.date >= debut && seance.date <= fin,
      ),
      config,
    })

    // Une semaine sans rien de prévu ni de fait ne rompt pas une série : elle
    // n'a simplement rien à dire.
    const vide = statistiques.seancesPrevues === 0 && statistiques.seancesFaites === 0

    semaines.push({
      semaine: numero,
      debut,
      fin,
      tauxRealisation: statistiques.tauxRealisation,
      effortMoyen: statistiques.effortMoyen,
      tenue: !vide && statistiques.tauxRealisation >= seuil,
    })
  }

  return semaines
}

/**
 * Nombre de semaines tenues d'affilée, en remontant depuis la dernière
 * semaine **terminée**. La semaine en cours ne compte pas : elle n'est pas
 * encore jouée, et la voir casser la série chaque lundi serait décourageant.
 */
export function serieEnCours(
  semaines: readonly SemaineTenue[],
  aujourdHui: DateIso,
): number {
  const terminees = semaines.filter((semaine) => semaine.fin < aujourdHui)

  let compte = 0
  for (let index = terminees.length - 1; index >= 0; index -= 1) {
    if (!terminees[index]?.tenue) break
    compte += 1
  }
  return compte
}

// -------------------------------------------------------------- records

export interface RecordExercice {
  exerciceId: Id
  nom: string
  champ: ChampCharge
  /** Meilleure charge réalisée, et le jour où elle l'a été. */
  meilleur: number
  dateDuMeilleur: DateIso
  /** Dernière charge réalisée, pour situer le record. */
  dernier: number
  nombreDeSeances: number
  /** Progression semaine après semaine, pour la courbe. */
  points: { semaine: number; valeur: number }[]
}

/**
 * Meilleur résultat et progression par exercice (chapitre 4, « fiche par
 * exercice »).
 *
 * Seules les séances faites ou faites en partie comptent, et seules les
 * mesures portant sur la même grandeur que la première rencontrée : on ne
 * compare pas des minutes à des répétitions.
 */
export function recordsParExercice(
  seances: readonly SeanceRealisee[],
  nomParId: ReadonlyMap<Id, string>,
  dateDebutProgramme: DateIso,
): RecordExercice[] {
  interface Accumulateur {
    champ: ChampCharge
    meilleur: number
    dateDuMeilleur: DateIso
    dernier: number
    derniereDate: DateIso
    nombreDeSeances: number
    parSemaine: Map<number, number>
  }

  const parExercice = new Map<Id, Accumulateur>()

  const retenues = [...seances]
    .filter((seance) => seance.statut === 'faite' || seance.statut === 'partielle')
    .sort((a, b) => a.date.localeCompare(b.date))

  for (const seance of retenues) {
    const semaine = numeroDeSemaineProgramme(dateDebutProgramme, seance.date)

    for (const exercice of seance.exercices) {
      const charge = chargeDe(exercice.reel)
      if (!charge) continue

      const existant = parExercice.get(exercice.exerciceId)

      if (!existant) {
        parExercice.set(exercice.exerciceId, {
          champ: charge.champ,
          meilleur: charge.valeur,
          dateDuMeilleur: seance.date,
          dernier: charge.valeur,
          derniereDate: seance.date,
          nombreDeSeances: 1,
          parSemaine: new Map([[semaine, charge.valeur]]),
        })
        continue
      }

      // Grandeur différente : incomparable, on laisse de côté.
      if (existant.champ !== charge.champ) continue

      existant.nombreDeSeances += 1
      if (charge.valeur > existant.meilleur) {
        existant.meilleur = charge.valeur
        existant.dateDuMeilleur = seance.date
      }
      if (seance.date >= existant.derniereDate) {
        existant.dernier = charge.valeur
        existant.derniereDate = seance.date
      }
      const dejaVue = existant.parSemaine.get(semaine)
      existant.parSemaine.set(
        semaine,
        dejaVue === undefined ? charge.valeur : Math.max(dejaVue, charge.valeur),
      )
    }
  }

  return [...parExercice.entries()]
    .map(([exerciceId, accumule]) => ({
      exerciceId,
      nom: nomParId.get(exerciceId) ?? exerciceId,
      champ: accumule.champ,
      meilleur: accumule.meilleur,
      dateDuMeilleur: accumule.dateDuMeilleur,
      dernier: accumule.dernier,
      nombreDeSeances: accumule.nombreDeSeances,
      points: [...accumule.parSemaine.entries()]
        .map(([semaine, valeur]) => ({ semaine, valeur }))
        .sort((a, b) => a.semaine - b.semaine),
    }))
    .sort((a, b) => b.nombreDeSeances - a.nombreDeSeances || a.nom.localeCompare(b.nom))
}
