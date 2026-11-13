/**
 * Export CSV des séances et du journal (chapitre 9).
 *
 * Le JSON sert de sauvegarde, le CSV sert à regarder ses données ailleurs —
 * un tableur, un graphique fait à la main. Deux détails pratiques qui
 * changent tout à l'ouverture :
 *
 * - **Le point-virgule comme séparateur.** Un Excel en français lit la virgule
 *   comme séparateur décimal ; avec elle, tout atterrit dans une seule
 *   colonne.
 * - **Une marque d'ordre des octets en tête.** Sans elle, Excel ouvre le
 *   fichier en ANSI et « séance » devient « sÃ©ance ».
 */
import type {
  Exercice,
  Hydratation,
  MesureCorporelle,
  Repas,
  SeanceRealisee,
} from '../entites'
import { formaterMesures } from '../mesures'

const SEPARATEUR = ';'
/**
 * La marque d'ordre des octets, nommée plutôt que tapée : le caractère brut
 * dans un fichier source est invisible et se perd au premier copier-coller.
 */
const MARQUE_ORDRE_OCTETS = String.fromCharCode(0xfeff)

function echapper(valeur: string | number | undefined): string {
  if (valeur === undefined) return ''
  const texte = String(valeur)
  if (!/[;"\n\r]/.test(texte)) return texte
  return '"' + texte.replace(/"/g, '""') + '"'
}

function ligne(cellules: (string | number | undefined)[]): string {
  return cellules.map(echapper).join(SEPARATEUR)
}

function document(entetes: string[], lignes: string[]): string {
  return MARQUE_ORDRE_OCTETS + [ligne(entetes), ...lignes].join('\r\n') + '\r\n'
}

/**
 * Une ligne par exercice réalisé : c'est la forme qui se filtre et se trie
 * dans un tableur. Les colonnes de la séance se répètent.
 */
export function csvDesSeances(
  seances: readonly SeanceRealisee[],
  bibliotheque: readonly Exercice[],
): string {
  const nomParId = new Map(bibliotheque.map((exercice) => [exercice.id, exercice.nom]))
  const triees = [...seances].sort(
    (a, b) => a.date.localeCompare(b.date) || a.saisieLe.localeCompare(b.saisieLe),
  )

  const lignes: string[] = []

  for (const seance of triees) {
    const commun = [
      seance.date,
      seance.type,
      seance.titre,
      seance.statut,
      seance.motif,
      seance.effort,
      seance.energie,
      seance.heuresSommeil,
      seance.douleurs.map((douleur) => douleur.zone + ' ' + String(douleur.intensite)).join(', '),
      seance.note,
    ]

    if (seance.exercices.length === 0) {
      lignes.push(ligne([...commun, '', '', '']))
      continue
    }

    for (const exercice of [...seance.exercices].sort((a, b) => a.ordre - b.ordre)) {
      lignes.push(
        ligne([
          ...commun,
          nomParId.get(exercice.exerciceId) ?? exercice.exerciceId,
          formaterMesures(exercice.reel),
          exercice.douleur,
        ]),
      )
    }
  }

  return document(
    [
      'date',
      'type',
      'titre',
      'statut',
      'motif',
      'effort',
      'energie',
      'sommeil_heures',
      'douleurs',
      'note',
      'exercice',
      'realise',
      'douleur_exercice',
    ],
    lignes,
  )
}

/** Une ligne par jour : repas, eau et mesures côte à côte. */
export function csvDuJournal(
  repas: readonly Repas[],
  hydratation: readonly Hydratation[],
  mesures: readonly MesureCorporelle[],
): string {
  const jours = new Set<string>()
  for (const element of repas) jours.add(element.date)
  for (const element of hydratation) jours.add(element.date)
  for (const element of mesures) jours.add(element.date)

  const parJour = (date: string, moment: Repas['moment']) =>
    repas.filter((element) => element.date === date && element.moment === moment)

  const resumer = (elements: readonly Repas[]) =>
    elements.map((element) => element.description).filter(Boolean).join(' | ')

  const oui = (elements: readonly Repas[], champ: keyof Repas['bilanRapide']) =>
    elements.length === 0 ? '' : elements.every((element) => element.bilanRapide[champ]) ? 'oui' : 'non'

  const lignes = [...jours].sort().map((date) => {
    const duJour = repas.filter((element) => element.date === date)
    const principaux = duJour.filter((element) => element.moment !== 'collation')
    const eau = hydratation.find((element) => element.date === date)
    const mesure = mesures.find((element) => element.date === date)

    return ligne([
      date,
      resumer(parJour(date, 'petit-dejeuner')),
      resumer(parJour(date, 'dejeuner')),
      resumer(parJour(date, 'diner')),
      resumer(parJour(date, 'collation')),
      oui(principaux, 'legumes'),
      oui(principaux, 'proteines'),
      duJour.length === 0
        ? ''
        : duJour.some((element) => element.bilanRapide.boissonSucree)
          ? 'oui'
          : 'non',
      eau?.verres,
      eau?.objectif,
      mesure?.poidsKg,
      mesure?.tourTailleCm,
    ])
  })

  return document(
    [
      'date',
      'petit_dejeuner',
      'dejeuner',
      'diner',
      'collations',
      'legumes_a_chaque_repas',
      'proteines_a_chaque_repas',
      'boisson_sucree',
      'verres_eau',
      'objectif_eau',
      'poids_kg',
      'tour_taille_cm',
    ],
    lignes,
  )
}
