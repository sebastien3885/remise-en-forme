/**
 * Les six règles de décision du chapitre 5.
 *
 * | Situation observée | Ajustement proposé |
 * | --- | --- |
 * | ≥ 80 % des séances faites et effort ≤ 6 | augmenter d'environ 10 % |
 * | entre 50 et 80 % des séances faites | maintenir |
 * | < 50 % faites, ou effort ≥ 8 | réduire d'environ 20 % |
 * | douleur signalée deux fois sur le même exercice | variante plus douce et avis médical |
 * | quatre semaines de progression d'affilée | semaine allégée (−30 %) |
 * | palier atteint sur un exercice | variante plus difficile |
 *
 * Les quatre premières lignes du tableau se recouvrent : une semaine à 85 %
 * avec un effort de 7 ne tombe dans aucune. L'ordre d'évaluation est donc
 * explicite, et « maintenir » sert de défaut :
 *
 * 1. réduire — le cas où il faut protéger ;
 * 2. semaine allégée — elle passe devant l'augmentation, sinon la quatrième
 *    semaine de progression continuerait de monter ;
 * 3. augmenter ;
 * 4. maintenir, pour tout le reste.
 *
 * Les deux dernières règles portent sur un exercice, pas sur la semaine : elles
 * s'ajoutent à la décision globale au lieu de la remplacer.
 *
 * Toute explication est rédigée ici, en clair : le chapitre 5 exige que
 * l'application dise pourquoi elle propose un changement.
 */
import { CONFIG_PROGRESSION, type ConfigProgression } from '../../config/progression'
import type {
  Ajustement,
  BilanHebdo,
  CleRegle,
  Exercice,
  Id,
  RegleAppliquee,
  RessentiCharge,
  StatistiquesSemaine,
} from '../entites'
import { variantePlusDifficile, variantePlusDouce } from '../exercices/variantes'
import type { ContexteExercices } from '../profil/precautions'
import type { SerieChargeExercice } from './bilan'
import { facteurPlafonne } from './charge'

/** Les leviers que le moteur sait manœuvrer (la fréquence reste manuelle). */
export type LevierActif = ConfigProgression['leviers'][number]

export interface EntreeRegles {
  statistiques: StatistiquesSemaine
  /** Réponse à « Comment trouves-tu la charge ? », si elle a été posée. */
  ressentiCharge: RessentiCharge | null
  /** Bilans des semaines précédentes, du plus récent au plus ancien. */
  bilansPrecedents: readonly BilanHebdo[]
  /** Historique de charge par exercice, pour détecter un palier. */
  seriesDeCharge: readonly SerieChargeExercice[]
  bibliotheque: readonly Exercice[]
  precautions: ContexteExercices
  config?: ConfigProgression
}

export interface VerdictRegles {
  reglesAppliquees: RegleAppliquee[]
  ajustements: Ajustement[]
  /** Le levier retenu pour la semaine. Un seul bouge (chapitre 5). */
  levier: LevierActif
}

// ------------------------------------------------------------- rédaction

function pourcent(taux: number): string {
  return String(Math.round(taux * 100)) + ' %'
}

function variationEnTexte(facteur: number): string {
  const ecart = Math.round((facteur - 1) * 100)
  if (ecart === 0) return 'charge maintenue'
  return (ecart > 0 ? '+' : '-') + String(Math.abs(ecart)) + ' %'
}

function texteSeances(statistiques: StatistiquesSemaine): string {
  const { seancesFaites, seancesPartielles, seancesPrevues, seancesImprovisees } = statistiques

  if (seancesPrevues === 0) {
    return seancesFaites + seancesPartielles === 0
      ? 'aucune séance prévue ni réalisée'
      : String(seancesFaites + seancesPartielles) + ' séance(s) réalisée(s) sans programme'
  }

  const total = seancesFaites + seancesPartielles
  let texte =
    String(total) +
    ' séance' +
    (total > 1 ? 's' : '') +
    ' sur ' +
    String(seancesPrevues) +
    ' réalisée' +
    (total > 1 ? 's' : '')

  if (seancesPartielles > 0) {
    texte += ', dont ' + String(seancesPartielles) + ' en partie'
  }
  if (seancesImprovisees > 0) {
    texte += ', ' + String(seancesImprovisees) + ' non prévue(s)'
  }
  return texte
}

