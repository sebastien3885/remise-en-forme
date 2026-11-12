/**
 * Repères alimentaires (chapitre 6).
 *
 * Comme les règles de progression, ils vivent dans un JSON : le chapitre 6
 * veut des « repères personnalisés », donc on doit pouvoir en désactiver un
 * ou le renommer sans toucher au code.
 *
 * Ce qui reste en code, c'est **ce qu'un repère mesure** : la logique a besoin
 * des champs du bilan rapide, elle ne se décrit pas en JSON. Un repère du
 * fichier dont l'identifiant n'est pas connu ici est refusé au chargement,
 * plutôt qu'ignoré en silence.
 *
 * Garde-fou du chapitre 6 : aucun repère ne porte de cible chiffrée
 * restrictive. On compte des jours tenus, jamais des calories.
 */
import { z } from 'zod'

import { MOMENTS_REPAS } from '../domaine/entites'
import valeursParDefaut from './reperes.json'

/** Les repères que le code sait évaluer. */
export const IDS_REPERES = [
  'legumes',
  'proteines',
  'sansBoissonSucree',
  'hydratation',
] as const
export type IdRepere = (typeof IDS_REPERES)[number]

export const schemaConfigReperes = z.strictObject({
  version: z.literal(1),

  /** Les repas sur lesquels portent les repères « à chaque repas ». */
  repasPrincipaux: z.array(z.enum(MOMENTS_REPAS)).min(1),

  reperes: z
    .array(
      z.strictObject({
        id: z.enum(IDS_REPERES),
        libelle: z.string().min(1),
        actif: z.boolean(),
      }),
    )
    .min(1),

  regularite: z.strictObject({
    /** Cible du chapitre 1 : au moins 5 jours de journal par semaine. */
    joursRenseignesParSemaine: z.number().int().min(1).max(7),
  }),
})

export type ConfigReperes = z.infer<typeof schemaConfigReperes>

export interface ErreurConfigReperes {
  chemin: string
  message: string
}

export type ResultatConfigReperes =
  | { valide: true; config: ConfigReperes }
  | { valide: false; erreurs: ErreurConfigReperes[] }

export function analyserConfigReperes(donnees: unknown): ResultatConfigReperes {
  const resultat = schemaConfigReperes.safeParse(donnees)
  if (!resultat.success) {
    return {
      valide: false,
      erreurs: resultat.error.issues.map((probleme) => ({
        chemin: probleme.path.join('.') || 'racine',
        message: probleme.message,
      })),
    }
  }

  const identifiants = resultat.data.reperes.map((repere) => repere.id)
  if (new Set(identifiants).size !== identifiants.length) {
    return {
      valide: false,
      erreurs: [{ chemin: 'reperes', message: 'deux repères portent le même identifiant' }],
    }
  }

  return { valide: true, config: resultat.data }
}

/** Les repères livrés avec l'application, contrôlés au chargement. */
export const CONFIG_REPERES: ConfigReperes = (() => {
  const resultat = analyserConfigReperes(valeursParDefaut)
  if (!resultat.valide) {
    throw new Error(
      'src/config/reperes.json est invalide :\n' +
        resultat.erreurs.map((erreur) => '- ' + erreur.chemin + ' : ' + erreur.message).join('\n'),
    )
  }
  return resultat.config
})()
