import { describe, expect, it } from 'vitest'

import { ORDRE_IMPACT_GENOU, type Exercice } from '../entites'
import { versSlug } from '../identifiants'
import { TAILLE_BIBLIOTHEQUE_INITIALE, bibliothequeInitiale } from './bibliotheque'

const bibliotheque = bibliothequeInitiale(new Date('2026-11-12T08:00:00.000Z'))
const parId = new Map(bibliotheque.map((exercice) => [exercice.id, exercice]))

/** Les exercices qui déclarent une variante, avec le sens de la variante. */
function variantes(sens: 'varianteFacileId' | 'varianteDifficileId'): [Exercice, Exercice][] {
  const paires: [Exercice, Exercice][] = []
  for (const exercice of bibliotheque) {
    const cibleId = exercice[sens]
    if (!cibleId) continue
    const cible = parId.get(cibleId)
    if (cible) paires.push([exercice, cible])
  }
  return paires
}

describe('horodatage', () => {
  it('marque chaque exercice comme venant de la bibliothèque', () => {
    expect(bibliotheque.every((exercice) => exercice.origine === 'bibliotheque')).toBe(true)
  })

  it('utilise l’instant fourni', () => {
    expect(bibliotheque[0]?.creeLe).toBe('2026-11-12T08:00:00.000Z')
  })

  it('annonce la bonne taille', () => {
    expect(bibliotheque).toHaveLength(TAILLE_BIBLIOTHEQUE_INITIALE)
    expect(bibliotheque.length).toBeGreaterThan(20)
  })
})

describe('identifiants', () => {
  it('sont uniques', () => {
    expect(parId.size).toBe(bibliotheque.length)
  })

  it('sont des slugs, donc lisibles et modifiables à la main dans un plan JSON', () => {
    for (const exercice of bibliotheque) {
      expect(versSlug(exercice.id)).toBe(exercice.id)
    }
  })
})

describe('chaînes de variantes', () => {
  it('ne pointent jamais vers un exercice inexistant', () => {
    for (const exercice of bibliotheque) {
      if (exercice.varianteFacileId) {
        expect(parId.has(exercice.varianteFacileId)).toBe(true)
      }
      if (exercice.varianteDifficileId) {
        expect(parId.has(exercice.varianteDifficileId)).toBe(true)
      }
    }
  })

  it('ne se contredisent pas', () => {
    // Un lien peut rester à sens unique — course à pied redescend vers la
    // marche sans que la marche y remonte. Ce qui est interdit, c'est qu'il
    // désigne autre chose en retour.
    for (const [exercice, facile] of variantes('varianteFacileId')) {
      if (facile.varianteDifficileId) {
        expect(facile.varianteDifficileId).toBe(exercice.id)
      }
    }
    for (const [exercice, difficile] of variantes('varianteDifficileId')) {
      if (difficile.varianteFacileId) {
        expect(difficile.varianteFacileId).toBe(exercice.id)
      }
    }
  })

  it('ne boucle pas sur elle-même', () => {
    for (const exercice of bibliotheque) {
      expect(exercice.varianteFacileId).not.toBe(exercice.id)
      expect(exercice.varianteDifficileId).not.toBe(exercice.id)
    }
  })

  it('ne rend jamais le genou plus exposé en descendant d’un cran', () => {
    // C'est l'invariant qui rend fiable la règle « douleur signalée deux fois
    // sur le même exercice : le remplacer par une variante plus douce ».
    for (const [exercice, facile] of variantes('varianteFacileId')) {
      expect(ORDRE_IMPACT_GENOU[facile.impactGenou]).toBeLessThanOrEqual(
        ORDRE_IMPACT_GENOU[exercice.impactGenou],
      )
    }
  })

  it('ne rend jamais le genou moins exposé en montant d’un cran', () => {
    for (const [exercice, difficile] of variantes('varianteDifficileId')) {
      expect(ORDRE_IMPACT_GENOU[difficile.impactGenou]).toBeGreaterThanOrEqual(
        ORDRE_IMPACT_GENOU[exercice.impactGenou],
      )
    }
  })

  it('n’ouvre aucun chemin de progression vers un exercice à fort impact', () => {
    // Un palier atteint ne doit jamais proposer tout seul un squat profond,
    // une course ou des sauts : ces exercices n'ont pas de parent qui y mène.
    for (const [, difficile] of variantes('varianteDifficileId')) {
      expect(difficile.impactGenou).not.toBe('eleve')
    }
  })
})

describe('précautions du chapitre 10', () => {
  it('signale toujours pourquoi un exercice à fort impact est à risque', () => {
    const fortImpact = bibliotheque.filter((exercice) => exercice.impactGenou === 'eleve')

    expect(fortImpact.length).toBeGreaterThan(0)
    for (const exercice of fortImpact) {
      expect(exercice.contreIndications.length).toBeGreaterThan(0)
      expect(exercice.consigneSecurite).toBeTruthy()
    }
  })

  it('accompagne chaque mouvement à flexion marquée d’une contre-indication', () => {
    const flexion = bibliotheque.filter((exercice) => exercice.flexionMarquee)

    expect(flexion.length).toBeGreaterThan(0)
    for (const exercice of flexion) {
      expect(exercice.contreIndications.length).toBeGreaterThan(0)
    }
  })

  it('signale le battement de brasse, nommé par le chapitre 10', () => {
    const brasse = parId.get('nage-brasse')
    expect(brasse?.flexionMarquee).toBe(true)
  })

  it('garde la course, les sauts et le squat profond visibles mais à fort impact', () => {
    for (const id of ['course-a-pied', 'sauts-groupes', 'squat-profond', 'fentes-profondes']) {
      expect(parId.get(id)?.impactGenou).toBe('eleve')
    }
  })

  it('rappelle de ne pas nager seul ni en apnée', () => {
    const crawl = parId.get('nage-crawl')
    expect(crawl?.consigneSecurite).toMatch(/apnée/)
    expect(crawl?.consigneSecurite).toMatch(/seul/)
  })
})

describe('couverture du programme de départ du chapitre 3', () => {
  it('fournit les quatre types de séances', () => {
    const categories = new Set(bibliotheque.map((exercice) => exercice.categorie))
    expect(categories).toContain('marche')
    expect(categories).toContain('renforcement')
    expect(categories).toContain('natation')
    expect(categories).toContain('mobilite')
  })

  it('fournit les exercices nommés par le programme des semaines 1 à 4', () => {
    // « Squats sur chaise, pompes contre mur, gainage 20 s » et la marche rapide.
    for (const id of [
      'marche-rapide',
      'squat-sur-chaise',
      'pompes-contre-mur',
      'gainage-avant-bras',
    ]) {
      expect(parId.get(id)?.impactGenou).toBe('faible')
    }
  })

  it('permet une séance de renforcement et une de mobilité sans aucun matériel', () => {
    const sansMateriel = (categorie: string) =>
      bibliotheque.filter(
        (exercice) =>
          exercice.categorie === categorie &&
          exercice.impactGenou === 'faible' &&
          exercice.materielRequis.every((materiel) => materiel === 'aucun'),
      )

    expect(sansMateriel('renforcement').length).toBeGreaterThanOrEqual(2)
    expect(sansMateriel('mobilite').length).toBeGreaterThanOrEqual(2)
    expect(sansMateriel('marche').length).toBeGreaterThanOrEqual(1)
  })

  it('privilégie le crawl et le vélo, activités retenues par le chapitre 10', () => {
    expect(parId.get('nage-crawl')?.impactGenou).toBe('faible')
    expect(parId.get('velo-souple')?.impactGenou).toBe('faible')
  })
})
