import { describe, expect, it } from 'vitest'

import { bibliothequeInitiale } from '../exercices/bibliotheque'
import type { Exercice, Materiel, Precautions } from '../entites'
import {
  contexteDepuisProfil,
  evaluerExercice,
  exerciceAutorise,
  exercicesAutorises,
  exercicesEcartes,
  type ContexteExercices,
} from './precautions'
import { profilParDefaut } from './profil-par-defaut'

const bibliotheque = bibliothequeInitiale(new Date('2026-11-12T08:00:00.000Z'))
const parId = new Map(bibliotheque.map((exercice) => [exercice.id, exercice]))

function exercice(id: string): Exercice {
  const trouve = parId.get(id)
  if (!trouve) throw new Error('Exercice absent de la bibliothèque de test : ' + id)
  return trouve
}

const contexteParDefaut = contexteDepuisProfil(profilParDefaut())

function contexte(
  precautions: Partial<Precautions> = {},
  materiel: Materiel[] = ['tapis', 'piscine', 'velo'],
): ContexteExercices {
  return {
    precautions: {
      impactGenouMaximal: 'modere',
      exclureFlexionMarquee: false,
      exercicesExclusIds: [],
      ...precautions,
    },
    materiel,
  }
}

describe('précautions par défaut', () => {
  it('écarte la course, les sauts, la corde et les flexions profondes', () => {
    for (const id of [
      'course-a-pied',
      'sauts-groupes',
      'corde-a-sauter',
      'squat-profond',
      'fentes-profondes',
    ]) {
      expect(exerciceAutorise(exercice(id), contexteParDefaut)).toBe(false)
    }
  })

  it('laisse passer tout le programme de départ du chapitre 3', () => {
    for (const id of [
      'marche-rapide',
      'squat-sur-chaise',
      'pompes-contre-mur',
      'gainage-avant-bras',
      'nage-crawl',
      'etirement-mollets',
    ]) {
      expect(exerciceAutorise(exercice(id), contexteParDefaut)).toBe(true)
    }
  })

  it('autorise la brasse mais la signale, comme le demande le chapitre 10', () => {
    const verdict = evaluerExercice(exercice('nage-brasse'), contexteParDefaut)

    expect(verdict.autorise).toBe(true)
    expect(verdict.signalements.join(' ')).toMatch(/flexion marquée/)
  })

  it('signale l’impact modéré sans l’écarter', () => {
    const verdict = evaluerExercice(exercice('marche-avec-denivele'), contexteParDefaut)

    expect(verdict.autorise).toBe(true)
    expect(verdict.signalements.join(' ')).toMatch(/impact modéré/i)
  })

  it('ne signale rien sur un exercice à faible impact', () => {
    expect(evaluerExercice(exercice('marche-rapide'), contexteParDefaut).signalements).toEqual(
      [],
    )
  })
})

describe('plafond d’impact resserré', () => {
  it('écarte aussi les exercices à impact modéré', () => {
    const strict = contexte({ impactGenouMaximal: 'faible' })

    for (const id of [
      'marche-avec-denivele',
      'squat-mi-amplitude',
      'velo-resistance',
      'nage-brasse',
      'montee-sur-marche',
      'etirement-quadriceps-debout',
    ]) {
      expect(exerciceAutorise(exercice(id), strict)).toBe(false)
    }
  })

  it('laisse quand même de quoi s’entraîner', () => {
    const strict = contexte({ impactGenouMaximal: 'faible' })
    const autorises = exercicesAutorises(bibliotheque, strict)

    expect(autorises.length).toBeGreaterThanOrEqual(15)
    expect(autorises.map((e) => e.categorie)).toContain('marche')
    expect(autorises.map((e) => e.categorie)).toContain('renforcement')
    expect(autorises.map((e) => e.categorie)).toContain('mobilite')
  })

  it('explique le refus en nommant le plafond', () => {
    const verdict = evaluerExercice(
      exercice('squat-mi-amplitude'),
      contexte({ impactGenouMaximal: 'faible' }),
    )

    expect(verdict.autorise).toBe(false)
    expect(verdict.exclusions[0]?.raison).toBe('impact-genou')
    expect(verdict.exclusions[0]?.explication).toMatch(/plafond/)
    expect(verdict.exclusions[0]?.explication).toMatch(/faible/)
  })
})

