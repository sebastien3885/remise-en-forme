/**
 * Sauvegarde et restauration (chapitre 9).
 *
 * « L'export JSON régulier sert de sauvegarde » : c'est le seul filet de
 * l'application, puisque effacer les données de Chrome les supprimerait. Le
 * bouton d'export est donc le premier de la carte, et le texte le dit.
 *
 * L'import **remplace tout**. Il passe par un aperçu — ce que contient le
 * fichier, et depuis quand — puis une confirmation. On ne restaure pas une
 * sauvegarde par mégarde.
 */
import { useState } from 'react'

import {
  analyserTexteSauvegarde,
  apercuDeLaSauvegarde,
  nomDeFichier,
  type ApercuSauvegarde,
} from '../../domaine/sauvegarde/sauvegarde'
import type { Sauvegarde as DonneesSauvegarde } from '../../domaine/sauvegarde/schema'
import type { ProblemeDeFormat } from '../../domaine/erreurs-zod'
import {
  exporterCsvDesSeances,
  exporterCsvDuJournal,
  exporterEnTexte,
  importerTout,
} from '../../stockage/sauvegarde'
import { formaterDateLongue } from '../libelles'

/** Propose le fichier au téléchargement, sans rien envoyer nulle part. */
function telecharger(nom: string, contenu: string, type: string): void {
  const url = URL.createObjectURL(new Blob([contenu], { type }))
  const lien = document.createElement('a')
  lien.href = url
  lien.download = nom
  document.body.append(lien)
  lien.click()
  lien.remove()
  URL.revokeObjectURL(url)
}

type Etat =
  | { phase: 'repos' }
  | { phase: 'lecture' }
  | { phase: 'erreurs'; erreurs: ProblemeDeFormat[] }
  | { phase: 'apercu'; sauvegarde: DonneesSauvegarde; apercu: ApercuSauvegarde }
  | { phase: 'restaure'; message: string }

export function Sauvegarde() {
  const [etat, setEtat] = useState<Etat>({ phase: 'repos' })
  const [enCours, setEnCours] = useState(false)

  async function exporterJson() {
    setEnCours(true)
    const texte = await exporterEnTexte()
    const exporteeLe = (JSON.parse(texte) as { exporteeLe: string }).exporteeLe
    telecharger(nomDeFichier(exporteeLe), texte, 'application/json')
    setEnCours(false)
  }

  async function exporterCsv(quoi: 'seances' | 'journal') {
    setEnCours(true)
    const texte =
      quoi === 'seances' ? await exporterCsvDesSeances() : await exporterCsvDuJournal()
    telecharger('remise-en-forme-' + quoi + '.csv', texte, 'text/csv;charset=utf-8')
    setEnCours(false)
  }

  async function choisirFichier(fichier: File) {
    setEtat({ phase: 'lecture' })
    const analyse = analyserTexteSauvegarde(await fichier.text())

    if (!analyse.valide) {
      setEtat({ phase: 'erreurs', erreurs: analyse.erreurs })
      return
    }
    setEtat({
      phase: 'apercu',
      sauvegarde: analyse.sauvegarde,
      apercu: apercuDeLaSauvegarde(analyse.sauvegarde),
    })
  }

  async function restaurer(sauvegarde: DonneesSauvegarde) {
    setEnCours(true)
    const resultat = await importerTout(sauvegarde)
    setEnCours(false)
    setEtat({
      phase: 'restaure',
      message:
        String(resultat.exercices) +
        ' exercices, ' +
        String(resultat.seancesPrevues) +
        ' séances prévues et ' +
        String(resultat.seancesRealisees) +
        ' séances réalisées restaurées.',
    })
  }

  return (
    <section className="carte">
      <h2>Sauvegarde</h2>
      <p className="discret" style={{ fontSize: '0.92rem' }}>
        Vos données vivent dans le navigateur de ce téléphone. Effacer les données du site les
        supprimerait : exportez ce fichier de temps en temps et rangez-le ailleurs.
      </p>

      <div className="rangee-boutons" style={{ marginTop: 16 }}>
        <button
          className="bouton"
          type="button"
          disabled={enCours}
          onClick={() => void exporterJson()}
        >
          Exporter mes données
        </button>
      </div>

      <div className="rangee-boutons" style={{ marginTop: 10 }}>
        <button
          className="bouton bouton--secondaire"
          type="button"
          disabled={enCours}
          onClick={() => void exporterCsv('seances')}
        >
          Séances en CSV
        </button>
        <button
          className="bouton bouton--secondaire"
          type="button"
          disabled={enCours}
          onClick={() => void exporterCsv('journal')}
        >
          Journal en CSV
        </button>
      </div>

      <div className="bloc">
        <h3 style={{ marginTop: 0 }}>Restaurer</h3>
        <div className="rangee-boutons">
          <label className="bouton bouton--secondaire bouton--fichier">
            Choisir une sauvegarde
            <input
              type="file"
              accept="application/json,.json"
              onChange={(evenement) => {
                const fichier = evenement.target.files?.[0]
                if (fichier) void choisirFichier(fichier)
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
          <>
            <p style={{ marginTop: 14, color: 'var(--alerte)' }}>
              Cette sauvegarde n’a pas pu être lue, rien n’a été touché.
            </p>
            <ul className="liste-nue erreurs" style={{ marginTop: 10 }}>
              {etat.erreurs.map((erreur, index) => (
                <li key={String(index) + erreur.chemin}>
                  <code>{erreur.chemin}</code> — {erreur.message}
                </li>
              ))}
            </ul>
          </>
        )}

        {etat.phase === 'apercu' && (
          <>
            <p className="surtitre" style={{ marginTop: 16 }}>
              Aperçu
            </p>
            <dl className="donnees" style={{ marginTop: 10 }}>
              <dt>Exportée le</dt>
              <dd>{formaterDateLongue(etat.apercu.exporteeLe.slice(0, 10))}</dd>
              <dt>Séances réalisées</dt>
              <dd>
                {etat.apercu.seancesRealisees}
                {etat.apercu.premiereSeance && (
                  <span className="discret">
                    {' '}
                    · du {etat.apercu.premiereSeance} au {etat.apercu.derniereSeance}
                  </span>
                )}
              </dd>
              <dt>Repas</dt>
              <dd>
                {etat.apercu.repas}
                {etat.apercu.photos > 0 && (
                  <span className="discret"> · {etat.apercu.photos} avec photo</span>
                )}
              </dd>
              <dt>Exercices</dt>
              <dd>{etat.apercu.exercices}</dd>
              <dt>Mesures</dt>
              <dd>{etat.apercu.mesures}</dd>
            </dl>

            <div className="carte carte--alerte" style={{ marginTop: 16 }}>
              <p>
                Restaurer <strong>remplace toutes vos données actuelles</strong>. Rien n’est
                fusionné. Exportez-les d’abord si vous tenez à les garder.
              </p>
              <div className="rangee-boutons" style={{ marginTop: 14 }}>
                <button
                  className="bouton bouton--secondaire"
                  type="button"
                  disabled={enCours}
                  onClick={() => setEtat({ phase: 'repos' })}
                >
                  Annuler
                </button>
                <button
                  className="bouton"
                  type="button"
                  disabled={enCours}
                  onClick={() => void restaurer(etat.sauvegarde)}
                >
                  {enCours ? 'Restauration…' : 'Remplacer mes données'}
                </button>
              </div>
            </div>
          </>
        )}

        {etat.phase === 'restaure' && <p className="succes">Sauvegarde restaurée. {etat.message}</p>}
      </div>
    </section>
  )
}
