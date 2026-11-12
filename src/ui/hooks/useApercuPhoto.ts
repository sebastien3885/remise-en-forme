/**
 * Une URL d'aperçu pour une photo rangée en base.
 *
 * `URL.createObjectURL` réserve de la mémoire jusqu'à ce qu'on la rende. Sans
 * le `revoke` du nettoyage, faire défiler une semaine de repas laisserait
 * derrière soi autant de photos entières en mémoire.
 */
import { useEffect, useState } from 'react'

export function useApercuPhoto(photo: Blob | undefined): string | undefined {
  const [url, setUrl] = useState<string | undefined>(undefined)

  useEffect(() => {
    if (!photo) {
      setUrl(undefined)
      return
    }

    const cree = URL.createObjectURL(photo)
    setUrl(cree)

    return () => {
      URL.revokeObjectURL(cree)
    }
  }, [photo])

  return url
}
