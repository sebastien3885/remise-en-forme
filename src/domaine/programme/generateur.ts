/**
 * Construction des séances et génération du programme initial (chapitre 3).
 *
 * Le cahier des charges donne le programme de départ : 3 marches rapides,
 * 2 séances de renforcement sans matériel, 1 natation douce, de la mobilité
 * après chaque séance, et au moins un jour de repos complet par semaine.
 *
 * `construireSeance` est la brique commune : elle sert à la génération des
 * douze semaines, à l'ajout d'une séance à la main et au remplacement d'une
 * séance par une autre. Une seule définition du contenu, donc une marche
 * ajoutée à la main ressemble exactement à une marche du programme.
 *
 * Trois décisions que le cahier des charges ne tranche pas :
 *
 * 1. **Les douze semaines sont identiques.** Le chapitre 3 ne décrit que les
 *    semaines 1 à 4, et le chapitre 5 confie la progression au moteur, à
 *    partir du réalisé. Inventer ici une montée en charge reviendrait à
 *    décider à l'avance ce que le moteur doit déduire de la réalité.
 * 2. **Trois tenues d'une minute** plutôt qu'un bloc de cinq minutes : sur
 *    cinq minutes d'étirements, seules les tenues se prescrivent.
 * 3. **On s'entraîne en dessous du maximum.** Quand le questionnaire indique
 *    un nombre de pompes ou de squats possibles, les séries sont calées à
 *    60 % de ce maximum : c'est une reprise, pas un test.
 *
 * Les précautions du profil s'appliquent : un exercice écarté est remplacé
 * par sa variante plus douce, et à défaut retiré de la séance avec un mot
 * dans les avertissements.
 */
import { ajouterJours, lundiDeLaSemaine, maintenantIso, numeroDeSemaineProgramme } from '../dates'
import type {
  DateIso,
  Exercice,
  HorodatageIso,
  Id,
  Mesures,
  Profil,
  Programme,
  SeancePrevue,
} from '../entites'
import { variantePlusDouce } from '../exercices/variantes'
import { nouvelId as nouvelIdParDefaut, type FabriqueId } from '../identifiants'
import { contexteDepuisProfil, exerciceAutorise } from '../profil/precautions'

/** Durée du programme initial, en semaines (chapitre 3). */
export const SEMAINES_DU_PROGRAMME = 12

const JOURS_PAR_SEMAINE = 7

/** Les contenus de séance que l'application sait construire. */
export const GABARITS = [
  'marche',
  'velo',
  'natation',
  'renforcement',
  'mobilite',
  'repos',
] as const
export type GabaritSeance = (typeof GABARITS)[number]

/** Ce qu'on fait chaque jour de la semaine, du lundi au dimanche. */
const SEMAINE_TYPE: readonly GabaritSeance[] = [
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
  /**
   * Vrai pour les étirements ajoutés en fin de séance. Ils ne définissent pas
   * la séance : si tout le reste est écarté, une « marche » qui ne contient
   * que des étirements serait un mensonge sur l'étiquette.
   */
  complement?: boolean
}

function exercicesVoulus(gabarit: GabaritSeance, profil: Profil): ExerciceVoulu[] {
  const mobilite = MOBILITE.map((id) => ({
    id,
    cibles: { maintienSecondes: 60 },
    complement: true,
  }))

  switch (gabarit) {
    case 'marche':
      return [
        { id: 'marche-rapide', cibles: { dureeMinutes: dureeDeMarche(profil) } },
        ...mobilite,
      ]

    case 'velo':
      return [
        { id: 'velo-souple', cibles: { dureeMinutes: dureeDeMarche(profil) } },
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
        { id: 'etirement-mollets', cibles: { maintienSecondes: 60 }, complement: true },
      ]

    case 'mobilite':
      // Ici les étirements sont la séance, pas son complément.
      return MOBILITE.map((id) => ({ id, cibles: { maintienSecondes: 60 } }))

    case 'repos':
      return []
  }
}

const TITRES: Record<Exclude<GabaritSeance, 'repos'>, (profil: Profil) => string> = {
  marche: (profil) => 'Marche rapide ' + String(dureeDeMarche(profil)) + ' min',
  velo: (profil) => 'Vélo ' + String(dureeDeMarche(profil)) + ' min',
  renforcement: () => 'Renforcement sans matériel',
  natation: () => 'Natation douce, 8 × 1 longueur',
  mobilite: () => 'Mobilité et étirements',
}

/** Titre d'une séance d'un gabarit donné, sans la construire. */
export function titreDuGabarit(gabarit: GabaritSeance, profil: Profil): string {
  return gabarit === 'repos' ? 'Repos complet' : TITRES[gabarit](profil)
}

// ----------------------------------------------- construction d'une séance

