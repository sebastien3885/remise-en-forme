/**
 * Propose un fichier au téléchargement, sans rien envoyer nulle part.
 *
 * Tout se passe dans le navigateur : un Blob, une URL locale, un clic
 * simulé. Aucune requête réseau, donc **ça marche hors ligne** — et aucune
 * donnée ne quitte l'appareil autrement que par la main de l'utilisateur.
 *
 * Partagé par la sauvegarde, les exports CSV et l'export vers l'agenda : trois
 * implémentations finiraient par diverger.
 */
export function telecharger(nom: string, contenu: string, type: string): void {
  const url = URL.createObjectURL(new Blob([contenu], { type }))
  const lien = document.createElement('a')
  lien.href = url
  lien.download = nom
  document.body.append(lien)
  lien.click()
  lien.remove()
  URL.revokeObjectURL(url)
}
