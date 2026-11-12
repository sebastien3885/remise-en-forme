import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { baseDeTest } from '../../tests/base-de-test'
import {
  unExercice,
  unProfil,
  unProgramme,
  uneSeancePrevue,
  uneSeanceRealisee,
} from '../../tests/fixtures'
import type { BaseForme } from '../db'
import { depotExercices } from './depot-exercices'
import { depotProfil } from './depot-profil'
import { depotProgrammes } from './depot-programmes'
import { depotSeances } from './depot-seances'

let base: BaseForme
let fermer: () => Promise<void>

beforeEach(async () => {
  const ouverte = await baseDeTest()
  base = ouverte.base
  fermer = ouverte.fermer
})

afterEach(async () => {
  await fermer()
})

describe('dépôt du profil', () => {
  it('ne rend rien tant que le questionnaire n’a pas été rempli', async () => {
    expect(await depotProfil(base).lire()).toBeUndefined()
  })

  it('enregistre puis relit le profil', async () => {
    const depot = depotProfil(base)
    await depot.enregistrer(unProfil({ materiel: ['tapis', 'piscine'] }))

    const relu = await depot.lire()
    expect(relu?.materiel).toEqual(['tapis', 'piscine'])
  })

  it('garde une seule ligne, quel que soit le nombre d’enregistrements', async () => {
    const depot = depotProfil(base)
    await depot.enregistrer(unProfil({ unites: 'metrique' }))
    await depot.enregistrer(unProfil({ unites: 'imperial' }))

    expect(await base.profil.count()).toBe(1)
    expect((await depot.lire())?.unites).toBe('imperial')
  })

  it('horodate chaque écriture', async () => {
    const depot = depotProfil(base)
    const ecrit = await depot.enregistrer(unProfil(), new Date('2026-11-20T09:00:00.000Z'))

    expect(ecrit.misAJourLe).toBe('2026-11-20T09:00:00.000Z')
  })

  it('modifie quelques champs sans toucher aux autres', async () => {
    const depot = depotProfil(base)
    await depot.enregistrer(unProfil({ objectifVerresEau: 8, masquerPoids: false }))

    const modifie = await depot.modifier({ masquerPoids: true })

    expect(modifie.masquerPoids).toBe(true)
    expect(modifie.objectifVerresEau).toBe(8)
  })

  it('refuse de modifier un profil qui n’existe pas', async () => {
    await expect(depotProfil(base).modifier({ masquerPoids: true })).rejects.toThrow(
      /Aucun profil/,
    )
  })
})

describe('dépôt des exercices', () => {
  it('écrit un lot en une fois et le compte', async () => {
    const depot = depotExercices(base)
    await depot.enregistrerPlusieurs([
      unExercice({ id: 'marche-rapide', categorie: 'marche' }),
      unExercice({ id: 'squat-sur-chaise', categorie: 'renforcement' }),
      unExercice({ id: 'gainage-planche', categorie: 'renforcement' }),
    ])

    expect(await depot.compter()).toBe(3)
  })

  it('accepte un lot vide sans rien faire', async () => {
    const depot = depotExercices(base)
    await depot.enregistrerPlusieurs([])

    expect(await depot.compter()).toBe(0)
  })

  it('filtre par catégorie', async () => {
    const depot = depotExercices(base)
    await depot.enregistrerPlusieurs([
      unExercice({ id: 'marche-rapide', categorie: 'marche' }),
      unExercice({ id: 'squat-sur-chaise', categorie: 'renforcement' }),
      unExercice({ id: 'gainage-planche', categorie: 'renforcement' }),
    ])

    const renforcement = await depot.parCategorie('renforcement')
    expect(renforcement.map((exercice) => exercice.id).sort()).toEqual([
      'gainage-planche',
      'squat-sur-chaise',
    ])
  })

  it('rend les exercices demandés et ignore les identifiants inconnus', async () => {
    const depot = depotExercices(base)
    await depot.enregistrerPlusieurs([
      unExercice({ id: 'marche-rapide' }),
      unExercice({ id: 'squat-sur-chaise' }),
    ])

    const trouves = await depot.parIds(['squat-sur-chaise', 'inexistant', 'marche-rapide'])
    expect(trouves.map((exercice) => exercice.id)).toEqual([
      'squat-sur-chaise',
      'marche-rapide',
    ])
  })

  it('remplace un exercice de même identifiant au lieu d’en ajouter un second', async () => {
    const depot = depotExercices(base)
    await depot.enregistrer(unExercice({ id: 'marche-rapide', nom: 'Marche' }))
    await depot.enregistrer(unExercice({ id: 'marche-rapide', nom: 'Marche rapide' }))

    expect(await depot.compter()).toBe(1)
    expect((await depot.parId('marche-rapide'))?.nom).toBe('Marche rapide')
  })
})

