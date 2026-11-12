/**
 * Génération du programme initial de 12 semaines (chapitre 3).
 *
 * Le cahier des charges donne le programme de départ : 3 marches rapides,
 * 2 séances de renforcement sans matériel, 1 natation douce et de la mobilité
 * après chaque séance, avec au moins un jour de repos complet par semaine.
 *
 * Trois décisions que le cahier des charges ne tranche pas :
 *
 * 1. **Les douze semaines sont identiques.** Le chapitre 3 ne décrit que les
 *    semaines 1 à 4, et le chapitre 5 confie la progression au moteur, à
 *    partir du réalisé. Inventer ici une montée en charge reviendrait à
 *    décider à l'avance ce que le moteur doit déduire de la réalité. Le
 *    programme pose donc un socle, et le bilan du dimanche le fait évoluer.
 * 2. **Trois étirements d'une minute** plutôt qu'un bloc de cinq minutes :
 *    sur cinq minutes d'étirements, seules les tenues se prescrivent, le
 *    reste est du déplacement entre deux postures.
 * 3. **On s'entraîne en dessous du maximum.** Quand le questionnaire indique
 *    un nombre de pompes ou de squats possibles, les séries sont calées à
 *    60 % de ce maximum : c'est une reprise, pas un test.
 *
 * Les précautions du profil s'appliquent : un exercice écarté est remplacé
 * par sa variante plus douce, et à défaut retiré de la séance avec un mot
 * dans les avertissements.
 */
import { ajouterJours, lundiDeLaSemaine, maintenantIso, numeroDeSemaineProgramme } from '../dates'
import type { Exercice, Id, Mesures, Profil, Programme, SeancePrevue } from '../entites'
import { variantePlusDouce } from '../exercices/variantes'
import { nouvelId as nouvelIdParDefaut, type FabriqueId } from '../identifiants'
import { contexteDepuisProfil, exerciceAutorise } from '../profil/precautions'

/** Durée du programme initial, en semaines (chapitre 3). */
export const SEMAINES_DU_PROGRAMME = 12

const JOURS_PAR_SEMAINE = 7

/** Ce qu'on fait chaque jour de la semaine, du lundi au dimanche. */
type Gabarit = 'marche' | 'renforcement' | 'natation' | 'repos'

const SEMAINE_TYPE: readonly Gabarit[] = [
  'marche', // lundi
  'renforcement', // mardi
  'marche', // mercredi
  'repos', // jeudi
  'renforcement', // vendredi
  'marche', // samedi
  'natation', // dimanche
]

/** Les trois tenues de mobilité ajoutées à la fin de chaque séance. */
const MOBILITE: readonly Id[] = [
  'etirement-mollets',
  'etirement-ischio-assis',
  'mobilite-hanches',
]

function borner(valeur: number, minimum: number, maximum: number): number {
  return Math.min(Math.max(valeur, minimum), maximum)
}

/** Durée de marche de départ, déduite de la distance confortable déclarée. */
function dureeDeMarche(profil: Profil): number {
  const metres = profil.niveauDepart.marcheConfortableMetres
  if (metres === undefined) return 30
  // Une marche rapide avance d'environ 80 mètres par minute.
  const minutes = Math.round(metres / 80 / 5) * 5
  return borner(minutes, 10, 30)
}

function repetitions(maximumPossible: number | undefined, pardefaut: number): number {
  if (maximumPossible === undefined) return pardefaut
  return borner(Math.round(maximumPossible * 0.6), 5, 15)
}

interface ExerciceVoulu {
  id: Id
  cibles: Mesures
}

function exercicesVoulus(gabarit: Gabarit, profil: Profil): ExerciceVoulu[] {
  const mobilite = MOBILITE.map((id) => ({ id, cibles: { maintienSecondes: 60 } }))

  switch (gabarit) {
    case 'marche':
      return [
        { id: 'marche-rapide', cibles: { dureeMinutes: dureeDeMarche(profil) } },
        ...mobilite,
      ]

    case 'renforcement':
      return [
        {
          id: 'squat-sur-chaise',
          cibles: {
            series: 2,
            repetitions: repetitions(profil.niveauDepart.squatsPossibles, 10),
            reposSecondes: 60,
          },
        },
        {
          id: 'pompes-contre-mur',
          cibles: {
            series: 2,
            repetitions: repetitions(profil.niveauDepart.pompesPossibles, 8),
            reposSecondes: 60,
          },
        },
        {
          id: 'gainage-avant-bras',
          cibles: { series: 3, maintienSecondes: 20, reposSecondes: 45 },
        },
        { id: 'pont-fessier', cibles: { series: 2, repetitions: 12, reposSecondes: 45 } },
        ...mobilite,
      ]

    case 'natation':
      // « 8 × 1 longueur, 30 à 45 s de repos » du chapitre 3.
      return [
        { id: 'nage-crawl', cibles: { longueurs: 8, reposSecondes: 40 } },
        { id: 'etirement-mollets', cibles: { maintienSecondes: 60 } },
      ]

    case 'repos':
      return []
  }
}

