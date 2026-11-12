/**
 * Prise d'une photo de repas : lecture, réduction, ré-encodage.
 *
 * Vit dans l'interface et pas dans le domaine, parce que tout se joue avec un
 * canevas du navigateur. Le seul calcul qui vaille d'être testé seul — la
 * taille à viser — est dans `src/domaine/photos/dimensions.ts`.
 *
 * Deux effets qui ne se voient pas :
 *
 * - **Les métadonnées disparaissent.** Redessiner l'image dans un canevas ne
 *   garde que les pixels : l'EXIF reste derrière, et avec lui les coordonnées
 *   GPS que les téléphones glissent dans les photos. Une sauvegarde qu'on
 *   s'envoie par mail ne trimballe donc pas la position du restaurant.
 * - **L'orientation est appliquée pour de bon.** Une photo prise en portrait
 *   est souvent enregistrée couchée, avec un drapeau EXIF qui dit de la
 *   redresser. On la redresse ici, une fois, plutôt que d'espérer que chaque
 *   écran le fasse.
 */
import {
  COTE_MAXIMAL,
  dimensionsReduites,
  QUALITE_JPEG,
} from '../domaine/photos/dimensions'

export type ResultatPhoto =
  | { ok: true; photo: Blob; largeur: number; hauteur: number }
  | { ok: false; raison: string }

async function decoder(fichier: Blob): Promise<ImageBitmap> {
  try {
    return await createImageBitmap(fichier, { imageOrientation: 'from-image' })
  } catch {
    // Navigateur sans l'option : on décode quand même, quitte à garder
    // l'orientation d'origine.
    return await createImageBitmap(fichier)
  }
}

export async function allegerPhoto(fichier: File): Promise<ResultatPhoto> {
  if (!fichier.type.startsWith('image/')) {
    return { ok: false, raison: 'Ce fichier n’est pas une image.' }
  }

  let image: ImageBitmap
  try {
    image = await decoder(fichier)
  } catch {
    return { ok: false, raison: 'Cette image n’a pas pu être lue.' }
  }

  const { largeur, hauteur } = dimensionsReduites(
    { largeur: image.width, hauteur: image.height },
    COTE_MAXIMAL,
  )

  const canevas = document.createElement('canvas')
  canevas.width = largeur
  canevas.height = hauteur

  const contexte = canevas.getContext('2d')
  if (!contexte) {
    image.close()
    return { ok: false, raison: 'Le navigateur n’a pas voulu préparer l’image.' }
  }

  contexte.drawImage(image, 0, 0, largeur, hauteur)
  image.close()

  const photo = await new Promise<Blob | null>((resoudre) => {
    canevas.toBlob(resoudre, 'image/jpeg', QUALITE_JPEG)
  })

  if (!photo) return { ok: false, raison: 'L’image n’a pas pu être enregistrée.' }

  return { ok: true, photo, largeur, hauteur }
}
