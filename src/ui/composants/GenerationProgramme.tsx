/**
 * Génération du programme initial depuis les réglages.
 *
 * Le chapitre 8 veut que le premier lancement se termine par une validation
 * de l'utilisateur : rien ne se génère tout seul, c'est ce bouton qui
 * déclenche les douze semaines.
 *
 * Régénérer ne détruit rien — l'ancienne version et ses séances restent en
 * base (chapitre 7) — donc pas de confirmation à franchir, mais la phrase
 * sous le bouton le dit.
 */
import { useState } from 'react'

import { genererEtInstallerProgramme } from '../../stockage/generer-programme'

type Etat =
  | { phase: 'attente' }
  | { phase: 'en-cours' }
  | { phase: 'fait'; seances: number; avertissements: string[] }
  | { phase: 'refus'; raison: string }

export function GenerationProgramme({ aDejaUnProgramme }: { aDejaUnProgramme: boolean }) {
  const [etat, setEtat] = useState<Etat>({ phase: 'attente' })

  async function generer() {
    setEtat({ phase: 'en-cours' })
    const resultat = await genererEtInstallerProgramme()

    if (!resultat.genere) {
      setEtat({ phase: 'refus', raison: resultat.raison })
      return
    }

    setEtat({
      phase: 'fait',
      seances: resultat.resultat.seances.filter((seance) => seance.type !== 'repos').length,
      avertissements: resultat.resultat.avertissements,
    })
  }

  return (
    <>
      <div className="rangee-boutons" style={{ marginTop: 16 }}>
        <button
          className={aDejaUnProgramme ? 'bouton bouton--secondaire' : 'bouton'}
          type="button"
          disabled={etat.phase === 'en-cours'}
          onClick={() => void generer()}
        >
          {etat.phase === 'en-cours'
            ? 'Génération…'
            : aDejaUnProgramme
              ? 'Générer une nouvelle version'
              : 'Générer 12 semaines'}
        </button>
      </div>

      {aDejaUnProgramme && (
        <p className="discret" style={{ marginTop: 10, fontSize: '0.9rem' }}>
          La version en cours sera désactivée, pas effacée : ses séances restent consultables.
        </p>
      )}

      {etat.phase === 'refus' && (
        <p style={{ marginTop: 14, color: 'var(--alerte)' }}>
          Programme non généré. {etat.raison}
        </p>
      )}

      {etat.phase === 'fait' && (
        <>
          <p className="succes">
            Programme généré : {etat.seances} séances sur 12 semaines.
          </p>
          {etat.avertissements.length > 0 && (
            <ul className="liste-nue avertissements" style={{ marginTop: 12 }}>
              {etat.avertissements.map((avertissement) => (
                <li key={avertissement}>{avertissement}</li>
              ))}
            </ul>
          )}
        </>
      )}
    </>
  )
}
