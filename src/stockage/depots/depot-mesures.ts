/**
 * Dépôt des mesures corporelles : poids et tour de taille.
 *
 * Saisie hebdomadaire (chapitre 6). Une seule mesure par jour : se repeser
 * deux fois le même matin corrige la ligne du jour plutôt que d'en créer une
 * seconde, qui tirerait la moyenne glissante sans rien apprendre.
 */
import type { DateIso, Id, MesureCorporelle } from '../../domaine/entites'
import { db, type BaseForme } from '../db'

export function depotMesures(base: BaseForme = db) {
  return {
    async parId(id: Id): Promise<MesureCorporelle | undefined> {
      return base.mesures.get(id)
    },

    async duJour(date: DateIso): Promise<MesureCorporelle | undefined> {
      return base.mesures.where('date').equals(date).first()
    },

    /** De la plus ancienne à la plus récente. */
    async toutes(): Promise<MesureCorporelle[]> {
      const mesures = await base.mesures.toArray()
      return mesures.sort((a, b) => a.date.localeCompare(b.date))
    },

    async derniere(): Promise<MesureCorporelle | undefined> {
      const mesures = await base.mesures.toArray()
      return mesures.sort((a, b) => b.date.localeCompare(a.date))[0]
    },

    async enregistrer(mesure: MesureCorporelle): Promise<MesureCorporelle> {
      const dejaLa = (await base.mesures.where('date').equals(mesure.date).toArray()).find(
        (candidat) => candidat.id !== mesure.id,
      )

      const aEcrire = dejaLa ? { ...mesure, id: dejaLa.id } : mesure
      await base.mesures.put(aEcrire)
      return aEcrire
    },

    async supprimer(id: Id): Promise<void> {
      await base.mesures.delete(id)
    },

    async compter(): Promise<number> {
      return base.mesures.count()
    },
  }
}

export type DepotMesures = ReturnType<typeof depotMesures>
