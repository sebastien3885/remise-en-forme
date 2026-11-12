/**
 * Objectifs personnels : jauge d'avancement et éditeur (chapitres 1 et 5).
 *
 * Les deux cibles du chapitre 1 — marcher 30 minutes d'affilée, nager
 * 4 longueurs sans arrêt — sont posées dans le profil de départ. Elles
 * s'affichaient jusqu'ici comme une ligne de texte dans les réglages, sans
 * dire où on en était ni permettre d'en changer. C'est ce que cet écran ajoute.
 *
 * **La jauge lit le réalisé**, jamais le programme (chapitre 4), et jamais une
 * somme : le détail est dans `src/domaine/progression/objectifs.ts`.
 *
 * **L'éditeur ne propose que des grandeurs mesurables.** Un objectif dont
 * l'indicateur est inconnu — importé d'une sauvegarde, par exemple — s'affiche
 * sans jauge et avec un mot qui le dit, plutôt qu'avec un 0 % qui serait un
 * reproche fabriqué.
 */
import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'

import { CHAMPS_CHARGE, type ChampCharge, type ObjectifPersonnel } from '../../domaine/entites'
import { nouvelId } from '../../domaine/identifiants'
import {
  avancementDesObjectifs,
  indicateurMesurable,
  type AvancementObjectif,
} from '../../domaine/progression/objectifs'
import { depots } from '../../stockage'
import { formaterDateLongue, LIBELLE_CHAMP_CHARGE, UNITE_DU_CHAMP } from '../libelles'

