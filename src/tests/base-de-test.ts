/**
 * Base IndexedDB jetable pour les tests de la couche stockage.
 *
 * Chaque cas de test ouvre sa propre base, sous un nom unique : aucun test ne
 * voit les données d'un autre, et l'ordre d'exécution n'a pas d'importance.
 */
import Dexie from 'dexie'

import { BaseForme } from '../stockage/db'

/** Ouvre une base vide et rend la base ainsi qu'une fonction de nettoyage. */
export async function baseDeTest(): Promise<{
  base: BaseForme
  fermer: () => Promise<void>
}> {
  const nom = 'test-' + crypto.randomUUID()
  const base = new BaseForme(nom)
  await base.open()

  return {
    base,
    fermer: async () => {
      base.close()
      await Dexie.delete(nom)
    },
  }
}
