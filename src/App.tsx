import { useEffect, useState } from 'react'

import { amorcerSiNecessaire } from './stockage/amorcage'
import { Alimentation } from './ui/ecrans/Alimentation'
import { Aujourdhui } from './ui/ecrans/Aujourdhui'
import { Progres } from './ui/ecrans/Progres'
import { Reglages } from './ui/ecrans/Reglages'
import { Semaine } from './ui/ecrans/Semaine'
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
      {onglet === 'semaine' && <Semaine />}
      {onglet === 'progres' && <Progres />}
      {onglet === 'alimentation' && <Alimentation />}
      {onglet === 'reglages' && <Reglages />}

      <BarreOnglets courant={onglet} />
    </>
  )
}