function texteEffort(statistiques: StatistiquesSemaine): string {
  if (statistiques.effortMoyen === null) return 'effort non renseigné'
  return 'effort ' + String(Math.round(statistiques.effortMoyen * 10) / 10) + '/10'
}

function libelleDe(cle: CleRegle): string {
  const libelles: Record<CleRegle, string> = {
    augmenter: 'Augmenter la charge',
    maintenir: 'Maintenir la charge',
    reduire: 'Réduire la charge',
    'douleur-repetee': 'Douleur répétée sur un exercice',
    'semaine-allegee': 'Semaine allégée pour récupérer',
    'palier-atteint': 'Palier atteint sur un exercice',
  }
  return libelles[cle]
}

// ---------------------------------------------------------------- levier

function prochainLevier(
  bilansPrecedents: readonly BilanHebdo[],
  config: ConfigProgression,
): LevierActif {
  const premier = config.leviers[0] ?? 'duree'

  for (const bilan of bilansPrecedents) {
    const global = bilan.ajustements.find((ajustement) => ajustement.exerciceId === undefined)
    if (!global) continue

    const index = config.leviers.findIndex((levier) => levier === global.levier)
    if (index === -1) continue

    // On ne fait tourner le levier qu'après une semaine qui a bougé.
    if (global.facteur === 1) return config.leviers[index] ?? premier
    return config.leviers[(index + 1) % config.leviers.length] ?? premier
  }

  return premier
}

// -------------------------------------------------------- règle globale

function progressionsDAffilee(bilansPrecedents: readonly BilanHebdo[]): number {
  let compte = 0
  for (const bilan of bilansPrecedents) {
    const aAugmente = bilan.reglesAppliquees.some((regle) => regle.cle === 'augmenter')
    if (!aAugmente || bilan.decision === 'refuse') break
    compte += 1
  }
  return compte
}

function douleursCumulees(
  statistiques: StatistiquesSemaine,
  bilansPrecedents: readonly BilanHebdo[],
  config: ConfigProgression,
): Map<Id, number> {
  const cumul = new Map<Id, number>()

  const ajouter = (comptes: Record<Id, number>) => {
    for (const [exerciceId, nombre] of Object.entries(comptes)) {
      cumul.set(exerciceId, (cumul.get(exerciceId) ?? 0) + nombre)
    }
  }

  ajouter(statistiques.douleursParExercice)
  for (const bilan of bilansPrecedents.slice(0, config.douleurRepetee.fenetreSemaines - 1)) {
    ajouter(bilan.statistiques.douleursParExercice)
  }

  return cumul
}

interface DecisionGlobale {
  cle: CleRegle
  facteur: number
  explication: string
}

