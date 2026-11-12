import { useEffect, useState } from 'react'

import { amorcerSiNecessaire } from './stockage/amorcage'
import { Aujourdhui } from './ui/ecrans/Aujourdhui'
import { EcranAVenir } from './ui/ecrans/EcranAVenir'
import { Reglages } from './ui/ecrans/Reglages'
import { BarreOnglets } from './ui/navigation/BarreOnglets'
import { useOnglet } from './ui/navigation/useOnglet'

type Demarrage = { phase: 'en-cours' } | { phase: 'pret' } | { phase: 'echec'; message: string }

export function App() {
  const [demarrage, setDemarrage] = useState<Demarrage>({ phase: 'en-cours' })
  const onglet = useOnglet()

  useEffect(() => {
    let abandonne = false

    amorcerSiNecessaire()
      .then(() => {
        if (!abandonne) setDemarrage({ phase: 'pret' })
      })
      .catch((erreur: unknown) => {
        if (abandonne) return
        setDemarrage({
          phase: 'echec',
          message: erreur instanceof Error ? erreur.message : String(erreur),
        })
      })

    return () => {
      abandonne = true
    }
  }, [])

  if (demarrage.phase === 'en-cours') {
    return (
      <main className="page">
        <p className="surtitre">Remise en forme</p>
        <p className="discret">Ouverture des données locales…</p>
      </main>
    )
  }

  if (demarrage.phase === 'echec') {
    return (
      <main className="page">
        <section className="carte carte--alerte">
          <h2>Les données locales n’ont pas pu s’ouvrir</h2>
          <p>{demarrage.message}</p>
          <p className="discret">
            En navigation privée, ou si le stockage du site est bloqué, IndexedDB peut être
            indisponible.
          </p>
        </section>
      </main>
    )
  }

  return (
    <>
      {onglet === 'aujourdhui' && <Aujourdhui />}
      {onglet === 'semaine' && (
        <EcranAVenir
          etape="Étape 2 · en cours"
          titre="Semaine"
          contenu="Le calendrier de la semaine, le prévu et le réalisé côte à côte, et le déplacement des séances."
        />
      )}
      {onglet === 'progres' && (
        <EcranAVenir
          etape="Étape 3"
          titre="Progrès"
          contenu="Courbes, records, série en cours et bilans hebdomadaires. Le moteur de progression qui les alimente est déjà écrit et testé."
        />
      )}
      {onglet === 'alimentation' && (
        <EcranAVenir
          etape="Étape 4"
          titre="Repas"
          contenu="Journal des repas, hydratation, poids et tour de taille, et le score de régularité de la semaine."
        />
      )}
      {onglet === 'reglages' && <Reglages />}

      <BarreOnglets courant={onglet} />
    </>
  )
}
