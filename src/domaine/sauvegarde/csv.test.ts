import { describe, expect, it } from 'vitest'

import {
  uneHydratation,
  uneMesure,
  unExercice,
  unRepas,
  uneSeanceRealisee,
} from '../../tests/fixtures'
import { csvDesSeances, csvDuJournal } from './csv'

/**
 * La marque d'ordre des octets, nommée plutôt que tapée : le caractère brut
 * dans un fichier source est invisible et se perd au premier copier-coller.
 */
const MARQUE_ORDRE_OCTETS = String.fromCharCode(0xfeff)

const BIBLIOTHEQUE = [
  unExercice({ id: 'marche-rapide', nom: 'Marche rapide' }),
  unExercice({ id: 'squat-sur-chaise', nom: 'Squat sur chaise' }),
]

function lignes(csv: string): string[] {
  const sansMarque = csv.startsWith(MARQUE_ORDRE_OCTETS) ? csv.slice(1) : csv
  return sansMarque.trimEnd().split('\r\n')
}

describe('ouverture dans un tableur', () => {
  it('commence par une marque d’ordre des octets', () => {
    // Sans elle, Excel ouvre le fichier en ANSI et « séance » devient
    // « sÃ©ance ».
    expect(csvDesSeances([], BIBLIOTHEQUE).startsWith(MARQUE_ORDRE_OCTETS)).toBe(true)
    expect(csvDuJournal([], [], []).startsWith(MARQUE_ORDRE_OCTETS)).toBe(true)
  })

  it('sépare les colonnes par des points-virgules', () => {
    // Un Excel français lit la virgule comme séparateur décimal.
    const entete = lignes(csvDesSeances([], BIBLIOTHEQUE))[0]

    expect(entete).toContain(';')
    expect(entete?.startsWith('date;type;titre')).toBe(true)
  })

  it('sépare les lignes par un retour chariot et un saut de ligne', () => {
    expect(csvDesSeances([], BIBLIOTHEQUE)).toContain('\r\n')
  })
})

describe('export des séances', () => {
  const seance = uneSeanceRealisee({
    id: 'r1',
    date: '2026-11-16',
    type: 'renforcement',
    titre: 'Renforcement',
    effort: 6,
    energie: 7,
    exercices: [
      { exerciceId: 'squat-sur-chaise', ordre: 1, reel: { series: 2, repetitions: 10 } },
      { exerciceId: 'marche-rapide', ordre: 2, reel: { dureeMinutes: 20 }, douleur: 3 },
    ],
    douleurs: [{ zone: 'genou', intensite: 3 }],
  })

  it('écrit une ligne par exercice', () => {
    const resultat = lignes(csvDesSeances([seance], BIBLIOTHEQUE))

    expect(resultat).toHaveLength(3) // en-tête + deux exercices
    expect(resultat[1]).toContain('Squat sur chaise')
    expect(resultat[2]).toContain('Marche rapide')
  })

  it('répète les colonnes de la séance sur chaque ligne', () => {
    const resultat = lignes(csvDesSeances([seance], BIBLIOTHEQUE))

    expect(resultat[1]).toContain('2026-11-16')
    expect(resultat[2]).toContain('2026-11-16')
  })

  it('met les mesures en mots, comme à l’écran', () => {
    const resultat = lignes(csvDesSeances([seance], BIBLIOTHEQUE))

    expect(resultat[1]).toContain('2 × 10')
    expect(resultat[2]).toContain('20 min')
  })

  it('garde une ligne pour une séance sautée, sans exercice', () => {
    const sautee = uneSeanceRealisee({
      id: 'r2',
      date: '2026-11-17',
      statut: 'sautee',
      motif: 'meteo',
      exercices: [],
    })

    const resultat = lignes(csvDesSeances([sautee], BIBLIOTHEQUE))
    expect(resultat).toHaveLength(2)
    expect(resultat[1]).toContain('sautee')
    expect(resultat[1]).toContain('meteo')
  })

  it('laisse vides l’effort et l’énergie d’une séance sautée', () => {
    const sautee = uneSeanceRealisee({ id: 'r2', statut: 'sautee', exercices: [] })
    delete sautee.effort
    delete sautee.energie

    expect(lignes(csvDesSeances([sautee], BIBLIOTHEQUE))[1]).toContain(';;')
  })

  it('protège un texte qui contient un point-virgule', () => {
    const avecPointVirgule = uneSeanceRealisee({
      id: 'r3',
      note: 'Vent ; pluie',
      exercices: [],
    })

    expect(lignes(csvDesSeances([avecPointVirgule], BIBLIOTHEQUE))[1]).toContain(
      '"Vent ; pluie"',
    )
  })

  it('double les guillemets d’un texte', () => {
    const avecGuillemets = uneSeanceRealisee({
      id: 'r4',
      note: 'Il a dit "vas-y"',
      exercices: [],
    })

    expect(lignes(csvDesSeances([avecGuillemets], BIBLIOTHEQUE))[1]).toContain(
      '"Il a dit ""vas-y"""',
    )
  })

  it('trie par date', () => {
    const resultat = lignes(
      csvDesSeances(
        [
          uneSeanceRealisee({ id: 'b', date: '2026-11-20', exercices: [] }),
          uneSeanceRealisee({ id: 'a', date: '2026-11-16', exercices: [] }),
        ],
        BIBLIOTHEQUE,
      ),
    )

    expect(resultat[1]).toContain('2026-11-16')
    expect(resultat[2]).toContain('2026-11-20')
  })
})

describe('export du journal', () => {
  const repas = [
    unRepas({ id: 'r1', date: '2026-11-16', moment: 'dejeuner', description: 'Poulet, riz' }),
    unRepas({
      id: 'r2',
      date: '2026-11-16',
      moment: 'diner',
      description: 'Soupe',
      bilanRapide: { legumes: true, proteines: false, boissonSucree: true, copieux: false },
    }),
  ]

  it('écrit une ligne par jour', () => {
    const resultat = lignes(
      csvDuJournal(repas, [uneHydratation({ date: '2026-11-16', verres: 6 })], []),
    )

    expect(resultat).toHaveLength(2)
    expect(resultat[1]).toContain('Poulet, riz')
    expect(resultat[1]).toContain('Soupe')
  })

  it('résume les repères du jour', () => {
    const resultat = lignes(csvDuJournal(repas, [], []))

    // Légumes aux deux repas principaux, protéines à un seul, une boisson
    // sucrée dans la journée.
    expect(resultat[1]).toContain(';oui;non;oui;')
  })

  it('met l’eau et les mesures sur la même ligne', () => {
    const resultat = lignes(
      csvDuJournal(
        repas,
        [uneHydratation({ date: '2026-11-16', verres: 6, objectif: 8 })],
        [uneMesure({ id: 'm1', date: '2026-11-16', poidsKg: 92, tourTailleCm: 104 })],
      ),
    )

    expect(resultat[1]?.endsWith('6;8;92;104')).toBe(true)
  })

  it('garde un jour qui n’a qu’une pesée', () => {
    const resultat = lignes(
      csvDuJournal([], [], [uneMesure({ id: 'm1', date: '2026-11-23', poidsKg: 91 })]),
    )

    expect(resultat).toHaveLength(2)
    expect(resultat[1]).toContain('2026-11-23')
  })

  it('rend un fichier avec son seul en-tête quand il n’y a rien', () => {
    expect(lignes(csvDuJournal([], [], []))).toHaveLength(1)
  })
})
