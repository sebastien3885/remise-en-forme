/**
 * Écran « Alimentation » (chapitre 8).
 *
 * Le suivi est volontairement léger : le chapitre 6 veut « prendre conscience
 * des habitudes, pas compter chaque calorie ». L'écran compte donc des jours
 * tenus, jamais des calories, et ne commente aucune valeur.
 *
 * L'action principale suit le fil de la journée : le premier repas pas encore
 * noté. Une fois les trois repas écrits, c'est la collation.
 */
import { useState } from 'react'

import { ajouterJours, aujourdhui } from '../../domaine/dates'
import type { MomentRepas, Repas } from '../../domaine/entites'
import { depots } from '../../stockage'
import { Courbe } from '../composants/Courbe'
import { Icone } from '../composants/Icone'
import { PanneauMesure } from '../composants/PanneauMesure'
import { PanneauRepas } from '../composants/PanneauRepas'
import { useAlimentation, type VueAlimentation } from '../hooks/useAlimentation'
import { formaterDateLongue, LIBELLE_MOMENT } from '../libelles'

const PRINCIPAUX: readonly MomentRepas[] = ['petit-dejeuner', 'dejeuner', 'diner']

type Vue =
  | { mode: 'journal' }
  | { mode: 'repas'; moment: MomentRepas; repas?: Repas }
  | { mode: 'mesure' }

