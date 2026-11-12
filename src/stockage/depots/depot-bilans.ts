/**
 * Dépôt des bilans hebdomadaires.
 *
 * Un bilan par semaine de programme : `parSemaine` sert à retrouver celui
 * qu'on a déjà produit pour le corriger, plutôt qu'à en empiler un second.
 */
import type { BilanHebdo, Id } from '../../domaine/entites'
import { db, type BaseForme } from '../db'

export function depotBilans(base: BaseForme = db) {
  return {
    async parId(id: Id): Promise<BilanHebdo | undefined> {
      return base.bilans.get(id)
    },

    async parSemaine(programmeId: Id, semaine: number): Promise<BilanHebdo | undefined> {
      const candidats = await base.bilans.where('semaine').equals(semaine).toArray()
      return candidats.find((bilan) => bilan.programmeId === programmeId)
    },

    /** Du plus récent au plus ancien. Les bilans se comptent en dizaines. */
    async historique(): Promise<BilanHebdo[]> {
      const tous = await base.bilans.toArray()
      return tous.sort((a, b) => b.debut.localeCompare(a.debut))
    },

    /** Les bilans antérieurs à une date, du plus récent au plus ancien. */
    async avant(debut: string): Promise<BilanHebdo[]> {
      const tous = await base.bilans.toArray()
      return tous
        .filter((bilan) => bilan.debut < debut)
        .sort((a, b) => b.debut.localeCompare(a.debut))
    },

    async enregistrer(bilan: BilanHebdo): Promise<void> {
      await base.bilans.put(bilan)
    },

    async compter(): Promise<number> {
      return base.bilans.count()
    },
  }
}

export type DepotBilans = ReturnType<typeof depotBilans>
