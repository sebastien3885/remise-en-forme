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
import { GenerationProgramme } from '../composants/GenerationProgramme'
import { ImportDePlan } from '../composants/ImportDePlan'
import { Installation } from '../composants/Installation'
import { PreferencesEtDonnees } from '../composants/PreferencesEtDonnees'
import { Rappels } from '../composants/Rappels'
import { Sauvegarde } from '../composants/Sauvegarde'

export function Reglages() {
  const profil = useLiveQuery(() => depots.profil.lire())
  const nombreExercices = useLiveQuery(() => depots.exercices.compter())
  const programme = useLiveQuery(() => depots.programmes.actif())

  // Les séances traversent les versions de programme : une révision en crée
  // une nouvelle et laisse les séances passées à l'ancienne. On compte donc
  // ce qui est visible au calendrier, pas ce qui appartient à la version
  // active.
  const nombreSeances = useLiveQuery(async () => {
    const actif = await depots.programmes.actif()
    if (!actif) return 0
    const toutes = await depots.seances.prevues.parPlage(actif.dateDebut, actif.dateFin)
    return toutes.filter(
      (seance) => seance.statut !== 'annulee' && seance.statut !== 'remplacee',
    ).length
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
      <header className="page__entete">
        <p className="surtitre">Réglages</p>
        <h1>Remise en forme</h1>
        <p className="discret">
          Profil, bibliothèque d’exercices, programme et import de plans. Les données restent
          sur cet appareil.
        </p>
      </header>

      {profil && !profil.avertissementSanteAccepte && <AvertissementSante />}

      <div className="rangee-chiffres">
        <div>
          <p className="chiffre">{nombreExercices ?? 0}</p>
          <p className="etiquette">exercices</p>
        </div>
        <div>
          <p className="chiffre">{nombreSeances ?? 0}</p>
          <p className="etiquette">séances au calendrier</p>
        </div>
        <div>
          <p className="chiffre">{programme ? programme.version : '—'}</p>
          <p className="etiquette">version du programme</p>
        </div>
      </div>

      <section className="carte">
        <h2>Profil</h2>
        {profil ? (
          <dl className="donnees">
            <dt>Début du programme</dt>
            <dd>{profil.dateDebut}</dd>

            <dt>Matériel</dt>
            <dd>{profil.materiel.map((materiel) => LIBELLE_MATERIEL[materiel]).join(', ')}</dd>

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

            {/* Les objectifs vivent dans l'onglet Progrès, avec leur jauge et
                leur éditeur. En recopier la liste ici donnerait deux endroits
                à tenir à jour, et un doute sur lequel fait foi. */}
            <dt>Objectifs</dt>
            <dd>
              {profil.objectifs.length === 0
                ? 'aucun · à définir dans l’onglet Progrès'
                : String(profil.objectifs.length) +
                  (profil.objectifs.length > 1 ? ' objectifs' : ' objectif') +
                  ' · avancement et modification dans l’onglet Progrès'}
            </dd>
          </dl>
        ) : (
          <p className="discret">Profil en cours de création…</p>
        )}
      </section>

      {ecartes && ecartes.length > 0 && (
        <section className="carte">
          <h2>Exercices écartés</h2>
          <p className="discret" style={{ fontSize: '0.92rem' }}>
            Ce sont des précautions, pas un avis médical. Elles se lèvent dans le profil.
          </p>
          <ul className="liste-nue liste-ecartes" style={{ marginTop: 16 }}>
            {ecartes.map((ecarte) => (
              <li key={ecarte.id}>
                <strong>{ecarte.nom}</strong>
                <span className="discret">{ecarte.raisons}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="carte">
        <h2>Programme</h2>
        {programme ? (
          <dl className="donnees">
            <dt>Période</dt>
            <dd>
              du {programme.dateDebut} au {programme.dateFin}
            </dd>
            <dt>Motif</dt>
            <dd>{programme.motifRevision}</dd>
          </dl>
        ) : (
          <p className="discret">
            Aucun programme pour l’instant. Générez les douze semaines du cahier des charges,
            ou importez un plan préparé sur l’ordinateur.
          </p>
        )}

        <GenerationProgramme aDejaUnProgramme={programme !== undefined} />
      </section>

      <ImportDePlan />

      <Rappels />

      <Installation />

      <Sauvegarde />

      {profil && <PreferencesEtDonnees masquerPoids={profil.masquerPoids} />}

      <footer className="discret pied">
        Les données restent sur cet appareil. Aucun compte, aucun serveur, aucun suivi.
      </footer>
    </main>
  )
}
