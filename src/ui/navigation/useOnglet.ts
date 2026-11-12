import { useEffect, useState } from 'react'

import { ONGLET_PAR_DEFAUT, ongletDepuisHash, type IdOnglet } from './onglets'

/**
 * Onglet courant, lu dans le fragment d'URL et suivi au fil des retours
 * arrière du navigateur.
 */
export function useOnglet(): IdOnglet {
  const [onglet, setOnglet] = useState<IdOnglet>(() =>
    typeof window === 'undefined' ? ONGLET_PAR_DEFAUT : ongletDepuisHash(window.location.hash),
  )

  useEffect(() => {
    const surChangement = () => setOnglet(ongletDepuisHash(window.location.hash))
    window.addEventListener('hashchange', surChangement)
    // Le fragment a pu changer entre le premier rendu et l'abonnement.
    surChangement()
    return () => window.removeEventListener('hashchange', surChangement)
  }, [])

  return onglet
}
