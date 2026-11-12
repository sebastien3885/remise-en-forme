/**
 * Déplacement d'une séance prévue (chapitre 3 : « déplacer une séance sur un
 * autre jour, la remplacer par une équivalente »).
 *
 * Le point important : **déposer une séance sur un jour déjà occupé échange
 * les deux**, au lieu d'empiler. C'est ce qu'on veut faire neuf fois sur dix
 * — décaler la marche du mardi au mercredi et le renforcement en sens
 * inverse — et c'est ce qui préserve tout seul le jour de repos
 * hebdomadaire : un échange ne change pas le nombre de jours occupés.
 *
 * Quand le jour d'arrivée est libre, le déplacement est refusé s'il ne reste
 * aucun jour de repos complet dans la semaine. Le chapitre 3 dit que
 * l'application impose ce jour ; un glissement de doigt ne doit pas le
 * contourner.
 */
import { CONFIG_PROGRESSION, type ConfigProgression } from '../config/progression'
import { maintenantIso, numeroDeSemaineProgramme, plageDeSemaine } from '../domaine/dates'
import type { DateIso, Id, SeancePrevue } from '../domaine/entites'
import { nouvelId as nouvelIdParDefaut, type FabriqueId } from '../domaine/identifiants'
import {
  construireSeance,
  type GabaritSeance,
} from '../domaine/programme/generateur'
import { joursDeReposSuffisants } from '../domaine/progression/moteur'
import { db, type BaseForme } from './db'
import { creerDepots, type Depots } from './index'

export type ResultatDeplacement =
  | { deplace: true; seances: SeancePrevue[]; echange: boolean }
  | { deplace: false; raison: string }

export interface OptionsDeplacement {
  base?: BaseForme
  depots?: Depots
  config?: ConfigProgression
}

function avecNouvelleDate(
  seance: SeancePrevue,
  date: DateIso,
  dateDebutProgramme: DateIso,
): SeancePrevue {
  return {
    ...seance,
    date,
    semaine: numeroDeSemaineProgramme(dateDebutProgramme, date),
    statut: 'deplacee',
    // On garde la date d'origine, pas celle du déplacement précédent.
    deplaceeDepuis: seance.deplaceeDepuis ?? seance.date,
  }
}

export async function deplacerSeance(
  seanceId: Id,
  nouvelleDate: DateIso,
  options: OptionsDeplacement = {},
): Promise<ResultatDeplacement> {
  const base = options.base ?? db
  const depots = options.depots ?? creerDepots(base)
  const config = options.config ?? CONFIG_PROGRESSION

  const seance = await depots.seances.prevues.parId(seanceId)
  if (!seance) return { deplace: false, raison: 'Séance introuvable.' }
  if (seance.date === nouvelleDate) {
    return { deplace: true, seances: [seance], echange: false }
  }

  // Une séance déjà saisie ne se déplace pas : son réalisé porte la date à
  // laquelle elle a eu lieu, et c'est le réalisé qui fait foi (chapitre 4).
  // Déplacer le prévu détacherait les deux et fausserait l'historique.
  if (await depots.seances.realisees.pourSeancePrevue(seance.id)) {
    return {
      deplace: false,
      raison:
        'Cette séance a déjà été saisie. Son réalisé garde la date du jour où elle a eu lieu : la déplacer fausserait l’historique.',
    }
  }

  const programme = await depots.programmes.parId(seance.programmeId)
  const dateDebut = programme?.dateDebut ?? seance.date

  const surPlace = (await depots.seances.prevues.parDate(nouvelleDate)).filter(
    (candidate) =>
      candidate.id !== seance.id &&
      candidate.statut !== 'annulee' &&
      candidate.statut !== 'remplacee',
  )

  // --- jour occupé : on échange les deux séances
  const occupante = surPlace[0]
  if (occupante) {
    if (await depots.seances.realisees.pourSeancePrevue(occupante.id)) {
      return {
        deplace: false,
        raison:
          'La séance du jour d’arrivée a déjà été saisie : elle ne peut pas être échangée sans fausser l’historique.',
      }
    }

    const aEcrire = [
      avecNouvelleDate(seance, nouvelleDate, dateDebut),
      avecNouvelleDate(occupante, seance.date, dateDebut),
    ]
    await depots.seances.prevues.enregistrerPlusieurs(aEcrire)
    return { deplace: true, seances: aEcrire, echange: true }
  }

  // --- jour libre : le jour de repos de la semaine doit survivre
  const deplacee = avecNouvelleDate(seance, nouvelleDate, dateDebut)
  const { debut, fin } = plageDeSemaine(nouvelleDate)
  const semaine = (await depots.seances.prevues.parPlage(debut, fin))
    .filter((candidate) => candidate.id !== seance.id)
    .concat(deplacee)

  if (!joursDeReposSuffisants(semaine, config)) {
    return {
      deplace: false,
      raison:
        'La semaine n’aurait plus aucun jour de repos complet. Échangez cette séance avec une autre plutôt que de la poser sur le dernier jour libre.',
    }
  }

  await depots.seances.prevues.enregistrer(deplacee)
  return { deplace: true, seances: [deplacee], echange: false }
}

