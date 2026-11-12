/**
 * Application d'un plan importé à la base.
 *
 * Tout le contrôle et toute la conversion ont déjà eu lieu dans le domaine :
 * ce fichier ne fait qu'écrire, en une transaction, ce que
 * `convertirPlan` a préparé. Si quelque chose échoue, rien n'est écrit.
 *
 * Mode remplacement : une nouvelle version de programme devient active,
 * l'ancienne est désactivée mais conservée avec ses séances. Mode fusion :
 * les séances rejoignent le programme actif.
 */
import {
  apercuDuPlan,
  convertirPlan,
  type ApercuPlan,
  type ModeImport,
  type PlanImporte,
} from '../domaine/plans'
import { contexteDepuisProfil } from '../domaine/profil/precautions'
import { db, type BaseForme } from './db'
import { creerDepots, type Depots } from './index'

export interface ResultatImport {
  apercu: ApercuPlan
  /** Vrai si l'écriture a eu lieu. */
  applique: boolean
  programmeId?: string
  exercicesEcrits: number
  seancesEcrites: number
}

/**
 * Construit l'aperçu d'un plan à partir de l'état réel de la base : la
 * bibliothèque déjà présente et les précautions du profil.
 */
export async function preparerApercu(
  plan: PlanImporte,
  depots: Depots = creerDepots(),
): Promise<ApercuPlan> {
  const bibliotheque = await depots.exercices.tous()
  const profil = await depots.profil.lire()

  return apercuDuPlan(plan, {
    bibliotheque,
    ...(profil ? { precautions: contexteDepuisProfil(profil) } : {}),
  })
}

export interface OptionsApplication {
  mode: ModeImport
  maintenant?: Date
  base?: BaseForme
  depots?: Depots
}

/**
 * Contrôle puis applique le plan. Rien n'est écrit si l'aperçu signale une
 * erreur : c'est la même porte que celle de l'écran Réglages.
 */
export async function appliquerPlan(
  plan: PlanImporte,
  options: OptionsApplication,
): Promise<ResultatImport> {
  const base = options.base ?? db
  const depots = options.depots ?? creerDepots(base)

  const apercu = await preparerApercu(plan, depots)
  if (!apercu.applicable) {
    return { apercu, applique: false, exercicesEcrits: 0, seancesEcrites: 0 }
  }

  const programmeActif = await depots.programmes.actif()
  const version =
    options.mode === 'fusionner' && programmeActif
      ? programmeActif.version
      : await depots.programmes.prochaineVersion()

  const elements = convertirPlan(plan, {
    mode: options.mode,
    version,
    ...(programmeActif ? { programmeActif } : {}),
    ...(options.maintenant ? { maintenant: options.maintenant } : {}),
  })

  await base.transaction(
    'rw',
    [base.exercices, base.programmes, base.seancesPrevues],
    async () => {
      if (elements.exercices.length > 0) {
        await base.exercices.bulkPut(elements.exercices)
      }

      if (elements.nouveauProgramme) {
        // Désactive l'ancien programme sans le supprimer : ses séances et son
        // historique restent consultables (chapitre 7).
        const anciens = await base.programmes.toArray()
        const aDesactiver = anciens
          .filter((ancien) => ancien.actif && ancien.id !== elements.programme.id)
          .map((ancien) => ({ ...ancien, actif: false }))
        if (aDesactiver.length > 0) {
          await base.programmes.bulkPut(aDesactiver)
        }
      }

      await base.programmes.put(elements.programme)
      await base.seancesPrevues.bulkPut(elements.seances)
    },
  )

  return {
    apercu,
    applique: true,
    programmeId: elements.programme.id,
    exercicesEcrits: elements.exercices.length,
    seancesEcrites: elements.seances.length,
  }
}
