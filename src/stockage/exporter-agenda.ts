/**
 * Les séances à venir, vers l'agenda du téléphone (chapitre 9 : les rappels).
 *
 * L'application ne peut pas se réveiller à une heure dite ; l'agenda, si. Cet
 * export lui confie ce qui reste à faire, avec un rappel le matin même.
 *
 * Sont écartées les séances pour lesquelles un rappel serait un mensonge :
 * celles qui sont annulées, celles qui ont été remplacées, et **celles qui
 * sont déjà faites** — le réalisé est la source de vérité (chapitre 4).
 *
 * Les jours de repos aussi, mais pour une autre raison : un rappel sert à
 * déclencher un geste. Une alarme à 8 h pour ne rien faire est du bruit, et le
 * jour de repos reste visible dans l'écran Semaine, où il a un sens.
 */
import { construireIcs, nomDeFichierIcs, type EvenementAgenda } from '../domaine/calendrier/ics'
import { ajouterJours, aujourdhui, maintenantIso } from '../domaine/dates'
import type { DateIso } from '../domaine/entites/communs'
import { formaterMesures } from '../domaine/mesures'
import { creerDepots, type Depots } from './index'

/** Un an devant : largement de quoi couvrir un programme de douze semaines. */
const HORIZON_JOURS = 365

export interface ResultatAgenda {
  /** Le fichier .ics, prêt à télécharger. */
  ics: string
  nomDeFichier: string
  evenements: number
  premiere?: DateIso
  derniere?: DateIso
}

export interface OptionsAgenda {
  depots?: Depots
  maintenant?: Date
  /** Point de départ ; par défaut aujourd'hui, le passé n'a rien à rappeler. */
  depuis?: DateIso
  /** Heure du rappel le jour même, en minutes depuis minuit. */
  rappelMinutes?: number
}

export async function exporterAgenda(options: OptionsAgenda = {}): Promise<ResultatAgenda> {
  const depots = options.depots ?? creerDepots()
  const maintenant = options.maintenant ?? new Date()
  const depuis = options.depuis ?? aujourdhui(maintenant)
  const jusqua = ajouterJours(depuis, HORIZON_JOURS)

  const [prevues, realisees, exercices] = await Promise.all([
    depots.seances.prevues.parPlage(depuis, jusqua),
    depots.seances.realisees.parPlage(depuis, jusqua),
    depots.exercices.tous(),
  ])

  const dejaFaites = new Set(
    realisees
      .map((realisee) => realisee.seancePrevueId)
      .filter((id): id is string => id !== undefined),
  )
  const nomParId = new Map(exercices.map((exercice) => [exercice.id, exercice.nom]))

  const evenements: EvenementAgenda[] = prevues
    .filter(
      (seance) =>
        seance.type !== 'repos' &&
        seance.statut !== 'annulee' &&
        seance.statut !== 'remplacee' &&
        !dejaFaites.has(seance.id),
    )
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((seance) => {
      const lignes = [...seance.exercices]
        .sort((a, b) => a.ordre - b.ordre)
        .map((exercice) => {
          const nom = nomParId.get(exercice.exerciceId) ?? 'Exercice inconnu'
          const cibles = formaterMesures(exercice.cibles)
          return cibles === '' ? nom : nom + ' — ' + cibles
        })

      if (seance.notes !== undefined && seance.notes !== '') lignes.push(seance.notes)

      return {
        id: seance.id,
        date: seance.date,
        titre: seance.titre,
        details: lignes.join('\n'),
      }
    })

  const genereLe = maintenantIso(maintenant)
  const premiere = evenements[0]?.date
  const derniere = evenements.at(-1)?.date

  return {
    ics: construireIcs(evenements, {
      genereLe,
      ...(options.rappelMinutes === undefined ? {} : { rappelMinutes: options.rappelMinutes }),
    }),
    nomDeFichier: nomDeFichierIcs(genereLe),
    evenements: evenements.length,
    ...(premiere === undefined ? {} : { premiere }),
    ...(derniere === undefined ? {} : { derniere }),
  }
}
