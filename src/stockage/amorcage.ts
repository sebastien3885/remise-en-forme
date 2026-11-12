/**
 * Amorçage au premier lancement : profil par défaut et bibliothèque de départ.
 *
 * La fonction est idempotente, et prudente : elle ne remplit la bibliothèque
 * que si elle est **vide**. Sans cette précaution, un exercice écarté à la
 * main dans les réglages réapparaîtrait à chaque ouverture de l'application.
 */
import { bibliothequeInitiale } from '../domaine/exercices/bibliotheque'
import { profilParDefaut } from '../domaine/profil/profil-par-defaut'
import { creerDepots, type Depots } from './index'

export interface ResultatAmorcage {
  profilCree: boolean
  exercicesAjoutes: number
}

export async function amorcerSiNecessaire(
  depots: Depots = creerDepots(),
  options: { maintenant?: Date } = {},
): Promise<ResultatAmorcage> {
  const maintenant = options.maintenant ?? new Date()

  let profilCree = false
  if (!(await depots.profil.lire())) {
    await depots.profil.enregistrer(profilParDefaut({ maintenant }), maintenant)
    profilCree = true
  }

  let exercicesAjoutes = 0
  if ((await depots.exercices.compter()) === 0) {
    const bibliotheque = bibliothequeInitiale(maintenant)
    await depots.exercices.enregistrerPlusieurs(bibliotheque)
    exercicesAjoutes = bibliotheque.length
  }

  return { profilCree, exercicesAjoutes }
}

/**
 * Supprime toutes les données locales, pour le bouton « Supprimer toutes mes
 * données » du chapitre 10. Le prochain amorçage repart de zéro.
 */
export async function effacerToutesLesDonnees(base: {
  tables: { clear: () => Promise<void> }[]
}): Promise<void> {
  for (const table of base.tables) {
    await table.clear()
  }
}
