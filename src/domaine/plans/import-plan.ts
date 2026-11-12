/**
 * Import d'un plan d'exercice : contrôle, aperçu, conversion.
 *
 * Le chapitre 9 décrit le parcours : « l'application contrôle le format,
 * affiche un aperçu, puis remplace ou fusionne le programme ». Ce module
 * couvre les trois temps, et reste pur — il ne lit ni n'écrit rien. La
 * couche stockage s'occupe d'appliquer ce qu'il a préparé.
 *
 * Le contrôle va plus loin que le schéma, parce que certaines erreurs ne se
 * voient qu'en regardant le fichier dans son ensemble :
 *
 * - un exercice référencé par une séance mais défini nulle part ;
 * - une chaîne de variantes qui pointe dans le vide ;
 * - une semaine sans aucun jour de repos, que le chapitre 3 interdit.
 *
 * Erreurs et avertissements sont distincts : une erreur bloque l'import, un
 * avertissement s'affiche dans l'aperçu et laisse l'utilisateur décider.
 */
import { z } from 'zod'

import { joursEntre, lundiDeLaSemaine, maintenantIso, numeroDeSemaineProgramme } from '../dates'
import {
  LIBELLE_IMPACT_GENOU,
  type DateIso,
  type Exercice,
  type Id,
  type Programme,
  type SeancePrevue,
  type TypeSeance,
} from '../entites'
import { nouvelId as nouvelIdParDefaut, type FabriqueId, versSlug } from '../identifiants'
import { evaluerExercice, type ContexteExercices } from '../profil/precautions'
import {
  schemaPlan,
  type ExerciceDuPlan,
  type PlanImporte,
  type SeanceDuPlan,
} from './schema-plan'

export type { ExerciceDuPlan, PlanImporte, SeanceDuPlan } from './schema-plan'

// --------------------------------------------------------------- contrôle

export interface ProblemePlan {
  /** Où, dans le fichier : `seances[2].exercices[0].cibles`. */
  chemin: string
  message: string
}

export type ResultatAnalyse =
  | { valide: true; plan: PlanImporte }
  | { valide: false; erreurs: ProblemePlan[] }

function cheminLisible(chemin: ReadonlyArray<PropertyKey>): string {
  if (chemin.length === 0) return 'racine du fichier'
  return chemin.reduce<string>((accumule, segment) => {
    if (typeof segment === 'number') return accumule + '[' + String(segment) + ']'
    return accumule === '' ? String(segment) : accumule + '.' + String(segment)
  }, '')
}

function typeEnFrancais(attendu: string): string {
  const traductions: Record<string, string> = {
    string: 'du texte',
    number: 'un nombre',
    boolean: 'vrai ou faux',
    array: 'une liste',
    object: 'un objet',
  }
  return traductions[attendu] ?? attendu
}

function messageEnFrancais(probleme: z.core.$ZodIssue): string {
  switch (probleme.code) {
    case 'invalid_type':
      return 'valeur attendue : ' + typeEnFrancais(probleme.expected)
    case 'unrecognized_keys':
      return (
        'clé inconnue : ' +
        probleme.keys.join(', ') +
        ' (une faute de frappe passerait inaperçue, donc le fichier est refusé)'
      )
    case 'invalid_value': {
      const attendues = probleme.values.map((valeur) => JSON.stringify(valeur)).join(', ')
      return 'valeur non reconnue ; attendu : ' + attendues
    }
    case 'too_small':
      return 'valeur trop petite ou liste trop courte (minimum ' + String(probleme.minimum) + ')'
    case 'too_big':
      return 'valeur trop grande (maximum ' + String(probleme.maximum) + ')'
    default:
      return probleme.message
  }
}

/** Contrôle la forme du plan. N'inspecte pas encore sa cohérence d'ensemble. */
export function analyserPlan(donnees: unknown): ResultatAnalyse {
  const resultat = schemaPlan.safeParse(donnees)
  if (resultat.success) {
    return { valide: true, plan: resultat.data }
  }
  return {
    valide: false,
    erreurs: resultat.error.issues.map((probleme) => ({
      chemin: cheminLisible(probleme.path),
      message: messageEnFrancais(probleme),
    })),
  }
}