// ------------------------------------------------- planification libre

export interface OptionsCreation extends OptionsDeplacement {
  maintenant?: Date
  nouvelId?: FabriqueId
}

export type ResultatCreation =
  | { cree: true; seance: SeancePrevue; avertissements: string[] }
  | { cree: false; raison: string }

/**
 * Pose une séance sur un jour donné (chapitre 3, « planification libre »).
 *
 * Le contenu vient du même constructeur que les douze semaines : une marche
 * ajoutée à la main est exactement une marche du programme, précautions
 * comprises.
 */
export async function ajouterSeance(
  date: DateIso,
  gabarit: GabaritSeance,
  options: OptionsCreation = {},
): Promise<ResultatCreation> {
  const base = options.base ?? db
  const depots = options.depots ?? creerDepots(base)
  const config = options.config ?? CONFIG_PROGRESSION
  const maintenant = options.maintenant ?? new Date()
  const fabrique = options.nouvelId ?? nouvelIdParDefaut

  const profil = await depots.profil.lire()
  if (!profil) return { cree: false, raison: 'Aucun profil enregistré.' }

  const programme = await depots.programmes.actif()
  if (!programme) {
    return {
      cree: false,
      raison: 'Aucun programme en cours : générez-en un avant d’y ajouter des séances.',
    }
  }

  const occupe = (await depots.seances.prevues.parDate(date)).some(
    (seance) => seance.statut !== 'annulee' && seance.statut !== 'remplacee',
  )
  if (occupe) {
    return {
      cree: false,
      raison: 'Ce jour porte déjà une séance : déplacez-la ou remplacez-la.',
    }
  }

  const construite = construireSeance({
    gabarit,
    profil,
    bibliotheque: await depots.exercices.tous(),
    date,
    programmeId: programme.id,
    id: fabrique(),
    creeLe: maintenantIso(maintenant),
    dateDebutProgramme: programme.dateDebut,
  })

  if (!construite.seance) {
    return {
      cree: false,
      raison:
        construite.avertissements[0] ??
        'Vos précautions ne laissent aucun exercice pour ce type de séance.',
    }
  }

  const { debut, fin } = plageDeSemaine(date)
  const semaine = (await depots.seances.prevues.parPlage(debut, fin)).concat(construite.seance)
  if (!joursDeReposSuffisants(semaine, config)) {
    return {
      cree: false,
      raison:
        'La semaine n’aurait plus aucun jour de repos complet. Le chapitre 3 en impose un : retirez une autre séance d’abord.',
    }
  }

  await depots.seances.prevues.enregistrer(construite.seance)
  return { cree: true, seance: construite.seance, avertissements: construite.avertissements }
}

