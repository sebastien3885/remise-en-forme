/**
 * Saisie d'un repas (chapitre 6), en moins d'une minute.
 *
 * Quatre bascules et c'est fini. Le texte libre reste facultatif et replié :
 * le cahier des charges veut « prendre conscience des habitudes, pas compter
 * chaque calorie », donc le chemin court ne demande rien à écrire.
 *
 * Les quatre questions sont posées à plat — « des légumes », « boisson
 * sucrée » — sans bien ni mal affiché. C'est le repère, ailleurs, qui dit ce
 * qu'on vise.
 */
import { useState } from 'react'

import type { BilanRapideRepas, DateIso, MomentRepas, Repas } from '../../domaine/entites'
import { maintenantIso } from '../../domaine/dates'
import { nouvelId } from '../../domaine/identifiants'
import { depots } from '../../stockage'
import { LIBELLE_MOMENT } from '../libelles'
import { PriseDePhoto } from './PriseDePhoto'

const QUESTIONS: { champ: keyof BilanRapideRepas; libelle: string }[] = [
  { champ: 'legumes', libelle: 'Des légumes ou des fruits' },
  { champ: 'proteines', libelle: 'Une source de protéines' },
  { champ: 'boissonSucree', libelle: 'Une boisson sucrée' },
  { champ: 'copieux', libelle: 'Un repas copieux' },
]

export interface ProprietesPanneauRepas {
  date: DateIso
  moment: MomentRepas
  /** Repas existant, pour une correction. */
  repas?: Repas
  onFini: () => void
  onAnnuler: () => void
}

export function PanneauRepas({
  date,
  moment,
  repas,
  onFini,
  onAnnuler,
}: ProprietesPanneauRepas) {
  const [bilan, setBilan] = useState<BilanRapideRepas>(
    () =>
      repas?.bilanRapide ?? {
        legumes: false,
        proteines: false,
        boissonSucree: false,
        copieux: false,
      },
  )
  const [description, setDescription] = useState(repas?.description ?? '')
  const [photo, setPhoto] = useState<Blob | undefined>(repas?.photo)
  const [enCours, setEnCours] = useState(false)

  // Le repli s'ouvre tout seul sur un repas qui a déjà une description ou une
  // photo : sinon, corriger un repas donnerait à croire qu'on les a perdues.
  // Calculé une fois, pour que refermer le volet à la main tienne.
  const [replieOuvert] = useState(
    () => photo !== undefined || (repas?.description ?? '').trim() !== '',
  )

  async function enregistrer() {
    setEnCours(true)
    await depots.repas.enregistrer({
      id: repas?.id ?? nouvelId(),
      date,
      moment,
      description: description.trim(),
      bilanRapide: bilan,
      saisieLe: maintenantIso(),
      ...(photo ? { photo } : {}),
    })
    onFini()
  }

  async function supprimer() {
    if (!repas) return
    setEnCours(true)
    await depots.repas.supprimer(repas.id)
    onFini()
  }

  return (
    <section className="carte panneau">
      <div className="panneau__entete">
        <p className="surtitre">{LIBELLE_MOMENT[moment]}</p>
      </div>

      <fieldset className="echelle">
        <legend>Qu’y avait-il ?</legend>
        <div className="chips chips--colonne">
          {QUESTIONS.map((question) => (
            <button
              key={question.champ}
              type="button"
              aria-pressed={bilan[question.champ]}
              // Forme fonctionnelle : deux bascules touchées coup sur coup,
              // avant un nouveau rendu, liraient sinon le même état de départ
              // et la seconde effacerait la première.
              onClick={() =>
                setBilan((precedent) => ({
                  ...precedent,
                  [question.champ]: !precedent[question.champ],
                }))
              }
            >
              {question.libelle}
            </button>
          ))}
        </div>
      </fieldset>

      <details className="repli" open={replieOuvert}>
        <summary>Ajouter une description ou une photo</summary>
        <div className="repli__contenu">
          <label className="champ champ--large" htmlFor="description-repas">
            <span className="discret">Facultatif</span>
            <textarea
              id="description-repas"
              rows={2}
              value={description}
              placeholder="Poulet, riz, haricots verts"
              onChange={(evenement) => setDescription(evenement.target.value)}
            />
          </label>

          <PriseDePhoto photo={photo} onChange={setPhoto} />
        </div>
      </details>

      <button
        type="button"
        className="bouton bouton--principal"
        style={{ marginTop: 18 }}
        disabled={enCours}
        onClick={() => void enregistrer()}
      >
        {enCours ? 'Enregistrement…' : 'Enregistrer'}
      </button>

      <div className="rangee-boutons" style={{ marginTop: 10 }}>
        <button className="bouton bouton--secondaire" type="button" onClick={onAnnuler}>
          Annuler
        </button>
        {repas && (
          <button
            className="bouton bouton--secondaire"
            type="button"
            disabled={enCours}
            onClick={() => void supprimer()}
          >
            Supprimer
          </button>
        )}
      </div>
    </section>
  )
}
