import { describe, expect, it } from 'vitest'

import { CONFIG_REPERES, analyserConfigReperes } from '../../config/reperes'
import valeursLivrees from '../../config/reperes.json'
import { uneHydratation, unRepas } from '../../tests/fixtures'
import type { MomentRepas } from '../entites'
import {
  evaluerJour,
  jourRenseigne,
  jourTenu,
  scoreDeRegularite,
  type JourAlimentaire,
} from './reperes'

function repas(moment: MomentRepas, bilan: Partial<Record<string, boolean>> = {}) {
  return unRepas({
    id: 'repas-' + moment,
    moment,
    bilanRapide: {
      legumes: true,
      proteines: true,
      boissonSucree: false,
      copieux: false,
      ...bilan,
    },
  })
}

function jour(modifications: Partial<JourAlimentaire> = {}): JourAlimentaire {
  return {
    date: '2026-11-16',
    repas: [],
    hydratation: undefined,
    ...modifications,
  }
}

function etat(jourEvalue: JourAlimentaire, id: string) {
  return evaluerJour(jourEvalue).find((repere) => repere.id === id)
}

describe('configuration des repères', () => {
  it('se charge sans erreur', () => {
    expect(analyserConfigReperes(valeursLivrees).valide).toBe(true)
  })

  it('n’impose aucune cible chiffrée, conformément au garde-fou du chapitre 6', () => {
    const texte = JSON.stringify(CONFIG_REPERES.reperes)

    expect(texte).not.toMatch(/calorie/i)
    expect(CONFIG_REPERES.reperes.every((repere) => typeof repere.libelle === 'string')).toBe(
      true,
    )
  })

  it('refuse un repère que le code ne sait pas évaluer', () => {
    const resultat = analyserConfigReperes({
      ...valeursLivrees,
      reperes: [{ id: 'calories', libelle: 'Moins de 2000 kcal', actif: true }],
    })

    expect(resultat.valide).toBe(false)
  })

  it('refuse deux repères de même identifiant', () => {
    const resultat = analyserConfigReperes({
      ...valeursLivrees,
      reperes: [
        { id: 'legumes', libelle: 'A', actif: true },
        { id: 'legumes', libelle: 'B', actif: true },
      ],
    })

    expect(resultat.valide).toBe(false)
    if (resultat.valide) return
    expect(resultat.erreurs[0]?.message).toMatch(/même identifiant/)
  })
})

describe('un jour sans rien de noté', () => {
  it('n’est pas renseigné', () => {
    expect(jourRenseigne(jour())).toBe(false)
  })

  it('ne rend aucun repère applicable', () => {
    expect(evaluerJour(jour()).every((repere) => !repere.applicable)).toBe(true)
  })

  it('n’est pas une journée tenue, mais pas une journée ratée non plus', () => {
    // Le piège : compter un jour non saisi comme un échec ferait du journal
    // un registre de fautes.
    const etats = evaluerJour(jour())

    expect(jourTenu(etats)).toBe(false)
    expect(etats.every((repere) => !repere.tenu)).toBe(true)
  })
})

describe('repère des légumes', () => {
  it('est tenu quand tous les repas principaux en ont', () => {
    const journee = jour({ repas: [repas('petit-dejeuner'), repas('dejeuner'), repas('diner')] })

    expect(etat(journee, 'legumes')).toMatchObject({ applicable: true, tenu: true })
  })

  it('tombe dès qu’un repas principal n’en a pas', () => {
    const journee = jour({
      repas: [repas('dejeuner'), repas('diner', { legumes: false })],
    })

    expect(etat(journee, 'legumes')).toMatchObject({ applicable: true, tenu: false })
  })

  it('ne juge que les repas notés', () => {
    // Un seul repas écrit, avec des légumes : le repère est tenu. On ne
    // reproche pas à l'utilisateur ce qu'il n'a pas saisi.
    const journee = jour({ repas: [repas('dejeuner')] })

    expect(etat(journee, 'legumes')).toMatchObject({ applicable: true, tenu: true })
  })

  it('ignore les collations', () => {
    const journee = jour({
      repas: [repas('dejeuner'), repas('collation', { legumes: false })],
    })

    expect(etat(journee, 'legumes')?.tenu).toBe(true)
  })
})

