/**
 * Écran annoncé mais pas encore construit.
 *
 * Mieux vaut dire ce qui arrive et quand que laisser un onglet vide : la
 * barre du bas montre les cinq écrans du chapitre 8 dès maintenant, et
 * chacun dit honnêtement où il en est.
 */
export interface ProprietesEcranAVenir {
  titre: string
  etape: string
  contenu: string
}

export function EcranAVenir({ titre, etape, contenu }: ProprietesEcranAVenir) {
  return (
    <main className="page">
      <header className="page__entete">
        <p className="surtitre">{etape}</p>
        <h1>{titre}</h1>
      </header>
      <section className="carte">
        <p className="discret">{contenu}</p>
      </section>
    </main>
  )
}
