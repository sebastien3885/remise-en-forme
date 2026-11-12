/**
 * Entité Profil (chapitre 7) : les paramètres de l'utilisateur.
 *
 * Il n'y en a qu'un, d'où la clé fixe `ID_PROFIL` : l'application est
 * mono-utilisateur (chapitre 2).
 */
import type {
  DateIso,
  HorodatageIso,
  Id,
  ImpactGenou,
  Materiel,
  Unites,
} from './communs'

/** Clé unique du profil : une seule ligne dans la table. */
export const ID_PROFIL = 'profil' as const

/**
 * Antécédent médical déclaré. Il est déclaré par l’utilisateur.
 */
export interface Antecedent {
  id: Id
  /** Zone du corps, en slug : `genou`, `epaule-gauche`, ... */
  zone: string
  description: string
  /** Année de l'opération ou du diagnostic, si connue. */
  depuis?: number
}

/**
 * Précautions appliquées par défaut (chapitre 10). Ce sont des garde-fous, pas
 * un avis médical : l'utilisateur peut les lever sous sa responsabilité.
 */
export interface Precautions {
  /** Impact maximal toléré sur le genou. `faible` par défaut. */
  impactGenouMaximal: ImpactGenou
  /** Écarter les mouvements à flexion marquée (ex. battement de brasse). */
  exclureFlexionMarquee: boolean
  /** Exercices exclus nommément, en plus des règles ci-dessus. */
  exercicesExclusIds: Id[]
}

/** Niveau de départ mesuré au questionnaire (chapitre 3). */
export interface NiveauDepart {
  /** Distance de marche confortable, en mètres. */
  marcheConfortableMetres?: number
  /** Nombre de longueurs de piscine nageables d'affilée. */
  longueursNageables?: number
  pompesPossibles?: number
  squatsPossibles?: number
}

/**
 * Réponses à la question d'alerte du questionnaire de départ (chapitre 10).
 * Une réponse positive déclenche un message invitant à un avis médical avant
 * de commencer ; elle ne bloque pas l'application.
 */
export interface AlerteSante {
  douleursThoraciques: boolean
  malaises: boolean
  problemesCardiaquesConnus: boolean
  repondueLe: HorodatageIso
}

/** Objectif personnel modifiable, avec jauge d'avancement (chapitre 5). */
export interface ObjectifPersonnel {
  id: Id
  /** Ce que l'utilisateur veut atteindre, en clair : « 30 min de marche continue ». */
  libelle: string
  /** Ce qu'on mesure : `dureeMinutes`, `longueurs`, `distanceMetres`, ... */
  indicateur: string
  cible: number
  unite: string
  atteintLe?: DateIso
}

/**
 * Le défi de la semaine, choisi dans la fiche d'éducation alimentaire
 * (chapitre 6 : « un seul défi par semaine, choisi dans la fiche »).
 */
export interface DefiChoisi {
  ficheId: Id
  libelle: string
  /** Lundi de la semaine pour laquelle il a été choisi. */
  debutSemaine: DateIso
  choisiLe: HorodatageIso
}

export interface Profil {
  id: typeof ID_PROFIL
  dateDebut: DateIso
  materiel: Materiel[]
  antecedents: Antecedent[]
  precautions: Precautions
  niveauDepart: NiveauDepart
  objectifs: ObjectifPersonnel[]
  unites: Unites
  alerteSante: AlerteSante | null
  /** L'avertissement du premier lancement a été lu (chapitre 10). */
  avertissementSanteAccepte: boolean
  /** Objectif d'hydratation quotidien, en verres (chapitre 6). */
  objectifVerresEau: number
  /** Masquer le poids si le suivi devient anxiogène (chapitre 6). */
  masquerPoids: boolean
  /** Un seul à la fois : c'est tout l'intérêt (chapitre 6). */
  defiEnCours?: DefiChoisi
  misAJourLe: HorodatageIso
}