const TITRES: Record<Exclude<Gabarit, 'repos'>, (profil: Profil) => string> = {
  marche: (profil) => 'Marche rapide ' + String(dureeDeMarche(profil)) + ' min',
  renforcement: () => 'Renforcement sans matériel',
  natation: () => 'Natation douce, 8 × 1 longueur',
}

export interface OptionsGeneration {
  profil: Profil
  bibliotheque: readonly Exercice[]
  /** 12 par défaut (chapitre 3). */
  nombreSemaines?: number
  maintenant?: Date
  nouvelId?: FabriqueId
}

export interface ProgrammeGenere {
  programme: Programme
  seances: SeancePrevue[]
  /** Ce que le générateur n'a pas pu placer, et pourquoi. */
  avertissements: string[]
}

export function genererProgrammeInitial(options: OptionsGeneration): ProgrammeGenere {
  const { profil, bibliotheque } = options
  const nombreSemaines = options.nombreSemaines ?? SEMAINES_DU_PROGRAMME
  const maintenant = options.maintenant ?? new Date()
  const creeLe = maintenantIso(maintenant)
  const fabrique = options.nouvelId ?? nouvelIdParDefaut

  const contexte = contexteDepuisProfil(profil)
  const parId = new Map(bibliotheque.map((exercice) => [exercice.id, exercice]))
  const avertissements: string[] = []
  const dejaSignales = new Set<Id>()

  /** Résout un exercice voulu : lui-même, sa variante plus douce, ou rien. */
  function resoudre(voulu: ExerciceVoulu): Exercice | undefined {
    const exercice = parId.get(voulu.id)
    if (!exercice) {
      if (!dejaSignales.has(voulu.id)) {
        dejaSignales.add(voulu.id)
        avertissements.push(
          'L’exercice « ' + voulu.id + ' » est absent de la bibliothèque : séances allégées.',
        )
      }
      return undefined
    }

    if (exerciceAutorise(exercice, contexte)) return exercice

    const plusDouce = variantePlusDouce(exercice, bibliotheque, contexte)
    if (!dejaSignales.has(voulu.id)) {
      dejaSignales.add(voulu.id)
      avertissements.push(
        plusDouce
          ? '« ' +
            exercice.nom +
            ' » est écarté par vos précautions : remplacé par « ' +
            plusDouce.nom +
            ' ».'
          : '« ' +
            exercice.nom +
            ' » est écarté par vos précautions et n’a pas de variante plus douce : retiré des séances.',
      )
    }
    return plusDouce
  }

  // La piscine n'est pas toujours là : le dimanche redevient un jour libre.
  const aLaPiscine = profil.materiel.includes('piscine')

  // L'identifiant du programme est tiré d'abord : les séances le portent
  // directement, sans repasse.
  const programmeId = fabrique()
  const premierLundi = lundiDeLaSemaine(profil.dateDebut)
  const seances: SeancePrevue[] = []

  for (let semaine = 0; semaine < nombreSemaines; semaine += 1) {
    for (let jour = 0; jour < JOURS_PAR_SEMAINE; jour += 1) {
      const date = ajouterJours(premierLundi, semaine * JOURS_PAR_SEMAINE + jour)

      // Rien avant le début déclaré : on ne planifie pas dans le passé.
      if (date < profil.dateDebut) continue

      const gabaritDuJour = SEMAINE_TYPE[jour] ?? 'repos'
      const gabarit: Gabarit =
        gabaritDuJour === 'natation' && !aLaPiscine ? 'repos' : gabaritDuJour

      if (gabarit === 'repos') {
        seances.push({
          id: fabrique(),
          programmeId,
          date,
          semaine: numeroDeSemaineProgramme(profil.dateDebut, date),
          type: 'repos',
          titre: 'Repos complet',
          exercices: [],
          statut: 'a-faire',
          creeLe,
        })
        continue
      }

      const retenus = exercicesVoulus(gabarit, profil).flatMap((voulu) => {
        const exercice = resoudre(voulu)
        return exercice ? [{ exercice, cibles: voulu.cibles }] : []
      })

      // Une séance vidée par les précautions devient un jour libre plutôt
      // qu'une case vide : l'utilisateur voit un calendrier honnête.
      if (retenus.length === 0) continue

      seances.push({
        id: fabrique(),
        programmeId,
        date,
        semaine: numeroDeSemaineProgramme(profil.dateDebut, date),
        type: gabarit,
        titre: TITRES[gabarit](profil),
        exercices: retenus.map((retenu, index) => ({
          exerciceId: retenu.exercice.id,
          ordre: index + 1,
          cibles: retenu.cibles,
        })),
        statut: 'a-faire',
        creeLe,
      })
    }
  }

  const derniereDate = seances.reduce<string>(
    (derniere, seance) => (seance.date > derniere ? seance.date : derniere),
    profil.dateDebut,
  )

  const programme: Programme = {
    id: programmeId,
    version: 1,
    dateDebut: profil.dateDebut,
    dateFin: derniereDate,
    motifRevision: 'programme initial',
    actif: true,
    creeLe,
  }

  return { programme, seances, avertissements }
}
