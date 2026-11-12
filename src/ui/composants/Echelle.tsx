/**
 * Échelle de 1 à 10, en un tap (chapitre 4).
 *
 * Dix boutons plutôt qu'un curseur : un curseur demande de viser, de glisser
 * et de relâcher, et se rate avec un pouce mouillé. Chaque bouton fait au
 * moins 44 px de haut, et l'état choisi est porté par `aria-pressed`, pas
 * seulement par la couleur.
 */
export interface ProprietesEchelle {
  libelle: string
  /** Aide sous le libellé : « 1 très facile, 10 maximal ». */
  repere?: string
  valeur: number | undefined
  onChoisir: (valeur: number) => void
  /** Commence à 0 pour la douleur, à 1 pour l'effort et l'énergie. */
  depuis?: number
}

export function Echelle({ libelle, repere, valeur, onChoisir, depuis = 1 }: ProprietesEchelle) {
  const valeurs = Array.from({ length: 11 - depuis }, (_, index) => depuis + index)

  return (
    <fieldset className="echelle">
      <legend>
        {libelle}
        {repere && <span className="discret"> · {repere}</span>}
      </legend>
      <div className="echelle__boutons">
        {valeurs.map((choix) => (
          <button
            key={choix}
            type="button"
            aria-pressed={valeur === choix}
            aria-label={libelle + ' ' + String(choix) + ' sur 10'}
            onClick={() => onChoisir(choix)}
          >
            {choix}
          </button>
        ))}
      </div>
    </fieldset>
  )
}