describe('exclusion de la flexion marquée', () => {
  it('écarte la brasse et l’étirement des quadriceps quand l’option est activée', () => {
    const sansFlexion = contexte({ exclureFlexionMarquee: true })

    expect(exerciceAutorise(exercice('nage-brasse'), sansFlexion)).toBe(false)
    expect(exerciceAutorise(exercice('etirement-quadriceps-debout'), sansFlexion)).toBe(false)
  })

  it('ne signale plus ce qu’elle a déjà exclu', () => {
    const verdict = evaluerExercice(
      exercice('nage-brasse'),
      contexte({ exclureFlexionMarquee: true }),
    )

    expect(verdict.signalements.join(' ')).not.toMatch(/flexion marquée/)
  })
})

describe('exclusion à la main', () => {
  it('écarte l’exercice nommé et explique que la décision vient des réglages', () => {
    const verdict = evaluerExercice(
      exercice('pompes-contre-mur'),
      contexte({ exercicesExclusIds: ['pompes-contre-mur'] }),
    )

    expect(verdict.autorise).toBe(false)
    expect(verdict.exclusions[0]?.raison).toBe('exclu-manuellement')
  })
})

describe('matériel déclaré', () => {
  it('écarte la natation quand il n’y a pas de piscine', () => {
    const sansPiscine = contexte({}, ['tapis'])

    expect(exerciceAutorise(exercice('nage-crawl'), sansPiscine)).toBe(false)
    expect(evaluerExercice(exercice('nage-crawl'), sansPiscine).exclusions[0]?.raison).toBe(
      'materiel-absent',
    )
  })

  it('laisse passer ce qui ne demande rien, même sans matériel', () => {
    const rien = contexte({}, ['aucun'])

    expect(exerciceAutorise(exercice('marche-rapide'), rien)).toBe(true)
    expect(exerciceAutorise(exercice('squat-sur-chaise'), rien)).toBe(true)
    expect(exerciceAutorise(exercice('gainage-avant-bras'), rien)).toBe(false) // tapis
  })

  it('nomme le matériel qui manque', () => {
    const verdict = evaluerExercice(exercice('velo-souple'), contexte({}, ['aucun']))

    expect(verdict.exclusions[0]?.explication).toMatch(/vélo/)
  })
})

describe('cumul des raisons', () => {
  it('rend toutes les raisons d’un refus, pas seulement la première', () => {
    const verdict = evaluerExercice(
      exercice('squat-profond'),
      contexte({ impactGenouMaximal: 'faible', exclureFlexionMarquee: true }),
    )

    expect(verdict.autorise).toBe(false)
    expect(verdict.exclusions.map((exclusion) => exclusion.raison).sort()).toEqual([
      'flexion-marquee',
      'impact-genou',
    ])
  })
})

describe('liste des exercices écartés', () => {
  it('rend de quoi expliquer chaque exclusion dans les réglages', () => {
    const ecartes = exercicesEcartes(bibliotheque, contexteParDefaut)

    expect(ecartes.length).toBeGreaterThan(0)
    for (const verdict of ecartes) {
      expect(verdict.autorise).toBe(false)
      expect(verdict.exclusions.length).toBeGreaterThan(0)
      for (const exclusion of verdict.exclusions) {
        expect(exclusion.explication.length).toBeGreaterThan(10)
      }
    }
  })

  it('ne contient aucun exercice autorisé, et réciproquement', () => {
    const autorises = new Set(
      exercicesAutorises(bibliotheque, contexteParDefaut).map((e) => e.id),
    )
    const ecartes = new Set(exercicesEcartes(bibliotheque, contexteParDefaut).map((v) => v.exerciceId))

    expect(autorises.size + ecartes.size).toBe(bibliotheque.length)
    for (const id of ecartes) {
      expect(autorises.has(id)).toBe(false)
    }
  })
})
