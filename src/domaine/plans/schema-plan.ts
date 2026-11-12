/**
 * Format des plans d'exercice importés (chapitre 9, « Transfert PC → Android »).
 *
 * Un plan est un fichier JSON préparé sur l'ordinateur, envoyé sur le
 * téléphone, puis choisi dans Réglages. L'application doit « contrôler le
 * format » avant de l'appliquer : c'est le rôle de ce schéma.
 *
 * Deux partis pris :
 *
 * - **Objets stricts.** Une clé inconnue fait échouer l'import au lieu d'être
 *   ignorée en silence. Dans un fichier écrit à la main, `duréeMinutes` au
 *   lieu de `dureeMinutes` passerait inaperçu et la séance partirait sans
 *   cible : mieux vaut un refus explicite.
 * - **Le moins de choses possible à écrire.** Le numéro de semaine, l'ordre
 *   des exercices et les identifiants se déduisent ; ils ne se saisissent pas.
 *
 * Le format lisible par un humain est documenté dans `docs/format-plan.md`.
 */
import { z } from 'zod'

import { estDateIso } from '../dates'
import { CATEGORIES_EXERCICE, IMPACTS_GENOU, MATERIELS, TYPES_SEANCE } from '../entites'

/** Marqueur en tête de fichier : permet de refuser tout de suite un JSON étranger. */
export const MARQUEUR_FORMAT_PLAN = 'plan-remise-en-forme'

/** Version du format. À incrémenter si la forme du fichier change. */
export const VERSION_FORMAT_PLAN = 1

const dateIso = z
  .string()
  .refine(estDateIso, 'date attendue au format AAAA-MM-JJ, par exemple 2026-11-16')

const cibles = z
  .strictObject({
    dureeMinutes: z.number().positive().optional(),
    distanceMetres: z.number().positive().optional(),
    longueurs: z.number().int().positive().optional(),
    series: z.number().int().positive().optional(),
    repetitions: z.number().int().positive().optional(),
    maintienSecondes: z.number().positive().optional(),
    reposSecondes: z.number().nonnegative().optional(),
  })
  .refine(
    (valeurs) => Object.values(valeurs).some((valeur) => valeur !== undefined),
    'au moins une cible est nécessaire : dureeMinutes, distanceMetres, longueurs, series, repetitions ou maintienSecondes',
  )

const exerciceDuPlan = z.strictObject({
  /** Facultatif : déduit du nom si absent. */
  id: z.string().min(1).optional(),
  nom: z.string().min(1),
  categorie: z.enum(CATEGORIES_EXERCICE),
  description: z.string().default(''),
  musclesTravailles: z.array(z.string()).default([]),
  varianteFacileId: z.string().min(1).optional(),
  varianteDifficileId: z.string().min(1).optional(),
  contreIndications: z.array(z.string()).default([]),
  impactGenou: z.enum(IMPACTS_GENOU),
  flexionMarquee: z.boolean().default(false),
  materielRequis: z.array(z.enum(MATERIELS)).default(['aucun']),
  consigneSecurite: z.string().min(1).optional(),
})

const exerciceDeSeance = z.strictObject({
  exerciceId: z.string().min(1),
  cibles,
  consigne: z.string().min(1).optional(),
})

const seanceDuPlan = z
  .strictObject({
    date: dateIso,
    type: z.enum(TYPES_SEANCE),
    titre: z.string().min(1),
    notes: z.string().min(1).optional(),
    exercices: z.array(exerciceDeSeance).default([]),
  })
  .refine(
    (seance) => seance.type === 'repos' || seance.exercices.length > 0,
    'une séance qui n’est pas un jour de repos doit contenir au moins un exercice',
  )

export const schemaPlan = z.strictObject({
  format: z.literal(MARQUEUR_FORMAT_PLAN),
  version: z.literal(VERSION_FORMAT_PLAN),
  nom: z.string().min(1),
  description: z.string().min(1).optional(),
  /** Première semaine du plan : sert à numéroter les semaines. */
  dateDebut: dateIso,
  /** Exercices à ajouter ou mettre à jour dans la bibliothèque. */
  exercices: z.array(exerciceDuPlan).default([]),
  /** Séances à poser au calendrier. */
  seances: z.array(seanceDuPlan).min(1, 'un plan doit contenir au moins une séance'),
})

export type PlanImporte = z.infer<typeof schemaPlan>
export type ExerciceDuPlan = PlanImporte['exercices'][number]
export type SeanceDuPlan = PlanImporte['seances'][number]