/** Même contrôle, à partir du texte brut du fichier choisi. */
export function analyserTextePlan(texte: string): ResultatAnalyse {
  let donnees: unknown
  try {
    donnees = JSON.parse(texte)
  } catch (erreur) {
    return {
      valide: false,
      erreurs: [
        {
          chemin: 'fichier',
          message:
            'le fichier n’est pas du JSON valide : ' +
            (erreur instanceof Error ? erreur.message : String(erreur)),
        },
      ],
    }
  }
  return analyserPlan(donnees)
}

// ----------------------------------------------------------------- aperçu

/** Identifiant d'un exercice du plan : celui fourni, sinon déduit du nom. */
export function idExerciceDuPlan(definition: ExerciceDuPlan): Id {
  return definition.id ?? versSlug(definition.nom)
}

export const MODES_IMPORT = ['remplacer', 'fusionner'] as const
export type ModeImport = (typeof MODES_IMPORT)[number]

export interface ContexteApercu {
  /** Bibliothèque déjà en base : un plan peut s'appuyer sur ses exercices. */
  bibliotheque: readonly Exercice[]
  /** Précautions en vigueur, pour avertir sans bloquer. */
  precautions?: ContexteExercices
}

export interface ApercuPlan {
  nom: string
  description?: string
  dateDebut: DateIso
  dateFin: DateIso
  nombreSemaines: number
  nombreSeances: number
  nombreJoursDeRepos: number
  seancesParType: Partial<Record<TypeSeance, number>>
  /** Noms des exercices que le plan ajoute à la bibliothèque. */
  exercicesNouveaux: string[]
  /** Noms des exercices déjà présents que le plan redéfinit. */
  exercicesMisAJour: string[]
  erreurs: ProblemePlan[]
  avertissements: ProblemePlan[]
  /** Vrai si le plan peut être appliqué. */
  applicable: boolean
}

function dateLaPlusTardive(seances: readonly SeanceDuPlan[]): DateIso {
  return seances.reduce<DateIso>(
    (derniere, seance) => (seance.date > derniere ? seance.date : derniere),
    seances[0]?.date ?? '',
  )
}

function dateLaPlusTot(seances: readonly SeanceDuPlan[]): DateIso {
  return seances.reduce<DateIso>(
    (premiere, seance) => (seance.date < premiere ? seance.date : premiere),
    seances[0]?.date ?? '',
  )
}

/** Semaines sans aucun jour de repos complet : interdit par le chapitre 3. */
function semainesSansRepos(plan: PlanImporte): DateIso[] {
  const joursActifsParSemaine = new Map<DateIso, Set<DateIso>>()

  for (const seance of plan.seances) {
    if (seance.type === 'repos') continue
    const lundi = lundiDeLaSemaine(seance.date)
    const jours = joursActifsParSemaine.get(lundi) ?? new Set<DateIso>()
    jours.add(seance.date)
    joursActifsParSemaine.set(lundi, jours)
  }

  return [...joursActifsParSemaine.entries()]
    .filter(([, jours]) => jours.size >= 7)
    .map(([lundi]) => lundi)
    .sort()
}

/**
 * Contrôle la cohérence d'ensemble et prépare l'aperçu montré avant d'appliquer
 * le plan.
 */
