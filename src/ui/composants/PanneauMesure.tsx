/**
 * Saisie du poids et du tour de taille (chapitre 6).
 *
 * Les deux champs sont facultatifs : on peut noter l'un sans l'autre. Aucune
 * cible n'est proposée, aucun commentaire n'est fait sur la valeur — le
 * chapitre 6 interdit toute cible chiffrée générée par l'application, et
 * l'écran se garde de juger un nombre.
 */
import { useState } from 'react'

import { maintenantIso } from '../../domaine/dates'
import type { DateIso, MesureCorporelle } from '../../domaine/entites'
import { nouvelId } from '../../domaine/identifiants'
import { depots } from '../../stockage'

export interface ProprietesPanneauMesure {
  date: DateIso
  mesure?: MesureCorporelle
  onFini: () => void
  onAnnuler: () => void
}

export function PanneauMesure({ date, mesure, onFini, onAnnuler }: ProprietesPanneauMesure) {
  const [poids, setPoids] = useState(
    mesure?.poidsKg === undefined ? '' : String(mesure.poidsKg),
  )
  const [tourDeTaille, setTourDeTaille] = useState(
    mesure?.tourTailleCm === undefined ? '' : String(mesure.tourTailleCm),
  )
  const [enCours, setEnCours] = useState(false)

  const rienASaisir = poids.trim() === '' && tourDeTaille.trim() === ''

  async function enregistrer() {
    setEnCours(true)
    await depots.mesures.enregistrer({
      id: mesure?.id ?? nouvelId(),
      date,
      saisieLe: maintenantIso(),
      ...(poids.trim() === '' ? {} : { poidsKg: Number(poids) }),
      ...(tourDeTaille.trim() === '' ? {} : { tourTailleCm: Number(tourDeTaille) }),
    })
    onFini()
  }

  return (
    <section className="carte panneau">
      <div className="panneau__entete">
        <p className="surtitre">Mesure du {date}</p>
      </div>

      <div className="champs">
        <label className="champ" htmlFor="poids">
          <span>
            Poids <span className="discret">(kg)</span>
          </span>
          <input
            id="poids"
            type="number"
            inputMode="decimal"
            min={0}
            step={0.1}
            value={poids}
            onChange={(evenement) => setPoids(evenement.target.value)}
          />
        </label>
        <label className="champ" htmlFor="tour-de-taille">
          <span>
            Tour de taille <span className="discret">(cm)</span>
          </span>
          <input
            id="tour-de-taille"
            type="number"
            inputMode="decimal"
            min={0}
            step={0.5}
            value={tourDeTaille}
            onChange={(evenement) => setTourDeTaille(evenement.target.value)}
          />
        </label>
      </div>

      <button
        type="button"
        className="bouton bouton--principal"
        style={{ marginTop: 18 }}
        disabled={enCours || rienASaisir}
        onClick={() => void enregistrer()}
      >
        {enCours ? 'Enregistrement…' : 'Enregistrer'}
      </button>

      <div className="rangee-boutons" style={{ marginTop: 10 }}>
        <button className="bouton bouton--secondaire" type="button" onClick={onAnnuler}>
          Annuler
        </button>
      </div>
    </section>
  )
}
