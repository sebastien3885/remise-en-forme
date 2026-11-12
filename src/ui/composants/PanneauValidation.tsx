/**
 * Saisie du réalisé d'une séance (chapitre 4), en moins de deux minutes.
 *
 * Le chemin court tient en trois taps : un pour l'effort, un pour l'énergie,
 * un pour enregistrer. Tout le reste est facultatif et replié — les valeurs
 * réelles arrivent préremplies avec le prévu, et ne se corrigent que si le
 * réel a différé.
 *
 * Une séance sautée ne demande ni effort ni énergie : elle n'a pas eu lieu.
 * Seul le motif est proposé, et il reste facultatif.
 */
import { useState } from 'react'

import { MOTIFS_ABANDON } from '../../domaine/entites'
import type {
  DateIso,
  Douleur,
  ExerciceRealise,
  Mesures,
  MotifAbandon,
  SeancePrevue,
  SeanceRealisee,
  StatutRealisation,
  TypeSeance,
} from '../../domaine/entites'
import { validerSeance } from '../../stockage/valider-seance'
import type { ExerciceDuJour } from '../hooks/useEtatDuJour'
import {
  CHAMPS_MESURES,
  LIBELLE_MOTIF,
  LIBELLE_STATUT,
  LIBELLE_TYPE_SEANCE,
  TYPES_PROPOSABLES,
} from '../libelles'
import { Echelle } from './Echelle'

const SANS_DOULEUR = 'aucune'
const AILLEURS = 'ailleurs'

/** Exercice générique qui porte une activité notée après coup. */
export const EXERCICE_LIBRE = 'activite-libre'

export interface ProprietesPanneau {
  date: DateIso
  /** Absente pour une activité improvisée (chapitre 4). */
  prevue?: SeancePrevue
  exercices: ExerciceDuJour[]
  type: TypeSeance
  titre: string
  statut: StatutRealisation
  realisee?: SeanceRealisee
  /**
   * Mode improvisé : le type, le titre et la durée se saisissent dans le
   * panneau, puisqu'aucune séance prévue ne les porte.
   */
  libre?: boolean
  onFini: () => void
  onAnnuler: () => void
}

