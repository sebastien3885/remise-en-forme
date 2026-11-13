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
import type { RecordExercice } from '../../domaine/progression/historique'
import {
  accepterBilan,
  genererEtEnregistrerBilan,
  refuserBilan,
} from '../../stockage/bilan-hebdo'
import { Courbe } from '../composants/Courbe'
import { Objectifs } from '../composants/Objectifs'
import { Regularite } from '../composants/Regularite'
import { PanneauModification } from '../composants/PanneauModification'
import { useHistorique } from '../hooks/useHistorique'
import { useProgres, type VueProgres } from '../hooks/useProgres'
import { formaterDateCourte, formaterDateLongue, UNITE_DU_CHAMP } from '../libelles'

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
  const [modification, setModification] = useState(false)

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

              {/* La troisième voie du chapitre 5 est un lien, pas un bouton :
                  à trois boutons, l'un passe à la ligne sur un téléphone et
                  devient le plus gros de l'écran — ce serait « Refuser » qui
                  aurait l'air de l'action principale. */}
              <button
                className="lien-discret"
                type="button"
                style={{ marginTop: 14 }}
                disabled={enCours}
                aria-expanded={modification}
                onClick={() => setModification(!modification)}
              >
                {modification ? 'Fermer' : 'Modifier avant d’appliquer'}
              </button>

              {modification && (
                <PanneauModification
                  bilan={bilan}
                  onDecide={(phrase) => {
                    setMessage(phrase)
                    setModification(false)
                  }}
                  onAnnuler={() => setModification(false)}
                />
              )}

              <p className="discret" style={{ marginTop: 12, fontSize: '0.9rem' }}>
                Accepter crée une version du programme et corrige les séances à venir.
                L’ancienne version est conservée.
              </p>
            </>
          ) : (
            <p className="discret" style={{ marginTop: 18, fontSize: '0.92rem' }}>
              {bilan.decision === 'accepte'
                ? 'Ajustements appliqués aux séances à venir.'
                : bilan.decision === 'modifie'
                  ? 'Version retenue à la main, appliquée aux séances à venir.'
                  : 'Ajustements refusés : le programme n’a pas bougé.'}
            </p>
          )}
        </section>
      )}

      {/* Le chapitre 6 veut la régularité du journal « à côté du bilan
          sportif » : les deux côtés de la même semaine, au même endroit. */}
      <Regularite score={vue.scoreAlimentaire} />

      <Objectifs />

      <Historique />
    </main>
  )
}

/**
 * Série en cours, récapitulatif hebdomadaire et fiche par exercice
 * (chapitre 4, « Consultation »).
 */
function Historique() {
  const vue = useHistorique()
  if (!vue || !vue.programme) return null

  const pointsDeTaux = vue.semaines.map((semaine) => ({
    semaine: semaine.semaine,
    valeur: Math.round(semaine.tauxRealisation * 100),
  }))

  return (
    <>
      <section className="carte serie">
        <p className="chiffre chiffre--geant">{vue.serie}</p>
        <p className="discret">
          {vue.serie === 0
            ? 'Aucune semaine tenue d’affilée pour l’instant. Une semaine compte dès 80 % des séances faites.'
            : vue.serie === 1
              ? 'semaine tenue. Une semaine compte dès 80 % des séances faites.'
              : 'semaines tenues d’affilée, à 80 % des séances ou plus.'}
        </p>
      </section>

      {pointsDeTaux.length > 0 && (
        <section className="carte">
          <h2>Récapitulatif</h2>
          <Courbe
            titre="Séances réalisées"
            unite="%"
            points={pointsDeTaux}
            reference={{ valeur: 80, libelle: 'objectif 80 %' }}
          />
        </section>
      )}

      {vue.records.length > 0 && (
        <section className="carte">
          <h2>Par exercice</h2>
          <div className="fiches">
            {vue.records.slice(0, 4).map((record) => (
              <FicheExercice key={record.exerciceId} record={record} />
            ))}
          </div>

          {vue.records.length > 4 && (
            <details className="repli">
              <summary>Voir les {vue.records.length - 4} autres exercices</summary>
              <div className="repli__contenu fiches">
                {vue.records.slice(4).map((record) => (
                  <FicheExercice key={record.exerciceId} record={record} />
                ))}
              </div>
            </details>
          )}
        </section>
      )}
    </>
  )
}

function FicheExercice({ record }: { record: RecordExercice }) {
  const unite = UNITE_DU_CHAMP[record.champ]

  return (
    <article className="fiche">
      <Courbe titre={record.nom} unite={unite} points={record.points} />
      <p className="fiche__record discret">
        Record : <strong className="chiffre">{record.meilleur}</strong> {unite} le{' '}
        {formaterDateLongue(record.dateDuMeilleur)} · {record.nombreDeSeances} séance
        {record.nombreDeSeances > 1 ? 's' : ''}
      </p>
    </article>
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
