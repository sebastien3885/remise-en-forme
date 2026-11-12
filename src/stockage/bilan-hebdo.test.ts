import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { bibliothequeInitiale } from '../domaine/exercices/bibliotheque'
import { profilParDefaut } from '../domaine/profil/profil-par-defaut'
import { baseDeTest } from '../tests/base-de-test'
import { accepterBilan, genererEtEnregistrerBilan, refuserBilan } from './bilan-hebdo'
import type { BaseForme } from './db'
import { genererEtInstallerProgramme } from './generer-programme'
import { creerDepots, type Depots } from './index'
import { validerSeance } from './valider-seance'

const LUNDI = '2026-11-16'
const DIMANCHE = '2026-11-22'
const MAINTENANT = new Date('2026-11-22T20:00:00.000Z')

let base: BaseForme
let depots: Depots
let fermer: () => Promise<void>

beforeEach(async () => {
  const ouverte = await baseDeTest()
  base = ouverte.base
  fermer = ouverte.fermer
  depots = creerDepots(base)

  await depots.exercices.enregistrerPlusieurs(bibliothequeInitiale(MAINTENANT))
  await depots.profil.enregistrer(
    profilParDefaut({ dateDebut: LUNDI, maintenant: MAINTENANT }),
    MAINTENANT,
  )
  await genererEtInstallerProgramme({ base, depots, maintenant: MAINTENANT })
})

afterEach(async () => {
  await fermer()
})

/** Valide toutes les séances d'entraînement de la première semaine. */
async function realiserLaSemaine(effort: number) {
  const programme = await depots.programmes.actif()
  const semaine = await depots.seances.prevues.parSemaine(programme!.id, 1)

  for (const prevue of semaine) {
    if (prevue.type === 'repos') continue
    await validerSeance(
      {
        date: prevue.date,
        prevue,
        type: prevue.type,
        titre: prevue.titre,
        statut: 'faite',
        exercices: prevue.exercices.map((exercice) => ({
          exerciceId: exercice.exerciceId,
          ordre: exercice.ordre,
          reel: exercice.cibles,
        })),
        effort,
        energie: 7,
        douleurs: [],
      },
      { base, depots, maintenant: MAINTENANT },
    )
  }
}

describe('génération du bilan', () => {
  it('résume la semaine et propose une augmentation quand tout est fait', async () => {
    await realiserLaSemaine(5)

    const resultat = await genererEtEnregistrerBilan(DIMANCHE, 'juste-bien', {
      base,
      depots,
      maintenant: MAINTENANT,
    })

    expect(resultat.genere).toBe(true)
    if (!resultat.genere) return

    const { bilan } = resultat
    expect(bilan.semaine).toBe(1)
    expect(bilan.debut).toBe(LUNDI)
    expect(bilan.fin).toBe(DIMANCHE)
    expect(bilan.statistiques.seancesPrevues).toBe(6)
    expect(bilan.statistiques.seancesFaites).toBe(6)
    expect(bilan.statistiques.effortMoyen).toBe(5)
    expect(bilan.reglesAppliquees[0]?.cle).toBe('augmenter')
    expect(bilan.decision).toBe('en-attente')
  })

  it('l’enregistre et le retrouve par sa semaine', async () => {
    await realiserLaSemaine(5)
    await genererEtEnregistrerBilan(DIMANCHE, null, { base, depots, maintenant: MAINTENANT })

    const programme = await depots.programmes.actif()
    expect(await depots.bilans.parSemaine(programme!.id, 1)).toBeDefined()
    expect(await depots.bilans.compter()).toBe(1)
  })

  it('refaire le bilan corrige, au lieu d’en empiler un second', async () => {
    await realiserLaSemaine(5)

    const premier = await genererEtEnregistrerBilan(DIMANCHE, 'juste-bien', {
      base,
      depots,
      maintenant: MAINTENANT,
    })
    const second = await genererEtEnregistrerBilan(DIMANCHE, 'trop-dur', {
      base,
      depots,
      maintenant: MAINTENANT,
    })

    if (!premier.genere || !second.genere) throw new Error('bilans attendus')
    expect(second.bilan.id).toBe(premier.bilan.id)
    expect(await depots.bilans.compter()).toBe(1)
  })

  it('tient compte de la réponse de fin de semaine', async () => {
    await realiserLaSemaine(5)

    const resultat = await genererEtEnregistrerBilan(DIMANCHE, 'trop-dur', {
      base,
      depots,
      maintenant: MAINTENANT,
    })

    if (!resultat.genere) throw new Error('bilan attendu')
    // La semaine était parfaite, mais la charge a été jugée trop dure.
    expect(resultat.bilan.reglesAppliquees[0]?.cle).toBe('maintenir')
    expect(resultat.bilan.reglesAppliquees[0]?.explication).toMatch(/jugée trop dure/)
  })

  it('réduit la charge quand la semaine a été manquée', async () => {
    const resultat = await genererEtEnregistrerBilan(DIMANCHE, null, {
      base,
      depots,
      maintenant: MAINTENANT,
    })

    if (!resultat.genere) throw new Error('bilan attendu')
    expect(resultat.bilan.reglesAppliquees[0]?.cle).toBe('reduire')
    expect(resultat.bilan.statistiques.tauxRealisation).toBe(0)
  })

  it('refuse sans programme en cours', async () => {
    const programme = await depots.programmes.actif()
    await depots.programmes.enregistrer({ ...programme!, actif: false })

    const resultat = await genererEtEnregistrerBilan(DIMANCHE, null, { base, depots })

    expect(resultat.genere).toBe(false)
  })
})

