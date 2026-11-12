/**
 * Dépôt du profil : une seule ligne, sous la clé `ID_PROFIL`.
 *
 * Toute écriture rafraîchit `misAJourLe` : le dépôt est le seul endroit qui
 * sait quand les données ont bougé.
 */
import { maintenantIso } from '../../domaine/dates'
import { ID_PROFIL, type Profil } from '../../domaine/entites'
import { db, type BaseForme } from '../db'

export function depotProfil(base: BaseForme = db) {
  return {
    /** Le profil, ou `undefined` si le questionnaire n'a jamais été rempli. */
    async lire(): Promise<Profil | undefined> {
      return base.profil.get(ID_PROFIL)
    },

    /** Écrit le profil en entier. */
    async enregistrer(profil: Profil, maintenant: Date = new Date()): Promise<Profil> {
      const aEcrire: Profil = {
        ...profil,
        id: ID_PROFIL,
        misAJourLe: maintenantIso(maintenant),
      }
      await base.profil.put(aEcrire)
      return aEcrire
    },

    /**
     * Modifie quelques champs du profil existant. Échoue si le profil n'existe
     * pas encore : mieux vaut une erreur claire qu'un profil à moitié rempli.
     */
    async modifier(
      changements: Partial<Omit<Profil, 'id' | 'misAJourLe'>>,
      maintenant: Date = new Date(),
    ): Promise<Profil> {
      const existant = await base.profil.get(ID_PROFIL)
      if (!existant) {
        throw new Error("Aucun profil enregistré : impossible de le modifier.")
      }
      const aEcrire: Profil = {
        ...existant,
        ...changements,
        id: ID_PROFIL,
        misAJourLe: maintenantIso(maintenant),
      }
      await base.profil.put(aEcrire)
      return aEcrire
    },

    /** Supprime le profil. Utilisé par « Supprimer toutes mes données ». */
    async effacer(): Promise<void> {
      await base.profil.delete(ID_PROFIL)
    },
  }
}

export type DepotProfil = ReturnType<typeof depotProfil>
