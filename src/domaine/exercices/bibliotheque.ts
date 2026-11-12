/**
 * Bibliothèque d'exercices de départ.
 *
 * Elle couvre les quatre types de séances du chapitre 3 (marche rapide,
 * renforcement sans matériel, natation douce, mobilité) plus le vélo, et
 * respecte les précautions du chapitre 10 pour le genou.
 *
 * Trois points de conception :
 *
 * 1. Un exercice décrit un mouvement, pas une dose. « 30 minutes » n'est pas
 *    un exercice : c'est une cible portée par la séance. C'est ce qui permet au
 *    moteur de progression de faire varier la charge sans toucher à la
 *    bibliothèque.
 * 2. Les variantes forment des chaînes cohérentes : si A désigne B comme
 *    variante plus difficile, B désigne A comme variante plus facile. Les tests
 *    vérifient l'invariant, parce que c'est lui qui rend fiables les deux
 *    règles du chapitre 5 qui changent d'exercice.
 * 3. Les exercices à risque pour le genou (course, sauts, squats profonds)
 *    figurent dans la bibliothèque et portent un impact `eleve`. Ils sont
 *    écartés par défaut par les précautions du profil, mais visibles : mieux
 *    vaut montrer pourquoi un exercice est exclu que le faire disparaître, et
 *    l'utilisateur reste libre de lever la précaution (chapitre 10).
 */
import { maintenantIso } from '../dates'
import type { Exercice } from '../entites'

/** Un exercice de la bibliothèque, avant horodatage. */
type DefinitionExercice = Omit<Exercice, 'creeLe' | 'origine'>