describe('accepter un bilan', () => {
  async function bilanDAugmentation() {
    await realiserLaSemaine(5)
    const resultat = await genererEtEnregistrerBilan(DIMANCHE, 'juste-bien', {
      base,
      depots,
      maintenant: MAINTENANT,
    })
    if (!resultat.genere) throw new Error('bilan attendu')
    return resultat.bilan
  }

  it('crée une version de programme et l’active', async () => {
    const bilan = await bilanDAugmentation()
    const ancienId = (await depots.programmes.actif())!.id

    const resultat = await accepterBilan(bilan.id, { base, depots, maintenant: MAINTENANT })

    expect(resultat.applique).toBe(true)
    if (!resultat.applique) return
    expect(resultat.versionCreee).toBe(2)

    const actif = await depots.programmes.actif()
    expect(actif?.version).toBe(2)
    expect(actif?.versionPrecedenteId).toBe(ancienId)
    expect(actif?.bilanDeclencheurId).toBe(bilan.id)
    expect(actif?.motifRevision).toMatch(/Semaine 1/)
  })

  it('augmente de 10 % les séances à venir, sur le seul levier retenu', async () => {
    const bilan = await bilanDAugmentation()
    await accepterBilan(bilan.id, { base, depots, maintenant: MAINTENANT })

    const actif = await depots.programmes.actif()
    const semaine2 = await depots.seances.prevues.parSemaine(actif!.id, 2)
    const marche = semaine2.find((seance) => seance.type === 'marche')
    const renforcement = semaine2.find((seance) => seance.type === 'renforcement')

    // Premier bilan : le levier est la durée. 30 min deviennent 33.
    expect(marche?.exercices[0]?.cibles.dureeMinutes).toBe(33)
    // L'intensité ne bouge pas : les répétitions restent à 10.
    expect(renforcement?.exercices[0]?.cibles.repetitions).toBe(10)
  })

  it('laisse les séances passées à l’ancienne version', async () => {
    const bilan = await bilanDAugmentation()
    const ancienId = (await depots.programmes.actif())!.id

    await accepterBilan(bilan.id, { base, depots, maintenant: MAINTENANT })

    const semaine1 = await depots.seances.prevues.parSemaine(ancienId, 1)
    expect(semaine1).toHaveLength(7)
    expect(semaine1.every((seance) => seance.statut !== 'remplacee')).toBe(true)

    // Et leurs réalisations pointent toujours vers elles.
    const realisee = await depots.seances.realisees.pourSeancePrevue(
      semaine1.find((seance) => seance.type !== 'repos')!.id,
    )
    expect(realisee).toBeDefined()
  })

  it('marque les séances à venir comme remplacées, sans les effacer', async () => {
    const bilan = await bilanDAugmentation()
    const ancienId = (await depots.programmes.actif())!.id

    await accepterBilan(bilan.id, { base, depots, maintenant: MAINTENANT })

    const anciennes = await depots.seances.prevues.parProgramme(ancienId)
    const aVenir = anciennes.filter((seance) => seance.date > DIMANCHE)

    expect(aVenir.length).toBeGreaterThan(0)
    expect(aVenir.every((seance) => seance.statut === 'remplacee')).toBe(true)
    expect(aVenir.every((seance) => seance.remplaceeParId !== undefined)).toBe(true)
  })

  it('ne laisse qu’une séance visible par jour après la révision', async () => {
    const bilan = await bilanDAugmentation()
    await accepterBilan(bilan.id, { base, depots, maintenant: MAINTENANT })

    const semaine3 = await depots.seances.prevues.parPlage('2026-11-30', '2026-12-06')
    const visibles = semaine3.filter(
      (seance) => seance.statut !== 'annulee' && seance.statut !== 'remplacee',
    )

    expect(new Set(visibles.map((seance) => seance.date)).size).toBe(visibles.length)
    expect(visibles).toHaveLength(7)
  })

  it('refuse d’accepter deux fois', async () => {
    const bilan = await bilanDAugmentation()
    await accepterBilan(bilan.id, { base, depots, maintenant: MAINTENANT })

    const second = await accepterBilan(bilan.id, { base, depots, maintenant: MAINTENANT })

    expect(second.applique).toBe(false)
    if (second.applique) return
    expect(second.raison).toMatch(/déjà été décidé/)
    expect(await depots.programmes.compter()).toBe(2)
  })
})

describe('refuser un bilan', () => {
  it('laisse le programme intact', async () => {
    await realiserLaSemaine(5)
    const resultat = await genererEtEnregistrerBilan(DIMANCHE, 'juste-bien', {
      base,
      depots,
      maintenant: MAINTENANT,
    })
    if (!resultat.genere) throw new Error('bilan attendu')

    const refus = await refuserBilan(resultat.bilan.id, { base, depots, maintenant: MAINTENANT })

    expect(refus.applique).toBe(true)
    expect((await depots.bilans.parId(resultat.bilan.id))?.decision).toBe('refuse')
    expect(await depots.programmes.compter()).toBe(1)

    const actif = await depots.programmes.actif()
    const semaine2 = await depots.seances.prevues.parSemaine(actif!.id, 2)
    expect(semaine2.find((s) => s.type === 'marche')?.exercices[0]?.cibles.dureeMinutes).toBe(30)
  })
})
