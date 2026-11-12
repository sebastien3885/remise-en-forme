/**
 * Écran « Semaine » (chapitre 8).
 *
 * Il porte le critère d'acceptation de l'étape 2 : le prévu et le réalisé
 * s'affichent **côte à côte**, exercice par exercice, et l'écart saute aux
 * yeux sans avoir à le chercher.
 *
 * Le déplacement se fait au tap plutôt qu'au glisser : un glisser-déposer
 * dans une liste qui défile, à une main, rate sa cible une fois sur trois.
 * Déposer sur un jour occupé échange les deux séances.
 */
import { useState } from 'react'

import { ajouterJours, aujourdhui } from '../../domaine/dates'
import { deplacerSeance } from '../../stockage/modifier-seance'
import { Icone } from '../composants/Icone'
import { useSemaine, type JourDeLaSemaine } from '../hooks/useSemaine'
import { formaterDateCourte, LIBELLE_STATUT } from '../libelles'

export function Semaine() {
  const [reference, setReference] = useState(() => aujourdhui())
  const vue = useSemaine(reference)
  const [refus, setRefus] = useState<string | undefined>(undefined)
  const [aDeplacer, setADeplacer] = useState<string | undefined>(undefined)

  if (!vue) {
    return (
      <main className="page">
        <p className="discret">Chargement…</p>
      </main>
    )
  }

  async function deplacer(seanceId: string, date: string) {
    setRefus(undefined)
    const resultat = await deplacerSeance(seanceId, date)
    if (!resultat.deplace) {
      setRefus(resultat.raison)
      return
    }
    setADeplacer(undefined)
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

      {refus && <p className="avertissement-sante">{refus}</p>}

      {vue.jours.map((jour) => (
        <Jour
          key={jour.date}
          jour={jour}
          joursDeLaSemaine={vue.jours.map((autre) => autre.date)}
          estAujourdhui={jour.date === aujourdhui()}
          ouvert={aDeplacer === jour.prevue?.id}
          onOuvrir={() =>
            setADeplacer(aDeplacer === jour.prevue?.id ? undefined : jour.prevue?.id)
          }
          onDeplacer={(date) => {
            if (jour.prevue) void deplacer(jour.prevue.id, date)
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
  ouvert: boolean
  onOuvrir: () => void
  onDeplacer: (date: string) => void
}

function Jour({
  jour,
  joursDeLaSemaine,
  estAujourdhui,
  ouvert,
  onOuvrir,
  onDeplacer,
}: ProprietesJour) {
  const { prevue, realisee, comparaison } = jour
  const aEteSaisie = realisee !== undefined

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

      {!prevue && <p className="discret jour__vide">Jour libre</p>}

      {prevue?.type === 'repos' && (
        <p className="discret jour__vide">
          <Icone nom="repos" taille={17} /> Repos complet
        </p>
      )}

      {prevue && prevue.type !== 'repos' && (
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
                  <tr key={ligne.exerciceId} className={ligne.differe ? 'comparaison--ecart' : ''}>
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
              {realisee.douleurs.map((douleur) => (
                <span key={douleur.zone}>
                  {' · douleur '}
                  {douleur.zone} {douleur.intensite}/10
                </span>
              ))}
            </p>
          )}

          <div className="rangee-boutons jour__actions">
            <button className="bouton bouton--secondaire" type="button" onClick={onOuvrir}>
              {ouvert ? 'Annuler le déplacement' : 'Déplacer'}
            </button>
          </div>

          {ouvert && (
            <fieldset className="echelle" style={{ marginTop: 14, marginBottom: 0 }}>
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
        </>
      )}
    </section>
  )
}
