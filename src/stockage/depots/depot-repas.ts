/**
 * Dépôt du journal alimentaire.
 *
 * Un seul petit-déjeuner, un seul déjeuner et un seul dîner par jour :
 * réenregistrer corrige celui qui existe. Les collations, elles, se répètent —
 * on en prend deux dans la journée sans que ce soit une erreur de saisie.
 */
import type { DateIso, Id, MomentRepas, Repas } from '../../domaine/entites'
import { db, type BaseForme } from '../db'

/** Les moments dont il n'existe qu'un par jour. */
const MOMENTS_UNIQUES: readonly MomentRepas[] = ['petit-dejeuner', 'dejeuner', 'diner']

export function depotRepas(base: BaseForme = db) {
  return {
    async parId(id: Id): Promise<Repas | undefined> {
      return base.repas.get(id)
    },

    async duJour(date: DateIso): Promise<Repas[]> {
      const repas = await base.repas.where('date').equals(date).toArray()
      return repas.sort((a, b) => a.saisieLe.localeCompare(b.saisieLe))
    },

    async parPlage(debut: DateIso, fin: DateIso): Promise<Repas[]> {
      const repas = await base.repas.where('date').between(debut, fin, true, true).toArray()
      return repas.sort((a, b) => a.date.localeCompare(b.date))
    },

    /**
     * Enregistre un repas. Pour un moment unique, remplace celui du jour au
     * lieu d'en ajouter un second : corriger son déjeuner ne doit pas faire
     * croire qu'on a déjeuné deux fois.
     */
    async enregistrer(repas: Repas): Promise<Repas> {
      if (!MOMENTS_UNIQUES.includes(repas.moment)) {
        await base.repas.put(repas)
        return repas
      }

      const dejaLa = (await base.repas.where('date').equals(repas.date).toArray()).find(
        (candidat) => candidat.moment === repas.moment && candidat.id !== repas.id,
      )

      const aEcrire = dejaLa ? { ...repas, id: dejaLa.id } : repas
      await base.repas.put(aEcrire)
      return aEcrire
    },

    async supprimer(id: Id): Promise<void> {
      await base.repas.delete(id)
    },

    async compter(): Promise<number> {
      return base.repas.count()
    },
  }
}

export type DepotRepas = ReturnType<typeof depotRepas>
