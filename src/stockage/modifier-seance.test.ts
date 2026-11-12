import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { joursDeLaSemaine } from '../domaine/dates'
import { bibliothequeInitiale } from '../domaine/exercices/bibliotheque'
import { profilParDefaut } from '../domaine/profil/profil-par-defaut'
import { baseDeTest } from '../tests/base-de-test'
import { unProgramme, uneSeancePrevue, uneSeanceRealisee } from '../tests/fixtures'
import type { BaseForme } from './db'
import { creerDepots, type Depots } from './index'
import {
  ajouterSeance,
  annulerSeance,
  deplacerSeance,
  remplacerSeance,
} from './modifier-seance'

const MAINTENANT = new Date('2026-11-16T08:00:00.000Z')

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

// ------------------------------------------------- planification libre

describe('ajouterSeance', () => {
  beforeEach(async () => {
    await depots.exercices.enregistrerPlusieurs(bibliothequeInitiale(MAINTENANT))
    await depots.profil.enregistrer(
      profilParDefaut({ dateDebut: LUNDI, maintenant: MAINTENANT }),
      MAINTENANT,
    )
    await depots.programmes.remplacerActif(
      unProgramme({ id: 'programme-1', dateDebut: LUNDI, actif: true }),
    )
  })

  it('pose une séance au contenu du programme', async () => {
    const resultat = await ajouterSeance(JOURS[0]!, 'marche', { base, depots })

    expect(resultat.cree).toBe(true)
    if (!resultat.cree) return
    expect(resultat.seance.titre).toBe('Marche rapide 30 min')
    expect(resultat.seance.exercices[0]?.exerciceId).toBe('marche-rapide')
    expect(resultat.seance.semaine).toBe(1)
    expect(resultat.seance.programmeId).toBe('programme-1')

    expect(await depots.seances.prevues.parDate(JOURS[0]!)).toHaveLength(1)
  })

  it('sait poser une séance de mobilité', async () => {
    const resultat = await ajouterSeance(JOURS[1]!, 'mobilite', { base, depots })

    expect(resultat.cree).toBe(true)
    if (!resultat.cree) return
    expect(resultat.seance.titre).toBe('Mobilité et étirements')
    expect(resultat.seance.exercices).toHaveLength(3)
  })

  it('refuse le vélo sans vélo déclaré, et l’accepte une fois déclaré', async () => {
    // Sans la vérification de l'exercice principal, on obtiendrait une séance
    // intitulée « Vélo 30 min » ne contenant que des étirements.
    const sansVelo = await ajouterSeance(JOURS[0]!, 'velo', { base, depots })

    expect(sansVelo.cree).toBe(false)
    if (sansVelo.cree) return
    expect(sansVelo.raison).toMatch(/n’est disponible avec votre matériel/)

    const profil = await depots.profil.lire()
    await depots.profil.enregistrer(
      { ...profil!, materiel: ['tapis', 'piscine', 'velo'] },
      MAINTENANT,
    )

    const avecVelo = await ajouterSeance(JOURS[0]!, 'velo', { base, depots })
    expect(avecVelo.cree).toBe(true)
    if (!avecVelo.cree) return
    expect(avecVelo.seance.exercices[0]?.exerciceId).toBe('velo-souple')
  })

  it('refuse un jour déjà occupé', async () => {
    await depots.seances.prevues.enregistrer(uneSeancePrevue({ id: 'deja', date: JOURS[0]! }))

    const resultat = await ajouterSeance(JOURS[0]!, 'marche', { base, depots })

    expect(resultat.cree).toBe(false)
    if (resultat.cree) return
    expect(resultat.raison).toMatch(/déjà une séance/)
  })

  it('accepte un jour dont la séance a été annulée', async () => {
    await depots.seances.prevues.enregistrer(
      uneSeancePrevue({ id: 'annulee', date: JOURS[0]!, statut: 'annulee' }),
    )

    expect((await ajouterSeance(JOURS[0]!, 'marche', { base, depots })).cree).toBe(true)
  })

  it('refuse de supprimer le dernier jour de repos de la semaine', async () => {
    await depots.seances.prevues.enregistrerPlusieurs(
      JOURS.slice(0, 6).map((date, index) =>
        uneSeancePrevue({ id: 'j' + String(index), date, type: 'marche' }),
      ),
    )

    const resultat = await ajouterSeance(JOURS[6]!, 'marche', { base, depots })

    expect(resultat.cree).toBe(false)
    if (resultat.cree) return
    expect(resultat.raison).toMatch(/aucun jour de repos complet/)
    expect(await depots.seances.prevues.parDate(JOURS[6]!)).toHaveLength(0)
  })

  it('refuse sans programme en cours', async () => {
    await depots.programmes.enregistrer(
      unProgramme({ id: 'programme-1', dateDebut: LUNDI, actif: false }),
    )

    const resultat = await ajouterSeance(JOURS[0]!, 'marche', { base, depots })

    expect(resultat.cree).toBe(false)
    if (resultat.cree) return
    expect(resultat.raison).toMatch(/Aucun programme en cours/)
  })
})

