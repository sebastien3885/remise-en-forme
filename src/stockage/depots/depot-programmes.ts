/**
 * Dépôt des programmes.
 *
 * Jamais d'écrasement (chapitre 7) : `remplacerActif` n'efface pas l'ancienne
 * version, elle la désactive et en crée une nouvelle. Tout l'historique des
 * révisions reste consultable.
 *
 * `actif` est un booléen, donc non indexable par IndexedDB : on filtre en
 * mémoire sur une table qui comptera au plus quelques dizaines de lignes.
 */
import type { Id, Programme } from '../../domaine/entites'
import { db, type BaseForme } from '../db'

export function depotProgrammes(base: BaseForme = db) {
  return {
    /** Le programme en cours, ou `undefined` si aucun n'a été généré. */
    async actif(): Promise<Programme | undefined> {
      const tous = await base.programmes.toArray()
      const actifs = tous.filter((programme) => programme.actif)
      // S'il y en avait plusieurs, la version la plus haute fait foi.
      return actifs.sort((a, b) => b.version - a.version)[0]
    },

    async parId(id: Id): Promise<Programme | undefined> {
      return base.programmes.get(id)
    },

    /** Tout l'historique, de la version la plus récente à la plus ancienne. */
    async historique(): Promise<Programme[]> {
      return base.programmes.orderBy('version').reverse().toArray()
    },

    /** Numéro de version suivant, 1 s'il n'y a encore aucun programme. */
    async prochaineVersion(): Promise<number> {
      const dernier = await base.programmes.orderBy('version').last()
      return (dernier?.version ?? 0) + 1
    },

    async enregistrer(programme: Programme): Promise<void> {
      await base.programmes.put(programme)
    },

    /**
     * Rend `programme` actif et désactive tous les autres, en une transaction :
     * à aucun moment la base n'a deux programmes actifs ni aucun.
     */
    async remplacerActif(programme: Programme): Promise<Programme> {
      const actif: Programme = { ...programme, actif: true }
      await base.transaction('rw', base.programmes, async () => {
        const anciens = await base.programmes.toArray()
        const aDesactiver = anciens
          .filter((ancien) => ancien.actif && ancien.id !== actif.id)
          .map((ancien) => ({ ...ancien, actif: false }))
        if (aDesactiver.length > 0) {
          await base.programmes.bulkPut(aDesactiver)
        }
        await base.programmes.put(actif)
      })
      return actif
    },

    async compter(): Promise<number> {
      return base.programmes.count()
    },
  }
}

export type DepotProgrammes = ReturnType<typeof depotProgrammes>
