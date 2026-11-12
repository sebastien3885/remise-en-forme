/**
 * Entité Bilan hebdomadaire (chapitre 7) : synthèse et décision.
 *
 * Un bilan regroupe les séances de sa semaine, applique les règles du
 * chapitre 5 et propose des ajustements. L'utilisateur valide ou modifie avant
 * que ce soit appliqué : c'est l'acceptation du bilan qui crée la nouvelle
 * version du programme.
 */
import type {
  DateIso,
  HorodatageIso,
  Id,
  Levier,
  MotifAbandon,
  NiveauDouleur,
} from './communs'

/** Réponse à la question de fin de semaine (chapitre 5). */
export const RESSENTIS_CHARGE = ['trop-facile', 'juste-bien', 'trop-dur'] as const
export type RessentiCharge = (typeof RESSENTIS_CHARGE)[number]

/** Où en est l'utilisateur de sa décision sur le bilan. */
export const DECISIONS_BILAN = ['en-attente', 'accepte', 'refuse', 'modifie'] as const
export type DecisionBilan = (typeof DECISIONS_BILAN)[number]

/** Les règles de décision du tableau du chapitre 5, une clé par ligne. */
export const CLES_REGLE = [
  'augmenter',
  'maintenir',
  'reduire',
  'douleur-repetee',
  'semaine-allegee',
  'palier-atteint',
] as const
export type CleRegle = (typeof CLES_REGLE)[number]

/** Ce que le moteur a calculé sur la semaine, à partir du réalisé seulement. */
export interface StatistiquesSemaine {
  semaine: number
  debut: DateIso
  fin: DateIso
  seancesPrevues: number
  seancesFaites: number
  seancesPartielles: number
  seancesSautees: number
  /** Séances notées sans avoir été prévues. */
  seancesImprovisees: number
  /**
   * Taux de réalisation entre 0 et 1. Le poids d'une séance partielle est
   * réglé dans la configuration de progression, pas codé en dur.
   */
  tauxRealisation: number
  /** Moyenne de l'effort ressenti, `null` si aucune séance n'a été faite. */
  effortMoyen: number | null
  energieMoyenne: number | null
  douleurMaximale: NiveauDouleur
  /** Nombre de signalements de douleur, par exercice. */
  douleursParExercice: Record<Id, number>
  /** Nombre de séances sautées ou partielles, par motif. */
  motifs: Partial<Record<MotifAbandon, number>>
}

/** Une règle qui s'est déclenchée, avec son explication en clair. */
export interface RegleAppliquee {
  cle: CleRegle
  libelle: string
  /** Exigence du chapitre 5 : « +10 % car 3 séances sur 3 réalisées, effort 5/10 ». */
  explication: string
}

/** Un changement proposé pour la semaine suivante. */
export interface Ajustement {
  /** Règle dont découle cet ajustement. */
  regle: CleRegle
  /** Levier touché. Un seul levier bouge par bilan (chapitre 5). */
  levier: Levier
  /** Facteur appliqué à la charge : 1.1 pour +10 %, 0.8 pour -20 %, 1 si inchangé. */
  facteur: number
  /** Exercice visé, absent si l'ajustement porte sur tout le programme. */
  exerciceId?: Id
  /** Exercice de remplacement proposé (variante plus douce ou plus difficile). */
  remplacementParId?: Id
  /** Inviter à prendre un avis médical (chapitres 5 et 10). */
  avisMedicalSuggere?: boolean
  explication: string
}

export interface BilanHebdo {
  id: Id
  programmeId: Id
  semaine: number
  debut: DateIso
  fin: DateIso
  statistiques: StatistiquesSemaine
  /** Réponse de l'utilisateur à « Comment trouves-tu la charge ? ». */
  ressentiCharge: RessentiCharge | null
  reglesAppliquees: RegleAppliquee[]
  ajustements: Ajustement[]
  decision: DecisionBilan
  /** Version de programme créée quand les ajustements ont été acceptés. */
  programmeGenereId?: Id
  genereLe: HorodatageIso
  decideLe?: HorodatageIso
}
