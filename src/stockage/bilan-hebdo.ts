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
import { maintenantIso, numeroDeSemaineProgramme, plageDeSemaine } from '../domaine/dates'
import type { BilanHebdo, DateIso, Id, RessentiCharge, SeancePrevue } from '../domaine/entites'
import { nouvelId as nouvelIdParDefaut, type FabriqueId } from '../domaine/identifiants'
import { contexteDepuisProfil } from '../domaine/profil/precautions'
import { appliquerAjustements, genererBilan } from '../domaine/progression/moteur'
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
  const maintenant = options.maintenant ?? new Date()
  const fabrique = options.nouvelId ?? nouvelIdParDefaut

  const bilan = await depots.bilans.parId(bilanId)
  if (!bilan) return { applique: false, raison: 'Bilan introuvable.' }
  if (bilan.decision !== 'en-attente') {
    return { applique: false, raison: 'Ce bilan a déjà été décidé.' }
  }

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

  const ajustees = appliquerAjustements(aVenir, bilan, {
    programmeId: nouveauProgrammeId,
    maintenant,
    nouvelId: fabrique,
  })

  // Chaque ancienne séance pointe vers celle qui la remplace : l'historique
  // raconte la révision plutôt que de l'effacer.
  const remplacees: SeancePrevue[] = aVenir.map((ancienne, index) => ({
    ...ancienne,
    statut: 'remplacee',
    ...(ajustees[index] ? { remplaceeParId: ajustees[index].id } : {}),
  }))

  const explication =
    bilan.reglesAppliquees[0]?.explication ?? 'Ajustements du bilan hebdomadaire acceptés.'

  const nouveauProgramme = {
    id: nouveauProgrammeId,
    version: await depots.programmes.prochaineVersion(),
    dateDebut: programme.dateDebut,
    dateFin: programme.dateFin,
    motifRevision: 'Semaine ' + String(bilan.semaine) + ' · ' + explication,
    bilanDeclencheurId: bilan.id,
    versionPrecedenteId: programme.id,
    actif: true,
    creeLe,
  }

  const bilanDecide: BilanHebdo = {
    ...bilan,
    decision: 'accepte',
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
