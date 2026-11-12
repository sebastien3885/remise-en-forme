/**
 * Jeu d'icônes de l'application.
 *
 * Des tracés en ligne, jamais d'emoji : une icône doit garder la couleur du
 * texte qui l'entoure et rester nette en plein soleil. Chaque icône est
 * décorative par défaut (`aria-hidden`) — le libellé à côté porte le sens.
 * Quand il n'y en a pas, on passe `titre` et l'icône devient une image
 * nommée pour les lecteurs d'écran.
 */
import type { ReactElement } from 'react'

export type NomIcone =
  | 'aujourdhui'
  | 'semaine'
  | 'progres'
  | 'alimentation'
  | 'reglages'
  | 'plus'
  | 'chrono'
  | 'marche'
  | 'piscine'
  | 'haltere'
  | 'etirement'
  | 'repos'

const TRACES: Record<NomIcone, ReactElement> = {
  aujourdhui: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M8.5 12.2l2.4 2.4 4.6-4.9" />
    </>
  ),
  semaine: (
    <>
      <rect x="3.5" y="5" width="17" height="15" rx="2.5" />
      <path d="M3.5 10h17M8 3.5v3M16 3.5v3" />
    </>
  ),
  progres: (
    <>
      <path d="M4 18.5V5M4 18.5h16" />
      <path d="M7.5 15l3.5-4 3 2.5 4.5-6" />
    </>
  ),
  alimentation: (
    <>
      <path d="M4.5 9h15l-1.3 9.2a2.5 2.5 0 0 1-2.5 2.1H8.3a2.5 2.5 0 0 1-2.5-2.1z" />
      <path d="M9 9V6.2a3 3 0 0 1 6 0V9" />
    </>
  ),
  reglages: (
    <>
      <path d="M4 7.5h16M4 16.5h16" />
      <circle cx="9.5" cy="7.5" r="2.3" />
      <circle cx="15" cy="16.5" r="2.3" />
    </>
  ),
  plus: <path d="M12 5.5v13M5.5 12h13" />,
  chrono: (
    <>
      <circle cx="12" cy="13" r="8" />
      <path d="M12 8.5V13l3 1.8M9.5 2.5h5" />
    </>
  ),
  marche: (
    <>
      <circle cx="13.5" cy="4.5" r="1.8" />
      <path d="M12.5 21l-1-5.5-2.5-2 1-5 3.5 1.5 2 2.5 2.5 1" />
      <path d="M9 10.5L6.5 13M11.5 15.5L9 21" />
    </>
  ),
  piscine: (
    <>
      <path d="M3 17.5c1.6 0 1.6 1.3 3.2 1.3s1.6-1.3 3.2-1.3 1.6 1.3 3.2 1.3 1.6-1.3 3.2-1.3 1.6 1.3 3.2 1.3" />
      <path d="M7 15V6.5a2 2 0 0 1 4 0M13 15V6.5a2 2 0 0 1 4 0M7 10h4M13 10h4" />
    </>
  ),
  haltere: (
    <>
      <path d="M3.5 10v4M6.5 7.5v9M17.5 7.5v9M20.5 10v4M6.5 12h11" />
    </>
  ),
  etirement: (
    <>
      <circle cx="12" cy="4.5" r="1.8" />
      <path d="M12 8v6M8 10.5h8M9.5 21l2.5-7 2.5 7" />
    </>
  ),
  repos: <path d="M19 14.5A8 8 0 0 1 9.5 5a7.5 7.5 0 1 0 9.5 9.5z" />,
}

export interface ProprietesIcone {
  nom: NomIcone
  taille?: number
  /** À renseigner uniquement quand l'icône est seule, sans libellé à côté. */
  titre?: string
}

export function Icone({ nom, taille = 21, titre }: ProprietesIcone) {
  return (
    <svg
      width={taille}
      height={taille}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...(titre ? { role: 'img', 'aria-label': titre } : { 'aria-hidden': true })}
    >
      {TRACES[nom]}
    </svg>
  )
}
