/**
 * Barre de navigation du bas (chapitre 8).
 *
 * Cinq cibles de 48 px minimum, atteignables au pouce, avec l'onglet courant
 * marqué par `aria-current` et pas seulement par la couleur.
 */
import { Icone } from '../composants/Icone'
import { ONGLETS, lienOnglet, type IdOnglet } from './onglets'

export function BarreOnglets({ courant }: { courant: IdOnglet }) {
  return (
    <nav className="barre-onglets" aria-label="Navigation principale">
      {ONGLETS.map((onglet) => (
        <a
          key={onglet.id}
          href={lienOnglet(onglet.id)}
          {...(onglet.id === courant ? { 'aria-current': 'page' as const } : {})}
        >
          <Icone nom={onglet.icone} />
          <span>{onglet.libelle}</span>
        </a>
      ))}
    </nav>
  )
}
