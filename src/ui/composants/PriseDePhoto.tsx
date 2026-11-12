/**
 * Photo d'un repas (chapitre 6), facultative.
 *
 * Elle est **repliée avec la description** : le chemin court du journal reste
 * quatre bascules et c'est fini. Une photo qui réclamerait un geste de plus à
 * chaque repas finirait par faire sauter le repas entier.
 *
 * Le champ ne force pas l'appareil photo (`capture`) : sur Android, Chrome
 * propose alors au choix l'appareil ou la galerie, et un repas se note souvent
 * après coup, à partir d'une photo déjà prise.
 */
import { useState } from 'react'

import { useApercuPhoto } from '../hooks/useApercuPhoto'
import { formaterPoids } from '../libelles'
import { allegerPhoto } from '../photo'

export interface ProprietesPriseDePhoto {
  photo: Blob | undefined
  onChange: (photo: Blob | undefined) => void
}

export function PriseDePhoto({ photo, onChange }: ProprietesPriseDePhoto) {
  const apercu = useApercuPhoto(photo)
  const [enCours, setEnCours] = useState(false)
  const [erreur, setErreur] = useState<string | undefined>(undefined)

  async function choisir(fichier: File) {
    setEnCours(true)
    setErreur(undefined)

    const resultat = await allegerPhoto(fichier)

    setEnCours(false)
    if (!resultat.ok) {
      setErreur(resultat.raison)
      return
    }
    onChange(resultat.photo)
  }

  const champ = (
    <input
      type="file"
      accept="image/*"
      disabled={enCours}
      onChange={(evenement) => {
        const fichier = evenement.target.files?.[0]
        if (fichier) void choisir(fichier)
        // Remis à zéro pour que reprendre deux fois la même photo marche.
        evenement.target.value = ''
      }}
    />
  )

  return (
    <div className="photo-repas">
      {apercu !== undefined && photo !== undefined && (
        <figure className="photo">
          <img src={apercu} alt="Photo du repas" />
          <figcaption className="discret">
            {formaterPoids(photo.size)} · elle reste sur cet appareil
          </figcaption>
        </figure>
      )}

      <div className="rangee-boutons" style={{ marginTop: 10 }}>
        <label className="bouton bouton--secondaire bouton--fichier">
          {enCours ? 'Préparation…' : photo ? 'Remplacer' : 'Ajouter une photo'}
          {champ}
        </label>

        {photo !== undefined && (
          <button
            className="bouton bouton--secondaire"
            type="button"
            disabled={enCours}
            onClick={() => {
              setErreur(undefined)
              onChange(undefined)
            }}
          >
            Retirer
          </button>
        )}
      </div>

      {erreur !== undefined && (
        <p style={{ marginTop: 10, color: 'var(--alerte)' }}>{erreur}</p>
      )}
    </div>
  )
}
