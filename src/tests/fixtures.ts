/**
 * Constructeurs d'entités pour les tests.
 *
 * Chacun rend une entité valide et complète, dont on ne surcharge que les
 * champs qui comptent pour le cas testé. Un test reste ainsi lisible : ce
 * qu'on y voit écrit est exactement ce qui est en jeu.
 */
import { ID_PROFIL } from '../domaine/entites'
import type {
  BilanHebdo,
  Exercice,
  Hydratation,
  MesureCorporelle,
  Profil,
  Programme,
  Repas,
  SeancePrevue,
  SeanceRealisee,
  StatistiquesSemaine,
} from '../domaine/entites'

const HORODATAGE = '2026-11-12T08:00:00.000Z'

export function unExercice(modifications: Partial<Exercice> = {}): Exercice {
  return {
    id: 'marche-rapide',
    nom: 'Marche rapide',
    categorie: 'marche',
    description: 'Allure où l’on peut encore parler.',
    musclesTravailles: ['jambes', 'cardio'],
    contreIndications: [],
    impactGenou: 'faible',
    flexionMarquee: false,
    materielRequis: ['aucun'],
    origine: 'bibliotheque',
    creeLe: HORODATAGE,
    ...modifications,
  }
}

export function unProfil(modifications: Partial<Profil> = {}): Profil {
  return {
    id: ID_PROFIL,
    dateDebut: '2026-11-12',
    materiel: ['aucun'],
    antecedents: [],
    precautions: {
      impactGenouMaximal: 'modere',
      exclureFlexionMarquee: false,
      exercicesExclusIds: [],
    },
    niveauDepart: {},
    objectifs: [],
    unites: 'metrique',
    alerteSante: null,
    avertissementSanteAccepte: false,
    objectifVerresEau: 8,
    masquerPoids: false,
    misAJourLe: HORODATAGE,
    ...modifications,
  }
}

export function unProgramme(modifications: Partial<Programme> = {}): Programme {
  return {
    id: 'programme-1',
    version: 1,
    dateDebut: '2026-11-12',
    dateFin: '2027-02-03',
    motifRevision: 'programme initial',
    actif: true,
    creeLe: HORODATAGE,
    ...modifications,
  }
}

export function uneSeancePrevue(modifications: Partial<SeancePrevue> = {}): SeancePrevue {
  return {
    id: 'prevue-1',
    programmeId: 'programme-1',
    date: '2026-11-12',
    semaine: 1,
    type: 'marche',
    titre: 'Marche rapide 30 min',
    exercices: [
      {
        exerciceId: 'marche-rapide',
        ordre: 1,
        cibles: { dureeMinutes: 30 },
      },
    ],
    statut: 'a-faire',
    creeLe: HORODATAGE,
    ...modifications,
  }
}

export function uneSeanceRealisee(modifications: Partial<SeanceRealisee> = {}): SeanceRealisee {
  return {
    id: 'realisee-1',
    seancePrevueId: 'prevue-1',
    date: '2026-11-12',
    type: 'marche',
    titre: 'Marche rapide 30 min',
    statut: 'faite',
    exercices: [
      {
        exerciceId: 'marche-rapide',
        ordre: 1,
        reel: { dureeMinutes: 30 },
      },
    ],
    effort: 5,
    energie: 7,
    douleurs: [],
    saisieLe: HORODATAGE,
    ...modifications,
  }
}

export function desStatistiques(
  modifications: Partial<StatistiquesSemaine> = {},
): StatistiquesSemaine {
  return {
    semaine: 1,
    debut: '2026-11-16',
    fin: '2026-11-22',
    seancesPrevues: 3,
    seancesFaites: 3,
    seancesPartielles: 0,
    seancesSautees: 0,
    seancesImprovisees: 0,
    tauxRealisation: 1,
    effortMoyen: 5,
    energieMoyenne: 7,
    douleurMaximale: 0,
    douleursParExercice: {},
    motifs: {},
    ...modifications,
  }
}

export function unBilan(modifications: Partial<BilanHebdo> = {}): BilanHebdo {
  return {
    id: 'bilan-1',
    programmeId: 'programme-1',
    semaine: 1,
    debut: '2026-11-16',
    fin: '2026-11-22',
    statistiques: desStatistiques(),
    ressentiCharge: null,
    reglesAppliquees: [],
    ajustements: [],
    decision: 'en-attente',
    genereLe: HORODATAGE,
    ...modifications,
  }
}

/** Bilan d'une semaine où la charge a augmenté, et qui a été accepté. */
export function unBilanDeProgression(modifications: Partial<BilanHebdo> = {}): BilanHebdo {
  const explication = '+10 % car 3 séances sur 3 réalisées, effort 5/10.'
  return unBilan({
    reglesAppliquees: [
      { cle: 'augmenter', libelle: 'Augmenter la charge', explication },
    ],
    ajustements: [{ regle: 'augmenter', levier: 'duree', facteur: 1.1, explication }],
    decision: 'accepte',
    ...modifications,
  })
}

export function unRepas(modifications: Partial<Repas> = {}): Repas {
  return {
    id: 'repas-1',
    date: '2026-11-12',
    moment: 'dejeuner',
    description: 'Poulet, riz, haricots verts',
    bilanRapide: {
      legumes: true,
      proteines: true,
      boissonSucree: false,
      copieux: false,
    },
    saisieLe: HORODATAGE,
    ...modifications,
  }
}

export function uneHydratation(modifications: Partial<Hydratation> = {}): Hydratation {
  return {
    date: '2026-11-12',
    verres: 5,
    objectif: 8,
    misAJourLe: HORODATAGE,
    ...modifications,
  }
}

export function uneMesure(modifications: Partial<MesureCorporelle> = {}): MesureCorporelle {
  return {
    id: 'mesure-1',
    date: '2026-11-12',
    poidsKg: 92,
    tourTailleCm: 104,
    saisieLe: HORODATAGE,
    ...modifications,
  }
}