function decisionGlobale(
  entree: EntreeRegles,
  config: ConfigProgression,
  douleursRepetees: readonly Id[],
): DecisionGlobale {
  const statistiques = entree.statistiques
  const effort = statistiques.effortMoyen
  const detail = texteSeances(statistiques) + ', ' + texteEffort(statistiques)

  // Aucune séance prévue ni faite : rien à décider.
  if (
    statistiques.seancesPrevues === 0 &&
    statistiques.seancesFaites + statistiques.seancesPartielles === 0
  ) {
    return {
      cle: 'maintenir',
      facteur: 1,
      explication: 'Charge maintenue : aucune séance prévue ni réalisée cette semaine.',
    }
  }

  // 1. Réduire.
  const tropPeuDeSeances = statistiques.tauxRealisation < config.reduire.tauxRealisationSous
  const effortTropEleve = effort !== null && effort >= config.reduire.effortMoyenAPartirDe
  if (tropPeuDeSeances || effortTropEleve) {
    const facteur = facteurPlafonne(config.reduire.facteur, config)
    const cause = tropPeuDeSeances
      ? 'seulement ' + pourcent(statistiques.tauxRealisation) + ' des séances réalisées'
      : 'effort moyen de ' + String(Math.round((effort ?? 0) * 10) / 10) + '/10'
    return {
      cle: 'reduire',
      facteur,
      explication:
        variationEnTexte(facteur) +
        ' car ' +
        cause +
        ' (' +
        detail +
        '). Vérifier aussi les causes : fatigue, planning, douleurs.',
    }
  }

  // 2. Semaine allégée, avant l'augmentation.
  const progressions = progressionsDAffilee(entree.bilansPrecedents)
  if (progressions >= config.semaineAllegee.apresSemainesDeProgression) {
    const facteur = facteurPlafonne(config.semaineAllegee.facteur, config)
    return {
      cle: 'semaine-allegee',
      facteur,
      explication:
        variationEnTexte(facteur) +
        ' pour récupérer, après ' +
        String(progressions) +
        ' semaines de progression d’affilée (' +
        detail +
        ').',
    }
  }

  // 3. Augmenter, si rien ne s'y oppose.
  const assezDeSeances = statistiques.tauxRealisation >= config.augmenter.tauxRealisationAPartirDe
  const effortSupportable = effort !== null && effort <= config.augmenter.effortMoyenJusqua

  if (assezDeSeances && effortSupportable) {
    if (douleursRepetees.length > 0 && config.douleurRepetee.bloqueAugmentation) {
      return {
        cle: 'maintenir',
        facteur: 1,
        explication:
          'Charge maintenue malgré ' +
          detail +
          ' : une douleur s’est répétée cette semaine, ce n’est pas le moment d’en ajouter.',
      }
    }

    if (entree.ressentiCharge === 'trop-dur' && config.ressentiCharge.tropDurBloqueAugmentation) {
      return {
        cle: 'maintenir',
        facteur: 1,
        explication:
          'Charge maintenue malgré ' +
          detail +
          ' : la charge a été jugée trop dure en fin de semaine.',
      }
    }

    const facteur = facteurPlafonne(config.augmenter.facteur, config)
    return {
      cle: 'augmenter',
      facteur,
      explication: variationEnTexte(facteur) + ' car ' + detail + '.',
    }
  }

  // 4. Maintenir, par défaut.
  const raison =
    effort !== null && effort > config.augmenter.effortMoyenJusqua
      ? 'l’effort reste au-dessus de ' + String(config.augmenter.effortMoyenJusqua) + '/10'
      : 'le taux de réalisation est de ' + pourcent(statistiques.tauxRealisation)

  return {
    cle: 'maintenir',
    facteur: 1,
    explication: 'Charge maintenue car ' + raison + ' (' + detail + ').',
  }
}

// ----------------------------------------------------- règles par exercice

function nomDe(exerciceId: Id, bibliotheque: readonly Exercice[]): string {
  return bibliotheque.find((exercice) => exercice.id === exerciceId)?.nom ?? exerciceId
}

function regleDouleur(
  entree: EntreeRegles,
  config: ConfigProgression,
  douleurs: Map<Id, number>,
  levier: LevierActif,
): { regles: RegleAppliquee[]; ajustements: Ajustement[] } {
  const regles: RegleAppliquee[] = []
  const ajustements: Ajustement[] = []

  for (const [exerciceId, nombre] of [...douleurs.entries()].sort(([a], [b]) =>
    a.localeCompare(b),
  )) {
    if (nombre < config.douleurRepetee.signalementsAvantRemplacement) continue

    const exercice = entree.bibliotheque.find((candidat) => candidat.id === exerciceId)
    const plusDouce = exercice
      ? variantePlusDouce(exercice, entree.bibliotheque, entree.precautions)
      : undefined

    const nom = nomDe(exerciceId, entree.bibliotheque)
    const avis = config.douleurRepetee.suggereAvisMedical
      ? ' Un avis médical est conseillé.'
      : ''

    const explication = plusDouce
      ? 'Douleur signalée ' +
        String(nombre) +
        ' fois sur « ' +
        nom +
        ' » : remplacé par la variante plus douce « ' +
        plusDouce.nom +
        ' ».' +
        avis
      : 'Douleur signalée ' +
        String(nombre) +
        ' fois sur « ' +
        nom +
        ' » : aucune variante plus douce disponible. Réduire la charge de cet exercice, ou l’écarter dans les réglages.' +
        avis

    regles.push({
      cle: 'douleur-repetee',
      libelle: libelleDe('douleur-repetee'),
      explication,
    })
    ajustements.push({
      regle: 'douleur-repetee',
      levier,
      facteur: 1,
      exerciceId,
      ...(plusDouce ? { remplacementParId: plusDouce.id } : {}),
      ...(config.douleurRepetee.suggereAvisMedical ? { avisMedicalSuggere: true } : {}),
      explication,
    })
  }

  return { regles, ajustements }
}

