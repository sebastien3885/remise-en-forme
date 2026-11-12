/**
 * Moteur de progression : module pur, sans dépendance à l'interface ni au
 * stockage (exigence du chapitre 9).
 *
 * Il fait deux choses, et rien d'autre :
 *
 * 1. `genererBilan` — à partir du réalisé d'une semaine, produire le bilan
 *    hebdomadaire du dimanche soir : statistiques, règles déclenchées,
 *    ajustements proposés, chacun avec son explication.
 * 2. `proposerSemaineSuivante` — appliquer ces ajustements à une semaine de
 *    séances pour montrer à quoi ressemblerait la suivante.
 *
 * Rien n'est appliqué d'autorité : le bilan naît avec la décision
 * `en-attente`, et c'est l'utilisateur qui accepte, refuse ou modifie
 * (chapitre 5).
 */
import { CONFIG_PROGRESSION, type ConfigProgression } from '../../config/progression'
import { ajouterJours, maintenantIso } from '../dates'
import type {
  Ajustement,
  BilanHebdo,
  DateIso,
  Exercice,
  Id,
  RessentiCharge,
  SeancePrevue,
  SeanceRealisee,
} from '../entites'
import { nouvelId as nouvelIdParDefaut, type FabriqueId } from '../identifiants'
import type { ContexteExercices } from '../profil/precautions'
import { seriesDeCharge, statistiquesDeLaSemaine } from './bilan'
import { ajusterMesures, levierDe } from './charge'
import { evaluerRegles, type LevierActif } from './regles'

const JOURS_PAR_SEMAINE = 7

export interface EntreeMoteur {
  programmeId: Id
  semaine: number
  /** Lundi et dimanche de la semaine évaluée. */
  debut: DateIso
  fin: DateIso
  /** Date de début du programme, pour numéroter les semaines de l'historique. */
  dateDebutProgramme: DateIso
  /** Séances prévues de la semaine : le dénominateur du taux de réalisation. */
  seancesPrevues: readonly SeancePrevue[]
  /** Séances réalisées de la semaine. */
  seancesRealisees: readonly SeanceRealisee[]
  /**
   * Toutes les séances réalisées du programme, semaine courante comprise.
   * Sert à repérer un palier, qui ne se voit pas sur une seule semaine.
   * À défaut, seules les séances de la semaine sont prises en compte.
   */
  historiqueRealise?: readonly SeanceRealisee[]
  /** Réponse à « Comment trouves-tu la charge ? ». */
  ressentiCharge?: RessentiCharge | null
  /** Bilans précédents, du plus récent au plus ancien. */
  bilansPrecedents?: readonly BilanHebdo[]
  bibliotheque: readonly Exercice[]
  precautions: ContexteExercices
  config?: ConfigProgression
  maintenant?: Date
  nouvelId?: FabriqueId
}

/** Produit le bilan hebdomadaire, en attente de décision. */
export function genererBilan(entree: EntreeMoteur): BilanHebdo {
  const config = entree.config ?? CONFIG_PROGRESSION
  const maintenant = entree.maintenant ?? new Date()
  const fabrique = entree.nouvelId ?? nouvelIdParDefaut

  const statistiques = statistiquesDeLaSemaine({
    semaine: entree.semaine,
    debut: entree.debut,
    fin: entree.fin,
    seancesPrevues: entree.seancesPrevues,
    seancesRealisees: entree.seancesRealisees,
    config,
  })

  const verdict = evaluerRegles({
    statistiques,
    ressentiCharge: entree.ressentiCharge ?? null,
    bilansPrecedents: entree.bilansPrecedents ?? [],
    seriesDeCharge: seriesDeCharge(
      entree.historiqueRealise ?? entree.seancesRealisees,
      entree.dateDebutProgramme,
    ),
    bibliotheque: entree.bibliotheque,
    precautions: entree.precautions,
    config,
  })

  return {
    id: fabrique(),
    programmeId: entree.programmeId,
    semaine: entree.semaine,
    debut: entree.debut,
    fin: entree.fin,
    statistiques,
    ressentiCharge: entree.ressentiCharge ?? null,
    reglesAppliquees: verdict.reglesAppliquees,
    ajustements: verdict.ajustements,
    decision: 'en-attente',
    genereLe: maintenantIso(maintenant),
  }
}