export interface OptionsConstruction {
  gabarit: GabaritSeance
  profil: Profil
  bibliotheque: readonly Exercice[]
  date: DateIso
  programmeId: Id
  id: Id
  creeLe: HorodatageIso
  /** Date de début du programme, pour numéroter la semaine. */
  dateDebutProgramme: DateIso
}

export interface SeanceConstruite {
  /** Absente quand les précautions ne laissent aucun exercice de ce gabarit. */
  seance: SeancePrevue | undefined
  avertissements: string[]
  /**
   * Renseignée quand la séance est refusée : c'est la phrase à montrer, là où
   * les avertissements racontent le détail exercice par exercice.
   */
  raisonDuRefus?: string
}

/**
 * Construit une séance d'un gabarit donné, en appliquant les précautions du
 * profil : un exercice écarté descend vers sa variante plus douce, et à
 * défaut sort de la séance.
 */
export function construireSeance(options: OptionsConstruction): SeanceConstruite {
  const { gabarit, profil, bibliotheque, date, programmeId, id, creeLe } = options
  const avertissements: string[] = []

  const semaine = numeroDeSemaineProgramme(options.dateDebutProgramme, date)

  if (gabarit === 'repos') {
    return {
      seance: {
        id,
        programmeId,
        date,
        semaine,
        type: 'repos',
        titre: 'Repos complet',
        exercices: [],
        statut: 'a-faire',
        creeLe,
      },
      avertissements,
    }
  }

  const contexte = contexteDepuisProfil(profil)
  const parId = new Map(bibliotheque.map((exercice) => [exercice.id, exercice]))

  const retenus = exercicesVoulus(gabarit, profil).flatMap((voulu) => {
    const exercice = parId.get(voulu.id)

    if (!exercice) {
      avertissements.push(
        'L’exercice « ' + voulu.id + ' » est absent de la bibliothèque : séances allégées.',
      )
      return []
    }

    if (exerciceAutorise(exercice, contexte)) {
      return [{ exercice, cibles: voulu.cibles, complement: voulu.complement === true }]
    }

    const plusDouce = variantePlusDouce(exercice, bibliotheque, contexte)
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
    return plusDouce
      ? [{ exercice: plusDouce, cibles: voulu.cibles, complement: voulu.complement === true }]
      : []
  })

  // Une séance sans son exercice principal n'est pas une séance allégée :
  // c'est une étiquette qui ment. Une « marche » réduite à trois étirements
  // parce que le matériel manque doit être refusée, pas affichée.
  if (!retenus.some((retenu) => !retenu.complement)) {
    const raisonDuRefus =
      'Aucun exercice de type « ' +
      TITRES[gabarit](profil) +
      ' » n’est disponible avec votre matériel et vos précautions.'
    avertissements.push(raisonDuRefus)
    return { seance: undefined, avertissements, raisonDuRefus }
  }

  return {
    seance: {
      id,
      programmeId,
      date,
      semaine,
      type: gabarit,
      titre: TITRES[gabarit](profil),
      exercices: retenus.map((retenu, index) => ({
        exerciceId: retenu.exercice.id,
        ordre: index + 1,
        cibles: retenu.cibles,
      })),
      statut: 'a-faire',
      creeLe,
    },
    avertissements,
  }
}

// ------------------------------------------------- programme de 12 semaines

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

  // L'identifiant du programme est tiré d'abord : les séances le portent
  // directement, sans repasse.
  const programmeId = fabrique()
  const premierLundi = lundiDeLaSemaine(profil.dateDebut)

  // La piscine n'est pas toujours là : le dimanche redevient un jour libre.
  const aLaPiscine = profil.materiel.includes('piscine')

  const seances: SeancePrevue[] = []
  const avertissements: string[] = []

  for (let semaine = 0; semaine < nombreSemaines; semaine += 1) {
    for (let jour = 0; jour < JOURS_PAR_SEMAINE; jour += 1) {
      const date = ajouterJours(premierLundi, semaine * JOURS_PAR_SEMAINE + jour)

      // Rien avant le début déclaré : on ne planifie pas dans le passé.
      if (date < profil.dateDebut) continue

      const gabaritDuJour = SEMAINE_TYPE[jour] ?? 'repos'
      const gabarit: GabaritSeance =
        gabaritDuJour === 'natation' && !aLaPiscine ? 'repos' : gabaritDuJour

      const construite = construireSeance({
        gabarit,
        profil,
        bibliotheque,
        date,
        programmeId,
        id: fabrique(),
        creeLe,
        dateDebutProgramme: profil.dateDebut,
      })

      avertissements.push(...construite.avertissements)

      // Une séance vidée par les précautions devient un jour libre plutôt
      // qu'une case vide : l'utilisateur voit un calendrier honnête.
      if (construite.seance) seances.push(construite.seance)
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

  // Le même exercice écarté chaque jour ne produit qu'un avertissement.
  return { programme, seances, avertissements: [...new Set(avertissements)] }
}
