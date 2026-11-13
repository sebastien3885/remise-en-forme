import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { TAILLE_BIBLIOTHEQUE_INITIALE } from '../domaine/exercices/bibliotheque'
import { baseDeTest } from '../tests/base-de-test'
import { amorcerSiNecessaire, effacerToutesLesDonnees } from './amorcage'
import type { BaseForme } from './db'
import { creerDepots, type Depots } from './index'

const MAINTENANT = new Date(2026, 10, 12, 9, 0)

let base: BaseForme
let depots: Depots
let fermer: () => Promise<void>

beforeEach(async () => {
  const ouverte = await baseDeTest()
  base = ouverte.base
  fermer = ouverte.fermer
  depots = creerDepots(base)
})

afterEach(async () => {
  await fermer()
})

describe('amorcerSiNecessaire', () => {
  it('crée le profil et la bibliothèque au premier lancement', async () => {
    const resultat = await amorcerSiNecessaire(depots, { maintenant: MAINTENANT })

    expect(resultat).toEqual({
      profilCree: true,
      exercicesAjoutes: TAILLE_BIBLIOTHEQUE_INITIALE,
    })

    const profil = await depots.profil.lire()
    expect(profil?.dateDebut).toBe('2026-11-12')
    // Le profil amorcé ne suppose aucun antécédent : il porte les
    // précautions du chapitre 10, qui elles ne dépendent de personne.
    expect(profil?.antecedents).toEqual([])
    expect(profil?.precautions.impactGenouMaximal).toBe('modere')
    expect(await depots.exercices.compter()).toBe(TAILLE_BIBLIOTHEQUE_INITIALE)
  })

  it('ne refait rien au deuxième lancement', async () => {
    await amorcerSiNecessaire(depots, { maintenant: MAINTENANT })
    const second = await amorcerSiNecessaire(depots, { maintenant: MAINTENANT })

    expect(second).toEqual({ profilCree: false, exercicesAjoutes: 0 })
    expect(await depots.exercices.compter()).toBe(TAILLE_BIBLIOTHEQUE_INITIALE)
  })

  it('ne touche pas à un profil déjà modifié', async () => {
    await amorcerSiNecessaire(depots, { maintenant: MAINTENANT })
    await depots.profil.modifier({ masquerPoids: true, materiel: ['aucun'] })

    await amorcerSiNecessaire(depots, { maintenant: MAINTENANT })

    const profil = await depots.profil.lire()
    expect(profil?.masquerPoids).toBe(true)
    expect(profil?.materiel).toEqual(['aucun'])
  })

  it('ne ressuscite pas un exercice supprimé à la main', async () => {
    // Le piège : réamorcer la bibliothèque à chaque ouverture ferait revenir
    // ce que l'utilisateur a écarté.
    await amorcerSiNecessaire(depots, { maintenant: MAINTENANT })
    await depots.exercices.supprimer('course-a-pied')

    await amorcerSiNecessaire(depots, { maintenant: MAINTENANT })

    expect(await depots.exercices.parId('course-a-pied')).toBeUndefined()
    expect(await depots.exercices.compter()).toBe(TAILLE_BIBLIOTHEQUE_INITIALE - 1)
  })

  it('remplit la bibliothèque si elle a été entièrement vidée', async () => {
    await amorcerSiNecessaire(depots, { maintenant: MAINTENANT })
    await depots.exercices.effacerTout()

    const resultat = await amorcerSiNecessaire(depots, { maintenant: MAINTENANT })

    expect(resultat.exercicesAjoutes).toBe(TAILLE_BIBLIOTHEQUE_INITIALE)
  })
})

describe('effacerToutesLesDonnees', () => {
  it('vide toutes les tables', async () => {
    await amorcerSiNecessaire(depots, { maintenant: MAINTENANT })

    await effacerToutesLesDonnees(base)

    expect(await depots.profil.lire()).toBeUndefined()
    expect(await depots.exercices.compter()).toBe(0)
    expect(await depots.programmes.compter()).toBe(0)
    expect(await depots.seances.prevues.compter()).toBe(0)
  })

  it('laisse l’amorçage repartir de zéro', async () => {
    await amorcerSiNecessaire(depots, { maintenant: MAINTENANT })
    await effacerToutesLesDonnees(base)

    const resultat = await amorcerSiNecessaire(depots, { maintenant: MAINTENANT })

    expect(resultat.profilCree).toBe(true)
  })
})
