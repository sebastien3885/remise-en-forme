/**
 * La troisième voie du bilan hebdomadaire (chapitre 5) : modifier.
 *
 * Le cahier des charges veut qu'on puisse « valider ou modifier » les
 * ajustements, pas seulement dire oui ou non. Ce panneau sert à en retenir une
 * part : la moitié de l'augmentation proposée, ou aucune, et les remplacements
 * d'exercice un par un.
 *
 * **On ne peut qu'en demander moins.** Les facteurs proposés viennent de
 * `facteursRetenables`, qui ne va jamais au-delà de ce que le moteur a calculé
 * — le plafond de +10 % du chapitre 10 est appliqué là, pas ici, et l'écran ne
 * doit pas offrir de le franchir. La couche de stockage refuse de son côté,
 * pour que la règle tienne même si cet écran se trompe.
 *
 * **Le levier ne se change pas.** Un seul bouge par semaine (chapitre 10), et
 * c'est le moteur qui l'a choisi : l'écran le nomme, il ne le propose pas.
 */
import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'

import type { BilanHebdo, Id } from '../../domaine/entites'
import { facteurEnMots, facteursRetenables } from '../../domaine/progression/charge'
import { ajustementGlobal } from '../../domaine/progression/moteur'
import { depots } from '../../stockage'
import { modifierBilan } from '../../stockage/bilan-hebdo'

const LIBELLE_LEVIER: Record<string, string> = {
  duree: 'la durée',
  intensite: 'l’intensité',
  frequence: 'la fréquence',
}

export interface ProprietesPanneauModification {
  bilan: BilanHebdo
  /** Appelé une fois la décision prise, avec la phrase à afficher. */
  onDecide: (message: string) => void
  onAnnuler: () => void
}

export function PanneauModification({
  bilan,
  onDecide,
  onAnnuler,
}: ProprietesPanneauModification) {
  const global = ajustementGlobal(bilan)
  const propose = global?.facteur ?? 1

  const [facteur, setFacteur] = useState(propose)
  const [refuses, setRefuses] = useState<Id[]>([])
  const [enCours, setEnCours] = useState(false)
  const [erreur, setErreur] = useState<string | undefined>(undefined)

  const bibliotheque = useLiveQuery(() => depots.exercices.tous())
  const nomParId = new Map((bibliotheque ?? []).map((exercice) => [exercice.id, exercice.nom]))
  const nom = (id: Id) => nomParId.get(id) ?? id

  const remplacements = bilan.ajustements.filter(
    (ajustement) =>
      ajustement.exerciceId !== undefined && ajustement.remplacementParId !== undefined,
  )

  const choix = facteursRetenables(propose)

  async function appliquer() {
    setEnCours(true)
    setErreur(undefined)

    const resultat = await modifierBilan(bilan.id, {
      facteur,
      remplacementsRefusesIds: refuses,
    })

    setEnCours(false)

    if (!resultat.applique) {
      setErreur(resultat.raison)
      return
    }

    onDecide(
      resultat.bilan.decision === 'refuse'
        ? 'Rien n’a été retenu : le programme ne bouge pas.'
        : 'Version ' +
            String(resultat.versionCreee) +
            ' du programme, avec ' +
            facteurEnMots(facteur) +
            ' sur ' +
            (LIBELLE_LEVIER[global?.levier ?? 'duree'] ?? 'la charge') +
            ' : ' +
            String(resultat.seancesAjustees) +
            ' séances mises à jour.',
    )
  }

  return (
    <div className="modification">
      {choix.length > 1 ? (
        <fieldset className="echelle">
          <legend>
            Quelle part de {facteurEnMots(propose)} sur{' '}
            {LIBELLE_LEVIER[global?.levier ?? 'duree'] ?? 'la charge'} ?
          </legend>
          <div className="chips">
            {choix.map((candidat) => (
              <button
                key={candidat}
                type="button"
                aria-pressed={facteur === candidat}
                onClick={() => setFacteur(candidat)}
              >
                {facteurEnMots(candidat)}
              </button>
            ))}
          </div>
          <p className="discret" style={{ marginTop: 10, fontSize: '0.85rem' }}>
            Jamais plus que ce que le bilan propose : au-delà, on sortirait du plafond de
            +10 % par semaine.
          </p>
        </fieldset>
      ) : (
        <p className="discret">
          Ce bilan ne propose aucun changement de charge : il n’y a que les remplacements
          d’exercice à trancher.
        </p>
      )}

      {remplacements.length > 0 && (
        <fieldset className="echelle" style={{ marginTop: 18 }}>
          <legend>Remplacements proposés</legend>
          <div className="chips chips--colonne">
            {remplacements.map((ajustement) => {
              const exerciceId = ajustement.exerciceId as Id
              const retenu = !refuses.includes(exerciceId)

              return (
                <button
                  key={exerciceId}
                  type="button"
                  aria-pressed={retenu}
                  onClick={() =>
                    setRefuses((precedents) =>
                      precedents.includes(exerciceId)
                        ? precedents.filter((id) => id !== exerciceId)
                        : [...precedents, exerciceId],
                    )
                  }
                >
                  {(retenu ? 'Remplacer ' : 'Garder ') +
                    nom(exerciceId) +
                    (retenu ? ' par ' + nom(ajustement.remplacementParId as Id) : '')}
                </button>
              )
            })}
          </div>
        </fieldset>
      )}

      {erreur !== undefined && (
        <p style={{ marginTop: 14, color: 'var(--alerte)' }}>{erreur}</p>
      )}

      <div className="rangee-boutons" style={{ marginTop: 18 }}>
        <button
          className="bouton"
          type="button"
          disabled={enCours}
          onClick={() => void appliquer()}
        >
          {enCours ? 'Application…' : 'Appliquer ma version'}
        </button>
        <button
          className="bouton bouton--secondaire"
          type="button"
          disabled={enCours}
          onClick={onAnnuler}
        >
          Annuler
        </button>
      </div>
    </div>
  )
}
