import { describe, expect, it } from 'vitest'

import { unProfil } from '../../tests/fixtures'
import { joursDeLaSemaine, lundiDeLaSemaine } from '../dates'
import type { Profil, SeancePrevue } from '../entites'
import { bibliothequeInitiale } from '../exercices/bibliotheque'
import { profilParDefaut } from '../profil/profil-par-defaut'
import {
  SEMAINES_DU_PROGRAMME,
  construireSeance,
  genererProgrammeInitial,
} from './generateur'

const bibliotheque = bibliothequeInitiale(new Date('2026-11-12T08:00:00.000Z'))
const MAINTENANT = new Date('2026-11-12T09:00:00.000Z')

/** Générateur déterministe : les identifiants se suivent. */
function identifiants() {
  let compteur = 0
  return () => 'id-' + String(++compteur)
}

function generer(profil: Profil = profilParDefaut({ dateDebut: '2026-11-16' })) {
  return genererProgrammeInitial({
    profil,
    bibliotheque,
    maintenant: MAINTENANT,
    nouvelId: identifiants(),
  })
}

function seancesDe(seances: SeancePrevue[], semaine: number): SeancePrevue[] {
  return seances.filter((seance) => seance.semaine === semaine)
}

function entrainements(seances: SeancePrevue[]): SeancePrevue[] {
  return seances.filter((seance) => seance.type !== 'repos')
}

describe('forme du programme', () => {
  it('couvre douze semaines', () => {
    const { seances } = generer()

    expect(SEMAINES_DU_PROGRAMME).toBe(12)
    expect(Math.max(...seances.map((seance) => seance.semaine))).toBe(12)
    expect(seances).toHaveLength(12 * 7)
  })

  it('rattache toutes les séances au programme créé', () => {
    const { programme, seances } = generer()

    expect(programme.version).toBe(1)
    expect(programme.motifRevision).toBe('programme initial')
    expect(programme.actif).toBe(true)
    expect(seances.every((seance) => seance.programmeId === programme.id)).toBe(true)
  })

  it('va du début déclaré à la dernière séance', () => {
    const { programme } = generer()

    expect(programme.dateDebut).toBe('2026-11-16')
    // Douze semaines pleines à partir du lundi 16 novembre.
    expect(programme.dateFin).toBe('2027-02-07')
  })

  it('marque toutes les séances à faire', () => {
    const { seances } = generer()

    expect(seances.every((seance) => seance.statut === 'a-faire')).toBe(true)
  })

  it('ne planifie rien avant la date de début', () => {
    // Programme démarré un jeudi : le lundi, mardi et mercredi d'avant
    // appartiennent à la semaine 1 mais ne doivent pas être posés.
    const { seances } = generer(profilParDefaut({ dateDebut: '2026-11-19' }))

    expect(seances.every((seance) => seance.date >= '2026-11-19')).toBe(true)
    expect(seancesDe(seances, 1)).toHaveLength(4)
  })
})

describe('rythme hebdomadaire du chapitre 3', () => {
  it('pose trois marches, deux renforcements et une natation par semaine', () => {
    const { seances } = generer()
    const semaine = seancesDe(seances, 3)

    const parType = semaine.reduce<Record<string, number>>((compte, seance) => {
      compte[seance.type] = (compte[seance.type] ?? 0) + 1
      return compte
    }, {})

    expect(parType).toEqual({ marche: 3, renforcement: 2, natation: 1, repos: 1 })
  })

  it('impose au moins un jour de repos complet chaque semaine', () => {
    const { seances } = generer()

    for (let semaine = 1; semaine <= 12; semaine += 1) {
      const jours = new Set(entrainements(seancesDe(seances, semaine)).map((s) => s.date))
      expect(jours.size).toBeLessThanOrEqual(6)
    }
  })

  it('ne pose jamais deux séances le même jour', () => {
    const { seances } = generer()
    const dates = seances.map((seance) => seance.date)

    expect(new Set(dates).size).toBe(dates.length)
  })

  it('garde les douze semaines identiques : la progression vient du moteur', () => {
    const { seances } = generer()

    const resume = (semaine: number) =>
      seancesDe(seances, semaine)
        .map((seance) => seance.type + ':' + JSON.stringify(seance.exercices.map((e) => e.cibles)))
        .join('|')

    expect(resume(2)).toBe(resume(11))
  })
})

