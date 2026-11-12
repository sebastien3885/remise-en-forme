/**
 * Format du fichier de sauvegarde (chapitre 9).
 *
 * « Export et import des données en JSON » et « export puis import
 * restituent exactement les mêmes données » : ce fichier décrit le contenant
 * et le contrôle à la relecture.
 *
 * Deux points méritent d'être écrits :
 *
 * - **Les objets sont stricts.** Une sauvegarde abîmée doit être refusée, pas
 *   écrite à moitié. L'import remplace tout : c'est la dernière occasion de
 *   dire non.
 * - **Les photos voyagent en texte.** Un `Blob` ne traverse pas le JSON : les
 *   photos de repas sont encodées en URL de données à l'export et redeviennent
 *   des `Blob` à l'import. Sans cela, une sauvegarde perdrait les photos en
 *   silence, et ce serait le genre de perte qu'on ne découvre qu'au pire
 *   moment.
 */
import { z } from 'zod'

import { estDateIso } from '../dates'
import {
  CATEGORIES_EXERCICE,
  CLES_REGLE,
  DECISIONS_BILAN,
  IMPACTS_GENOU,
  LEVIERS,
  MATERIELS,
  MOMENTS_REPAS,
  MOTIFS_ABANDON,
  ORIGINES_EXERCICE,
  RESSENTIS_CHARGE,
  STATUTS_PLANIFICATION,
  STATUTS_REALISATION,
  TYPES_SEANCE,
  UNITES,
} from '../entites'

export const MARQUEUR_SAUVEGARDE = 'sauvegarde-remise-en-forme'
export const VERSION_SAUVEGARDE = 1

const dateIso = z.string().refine(estDateIso, 'date attendue au format AAAA-MM-JJ')
const horodatage = z.string().min(1)
const identifiant = z.string().min(1)
const echelle = z.number().min(0).max(10)

const mesures = z.strictObject({
  dureeMinutes: z.number().optional(),
  distanceMetres: z.number().optional(),
  longueurs: z.number().optional(),
  series: z.number().optional(),
  repetitions: z.number().optional(),
  maintienSecondes: z.number().optional(),
  reposSecondes: z.number().optional(),
})

const profil = z.strictObject({
  id: z.literal('profil'),
  dateDebut: dateIso,
  materiel: z.array(z.enum(MATERIELS)),
  antecedents: z.array(
    z.strictObject({
      id: identifiant,
      zone: z.string(),
      description: z.string(),
      depuis: z.number().optional(),
    }),
  ),
  precautions: z.strictObject({
    impactGenouMaximal: z.enum(IMPACTS_GENOU),
    exclureFlexionMarquee: z.boolean(),
    exercicesExclusIds: z.array(identifiant),
  }),
  niveauDepart: z.strictObject({
    marcheConfortableMetres: z.number().optional(),
    longueursNageables: z.number().optional(),
    pompesPossibles: z.number().optional(),
    squatsPossibles: z.number().optional(),
  }),
  objectifs: z.array(
    z.strictObject({
      id: identifiant,
      libelle: z.string(),
      indicateur: z.string(),
      cible: z.number(),
      unite: z.string(),
      atteintLe: dateIso.optional(),
    }),
  ),
  unites: z.enum(UNITES),
  alerteSante: z
    .strictObject({
      douleursThoraciques: z.boolean(),
      malaises: z.boolean(),
      problemesCardiaquesConnus: z.boolean(),
      repondueLe: horodatage,
    })
    .nullable(),
  avertissementSanteAccepte: z.boolean(),
  objectifVerresEau: z.number(),
  masquerPoids: z.boolean(),
  defiEnCours: z
    .strictObject({
      ficheId: identifiant,
      libelle: z.string(),
      debutSemaine: dateIso,
      choisiLe: horodatage,
    })
    .optional(),
  misAJourLe: horodatage,
})

const exercice = z.strictObject({
  id: identifiant,
  nom: z.string(),
  categorie: z.enum(CATEGORIES_EXERCICE),
  description: z.string(),
  musclesTravailles: z.array(z.string()),
  varianteFacileId: identifiant.optional(),
  varianteDifficileId: identifiant.optional(),
  contreIndications: z.array(z.string()),
  impactGenou: z.enum(IMPACTS_GENOU),
  flexionMarquee: z.boolean(),
  materielRequis: z.array(z.enum(MATERIELS)),
  consigneSecurite: z.string().optional(),
  origine: z.enum(ORIGINES_EXERCICE),
  creeLe: horodatage,
})

const programme = z.strictObject({
  id: identifiant,
  version: z.number().int(),
  dateDebut: dateIso,
  dateFin: dateIso,
  motifRevision: z.string(),
  bilanDeclencheurId: identifiant.optional(),
  versionPrecedenteId: identifiant.optional(),
  actif: z.boolean(),
  creeLe: horodatage,
})

