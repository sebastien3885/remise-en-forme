/**
 * Le bilan hebdomadaire, de la base au moteur et retour (chapitre 5).
 *
 * Le moteur est pur : il reçoit des séances et rend un bilan. Ce module lui
 * sert ce qu'il faut — la semaine écoulée, l'historique du réalisé pour voir
 * les paliers, les bilans précédents pour compter les progressions d'affilée —
 * puis range le résultat.
 *
 * Deux règles portent le reste :
 *
 * - **Un bilan par semaine.** Refaire le bilan après avoir répondu
 *   différemment à « comment trouves-tu la charge ? » corrige celui qui
 *   existe, il n'en empile pas un second.
 * - **Accepter un bilan crée une version de programme** (chapitre 7). Les
 *   séances déjà passées restent attachées à l'ancienne version : elles ont
 *   eu lieu, et leurs réalisations pointent vers elles. Seules les séances à
 *   venir sont reprises, ajustées, dans la nouvelle version ; les anciennes
 *   passent en `remplacee` et pointent vers leur remplaçante.
 */
import { CONFIG_PROGRESSION } from '../config/progression'
import { maintenantIso, numeroDeSemaineProgramme, plageDeSemaine } from '../domaine/dates'
import type {
  Ajustement,
  BilanHebdo,
  DateIso,
  Id,
  RessentiCharge,
  SeancePrevue,
} from '../domaine/entites'
import { nouvelId as nouvelIdParDefaut, type FabriqueId } from '../domaine/identifiants'
import { contexteDepuisProfil } from '../domaine/profil/precautions'
import { facteurEnMots } from '../domaine/progression/charge'
import {
  ajustementGlobal,
  appliquerAjustements,
  genererBilan,
} from '../domaine/progression/moteur'
import { db, type BaseForme } from './db'
import { creerDepots, type Depots } from './index'

export interface OptionsBilan {
  base?: BaseForme
  depots?: Depots
  maintenant?: Date
  nouvelId?: FabriqueId
}

export type ResultatBilan =
  | { genere: true; bilan: BilanHebdo }
  | { genere: false; raison: string }

/**
 * Produit le bilan de la semaine qui contient `date` et l'enregistre.
 *
 * `ressentiCharge` est la réponse à la question de fin de semaine du
 * chapitre 5. Elle entre dans les règles : une charge jugée trop dure empêche
 * l'augmentation.
 */
export async function genererEtEnregistrerBilan(
  date: DateIso,
  ressentiCharge: RessentiCharge | null,
  options: OptionsBilan = {},
): Promise<ResultatBilan> {
  const base = options.base ?? db
  const depots = options.depots ?? creerDepots(base)
  const maintenant = options.maintenant ?? new Date()
  const fabrique = options.nouvelId ?? nouvelIdParDefaut

  const profil = await depots.profil.lire()
  if (!profil) return { genere: false, raison: 'Aucun profil enregistré.' }

  const programme = await depots.programmes.actif()
  if (!programme) {
    return { genere: false, raison: 'Aucun programme en cours : il n’y a rien à faire le bilan.' }
  }

  const { debut, fin } = plageDeSemaine(date)
  const semaine = numeroDeSemaineProgramme(programme.dateDebut, date)

  const [seancesPrevues, seancesRealisees, historiqueRealise, bibliotheque, precedents] =
    await Promise.all([
      depots.seances.prevues.parPlage(debut, fin),
      depots.seances.realisees.parPlage(debut, fin),
      depots.seances.realisees.parPlage(programme.dateDebut, fin),
      depots.exercices.tous(),
      depots.bilans.avant(debut),
    ])

  // Refaire le bilan d'une semaine corrige celui qui existe.
  const existant = await depots.bilans.parSemaine(programme.id, semaine)

  const bilan = genererBilan({
    programmeId: programme.id,
    semaine,
    debut,
    fin,
    dateDebutProgramme: programme.dateDebut,
    seancesPrevues,
    seancesRealisees,
    historiqueRealise,
    ressentiCharge,
    bilansPrecedents: precedents,
    bibliotheque,
    precautions: contexteDepuisProfil(profil),
    maintenant,
    nouvelId: () => existant?.id ?? fabrique(),
  })

  await depots.bilans.enregistrer(bilan)
  return { genere: true, bilan }
}

export type ResultatDecision =
  | { applique: true; bilan: BilanHebdo; seancesAjustees: number; versionCreee?: number }
  | { applique: false; raison: string }

/**
 * Accepte les ajustements : une nouvelle version du programme reprend les
 * séances à venir, corrigées.
 */
