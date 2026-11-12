/**
 * Deux garde-fous du cahier des charges, qui demandent un interrupteur pour
 * exister vraiment.
 *
 * - **Masquer le poids** (chapitre 6) : « option pour masquer le poids et les
 *   calories si le suivi devient source de stress ». Le champ est lu par
 *   l'écran Alimentation depuis le début ; sans ce bouton, il restait
 *   inaccessible.
 * - **Supprimer toutes mes données** (chapitre 10). L'action est
 *   irréversible et locale : elle se confirme en deux temps, et la phrase dit
 *   ce qui part.
 */
import { useState } from 'react'

import { db, depots } from '../../stockage'
import { effacerToutesLesDonnees } from '../../stockage/amorcage'

export function PreferencesEtDonnees({ masquerPoids }: { masquerPoids: boolean }) {
  const [confirmation, setConfirmation] = useState(false)
  const [enCours, setEnCours] = useState(false)

  async function basculerPoids() {
    await depots.profil.modifier({ masquerPoids: !masquerPoids })
  }

  async function toutEffacer() {
    setEnCours(true)
    await effacerToutesLesDonnees(db)
    // L'amorçage repart de zéro au prochain démarrage.
    window.location.reload()
  }

  return (
    <section className="carte">
      <h2>Confort et vie privée</h2>

      <div className="ligne" style={{ background: 'transparent', padding: '6px 0' }}>
        <span className="ligne__texte">
          Masquer le poids
          <span className="discret"> · si le suivi devient pesant</span>
        </span>
        <button
          className={'bascule' + (masquerPoids ? ' bascule--active' : '')}
          type="button"
          role="switch"
          aria-checked={masquerPoids}
          aria-label="Masquer le poids et le tour de taille"
          onClick={() => void basculerPoids()}
        >
          <span className="bascule__curseur" />
        </button>
      </div>

      <p className="discret" style={{ marginTop: 18, fontSize: '0.9rem' }}>
        Vos séances, votre profil et votre journal ne quittent pas cet appareil. Aucun suivi
        publicitaire, aucun outil d’analyse.
      </p>

      {!confirmation ? (
        <div className="rangee-boutons" style={{ marginTop: 16 }}>
          <button
            className="bouton bouton--secondaire"
            type="button"
            onClick={() => setConfirmation(true)}
          >
            Supprimer toutes mes données
          </button>
        </div>
      ) : (
        <div className="carte carte--alerte" style={{ marginTop: 16 }}>
          <p>
            Tout sera effacé : profil, bibliothèque, programme, séances réalisées, journal
            alimentaire, poids. <strong>Cette action est définitive</strong> et il n’existe pas
            encore d’export de sauvegarde.
          </p>
          <div className="rangee-boutons" style={{ marginTop: 14 }}>
            <button
              className="bouton bouton--secondaire"
              type="button"
              disabled={enCours}
              onClick={() => setConfirmation(false)}
            >
              Annuler
            </button>
            <button
              className="bouton"
              type="button"
              disabled={enCours}
              onClick={() => void toutEffacer()}
            >
              {enCours ? 'Suppression…' : 'Oui, tout supprimer'}
            </button>
          </div>
        </div>
      )}
    </section>
  )
}
