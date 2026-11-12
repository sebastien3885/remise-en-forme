/**
 * Point d'entrée de la couche stockage.
 *
 * L'interface passe par `depots` et ne touche jamais `db` directement : si la
 * base change un jour (SQLite en WebAssembly, par exemple), seuls les fichiers
 * de ce dossier bougent.
 */
import { db, type BaseForme } from './db'
import { depotExercices } from './depots/depot-exercices'
import { depotProfil } from './depots/depot-profil'
import { depotProgrammes } from './depots/depot-programmes'
import { depotSeances } from './depots/depot-seances'

export { BaseForme, NOM_BASE, db } from './db'
export { depotExercices, type DepotExercices } from './depots/depot-exercices'
export { depotProfil, type DepotProfil } from './depots/depot-profil'
export { depotProgrammes, type DepotProgrammes } from './depots/depot-programmes'
export { depotSeances, type DepotSeances } from './depots/depot-seances'

/** Tous les dépôts d'une base donnée, assemblés une fois pour toutes. */
export function creerDepots(base: BaseForme = db) {
  return {
    profil: depotProfil(base),
    exercices: depotExercices(base),
    programmes: depotProgrammes(base),
    seances: depotSeances(base),
  }
}

export type Depots = ReturnType<typeof creerDepots>

/** Les dépôts de l'application. */
export const depots = creerDepots()
