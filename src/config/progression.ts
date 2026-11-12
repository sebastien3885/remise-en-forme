/**
 * Configuration des règles de progression du chapitre 5.
 *
 * Le cahier des charges demande un « fichier de configuration pour les règles
 * de progression, afin de les ajuster sans toucher au code ». Les valeurs
 * vivent donc dans `progression.json`, pas dans un fichier TypeScript : un
 * `.ts` reste du code. Ce module ne fait que le lire et le contrôler.
 *
 * Le contrôle est strict et porte aussi sur les plafonds de sécurité du
 * chapitre 10 : la configuration ne peut pas autoriser une augmentation de
 * plus de 10 %, ni supprimer le jour de repos hebdomadaire. Un fichier qui
 * essaierait est refusé au chargement.
 */
import { z } from 'zod'

import valeursParDefaut from './progression.json'

/** Plafond absolu du chapitre 10 : jamais plus de 10 % d'une semaine à l'autre. */
export const AUGMENTATION_MAXIMALE_ABSOLUE = 1.1

/** Au moins un jour de repos complet par semaine (chapitres 3 et 10). */
export const JOURS_DE_REPOS_MINIMUM_ABSOLU = 1

const taux = z.number().min(0).max(1)

export const schemaConfigProgression = z.strictObject({
  version: z.literal(1),

  /** Poids d'une séance faite en partie dans le taux de réalisation. */
  poidsSeancePartielle: taux,

  reduire: z.strictObject({
    /** En dessous de ce taux de réalisation, on réduit la charge. */
    tauxRealisationSous: taux,
    /** À partir de cet effort moyen, on réduit la charge. */
    effortMoyenAPartirDe: z.number().min(1).max(10),
    /** 0.8 pour « environ 20 % de moins ». */
    facteur: z.number().gt(0).lte(1),
  }),

  maintenir: z.strictObject({
    tauxRealisationAPartirDe: taux,
  }),

  augmenter: z.strictObject({
    tauxRealisationAPartirDe: taux,
    effortMoyenJusqua: z.number().min(1).max(10),
    /** 1.1 pour « environ 10 % de plus ». Ne peut pas dépasser le plafond. */
    facteur: z.number().gte(1).lte(AUGMENTATION_MAXIMALE_ABSOLUE),
  }),

  semaineAllegee: z.strictObject({
    /** Après ce nombre de semaines de progression d'affilée. */
    apresSemainesDeProgression: z.number().int().min(1),
    /** 0.7 pour « environ 30 % de moins ». */
    facteur: z.number().gt(0).lte(1),
  }),

  douleurRepetee: z.strictObject({
    /** « Douleur signalée deux fois sur le même exercice » : donc 2. */
    signalementsAvantRemplacement: z.number().int().min(1),
    /** Intensité minimale pour qu'une douleur compte comme signalée. */
    intensiteMinimale: z.number().min(0).max(10),
    /** Nombre de semaines sur lesquelles les signalements se cumulent. */
    fenetreSemaines: z.number().int().min(1),
    /**
     * Interdit l'augmentation de charge la semaine où une douleur se répète.
     * Le chapitre 5 ne le dit pas explicitement ; c'est une précaution, et
     * elle est ici pour pouvoir être désactivée en connaissance de cause.
     */
    bloqueAugmentation: z.boolean(),
    suggereAvisMedical: z.boolean(),
  }),

  palierAtteint: z.strictObject({
    /** Nombre de semaines sans progrès avant de parler de palier. */
    semainesSansProgression: z.number().int().min(2),
    /** Écart relatif en dessous duquel deux semaines se valent (2 %). */
    ecartRelatifTolere: z.number().min(0).max(1),
  }),

  ressentiCharge: z.strictObject({
    /** Une réponse « trop dur » empêche l'augmentation proposée. */
    tropDurBloqueAugmentation: z.boolean(),
  }),

  /**
   * Leviers utilisables, dans l'ordre où le moteur les fait tourner. Un seul
   * bouge par semaine (chapitre 5).
   *
   * La **fréquence** n'y figure pas : ajouter ou retirer une séance est une
   * décision de planning, que l'utilisateur prend lui-même dans l'écran
   * Semaine (chapitre 3, « planification libre »). Le moteur ne touche qu'à la
   * charge des séances déjà prévues.
   */
  leviers: z.array(z.enum(['duree', 'intensite'])).min(1),

  plafonds: z.strictObject({
    augmentationMaximale: z.number().gte(1).lte(AUGMENTATION_MAXIMALE_ABSOLUE),
    /** Plancher de réduction : on ne descend jamais sous la moitié. */
    reductionMaximale: z.number().gt(0).lte(1),
    joursDeReposParSemaineMinimum: z.number().int().gte(JOURS_DE_REPOS_MINIMUM_ABSOLU),
    /**
     * Les quantités sont entières : on ne nage pas 8,8 longueurs. Quand 10 %
     * ne suffisent pas à franchir une unité, cette option autorise le plus
     * petit pas réel — une longueur de plus sur huit, soit 12,5 %.
     *
     * C'est le seul endroit où le plafond des 10 % est dépassé, et c'est un
     * choix assumé : l'alternative est de ne jamais progresser sur les petites
     * quantités entières. À `false`, la charge reste inchangée et c'est la
     * règle du palier qui finit par proposer la variante plus difficile.
     */
    autoriserLePlusPetitPas: z.boolean(),
  }),
})

export type ConfigProgression = z.infer<typeof schemaConfigProgression>

export interface ErreurConfig {
  chemin: string
  message: string
}

export type ResultatConfig =
  | { valide: true; config: ConfigProgression }
  | { valide: false; erreurs: ErreurConfig[] }

/** Contrôle une configuration, par exemple une version modifiée par l'utilisateur. */
export function analyserConfigProgression(donnees: unknown): ResultatConfig {
  const resultat = schemaConfigProgression.safeParse(donnees)
  if (!resultat.success) {
    return {
      valide: false,
      erreurs: resultat.error.issues.map((probleme) => ({
        chemin: probleme.path.join('.') || 'racine',
        message: probleme.message,
      })),
    }
  }

  const config = resultat.data
  const erreurs: ErreurConfig[] = []

  // Cohérence entre les seuils, invisible pour le schéma champ par champ.
  if (config.reduire.tauxRealisationSous > config.augmenter.tauxRealisationAPartirDe) {
    erreurs.push({
      chemin: 'reduire.tauxRealisationSous',
      message:
        'le seuil de réduction ne peut pas être au-dessus du seuil d’augmentation : aucune semaine ne tomberait dans « maintenir »',
    })
  }
  if (config.augmenter.facteur > config.plafonds.augmentationMaximale) {
    erreurs.push({
      chemin: 'augmenter.facteur',
      message: 'le facteur d’augmentation dépasse le plafond déclaré dans `plafonds`',
    })
  }

  if (erreurs.length > 0) return { valide: false, erreurs }
  return { valide: true, config }
}

/**
 * La configuration livrée avec l'application. Contrôlée au chargement : un
 * `progression.json` incohérent fait échouer le démarrage plutôt que de
 * produire des propositions silencieusement fausses.
 */
export const CONFIG_PROGRESSION: ConfigProgression = (() => {
  const resultat = analyserConfigProgression(valeursParDefaut)
  if (!resultat.valide) {
    throw new Error(
      'src/config/progression.json est invalide :\n' +
        resultat.erreurs.map((erreur) => '- ' + erreur.chemin + ' : ' + erreur.message).join('\n'),
    )
  }
  return resultat.config
})()