/** L'ajustement qui porte sur toute la semaine, s'il y en a un. */
export function ajustementGlobal(bilan: BilanHebdo): Ajustement | undefined {
  return bilan.ajustements.find((ajustement) => ajustement.exerciceId === undefined)
}

/** Les remplacements d'exercice proposés, de l'ancien vers le nouveau. */
export function remplacementsProposes(bilan: BilanHebdo): Map<Id, Id> {
  const remplacements = new Map<Id, Id>()
  for (const ajustement of bilan.ajustements) {
    if (ajustement.exerciceId && ajustement.remplacementParId) {
      remplacements.set(ajustement.exerciceId, ajustement.remplacementParId)
    }
  }
  return remplacements
}

export interface OptionsSemaineSuivante {
  /** Décalage appliqué aux dates. Une semaine par défaut. */
  decalageJours?: number
  maintenant?: Date
  nouvelId?: FabriqueId
  config?: ConfigProgression
}

/**
 * Construit la semaine suivante à partir d'une semaine de séances et du bilan.
 *
 * Trois choses se produisent, et pas une de plus :
 *
 * - les dates avancent d'une semaine, et le numéro de semaine avec elles ;
 * - les cibles du **seul levier retenu** sont multipliées par le facteur ;
 * - les exercices visés par un remplacement sont échangés, en gardant leurs
 *   cibles — une variante plus douce est déjà un allègement en soi.
 *
 * Les jours de repos sont recopiés tels quels : la semaine proposée garde donc
 * autant de jours de repos que celle dont elle est issue.
 */
export function proposerSemaineSuivante(
  seances: readonly SeancePrevue[],
  bilan: BilanHebdo,
  options: OptionsSemaineSuivante = {},
): SeancePrevue[] {
  const config = options.config ?? CONFIG_PROGRESSION
  const decalage = options.decalageJours ?? JOURS_PAR_SEMAINE
  const fabrique = options.nouvelId ?? nouvelIdParDefaut
  const creeLe = maintenantIso(options.maintenant ?? new Date())

  const global = ajustementGlobal(bilan)
  const facteur = global?.facteur ?? 1
  const levier = (global?.levier ?? 'duree') as LevierActif
  const remplacements = remplacementsProposes(bilan)

  return seances
    .filter((seance) => seance.statut !== 'annulee' && seance.statut !== 'remplacee')
    .map((seance) => ({
      id: fabrique(),
      programmeId: seance.programmeId,
      date: ajouterJours(seance.date, decalage),
      semaine: seance.semaine + 1,
      type: seance.type,
      titre: seance.titre,
      exercices: seance.exercices.map((exercice) => {
        const remplacant = remplacements.get(exercice.exerciceId)
        const concerneParLeLevier = levierDe(exercice.cibles) === levier

        return {
          ...exercice,
          exerciceId: remplacant ?? exercice.exerciceId,
          cibles: concerneParLeLevier
            ? ajusterMesures(exercice.cibles, levier, facteur, config)
            : { ...exercice.cibles },
        }
      }),
      statut: 'a-faire' as const,
      creeLe,
      ...(seance.notes ? { notes: seance.notes } : {}),
    }))
}

/**
 * Vrai si la semaine comporte assez de jours de repos complets.
 *
 * Le chapitre 3 en impose au moins un, et le chapitre 10 le répète parmi les
 * garde-fous de santé. Un jour de repos est un jour sans aucune séance
 * d'entraînement : une séance de type `repos` en est un, l'absence de séance
 * aussi.
 */
export function joursDeReposSuffisants(
  seances: readonly SeancePrevue[],
  config: ConfigProgression = CONFIG_PROGRESSION,
): boolean {
  const joursActifs = new Set(
    seances
      .filter(
        (seance) =>
          seance.type !== 'repos' &&
          seance.statut !== 'annulee' &&
          seance.statut !== 'remplacee',
      )
      .map((seance) => seance.date),
  )

  const repos = JOURS_PAR_SEMAINE - joursActifs.size
  return repos >= config.plafonds.joursDeReposParSemaineMinimum
}