describe('dépôt des programmes', () => {
  it('numérote la première version à 1', async () => {
    expect(await depotProgrammes(base).prochaineVersion()).toBe(1)
  })

  it('numérote la version suivante après la plus haute existante', async () => {
    const depot = depotProgrammes(base)
    await depot.enregistrer(unProgramme({ id: 'p1', version: 1, actif: false }))
    await depot.enregistrer(unProgramme({ id: 'p2', version: 2, actif: true }))

    expect(await depot.prochaineVersion()).toBe(3)
  })

  it('ne rend aucun programme actif au départ', async () => {
    expect(await depotProgrammes(base).actif()).toBeUndefined()
  })

  it('garde un seul programme actif et conserve l’ancienne version', async () => {
    const depot = depotProgrammes(base)
    await depot.remplacerActif(unProgramme({ id: 'p1', version: 1 }))
    await depot.remplacerActif(
      unProgramme({ id: 'p2', version: 2, motifRevision: '+10 % car 3 séances sur 3' }),
    )

    const actif = await depot.actif()
    expect(actif?.id).toBe('p2')

    // L'historique est intact : rien n'a été écrasé (chapitre 7).
    expect(await depot.compter()).toBe(2)
    expect((await depot.parId('p1'))?.actif).toBe(false)
  })

  it('rend l’historique de la version la plus récente à la plus ancienne', async () => {
    const depot = depotProgrammes(base)
    await depot.enregistrer(unProgramme({ id: 'p1', version: 1, actif: false }))
    await depot.enregistrer(unProgramme({ id: 'p3', version: 3, actif: true }))
    await depot.enregistrer(unProgramme({ id: 'p2', version: 2, actif: false }))

    const historique = await depot.historique()
    expect(historique.map((programme) => programme.version)).toEqual([3, 2, 1])
  })
})

describe('dépôt des séances', () => {
  it('retrouve les séances prévues d’une semaine du programme', async () => {
    const depot = depotSeances(base)
    await depot.prevues.enregistrerPlusieurs([
      uneSeancePrevue({ id: 's1', semaine: 1, date: '2026-11-12' }),
      uneSeancePrevue({ id: 's2', semaine: 1, date: '2026-11-14' }),
      uneSeancePrevue({ id: 's3', semaine: 2, date: '2026-11-17' }),
      uneSeancePrevue({ id: 's4', semaine: 1, date: '2026-11-13', programmeId: 'autre' }),
    ])

    const semaine1 = await depot.prevues.parSemaine('programme-1', 1)
    expect(semaine1.map((seance) => seance.id)).toEqual(['s1', 's2'])
  })

  it('retrouve les séances d’une plage, bornes incluses et triées', async () => {
    const depot = depotSeances(base)
    await depot.prevues.enregistrerPlusieurs([
      uneSeancePrevue({ id: 's2', date: '2026-11-14' }),
      uneSeancePrevue({ id: 's1', date: '2026-11-09' }),
      uneSeancePrevue({ id: 's3', date: '2026-11-15' }),
      uneSeancePrevue({ id: 's4', date: '2026-11-16' }),
    ])

    const semaine = await depot.prevues.parPlage('2026-11-09', '2026-11-15')
    expect(semaine.map((seance) => seance.id)).toEqual(['s1', 's2', 's3'])
  })

  it('retire les séances d’un programme sans toucher aux autres', async () => {
    const depot = depotSeances(base)
    await depot.prevues.enregistrerPlusieurs([
      uneSeancePrevue({ id: 's1', programmeId: 'programme-1' }),
      uneSeancePrevue({ id: 's2', programmeId: 'programme-1' }),
      uneSeancePrevue({ id: 's3', programmeId: 'programme-2' }),
    ])

    const supprimees = await depot.prevues.supprimerDuProgramme('programme-1')

    expect(supprimees).toBe(2)
    expect(await depot.prevues.compter()).toBe(1)
  })

  it('relie une séance réalisée à la séance prévue correspondante', async () => {
    const depot = depotSeances(base)
    await depot.realisees.enregistrer(
      uneSeanceRealisee({ id: 'r1', seancePrevueId: 'prevue-1' }),
    )

    const trouvee = await depot.realisees.pourSeancePrevue('prevue-1')
    expect(trouvee?.id).toBe('r1')
  })

  it('accepte une séance improvisée, sans séance prévue', async () => {
    const depot = depotSeances(base)
    const improvisee = uneSeanceRealisee({ id: 'r2', type: 'velo', titre: 'Balade à vélo' })
    delete improvisee.seancePrevueId

    await depot.realisees.enregistrer(improvisee)

    const relue = await depot.realisees.parId('r2')
    expect(relue?.seancePrevueId).toBeUndefined()
    expect(relue?.titre).toBe('Balade à vélo')
  })

  it('garde le prévu et le réalisé dans deux tables distinctes', async () => {
    const depot = depotSeances(base)
    await depot.prevues.enregistrer(uneSeancePrevue({ id: 'commun' }))
    await depot.realisees.enregistrer(uneSeanceRealisee({ id: 'commun' }))

    expect(await depot.prevues.compter()).toBe(1)
    expect(await depot.realisees.compter()).toBe(1)
  })
})
