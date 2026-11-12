/**
 * Garde l'écran allumé tant qu'une minuterie tourne.
 *
 * Sans cela, Android éteint l'écran au bout de trente secondes et le décompte
 * disparaît au milieu d'un gainage. Le verrou est **relâché dès que la
 * minuterie s'arrête** : garder l'écran allumé sans raison viderait la
 * batterie.
 *
 * Deux précautions :
 *
 * - Android relâche le verrou tout seul quand l'onglet passe en arrière-plan.
 *   Il faut donc le reprendre au retour, d'où l'écoute de `visibilitychange`.
 * - L'API n'existe pas partout, et la demande peut être refusée (batterie
 *   faible, réglage système). Un échec ne doit rien casser : la minuterie
 *   fonctionne de toute façon, l'écran s'éteindra simplement.
 */
import { useEffect } from 'react'

export function useEcranAllume(actif: boolean): void {
  useEffect(() => {
    if (!actif) return
    if (typeof navigator === 'undefined' || !('wakeLock' in navigator)) return

    let verrou: WakeLockSentinel | null = null
    let abandonne = false

    const demander = async () => {
      if (abandonne || document.visibilityState !== 'visible') return
      try {
        verrou = await navigator.wakeLock.request('screen')
      } catch {
        // Refusé par le système : on continue sans.
      }
    }

    const auRetour = () => {
      if (document.visibilityState === 'visible') void demander()
    }

    void demander()
    document.addEventListener('visibilitychange', auRetour)

    return () => {
      abandonne = true
      document.removeEventListener('visibilitychange', auRetour)
      void verrou?.release()
    }
  }, [actif])
}