const DEFINITIONS: DefinitionExercice[] = [
  // ---------------------------------------------------------------- marche
  {
    id: 'marche-tranquille',
    nom: 'Marche tranquille',
    categorie: 'marche',
    description: 'Marche à allure de promenade, respiration libre.',
    musclesTravailles: ['jambes', 'endurance'],
    varianteDifficileId: 'marche-rapide',
    contreIndications: [],
    impactGenou: 'faible',
    flexionMarquee: false,
    materielRequis: ['aucun'],
  },
  {
    id: 'marche-rapide',
    nom: 'Marche rapide',
    categorie: 'marche',
    description:
      'Allure soutenue où l’on peut encore tenir une conversation sans être essoufflé.',
    musclesTravailles: ['jambes', 'fessiers', 'endurance'],
    varianteFacileId: 'marche-tranquille',
    varianteDifficileId: 'marche-avec-denivele',
    contreIndications: [],
    impactGenou: 'faible',
    flexionMarquee: false,
    materielRequis: ['aucun'],
    consigneSecurite:
      'Ralentir dès que la conversation devient difficile. Arrêter en cas de douleur à la poitrine, de vertige ou de palpitations.',
  },
  {
    id: 'marche-avec-denivele',
    nom: 'Marche avec dénivelé',
    categorie: 'marche',
    description: 'Même allure, sur un parcours montant ou en côte.',
    musclesTravailles: ['jambes', 'fessiers', 'endurance'],
    varianteFacileId: 'marche-rapide',
    contreIndications: ['Descente prolongée : charge importante pour le genou.'],
    impactGenou: 'modere',
    flexionMarquee: false,
    materielRequis: ['aucun'],
    consigneSecurite:
      'Descendre lentement, à petits pas : c’est la descente, pas la montée, qui sollicite le genou.',
  },

  // ------------------------------------------------------------------ vélo
  {
    id: 'velo-souple',
    nom: 'Vélo, pédalage souple',
    categorie: 'velo',
    description: 'Pédalage régulier à faible résistance, selle assez haute.',
    musclesTravailles: ['cuisses', 'endurance'],
    varianteDifficileId: 'velo-resistance',
    contreIndications: [],
    impactGenou: 'faible',
    flexionMarquee: false,
    materielRequis: ['velo'],
    consigneSecurite:
      'Régler la selle pour que la jambe reste presque tendue en bas du pédalage : une selle basse force le genou.',
  },
  {
    id: 'velo-resistance',
    nom: 'Vélo avec résistance',
    categorie: 'velo',
    description: 'Pédalage contre une résistance modérée, cadence plus lente.',
    musclesTravailles: ['cuisses', 'fessiers', 'endurance'],
    varianteFacileId: 'velo-souple',
    contreIndications: ['Résistance élevée à faible cadence : contrainte sur le genou.'],
    impactGenou: 'modere',
    flexionMarquee: false,
    materielRequis: ['velo'],
  },

  // --------------------------------------------------------------- natation
  {
    id: 'battements-avec-planche',
    nom: 'Battements avec planche',
    categorie: 'natation',
    description: 'Battements de jambes, bras tendus sur une planche.',
    musclesTravailles: ['jambes', 'gainage'],
    varianteDifficileId: 'nage-crawl',
    contreIndications: [],
    impactGenou: 'faible',
    flexionMarquee: false,
    materielRequis: ['piscine'],
  },
  {
    id: 'nage-crawl',
    nom: 'Crawl',
    categorie: 'natation',
    description: 'Nage ventrale, battements de jambes tendues.',
    musclesTravailles: ['dos', 'épaules', 'jambes', 'endurance'],
    varianteFacileId: 'battements-avec-planche',
    varianteDifficileId: 'nage-crawl-continu',
    contreIndications: [],
    impactGenou: 'faible',
    flexionMarquee: false,
    materielRequis: ['piscine'],
    consigneSecurite:
      'Jamais d’apnée ni d’hyperventilation, et jamais seul dans le bassin.',
  },
  {
    id: 'nage-crawl-continu',
    nom: 'Crawl continu',
    categorie: 'natation',
    description: 'Plusieurs longueurs enchaînées sans arrêt au bord.',
    musclesTravailles: ['dos', 'épaules', 'jambes', 'endurance'],
    varianteFacileId: 'nage-crawl',
    contreIndications: [],
    impactGenou: 'faible',
    flexionMarquee: false,
    materielRequis: ['piscine'],
    consigneSecurite:
      'Jamais d’apnée ni d’hyperventilation, et jamais seul dans le bassin.',
  },
  {
    id: 'nage-dos',
    nom: 'Dos crawlé',
    categorie: 'natation',
    description: 'Nage sur le dos, battements de jambes tendues.',
    musclesTravailles: ['dos', 'épaules', 'jambes'],
    contreIndications: [],
    impactGenou: 'faible',
    flexionMarquee: false,
    materielRequis: ['piscine'],
  },
  {
    id: 'nage-brasse',
    nom: 'Brasse',
    categorie: 'natation',
    description: 'Nage ventrale à ciseau de jambes.',
    musclesTravailles: ['pectoraux', 'dos', 'jambes'],
    contreIndications: [
      'Le battement de brasse demande une flexion marquée et une rotation du genou.',
    ],
    impactGenou: 'modere',
    flexionMarquee: true,
    materielRequis: ['piscine'],
    consigneSecurite:
      'Signalé pour le genou : préférer le crawl ou le dos. En brasse, garder l’amplitude de jambes réduite et arrêter à la moindre gêne.',
  },

  // ----------------------------------------------------------- renforcement
  {
    id: 'squat-sur-chaise',
    nom: 'Squat sur chaise',
    categorie: 'renforcement',
    description: 'S’asseoir puis se relever d’une chaise, sans s’aider des mains.',
    musclesTravailles: ['cuisses', 'fessiers'],
    varianteDifficileId: 'squat-mi-amplitude',
    contreIndications: [],
    impactGenou: 'faible',
    flexionMarquee: false,
    materielRequis: ['aucun'],
    consigneSecurite:
      'Genoux dans l’axe des pieds, descente contrôlée. La chaise limite l’amplitude : c’est voulu.',
  },
  {
    id: 'squat-mi-amplitude',
    nom: 'Squat à mi-amplitude',
    categorie: 'renforcement',
    description: 'Flexion des genoux jusqu’à mi-course, sans descendre plus bas.',
    musclesTravailles: ['cuisses', 'fessiers'],
    varianteFacileId: 'squat-sur-chaise',
    contreIndications: [],
    impactGenou: 'modere',
    flexionMarquee: false,
    materielRequis: ['aucun'],
    consigneSecurite: 'Ne pas dépasser l’angle droit au genou.',
  },
  {
    id: 'squat-profond',
    nom: 'Squat profond',
    categorie: 'renforcement',
    description: 'Flexion complète des genoux, fessiers près des talons.',
    musclesTravailles: ['cuisses', 'fessiers'],
    varianteFacileId: 'squat-mi-amplitude',
    contreIndications: [
      'Écarté par défaut après une chirurgie du ligament croisé ou du ménisque.',
    ],
    impactGenou: 'eleve',
    flexionMarquee: true,
    materielRequis: ['aucun'],
    consigneSecurite:
      'Exclu par défaut pour le genou. À ne réintroduire qu’avec un avis médical.',
  },
  {
    id: 'pont-fessier',
    nom: 'Pont fessier',
    categorie: 'renforcement',
    description: 'Allongé sur le dos, genoux fléchis, décoller le bassin.',
    musclesTravailles: ['fessiers', 'ischio-jambiers', 'lombaires'],
    varianteDifficileId: 'pont-fessier-une-jambe',
    contreIndications: [],
    impactGenou: 'faible',
    flexionMarquee: false,
    materielRequis: ['tapis'],
  },
  {
    id: 'pont-fessier-une-jambe',
    nom: 'Pont fessier sur une jambe',
    categorie: 'renforcement',
    description: 'Même mouvement, une jambe tendue en l’air.',
    musclesTravailles: ['fessiers', 'ischio-jambiers', 'gainage'],
    varianteFacileId: 'pont-fessier',
    contreIndications: [],
    impactGenou: 'faible',
    flexionMarquee: false,
    materielRequis: ['tapis'],
  },
  {
    id: 'pompes-contre-mur',
    nom: 'Pompes contre le mur',
    categorie: 'renforcement',
    description: 'Debout face au mur, mains à hauteur d’épaules, fléchir les bras.',
    musclesTravailles: ['pectoraux', 'triceps', 'épaules'],
    varianteDifficileId: 'pompes-inclinees',
    contreIndications: [],
    impactGenou: 'faible',
    flexionMarquee: false,
    materielRequis: ['aucun'],
  },
  {
    id: 'pompes-inclinees',
    nom: 'Pompes inclinées',
    categorie: 'renforcement',
    description: 'Mains posées sur une table ou un plan de travail, corps gainé.',
    musclesTravailles: ['pectoraux', 'triceps', 'gainage'],
    varianteFacileId: 'pompes-contre-mur',
    varianteDifficileId: 'pompes-au-sol',
    contreIndications: [],
    impactGenou: 'faible',
    flexionMarquee: false,
    materielRequis: ['aucun'],
  },
  {
    id: 'pompes-au-sol',
    nom: 'Pompes au sol',
    categorie: 'renforcement',
    description: 'Pompes classiques, appui sur les mains et la pointe des pieds.',
    musclesTravailles: ['pectoraux', 'triceps', 'gainage'],
    varianteFacileId: 'pompes-inclinees',
    contreIndications: [],
    impactGenou: 'faible',
    flexionMarquee: false,
    materielRequis: ['tapis'],
  },
  {
    id: 'gainage-avant-bras',
    nom: 'Gainage sur les avant-bras',
    categorie: 'renforcement',
    description: 'Planche sur les avant-bras et la pointe des pieds, corps aligné.',
    musclesTravailles: ['abdominaux', 'lombaires', 'épaules'],
    varianteDifficileId: 'gainage-bras-tendus',
    contreIndications: [],
    impactGenou: 'faible',
    flexionMarquee: false,
    materielRequis: ['tapis'],
    consigneSecurite: 'Arrêter dès que le bas du dos se creuse.',
  },
  {
    id: 'gainage-bras-tendus',
    nom: 'Gainage bras tendus',
    categorie: 'renforcement',
    description: 'Même planche, bras tendus.',
    musclesTravailles: ['abdominaux', 'épaules', 'pectoraux'],
    varianteFacileId: 'gainage-avant-bras',
    contreIndications: [],
    impactGenou: 'faible',
    flexionMarquee: false,
    materielRequis: ['tapis'],
  },
  {
    id: 'gainage-lateral',
    nom: 'Gainage latéral',
    categorie: 'renforcement',
    description: 'Sur un avant-bras, de côté, bassin décollé.',
    musclesTravailles: ['obliques', 'fessiers'],
    contreIndications: [],
    impactGenou: 'faible',
    flexionMarquee: false,
    materielRequis: ['tapis'],
  },
  {
    id: 'releve-mollets',
    nom: 'Relevés de mollets',
    categorie: 'renforcement',
    description: 'Debout, monter sur la pointe des pieds puis redescendre lentement.',
    musclesTravailles: ['mollets'],
    contreIndications: [],
    impactGenou: 'faible',
    flexionMarquee: false,
    materielRequis: ['aucun'],
  },
  {
    id: 'montee-sur-marche',
    nom: 'Montée sur marche',
    categorie: 'renforcement',
    description: 'Monter sur une marche basse, une jambe après l’autre, et redescendre.',
    musclesTravailles: ['cuisses', 'fessiers', 'équilibre'],
    contreIndications: ['Marche haute : flexion importante du genou à la montée.'],
    impactGenou: 'modere',
    flexionMarquee: false,
    materielRequis: ['aucun'],
    consigneSecurite: 'Commencer par une marche basse et descendre lentement.',
  },
  {
    id: 'fentes-profondes',
    nom: 'Fentes profondes',
    categorie: 'renforcement',
    description: 'Grand pas en avant, genou arrière proche du sol.',
    musclesTravailles: ['cuisses', 'fessiers'],
    contreIndications: [
      'Écarté par défaut : flexion marquée et appui instable sur le genou avant.',
    ],
    impactGenou: 'eleve',
    flexionMarquee: true,
    materielRequis: ['aucun'],
    consigneSecurite: 'Exclu par défaut pour le genou.',
  },

  // ---------------------------------------------- exercices à fort impact
  {
    id: 'course-a-pied',
    nom: 'Course à pied',
    categorie: 'marche',
    description: 'Course en extérieur ou sur tapis.',
    musclesTravailles: ['jambes', 'endurance'],
    varianteFacileId: 'marche-avec-denivele',
    contreIndications: [
      'Écartée par défaut : impacts répétés sur un genou fragile ou opéré.',
    ],
    impactGenou: 'eleve',
    flexionMarquee: false,
    materielRequis: ['aucun'],
    consigneSecurite:
      'Exclue par défaut. La marche rapide donne les mêmes bénéfices cardio sans les impacts.',
  },
  {
    id: 'sauts-groupes',
    nom: 'Sauts groupés',
    categorie: 'renforcement',
    description: 'Sauts verticaux pieds joints, réception amortie.',
    musclesTravailles: ['jambes', 'fessiers'],
    contreIndications: ['Écartés par défaut : réception à fort impact sur le genou.'],
    impactGenou: 'eleve',
    flexionMarquee: true,
    materielRequis: ['aucun'],
    consigneSecurite: 'Exclus par défaut pour le genou.',
  },
  {
    id: 'corde-a-sauter',
    nom: 'Corde à sauter',
    categorie: 'renforcement',
    description: 'Sauts répétés sur place à la corde.',
    musclesTravailles: ['mollets', 'endurance'],
    contreIndications: ['Écartée par défaut : impacts répétés et nombreux.'],
    impactGenou: 'eleve',
    flexionMarquee: false,
    materielRequis: ['aucun'],
    consigneSecurite: 'Exclue par défaut pour le genou.',
  },

  // --------------------------------------------------------- activité libre
  {
    id: 'activite-libre',
    nom: 'Activité libre',
    categorie: 'autre',
    description:
      'Toute activité notée après coup : une balade, du jardinage, une sortie à vélo improvisée.',
    musclesTravailles: [],
    contreIndications: [],
    impactGenou: 'faible',
    flexionMarquee: false,
    materielRequis: ['aucun'],
  },

  // --------------------------------------------------------------- mobilité
  {
    id: 'etirement-mollets',
    nom: 'Étirement des mollets',
    categorie: 'mobilite',
    description: 'Appui des mains au mur, jambe arrière tendue, talon au sol.',
    musclesTravailles: ['mollets'],
    contreIndications: [],
    impactGenou: 'faible',
    flexionMarquee: false,
    materielRequis: ['aucun'],
  },
  {
    id: 'etirement-ischio-assis',
    nom: 'Étirement des ischio-jambiers, assis',
    categorie: 'mobilite',
    description: 'Assis, une jambe tendue, se pencher vers l’avant sans forcer.',
    musclesTravailles: ['ischio-jambiers', 'lombaires'],
    contreIndications: [],
    impactGenou: 'faible',
    flexionMarquee: false,
    materielRequis: ['tapis'],
  },
  {
    id: 'etirement-quadriceps-debout',
    nom: 'Étirement des quadriceps, debout',
    categorie: 'mobilite',
    description: 'Debout, talon ramené vers la fesse, bassin droit.',
    musclesTravailles: ['quadriceps'],
    contreIndications: ['Flexion complète du genou : à doser avec prudence.'],
    impactGenou: 'modere',
    flexionMarquee: true,
    materielRequis: ['aucun'],
    consigneSecurite:
      'Signalé pour le genou : ne jamais tirer sur la cheville, s’arrêter à la première tension.',
  },
  {
    id: 'mobilite-hanches',
    nom: 'Mobilité des hanches',
    categorie: 'mobilite',
    description: 'Cercles de hanche debout, amplitude progressive.',
    musclesTravailles: ['hanches', 'fessiers'],
    contreIndications: [],
    impactGenou: 'faible',
    flexionMarquee: false,
    materielRequis: ['aucun'],
  },
  {
    id: 'etirement-dos-assis',
    nom: 'Étirement du dos, assis',
    categorie: 'mobilite',
    description: 'Assis, dos arrondi puis redressé lentement, respiration ample.',
    musclesTravailles: ['lombaires', 'dorsaux'],
    contreIndications: [],
    impactGenou: 'faible',
    flexionMarquee: false,
    materielRequis: ['aucun'],
  },
]

/**
 * La bibliothèque de départ, horodatée. L'instant est injectable pour que les
 * tests et l'initialisation restent déterministes.
 */
export function bibliothequeInitiale(maintenant: Date = new Date()): Exercice[] {
  const creeLe = maintenantIso(maintenant)
  return DEFINITIONS.map((definition) => ({
    ...definition,
    origine: 'bibliotheque',
    creeLe,
  }))
}

/** Nombre d'exercices de la bibliothèque de départ. */
export const TAILLE_BIBLIOTHEQUE_INITIALE = DEFINITIONS.length
