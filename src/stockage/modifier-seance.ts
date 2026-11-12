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
import { numeroDeSemaineProgramme, plageDeSemaine } from '../domaine/dates'
import type { DateIso, Id, SeancePrevue } from '../domaine/entites'
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