export function apercuDuPlan(plan: PlanImporte, contexte: ContexteApercu): ApercuPlan {
  const erreurs: ProblemePlan[] = []
  const avertissements: ProblemePlan[] = []

  const bibliothequeParId = new Map(
    contexte.bibliotheque.map((exercice) => [exercice.id, exercice]),
  )

  // --- exercices du plan : identifiants et doublons
  const exercicesDuPlan = new Map<Id, ExerciceDuPlan>()
  plan.exercices.forEach((definition, index) => {
    const id = idExerciceDuPlan(definition)
    if (id === '') {
      erreurs.push({
        chemin: 'exercices[' + String(index) + ']',
        message:
          'impossible de déduire un identifiant du nom « ' +
          definition.nom +
          ' » : ajouter un champ `id`',
      })
      return
    }
    if (exercicesDuPlan.has(id)) {
      erreurs.push({
        chemin: 'exercices[' + String(index) + ']',
        message: 'deux exercices portent le même identifiant « ' + id + ' »',
      })
      return
    }
    exercicesDuPlan.set(id, definition)
  })

  const connu = (id: Id) => exercicesDuPlan.has(id) || bibliothequeParId.has(id)

  // --- chaînes de variantes
  plan.exercices.forEach((definition, index) => {
    for (const champ of ['varianteFacileId', 'varianteDifficileId'] as const) {
      const cible = definition[champ]
      if (cible && !connu(cible)) {
        erreurs.push({
          chemin: 'exercices[' + String(index) + '].' + champ,
          message:
            'désigne « ' +
            cible +
            ' », qui n’existe ni dans le plan ni dans la bibliothèque',
        })
      }
    }
  })

  // --- exercices référencés par les séances
  plan.seances.forEach((seance, indexSeance) => {
    seance.exercices.forEach((reference, indexExercice) => {
      if (!connu(reference.exerciceId)) {
        erreurs.push({
          chemin:
            'seances[' +
            String(indexSeance) +
            '].exercices[' +
            String(indexExercice) +
            '].exerciceId',
          message:
            '« ' +
            reference.exerciceId +
            ' » n’existe ni dans le plan ni dans la bibliothèque : le définir dans `exercices`',
        })
      }
    })
  })

  // --- dates
  const lundiDeDepart = lundiDeLaSemaine(plan.dateDebut)
  plan.seances.forEach((seance, index) => {
    if (joursEntre(lundiDeDepart, seance.date) < 0) {
      erreurs.push({
        chemin: 'seances[' + String(index) + '].date',
        message:
          'séance datée du ' +
          seance.date +
          ', avant la semaine de début du plan (' +
          plan.dateDebut +
          ')',
      })
    }
  })

  // --- jour de repos hebdomadaire imposé (chapitres 3 et 10)
  for (const lundi of semainesSansRepos(plan)) {
    erreurs.push({
      chemin: 'seances',
      message:
        'la semaine du ' +
        lundi +
        ' comporte une séance chaque jour : l’application impose au moins un jour de repos complet par semaine',
    })
  }

  // --- avertissements : précautions et fort impact
  for (const [id, definition] of exercicesDuPlan) {
    if (definition.impactGenou === 'eleve') {
      avertissements.push({
        chemin: 'exercices',
        message:
          '« ' +
          definition.nom +
          ' » est déclaré à fort impact pour le genou : il sera écarté des propositions tant que les précautions du profil ne sont pas levées',
      })
    }

    if (contexte.precautions) {
      const verdict = evaluerExercice(
        convertirExercice(definition, id, maintenantIso(new Date(0))),
        contexte.precautions,
      )
      for (const exclusion of verdict.exclusions) {
        if (exclusion.raison === 'impact-genou' && definition.impactGenou === 'eleve') continue
        avertissements.push({
          chemin: 'exercices',
          message: '« ' + definition.nom + ' » sera écarté : ' + exclusion.explication,
        })
      }
    }

    const existant = bibliothequeParId.get(id)
    if (existant && existant.impactGenou !== definition.impactGenou) {
      avertissements.push({
        chemin: 'exercices',
        message:
          '« ' +
          definition.nom +
          ' » change d’impact genou : ' +
          LIBELLE_IMPACT_GENOU[existant.impactGenou] +
          ' → ' +
          LIBELLE_IMPACT_GENOU[definition.impactGenou],
      })
    }
  }

  // --- décompte
  const seancesParType: Partial<Record<TypeSeance, number>> = {}
  for (const seance of plan.seances) {
    seancesParType[seance.type] = (seancesParType[seance.type] ?? 0) + 1
  }

  const dateFin = dateLaPlusTardive(plan.seances)
  const nombreSemaines =
    plan.seances.length === 0
      ? 0
      : numeroDeSemaineProgramme(plan.dateDebut, dateLaPlusTardive(plan.seances))

  const nouveaux: string[] = []
  const misAJour: string[] = []
  for (const [id, definition] of exercicesDuPlan) {
    if (bibliothequeParId.has(id)) misAJour.push(definition.nom)
    else nouveaux.push(definition.nom)
  }

  return {
    nom: plan.nom,
    ...(plan.description ? { description: plan.description } : {}),
    dateDebut: plan.dateDebut,
    dateFin,
    nombreSemaines,
    nombreSeances: plan.seances.filter((seance) => seance.type !== 'repos').length,
    nombreJoursDeRepos: plan.seances.filter((seance) => seance.type === 'repos').length,
    seancesParType,
    exercicesNouveaux: nouveaux,
    exercicesMisAJour: misAJour,
    erreurs,
    avertissements,
    applicable: erreurs.length === 0,
  }
}