export function PanneauValidation({
  date,
  prevue,
  exercices,
  type,
  titre,
  statut,
  realisee,
  libre = false,
  onFini,
  onAnnuler,
}: ProprietesPanneau) {
  const [typeLibre, setTypeLibre] = useState<TypeSeance>(realisee?.type ?? type)
  const [titreLibre, setTitreLibre] = useState(realisee?.titre ?? titre)
  const [dureeLibre, setDureeLibre] = useState(() =>
    String(realisee?.exercices[0]?.reel.dureeMinutes ?? 30),
  )
  const [motif, setMotif] = useState<MotifAbandon | undefined>(realisee?.motif)
  const [effort, setEffort] = useState<number | undefined>(realisee?.effort)
  const [energie, setEnergie] = useState<number | undefined>(realisee?.energie)
  const [note, setNote] = useState(realisee?.note ?? '')
  const [enCours, setEnCours] = useState(false)

  const [zoneDouleur, setZoneDouleur] = useState<string>(
    realisee?.douleurs[0]?.zone ?? SANS_DOULEUR,
  )
  const [intensiteDouleur, setIntensiteDouleur] = useState<number | undefined>(
    realisee?.douleurs[0]?.intensite,
  )
  const [exerciceDouloureux, setExerciceDouloureux] = useState<string | undefined>(
    realisee?.exercices.find((exercice) => (exercice.douleur ?? 0) > 0)?.exerciceId,
  )

  const [valeurs, setValeurs] = useState<Record<string, Mesures>>(() => {
    const depart: Record<string, Mesures> = {}
    for (const exercice of exercices) {
      const dejaSaisi = realisee?.exercices.find(
        (candidat) => candidat.exerciceId === exercice.exerciceId,
      )
      depart[exercice.exerciceId] = { ...(dejaSaisi?.reel ?? exercice.cibles) }
    }
    return depart
  })

  const seanceSautee = statut === 'sautee'
  const ressentiComplet = seanceSautee || (effort !== undefined && energie !== undefined)
  // En mode improvisé, il faut aussi savoir de quoi il s'agit et combien de temps.
  const identiteComplete = !libre || (titreLibre.trim() !== '' && Number(dureeLibre) > 0)

  function changerValeur(exerciceId: string, champ: keyof Mesures, texte: string) {
    setValeurs((precedentes) => {
      const mesures = { ...(precedentes[exerciceId] ?? {}) }
      if (texte === '') delete mesures[champ]
      else mesures[champ] = Number(texte)
      return { ...precedentes, [exerciceId]: mesures }
    })
  }

  async function enregistrer() {
    setEnCours(true)

    const douleurs: Douleur[] =
      zoneDouleur === SANS_DOULEUR || intensiteDouleur === undefined
        ? []
        : [{ zone: zoneDouleur, intensite: intensiteDouleur }]

    const exercicesRealises: ExerciceRealise[] = libre
      ? [
          {
            exerciceId: EXERCICE_LIBRE,
            ordre: 1,
            reel: { dureeMinutes: Number(dureeLibre) },
            ...(intensiteDouleur !== undefined && zoneDouleur !== SANS_DOULEUR
              ? { douleur: intensiteDouleur }
              : {}),
          },
        ]
      : exercices.map((exercice, index) => ({
          exerciceId: exercice.exerciceId,
          ordre: index + 1,
          // Une séance sautée n'a pas de valeurs réelles à déclarer.
          reel: seanceSautee ? {} : (valeurs[exercice.exerciceId] ?? exercice.cibles),
          ...(exerciceDouloureux === exercice.exerciceId && intensiteDouleur !== undefined
            ? { douleur: intensiteDouleur }
            : {}),
        }))

    await validerSeance({
      date,
      ...(prevue ? { prevue } : {}),
      type: libre ? typeLibre : type,
      titre: libre ? titreLibre.trim() : titre,
      statut,
      exercices: exercicesRealises,
      douleurs,
      ...(motif ? { motif } : {}),
      ...(seanceSautee ? {} : { effort, energie }),
      ...(note.trim() ? { note: note.trim() } : {}),
    })

    onFini()
  }

  return (
    <section className="carte panneau">
      <div className="panneau__entete">
        <p className="surtitre">{libre ? 'Séance non prévue' : LIBELLE_STATUT[statut]}</p>
        {!libre && <h2 style={{ margin: 0 }}>{titre}</h2>}
      </div>

      {libre && (
        <>
          <fieldset className="echelle">
            <legend>Quelle activité ?</legend>
            <div className="chips">
              {TYPES_PROPOSABLES.map((candidat) => (
                <button
                  key={candidat}
                  type="button"
                  aria-pressed={typeLibre === candidat}
                  onClick={() => {
                    setTypeLibre(candidat)
                    // Le titre suit le type tant qu'on ne l'a pas écrit soi-même.
                    if (titreLibre === '' || titreLibre === LIBELLE_TYPE_SEANCE[typeLibre]) {
                      setTitreLibre(LIBELLE_TYPE_SEANCE[candidat])
                    }
                  }}
                >
                  {LIBELLE_TYPE_SEANCE[candidat]}
                </button>
              ))}
            </div>
          </fieldset>

          <div className="champs" style={{ marginBottom: 20 }}>
            <label className="champ champ--large" htmlFor="titre-libre">
              <span>Nom de la séance</span>
              <input
                id="titre-libre"
                type="text"
                value={titreLibre}
                placeholder="Balade au bord du canal"
                onChange={(evenement) => setTitreLibre(evenement.target.value)}
              />
            </label>
            <label className="champ" htmlFor="duree-libre">
              <span>
                Durée <span className="discret">(min)</span>
              </span>
              <input
                id="duree-libre"
                type="number"
                inputMode="numeric"
                min={1}
                step={5}
                value={dureeLibre}
                onChange={(evenement) => setDureeLibre(evenement.target.value)}
              />
            </label>
          </div>
        </>
      )}

      {statut !== 'faite' && (
        <fieldset className="echelle">
          <legend>
            Motif <span className="discret">· facultatif</span>
          </legend>
          <div className="chips">
            {MOTIFS_ABANDON.map((candidat) => (
              <button
                key={candidat}
                type="button"
                aria-pressed={motif === candidat}
                onClick={() => setMotif(motif === candidat ? undefined : candidat)}
              >
                {LIBELLE_MOTIF[candidat]}
              </button>
            ))}
          </div>
        </fieldset>
      )}

      {!seanceSautee && (
        <>
          <Echelle
            libelle="Effort ressenti"
            repere="1 très facile, 10 maximal"
            valeur={effort}
            onChoisir={setEffort}
          />
          <Echelle
            libelle="Énergie"
            repere="1 épuisé, 10 en pleine forme"
            valeur={energie}
            onChoisir={setEnergie}
          />
        </>
      )}

      <fieldset className="echelle">
        <legend>Douleur</legend>
        <div className="chips">
          <button
            type="button"
            aria-pressed={zoneDouleur === SANS_DOULEUR}
            onClick={() => {
              setZoneDouleur(SANS_DOULEUR)
              setIntensiteDouleur(undefined)
              setExerciceDouloureux(undefined)
            }}
          >
            Aucune
          </button>
          <button
            type="button"
            aria-pressed={zoneDouleur === 'genou'}
            onClick={() => setZoneDouleur('genou')}
          >
            Genou
          </button>
          <button
            type="button"
            aria-pressed={zoneDouleur === AILLEURS}
            onClick={() => setZoneDouleur(AILLEURS)}
          >
            Ailleurs
          </button>
        </div>
      </fieldset>

      {zoneDouleur !== SANS_DOULEUR && (
        <>
          <Echelle
            libelle="Intensité de la douleur"
            repere="1 gêne, 10 insupportable"
            valeur={intensiteDouleur}
            onChoisir={setIntensiteDouleur}
          />

          {exercices.length > 0 && (
            <fieldset className="echelle">
              <legend>
                Sur quel exercice ? <span className="discret">· facultatif</span>
              </legend>
              <div className="chips">
                {exercices.map((exercice) => (
                  <button
                    key={exercice.exerciceId}
                    type="button"
                    aria-pressed={exerciceDouloureux === exercice.exerciceId}
                    onClick={() =>
                      setExerciceDouloureux(
                        exerciceDouloureux === exercice.exerciceId
                          ? undefined
                          : exercice.exerciceId,
                      )
                    }
                  >
                    {exercice.exercice?.nom ?? exercice.exerciceId}
                  </button>
                ))}
              </div>
            </fieldset>
          )}

          {zoneDouleur === 'genou' && (intensiteDouleur ?? 0) >= 5 && (
            <p className="avertissement-sante">
              Douleur marquée au genou opéré : arrêtez la séance et parlez-en à un médecin si
              elle revient ou s’accompagne d’un gonflement ou d’une instabilité.
            </p>
          )}
        </>
      )}

      {!seanceSautee && exercices.length > 0 && (
        <details className="repli">
          <summary>Corriger les valeurs réalisées</summary>
          <div className="repli__contenu">
            {exercices.map((exercice) => (
              <div key={exercice.exerciceId} className="champ-groupe">
                <p className="champ-groupe__titre">
                  {exercice.exercice?.nom ?? exercice.exerciceId}
                </p>
                <div className="champs">
                  {CHAMPS_MESURES.filter(
                    (champ) => exercice.cibles[champ.champ] !== undefined,
                  ).map((champ) => {
                    const identifiant = exercice.exerciceId + '-' + champ.champ
                    return (
                      <label key={champ.champ} className="champ" htmlFor={identifiant}>
                        <span>
                          {champ.libelle}
                          {champ.unite && <span className="discret"> ({champ.unite})</span>}
                        </span>
                        <input
                          id={identifiant}
                          type="number"
                          inputMode="numeric"
                          min={0}
                          step={champ.pas}
                          value={valeurs[exercice.exerciceId]?.[champ.champ] ?? ''}
                          onChange={(evenement) =>
                            changerValeur(
                              exercice.exerciceId,
                              champ.champ,
                              evenement.target.value,
                            )
                          }
                        />
                      </label>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        </details>
      )}

      <details className="repli">
        <summary>Ajouter une note</summary>
        <div className="repli__contenu">
          <label className="champ champ--large" htmlFor="note-seance">
            <span className="discret">Ce qui mérite d’être retenu</span>
            <textarea
              id="note-seance"
              rows={3}
              value={note}
              onChange={(evenement) => setNote(evenement.target.value)}
            />
          </label>
        </div>
      </details>

      <button
        type="button"
        className="bouton bouton--principal"
        style={{ marginTop: 18 }}
        disabled={!ressentiComplet || !identiteComplete || enCours}
        onClick={() => void enregistrer()}
      >
        {enCours ? 'Enregistrement…' : 'Enregistrer'}
      </button>

      {!identiteComplete && (
        <p className="discret" style={{ marginTop: 10, textAlign: 'center' }}>
          Donnez un nom et une durée à cette séance.
        </p>
      )}
      {identiteComplete && !ressentiComplet && (
        <p className="discret" style={{ marginTop: 10, textAlign: 'center' }}>
          Indiquez l’effort et l’énergie pour enregistrer.
        </p>
      )}

      <div className="rangee-boutons" style={{ marginTop: 10 }}>
        <button className="bouton bouton--secondaire" type="button" onClick={onAnnuler}>
          Annuler
        </button>
      </div>
    </section>
  )
}
