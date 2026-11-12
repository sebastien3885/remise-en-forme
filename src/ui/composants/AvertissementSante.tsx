/**
 * Avertissement du premier lancement (chapitre 10).
 *
 * Il s'affiche jusqu'à ce qu'il soit lu, puis plus jamais. Il n'empêche rien :
 * l'application accompagne une reprise d'activité, elle ne filtre pas l'accès.
 */
import { depots } from '../../stockage'

export function AvertissementSante({ onLu }: { onLu?: () => void }) {
  async function accepter() {
    await depots.profil.modifier({ avertissementSanteAccepte: true })
    onLu?.()
  }

  return (
    <section className="carte carte--alerte">
      <h2>Avant de commencer</h2>
      <p>
        Après une longue période sans activité physique, parlez-en à un médecin avant de
        reprendre. Cette application accompagne la reprise, elle ne remplace pas un avis
        médical et ne pose aucun diagnostic.
      </p>
      <p>
        Pendant une séance, arrêtez-vous en cas de douleur à la poitrine, de vertige, de
        palpitations inhabituelles ou d’essoufflement anormal. À la piscine, jamais d’apnée
        ni d’hyperventilation, et jamais seul dans le bassin.
      </p>
      <button className="bouton" type="button" onClick={() => void accepter()}>
        J’ai lu
      </button>
    </section>
  )
}
