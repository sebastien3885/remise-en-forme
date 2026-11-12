/**
 * Écran « Aujourd'hui » (chapitre 8).
 *
 * Une seule chose compte ici : la séance du jour et le geste qui la valide.
 * Tout le reste — l'état de la semaine, l'eau — tient sur une ligne, et le
 * bouton de validation est la plus grosse chose à l'écran.
 */
import { useState } from 'react'

import { aujourdhui } from '../../domaine/dates'
import type { StatutRealisation } from '../../domaine/entites'
import { depots } from '../../stockage'
import { Icone } from '../composants/Icone'
import { PanneauValidation } from '../composants/PanneauValidation'
import { useEtatDuJour } from '../hooks/useEtatDuJour'
import { chiffreMarquant, formaterDateLongue, formaterMesures, LIBELLE_STATUT } from '../libelles'
import { lienOnglet } from '../navigation/onglets'

export function Aujourdhui() {
  const date = aujourdhui()
  const etat = useEtatDuJour(date)
  const [saisie, setSaisie] = useState<StatutRealisation | undefined>(undefined)

  if (!etat) {
    return (
      <main className="page">
        <p className="discret">Chargement…</p>
      </main>
    )
  }

  const { prevue, realisee, exercices, semaine } = etat
  const principaux = exercices.filter((exercice) => exercice.exercice?.categorie !== 'mobilite')
  const premier = principaux[0]
  const marquant =
    principaux.length === 1 && premier
      ? chiffreMarquant(premier.cibles)
      : principaux.length > 1
        ? { valeur: principaux.length, unite: 'exercices' }
        : undefined

  const entete = (
    <header className="page__entete">
      <div className="entete-jour">
        <p className="surtitre">{formaterDateLongue(date)}</p>
        {semaine.prevues > 0 && (
          <p className="surtitre entete-jour__compteur">
            Semaine {semaine.numero} · {semaine.faites}/{semaine.prevues}
          </p>
        )}
      </div>
    </header>
  )

  // --- la séance a été saisie : on montre ce qui a été enregistré
  if (realisee && saisie === undefined) {
    return (
      <main className="page">
        {entete}
        <section className="carte">
          <p className="surtitre">{LIBELLE_STATUT[realisee.statut]}</p>
          <h1 style={{ marginTop: 8 }}>{realisee.titre}</h1>

          <dl className="donnees" style={{ marginTop: 18 }}>
            {realisee.effort !== undefined && (
              <>
                <dt>Effort</dt>
                <dd>{realisee.effort}/10</dd>
              </>
            )}
            {realisee.energie !== undefined && (
              <>
                <dt>Énergie</dt>
                <dd>{realisee.energie}/10</dd>
              </>
            )}
            {realisee.douleurs.length > 0 && (
              <>
                <dt>Douleur</dt>
                <dd>
                  {realisee.douleurs
                    .map((douleur) => douleur.zone + ' ' + String(douleur.intensite) + '/10')
                    .join(', ')}
                </dd>
              </>
            )}
            {realisee.note && (
              <>
                <dt>Note</dt>
                <dd>{realisee.note}</dd>
              </>
            )}
          </dl>

          <div className="rangee-boutons" style={{ marginTop: 18 }}>
            <button
              className="bouton bouton--secondaire"
              type="button"
              onClick={() => setSaisie(realisee.statut)}
            >
              Corriger
            </button>
          </div>
        </section>
        <LigneEau etat={etat} />
      </main>
    )
  }

  // --- saisie en cours
  if (saisie !== undefined && prevue) {
    return (
      <main className="page">
        {entete}
        <PanneauValidation
          date={date}
          prevue={prevue}
          exercices={exercices}
          type={prevue.type}
          titre={prevue.titre}
          statut={saisie}
          {...(realisee ? { realisee } : {})}
          onFini={() => setSaisie(undefined)}
          onAnnuler={() => setSaisie(undefined)}
        />
      </main>
    )
  }

  // --- aucun programme
  if (!etat.programme) {
    return (
      <main className="page">
        {entete}
        <section className="carte">
          <h1>Pas encore de programme</h1>
          <p className="discret" style={{ marginTop: 10 }}>
            Générez les douze semaines du cahier des charges, ou importez un plan préparé sur
            l’ordinateur.
          </p>
          <div className="rangee-boutons" style={{ marginTop: 16 }}>
            <a className="bouton" href={lienOnglet('reglages')}>
              Aller aux réglages
            </a>
          </div>
        </section>
      </main>
    )
  }

  // --- jour de repos
  if (prevue?.type === 'repos') {
    return (
      <main className="page">
        {entete}
        <section className="carte carte--repos">
          <Icone nom="repos" taille={34} />
          <h1 style={{ marginTop: 14 }}>Repos complet</h1>
          <p className="discret" style={{ marginTop: 10 }}>
            Le repos fait partie du programme : c’est lui qui rend la semaine suivante
            possible.
          </p>
        </section>
        <LigneEau etat={etat} />
      </main>
    )
  }

  // --- rien de prévu
  if (!prevue) {
    return (
      <main className="page">
        {entete}
        <section className="carte">
          <h1>Rien de prévu</h1>
          <p className="discret" style={{ marginTop: 10 }}>
            Aucune séance n’est posée aujourd’hui. L’écran Semaine permet d’en déplacer une
            ici.
          </p>
          <div className="rangee-boutons" style={{ marginTop: 16 }}>
            <a className="bouton bouton--secondaire" href={lienOnglet('semaine')}>
              Voir la semaine
            </a>
          </div>
        </section>
        <LigneEau etat={etat} />
      </main>
    )
  }

  // --- la séance du jour
  return (
    <main className="page">
      {entete}

      <section className="hero">
        <p className="hero__type">{prevue.titre}</p>
        {marquant && (
          <p className="hero__chiffre">
            <span className="chiffre chiffre--geant">{marquant.valeur}</span>
            <span className="hero__unite">{marquant.unite}</span>
          </p>
        )}
        {premier?.consigne && <p className="discret hero__consigne">{premier.consigne}</p>}
        {!premier?.consigne && premier?.exercice?.consigneSecurite && (
          <p className="discret hero__consigne">{premier.exercice.consigneSecurite}</p>
        )}
      </section>

      <ul className="liste-nue liste-exercices">
        {exercices.map((exercice) => (
          <li key={exercice.exerciceId + '-' + String(exercice.ordre)}>
            <span className="liste-exercices__nom">
              {exercice.exercice?.nom ?? exercice.exerciceId}
            </span>
            <span className="discret">{formaterMesures(exercice.cibles)}</span>
          </li>
        ))}
      </ul>

      <LigneEau etat={etat} />

      <button
        type="button"
        className="bouton bouton--principal"
        onClick={() => setSaisie('faite')}
      >
        C’est fait
      </button>

      <div className="rangee-boutons">
        <button
          className="bouton bouton--secondaire"
          type="button"
          onClick={() => setSaisie('partielle')}
        >
          En partie
        </button>
        <button
          className="bouton bouton--secondaire"
          type="button"
          onClick={() => setSaisie('sautee')}
        >
          Sautée
        </button>
      </div>
    </main>
  )
}

/** Compteur de verres d'eau (chapitre 6), sur une ligne. */
function LigneEau({ etat }: { etat: ReturnType<typeof useEtatDuJour> }) {
  if (!etat) return null
  const bus = etat.hydratation?.verres ?? 0
  const objectif = etat.hydratation?.objectif ?? etat.objectifVerres

  return (
    <div className="ligne">
      <span className="ligne__texte">
        Eau · <strong className="chiffre">{bus}</strong>{' '}
        <span className="discret">sur {objectif} verres</span>
      </span>
      <button
        className="bouton bouton--icone"
        type="button"
        aria-label="Ajouter un verre d’eau"
        onClick={() => void depots.hydratation.ajouter(etat.date, 1, objectif)}
      >
        <Icone nom="plus" taille={20} />
      </button>
    </div>
  )
}
