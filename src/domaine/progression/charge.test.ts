import { describe, expect, it } from 'vitest'

import { CONFIG_PROGRESSION, type ConfigProgression } from '../../config/progression'
import {
  ajusterMesures,
  ajusterValeur,
  chargeDe,
  facteurEnMots,
  facteurPlafonne,
  facteursRetenables,
  levierDe,
  variationRelative,
} from './charge'

const config = CONFIG_PROGRESSION

function sansPlusPetitPas(): ConfigProgression {
  return { ...config, plafonds: { ...config.plafonds, autoriserLePlusPetitPas: false } }
}

describe('chargeDe', () => {
  it('retient les longueurs en premier', () => {
    expect(chargeDe({ longueurs: 8, dureeMinutes: 30 })).toEqual({
      champ: 'longueurs',
      valeur: 8,
    })
  })

  it('retient la distance avant la durée', () => {
    expect(chargeDe({ distanceMetres: 3000, dureeMinutes: 30 })).toEqual({
      champ: 'distanceMetres',
      valeur: 3000,
    })
  })

  it('retient la durée seule', () => {
    expect(chargeDe({ dureeMinutes: 30, reposSecondes: 60 })).toEqual({
      champ: 'dureeMinutes',
      valeur: 30,
    })
  })

  it('compte le volume des séries : séries × répétitions', () => {
    expect(chargeDe({ series: 3, repetitions: 12 })).toEqual({
      champ: 'repetitions',
      valeur: 36,
    })
  })

  it('compte le volume d’un maintien', () => {
    expect(chargeDe({ series: 3, maintienSecondes: 20 })).toEqual({
      champ: 'maintienSecondes',
      valeur: 60,
    })
  })

  it('suppose une série quand le nombre n’est pas précisé', () => {
    expect(chargeDe({ repetitions: 10 })?.valeur).toBe(10)
  })

  it('ne rend rien sur une mesure sans quantité', () => {
    expect(chargeDe({})).toBeUndefined()
    expect(chargeDe({ reposSecondes: 60 })).toBeUndefined()
  })
})

describe('levierDe', () => {
  it('range la durée et le maintien sous « durée »', () => {
    expect(levierDe({ dureeMinutes: 30 })).toBe('duree')
    expect(levierDe({ maintienSecondes: 20 })).toBe('duree')
  })

  it('range les longueurs, la distance et les répétitions sous « intensité »', () => {
    expect(levierDe({ longueurs: 8 })).toBe('intensite')
    expect(levierDe({ distanceMetres: 3000 })).toBe('intensite')
    expect(levierDe({ series: 2, repetitions: 10 })).toBe('intensite')
  })
})

describe('facteurPlafonne', () => {
  it('ramène une augmentation excessive au plafond', () => {
    expect(facteurPlafonne(1.5, config)).toBe(1.1)
  })

  it('ramène une réduction excessive au plancher', () => {
    expect(facteurPlafonne(0.1, config)).toBe(0.5)
  })

  it('laisse passer les facteurs légitimes', () => {
    expect(facteurPlafonne(1.1, config)).toBe(1.1)
    expect(facteurPlafonne(0.8, config)).toBe(0.8)
    expect(facteurPlafonne(0.7, config)).toBe(0.7)
  })
})

describe('ajusterValeur', () => {
  it('monte de 10 % quand la valeur le permet', () => {
    expect(ajusterValeur(30, 1.1, 1, true)).toBe(33)
    expect(ajusterValeur(20, 1.1, 1, true)).toBe(22)
  })

  it('arrondit vers le bas pour ne pas dépasser le facteur demandé', () => {
    // 45 × 1,1 = 49,5 : on prend 49, pas 50.
    expect(ajusterValeur(45, 1.1, 1, true)).toBe(49)
  })

  it('avance du plus petit pas quand 10 % ne franchissent pas une unité', () => {
    // 8 longueurs × 1,1 = 8,8 : l'arrondi bas ne bouge pas, on passe à 9.
    expect(ajusterValeur(8, 1.1, 1, true)).toBe(9)
    expect(ajusterValeur(3, 1.1, 1, true)).toBe(4)
  })

  it('reste immobile si la configuration refuse ce pas', () => {
    expect(ajusterValeur(8, 1.1, 1, false)).toBe(8)
  })

  it('arrondit la distance à la centaine de mètres', () => {
    expect(ajusterValeur(3000, 1.1, 100, true)).toBe(3300)
    expect(ajusterValeur(1000, 1.1, 100, true)).toBe(1100)
  })

  it('arrondit vers le haut en réduction, pour ne pas retirer plus que demandé', () => {
    expect(ajusterValeur(30, 0.8, 1, true)).toBe(24)
    expect(ajusterValeur(10, 0.8, 1, true)).toBe(8)
    // 7 × 0,8 = 5,6 : on garde 6.
    expect(ajusterValeur(7, 0.8, 1, true)).toBe(6)
  })

  it('ne descend jamais en dessous d’un pas', () => {
    expect(ajusterValeur(1, 0.8, 1, true)).toBe(1)
    expect(ajusterValeur(100, 0.5, 100, true)).toBe(100)
  })

  it('ne touche à rien quand le facteur vaut 1', () => {
    expect(ajusterValeur(30, 1, 1, true)).toBe(30)
  })
})

