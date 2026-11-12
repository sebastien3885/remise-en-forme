/**
 * Taille d'une photo de repas (chapitre 6).
 *
 * Une photo prise au téléphone pèse trois à cinq mégaoctets. Quelques
 * centaines de repas et la base déborde, la sauvegarde devient impossible à
 * envoyer, et tout cela pour une photo qu'on regarde à la taille d'une
 * vignette. On la réduit donc avant de l'enregistrer.
 *
 * Ce module ne fait que le calcul — il n'y a ici ni canevas, ni DOM. Le
 * redimensionnement lui-même vit dans `src/ui/photo.ts`, parce qu'il a besoin
 * du navigateur.
 */

/**
 * 1280 px sur le plus grand côté : de quoi relire une étiquette si besoin,
 * sans garder une image d'affiche pour un plat de pâtes.
 */
export const COTE_MAXIMAL = 1280

/**
 * 0,72 — en dessous, les aplats du JPEG se voient sur une assiette ; au-dessus,
 * le fichier double sans qu'on y gagne rien à l'œil.
 */
export const QUALITE_JPEG = 0.72

export interface Dimensions {
  largeur: number
  hauteur: number
}

/**
 * Ramène la plus grande dimension à `coteMaximal`, en gardant les proportions.
 *
 * **Jamais d'agrandissement** : une photo déjà petite est rendue telle quelle.
 * Gonfler une image n'ajoute aucun détail et ne fait que l'alourdir.
 */
export function dimensionsReduites(
  source: Dimensions,
  coteMaximal: number = COTE_MAXIMAL,
): Dimensions {
  const largeur = Math.max(1, Math.round(source.largeur))
  const hauteur = Math.max(1, Math.round(source.hauteur))
  const plusGrandCote = Math.max(largeur, hauteur)

  if (plusGrandCote <= coteMaximal) return { largeur, hauteur }

  const facteur = coteMaximal / plusGrandCote
  return {
    largeur: Math.max(1, Math.round(largeur * facteur)),
    hauteur: Math.max(1, Math.round(hauteur * facteur)),
  }
}
