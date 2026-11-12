import { describe, expect, it } from 'vitest'

import valeursLivrees from './progression.json'
import {
  AUGMENTATION_MAXIMALE_ABSOLUE,
  CONFIG_PROGRESSION,
  analyserConfigProgression,
} from './progression'

function avec(modifications: Record<string, unknown>): unknown {
  return { ...valeursLivrees, ...modifications }
}

describe('configuration livrée', () => {
  it('se charge sans erreur', () => {
    expect(analyserConfigProgression(valeursLivrees).valide).toBe(true)
  })

  it('reprend les seuils du tableau du chapitre 5', () => {
    expect(CONFIG_PROGRESSION.augmenter).toEqual({
      tauxRealisationAPartirDe: 0.8,
      effortMoyenJusqua: 6,
      facteur: 1.1,
    })
    expect(CONFIG_PROGRESSION.maintenir.tauxRealisationAPartirDe).toBe(0.5)
    expect(CONFIG_PROGRESSION.reduire).toEqual({
      tauxRealisationSous: 0.5,
      effortMoyenAPartirDe: 8,
      facteur: 0.8,
    })
    expect(CONFIG_PROGRESSION.semaineAllegee).toEqual({
      apresSemainesDeProgression: 4,
      facteur: 0.7,
    })
    expect(CONFIG_PROGRESSION.douleurRepetee.signalementsAvantRemplacement).toBe(2)
  })

  it('n’autorise pas la fréquence comme levier : elle reste décidée à la main', () => {
    expect(CONFIG_PROGRESSION.leviers).toEqual(['duree', 'intensite'])
  })
})

describe('plafonds de sécurité du chapitre 10', () => {
  it('refuse un facteur d’augmentation supérieur à 10 %', () => {
    const resultat = analyserConfigProgression(
      avec({ augmenter: { tauxRealisationAPartirDe: 0.8, effortMoyenJusqua: 6, facteur: 1.3 } }),
    )

    expect(resultat.valide).toBe(false)
    if (resultat.valide) return
    expect(resultat.erreurs[0]?.chemin).toBe('augmenter.facteur')
  })

  it('refuse un plafond d’augmentation supérieur à 10 %', () => {
    const resultat = analyserConfigProgression(
      avec({ plafonds: { ...valeursLivrees.plafonds, augmentationMaximale: 1.5 } }),
    )

    expect(resultat.valide).toBe(false)
  })

  it('refuse de supprimer le jour de repos hebdomadaire', () => {
    const resultat = analyserConfigProgression(
      avec({ plafonds: { ...valeursLivrees.plafonds, joursDeReposParSemaineMinimum: 0 } }),
    )

    expect(resultat.valide).toBe(false)
    if (resultat.valide) return
    expect(resultat.erreurs[0]?.chemin).toBe('plafonds.joursDeReposParSemaineMinimum')
  })

  it('fixe le plafond absolu à 1,1', () => {
    expect(AUGMENTATION_MAXIMALE_ABSOLUE).toBe(1.1)
  })
})

describe('contrôle du fichier', () => {
  it('refuse une clé inconnue', () => {
    const resultat = analyserConfigProgression(avec({ regleSecrete: true }))

    expect(resultat.valide).toBe(false)
  })

  it('refuse un champ manquant', () => {
    const sansLeviers: Record<string, unknown> = { ...valeursLivrees }
    delete sansLeviers['leviers']

    expect(analyserConfigProgression(sansLeviers).valide).toBe(false)
  })

  it('refuse la fréquence comme levier, non gérée en v1', () => {
    expect(analyserConfigProgression(avec({ leviers: ['frequence'] })).valide).toBe(false)
  })

  it('refuse des seuils qui ne laissent aucune place à « maintenir »', () => {
    const resultat = analyserConfigProgression(
      avec({
        reduire: { tauxRealisationSous: 0.9, effortMoyenAPartirDe: 8, facteur: 0.8 },
        augmenter: { tauxRealisationAPartirDe: 0.8, effortMoyenJusqua: 6, facteur: 1.1 },
      }),
    )

    expect(resultat.valide).toBe(false)
    if (resultat.valide) return
    expect(resultat.erreurs[0]?.message).toMatch(/maintenir/)
  })

  it('refuse un effort hors de l’échelle 1 à 10', () => {
    expect(
      analyserConfigProgression(
        avec({ reduire: { tauxRealisationSous: 0.5, effortMoyenAPartirDe: 12, facteur: 0.8 } }),
      ).valide,
    ).toBe(false)
  })

  it('refuse un facteur de réduction supérieur à 1', () => {
    expect(
      analyserConfigProgression(
        avec({ semaineAllegee: { apresSemainesDeProgression: 4, facteur: 1.2 } }),
      ).valide,
    ).toBe(false)
  })
})