export async function accepterBilan(
  bilanId: Id,
  options: OptionsBilan = {},
): Promise<ResultatDecision> {
  const base = options.base ?? db
  const depots = options.depots ?? creerDepots(base)

  const bilan = await depots.bilans.parId(bilanId)
  if (!bilan) return { applique: false, raison: 'Bilan introuvable.' }
  if (bilan.decision !== 'en-attente') {
    return { applique: false, raison: 'Ce bilan a déjà été décidé.' }
  }

  return appliquerAuProgramme(bilan, bilan.ajustements, 'accepte', {
    base,
    depots,
    maintenant: options.maintenant ?? new Date(),
    fabrique: options.nouvelId ?? nouvelIdParDefaut,
  })
}

/** Ce que l'utilisateur retient d'un bilan qu'il ne prend pas tel quel. */
export interface ChoixModification {
  /**
   * Facteur retenu pour l'ajustement global : `1` pour ne rien changer,
   * `1.05` pour la moitié d'un +10 %. Absent, le facteur proposé est gardé.
   *
   * Le **levier** n'est pas modifiable : un seul bouge par semaine
   * (chapitre 10), et c'est le moteur qui l'a choisi.
   */
  facteur?: number
  /** Exercices dont on refuse le remplacement proposé. */
  remplacementsRefusesIds?: readonly Id[]
}

/**
 * La troisième voie du chapitre 5 : ni accepter tel quel, ni refuser en bloc.
 *
 * **Modifier ne peut que demander moins.** Le plafond de +10 % est calculé par
 * le moteur ; si cette fonction acceptait un facteur plus ambitieux que le
 * proposé, l'interface franchirait le garde-fou du chapitre 10 par la porte de
 * derrière. Un facteur trop grand est donc refusé, pas rogné en silence : un
 * appel qui demande l'impossible est un appel à corriger.
 *
 * **Une modification qui ne change rien est un refus.** Garder le facteur à 1
 * et refuser tous les remplacements, c'est laisser le programme intact :
 * autant l'écrire ainsi plutôt que de créer une version identique à la
 * précédente.
 */
export async function modifierBilan(
  bilanId: Id,
  choix: ChoixModification = {},
  options: OptionsBilan = {},
): Promise<ResultatDecision> {
  const base = options.base ?? db
  const depots = options.depots ?? creerDepots(base)

  const bilan = await depots.bilans.parId(bilanId)
  if (!bilan) return { applique: false, raison: 'Bilan introuvable.' }
  if (bilan.decision !== 'en-attente') {
    return { applique: false, raison: 'Ce bilan a déjà été décidé.' }
  }

  const propose = ajustementGlobal(bilan)?.facteur ?? 1
  const plafond = Math.max(propose, 1)
  const plancher = CONFIG_PROGRESSION.plafonds.reductionMaximale
  const facteur = choix.facteur ?? propose

  if (!Number.isFinite(facteur)) {
    return { applique: false, raison: 'Le facteur retenu n’est pas un nombre.' }
  }
  if (facteur > plafond) {
    return {
      applique: false,
      raison:
        'Modifier ne peut pas demander plus que le bilan ne propose : ' +
        facteurEnMots(plafond) +
        ' au maximum.',
    }
  }
  if (facteur < plancher) {
    return {
      applique: false,
      raison: 'Une réduction ne descend pas sous ' + facteurEnMots(plancher) + '.',
    }
  }

  const refuses = new Set(choix.remplacementsRefusesIds ?? [])

  const retenus = bilan.ajustements
    .filter(
      (ajustement) =>
        ajustement.exerciceId === undefined || !refuses.has(ajustement.exerciceId),
    )
    .map((ajustement) =>
      ajustement.exerciceId === undefined ? { ...ajustement, facteur } : ajustement,
    )

  const rienNeChange =
    facteur === 1 &&
    retenus.every((ajustement) => ajustement.remplacementParId === undefined)

  if (rienNeChange) return refuserBilan(bilanId, options)

  return appliquerAuProgramme(bilan, retenus, 'modifie', {
    base,
    depots,
    maintenant: options.maintenant ?? new Date(),
    fabrique: options.nouvelId ?? nouvelIdParDefaut,
  })
}

interface ContexteDecision {
  base: BaseForme
  depots: Depots
  maintenant: Date
  fabrique: FabriqueId
}

/**
 * Crée la version de programme qui porte les ajustements retenus, et range la
 * décision sur le bilan.
 *
 * Accepter et modifier passent tous les deux par ici : la seule différence est
 * la liste d'ajustements et le mot écrit sur la décision. Deux chemins
 * séparés auraient fini par ne plus traiter l'historique de la même façon.
 */