export function Objectifs() {
  const profil = useLiveQuery(() => depots.profil.lire())
  const realisees = useLiveQuery(() => depots.seances.realisees.toutes())

  // Brouillon local : on n'écrit pas dans la base à chaque frappe. `null`
  // signifie « rien de modifié », ce qui garde le bouton Enregistrer éteint.
  const [brouillon, setBrouillon] = useState<ObjectifPersonnel[] | null>(null)
  const [erreur, setErreur] = useState<string | undefined>(undefined)
  const [enCours, setEnCours] = useState(false)

  if (!profil) return null

  const liste = brouillon ?? profil.objectifs
  const avancements = avancementDesObjectifs(profil.objectifs, realisees ?? [])

  function changer(index: number, changements: Partial<ObjectifPersonnel>) {
    setErreur(undefined)
    setBrouillon(
      liste.map((objectif, rang) =>
        rang === index ? { ...objectif, ...changements } : objectif,
      ),
    )
  }

  function ajouter() {
    setErreur(undefined)
    setBrouillon([
      ...liste,
      {
        id: nouvelId(),
        libelle: '',
        indicateur: 'dureeMinutes',
        cible: 10,
        unite: UNITE_DU_CHAMP.dureeMinutes,
      },
    ])
  }

  function retirer(index: number) {
    setErreur(undefined)
    setBrouillon(liste.filter((_, rang) => rang !== index))
  }

  async function enregistrer() {
    const nettoyes = liste.map((objectif) => ({
      ...objectif,
      libelle: objectif.libelle.trim(),
    }))

    if (nettoyes.some((objectif) => objectif.libelle === '')) {
      setErreur('Chaque objectif a besoin d’un libellé.')
      return
    }
    if (nettoyes.some((objectif) => !Number.isFinite(objectif.cible) || objectif.cible < 1)) {
      setErreur('Une cible se compte à partir de 1.')
      return
    }

    setEnCours(true)
    await depots.profil.modifier({ objectifs: nettoyes })
    setEnCours(false)
    setBrouillon(null)
  }

  return (
    <section className="carte">
      <h2>Mes objectifs</h2>

      {avancements.length === 0 ? (
        <p className="discret">
          Aucun objectif pour l’instant. « Marcher 30 minutes d’affilée » est un bon
          premier, parce qu’il se constate sans rien calculer.
        </p>
      ) : (
        <div className="objectifs">
          {avancements.map((avancement) => (
            <Jauge key={avancement.objectif.id} avancement={avancement} />
          ))}
        </div>
      )}

      <details className="repli">
        <summary>Modifier mes objectifs</summary>
        <div className="repli__contenu">
          {liste.map((objectif, index) => (
            <div className="champ-groupe" key={objectif.id}>
              <p className="champ-groupe__titre">Objectif {index + 1}</p>

              <label className="champ champ--large">
                <span className="discret">Ce que je veux atteindre</span>
                <input
                  type="text"
                  value={objectif.libelle}
                  placeholder="Marcher 30 minutes d’affilée"
                  onChange={(evenement) =>
                    changer(index, { libelle: evenement.target.value })
                  }
                />
              </label>

              <div className="champs">
                <label className="champ">
                  <span className="discret">Ce qu’on mesure</span>
                  <select
                    value={objectif.indicateur}
                    onChange={(evenement) => {
                      const champ = evenement.target.value as ChampCharge
                      changer(index, { indicateur: champ, unite: UNITE_DU_CHAMP[champ] })
                    }}
                  >
                    {/* Un indicateur venu d'ailleurs reste choisi tant qu'on
                        n'y touche pas : la liste ne le remplace pas en
                        silence par le premier de ses propres choix. */}
                    {!indicateurMesurable(objectif.indicateur) && (
                      <option value={objectif.indicateur}>
                        {objectif.indicateur} (non mesuré)
                      </option>
                    )}
                    {CHAMPS_CHARGE.map((champ) => (
                      <option key={champ} value={champ}>
                        {LIBELLE_CHAMP_CHARGE[champ]}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="champ">
                  <span className="discret">Cible</span>
                  <input
                    type="number"
                    inputMode="numeric"
                    min={1}
                    step={1}
                    value={objectif.cible}
                    onChange={(evenement) =>
                      changer(index, { cible: Number(evenement.target.value) })
                    }
                  />
                </label>
              </div>

              <button
                className="bouton bouton--secondaire"
                type="button"
                style={{ marginTop: 10 }}
                onClick={() => retirer(index)}
              >
                Retirer cet objectif
              </button>
            </div>
          ))}

          {erreur !== undefined && (
            <p style={{ marginTop: 14, color: 'var(--alerte)' }}>{erreur}</p>
          )}

          <div className="rangee-boutons" style={{ marginTop: 16 }}>
            <button className="bouton bouton--secondaire" type="button" onClick={ajouter}>
              Ajouter un objectif
            </button>
            <button
              className="bouton"
              type="button"
              disabled={brouillon === null || enCours}
              onClick={() => void enregistrer()}
            >
              {enCours ? 'Enregistrement…' : 'Enregistrer'}
            </button>
          </div>

          {brouillon !== null && (
            <button
              className="lien-discret"
              type="button"
              style={{ marginTop: 12 }}
              onClick={() => {
                setBrouillon(null)
                setErreur(undefined)
              }}
            >
              Annuler mes modifications
            </button>
          )}
        </div>
      </details>
    </section>
  )
}

/**
 * Une jauge, un chiffre et un mot.
 *
 * La couleur ne porte jamais seule l'information : l'état est toujours écrit —
 * « atteint le 12 novembre », « meilleur : 18 min », « rien de mesuré ».
 */
function Jauge({ avancement }: { avancement: AvancementObjectif }) {
  const { objectif, meilleur, part, atteint } = avancement
  const pourcentage = Math.round(part * 100)

  const etat = !avancement.mesurable
    ? 'Pas encore mesurable par l’application'
    : meilleur === undefined
      ? 'Rien de mesuré pour l’instant'
      : atteint && avancement.atteintLe !== undefined
        ? 'Atteint le ' + formaterDateLongue(avancement.atteintLe)
        : 'Meilleur : ' + String(meilleur) + ' ' + objectif.unite

  return (
    <article className={'objectif' + (atteint ? ' objectif--atteint' : '')}>
      <div className="objectif__entete">
        <p className="objectif__libelle">{objectif.libelle}</p>
        <p className="objectif__cible discret">
          <strong className="chiffre">{meilleur ?? '—'}</strong>
          {' / ' + String(objectif.cible) + ' ' + objectif.unite}
        </p>
      </div>

      {avancement.mesurable && (
        <div
          className="jauge"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={objectif.cible}
          aria-valuenow={meilleur ?? 0}
          aria-valuetext={
            String(meilleur ?? 0) + ' ' + objectif.unite + ' sur ' + String(objectif.cible)
          }
          aria-label={objectif.libelle}
        >
          <div className="jauge__remplissage" style={{ width: String(pourcentage) + '%' }} />
        </div>
      )}

      <p className="objectif__etat discret">{etat}</p>
    </article>
  )
}