/** Vrai si les dernières semaines de la série sont consécutives et à l'arrêt. */
function estEnPalier(serie: SerieChargeExercice, config: ConfigProgression): boolean {
  const requis = config.palierAtteint.semainesSansProgression
  if (serie.points.length < requis) return false

  const derniers = serie.points.slice(-requis)

  // Les semaines doivent se suivre : un trou n'est pas un palier.
  for (let index = 1; index < derniers.length; index += 1) {
    const precedent = derniers[index - 1]
    const courant = derniers[index]
    if (!precedent || !courant) return false
    if (courant.semaine !== precedent.semaine + 1) return false
  }

  const valeurs = derniers.map((point) => point.valeur)
  const maximum = Math.max(...valeurs)
  const minimum = Math.min(...valeurs)
  if (maximum === 0) return false

  return (maximum - minimum) / maximum <= config.palierAtteint.ecartRelatifTolere
}

function reglePalier(
  entree: EntreeRegles,
  config: ConfigProgression,
  decision: DecisionGlobale,
  douleursRepetees: readonly Id[],
  levier: LevierActif,
): { regles: RegleAppliquee[]; ajustements: Ajustement[] } {
  const regles: RegleAppliquee[] = []
  const ajustements: Ajustement[] = []

  // Proposer plus dur alors qu'on vient de réduire ou d'alléger n'aurait
  // pas de sens.
  if (decision.cle !== 'augmenter' && decision.cle !== 'maintenir') {
    return { regles, ajustements }
  }

  for (const serie of [...entree.seriesDeCharge].sort((a, b) =>
    a.exerciceId.localeCompare(b.exerciceId),
  )) {
    if (douleursRepetees.includes(serie.exerciceId)) continue
    if (!estEnPalier(serie, config)) continue

    const exercice = entree.bibliotheque.find((candidat) => candidat.id === serie.exerciceId)
    if (!exercice) continue

    const plusDifficile = variantePlusDifficile(exercice, entree.bibliotheque, entree.precautions)
    // Sans variante disponible, il n'y a rien à proposer : inutile de répéter
    // chaque semaine qu'un palier est atteint.
    if (!plusDifficile) continue

    const derniers = serie.points.slice(-config.palierAtteint.semainesSansProgression)
    const valeur = derniers[derniers.length - 1]?.valeur ?? 0

    const explication =
      'Palier sur « ' +
      exercice.nom +
      ' » : ' +
      String(derniers.length) +
      ' semaines à ' +
      String(valeur) +
      '. Variante plus difficile proposée : « ' +
      plusDifficile.nom +
      ' ».'

    regles.push({
      cle: 'palier-atteint',
      libelle: libelleDe('palier-atteint'),
      explication,
    })
    ajustements.push({
      regle: 'palier-atteint',
      levier,
      facteur: 1,
      exerciceId: serie.exerciceId,
      remplacementParId: plusDifficile.id,
      explication,
    })
  }

  return { regles, ajustements }
}

// ------------------------------------------------------------- évaluation

/** Applique les six règles et rend les propositions, explications comprises. */
export function evaluerRegles(entree: EntreeRegles): VerdictRegles {
  const config = entree.config ?? CONFIG_PROGRESSION
  const levier = prochainLevier(entree.bilansPrecedents, config)

  const douleurs = douleursCumulees(entree.statistiques, entree.bilansPrecedents, config)
  const douleursRepetees = [...douleurs.entries()]
    .filter(([, nombre]) => nombre >= config.douleurRepetee.signalementsAvantRemplacement)
    .map(([exerciceId]) => exerciceId)

  const decision = decisionGlobale(entree, config, douleursRepetees)

  const regleGlobale: RegleAppliquee = {
    cle: decision.cle,
    libelle: libelleDe(decision.cle),
    explication: decision.explication,
  }

  const ajustementGlobal: Ajustement = {
    regle: decision.cle,
    levier,
    facteur: decision.facteur,
    explication: decision.explication,
  }

  const douleur = regleDouleur(entree, config, douleurs, levier)
  const palier = reglePalier(entree, config, decision, douleursRepetees, levier)

  return {
    reglesAppliquees: [regleGlobale, ...douleur.regles, ...palier.regles],
    ajustements: [ajustementGlobal, ...douleur.ajustements, ...palier.ajustements],
    levier,
  }
}
