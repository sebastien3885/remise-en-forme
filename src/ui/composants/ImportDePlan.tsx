/**
 * Import d'un plan d'exercice (chapitre 9).
 *
 * Le parcours est celui du cahier des charges, dans cet ordre : choisir le
 * fichier, contrôler le format, montrer un aperçu, puis **seulement ensuite**
 * remplacer ou fusionner. Rien n'est écrit avant le clic final, et un plan qui
 * comporte une erreur ne propose aucun bouton.
 *
 * Toute la logique vit dans le domaine et la couche stockage ; ce composant ne
 * fait que l'enchaîner et l'afficher.
 */
import { useState } from 'react'

import {
  analyserTextePlan,
  type ApercuPlan,
  type PlanImporte,
  type ProblemePlan,
} from '../../domaine/plans'
import { appliquerPlan, preparerApercu } from '../../stockage/appliquer-plan'

type Etat =
  | { phase: 'attente' }
  | { phase: 'lecture' }
  | { phase: 'erreurs'; erreurs: ProblemePlan[] }
  | { phase: 'apercu'; plan: PlanImporte; apercu: ApercuPlan }
  | { phase: 'applique'; message: string }

export function ImportDePlan() {
  const [etat, setEtat] = useState<Etat>({ phase: 'attente' })

  async function choisirFichier(fichier: File) {
    setEtat({ phase: 'lecture' })

    const analyse = analyserTextePlan(await fichier.text())
    if (!analyse.valide) {
      setEtat({ phase: 'erreurs', erreurs: analyse.erreurs })
      return
    }

    const apercu = await preparerApercu(analyse.plan)
    if (!apercu.applicable) {
      setEtat({ phase: 'erreurs', erreurs: apercu.erreurs })
      return
    }

    setEtat({ phase: 'apercu', plan: analyse.plan, apercu })
  }

  async function appliquer(plan: PlanImporte, mode: 'remplacer' | 'fusionner') {
    const resultat = await appliquerPlan(plan, { mode })

    if (!resultat.applique) {
      setEtat({ phase: 'erreurs', erreurs: resultat.apercu.erreurs })
      return
    }

    setEtat({
      phase: 'applique',
      message:
        String(resultat.seancesEcrites) +
        ' séances posées au calendrier' +
        (resultat.exercicesEcrits > 0
          ? ', ' + String(resultat.exercicesEcrits) + ' exercices ajoutés à la bibliothèque'
          : '') +
        '.',
    })
  }

  return (
    <section className="carte">
      <h2>Importer un plan</h2>
      <p className="discret">
        Un fichier JSON préparé sur l’ordinateur. Le format est décrit dans{' '}
        <code>docs/format-plan.md</code>.
      </p>

      <div className="rangee-boutons" style={{ marginTop: 16 }}>
        <label className="bouton bouton--fichier">
          Choisir un fichier
          <input
            type="file"
            accept="application/json,.json"
            onChange={(evenement) => {
              const fichier = evenement.target.files?.[0]
              if (fichier) void choisirFichier(fichier)
              // Permet de rechoisir le même fichier après une correction.
              evenement.target.value = ''
            }}
          />
        </label>
      </div>

      {etat.phase === 'lecture' && (
        <p className="discret" style={{ marginTop: 14 }}>
          Lecture du fichier…
        </p>
      )}

      {etat.phase === 'erreurs' && (
        <div className="bloc">
          <h3 style={{ marginTop: 0 }}>Le plan n’a pas été importé</h3>
          <ul className="liste-nue erreurs">
            {etat.erreurs.map((erreur, index) => (
              <li key={String(index) + erreur.chemin}>
                <code>{erreur.chemin}</code> — {erreur.message}
              </li>
            ))}
          </ul>
        </div>
      )}

      {etat.phase === 'apercu' && (
        <div className="bloc">
          <p className="surtitre">Aperçu</p>
          <h3 style={{ marginTop: 6, textTransform: 'none', letterSpacing: 0, fontSize: '1.05rem', color: 'var(--texte)' }}>
            {etat.apercu.nom}
          </h3>
          {etat.apercu.description && <p className="discret">{etat.apercu.description}</p>}

          <div className="rangee-chiffres" style={{ margin: '14px 0' }}>
            <div>
              <p className="chiffre">{etat.apercu.nombreSeances}</p>
              <p className="etiquette">séances</p>
            </div>
            <div>
              <p className="chiffre">{etat.apercu.nombreSemaines}</p>
              <p className="etiquette">semaines</p>
            </div>
            <div>
              <p className="chiffre">{etat.apercu.nombreJoursDeRepos}</p>
              <p className="etiquette">
                jour{etat.apercu.nombreJoursDeRepos > 1 ? 's' : ''} de repos
              </p>
            </div>
          </div>

          <dl className="donnees">
            <dt>Période</dt>
            <dd>
              du {etat.apercu.dateDebut} au {etat.apercu.dateFin}
            </dd>
            {etat.apercu.exercicesNouveaux.length > 0 && (
              <>
                <dt>Nouveaux exercices</dt>
                <dd>{etat.apercu.exercicesNouveaux.join(', ')}</dd>
              </>
            )}
            {etat.apercu.exercicesMisAJour.length > 0 && (
              <>
                <dt>Exercices mis à jour</dt>
                <dd>{etat.apercu.exercicesMisAJour.join(', ')}</dd>
              </>
            )}
          </dl>

          {etat.apercu.avertissements.length > 0 && (
            <ul className="liste-nue avertissements" style={{ marginTop: 14 }}>
              {etat.apercu.avertissements.map((avertissement, index) => (
                <li key={String(index)}>{avertissement.message}</li>
              ))}
            </ul>
          )}

          <div className="rangee-boutons" style={{ margin: '16px 0 12px' }}>
            <button
              className="bouton"
              type="button"
              onClick={() => void appliquer(etat.plan, 'remplacer')}
            >
              Remplacer le programme
            </button>
            <button
              className="bouton bouton--secondaire"
              type="button"
              onClick={() => void appliquer(etat.plan, 'fusionner')}
            >
              Fusionner
            </button>
          </div>
          <p className="discret" style={{ fontSize: '0.9rem' }}>
            Remplacer crée une nouvelle version du programme ; l’ancienne et ses séances sont
            conservées.
          </p>
        </div>
      )}

      {etat.phase === 'applique' && <p className="succes">Plan importé. {etat.message}</p>}
    </section>
  )
}