// ------------------------------------------------------------- conversion

function convertirExercice(
  definition: ExerciceDuPlan,
  id: Id,
  creeLe: string,
): Exercice {
  return {
    id,
    nom: definition.nom,
    categorie: definition.categorie,
    description: definition.description,
    musclesTravailles: definition.musclesTravailles,
    contreIndications: definition.contreIndications,
    impactGenou: definition.impactGenou,
    flexionMarquee: definition.flexionMarquee,
    materielRequis: definition.materielRequis,
    origine: 'import',
    creeLe,
    ...(definition.varianteFacileId ? { varianteFacileId: definition.varianteFacileId } : {}),
    ...(definition.varianteDifficileId
      ? { varianteDifficileId: definition.varianteDifficileId }
      : {}),
    ...(definition.consigneSecurite ? { consigneSecurite: definition.consigneSecurite } : {}),
  }
}

export interface OptionsConversion {
  mode: ModeImport
  /** Programme actif. Nécessaire en mode fusion, ignoré en remplacement. */
  programmeActif?: Programme
  /** Numéro de la version créée en mode remplacement. */
  version: number
  maintenant?: Date
  nouvelId?: FabriqueId
}

export interface ElementsAEcrire {
  exercices: Exercice[]
  programme: Programme
  /** Faux en mode fusion : les séances rejoignent le programme existant. */
  nouveauProgramme: boolean
  seances: SeancePrevue[]
}

/**
 * Transforme un plan contrôlé en entités prêtes à écrire.
 *
 * En mode fusion, les séances rejoignent le programme actif et les semaines
 * sont numérotées depuis *sa* date de début, pour qu'elles s'alignent sur le
 * programme en cours. En mode remplacement, une nouvelle version de programme
 * est créée — l'ancienne n'est pas touchée (chapitre 7).
 */
export function convertirPlan(plan: PlanImporte, options: OptionsConversion): ElementsAEcrire {
  const maintenant = options.maintenant ?? new Date()
  const creeLe = maintenantIso(maintenant)
  const fabrique = options.nouvelId ?? nouvelIdParDefaut

  const fusion = options.mode === 'fusionner' && options.programmeActif !== undefined
  const programmeExistant = options.programmeActif

  const derniereDate = dateLaPlusTardive(plan.seances)
  const premiereDate = dateLaPlusTot(plan.seances)

  let programme: Programme
  if (fusion && programmeExistant) {
    programme = {
      ...programmeExistant,
      // Le programme s'étend si le plan déborde de sa fenêtre actuelle.
      dateFin: derniereDate > programmeExistant.dateFin ? derniereDate : programmeExistant.dateFin,
    }
  } else {
    programme = {
      id: fabrique(),
      version: options.version,
      dateDebut: plan.dateDebut < premiereDate ? plan.dateDebut : premiereDate,
      dateFin: derniereDate,
      motifRevision: 'import du plan « ' + plan.nom + ' »',
      actif: true,
      creeLe,
      ...(programmeExistant ? { versionPrecedenteId: programmeExistant.id } : {}),
    }
  }

  const referenceSemaines = programme.dateDebut

  const exercices = plan.exercices.map((definition) =>
    convertirExercice(definition, idExerciceDuPlan(definition), creeLe),
  )

  const seances: SeancePrevue[] = plan.seances.map((seance) => ({
    id: fabrique(),
    programmeId: programme.id,
    date: seance.date,
    semaine: numeroDeSemaineProgramme(referenceSemaines, seance.date),
    type: seance.type,
    titre: seance.titre,
    exercices: seance.exercices.map((reference, index) => ({
      exerciceId: reference.exerciceId,
      ordre: index + 1,
      cibles: reference.cibles,
      ...(reference.consigne ? { consigne: reference.consigne } : {}),
    })),
    statut: 'a-faire',
    creeLe,
    ...(seance.notes ? { notes: seance.notes } : {}),
  }))

  return { exercices, programme, nouveauProgramme: !fusion, seances }
}
