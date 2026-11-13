/**
 * Le score de régularité du journal alimentaire, pour une semaine.
 *
 * Il est demandé à deux endroits : dans l'écran Alimentation, où il est chez
 * lui, et à côté du bilan sportif dans Progrès — le chapitre 6 veut qu'on
 * puisse lire les deux côtés de la même semaine au même endroit. D'où ce
 * module : deux assemblages de la semaine finiraient par ne pas compter les
 * mêmes jours.
 *
 * Le calcul lui-même reste dans le domaine (`scoreDeRegularite`) ; ici on ne
 * fait que lui servir la semaine.
 */
import { ajouterJours, joursDeLaSemaine, lundiDeLaSemaine } from '../domaine/dates'
import { scoreDeRegularite, type ScoreRegularite } from '../domaine/alimentation/reperes'
import type { DateIso } from '../domaine/entites'
import { creerDepots, type Depots } from './index'

export interface OptionsScore {
  depots?: Depots
}

export async function scoreAlimentaireDeLaSemaine(
  date: DateIso,
  options: OptionsScore = {},
): Promise<ScoreRegularite> {
  const depots = options.depots ?? creerDepots()
  const jours = joursDeLaSemaine(date)
  const lundi = lundiDeLaSemaine(date)

  const repasDeLaSemaine = await depots.repas.parPlage(lundi, ajouterJours(lundi, 6))

  const joursAlimentaires = await Promise.all(
    jours.map(async (jour) => ({
      date: jour,
      repas: repasDeLaSemaine.filter((candidat) => candidat.date === jour),
      hydratation: await depots.hydratation.duJour(jour),
    })),
  )

  return scoreDeRegularite(joursAlimentaires)
}