describe('contenu des séances', () => {
  it('construit la marche du chapitre 3, étirements compris', () => {
    const { seances } = generer()
    const marche = entrainements(seances).find((seance) => seance.type === 'marche')

    expect(marche?.titre).toBe('Marche rapide 30 min')
    expect(marche?.exercices[0]).toMatchObject({
      exerciceId: 'marche-rapide',
      ordre: 1,
      cibles: { dureeMinutes: 30 },
    })
    expect(marche?.exercices.map((exercice) => exercice.exerciceId)).toEqual([
      'marche-rapide',
      'etirement-mollets',
      'etirement-ischio-assis',
      'mobilite-hanches',
    ])
  })

  it('construit le renforcement du chapitre 3, gainage de 20 s compris', () => {
    const { seances } = generer()
    const renforcement = seances.find((seance) => seance.type === 'renforcement')

    const parId = new Map(
      renforcement?.exercices.map((exercice) => [exercice.exerciceId, exercice.cibles]) ?? [],
    )

    expect(parId.get('squat-sur-chaise')).toEqual({
      series: 2,
      repetitions: 10,
      reposSecondes: 60,
    })
    expect(parId.get('pompes-contre-mur')).toEqual({
      series: 2,
      repetitions: 8,
      reposSecondes: 60,
    })
    expect(parId.get('gainage-avant-bras')).toEqual({
      series: 3,
      maintienSecondes: 20,
      reposSecondes: 45,
    })
  })

  it('construit la natation en 8 × 1 longueur avec repos', () => {
    const { seances } = generer()
    const natation = seances.find((seance) => seance.type === 'natation')

    expect(natation?.titre).toBe('Natation douce, 8 × 1 longueur')
    expect(natation?.exercices[0]?.cibles).toEqual({ longueurs: 8, reposSecondes: 40 })
  })

  it('numérote les exercices dans l’ordre', () => {
    const { seances } = generer()

    for (const seance of entrainements(seances)) {
      expect(seance.exercices.map((exercice) => exercice.ordre)).toEqual(
        seance.exercices.map((_, index) => index + 1),
      )
    }
  })

  it('laisse les jours de repos vides', () => {
    const { seances } = generer()
    const repos = seances.filter((seance) => seance.type === 'repos')

    expect(repos.length).toBeGreaterThan(0)
    expect(repos.every((seance) => seance.exercices.length === 0)).toBe(true)
    expect(repos.every((seance) => seance.titre === 'Repos complet')).toBe(true)
  })
})

