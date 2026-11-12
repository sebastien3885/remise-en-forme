/**
 * Les cinq écrans du chapitre 8 et leur barre de navigation.
 *
 * La navigation passe par le fragment d'URL (`#/semaine`) plutôt que par un
 * état React. Ça coûte une poignée de lignes et ça rend le **bouton retour
 * d'Android** utile : dans une application installée, un retour qui ferme
 * l'application au lieu de revenir à l'onglet précédent est une mauvaise
 * surprise. Aucune bibliothèque de routage pour autant : cinq onglets ne
 * justifient pas une dépendance de plus à mettre en cache hors ligne.
 */
import type { NomIcone } from '../composants/Icone'

export const ONGLETS = [
  { id: 'aujourdhui', libelle: 'Aujourd’hui', icone: 'aujourdhui' },
  { id: 'semaine', libelle: 'Semaine', icone: 'semaine' },
  { id: 'progres', libelle: 'Progrès', icone: 'progres' },
  { id: 'alimentation', libelle: 'Repas', icone: 'alimentation' },
  { id: 'reglages', libelle: 'Réglages', icone: 'reglages' },
] as const satisfies readonly { id: string; libelle: string; icone: NomIcone }[]

export type IdOnglet = (typeof ONGLETS)[number]['id']

export const ONGLET_PAR_DEFAUT: IdOnglet = 'aujourdhui'

/** Adresse interne d'un onglet, telle qu'elle apparaît dans la barre. */
export function lienOnglet(id: IdOnglet): string {
  return '#/' + id
}

function estIdOnglet(valeur: string): valeur is IdOnglet {
  return ONGLETS.some((onglet) => onglet.id === valeur)
}

/** Lit l'onglet courant dans un fragment d'URL, avec repli sur le premier. */
export function ongletDepuisHash(hash: string): IdOnglet {
  const sansDiese = hash.replace(/^#\/?/, '')
  return estIdOnglet(sansDiese) ? sansDiese : ONGLET_PAR_DEFAUT
}
