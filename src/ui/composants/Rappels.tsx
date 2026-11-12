/**
 * Rappels de séance (chapitre 9), par l'agenda du téléphone.
 *
 * La carte dit d'abord la vérité : **l'application ne peut pas envoyer de
 * notification à une heure dite.** Une application web installée ne se réveille
 * pas toute seule ; il lui faudrait un serveur qui la pousse. Promettre un
 * rappel qui ne partirait qu'une fois sur trois serait pire que de ne rien
 * promettre — on finirait par compter sur lui.
 *
 * Ce que l'application sait faire, c'est confier ses séances à l'outil qui sait
 * réveiller : l'agenda. Un fichier, une fois, et les rappels viennent de
 * Google Agenda ou de l'agenda d'Android.
 */
import { useState } from 'react'

import { RAPPEL_PAR_DEFAUT } from '../../domaine/calendrier/ics'
import { exporterAgenda, type ResultatAgenda } from '../../stockage/exporter-agenda'
import { formaterDateLongue } from '../libelles'
import { telecharger } from '../telecharger'

/** De 6 h à 21 h : au-delà, un rappel pour le jour même n'a plus d'objet. */
const HEURES = Array.from({ length: 16 }, (_, index) => index + 6)

export function Rappels() {
  const [heure, setHeure] = useState(RAPPEL_PAR_DEFAUT / 60)
  const [enCours, setEnCours] = useState(false)
  const [resultat, setResultat] = useState<ResultatAgenda | undefined>(undefined)

  async function exporter() {
    setEnCours(true)
    const agenda = await exporterAgenda({ rappelMinutes: heure * 60 })
    if (agenda.evenements > 0) {
      telecharger(agenda.nomDeFichier, agenda.ics, 'text/calendar;charset=utf-8')
    }
    setResultat(agenda)
    setEnCours(false)
  }

  return (
    <section className="carte">
      <h2>Rappels</h2>
      <p className="discret" style={{ fontSize: '0.92rem' }}>
        L’application ne peut pas vous notifier à une heure fixe : installée, elle ne se réveille
        pas toute seule. Elle confie donc vos séances à venir à votre agenda, qui sait le faire.
        Une séance devient une journée entière, avec un rappel le matin même.
      </p>

      <div className="champs" style={{ marginTop: 16 }}>
        <label className="champ">
          Heure du rappel
          <select
            value={heure}
            onChange={(evenement) => setHeure(Number(evenement.target.value))}
          >
            {HEURES.map((candidate) => (
              <option key={candidate} value={candidate}>
                {String(candidate)} h
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="rangee-boutons" style={{ marginTop: 14 }}>
        <button
          className="bouton bouton--secondaire"
          type="button"
          disabled={enCours}
          onClick={() => void exporter()}
        >
          {enCours ? 'Préparation…' : 'Envoyer vers mon agenda'}
        </button>
      </div>

      {resultat !== undefined &&
        (resultat.evenements === 0 ? (
          <p className="discret" style={{ marginTop: 14 }}>
            Aucune séance à venir : il n’y a rien à rappeler. Générez un programme, ou importez
            un plan.
          </p>
        ) : (
          <>
            {/* L'accent désigne, il ne décore pas : une ligne, pas un paragraphe. */}
            <p className="succes" style={{ marginTop: 14 }}>
              {resultat.evenements} séances prêtes pour l’agenda.
            </p>
            <p className="discret" style={{ marginTop: 8, fontSize: '0.92rem' }}>
              <code>{resultat.nomDeFichier}</code>
              {resultat.premiere !== undefined && resultat.derniere !== undefined && (
                <>
                  {' '}
                  couvre du {formaterDateLongue(resultat.premiere)} au{' '}
                  {formaterDateLongue(resultat.derniere)}
                </>
              )}
              . Ouvrez-le sur le téléphone pour ajouter les séances ; celles qui sont déjà faites
              ou annulées n’y sont pas.
            </p>
          </>
        ))}

      <p className="discret" style={{ marginTop: 12, fontSize: '0.86rem' }}>
        Réexporter plus tard ne crée pas de doublons : chaque séance garde son identifiant, et
        l’agenda met l’événement à jour. Une alarme du téléphone reste la solution la plus sûre
        si l’agenda vous oublie.
      </p>
    </section>
  )
}
