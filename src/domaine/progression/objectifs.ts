/**
 * Avancement des objectifs personnels (chapitres 1 et 5).
 *
 * Le chapitre 1 fixe deux cibles chiffrées — marcher 30 minutes d'affilée,
 * nager 4 longueurs sans arrêt — et le chapitre 5 veut qu'elles soient
 * suivies. Ce module dit, pour chaque objectif, où on en est.
 *
 * Module pur, comme le reste du moteur : il reçoit des séances réalisées et
 * rend des chiffres. Rien n'est lu ni écrit ici.
 *
 * **Trois décisions qui changent le résultat.**
 *
 * 1. **Le réalisé fait foi** (chapitre 4). Un objectif n'avance pas parce que
 *    le programme prévoit 30 minutes, mais parce que 30 minutes ont été
 *    faites. Seules les séances `faite` et `partielle` comptent.
 * 2. **On ne somme jamais.** « Marcher 30 minutes d'affilée » se mesure sur un
 *    exercice d'une séance, pas sur le total de la semaine : trois marches de
 *    dix minutes ne valent pas la demi-heure annoncée. C'est aussi pour cela
 *    qu'on lit la valeur brute du champ et non le volume `séries × répétitions`
 *    du moteur de charge — vingt pompes d'affilée, ce n'est pas deux fois dix.
 * 3. **Un objectif qu'on ne sait pas mesurer reste hors jeu**, ni tenu ni
 *    manqué, et son absence de jauge est dite avec un mot. Afficher 0 % pour
 *    un objectif que l'application ne sait pas lire serait un reproche
 *    fabriqué — la même règle que pour les repères alimentaires du chapitre 10.
 */
import {
  CHAMPS_CHARGE,
  type ChampCharge,
  type DateIso,
  type ObjectifPersonnel,
  type SeanceRealisee,
} from '../entites'

/** Où en est un objectif, et de quoi le dire à l'écran. */
export interface AvancementObjectif {
  objectif: ObjectifPersonnel
  /** Vrai si l'indicateur de l'objectif est une grandeur que l'application mesure. */
  mesurable: boolean
  /** Meilleure valeur réalisée en une seule fois, absente si rien n'a été mesuré. */
  meilleur?: number
  /** Jour de ce meilleur résultat. */
  dateDuMeilleur?: DateIso
  /** Premier jour où la cible a été atteinte, absent si elle ne l'a jamais été. */
  atteintLe?: DateIso
  /** Part de la cible, entre 0 et 1, bornée à 1 : c'est le remplissage de la jauge. */
  part: number
  atteint: boolean
}

/** Vrai si l'indicateur correspond à une grandeur mesurée par les séances. */
export function indicateurMesurable(indicateur: string): indicateur is ChampCharge {
  return (CHAMPS_CHARGE as readonly string[]).includes(indicateur)
}

/**
 * Avancement d'un seul objectif.
 *
 * `atteintLe` est recalculé depuis l'historique à chaque fois, et la date
 * éventuellement enregistrée sur l'objectif est ignorée : une cible qu'on
 * relève ne doit pas garder la médaille de l'ancienne.
 */
export function avancementObjectif(
  objectif: ObjectifPersonnel,
  seances: readonly SeanceRealisee[],
): AvancementObjectif {
  if (!indicateurMesurable(objectif.indicateur)) {
    return { objectif, mesurable: false, part: 0, atteint: false }
  }

  const champ = objectif.indicateur
  const retenues = [...seances]
    .filter((seance) => seance.statut === 'faite' || seance.statut === 'partielle')
    .sort((a, b) => a.date.localeCompare(b.date))

  let meilleur: number | undefined
  let dateDuMeilleur: DateIso | undefined
  let atteintLe: DateIso | undefined

  for (const seance of retenues) {
    for (const exercice of seance.exercices) {
      const valeur = exercice.reel[champ]
      if (valeur === undefined) continue

      if (meilleur === undefined || valeur > meilleur) {
        meilleur = valeur
        dateDuMeilleur = seance.date
      }
      // Les séances sont parcourues dans l'ordre : la première fois que la
      // cible tombe est la bonne date, et on ne la remplace plus.
      if (atteintLe === undefined && objectif.cible > 0 && valeur >= objectif.cible) {
        atteintLe = seance.date
      }
    }
  }

  // Une cible de zéro ou négative n'est pas un objectif : la jauge reste
  // vide plutôt que de se remplir d'une division qui ne veut rien dire.
  const part =
    meilleur === undefined || objectif.cible <= 0
      ? 0
      : Math.min(meilleur / objectif.cible, 1)

  return {
    objectif,
    mesurable: true,
    ...(meilleur !== undefined ? { meilleur } : {}),
    ...(dateDuMeilleur !== undefined ? { dateDuMeilleur } : {}),
    ...(atteintLe !== undefined ? { atteintLe } : {}),
    part,
    atteint: atteintLe !== undefined,
  }
}

/**
 * Avancement de tous les objectifs, dans l'ordre du profil.
 *
 * L'ordre est celui que l'utilisateur a rangé : ce n'est pas au calcul de
 * décider que l'objectif le plus avancé passe devant.
 */
export function avancementDesObjectifs(
  objectifs: readonly ObjectifPersonnel[],
  seances: readonly SeanceRealisee[],
): AvancementObjectif[] {
  return objectifs.map((objectif) => avancementObjectif(objectif, seances))
}