async function appliquerAuProgramme(
  bilan: BilanHebdo,
  retenus: readonly Ajustement[],
  decision: 'accepte' | 'modifie',
  contexte: ContexteDecision,
): Promise<ResultatDecision> {
  const { base, depots, maintenant, fabrique } = contexte

  const programme = await depots.programmes.actif()
  if (!programme) return { applique: false, raison: 'Aucun programme en cours.' }

  const aVenir = (await depots.seances.prevues.parProgramme(programme.id)).filter(
    (seance) =>
      seance.date > bilan.fin &&
      seance.statut !== 'annulee' &&
      seance.statut !== 'remplacee',
  )

  const creeLe = maintenantIso(maintenant)
  const nouveauProgrammeId = fabrique()

  // Le moteur reçoit un bilan dont les ajustements sont ceux retenus. Le bilan
  // enregistré, lui, garde la proposition d'origine : on applique le choix de
  // l'utilisateur sans réécrire ce que le moteur avait dit.
  const ajustees = appliquerAjustements(
    aVenir,
    { ...bilan, ajustements: [...retenus] },
    {
      programmeId: nouveauProgrammeId,
      maintenant,
      nouvelId: fabrique,
    },
  )

  // Chaque ancienne séance pointe vers celle qui la remplace : l'historique
  // raconte la révision plutôt que de l'effacer.
  const remplacees: SeancePrevue[] = aVenir.map((ancienne, index) => ({
    ...ancienne,
    statut: 'remplacee',
    ...(ajustees[index] ? { remplaceeParId: ajustees[index].id } : {}),
  }))

  const explication =
    bilan.reglesAppliquees[0]?.explication ?? 'Ajustements du bilan hebdomadaire acceptés.'

  // Une version modifiée dit laquelle elle est : le motif de révision est ce
  // qu'on relit trois mois plus tard dans les réglages, et « +10 % car trois
  // séances sur trois » serait faux si l'utilisateur n'a retenu que +5 %.
  const retenu = retenus.find((ajustement) => ajustement.exerciceId === undefined)
  const mention =
    decision === 'modifie'
      ? ' · retenu à la main : ' + facteurEnMots(retenu?.facteur ?? 1)
      : ''

  const nouveauProgramme = {
    id: nouveauProgrammeId,
    version: await depots.programmes.prochaineVersion(),
    dateDebut: programme.dateDebut,
    dateFin: programme.dateFin,
    motifRevision: 'Semaine ' + String(bilan.semaine) + ' · ' + explication + mention,
    bilanDeclencheurId: bilan.id,
    versionPrecedenteId: programme.id,
    actif: true,
    creeLe,
  }

  const bilanDecide: BilanHebdo = {
    ...bilan,
    decision,
    ...(decision === 'modifie' ? { ajustementsRetenus: [...retenus] } : {}),
    programmeGenereId: nouveauProgrammeId,
    decideLe: creeLe,
  }

  await base.transaction(
    'rw',
    [base.programmes, base.seancesPrevues, base.bilans],
    async () => {
      const anciens = await base.programmes.toArray()
      const aDesactiver = anciens
        .filter((ancien) => ancien.actif && ancien.id !== nouveauProgrammeId)
        .map((ancien) => ({ ...ancien, actif: false }))
      if (aDesactiver.length > 0) await base.programmes.bulkPut(aDesactiver)

      await base.programmes.put(nouveauProgramme)
      if (remplacees.length > 0) await base.seancesPrevues.bulkPut(remplacees)
      if (ajustees.length > 0) await base.seancesPrevues.bulkPut(ajustees)
      await base.bilans.put(bilanDecide)
    },
  )

  return {
    applique: true,
    bilan: bilanDecide,
    seancesAjustees: ajustees.length,
    versionCreee: nouveauProgramme.version,
  }
}

/** Refuse les ajustements : le programme ne bouge pas, le bilan reste lisible. */
export async function refuserBilan(
  bilanId: Id,
  options: OptionsBilan = {},
): Promise<ResultatDecision> {
  const base = options.base ?? db
  const depots = options.depots ?? creerDepots(base)
  const maintenant = options.maintenant ?? new Date()

  const bilan = await depots.bilans.parId(bilanId)
  if (!bilan) return { applique: false, raison: 'Bilan introuvable.' }
  if (bilan.decision !== 'en-attente') {
    return { applique: false, raison: 'Ce bilan a déjà été décidé.' }
  }

  const refuse: BilanHebdo = {
    ...bilan,
    decision: 'refuse',
    decideLe: maintenantIso(maintenant),
  }
  await depots.bilans.enregistrer(refuse)

  return { applique: true, bilan: refuse, seancesAjustees: 0 }
}
