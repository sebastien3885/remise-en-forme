/**
 * Éditeur du profil : matériel, précautions, antécédents (chapitres 3 et 10).
 *
 * Tant que l'application était écrite pour une personne, tout cela était
 * prérempli et il n'y avait rien à régler. Devenue générale, elle doit laisser
 * déclarer ce qu'elle ne peut pas deviner.
 *
 * **Les précautions sont le seul levier de sécurité.** Un antécédent déclaré
 * n'écarte aucun exercice : il sert à retrouver une zone d'un tap quand on
 * signale une douleur, et à se souvenir de ce qu'on a. C'est le plafond
 * d'impact, l'exclusion des flexions marquées et la liste d'exercices écartés
 * à la main qui décident. Mélanger les deux ferait qu'effacer une ligne
 * d'historique retirerait une protection sans prévenir.
 *
 * **Ouvrir le plafond reste possible**, c'est écrit dans le chapitre 10 : ce
 * sont des précautions, pas un avis médical. L'écran dit ce que ça change, en
 * toutes lettres, et laisse décider.
 */
import { useState } from 'react'

import {
  IMPACTS_GENOU,
  LIBELLE_IMPACT_GENOU,
  LIBELLE_MATERIEL,
  MATERIELS,
  type Antecedent,
  type Exercice,
  type ImpactGenou,
  type Materiel,
  type NiveauDepart,
  type Precautions,
  type Profil,
} from '../../domaine/entites'
import { versSlug } from '../../domaine/identifiants'
import { depots } from '../../stockage'
import { libelleZone } from '../libelles'

interface Brouillon {
  materiel: Materiel[]
  precautions: Precautions
  antecedents: Antecedent[]
  niveauDepart: NiveauDepart
}

/** Les quatre mesures du questionnaire de départ (chapitre 3). */
const MESURES_DE_DEPART: readonly {
  champ: keyof NiveauDepart
  libelle: string
  unite: string
  pas: number
}[] = [
  { champ: 'marcheConfortableMetres', libelle: 'Marche confortable', unite: 'm', pas: 100 },
  { champ: 'longueursNageables', libelle: 'Longueurs d’affilée', unite: '', pas: 1 },
  { champ: 'pompesPossibles', libelle: 'Pompes d’affilée', unite: '', pas: 1 },
  { champ: 'squatsPossibles', libelle: 'Squats d’affilée', unite: '', pas: 1 },
]

export interface ProprietesMonProfil {
  profil: Profil
  /** La bibliothèque, pour la liste des exercices écartés à la main. */
  bibliotheque: readonly Exercice[]
}

