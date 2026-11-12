/**
 * Enregistrement du réalisé d'une séance (chapitre 4).
 *
 * Deux règles portent tout le reste :
 *
 * - **Valider deux fois ne crée pas deux séances.** Une correction met à jour
 *   la ligne existante, retrouvée par sa séance prévue — ou, pour une séance
 *   improvisée, par sa date et son titre. Sinon une hésitation du pouce au
 *   bord du bassin laisserait deux réalisations pour une seule séance, et le
 *   moteur compterait une séance de trop.
 * - **La séance prévue n'est jamais modifiée.** Le prévu et le réalisé
 *   restent deux lignes distinctes, c'est ce qui permet de les afficher côte
 *   à côte.
 */
import { maintenantIso } from '../domaine/dates'
import type {
  DateIso,
  Douleur,
  EchelleDix,
  ExerciceRealise,
  MotifAbandon,
  SeancePrevue,
  SeanceRealisee,
  StatutRealisation,
  TypeSeance,
} from '../domaine/entites'
import { nouvelId as nouvelIdParDefaut, type FabriqueId } from '../domaine/identifiants'
import { db, type BaseForme } from './db'
import { creerDepots, type Depots } from './index'

export interface SaisieRealisation {
  date: DateIso
  /** Séance prévue correspondante. Absente pour une activité improvisée. */
  prevue?: SeancePrevue
  type: TypeSeance
  titre: string
  statut: StatutRealisation
  motif?: MotifAbandon
  exercices: ExerciceRealise[]
  /** Absents pour une séance sautée : elle n'a pas eu lieu. */
  effort?: EchelleDix
  energie?: EchelleDix
  douleurs: Douleur[]
  heuresSommeil?: number
  note?: string
}

export interface OptionsValidation {
  base?: BaseForme
  depots?: Depots
  maintenant?: Date
  nouvelId?: FabriqueId
}

/** Réalisation déjà saisie pour cette séance, s'il y en a une. */
export async function realisationExistante(
  saisie: Pick<SaisieRealisation, 'date' | 'prevue' | 'titre'>,
  depots: Depots,
): Promise<SeanceRealisee | undefined> {
  if (saisie.prevue) {
    return depots.seances.realisees.pourSeancePrevue(saisie.prevue.id)
  }

  const duJour = await depots.seances.realisees.parDate(saisie.date)
  return duJour.find(
    (seance) => seance.seancePrevueId === undefined && seance.titre === saisie.titre,
  )
}

export async function validerSeance(
  saisie: SaisieRealisation,
  options: OptionsValidation = {},
): Promise<SeanceRealisee> {
  const base = options.base ?? db
  const depots = options.depots ?? creerDepots(base)
  const maintenant = options.maintenant ?? new Date()
  const fabrique = options.nouvelId ?? nouvelIdParDefaut

  const existante = await realisationExistante(saisie, depots)

  const realisee: SeanceRealisee = {
    id: existante?.id ?? fabrique(),
    date: saisie.date,
    type: saisie.type,
    titre: saisie.titre,
    statut: saisie.statut,
    exercices: saisie.exercices,
    douleurs: saisie.douleurs,
    saisieLe: maintenantIso(maintenant),
    ...(saisie.effort !== undefined ? { effort: saisie.effort } : {}),
    ...(saisie.energie !== undefined ? { energie: saisie.energie } : {}),
    ...(saisie.prevue ? { seancePrevueId: saisie.prevue.id } : {}),
    ...(saisie.motif ? { motif: saisie.motif } : {}),
    ...(saisie.heuresSommeil !== undefined ? { heuresSommeil: saisie.heuresSommeil } : {}),
    ...(saisie.note ? { note: saisie.note } : {}),
  }

  await depots.seances.realisees.enregistrer(realisee)
  return realisee
}

/** Annule une validation : la séance prévue redevient simplement à faire. */
export async function annulerValidation(
  realiseeId: string,
  options: OptionsValidation = {},
): Promise<void> {
  const base = options.base ?? db
  const depots = options.depots ?? creerDepots(base)
  await depots.seances.realisees.supprimer(realiseeId)
}