const seancePrevue = z.strictObject({
  id: identifiant,
  programmeId: identifiant,
  date: dateIso,
  semaine: z.number().int(),
  type: z.enum(TYPES_SEANCE),
  titre: z.string(),
  exercices: z.array(
    z.strictObject({
      exerciceId: identifiant,
      ordre: z.number().int(),
      cibles: mesures,
      consigne: z.string().optional(),
    }),
  ),
  statut: z.enum(STATUTS_PLANIFICATION),
  deplaceeDepuis: dateIso.optional(),
  remplaceeParId: identifiant.optional(),
  notes: z.string().optional(),
  creeLe: horodatage,
})

const seanceRealisee = z.strictObject({
  id: identifiant,
  seancePrevueId: identifiant.optional(),
  date: dateIso,
  type: z.enum(TYPES_SEANCE),
  titre: z.string(),
  statut: z.enum(STATUTS_REALISATION),
  motif: z.enum(MOTIFS_ABANDON).optional(),
  exercices: z.array(
    z.strictObject({
      exerciceId: identifiant,
      ordre: z.number().int(),
      reel: mesures,
      douleur: echelle.optional(),
      abandonne: z.boolean().optional(),
    }),
  ),
  effort: echelle.optional(),
  energie: echelle.optional(),
  douleurs: z.array(
    z.strictObject({
      zone: z.string(),
      intensite: echelle,
      gonflement: z.boolean().optional(),
      instabilite: z.boolean().optional(),
    }),
  ),
  heuresSommeil: z.number().optional(),
  note: z.string().optional(),
  saisieLe: horodatage,
})

const statistiques = z.strictObject({
  semaine: z.number().int(),
  debut: dateIso,
  fin: dateIso,
  seancesPrevues: z.number().int(),
  seancesFaites: z.number().int(),
  seancesPartielles: z.number().int(),
  seancesSautees: z.number().int(),
  seancesImprovisees: z.number().int(),
  tauxRealisation: z.number(),
  effortMoyen: z.number().nullable(),
  energieMoyenne: z.number().nullable(),
  douleurMaximale: z.number(),
  douleursParExercice: z.record(z.string(), z.number()),
  motifs: z.record(z.string(), z.number()),
})

const bilan = z.strictObject({
  id: identifiant,
  programmeId: identifiant,
  semaine: z.number().int(),
  debut: dateIso,
  fin: dateIso,
  statistiques,
  ressentiCharge: z.enum(RESSENTIS_CHARGE).nullable(),
  reglesAppliquees: z.array(
    z.strictObject({
      cle: z.enum(CLES_REGLE),
      libelle: z.string(),
      explication: z.string(),
    }),
  ),
  ajustements: z.array(
    z.strictObject({
      regle: z.enum(CLES_REGLE),
      levier: z.enum(LEVIERS),
      facteur: z.number(),
      exerciceId: identifiant.optional(),
      remplacementParId: identifiant.optional(),
      avisMedicalSuggere: z.boolean().optional(),
      explication: z.string(),
    }),
  ),
  decision: z.enum(DECISIONS_BILAN),
  programmeGenereId: identifiant.optional(),
  genereLe: horodatage,
  decideLe: horodatage.optional(),
})

const repas = z.strictObject({
  id: identifiant,
  date: dateIso,
  moment: z.enum(MOMENTS_REPAS),
  description: z.string(),
  /** URL de données : un Blob ne traverse pas le JSON. */
  photo: z.string().startsWith('data:').optional(),
  bilanRapide: z.strictObject({
    legumes: z.boolean(),
    proteines: z.boolean(),
    boissonSucree: z.boolean(),
    copieux: z.boolean(),
  }),
  saisieLe: horodatage,
})

const hydratation = z.strictObject({
  date: dateIso,
  verres: z.number().int().min(0),
  objectif: z.number().int().min(0),
  misAJourLe: horodatage,
})

const mesureCorporelle = z.strictObject({
  id: identifiant,
  date: dateIso,
  poidsKg: z.number().optional(),
  tourTailleCm: z.number().optional(),
  saisieLe: horodatage,
})

export const schemaSauvegarde = z.strictObject({
  format: z.literal(MARQUEUR_SAUVEGARDE),
  version: z.literal(VERSION_SAUVEGARDE),
  exporteeLe: horodatage,
  profil: profil.nullable(),
  exercices: z.array(exercice),
  programmes: z.array(programme),
  seancesPrevues: z.array(seancePrevue),
  seancesRealisees: z.array(seanceRealisee),
  bilans: z.array(bilan),
  repas: z.array(repas),
  hydratation: z.array(hydratation),
  mesures: z.array(mesureCorporelle),
})

export type Sauvegarde = z.infer<typeof schemaSauvegarde>
export type RepasSerialise = z.infer<typeof repas>