describe('annulerSeance', () => {
  it('retire la séance du calendrier sans l’effacer', async () => {
    await poserLaSemaine()

    expect(await annulerSeance('lun', { base, depots })).toEqual({ annulee: true })

    const relue = await depots.seances.prevues.parId('lun')
    expect(relue?.statut).toBe('annulee')
    expect(await depots.seances.prevues.compter()).toBe(7)
  })

  it('refuse d’annuler une séance déjà saisie', async () => {
    await poserLaSemaine()
    await depots.seances.realisees.enregistrer(
      uneSeanceRealisee({ id: 'r', seancePrevueId: 'lun', date: JOURS[0]! }),
    )

    const resultat = await annulerSeance('lun', { base, depots })

    expect(resultat.annulee).toBe(false)
    if (resultat.annulee) return
    expect(resultat.raison).toMatch(/elle a eu lieu/)
    expect((await depots.seances.prevues.parId('lun'))?.statut).not.toBe('annulee')
  })
})

describe('remplacerSeance', () => {
  beforeEach(async () => {
    await depots.exercices.enregistrerPlusieurs(bibliothequeInitiale(MAINTENANT))
    await depots.profil.enregistrer(
      profilParDefaut({ dateDebut: LUNDI, maintenant: MAINTENANT }),
      MAINTENANT,
    )
  })

  it('pose la nouvelle séance et garde l’ancienne, marquée remplacée', async () => {
    await poserLaSemaine()

    const resultat = await remplacerSeance('dim', 'marche', { base, depots })

    expect(resultat.remplace).toBe(true)
    if (!resultat.remplace) return

    const ancienne = await depots.seances.prevues.parId('dim')
    expect(ancienne?.statut).toBe('remplacee')
    expect(ancienne?.remplaceeParId).toBe(resultat.seance.id)

    expect(resultat.seance.date).toBe(JOURS[6])
    expect(resultat.seance.type).toBe('marche')
  })

  it('n’occupe pas un jour de plus : la semaine garde son repos', async () => {
    await poserLaSemaine()

    const joursActifs = async () => {
      const semaine = await depots.seances.prevues.parPlage(JOURS[0]!, JOURS[6]!)
      const actifs = semaine.filter(
        (seance) =>
          seance.type !== 'repos' &&
          seance.statut !== 'annulee' &&
          seance.statut !== 'remplacee',
      )
      return new Set(actifs.map((seance) => seance.date)).size
    }

    const avant = await joursActifs()
    await remplacerSeance('dim', 'marche', { base, depots })

    expect(await joursActifs()).toBe(avant)
    expect(avant).toBeLessThan(7)
  })

  it('refuse de remplacer le dernier jour de repos par un entraînement', async () => {
    await poserLaSemaine()

    const resultat = await remplacerSeance('jeu', 'marche', { base, depots })

    expect(resultat.remplace).toBe(false)
    if (resultat.remplace) return
    expect(resultat.raison).toMatch(/aucun jour de repos complet/)
    expect((await depots.seances.prevues.parId('jeu'))?.type).toBe('repos')
  })

  it('accepte de libérer un jour en le passant au repos', async () => {
    await poserLaSemaine()

    const resultat = await remplacerSeance('lun', 'repos', { base, depots })

    expect(resultat.remplace).toBe(true)
    if (!resultat.remplace) return
    expect(resultat.seance.type).toBe('repos')
    expect(resultat.seance.exercices).toEqual([])
  })

  it('refuse de remplacer une séance déjà saisie', async () => {
    await poserLaSemaine()
    await depots.seances.realisees.enregistrer(
      uneSeanceRealisee({ id: 'r', seancePrevueId: 'dim', date: JOURS[6]! }),
    )

    const resultat = await remplacerSeance('dim', 'marche', { base, depots })

    expect(resultat.remplace).toBe(false)
    if (resultat.remplace) return
    expect(resultat.raison).toMatch(/déjà été saisie/)
  })
})
