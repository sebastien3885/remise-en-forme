/**
 * Minuterie travail / repos (chapitres 3 et 9 : elle doit marcher hors ligne).
 *
 * Le décompte se calcule à partir d'un **instant de fin**, jamais en
 * retranchant une seconde à chaque tic. Un onglet mis en veille par Android
 * ralentit les minuteurs : un compteur décrémenté prendrait du retard, alors
 * qu'une soustraction de dates reste juste au réveil.
 *
 * Les phases sans durée — dix squats, huit longueurs — se terminent au doigt.
 * Le téléphone vibre à chaque changement de phase, parce qu'au bord du bassin
 * on ne regarde pas l'écran.
 */
import { useCallback, useEffect, useState } from 'react'

import { formaterChrono, type Phase } from '../../domaine/minuterie/sequence'
import { Icone } from './Icone'

function vibrer(motif: number[]): void {
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    navigator.vibrate(motif)
  }
}

export interface ProprietesMinuterie {
  phases: readonly Phase[]
  onFermer: () => void
}

export function Minuterie({ phases, onFermer }: ProprietesMinuterie) {
  const [index, setIndex] = useState(0)
  const [enMarche, setEnMarche] = useState(false)
  const [finPrevue, setFinPrevue] = useState<number | null>(null)
  const [restant, setRestant] = useState(() => phases[0]?.secondes ?? 0)

  const phase = phases[index]
  const terminee = index >= phases.length
  const minutee = phase?.secondes !== undefined

  const allerA = useCallback(
    (suivant: number, lancer: boolean) => {
      setIndex(suivant)
      const secondes = phases[suivant]?.secondes
      setRestant(secondes ?? 0)
      setEnMarche(lancer && suivant < phases.length)
      setFinPrevue(
        lancer && secondes !== undefined ? Date.now() + secondes * 1000 : null,
      )
    },
    [phases],
  )

  const passerALaSuivante = useCallback(() => {
    vibrer([120, 60, 120])
    allerA(index + 1, true)
  }, [allerA, index])

  useEffect(() => {
    if (!enMarche || finPrevue === null) return

    const tic = setInterval(() => {
      const reste = (finPrevue - Date.now()) / 1000
      if (reste <= 0) passerALaSuivante()
      else setRestant(reste)
    }, 200)

    return () => clearInterval(tic)
  }, [enMarche, finPrevue, passerALaSuivante])

  function basculer() {
    if (!minutee) return
    if (enMarche && finPrevue !== null) {
      setRestant(Math.max(0, (finPrevue - Date.now()) / 1000))
      setFinPrevue(null)
      setEnMarche(false)
      return
    }
    setFinPrevue(Date.now() + restant * 1000)
    setEnMarche(true)
  }

  if (phases.length === 0) {
    return (
      <section className="carte">
        <h2>Rien à minuter</h2>
        <p className="discret">
          Cette séance ne contient ni durée, ni séries à décompter.
        </p>
        <div className="rangee-boutons" style={{ marginTop: 16 }}>
          <button className="bouton bouton--secondaire" type="button" onClick={onFermer}>
            Fermer
          </button>
        </div>
      </section>
    )
  }

  if (terminee) {
    return (
      <section className="carte minuterie minuterie--finie">
        <p className="surtitre">Minuterie</p>
        <h2 style={{ marginTop: 10 }}>Séance terminée</h2>
        <p className="discret">Toutes les phases sont passées.</p>
        <div className="rangee-boutons" style={{ marginTop: 18 }}>
          <button className="bouton" type="button" onClick={onFermer}>
            Revenir à la séance
          </button>
          <button
            className="bouton bouton--secondaire"
            type="button"
            onClick={() => allerA(0, false)}
          >
            Recommencer
          </button>
        </div>
      </section>
    )
  }

  return (
    <section
      className={'carte minuterie' + (phase?.genre === 'repos' ? ' minuterie--repos' : '')}
    >
      <div className="minuterie__entete">
        <p className="surtitre">{phase?.genre === 'repos' ? 'Repos' : 'Travail'}</p>
        <p className="surtitre minuterie__compteur">
          {index + 1} / {phases.length}
        </p>
      </div>

      <h2 style={{ marginTop: 10 }}>{phase?.titre}</h2>
      {phase?.detail && <p className="discret">{phase.detail}</p>}

      <p className="minuterie__chrono">
        {minutee ? (
          <span className="chiffre">{formaterChrono(restant)}</span>
        ) : (
          <span className="chiffre minuterie__libre">à votre rythme</span>
        )}
      </p>

      {minutee ? (
        <button type="button" className="bouton bouton--principal" onClick={basculer}>
          {enMarche ? 'Pause' : restant === (phase?.secondes ?? 0) ? 'Démarrer' : 'Reprendre'}
        </button>
      ) : (
        <button type="button" className="bouton bouton--principal" onClick={passerALaSuivante}>
          Terminé
        </button>
      )}

      <div className="rangee-boutons" style={{ marginTop: 10 }}>
        <button
          className="bouton bouton--secondaire"
          type="button"
          disabled={index === 0}
          onClick={() => allerA(index - 1, false)}
        >
          Précédente
        </button>
        <button
          className="bouton bouton--secondaire"
          type="button"
          onClick={() => allerA(index + 1, false)}
        >
          Passer
        </button>
      </div>

      <div className="rangee-boutons" style={{ marginTop: 10 }}>
        <button className="bouton bouton--secondaire" type="button" onClick={onFermer}>
          <Icone nom="aujourdhui" taille={18} />
          <span style={{ marginLeft: 8 }}>Revenir à la séance</span>
        </button>
      </div>
    </section>
  )
}
