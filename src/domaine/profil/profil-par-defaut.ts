/**
 * Profil de départ.
 *
 * Il est prérempli avec ce que le cahier des charges énonce déjà, pour que
 * l'application soit utilisable avant même d'avoir rempli le questionnaire :
 * les précautions du chapitre 10 et les deux objectifs chiffrés des
 * indicateurs de réussite à 12 semaines.
 *
 * **Aucun antécédent médical n'est écrit ici.** Un profil de départ ne
 * suppose rien du corps de qui l'installe : les antécédents se déclarent, et
 * la prudence par défaut ne vient pas d'eux mais des précautions ci-dessous.
 *
 * Ce qui relève d'une mesure — distance de marche confortable, longueurs
 * nageables, nombre de pompes — reste vide : ce sont des valeurs à constater,
 * pas à deviner. Le questionnaire de l'étape 2 les renseignera.
 */
import { aujourdhui, maintenantIso } from '../dates'
import { ID_PROFIL, type Profil } from '../entites'

/**
 * Objectif d'hydratation par défaut, en verres. Un repère courant, pas une
 * cible médicale : le chapitre 6 veut que toute valeur chiffrée reste
 * modifiable par l'utilisateur.
 */
export const OBJECTIF_VERRES_EAU_PAR_DEFAUT = 8

export interface OptionsProfilParDefaut {
  /** Date de début du programme. Par défaut, aujourd'hui. */
  dateDebut?: string
  /** Instant d'écriture, injectable pour les tests. */
  maintenant?: Date
}

export function profilParDefaut(options: OptionsProfilParDefaut = {}): Profil {
  const maintenant = options.maintenant ?? new Date()
  const dateDebut = options.dateDebut ?? aujourdhui(maintenant)

  return {
    id: ID_PROFIL,
    dateDebut,

    /**
     * Le programme de départ du chapitre 3 comprend du gainage et une séance
     * de natation : le tapis et la piscine sont donc cochés d'emblée. Le vélo
     * ne l'est pas, faute d'information.
     */
    materiel: ['tapis', 'piscine'],

    /** À déclarer par l'utilisateur ; rien n'est supposé de son corps. */
    antecedents: [],

    /**
     * Précautions du chapitre 10, à la lettre : sont exclus la course, les
     * sauts et les squats profonds — c'est-à-dire les exercices à impact
     * `eleve`. Les mouvements à flexion marquée sont *signalés*, pas exclus,
     * donc `exclureFlexionMarquee` reste à faux.
     *
     * Ce plafond ne suppose aucune blessure : il vaut pour une reprise après
     * une longue interruption, où les articulations encaissent mal l'impact.
     * L'utilisateur le resserre à `faible` si un genou se plaint, ou l'ouvre
     * sous sa responsabilité.
     */
    precautions: {
      impactGenouMaximal: 'modere',
      exclureFlexionMarquee: false,
      exercicesExclusIds: [],
    },

    /** À constater au questionnaire, pas à supposer. */
    niveauDepart: {},

    /** Les deux cibles chiffrées des indicateurs de réussite du chapitre 1. */
    objectifs: [
      {
        id: 'marche-30-min',
        libelle: 'Marcher 30 minutes d’affilée sans essoufflement excessif',
        indicateur: 'dureeMinutes',
        cible: 30,
        unite: 'min',
      },
      {
        id: 'natation-4-longueurs',
        libelle: 'Nager 4 longueurs sans arrêt',
        indicateur: 'longueurs',
        cible: 4,
        unite: 'longueurs',
      },
    ],

    unites: 'metrique',

    /** Le questionnaire d'alerte du chapitre 10 n'a pas encore été rempli. */
    alerteSante: null,

    /** L'avertissement du premier lancement doit encore être montré. */
    avertissementSanteAccepte: false,

    objectifVerresEau: OBJECTIF_VERRES_EAU_PAR_DEFAUT,
    masquerPoids: false,
    misAJourLe: maintenantIso(maintenant),
  }
}

/**
 * Vrai si la réponse au questionnaire d'alerte justifie d'inviter à un avis
 * médical avant de commencer (chapitre 10). L'application invite, elle ne
 * bloque pas et ne diagnostique rien.
 */
export function avisMedicalConseille(profil: Profil): boolean {
  const alerte = profil.alerteSante
  if (!alerte) return false
  return alerte.douleursThoraciques || alerte.malaises || alerte.problemesCardiaquesConnus
}
