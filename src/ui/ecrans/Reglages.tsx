/**
 * Écran Réglages (chapitre 8), réduit à ce dont l'étape 1 a besoin.
 *
 * Il sert à vérifier à la main le critère d'acceptation de l'étape 1 : les
 * données survivent à un rechargement, et l'application fonctionne hors ligne.
 * Les quatre autres écrans — Aujourd'hui, Semaine, Progrès, Alimentation —
 * arrivent aux étapes suivantes, avec la barre de navigation du bas.
 */
import { useLiveQuery } from 'dexie-react-hooks'

import { LIBELLE_IMPACT_GENOU, LIBELLE_MATERIEL } from '../../domaine/entites'
import { contexteDepuisProfil, exercicesEcartes } from '../../domaine/profil/precautions'
import { depots } from '../../stockage'
import { AvertissementSante } from '../composants/AvertissementSante'
import { ImportDePlan } from '../composants/ImportDePlan'

export function Reglages() {
  const profil = useLiveQuery(() => depots.profil.lire())
  const nombreExercices = useLiveQuery(() => depots.exercices.compter())
  const programme = useLiveQuery(() => depots.programmes.actif())

  const nombreSeances = useLiveQuery(async () => {
    const actif = await depots.programmes.actif()
    if (!actif) return 0
    return (await depots.seances.prevues.parProgramme(actif.id)).length
  })

  const ecartes = useLiveQuery(async () => {
    const enregistre = await depots.profil.lire()
    if (!enregistre) return []

    const bibliotheque = await depots.exercices.tous()
    const nomParId = new Map(bibliotheque.map((exercice) => [exercice.id, exercice.nom]))

    return exercicesEcartes(bibliotheque, contexteDepuisProfil(enregistre)).map((verdict) => ({
      id: verdict.exerciceId,
      nom: nomParId.get(verdict.exerciceId) ?? verdict.exerciceId,
      raisons: verdict.exclusions.map((exclusion) => exclusion.explication).join(' '),
    }))
  })

  return (
    <main className="page">
      <header>
        <h1>Remise en forme</h1>
        <p className="discret">
          Étape 1 : socle, stockage local, bibliothèque, profil et import de plans. Les écrans
          Aujourd’hui, Semaine, Progrès et Alimentation arrivent ensuite.
        </p>
      </header>

      {profil && !profil.avertissementSanteAccepte && <AvertissementSante />}

      <section className="carte">
        <h2>Profil</h2>
        {profil ? (
          <dl className="donnees">
            <dt>Début du programme</dt>
            <dd>{profil.dateDebut}</dd>

            <dt>Matériel</dt>
            <dd>
              {profil.materiel.map((materiel) => LIBELLE_MATERIEL[materiel]).join(', ')}
            </dd>

            <dt>Antécédents</dt>
            <dd>
              {profil.antecedents.length === 0
                ? 'aucun'
                : profil.antecedents.map((antecedent) => antecedent.description).join(' ')}
            </dd>

            <dt>Impact genou toléré</dt>
            <dd>
              au plus « {LIBELLE_IMPACT_GENOU[profil.precautions.impactGenouMaximal]} »
              {profil.precautions.exclureFlexionMarquee
                ? ', flexions marquées exclues'
                : ', flexions marquées signalées'}
            </dd>

            <dt>Objectifs</dt>
            <dd>
              {profil.objectifs.length === 0
                ? 'aucun'
                : profil.objectifs
                    .map(
                      (objectif) =>
                        objectif.libelle + ' (' + String(objectif.cible) + ' ' + objectif.unite + ')',
                    )
                    .join(' · ')}
            </dd>
          </dl>
        ) : (
          <p className="discret">Profil en cours de création…</p>
        )}
      </section>

      <section className="carte">
        <h2>Bibliothèque</h2>
        <p>
          <strong>{nombreExercices ?? 0}</strong> exercices enregistrés sur l’appareil.
        </p>

        {ecartes && ecartes.length > 0 && (
          <>
            <h3>Écartés par les précautions</h3>
            <ul className="liste-ecartes">
              {ecartes.map((ecarte) => (
                <li key={ecarte.id}>
                  <strong>{ecarte.nom}</strong>
                  <span className="discret">{ecarte.raisons}</span>
                </li>
              ))}
            </ul>
          </>
        )}
      </section>

      <section className="carte">
        <h2>Programme</h2>
        {programme ? (
          <dl className="donnees">
            <dt>Version</dt>
            <dd>{programme.version}</dd>
            <dt>Période</dt>
            <dd>
              du {programme.dateDebut} au {programme.dateFin}
            </dd>
            <dt>Motif</dt>
            <dd>{programme.motifRevision}</dd>
            <dt>Séances prévues</dt>
            <dd>{nombreSeances ?? 0}</dd>
          </dl>
        ) : (
          <p className="discret">
            Aucun programme pour l’instant. Importez un plan pour en poser un.
          </p>
        )}
      </section>

      <ImportDePlan />

      <footer className="discret pied">
        Les données restent sur cet appareil. L’export JSON de sauvegarde arrive à l’étape 5 :
        d’ici là, effacer les données du navigateur les supprimerait.
      </footer>
    </main>
  )
}
