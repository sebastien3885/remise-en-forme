/**
 * Dépôt de la bibliothèque d'exercices.
 *
 * `enregistrerPlusieurs` utilise `bulkPut` : c'est ce que fait l'import d'un
 * plan, qui remplit la bibliothèque en une transaction.
 */
import type { CategorieExercice, Exercice, Id } from '../../domaine/entites'
import { db, type BaseForme } from '../db'

export function depotExercices(base: BaseForme = db) {
  return {
    async tous(): Promise<Exercice[]> {
      return base.exercices.orderBy('id').toArray()
    },

    async parId(id: Id): Promise<Exercice | undefined> {
      return base.exercices.get(id)
    },

    /** Plusieurs exercices d'un coup, dans l'ordre demandé, sans les manquants. */
    async parIds(ids: Id[]): Promise<Exercice[]> {
      const trouves = await base.exercices.bulkGet(ids)
      return trouves.filter((exercice): exercice is Exercice => exercice !== undefined)
    },

    async parCategorie(categorie: CategorieExercice): Promise<Exercice[]> {
      return base.exercices.where('categorie').equals(categorie).toArray()
    },

    async enregistrer(exercice: Exercice): Promise<void> {
      await base.exercices.put(exercice)
    },

    /** Écrit ou remplace un lot d'exercices en une seule transaction. */
    async enregistrerPlusieurs(exercices: Exercice[]): Promise<void> {
      if (exercices.length === 0) return
      await base.exercices.bulkPut(exercices)
    },

    async supprimer(id: Id): Promise<void> {
      await base.exercices.delete(id)
    },

    async compter(): Promise<number> {
      return base.exercices.count()
    },

    /** Vide la bibliothèque. Réservé au remplacement complet et aux tests. */
    async effacerTout(): Promise<void> {
      await base.exercices.clear()
    },
  }
}

export type DepotExercices = ReturnType<typeof depotExercices>