describe('repère des boissons sucrées', () => {
  it('compte toutes les prises, collations comprises', () => {
    const journee = jour({
      repas: [repas('dejeuner'), repas('collation', { boissonSucree: true })],
    })

    expect(etat(journee, 'sansBoissonSucree')).toMatchObject({ applicable: true, tenu: false })
  })

  it('est tenu quand aucune prise n’en comporte', () => {
    expect(etat(jour({ repas: [repas('dejeuner')] }), 'sansBoissonSucree')?.tenu).toBe(true)
  })
})

describe('repère d’hydratation', () => {
  it('est hors jeu tant qu’aucun verre n’a été compté', () => {
    expect(etat(jour({ repas: [repas('dejeuner')] }), 'hydratation')?.applicable).toBe(false)
  })

  it('est tenu une fois l’objectif atteint', () => {
    const journee = jour({ hydratation: uneHydratation({ verres: 8, objectif: 8 }) })

    expect(etat(journee, 'hydratation')).toMatchObject({ applicable: true, tenu: true })
  })

  it('n’est pas tenu en dessous de l’objectif', () => {
    const journee = jour({ hydratation: uneHydratation({ verres: 3, objectif: 8 }) })

    expect(etat(journee, 'hydratation')?.tenu).toBe(false)
  })
})

describe('journée tenue', () => {
  it('exige que tous les repères applicables soient tenus', () => {
    const journee = jour({
      repas: [repas('dejeuner'), repas('diner')],
      hydratation: uneHydratation({ verres: 8, objectif: 8 }),
    })

    expect(jourTenu(evaluerJour(journee))).toBe(true)
  })

  it('tombe si l’eau manque alors qu’elle a été comptée', () => {
    const journee = jour({
      repas: [repas('dejeuner')],
      hydratation: uneHydratation({ verres: 2, objectif: 8 }),
    })

    expect(jourTenu(evaluerJour(journee))).toBe(false)
  })

  it('tient sans l’eau quand elle n’a pas été comptée', () => {
    expect(jourTenu(evaluerJour(jour({ repas: [repas('dejeuner')] })))).toBe(true)
  })
})

describe('score de régularité', () => {
  function semaine(joursRenseignes: number): JourAlimentaire[] {
    return Array.from({ length: 7 }, (_, index) => ({
      date: '2026-11-' + String(16 + index),
      repas: index < joursRenseignes ? [repas('dejeuner')] : [],
      hydratation: undefined,
    }))
  }

  it('compte les jours renseignés et les jours tenus', () => {
    const score = scoreDeRegularite(semaine(5))

    expect(score.joursRenseignes).toBe(5)
    expect(score.joursTenus).toBe(5)
    expect(score.jours).toHaveLength(7)
  })

  it('atteint l’objectif du chapitre 1 à cinq jours', () => {
    expect(scoreDeRegularite(semaine(5)).atteint).toBe(true)
    expect(scoreDeRegularite(semaine(4)).atteint).toBe(false)
    expect(scoreDeRegularite(semaine(4)).objectifJours).toBe(5)
  })

  it('distingue un jour renseigné d’un jour tenu', () => {
    const jours = semaine(3)
    const premier = jours[0]
    if (premier) {
      jours[0] = { ...premier, repas: [repas('dejeuner', { legumes: false })] }
    }

    const score = scoreDeRegularite(jours)

    expect(score.joursRenseignes).toBe(3)
    expect(score.joursTenus).toBe(2)
  })

  it('rend un score vide pour une semaine vide', () => {
    const score = scoreDeRegularite(semaine(0))

    expect(score.joursRenseignes).toBe(0)
    expect(score.joursTenus).toBe(0)
    expect(score.atteint).toBe(false)
  })
})
