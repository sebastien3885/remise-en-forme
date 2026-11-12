import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { joursDeLaSemaine } from '../domaine/dates'
import { baseDeTest } from '../tests/base-de-test'
import { unProgramme, uneSeancePrevue, uneSeanceRealisee } from '../tests/fixtures'
import type { BaseForme } from './db'
import { creerDepots, type Depots } from './index'
import { deplacerSeance } from './modifier-seance'

const LUNDI = '2026-11-16'
const JOURS = joursDeLaSemaine(LUNDI) // lundi → dimanche

let base: BaseForme
let depots: Depots
let fermer: () => Promise<void>

beforeEach(async () => {
  const ouverte = await baseDeTest()
  base = ouverte.base
  fermer = ouverte.fermer
  depots = creerDepots(base)

  await depots.programmes.enregistrer(unProgramme({ id: 'programme-1', dateDebut: LUNDI }))
})

afterEach(async () => {
  await fermer()
})

/** Une semaine type : six jours occupés, le jeudi au repos. */
async function poserLaSemaine() {
  await depots.seances.prevues.enregistrerPlusieurs([
    uneSeancePrevue({ id: 'lun', date: JOURS[0]!, type: 'marche', titre: 'Marche' }),
    uneSeancePrevue({ id: 'mar', date: JOURS[1]!, type: 'renforcement', titre: 'Renfo' }),
    uneSeancePrevue({ id: 'mer', date: JOURS[2]!, type: 'marche', titre: 'Marche' }),
    uneSeancePrevue({ id: 'jeu', date: JOURS[3]!, type: 'repos', titre: 'Repos', exercices: [] }),
    uneSeancePrevue({ id: 'ven', date: JOURS[4]!, type: 'renforcement', titre: 'Renfo' }),
    uneSeancePrevue({ id: 'sam', date: JOURS[5]!, type: 'marche', titre: 'Marche' }),
    uneSeancePrevue({ id: 'dim', date: JOURS[6]!, type: 'natation', titre: 'Natation' }),
  ])
}

describe('déplacement vers un jour libre', () => {
  it('déplace la séance et garde sa date d’origine en mémoire', async () => {
    await depots.seances.prevues.enregistrer(uneSeancePrevue({ id: 'seule', date: JOURS[0]! }))

    const resultat = await deplacerSeance('seule', JOURS[2]!, { base, depots })

    expect(resultat.deplace).toBe(true)
    if (!resultat.deplace) return
    expect(resultat.echange).toBe(false)

    const relue = await depots.seances.prevues.parId('seule')
    expect(relue?.date).toBe(JOURS[2])
    expect(relue?.deplaceeDepuis).toBe(JOURS[0])
    expect(relue?.statut).toBe('deplacee')
  })

  it('garde la date d’origine après deux déplacements', async () => {
    await depots.seances.prevues.enregistrer(uneSeancePrevue({ id: 'seule', date: JOURS[0]! }))

    await deplacerSeance('seule', JOURS[2]!, { base, depots })
    await deplacerSeance('seule', JOURS[4]!, { base, depots })

    const relue = await depots.seances.prevues.parId('seule')
    expect(relue?.date).toBe(JOURS[4])
    expect(relue?.deplaceeDepuis).toBe(JOURS[0])
  })

  it('renumérote la semaine quand la séance change de semaine', async () => {
    await depots.seances.prevues.enregistrer(
      uneSeancePrevue({ id: 'seule', date: JOURS[0]!, semaine: 1 }),
    )

    await deplacerSeance('seule', '2026-11-25', { base, depots })

    expect((await depots.seances.prevues.parId('seule'))?.semaine).toBe(2)
  })

  it('ne fait rien quand la date ne change pas', async () => {
    await depots.seances.prevues.enregistrer(uneSeancePrevue({ id: 'seule', date: JOURS[0]! }))

    const resultat = await deplacerSeance('seule', JOURS[0]!, { base, depots })

    expect(resultat.deplace).toBe(true)
    expect((await depots.seances.prevues.parId('seule'))?.statut).toBe('a-faire')
  })
})

