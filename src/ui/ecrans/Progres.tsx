/**
 * Écran « Progrès » (chapitre 8), partie bilan hebdomadaire.
 *
 * Le chapitre 5 exige que l'application **explique chaque changement**. Les
 * règles déclenchées sont donc affichées avec leur phrase en clair — « +10 %
 * car 3 séances sur 3 réalisées, effort 5/10 » — avant les deux boutons qui
 * décident. Rien ne s'applique tant que l'utilisateur n'a pas tranché.
 */
import { useState } from 'react'

import { ajouterJours, aujourdhui } from '../../domaine/dates'
import { RESSENTIS_CHARGE, type RessentiCharge } from '../../domaine/entites'
import {
  accepterBilan,
  genererEtEnregistrerBilan,
  refuserBilan,
} from '../../stockage/bilan-hebdo'
import { useProgres, type VueProgres } from '../hooks/useProgres'
import { formaterDateCourte } from '../libelles'

const LIBELLE_RESSENTI: Record<RessentiCharge, string> = {
  'trop-facile': 'Trop facile',
  'juste-bien': 'Juste bien',
  'trop-dur': 'Trop dur',
}

const LIBELLE_DECISION: Record<string, string> = {
  'en-attente': 'En attente',
  accepte: 'Accepté',
  refuse: 'Refusé',
  modifie: 'Modifié',
}

export function Progres() {
  const [reference, setReference] = useState(() => aujourdhui())
  const vue = useProgres(reference)
  const [ressenti, setRessenti] = useState<RessentiCharge | null>(null)
  const [message, setMessage] = useState<string | undefined>(undefined)
  const [enCours, setEnCours] = useState(false)

  if (!vue) {
    return (
      <main className="page">
        <p className="discret">Chargement…</p>
      </main>
    )
  }

  async function faireLeBilan() {
    if (!vue) return
    setEnCours(true)
    setMessage(undefined)
    const resultat = await genererEtEnregistrerBilan(vue.debut, ressenti)
    setEnCours(false)
    if (!resultat.genere) setMessage(resultat.raison)
  }

  async function accepter(bilanId: string) {
    setEnCours(true)
    const resultat = await accepterBilan(bilanId)
    setEnCours(false)
    setMessage(
      resultat.applique
        ? 'Ajustements appliqués : ' +
          String(resultat.seancesAjustees) +
          ' séances à venir mises à jour, version ' +
          String(resultat.versionCreee) +
          ' du programme.'
        : resultat.raison,
    )
  }

  async function refuser(bilanId: string) {
    setEnCours(true)
    const resultat = await refuserBilan(bilanId)
    setEnCours(false)
    setMessage(
      resultat.applique ? 'Ajustements refusés : le programme ne bouge pas.' : resultat.raison,
    )
  }

  const { bilan } = vue

  return (
    <main className="page">
      <header className="page__entete">
        <div className="entete-jour">
          <p className="surtitre">
            {vue.numero > 0 ? 'Semaine ' + String(vue.numero) : 'Semaine'}
          </p>
          {bilan && (
            <p className="surtitre entete-jour__compteur">
              {LIBELLE_DECISION[bilan.decision] ?? bilan.decision}
            </p>
          )}
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
      </header>

      {vue.bilanEnAttenteAilleurs && (
        <button
          className="lien-discret"
          type="button"
          onClick={() => setReference(vue.bilanEnAttenteAilleurs!.debut)}
        >
          Le bilan de la semaine du {formaterDateCourte(vue.bilanEnAttenteAilleurs.debut)}{' '}
          attend votre décision
        </button>
      )}

      <Chiffres vue={vue} />

      {message && <p className="succes">{message}</p>}

      {!bilan && (
        <section className="carte">
          <h2>Faire le bilan</h2>
          {!vue.semaineTerminee && (
            <p className="discret" style={{ fontSize: '0.92rem' }}>
              La semaine n’est pas finie. Le bilan du dimanche soir sera plus juste.
            </p>
          )}

          <fieldset className="echelle" style={{ marginTop: 16 }}>
            <legend>
              Comment trouves-tu la charge ? <span className="discret">· facultatif</span>
            </legend>
            <div className="chips">
              {RESSENTIS_CHARGE.map((candidat) => (
                <button
                  key={candidat}
                  type="button"
                  aria-pressed={ressenti === candidat}
                  onClick={() => setRessenti(ressenti === candidat ? null : candidat)}
                >
                  {LIBELLE_RESSENTI[candidat]}
                </button>
              ))}
            </div>
          </fieldset>

          <button
            className="bouton"
            type="button"
            disabled={enCours || !vue.programme}
            onClick={() => void faireLeBilan()}
          >
            {enCours ? 'Calcul…' : 'Faire le bilan de la semaine'}
          </button>

          {!vue.programme && (
            <p className="discret" style={{ marginTop: 12 }}>
              Il faut un programme en cours pour en faire le bilan.
            </p>
          )}
        </section>
      )}

      {bilan && (
        <section className="carte">
          <h2>Ce que dit la semaine</h2>

          <ul className="liste-nue regles">
            {bilan.reglesAppliquees.map((regle, index) => (
              <li key={regle.cle + String(index)}>
                <p className="regles__titre">{regle.libelle}</p>
                <p className="regles__explication">{regle.explication}</p>
              </li>
            ))}
          </ul>

          {bilan.ajustements.some((ajustement) => ajustement.avisMedicalSuggere) && (
            <p className="avertissement-sante" style={{ marginTop: 18 }}>
              Une douleur s’est répétée. Parlez-en à un médecin avant de reprendre cet
              exercice.
            </p>
          )}

          {bilan.decision === 'en-attente' ? (
            <>
              <div className="rangee-boutons" style={{ marginTop: 20 }}>
                <button
                  className="bouton"
                  type="button"
                  disabled={enCours}
                  onClick={() => void accepter(bilan.id)}
                >
                  Accepter
                </button>
                <button
                  className="bouton bouton--secondaire"
                  type="button"
                  disabled={enCours}
                  onClick={() => void refuser(bilan.id)}
                >
                  Refuser
                </button>
              </div>
              <p className="discret" style={{ marginTop: 12, fontSize: '0.9rem' }}>
                Accepter crée une version du programme et corrige les séances à venir.
                L’ancienne version est conservée.
              </p>
            </>
          ) : (
            <p className="discret" style={{ marginTop: 18, fontSize: '0.92rem' }}>
              {bilan.decision === 'accepte'
                ? 'Ajustements appliqués aux séances à venir.'
                : 'Ajustements refusés : le programme n’a pas bougé.'}
            </p>
          )}
        </section>
      )}
    </main>
  )
}

function Chiffres({ vue }: { vue: VueProgres }) {
  const { statistiques } = vue
  const taux = Math.round(statistiques.tauxRealisation * 100)

  return (
    <div className="rangee-chiffres">
      <div>
        <p className="chiffre">
          {statistiques.seancesFaites + statistiques.seancesPartielles}
          <span className="discret">/{statistiques.seancesPrevues}</span>
        </p>
        <p className="etiquette">séances</p>
      </div>
      <div>
        <p className="chiffre">
          {taux}
          <span className="discret"> %</span>
        </p>
        <p className="etiquette">réalisé</p>
      </div>
      <div>
        <p className="chiffre">
          {statistiques.effortMoyen === null
            ? '—'
            : Math.round(statistiques.effortMoyen * 10) / 10}
          {statistiques.effortMoyen !== null && <span className="discret">/10</span>}
        </p>
        <p className="etiquette">effort moyen</p>
      </div>
    </div>
  )
}
