/**
 * Courbe simple d'un indicateur (chapitre 4).
 *
 * Une seule série, donc pas de légende : le titre nomme ce qu'on regarde.
 * Les barres partent de la ligne de base, leur extrémité est arrondie, et
 * seule la **dernière valeur** porte une étiquette — mettre un nombre sur
 * chaque point rendrait la courbe illisible sur un téléphone. Les chiffres
 * gardent la couleur du texte : c'est la barre qui porte l'identité.
 */
export interface PointCourbe {
  semaine: number
  valeur: number
}

export interface ProprietesCourbe {
  titre: string
  unite?: string
  points: readonly PointCourbe[]
  /** Valeur de référence, tracée en pointillés : un objectif, un record. */
  reference?: { valeur: number; libelle: string }
}

export function Courbe({ titre, unite, points, reference }: ProprietesCourbe) {
  if (points.length === 0) return null

  const valeurs = points.map((point) => point.valeur)
  const plafond = Math.max(...valeurs, reference?.valeur ?? 0)
  const derniere = points[points.length - 1]

  const hauteur = (valeur: number) =>
    plafond === 0 ? 0 : Math.max(4, Math.round((valeur / plafond) * 100))

  return (
    <figure className="courbe">
      <figcaption className="courbe__entete">
        <span className="courbe__titre">{titre}</span>
        <span className="courbe__valeur">
          <strong className="chiffre">{derniere?.valeur}</strong>
          {unite && <span className="discret"> {unite}</span>}
        </span>
      </figcaption>

      <div className="courbe__cadre">
        {reference && (
          <div
            className="courbe__reference"
            style={{ bottom: String(hauteur(reference.valeur)) + '%' }}
            aria-hidden="true"
          />
        )}
        <div className="courbe__barres">
          {points.map((point) => (
            <div
              key={point.semaine}
              className="courbe__barre"
              style={{ height: String(hauteur(point.valeur)) + '%' }}
              title={'Semaine ' + String(point.semaine) + ' : ' + String(point.valeur)}
            />
          ))}
        </div>
      </div>

      <p className="courbe__pied discret">
        {reference ? reference.libelle + ' · ' : ''}
        semaines {points[0]?.semaine} à {derniere?.semaine}
      </p>
    </figure>
  )
}