export function Alimentation() {
  const [date, setDate] = useState(() => aujourdhui())
  const vue = useAlimentation(date)
  const [panneau, setPanneau] = useState<Vue>({ mode: 'journal' })

  if (!vue) {
    return (
      <main className="page">
        <p className="discret">Chargement…</p>
      </main>
    )
  }

  const parMoment = new Map(vue.repas.map((repas) => [repas.moment, repas]))
  const collations = vue.repas.filter((repas) => repas.moment === 'collation')
  const prochain = PRINCIPAUX.find((moment) => !parMoment.has(moment)) ?? 'collation'

  if (panneau.mode === 'repas') {
    return (
      <main className="page">
        <PanneauRepas
          date={date}
          moment={panneau.moment}
          {...(panneau.repas ? { repas: panneau.repas } : {})}
          onFini={() => setPanneau({ mode: 'journal' })}
          onAnnuler={() => setPanneau({ mode: 'journal' })}
        />
      </main>
    )
  }

  if (panneau.mode === 'mesure') {
    return (
      <main className="page">
        <PanneauMesure
          date={date}
          {...(vue.derniereMesure?.date === date ? { mesure: vue.derniereMesure } : {})}
          onFini={() => setPanneau({ mode: 'journal' })}
          onAnnuler={() => setPanneau({ mode: 'journal' })}
        />
      </main>
    )
  }

  return (
    <main className="page">
      <header className="page__entete">
        <div className="navigation-semaine">
          <button
            className="bouton bouton--icone"
            type="button"
            aria-label="Jour précédent"
            onClick={() => setDate(ajouterJours(date, -1))}
          >
            ‹
          </button>
          <h1>{formaterDateLongue(date)}</h1>
          <button
            className="bouton bouton--icone"
            type="button"
            aria-label="Jour suivant"
            disabled={date >= aujourdhui()}
            onClick={() => setDate(ajouterJours(date, 1))}
          >
            ›
          </button>
        </div>
      </header>

      <LigneEau vue={vue} />

      <section className="carte">
        <h2>Journal</h2>
        <ul className="liste-nue journal">
          {PRINCIPAUX.map((moment) => {
            const repas = parMoment.get(moment)
            return (
              <li key={moment}>
                <button
                  className="journal__ligne"
                  type="button"
                  onClick={() =>
                    setPanneau({ mode: 'repas', moment, ...(repas ? { repas } : {}) })
                  }
                >
                  <span className="journal__moment">{LIBELLE_MOMENT[moment]}</span>
                  <span className={repas ? 'journal__resume' : 'journal__vide discret'}>
                    {repas ? resumer(repas) : 'à noter'}
                  </span>
                </button>
              </li>
            )
          })}

          {collations.map((collation) => (
            <li key={collation.id}>
              <button
                className="journal__ligne"
                type="button"
                onClick={() =>
                  setPanneau({ mode: 'repas', moment: 'collation', repas: collation })
                }
              >
                <span className="journal__moment">Collation</span>
                <span className="journal__resume">{resumer(collation)}</span>
              </button>
            </li>
          ))}
        </ul>

        <button
          className="bouton bouton--principal"
          type="button"
          style={{ marginTop: 16 }}
          onClick={() => setPanneau({ mode: 'repas', moment: prochain })}
        >
          {prochain === 'collation'
            ? 'Ajouter une collation'
            : 'Noter le ' + LIBELLE_MOMENT[prochain].toLowerCase()}
        </button>
      </section>

      <section className="carte">
        <h2>Repères du jour</h2>
        <ul className="liste-nue reperes">
          {vue.reperes.map((repere) => (
            <li key={repere.id} className={repere.applicable ? '' : 'repere--hors-jeu'}>
              <span className={'repere__marque' + (repere.tenu ? ' repere__marque--tenu' : '')}>
                {repere.tenu ? <Icone nom="aujourdhui" taille={17} /> : null}
              </span>
              <span className="repere__libelle">{repere.libelle}</span>
              <span className="discret repere__etat">
                {!repere.applicable ? 'rien de noté' : repere.tenu ? 'tenu' : 'pas encore'}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section className="carte">
        <h2>Régularité de la semaine</h2>
        <div className="rangee-chiffres" style={{ background: 'transparent', padding: 0 }}>
          <div>
            <p className="chiffre">
              {vue.score.joursRenseignes}
              <span className="discret">/7</span>
            </p>
            <p className="etiquette">jours notés</p>
          </div>
          <div>
            <p className="chiffre">{vue.score.joursTenus}</p>
            <p className="etiquette">
              jour{vue.score.joursTenus > 1 ? 's' : ''} tenu
              {vue.score.joursTenus > 1 ? 's' : ''}
            </p>
          </div>
        </div>
        <p className="discret" style={{ marginTop: 14, fontSize: '0.9rem' }}>
          {vue.score.atteint
            ? 'Objectif de régularité atteint : le journal est tenu ' +
              String(vue.score.objectifJours) +
              ' jours ou plus.'
            : 'Objectif : noter le journal au moins ' +
              String(vue.score.objectifJours) +
              ' jours par semaine.'}
        </p>
      </section>

      {!vue.masquerPoids && (
        <section className="carte">
          <h2>Poids et tour de taille</h2>

          {vue.tendancePoids.nombreDeMesures === 0 ? (
            <p className="discret">
              Rien de noté pour l’instant. Une pesée par semaine suffit : c’est la tendance qui
              compte, pas le chiffre du jour.
            </p>
          ) : (
            <>
              <Courbe
                titre="Poids, tendance"
                unite="kg"
                points={vue.tendancePoids.points.map((point, index) => ({
                  semaine: index + 1,
                  valeur: point.valeur,
                }))}
              />
              {vue.tendancePoids.variation !== undefined && (
                <p className="discret" style={{ marginTop: 10, fontSize: '0.9rem' }}>
                  {vue.tendancePoids.variation === 0
                    ? 'Stable depuis la première mesure.'
                    : (vue.tendancePoids.variation > 0 ? '+' : '') +
                      String(vue.tendancePoids.variation) +
                      ' kg depuis la première mesure, en moyenne glissante.'}
                </p>
              )}

              {vue.tendanceTaille.nombreDeMesures > 0 && (
                <div style={{ marginTop: 20 }}>
                  <Courbe
                    titre="Tour de taille, tendance"
                    unite="cm"
                    points={vue.tendanceTaille.points.map((point, index) => ({
                      semaine: index + 1,
                      valeur: point.valeur,
                    }))}
                  />
                </div>
              )}
            </>
          )}

          <div className="rangee-boutons" style={{ marginTop: 16 }}>
            <button
              className="bouton bouton--secondaire"
              type="button"
              onClick={() => setPanneau({ mode: 'mesure' })}
            >
              Noter une mesure
            </button>
          </div>
        </section>
      )}
    </main>
  )
}

function resumer(repas: Repas): string {
  if (repas.description.trim() !== '') return repas.description

  const morceaux: string[] = []
  if (repas.bilanRapide.legumes) morceaux.push('légumes')
  if (repas.bilanRapide.proteines) morceaux.push('protéines')
  if (repas.bilanRapide.boissonSucree) morceaux.push('boisson sucrée')
  if (repas.bilanRapide.copieux) morceaux.push('copieux')

  return morceaux.length > 0 ? morceaux.join(', ') : 'noté'
}

function LigneEau({ vue }: { vue: VueAlimentation }) {
  const bus = vue.hydratation?.verres ?? 0
  const objectif = vue.hydratation?.objectif ?? vue.objectifVerres

  return (
    <div className="ligne">
      <span className="ligne__texte">
        Eau · <strong className="chiffre">{bus}</strong>{' '}
        <span className="discret">sur {objectif} verres</span>
      </span>
      <button
        className="bouton bouton--icone"
        type="button"
        aria-label="Retirer un verre d’eau"
        disabled={bus === 0}
        onClick={() => void depots.hydratation.ajouter(vue.date, -1, objectif)}
      >
        −
      </button>
      <button
        className="bouton bouton--icone"
        type="button"
        aria-label="Ajouter un verre d’eau"
        onClick={() => void depots.hydratation.ajouter(vue.date, 1, objectif)}
      >
        <Icone nom="plus" taille={20} />
      </button>
    </div>
  )
}
