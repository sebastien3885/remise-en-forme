/**
 * Installation de l'application sur l'appareil (chapitre 9).
 *
 * Chrome sur Android envoie `beforeinstallprompt` quand l'application remplit
 * ses conditions — manifeste, icônes de 192 et 512, `display: standalone`,
 * service worker actif, origine sûre. L'événement arrive **avant** que React
 * n'ait fini de monter : il est donc capté au chargement du module, pas dans
 * un composant, sinon il serait manqué une fois sur deux.
 *
 * **Le bouton n'apparaît que si l'installation est possible.** C'est la même
 * règle que pour les rappels : on ne promet pas un geste que l'appareil ne
 * sait pas faire. Sur un navigateur qui n'envoie pas l'événement — Firefox,
 * Safari, ou cette application déjà installée — il n'y a pas de bouton, et
 * l'écran explique le chemin par le menu du navigateur.
 */
import { useCallback, useSyncExternalStore } from 'react'

/** L'événement de Chrome, absent des types du DOM standard. */
interface EvenementInstallation extends Event {
  prompt: () => Promise<void>
}

interface EtatInstallation {
  /** L'invitation du navigateur, si elle est arrivée. */
  invitation: EvenementInstallation | null
  /** L'application tourne déjà comme une application installée. */
  installee: boolean
}

let etat: EtatInstallation = { invitation: null, installee: false }
const abonnes = new Set<() => void>()

function prevenir() {
  for (const abonne of abonnes) abonne()
}

/** Vrai si la page tourne hors du navigateur, dans sa propre fenêtre. */
function enModeApplication(): boolean {
  if (typeof window === 'undefined' || !window.matchMedia) return false
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    window.matchMedia('(display-mode: fullscreen)').matches
  )
}

if (typeof window !== 'undefined') {
  etat = { invitation: null, installee: enModeApplication() }

  window.addEventListener('beforeinstallprompt', (evenement) => {
    // Sans cela, Chrome affiche sa propre barre d'installation en bas de
    // l'écran, par-dessus la barre d'onglets.
    evenement.preventDefault()
    etat = { ...etat, invitation: evenement as EvenementInstallation }
    prevenir()
  })

  window.addEventListener('appinstalled', () => {
    etat = { invitation: null, installee: true }
    prevenir()
  })
}

function sabonner(abonne: () => void): () => void {
  abonnes.add(abonne)
  return () => {
    abonnes.delete(abonne)
  }
}

function lire(): EtatInstallation {
  return etat
}

export interface Installation {
  /** Le navigateur propose d'installer : on peut montrer le bouton. */
  possible: boolean
  /** L'application tourne déjà installée, ou vient de l'être. */
  installee: boolean
  /** Ouvre la fenêtre d'installation du navigateur. */
  installer: () => Promise<void>
}

export function useInstallation(): Installation {
  const courant = useSyncExternalStore(sabonner, lire, lire)

  const installer = useCallback(async () => {
    const invitation = etat.invitation
    if (!invitation) return
    await invitation.prompt()
    // Une invitation ne sert qu'une fois : Chrome en renverra une autre s'il
    // y a lieu.
    etat = { ...etat, invitation: null }
    prevenir()
  }, [])

  return {
    possible: courant.invitation !== null,
    installee: courant.installee,
    installer,
  }
}