describe('adaptation au niveau de départ', () => {
  it('raccourcit la marche quand la distance confortable est faible', () => {
    const profil = profilParDefaut({ dateDebut: '2026-11-16' })
    profil.niveauDepart = { marcheConfortableMetres: 800 }

    const { seances } = genererProgrammeInitial({
      profil,
      bibliotheque,
      maintenant: MAINTENANT,
      nouvelId: identifiants(),
    })
    const marche = seances.find((seance) => seance.type === 'marche')

    // 800 m à 80 m/min font 10 minutes.
    expect(marche?.exercices[0]?.cibles.dureeMinutes).toBe(10)
    expect(marche?.titre).toBe('Marche rapide 10 min')
  })

  it('ne dépasse jamais les 30 minutes du programme de départ', () => {
    const profil = profilParDefaut({ dateDebut: '2026-11-16' })
    profil.niveauDepart = { marcheConfortableMetres: 10000 }

    const { seances } = genererProgrammeInitial({
      profil,
      bibliotheque,
      maintenant: MAINTENANT,
      nouvelId: identifiants(),
    })

    expect(seances.find((s) => s.type === 'marche')?.exercices[0]?.cibles.dureeMinutes).toBe(30)
  })

  it('cale les séries à 60 % du maximum possible', () => {
    const profil = profilParDefaut({ dateDebut: '2026-11-16' })
    profil.niveauDepart = { squatsPossibles: 20, pompesPossibles: 5 }

    const { seances } = genererProgrammeInitial({
      profil,
      bibliotheque,
      maintenant: MAINTENANT,
      nouvelId: identifiants(),
    })
    const renforcement = seances.find((seance) => seance.type === 'renforcement')
    const parId = new Map(
      renforcement?.exercices.map((exercice) => [exercice.exerciceId, exercice.cibles]) ?? [],
    )

    expect(parId.get('squat-sur-chaise')?.repetitions).toBe(12)
    // 60 % de 5 font 3, relevé au plancher de 5 répétitions.
    expect(parId.get('pompes-contre-mur')?.repetitions).toBe(5)
  })
})

