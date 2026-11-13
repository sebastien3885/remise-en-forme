/**
 * Écran « Semaine » (chapitre 8).
 *
 * Il porte le critère d'acceptation de l'étape 2 : le prévu et le réalisé
 * s'affichent **côte à côte**, exercice par exercice, et l'écart saute aux
 * yeux sans avoir à le chercher.
 *
 * Il porte aussi la planification libre du chapitre 3 : déplacer une séance,
 * la remplacer par une équivalente, la retirer, ou en poser une sur un jour
 * libre. Tout se fait au tap plutôt qu'au glisser : un glisser-déposer dans
 * une liste qui défile, à une main, rate sa cible trop souvent.
 */
import { useState } from 'react'

import { ajouterJours, aujourdhui } from '../../domaine/dates'
import { GABARITS, type GabaritSeance } from '../../domaine/programme/generateur'
import {
  ajouterSeance,
  annulerSeance,
  deplacerSeance,
  remplacerSeance,
} from '../../stockage/modifier-seance'
import { Icone } from '../composants/Icone'
import { useSemaine, type JourDeLaSemaine } from '../hooks/useSemaine'
import { formaterDateCourte, LIBELLE_STATUT, LIBELLE_TYPE_SEANCE } from '../libelles'

/** Les contenus proposables à l'ajout : un jour libre est déjà du repos. */
const GABARITS_A_AJOUTER = GABARITS.filter((gabarit) => gabarit !== 'repos')

type Quoi = 'deplacer' | 'remplacer' | 'ajouter'
type Action = { date: string; quoi: Quoi }

export function Semaine() {
  const [reference, setReference] = useState(() => aujourdhui())
  const vue = useSemaine(reference)
  const [action, setAction] = useState<Action | undefined>(undefined)
  const [message, setMessage] = useState<{ ton: 'refus' | 'info'; texte: string } | undefined>(
    undefined,
  )

  if (!vue) {
    return (
      <main className="page">
        <p className="discret">Chargement…</p>
      </main>
    )
  }

  function apresAction(echec: string | undefined, succes?: string) {
    if (echec) {
      setMessage({ ton: 'refus', texte: echec })
      return
    }
    setMessage(succes ? { ton: 'info', texte: succes } : undefined)
    setAction(undefined)
  }

  async function deplacer(seanceId: string, date: string) {
    const resultat = await deplacerSeance(seanceId, date)
    apresAction(resultat.deplace ? undefined : resultat.raison)
  }

  async function remplacer(seanceId: string, gabarit: GabaritSeance) {
    const resultat = await remplacerSeance(seanceId, gabarit)
    apresAction(resultat.remplace ? undefined : resultat.raison)
  }

  async function ajouter(date: string, gabarit: GabaritSeance) {
    const resultat = await ajouterSeance(date, gabarit)
    apresAction(resultat.cree ? undefined : resultat.raison)
  }

  async function retirer(seanceId: string) {
    const resultat = await annulerSeance(seanceId)
    apresAction(
      resultat.annulee ? undefined : resultat.raison,
      resultat.annulee
        ? 'Séance retirée. Vous pouvez en poser une autre sur ce jour.'
        : undefined,
    )
  }

  return (
    <main className="page">
      <header className="page__entete">
        <div className="entete-jour">
          <p className="surtitre">
            {vue.numero > 0 ? 'Semaine ' + String(vue.numero) : 'Semaine'}
          </p>
          <p className="surtitre entete-jour__compteur">
            {vue.faites}/{vue.prevues}
          </p>
        </div>
        <div className="navigation-semaine">
          <button
            className="bouton bouton--icone"
            type="button"
            aria-label="Semaine précédente"
            onClick={() => setReference(ajouterJours(reference, -7))}
          >
            ‹
          </button>
          <h1>
            {formaterDateCourte(vue.debut)} – {formaterDateCourte(vue.fin)}
          </h1>
          <button
            className="bouton bouton--icone"
            type="button"
            aria-label="Semaine suivante"
            onClick={() => setReference(ajouterJours(reference, 7))}
          >
            ›
          </button>
        </div>
        {reference !== aujourdhui() && (
          <div className="rangee-boutons">
            <button
              className="bouton bouton--secondaire"
              type="button"
              onClick={() => setReference(aujourdhui())}
            >
              Revenir à cette semaine
            </button>
          </div>
        )}
      </header>

      {message && (
        <p className={message.ton === 'refus' ? 'avertissement-sante' : 'succes'}>
          {message.texte}
        </p>
      )}

      {vue.jours.map((jour) => (
        <Jour
          key={jour.date}
          jour={jour}
          joursDeLaSemaine={vue.jours.map((autre) => autre.date)}
          estAujourdhui={jour.date === aujourdhui()}
          action={action?.date === jour.date ? action.quoi : undefined}
          onAction={(quoi) =>
            setAction(
              action?.date === jour.date && action.quoi === quoi
                ? undefined
                : { date: jour.date, quoi },
            )
          }
          onDeplacer={(date) => {
            if (jour.prevue) void deplacer(jour.prevue.id, date)
          }}
          onRemplacer={(gabarit) => {
            if (jour.prevue) void remplacer(jour.prevue.id, gabarit)
          }}
          onAjouter={(gabarit) => void ajouter(jour.date, gabarit)}
          onRetirer={() => {
            if (jour.prevue) void retirer(jour.prevue.id)
          }}
        />
      ))}
    </main>
  )
}

