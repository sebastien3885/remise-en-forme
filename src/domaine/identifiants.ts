/**
 * Fabrique d'identifiants uniques (contrainte du chapitre 7).
 *
 * `crypto.randomUUID` existe dans Chrome sur Android comme dans Node : pas de
 * dépendance à installer. Le type `FabriqueId` permet d'injecter des
 * identifiants prévisibles dans les tests.
 */
import type { Id } from './entites/communs'

export type FabriqueId = () => Id

export const nouvelId: FabriqueId = () => crypto.randomUUID()

/**
 * Transforme un libellé en slug stable, utilisé comme identifiant des
 * exercices de la bibliothèque et dans les plans importés : « Squat sur
 * chaise » devient `squat-sur-chaise`, ce qui rend les fichiers JSON préparés
 * sur le PC lisibles et modifiables à la main.
 */
export function versSlug(libelle: string): Id {
  return libelle
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+/, '')
    .replace(/-+$/, '')
}