export function MonProfil({ profil, bibliotheque }: ProprietesMonProfil) {
  const [brouillon, setBrouillon] = useState<Brouillon | null>(null)
  const [zone, setZone] = useState('')
  const [precision, setPrecision] = useState('')
  const [depuis, setDepuis] = useState('')
  const [erreur, setErreur] = useState<string | undefined>(undefined)
  const [enCours, setEnCours] = useState(false)

  const courant: Brouillon = brouillon ?? {
    materiel: profil.materiel,
    precautions: profil.precautions,
    antecedents: profil.antecedents,
    niveauDepart: profil.niveauDepart,
  }

  function changer(changements: Partial<Brouillon>) {
    setErreur(undefined)
    setBrouillon({ ...courant, ...changements })
  }

  function basculerMateriel(choisi: Materiel) {
    // « aucun » est exclusif : cocher un tapis veut dire qu'on n'est plus
    // sans rien, et une liste vide n'a pas de sens — elle revient à « aucun ».
    if (choisi === 'aucun') {
      changer({ materiel: ['aucun'] })
      return
    }
    const sansAucun = courant.materiel.filter((materiel) => materiel !== 'aucun')
    const suivant = sansAucun.includes(choisi)
      ? sansAucun.filter((materiel) => materiel !== choisi)
      : [...sansAucun, choisi]
    changer({ materiel: suivant.length === 0 ? ['aucun'] : suivant })
  }

  /**
   * Une mesure vidée disparaît du profil ; un zéro, lui, est une réponse.
   * « Je ne fais pas une seule pompe » n'est pas « je n'ai pas répondu », et
   * le générateur ne doit pas les confondre.
   */
  function changerNiveau(champ: keyof NiveauDepart, saisie: string) {
    const niveau = { ...courant.niveauDepart }
    if (saisie.trim() === '') {
      delete niveau[champ]
    } else {
      const nombre = Number(saisie)
      if (!Number.isFinite(nombre) || nombre < 0) return
      niveau[champ] = nombre
    }
    changer({ niveauDepart: niveau })
  }

  function basculerExclusion(exerciceId: string) {
    const exclus = courant.precautions.exercicesExclusIds
    changer({
      precautions: {
        ...courant.precautions,
        exercicesExclusIds: exclus.includes(exerciceId)
          ? exclus.filter((id) => id !== exerciceId)
          : [...exclus, exerciceId],
      },
    })
  }

  function ajouterAntecedent() {
    const libelle = zone.trim()
    if (libelle === '') {
      setErreur('Un antécédent a besoin d’une zone : « Genou droit », « Épaule gauche ».')
      return
    }

    const slug = versSlug(libelle)
    if (courant.antecedents.some((antecedent) => antecedent.zone === slug)) {
      setErreur('Cette zone est déjà déclarée.')
      return
    }

    const annee = Number(depuis)
    changer({
      antecedents: [
        ...courant.antecedents,
        {
          id: slug,
          zone: slug,
          description: precision.trim(),
          ...(Number.isInteger(annee) && annee > 1900 ? { depuis: annee } : {}),
        },
      ],
    })
    setZone('')
    setPrecision('')
    setDepuis('')
  }

  async function enregistrer() {
    setEnCours(true)
    await depots.profil.modifier({
      materiel: courant.materiel,
      precautions: courant.precautions,
      antecedents: courant.antecedents,
      niveauDepart: courant.niveauDepart,
    })
    setEnCours(false)
    setBrouillon(null)
  }

  const impact = courant.precautions.impactGenouMaximal

  return (
    <details className="repli">
      <summary>Modifier mon profil</summary>
      <div className="repli__contenu">
        <fieldset className="echelle">
          <legend>Mon matériel</legend>
          <div className="chips">
            {MATERIELS.map((materiel) => (
              <button
                key={materiel}
                type="button"
                aria-pressed={courant.materiel.includes(materiel)}
                onClick={() => basculerMateriel(materiel)}
              >
                {LIBELLE_MATERIEL[materiel]}
              </button>
            ))}
          </div>
          <p className="discret" style={{ marginTop: 10, fontSize: '0.85rem' }}>
            Un exercice qui demande un matériel non déclaré est écarté du programme.
          </p>
        </fieldset>

        <fieldset className="echelle" style={{ marginTop: 20 }}>
          <legend>Impact toléré sur le genou</legend>
          <div className="chips">
            {IMPACTS_GENOU.map((niveau) => (
              <button
                key={niveau}
                type="button"
                aria-pressed={impact === niveau}
                onClick={() =>
                  changer({
                    precautions: {
                      ...courant.precautions,
                      impactGenouMaximal: niveau as ImpactGenou,
                    },
                  })
                }
              >
                {LIBELLE_IMPACT_GENOU[niveau]}
              </button>
            ))}
          </div>
          <p className="discret" style={{ marginTop: 10, fontSize: '0.85rem' }}>
            {impact === 'eleve'
              ? 'Course, sauts et squats profonds redeviennent possibles. Ce sont des précautions, pas un avis médical : à lever sous votre responsabilité.'
              : impact === 'faible'
                ? 'Seuls les mouvements les plus doux sont proposés.'
                : 'Course, sauts et squats profonds restent écartés. C’est le réglage conseillé pour une reprise.'}
          </p>
        </fieldset>

        <div className="ligne" style={{ marginTop: 20 }}>
          <span className="ligne__texte">
            Écarter les flexions marquées
            <span className="discret"> · sinon elles sont seulement signalées</span>
          </span>
          <button
            className={
              'bascule' + (courant.precautions.exclureFlexionMarquee ? ' bascule--active' : '')
            }
            type="button"
            role="switch"
            aria-checked={courant.precautions.exclureFlexionMarquee}
            aria-label="Écarter les exercices à flexion marquée du genou"
            onClick={() =>
              changer({
                precautions: {
                  ...courant.precautions,
                  exclureFlexionMarquee: !courant.precautions.exclureFlexionMarquee,
                },
              })
            }
          >
            <span className="bascule__curseur" />
          </button>
        </div>

        <details className="repli" style={{ marginTop: 18 }}>
          <summary>
            Écarter des exercices un par un
            {courant.precautions.exercicesExclusIds.length > 0 &&
              ' · ' + String(courant.precautions.exercicesExclusIds.length) + ' écarté(s)'}
          </summary>
          <div className="repli__contenu">
            <div className="chips">
              {bibliotheque.map((exercice) => (
                <button
                  key={exercice.id}
                  type="button"
                  aria-pressed={courant.precautions.exercicesExclusIds.includes(exercice.id)}
                  onClick={() => basculerExclusion(exercice.id)}
                >
                  {exercice.nom}
                </button>
              ))}
            </div>
          </div>
        </details>

        <fieldset className="echelle" style={{ marginTop: 20 }}>
          <legend>Mon niveau de départ</legend>
          <p className="discret" style={{ fontSize: '0.85rem' }}>
            Ce qui est à votre portée aujourd’hui, pas ce que vous visez. Laissez vide ce
            que vous ne savez pas : le programme prendra une valeur moyenne.
          </p>

          <div className="champs" style={{ marginTop: 14 }}>
            {MESURES_DE_DEPART.map((mesure) => (
              <label className="champ" key={mesure.champ}>
                <span className="discret">
                  {mesure.libelle}
                  {mesure.unite ? ' · ' + mesure.unite : ''}
                </span>
                <input
                  type="number"
                  inputMode="numeric"
                  min={0}
                  step={mesure.pas}
                  value={courant.niveauDepart[mesure.champ] ?? ''}
                  onChange={(evenement) =>
                    changerNiveau(mesure.champ, evenement.target.value)
                  }
                />
              </label>
            ))}
          </div>

          <p className="discret" style={{ marginTop: 12, fontSize: '0.85rem' }}>
            La marche, les pompes et les squats dimensionnent les séances générées — une
            marche confortable de 1 600 m donne des séances de 20 minutes, pas de 30. Les
            longueurs sont notées comme repère de départ : la séance de natation part déjà
            du format le plus doux, une longueur à la fois. Le programme s’adapte au moment
            où il est généré : après coup, il faut en générer une nouvelle version.
          </p>
        </fieldset>

        <fieldset className="echelle" style={{ marginTop: 20 }}>
          <legend>Mes antécédents</legend>
          <p className="discret" style={{ fontSize: '0.85rem' }}>
            Ils n’écartent aucun exercice — ce sont les précautions ci-dessus qui le font.
            Une zone déclarée se retrouve d’un tap quand une douleur se signale.
          </p>

          {courant.antecedents.length > 0 && (
            <ul className="liste-nue liste-ecartes" style={{ marginTop: 14 }}>
              {courant.antecedents.map((antecedent, index) => (
                <li key={antecedent.id}>
                  <strong>{libelleZone(antecedent.zone)}</strong>
                  <span className="discret">
                    {antecedent.description}
                    {antecedent.depuis !== undefined
                      ? (antecedent.description ? ' · ' : '') + 'depuis ' + String(antecedent.depuis)
                      : ''}
                  </span>
                  <button
                    className="lien-discret"
                    type="button"
                    onClick={() =>
                      changer({
                        antecedents: courant.antecedents.filter((_, rang) => rang !== index),
                      })
                    }
                  >
                    Retirer
                  </button>
                </li>
              ))}
            </ul>
          )}

          <div className="champs" style={{ marginTop: 14 }}>
            <label className="champ">
              <span className="discret">Zone</span>
              <input
                type="text"
                value={zone}
                placeholder="Genou droit"
                onChange={(evenement) => setZone(evenement.target.value)}
              />
            </label>
            <label className="champ">
              <span className="discret">Depuis</span>
              <input
                type="number"
                inputMode="numeric"
                value={depuis}
                placeholder="2020"
                onChange={(evenement) => setDepuis(evenement.target.value)}
              />
            </label>
          </div>

          <label className="champ champ--large" style={{ marginTop: 10 }}>
            <span className="discret">Précision · facultatif</span>
            <input
              type="text"
              value={precision}
              placeholder="Opéré, rééduqué"
              onChange={(evenement) => setPrecision(evenement.target.value)}
            />
          </label>

          <button
            className="bouton bouton--secondaire"
            type="button"
            style={{ marginTop: 12 }}
            onClick={ajouterAntecedent}
          >
            Ajouter cet antécédent
          </button>
        </fieldset>

        {erreur !== undefined && (
          <p style={{ marginTop: 14, color: 'var(--alerte)' }}>{erreur}</p>
        )}

        <div className="rangee-boutons" style={{ marginTop: 18 }}>
          <button
            className="bouton"
            type="button"
            disabled={brouillon === null || enCours}
            onClick={() => void enregistrer()}
          >
            {enCours ? 'Enregistrement…' : 'Enregistrer'}
          </button>
          {brouillon !== null && (
            <button
              className="bouton bouton--secondaire"
              type="button"
              onClick={() => {
                setBrouillon(null)
                setErreur(undefined)
              }}
            >
              Annuler
            </button>
          )}
        </div>
      </div>
    </details>
  )
}