describe('matériel et précautions', () => {
  it('rend le dimanche libre quand il n’y a pas de piscine', () => {
    const profil = profilParDefaut({ dateDebut: '2026-11-16' })
    profil.materiel = ['tapis']

    const { seances } = genererProgrammeInitial({
      profil,
      bibliotheque,
      maintenant: MAINTENANT,
      nouvelId: identifiants(),
    })

    expect(seances.some((seance) => seance.type === 'natation')).toBe(false)
    expect(seancesDe(seances, 1).filter((seance) => seance.type === 'repos')).toHaveLength(2)
  })

  it('retombe sur une variante plus douce quand un exercice est écarté', () => {
    const profil = profilParDefaut({ dateDebut: '2026-11-16' })
    profil.precautions = {
      ...profil.precautions,
      exercicesExclusIds: ['marche-rapide'],
    }

    const { seances, avertissements } = genererProgrammeInitial({
      profil,
      bibliotheque,
      maintenant: MAINTENANT,
      nouvelId: identifiants(),
    })
    const marche = seances.find((seance) => seance.type === 'marche')

    expect(marche?.exercices[0]?.exerciceId).toBe('marche-tranquille')
    expect(avertissements.join(' ')).toMatch(/remplacé par « Marche tranquille »/)
  })

  it('ne signale un exercice écarté qu’une seule fois', () => {
    const profil = profilParDefaut({ dateDebut: '2026-11-16' })
    profil.precautions = { ...profil.precautions, exercicesExclusIds: ['marche-rapide'] }

    const { avertissements } = genererProgrammeInitial({
      profil,
      bibliotheque,
      maintenant: MAINTENANT,
      nouvelId: identifiants(),
    })

    expect(avertissements).toHaveLength(1)
  })

  it('ne pose pas de marche quand ni l’exercice ni sa variante ne sont disponibles', () => {
    const profil = profilParDefaut({ dateDebut: '2026-11-16' })
    profil.precautions = {
      ...profil.precautions,
      exercicesExclusIds: ['marche-rapide', 'marche-tranquille'],
    }

    const { seances, avertissements } = genererProgrammeInitial({
      profil,
      bibliotheque,
      maintenant: MAINTENANT,
      nouvelId: identifiants(),
    })

    expect(seances.some((seance) => seance.type === 'marche')).toBe(false)
    expect(avertissements.join(' ')).toMatch(/pas de variante plus douce/)
    // Le renforcement et la natation, eux, tiennent toujours.
    expect(seances.some((seance) => seance.type === 'renforcement')).toBe(true)
  })

  it('retire un étirement écarté sans sacrifier la séance', () => {
    const profil = profilParDefaut({ dateDebut: '2026-11-16' })
    profil.precautions = {
      ...profil.precautions,
      exercicesExclusIds: ['etirement-mollets'],
    }

    const { seances } = genererProgrammeInitial({
      profil,
      bibliotheque,
      maintenant: MAINTENANT,
      nouvelId: identifiants(),
    })
    const marche = seances.find((seance) => seance.type === 'marche')

    expect(marche?.exercices.map((e) => e.exerciceId)).not.toContain('etirement-mollets')
    expect(marche?.exercices[0]?.exerciceId).toBe('marche-rapide')
  })

  it('refuse une séance dont l’exercice principal est écarté', () => {
    // Piège repéré à l'écran : sans vélo déclaré, une séance « Vélo 30 min »
    // se réduisait à trois étirements. L'étiquette mentait.
    const profil = profilParDefaut({ dateDebut: '2026-11-16' })
    profil.materiel = ['tapis']

    const construite = construireSeance({
      gabarit: 'velo',
      profil,
      bibliotheque,
      date: '2026-11-16',
      programmeId: 'programme-1',
      id: 'seance-1',
      creeLe: '2026-11-12T09:00:00.000Z',
      dateDebutProgramme: '2026-11-16',
    })

    expect(construite.seance).toBeUndefined()
    expect(construite.avertissements.join(' ')).toMatch(/n’est disponible avec votre matériel/)
  })

  it('garde une séance dont seuls les étirements ont sauté', () => {
    const profil = profilParDefaut({ dateDebut: '2026-11-16' })
    profil.precautions = {
      ...profil.precautions,
      exercicesExclusIds: ['etirement-mollets', 'etirement-ischio-assis', 'mobilite-hanches'],
    }

    const construite = construireSeance({
      gabarit: 'marche',
      profil,
      bibliotheque,
      date: '2026-11-16',
      programmeId: 'programme-1',
      id: 'seance-1',
      creeLe: '2026-11-12T09:00:00.000Z',
      dateDebutProgramme: '2026-11-16',
    })

    expect(construite.seance?.exercices.map((e) => e.exerciceId)).toEqual(['marche-rapide'])
  })

  it('construit une séance de mobilité, où les étirements sont le sujet', () => {
    const construite = construireSeance({
      gabarit: 'mobilite',
      profil: profilParDefaut({ dateDebut: '2026-11-16' }),
      bibliotheque,
      date: '2026-11-16',
      programmeId: 'programme-1',
      id: 'seance-1',
      creeLe: '2026-11-12T09:00:00.000Z',
      dateDebutProgramme: '2026-11-16',
    })

    expect(construite.seance?.titre).toBe('Mobilité et étirements')
    expect(construite.seance?.exercices).toHaveLength(3)
  })

  it('ne pose aucune séance de natation sans tapis ni piscine, mais garde la marche', () => {
    const profil = unProfil({ dateDebut: '2026-11-16', materiel: ['aucun'] })

    const { seances } = genererProgrammeInitial({
      profil,
      bibliotheque,
      maintenant: MAINTENANT,
      nouvelId: identifiants(),
    })

    expect(seances.some((seance) => seance.type === 'natation')).toBe(false)
    expect(seances.some((seance) => seance.type === 'marche')).toBe(true)
  })
})

describe('cohérence du calendrier', () => {
  it('commence la semaine 1 au lundi de la semaine de départ', () => {
    const { seances } = generer()
    const premiere = seances[0]

    expect(premiere?.date).toBe(lundiDeLaSemaine('2026-11-16'))
    expect(premiere?.semaine).toBe(1)
  })

  it('couvre chaque jour de chaque semaine complète', () => {
    const { seances } = generer()
    const dates = new Set(seances.map((seance) => seance.date))

    for (const jour of joursDeLaSemaine('2026-11-16')) {
      expect(dates.has(jour)).toBe(true)
    }
  })
})