describe('ajusterMesures', () => {
  it('ne touche que les champs du levier retenu', () => {
    const avant = { dureeMinutes: 30, repetitions: 10, series: 2 }

    expect(ajusterMesures(avant, 'duree', 1.1, config)).toEqual({
      dureeMinutes: 33,
      repetitions: 10,
      series: 2,
    })
    expect(ajusterMesures(avant, 'intensite', 1.1, config)).toEqual({
      dureeMinutes: 30,
      repetitions: 11,
      series: 2,
    })
  })

  it('ne touche jamais au temps de repos', () => {
    const ajustees = ajusterMesures({ dureeMinutes: 30, reposSecondes: 60 }, 'duree', 1.1, config)

    expect(ajustees.reposSecondes).toBe(60)
  })

  it('ne touche jamais au nombre de séries', () => {
    // L'intensité passe par les répétitions : une seule chose bouge.
    const ajustees = ajusterMesures({ series: 3, repetitions: 12 }, 'intensite', 1.1, config)

    expect(ajustees.series).toBe(3)
    expect(ajustees.repetitions).toBe(13)
  })

  it('plafonne le facteur avant de l’appliquer', () => {
    const ajustees = ajusterMesures({ dureeMinutes: 30 }, 'duree', 1.5, config)

    // 1,5 est ramené à 1,1 : 33 minutes, pas 45.
    expect(ajustees.dureeMinutes).toBe(33)
  })

  it('rend une copie, sans modifier l’original', () => {
    const avant = { dureeMinutes: 30 }
    const apres = ajusterMesures(avant, 'duree', 1.1, config)

    expect(avant.dureeMinutes).toBe(30)
    expect(apres).not.toBe(avant)
  })

  it('respecte le refus du plus petit pas', () => {
    const ajustees = ajusterMesures({ longueurs: 8 }, 'intensite', 1.1, sansPlusPetitPas())

    expect(ajustees.longueurs).toBe(8)
  })
})

describe('variationRelative', () => {
  it('mesure un progrès', () => {
    expect(
      variationRelative({ champ: 'dureeMinutes', valeur: 30 }, { champ: 'dureeMinutes', valeur: 33 }),
    ).toBeCloseTo(0.1)
  })

  it('refuse de comparer deux grandeurs différentes', () => {
    expect(
      variationRelative({ champ: 'dureeMinutes', valeur: 30 }, { champ: 'longueurs', valeur: 8 }),
    ).toBeUndefined()
  })
})

describe('facteurEnMots', () => {
  it('dit une augmentation avec son signe', () => {
    expect(facteurEnMots(1.1)).toBe('+10 %')
    expect(facteurEnMots(1.05)).toBe('+5 %')
  })

  it('dit une réduction avec son signe', () => {
    // Le même signe que les explications du moteur : les deux textes se
    // retrouvent côte à côte dans la carte du bilan.
    expect(facteurEnMots(0.8)).toBe('-20 %')
  })

  it('dit « aucun changement » plutôt que « +0 % »', () => {
    expect(facteurEnMots(1)).toBe('aucun changement')
  })
})

describe('facteursRetenables', () => {
  it('propose le facteur du moteur, la moitié du chemin, et rien', () => {
    expect(facteursRetenables(1.1)).toEqual([1.1, 1.05, 1])
  })

  it('ne propose jamais plus que le facteur du moteur', () => {
    // Le plafond du chapitre 10 ne se franchit pas par l'interface.
    for (const propose of [1.1, 1.05, 0.8, 0.7, 0.5]) {
      for (const candidat of facteursRetenables(propose)) {
        expect(candidat).toBeLessThanOrEqual(Math.max(propose, 1))
      }
    }
  })

  it('adoucit une réduction vers l’absence de changement', () => {
    expect(facteursRetenables(0.8)).toEqual([0.8, 0.9, 1])
  })

  it('ne propose qu’un choix quand le moteur ne change rien', () => {
    expect(facteursRetenables(1)).toEqual([1])
  })

  it('ne répète pas un facteur quand la moitié tombe sur un bord', () => {
    const choix = facteursRetenables(1.02)
    expect(new Set(choix).size).toBe(choix.length)
  })
})
