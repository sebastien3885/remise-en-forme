/**
 * Dépôt de l'hydratation : un compteur de verres par jour.
 *
 * La date fait office de clé, donc l'invariant « un jour, une ligne » est
 * porté par le stockage et pas par du code de vérification. L'objectif du
 * jour est recopié depuis le profil au moment de la première gorgée : si
 * l'objectif change plus tard, l'historique reste juste.
 */
import { maintenantIso } from '../../domaine/dates'
import type { DateIso, Hydratation } from '../../domaine/entites'
import { db, type BaseForme } from '../db'

export function depotHydratation(base: BaseForme = db) {
  return {
    async duJour(date: DateIso): Promise<Hydratation | undefined> {
      return base.hydratation.get(date)
    },

    /**
     * Ajoute (ou retire, avec un pas négatif) des verres, sans jamais passer
     * sous zéro. Crée la ligne du jour si elle n'existe pas encore.
     */
    async ajouter(
      date: DateIso,
      pas: number,
      objectifParDefaut: number,
      maintenant: Date = new Date(),
    ): Promise<Hydratation> {
      const existante = await base.hydratation.get(date)
      const aEcrire: Hydratation = {
        date,
        verres: Math.max(0, (existante?.verres ?? 0) + pas),
        objectif: existante?.objectif ?? objectifParDefaut,
        misAJourLe: maintenantIso(maintenant),
      }
      await base.hydratation.put(aEcrire)
      return aEcrire
    },

    async enregistrer(hydratation: Hydratation): Promise<void> {
      await base.hydratation.put(hydratation)
    },
  }
}

export type DepotHydratation = ReturnType<typeof depotHydratation>