interface ProprietesJour {
  jour: JourDeLaSemaine
  joursDeLaSemaine: string[]
  estAujourdhui: boolean
  action: Quoi | undefined
  onAction: (quoi: Quoi) => void
  onDeplacer: (date: string) => void
  onRemplacer: (gabarit: GabaritSeance) => void
  onAjouter: (gabarit: GabaritSeance) => void
  onRetirer: () => void
}

function Jour({
  jour,
  joursDeLaSemaine,
  estAujourdhui,
  action,
  onAction,
  onDeplacer,
  onRemplacer,
  onAjouter,
  onRetirer,
}: ProprietesJour) {
  const { prevue, realisee, improvisees, comparaison } = jour
  const aEteSaisie = realisee !== undefined
  const estUnEntrainement = prevue !== undefined && prevue.type !== 'repos'

  return (
    <section className={'jour' + (estAujourdhui ? ' jour--aujourdhui' : '')}>
      <div className="jour__entete">
        <p className="jour__date">
          {formaterDateCourte(jour.date)}
          {estAujourdhui && <span className="jour__marqueur"> · aujourd’hui</span>}
        </p>
        {aEteSaisie && (
          <span className={'etat etat--' + realisee.statut}>
            {LIBELLE_STATUT[realisee.statut]}
          </span>
        )}
      </div>

      {!prevue && (
        <>
          <p className="discret jour__vide">Jour libre</p>
          {!aEteSaisie && (
            <button className="lien-discret" type="button" onClick={() => onAction('ajouter')}>
              <Icone nom="plus" taille={17} />
              <span>{action === 'ajouter' ? 'Annuler' : 'Poser une séance'}</span>
            </button>
          )}
          {action === 'ajouter' && (
            <ChoixDeGabarit
              legende="Quelle séance poser ?"
              gabarits={GABARITS_A_AJOUTER}
              onChoisir={onAjouter}
            />
          )}
        </>
      )}

      {prevue?.type === 'repos' && (
        <>
          <p className="discret jour__vide">
            <Icone nom="repos" taille={17} /> Repos complet
          </p>
          {!aEteSaisie && (
            <div className="rangee-boutons jour__actions">
              <button
                className="bouton bouton--secondaire"
                type="button"
                onClick={() => onAction('remplacer')}
              >
                {action === 'remplacer' ? 'Annuler' : 'Remplacer'}
              </button>
            </div>
          )}
          {action === 'remplacer' && (
            <ChoixDeGabarit
              legende="Remplacer le repos par"
              gabarits={GABARITS_A_AJOUTER}
              onChoisir={onRemplacer}
            />
          )}
        </>
      )}

      {improvisees.map((improvisee) => (
        <p key={improvisee.id} className="jour__improvisee">
          <Icone nom="plus" taille={15} />
          <span>
            Noté en plus : <strong>{improvisee.titre}</strong>
            {improvisee.effort !== undefined && (
              <span className="discret"> · effort {improvisee.effort}/10</span>
            )}
          </span>
        </p>
      ))}

      {estUnEntrainement && prevue && (
        <>
          <p className="jour__titre">{prevue.titre}</p>

          {comparaison.length > 0 && (
            <table className="comparaison">
              <thead>
                <tr>
                  <th scope="col">Exercice</th>
                  <th scope="col">Prévu</th>
                  <th scope="col">Réalisé</th>
                </tr>
              </thead>
              <tbody>
                {comparaison.map((ligne) => (
                  <tr
                    key={ligne.exerciceId}
                    className={ligne.differe ? 'comparaison--ecart' : ''}
                  >
                    <th scope="row">{ligne.nom}</th>
                    <td>{ligne.prevu}</td>
                    <td>{ligne.reel || <span className="discret">—</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {realisee && (realisee.effort !== undefined || realisee.douleurs.length > 0) && (
            <p className="jour__ressenti discret">
              {realisee.effort !== undefined && <>effort {realisee.effort}/10</>}
              {realisee.energie !== undefined && <> · énergie {realisee.energie}/10</>}
              {realisee.heuresSommeil !== undefined && (
                <> · sommeil {realisee.heuresSommeil} h</>
              )}
              {realisee.douleurs.map((douleur) => (
                <span key={douleur.zone}>
                  {' · douleur '}
                  {douleur.zone} {douleur.intensite}/10
                </span>
              ))}
            </p>
          )}

          {aEteSaisie ? (
            <p className="discret jour__note">
              Séance saisie : elle ne se déplace plus, son réalisé porte la date du jour.
            </p>
          ) : (
            <>
              <div className="rangee-boutons jour__actions">
                <button
                  className="bouton bouton--secondaire"
                  type="button"
                  onClick={() => onAction('deplacer')}
                >
                  {action === 'deplacer' ? 'Annuler' : 'Déplacer'}
                </button>
                <button
                  className="bouton bouton--secondaire"
                  type="button"
                  onClick={() => onAction('remplacer')}
                >
                  {action === 'remplacer' ? 'Annuler' : 'Remplacer'}
                </button>
                <button className="bouton bouton--secondaire" type="button" onClick={onRetirer}>
                  Retirer
                </button>
              </div>

              {action === 'deplacer' && (
                <fieldset className="echelle jour__choix">
                  <legend>
                    Vers quel jour ?{' '}
                    <span className="discret">· un jour occupé échange les deux séances</span>
                  </legend>
                  <div className="chips">
                    {joursDeLaSemaine.map((date) => (
                      <button
                        key={date}
                        type="button"
                        disabled={date === jour.date}
                        onClick={() => onDeplacer(date)}
                      >
                        {formaterDateCourte(date)}
                      </button>
                    ))}
                  </div>
                </fieldset>
              )}

              {action === 'remplacer' && (
                <ChoixDeGabarit
                  legende="Remplacer par"
                  gabarits={GABARITS}
                  onChoisir={onRemplacer}
                />
              )}
            </>
          )}
        </>
      )}
    </section>
  )
}

function ChoixDeGabarit({
  legende,
  gabarits,
  onChoisir,
}: {
  legende: string
  gabarits: readonly GabaritSeance[]
  onChoisir: (gabarit: GabaritSeance) => void
}) {
  return (
    <fieldset className="echelle jour__choix">
      <legend>{legende}</legend>
      <div className="chips">
        {gabarits.map((gabarit) => (
          <button key={gabarit} type="button" onClick={() => onChoisir(gabarit)}>
            {LIBELLE_TYPE_SEANCE[gabarit]}
          </button>
        ))}
      </div>
    </fieldset>
  )
}
