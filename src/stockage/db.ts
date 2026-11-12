/**
 * Base IndexedDB de l'application, via Dexie.
 *
 * C'est le seul fichier qui connaît IndexedDB. Le domaine ne l'importe jamais :
 * il reçoit et rend des objets, les dépôts s'occupent de les ranger.
 *
 * Les neuf tables du chapitre 7 sont déclarées dès la version 1, même celles
 * que les étapes suivantes utiliseront : cela évite une migration de schéma
 * dès que l'alimentation arrive, et un schéma vide ne coûte rien.
 *
 * Attention aux index : IndexedDB n'accepte comme clé qu'un nombre, une chaîne,
 * une date, un binaire ou un tableau. Un booléen n'est pas indexable, donc
 * `Programme.actif` et `Repas.bilanRapide` ne figurent pas dans les index ; on
 * les filtre en mémoire, sur des volumes qui restent minuscules.
 */
import Dexie, { type EntityTable } from 'dexie'

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
} from '../domaine/entites'

/** Nom de la base dans le navigateur. Les tests en créent une par cas. */
export const NOM_BASE = 'remise-en-forme'

export class BaseForme extends Dexie {
  profil!: EntityTable<Profil, 'id'>
  exercices!: EntityTable<Exercice, 'id'>
  programmes!: EntityTable<Programme, 'id'>
  seancesPrevues!: EntityTable<SeancePrevue, 'id'>
  seancesRealisees!: EntityTable<SeanceRealisee, 'id'>
  bilans!: EntityTable<BilanHebdo, 'id'>
  repas!: EntityTable<Repas, 'id'>
  hydratation!: EntityTable<Hydratation, 'date'>
  mesures!: EntityTable<MesureCorporelle, 'id'>

  constructor(nom: string = NOM_BASE) {
    super(nom)

    this.version(1).stores({
      profil: 'id',
      exercices: 'id, categorie, impactGenou, origine',
      programmes: 'id, version, dateDebut',
      seancesPrevues: 'id, programmeId, date, statut, [programmeId+semaine]',
      seancesRealisees: 'id, date, seancePrevueId, type, statut',
      bilans: 'id, programmeId, semaine, decision',
      repas: 'id, date, moment, [date+moment]',
      hydratation: 'date',
      mesures: 'id, date',
    })
  }
}

/** Base partagée par l'application. Les tests passent leur propre instance. */
export const db = new BaseForme()
