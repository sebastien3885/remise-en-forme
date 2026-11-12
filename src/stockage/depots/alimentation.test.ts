import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { baseDeTest } from '../../tests/base-de-test'
import { uneMesure, unRepas } from '../../tests/fixtures'
import type { BaseForme } from '../db'
import { creerDepots, type Depots } from '../index'

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

describe('journal des repas', () => {
  it('rend les repas d’un jour', async () => {
    await depots.repas.enregistrer(unRepas({ id: 'r1', date: '2026-11-16', moment: 'dejeuner' }))
    await depots.repas.enregistrer(unRepas({ id: 'r2', date: '2026-11-16', moment: 'diner' }))
    await depots.repas.enregistrer(unRepas({ id: 'r3', date: '2026-11-17', moment: 'dejeuner' }))

    expect(await depots.repas.duJour('2026-11-16')).toHaveLength(2)
  })

  it('corriger son déjeuner ne fait pas croire qu’on a déjeuné deux fois', async () => {
    await depots.repas.enregistrer(
      unRepas({ id: 'r1', date: '2026-11-16', moment: 'dejeuner', description: 'Pâtes' }),
    )
    const corrige = await depots.repas.enregistrer(
      unRepas({ id: 'r2', date: '2026-11-16', moment: 'dejeuner', description: 'Poulet, riz' }),
    )

    const duJour = await depots.repas.duJour('2026-11-16')
    expect(duJour).toHaveLength(1)
    expect(duJour[0]?.description).toBe('Poulet, riz')
    expect(corrige.id).toBe('r1')
  })

  it('accepte plusieurs collations dans la journée', async () => {
    await depots.repas.enregistrer(unRepas({ id: 'c1', date: '2026-11-16', moment: 'collation' }))
    await depots.repas.enregistrer(unRepas({ id: 'c2', date: '2026-11-16', moment: 'collation' }))

    expect(await depots.repas.duJour('2026-11-16')).toHaveLength(2)
  })

  it('ne confond pas deux jours', async () => {
    await depots.repas.enregistrer(unRepas({ id: 'r1', date: '2026-11-16', moment: 'dejeuner' }))
    await depots.repas.enregistrer(unRepas({ id: 'r2', date: '2026-11-17', moment: 'dejeuner' }))

    expect(await depots.repas.compter()).toBe(2)
  })

  it('rend les repas d’une plage, triés par date', async () => {
    await depots.repas.enregistrer(unRepas({ id: 'r3', date: '2026-11-20' }))
    await depots.repas.enregistrer(unRepas({ id: 'r1', date: '2026-11-16' }))
    await depots.repas.enregistrer(unRepas({ id: 'r4', date: '2026-11-25' }))

    const semaine = await depots.repas.parPlage('2026-11-16', '2026-11-22')
    expect(semaine.map((repas) => repas.date)).toEqual(['2026-11-16', '2026-11-20'])
  })

  it('supprime un repas saisi par erreur', async () => {
    await depots.repas.enregistrer(unRepas({ id: 'r1' }))
    await depots.repas.supprimer('r1')

    expect(await depots.repas.compter()).toBe(0)
  })
})

describe('mesures corporelles', () => {
  it('garde une seule mesure par jour', async () => {
    await depots.mesures.enregistrer(uneMesure({ id: 'm1', date: '2026-11-16', poidsKg: 92 }))
    const corrigee = await depots.mesures.enregistrer(
      uneMesure({ id: 'm2', date: '2026-11-16', poidsKg: 91.5 }),
    )

    expect(await depots.mesures.compter()).toBe(1)
    expect(corrigee.id).toBe('m1')
    expect((await depots.mesures.duJour('2026-11-16'))?.poidsKg).toBe(91.5)
  })

  it('rend les mesures de la plus ancienne à la plus récente', async () => {
    await depots.mesures.enregistrer(uneMesure({ id: 'm2', date: '2026-11-23' }))
    await depots.mesures.enregistrer(uneMesure({ id: 'm1', date: '2026-11-16' }))

    expect((await depots.mesures.toutes()).map((m) => m.date)).toEqual([
      '2026-11-16',
      '2026-11-23',
    ])
  })

  it('retrouve la dernière mesure', async () => {
    await depots.mesures.enregistrer(uneMesure({ id: 'm1', date: '2026-11-16', poidsKg: 92 }))
    await depots.mesures.enregistrer(uneMesure({ id: 'm2', date: '2026-11-23', poidsKg: 91 }))

    expect((await depots.mesures.derniere())?.poidsKg).toBe(91)
  })

  it('ne rend rien quand rien n’a été saisi', async () => {
    expect(await depots.mesures.derniere()).toBeUndefined()
    expect(await depots.mesures.toutes()).toEqual([])
  })
})