describe('déplacement vers un jour occupé', () => {
  it('échange les deux séances', async () => {
    await poserLaSemaine()

    const resultat = await deplacerSeance('lun', JOURS[1]!, { base, depots })

    expect(resultat.deplace).toBe(true)
    if (!resultat.deplace) return
    expect(resultat.echange).toBe(true)

    expect((await depots.seances.prevues.parId('lun'))?.date).toBe(JOURS[1])
    expect((await depots.seances.prevues.parId('mar'))?.date).toBe(JOURS[0])
  })

  it('préserve le jour de repos en échangeant avec lui', async () => {
    // Déposer la marche du lundi sur le jeudi au repos renvoie le repos au
    // lundi : la semaine garde son jour libre sans qu'on ait à y penser.
    await poserLaSemaine()

    const resultat = await deplacerSeance('lun', JOURS[3]!, { base, depots })

    expect(resultat.deplace).toBe(true)
    expect((await depots.seances.prevues.parId('lun'))?.date).toBe(JOURS[3])
    expect((await depots.seances.prevues.parId('jeu'))?.date).toBe(JOURS[0])
    expect((await depots.seances.prevues.parId('jeu'))?.type).toBe('repos')
  })

  it('marque les deux séances comme déplacées', async () => {
    await poserLaSemaine()

    await deplacerSeance('lun', JOURS[1]!, { base, depots })

    expect((await depots.seances.prevues.parId('lun'))?.statut).toBe('deplacee')
    expect((await depots.seances.prevues.parId('mar'))?.statut).toBe('deplacee')
  })
})

describe('jour de repos imposé', () => {
  it('refuse un déplacement qui ne laisserait aucun jour libre', async () => {
    // Six jours d'entraînement, le dimanche vide : y poser une septième
    // séance supprimerait le dernier jour de repos.
    await depots.seances.prevues.enregistrerPlusieurs(
      JOURS.slice(0, 6).map((date, index) =>
        uneSeancePrevue({ id: 'j' + String(index), date, type: 'marche' }),
      ),
    )
    await depots.seances.prevues.enregistrer(
      uneSeancePrevue({ id: 'ailleurs', date: '2026-11-23', type: 'marche' }),
    )

    const resultat = await deplacerSeance('ailleurs', JOURS[6]!, { base, depots })

    expect(resultat.deplace).toBe(false)
    if (resultat.deplace) return
    expect(resultat.raison).toMatch(/aucun jour de repos complet/)
    expect((await depots.seances.prevues.parId('ailleurs'))?.date).toBe('2026-11-23')
  })

  it('laisse passer un échange, qui n’occupe pas un jour de plus', async () => {
    await poserLaSemaine()

    const resultat = await deplacerSeance('dim', JOURS[3]!, { base, depots })

    expect(resultat.deplace).toBe(true)
  })
})

describe('séance déjà saisie', () => {
  async function saisir(seancePrevueId: string, date: string) {
    await depots.seances.realisees.enregistrer(
      uneSeanceRealisee({ id: 'r-' + seancePrevueId, seancePrevueId, date }),
    )
  }

  it('refuse de la déplacer : son réalisé porte la date du jour', async () => {
    await poserLaSemaine()
    await saisir('lun', JOURS[0]!)

    const resultat = await deplacerSeance('lun', JOURS[2]!, { base, depots })

    expect(resultat.deplace).toBe(false)
    if (resultat.deplace) return
    expect(resultat.raison).toMatch(/déjà été saisie/)
    expect((await depots.seances.prevues.parId('lun'))?.date).toBe(JOURS[0])
  })

  it('refuse aussi de l’échanger avec une autre', async () => {
    await poserLaSemaine()
    await saisir('mar', JOURS[1]!)

    const resultat = await deplacerSeance('lun', JOURS[1]!, { base, depots })

    expect(resultat.deplace).toBe(false)
    if (resultat.deplace) return
    expect(resultat.raison).toMatch(/jour d’arrivée a déjà été saisie/)
    expect((await depots.seances.prevues.parId('lun'))?.date).toBe(JOURS[0])
    expect((await depots.seances.prevues.parId('mar'))?.date).toBe(JOURS[1])
  })

  it('laisse déplacer les autres séances de la semaine', async () => {
    await poserLaSemaine()
    await saisir('lun', JOURS[0]!)

    const resultat = await deplacerSeance('ven', JOURS[3]!, { base, depots })

    expect(resultat.deplace).toBe(true)
  })
})

describe('séance introuvable', () => {
  it('le dit au lieu d’écrire n’importe quoi', async () => {
    const resultat = await deplacerSeance('fantome', JOURS[0]!, { base, depots })

    expect(resultat).toEqual({ deplace: false, raison: 'Séance introuvable.' })
  })
})
