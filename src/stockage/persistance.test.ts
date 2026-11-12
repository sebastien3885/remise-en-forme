/**
 * Critère d'acceptation de l'étape 1 : « les données survivent à un
 * rechargement ».
 *
 * Un rechargement de la page, c'est une connexion fermée puis réouverte sur la
 * même base. Ce test l'imite : il écrit, ferme la base, en rouvre une autre
 * instance sous le même nom, et vérifie que tout est encore là — y compris les
 * objets imbriqués, que le navigateur sérialise lui-même.
 */
import Dexie from 'dexie'
import { afterEach, describe, expect, it } from 'vitest'

import { BaseForme } from './db'
import { creerDepots } from './index'
import {
  unExercice,
  unProfil,
  unProgramme,
  uneSeancePrevue,
  uneSeanceRealisee,
} from '../tests/fixtures'

let nomBase: string | undefined

afterEach(async () => {
  if (nomBase) {
    await Dexie.delete(nomBase)
    nomBase = undefined
  }
})

describe('survie à un rechargement', () => {
  it('retrouve profil, exercices, programme et séances après réouverture', async () => {
    nomBase = 'test-persistance-' + crypto.randomUUID()

    // Première « session » : on remplit la base.
    const premiere = new BaseForme(nomBase)
    const depotsAvant = creerDepots(premiere)
    await depotsAvant.profil.enregistrer(
      unProfil({
        materiel: ['tapis', 'piscine'],
        antecedents: [
          {
            id: 'genou',
            zone: 'genou',
            description: 'antécédent articulaire déclaré',
            depuis: 2020,
          },
        ],
      }),
    )
    await depotsAvant.exercices.enregistrerPlusieurs([
      unExercice({ id: 'marche-rapide' }),
      unExercice({ id: 'squat-sur-chaise', categorie: 'renforcement' }),
    ])
    await depotsAvant.programmes.remplacerActif(unProgramme({ id: 'p1', version: 1 }))
    await depotsAvant.seances.prevues.enregistrer(
      uneSeancePrevue({
        id: 's1',
        exercices: [
          { exerciceId: 'marche-rapide', ordre: 1, cibles: { dureeMinutes: 30 } },
          {
            exerciceId: 'squat-sur-chaise',
            ordre: 2,
            cibles: { series: 2, repetitions: 10, reposSecondes: 60 },
          },
        ],
      }),
    )
    await depotsAvant.seances.realisees.enregistrer(
      uneSeanceRealisee({
        id: 'r1',
        effort: 6,
        douleurs: [{ zone: 'genou', intensite: 2 }],
      }),
    )
    premiere.close()

    // Seconde « session » : nouvelle instance, même base.
    const seconde = new BaseForme(nomBase)
    const depotsApres = creerDepots(seconde)

    const profil = await depotsApres.profil.lire()
    expect(profil?.materiel).toEqual(['tapis', 'piscine'])
    expect(profil?.antecedents[0]?.zone).toBe('genou')

    expect(await depotsApres.exercices.compter()).toBe(2)
    expect((await depotsApres.programmes.actif())?.id).toBe('p1')

    // Les objets imbriqués traversent la sérialisation intacts.
    const prevue = await depotsApres.seances.prevues.parId('s1')
    expect(prevue?.exercices).toHaveLength(2)
    expect(prevue?.exercices[1]?.cibles).toEqual({
      series: 2,
      repetitions: 10,
      reposSecondes: 60,
    })

    const realisee = await depotsApres.seances.realisees.parId('r1')
    expect(realisee?.douleurs).toEqual([{ zone: 'genou', intensite: 2 }])

    seconde.close()
  })

  it('applique le schéma de la version 1 à ses neuf tables', async () => {
    nomBase = 'test-schema-' + crypto.randomUUID()
    const base = new BaseForme(nomBase)
    await base.open()

    expect(base.tables.map((table) => table.name).sort()).toEqual([
      'bilans',
      'exercices',
      'hydratation',
      'mesures',
      'profil',
      'programmes',
      'repas',
      'seancesPrevues',
      'seancesRealisees',
    ])
    expect(base.verno).toBe(1)

    base.close()
  })
})