/**
 * Retire une séance du calendrier sans l'effacer : elle passe en `annulee` et
 * sort du dénominateur du taux de réalisation. Une séance déjà saisie n'est
 * pas annulable — elle a eu lieu.
 */
export async function annulerSeance(
  seanceId: Id,
  options: OptionsDeplacement = {},
): Promise<{ annulee: true } | { annulee: false; raison: string }> {
  const base = options.base ?? db
  const depots = options.depots ?? creerDepots(base)

  const seance = await depots.seances.prevues.parId(seanceId)
  if (!seance) return { annulee: false, raison: 'Séance introuvable.' }

  if (await depots.seances.realisees.pourSeancePrevue(seance.id)) {
    return {
      annulee: false,
      raison: 'Cette séance a déjà été saisie : elle a eu lieu, elle ne s’annule pas.',
    }
  }

  await depots.seances.prevues.enregistrer({ ...seance, statut: 'annulee' })
  return { annulee: true }
}

export type ResultatRemplacement =
  | { remplace: true; seance: SeancePrevue; avertissements: string[] }
  | { remplace: false; raison: string }

/**
 * Remplace une séance par une séance d'un autre type, le même jour
 * (chapitre 3 : « la remplacer par une équivalente »).
 *
 * L'ancienne n'est pas effacée : elle passe en `remplacee` et pointe vers la
 * nouvelle, si bien que l'historique raconte ce qui s'est passé.
 */
export async function remplacerSeance(
  seanceId: Id,
  gabarit: GabaritSeance,
  options: OptionsCreation = {},
): Promise<ResultatRemplacement> {
  const base = options.base ?? db
  const depots = options.depots ?? creerDepots(base)
  const maintenant = options.maintenant ?? new Date()
  const fabrique = options.nouvelId ?? nouvelIdParDefaut

  const ancienne = await depots.seances.prevues.parId(seanceId)
  if (!ancienne) return { remplace: false, raison: 'Séance introuvable.' }

  if (await depots.seances.realisees.pourSeancePrevue(ancienne.id)) {
    return {
      remplace: false,
      raison: 'Cette séance a déjà été saisie : elle ne peut plus être remplacée.',
    }
  }

  const profil = await depots.profil.lire()
  if (!profil) return { remplace: false, raison: 'Aucun profil enregistré.' }

  const programme = await depots.programmes.parId(ancienne.programmeId)

  const construite = construireSeance({
    gabarit,
    profil,
    bibliotheque: await depots.exercices.tous(),
    date: ancienne.date,
    programmeId: ancienne.programmeId,
    id: fabrique(),
    creeLe: maintenantIso(maintenant),
    dateDebutProgramme: programme?.dateDebut ?? ancienne.date,
  })

  if (!construite.seance) {
    return {
      remplace: false,
      raison:
        construite.avertissements[0] ??
        'Vos précautions ne laissent aucun exercice pour ce type de séance.',
    }
  }

  // Remplacer le jour de repos par un entraînement ferait disparaître le seul
  // jour libre de la semaine : c'est le seul remplacement qu'on refuse.
  const { debut, fin } = plageDeSemaine(ancienne.date)
  const semaine = (await depots.seances.prevues.parPlage(debut, fin))
    .filter((candidate) => candidate.id !== ancienne.id)
    .concat(construite.seance)

  if (!joursDeReposSuffisants(semaine, options.config ?? CONFIG_PROGRESSION)) {
    return {
      remplace: false,
      raison:
        'La semaine n’aurait plus aucun jour de repos complet. Le chapitre 3 en impose un : libérez un autre jour d’abord.',
    }
  }

  await depots.seances.prevues.enregistrerPlusieurs([
    { ...ancienne, statut: 'remplacee', remplaceeParId: construite.seance.id },
    construite.seance,
  ])

  return {
    remplace: true,
    seance: construite.seance,
    avertissements: construite.avertissements,
  }
}
