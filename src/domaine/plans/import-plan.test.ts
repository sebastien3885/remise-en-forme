import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

import { unExercice, unProgramme } from '../../tests/fixtures'
import { bibliothequeInitiale } from '../exercices/bibliotheque'
import { contexteDepuisProfil } from '../profil/precautions'
import { profilParDefaut } from '../profil/profil-par-defaut'
import {
  analyserPlan,
  analyserTextePlan,
  apercuDuPlan,
  convertirPlan,
  idExerciceDuPlan,
  type PlanImporte,
} from './import-plan'

const bibliotheque = bibliothequeInitiale(new Date('2026-11-12T08:00:00.000Z'))
const precautions = contexteDepuisProfil(profilParDefaut())
const MAINTENANT = new Date('2026-11-14T10:00:00.000Z')

function lireExemple(nom: string): unknown {
  const chemin = new URL('../../../data/plans/' + nom, import.meta.url)
  return JSON.parse(readFileSync(chemin, 'utf8'))
}

/** Plan minimal valide, dont les tests ne modifient que ce qui les intéresse. */
function planBrut(modifications: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    format: 'plan-remise-en-forme',
    version: 1,
    nom: 'Plan de test',
    dateDebut: '2026-11-16',
    exercices: [],
    seances: [
      {
        date: '2026-11-16',
        type: 'marche',
        titre: 'Marche rapide 30 min',
        exercices: [{ exerciceId: 'marche-rapide', cibles: { dureeMinutes: 30 } }],
      },
    ],
    ...modifications,
  }
}

function planValide(modifications: Record<string, unknown> = {}): PlanImporte {
  const resultat = analyserPlan(planBrut(modifications))
  if (!resultat.valide) {
    throw new Error('plan de test invalide : ' + JSON.stringify(resultat.erreurs))
  }
  return resultat.plan
}

// --------------------------------------------------------------- contrôle

describe('analyserPlan', () => {
  it('accepte le plan de départ livré dans le dépôt', () => {
    const resultat = analyserPlan(lireExemple('exemple-plan.json'))

    expect(resultat.valide).toBe(true)
  })

  it('accepte le plan d’exemple qui apporte son propre exercice', () => {
    const resultat = analyserPlan(lireExemple('exemple-plan-exercice-sur-mesure.json'))

    expect(resultat.valide).toBe(true)
  })

  it('refuse un JSON qui n’est pas un plan', () => {
    const resultat = analyserPlan({ seances: [] })

    expect(resultat.valide).toBe(false)
    if (resultat.valide) return
    expect(resultat.erreurs.map((erreur) => erreur.chemin)).toContain('format')
  })

  it('refuse une clé inconnue plutôt que de l’ignorer', () => {
    // Le piège réel : un accent dans le nom de la cible. Sans objet strict, la
    // séance partirait sans durée.
    const resultat = analyserPlan(
      planBrut({
        seances: [
          {
            date: '2026-11-16',
            type: 'marche',
            titre: 'Marche',
            exercices: [{ exerciceId: 'marche-rapide', cibles: { duréeMinutes: 30 } }],
          },
        ],
      }),
    )

    expect(resultat.valide).toBe(false)
    if (resultat.valide) return
    const message = resultat.erreurs.map((erreur) => erreur.message).join(' ')
    expect(message).toMatch(/clé inconnue/)
    expect(resultat.erreurs[0]?.chemin).toMatch(/seances\[0\]\.exercices\[0\]\.cibles/)
  })

  it('refuse une date mal formée, et le dit en français', () => {
    const resultat = analyserPlan(planBrut({ dateDebut: '16/11/2026' }))

    expect(resultat.valide).toBe(false)
    if (resultat.valide) return
    expect(resultat.erreurs[0]?.message).toMatch(/AAAA-MM-JJ/)
  })

  it('refuse une date qui n’existe pas', () => {
    expect(analyserPlan(planBrut({ dateDebut: '2026-02-31' })).valide).toBe(false)
  })

  it('refuse une séance sans aucune cible', () => {
    const resultat = analyserPlan(
      planBrut({
        seances: [
          {
            date: '2026-11-16',
            type: 'marche',
            titre: 'Marche',
            exercices: [{ exerciceId: 'marche-rapide', cibles: {} }],
          },
        ],
      }),
    )

    expect(resultat.valide).toBe(false)
    if (resultat.valide) return
    expect(resultat.erreurs[0]?.message).toMatch(/au moins une cible/)
  })

  it('refuse une séance d’entraînement sans exercice', () => {
    const resultat = analyserPlan(
      planBrut({
        seances: [{ date: '2026-11-16', type: 'marche', titre: 'Marche', exercices: [] }],
      }),
    )

    expect(resultat.valide).toBe(false)
    if (resultat.valide) return
    expect(resultat.erreurs[0]?.message).toMatch(/jour de repos/)
  })

  it('accepte un jour de repos sans exercice', () => {
    const resultat = analyserPlan(
      planBrut({
        seances: [
          {
            date: '2026-11-16',
            type: 'marche',
            titre: 'Marche',
            exercices: [{ exerciceId: 'marche-rapide', cibles: { dureeMinutes: 30 } }],
          },
          { date: '2026-11-17', type: 'repos', titre: 'Repos complet', exercices: [] },
        ],
      }),
    )

    expect(resultat.valide).toBe(true)
  })

  it('refuse un plan sans aucune séance', () => {
    expect(analyserPlan(planBrut({ seances: [] })).valide).toBe(false)
  })

  it('refuse une durée négative ou nulle', () => {
    const avecZero = analyserPlan(
      planBrut({
        seances: [
          {
            date: '2026-11-16',
            type: 'marche',
            titre: 'Marche',
            exercices: [{ exerciceId: 'marche-rapide', cibles: { dureeMinutes: 0 } }],
          },
        ],
      }),
    )

    expect(avecZero.valide).toBe(false)
  })

  it('complète les champs facultatifs d’un exercice', () => {
    const plan = planValide({
      exercices: [
        {
          nom: 'Marche fractionnée',
          categorie: 'marche',
          impactGenou: 'faible',
        },
      ],
      seances: [
        {
          date: '2026-11-16',
          type: 'marche',
          titre: 'Marche fractionnée',
          exercices: [{ exerciceId: 'marche-fractionnee', cibles: { dureeMinutes: 24 } }],
        },
      ],
    })

    expect(plan.exercices[0]).toMatchObject({
      description: '',
      musclesTravailles: [],
      contreIndications: [],
      flexionMarquee: false,
      materielRequis: ['aucun'],
    })
  })
})

describe('analyserTextePlan', () => {
  it('lit un fichier correct', () => {
    expect(analyserTextePlan(JSON.stringify(planBrut())).valide).toBe(true)
  })

  it('explique qu’un fichier n’est pas du JSON, sans planter', () => {
    const resultat = analyserTextePlan('{ ceci n’est pas du JSON')

    expect(resultat.valide).toBe(false)
    if (resultat.valide) return
    expect(resultat.erreurs[0]?.chemin).toBe('fichier')
    expect(resultat.erreurs[0]?.message).toMatch(/JSON/)
  })
})

describe('idExerciceDuPlan', () => {
  it('déduit l’identifiant du nom quand il est absent', () => {
    const plan = planValide({
      exercices: [{ nom: 'Marche fractionnée', categorie: 'marche', impactGenou: 'faible' }],
      seances: [
        {
          date: '2026-11-16',
          type: 'marche',
          titre: 'Marche',
          exercices: [{ exerciceId: 'marche-fractionnee', cibles: { dureeMinutes: 24 } }],
        },
      ],
    })

    expect(idExerciceDuPlan(plan.exercices[0]!)).toBe('marche-fractionnee')
  })

  it('préfère l’identifiant fourni', () => {
    const plan = planValide({
      exercices: [
        { id: 'marche-frac', nom: 'Marche fractionnée', categorie: 'marche', impactGenou: 'faible' },
      ],
      seances: [
        {
          date: '2026-11-16',
          type: 'marche',
          titre: 'Marche',
          exercices: [{ exerciceId: 'marche-frac', cibles: { dureeMinutes: 24 } }],
        },
      ],
    })

    expect(idExerciceDuPlan(plan.exercices[0]!)).toBe('marche-frac')
  })
})

// ----------------------------------------------------------------- aperçu

describe('apercuDuPlan', () => {
  it('résume le plan de départ : 4 semaines, 24 séances, 4 jours de repos', () => {
    const resultat = analyserPlan(lireExemple('exemple-plan.json'))
    if (!resultat.valide) throw new Error('exemple invalide')

    const apercu = apercuDuPlan(resultat.plan, { bibliotheque, precautions })

    expect(apercu.applicable).toBe(true)
    expect(apercu.erreurs).toEqual([])
    expect(apercu.nombreSemaines).toBe(4)
    expect(apercu.nombreSeances).toBe(24)
    expect(apercu.nombreJoursDeRepos).toBe(4)
    expect(apercu.dateDebut).toBe('2026-11-16')
    expect(apercu.dateFin).toBe('2026-12-13')
    expect(apercu.seancesParType).toEqual({
      marche: 12,
      renforcement: 8,
      natation: 4,
      repos: 4,
    })
  })

  it('accepte un plan qui ne s’appuie que sur la bibliothèque', () => {
    const apercu = apercuDuPlan(planValide(), { bibliotheque })

    expect(apercu.applicable).toBe(true)
    expect(apercu.exercicesNouveaux).toEqual([])
  })

  it('refuse un exercice référencé qui n’existe nulle part', () => {
    const apercu = apercuDuPlan(
      planValide({
        seances: [
          {
            date: '2026-11-16',
            type: 'marche',
            titre: 'Marche',
            exercices: [{ exerciceId: 'exercice-fantome', cibles: { dureeMinutes: 30 } }],
          },
        ],
      }),
      { bibliotheque },
    )

    expect(apercu.applicable).toBe(false)
    expect(apercu.erreurs[0]?.chemin).toBe('seances[0].exercices[0].exerciceId')
    expect(apercu.erreurs[0]?.message).toMatch(/n’existe ni dans le plan ni dans la bibliothèque/)
  })

  it('refuse deux exercices de même identifiant', () => {
    const apercu = apercuDuPlan(
      planValide({
        exercices: [
          { id: 'doublon', nom: 'A', categorie: 'marche', impactGenou: 'faible' },
          { id: 'doublon', nom: 'B', categorie: 'marche', impactGenou: 'faible' },
        ],
        seances: [
          {
            date: '2026-11-16',
            type: 'marche',
            titre: 'Marche',
            exercices: [{ exerciceId: 'doublon', cibles: { dureeMinutes: 30 } }],
          },
        ],
      }),
      { bibliotheque },
    )

    expect(apercu.applicable).toBe(false)
    expect(apercu.erreurs.map((erreur) => erreur.message).join(' ')).toMatch(/même identifiant/)
  })

  it('refuse une variante qui pointe dans le vide', () => {
    const apercu = apercuDuPlan(
      planValide({
        exercices: [
          {
            id: 'marche-frac',
            nom: 'Marche fractionnée',
            categorie: 'marche',
            impactGenou: 'faible',
            varianteFacileId: 'fantome',
          },
        ],
        seances: [
          {
            date: '2026-11-16',
            type: 'marche',
            titre: 'Marche',
            exercices: [{ exerciceId: 'marche-frac', cibles: { dureeMinutes: 24 } }],
          },
        ],
      }),
      { bibliotheque },
    )

    expect(apercu.applicable).toBe(false)
    expect(apercu.erreurs[0]?.chemin).toBe('exercices[0].varianteFacileId')
  })

  it('accepte une variante qui désigne un exercice de la bibliothèque', () => {
    const apercu = apercuDuPlan(
      planValide({
        exercices: [
          {
            id: 'marche-frac',
            nom: 'Marche fractionnée',
            categorie: 'marche',
            impactGenou: 'faible',
            varianteFacileId: 'marche-rapide',
          },
        ],
        seances: [
          {
            date: '2026-11-16',
            type: 'marche',
            titre: 'Marche',
            exercices: [{ exerciceId: 'marche-frac', cibles: { dureeMinutes: 24 } }],
          },
        ],
      }),
      { bibliotheque },
    )

    expect(apercu.applicable).toBe(true)
    expect(apercu.exercicesNouveaux).toEqual(['Marche fractionnée'])
  })

  it('refuse une semaine sans aucun jour de repos', () => {
    const seances = [
      '2026-11-16',
      '2026-11-17',
      '2026-11-18',
      '2026-11-19',
      '2026-11-20',
      '2026-11-21',
      '2026-11-22',
    ].map((date) => ({
      date,
      type: 'marche',
      titre: 'Marche',
      exercices: [{ exerciceId: 'marche-rapide', cibles: { dureeMinutes: 30 } }],
    }))

    const apercu = apercuDuPlan(planValide({ seances }), { bibliotheque })

    expect(apercu.applicable).toBe(false)
    expect(apercu.erreurs[0]?.message).toMatch(/au moins un jour de repos complet/)
    expect(apercu.erreurs[0]?.message).toMatch(/2026-11-16/)
  })

  it('accepte six jours d’entraînement et un de repos', () => {
    const seances = [
      '2026-11-16',
      '2026-11-17',
      '2026-11-18',
      '2026-11-19',
      '2026-11-20',
      '2026-11-21',
    ].map((date) => ({
      date,
      type: 'marche',
      titre: 'Marche',
      exercices: [{ exerciceId: 'marche-rapide', cibles: { dureeMinutes: 30 } }],
    }))

    const apercu = apercuDuPlan(planValide({ seances }), { bibliotheque })

    expect(apercu.applicable).toBe(true)
  })

  it('refuse une séance datée avant la semaine de début', () => {
    const apercu = apercuDuPlan(
      planValide({
        dateDebut: '2026-11-16',
        seances: [
          {
            date: '2026-11-08',
            type: 'marche',
            titre: 'Marche',
            exercices: [{ exerciceId: 'marche-rapide', cibles: { dureeMinutes: 30 } }],
          },
        ],
      }),
      { bibliotheque },
    )

    expect(apercu.applicable).toBe(false)
    expect(apercu.erreurs[0]?.chemin).toBe('seances[0].date')
  })

  it('accepte une séance le dimanche qui précède, dans la même semaine', () => {
    // dateDebut est un lundi ; le lundi de sa semaine est lui-même.
    const apercu = apercuDuPlan(
      planValide({
        dateDebut: '2026-11-18',
        seances: [
          {
            date: '2026-11-16',
            type: 'marche',
            titre: 'Marche',
            exercices: [{ exerciceId: 'marche-rapide', cibles: { dureeMinutes: 30 } }],
          },
        ],
      }),
      { bibliotheque },
    )

    expect(apercu.applicable).toBe(true)
  })

  it('avertit sans bloquer sur un exercice à fort impact', () => {
    const apercu = apercuDuPlan(
      planValide({
        exercices: [
          { id: 'course-libre', nom: 'Course libre', categorie: 'marche', impactGenou: 'eleve' },
        ],
        seances: [
          {
            date: '2026-11-16',
            type: 'marche',
            titre: 'Course',
            exercices: [{ exerciceId: 'course-libre', cibles: { dureeMinutes: 20 } }],
          },
        ],
      }),
      { bibliotheque, precautions },
    )

    expect(apercu.applicable).toBe(true)
    expect(apercu.avertissements.map((a) => a.message).join(' ')).toMatch(/fort impact/)
  })

  it('avertit quand un exercice du plan change l’impact genou d’un exercice connu', () => {
    const apercu = apercuDuPlan(
      planValide({
        exercices: [
          {
            id: 'marche-rapide',
            nom: 'Marche rapide',
            categorie: 'marche',
            impactGenou: 'modere',
          },
        ],
      }),
      { bibliotheque, precautions },
    )

    expect(apercu.applicable).toBe(true)
    expect(apercu.exercicesMisAJour).toEqual(['Marche rapide'])
    expect(apercu.avertissements.map((a) => a.message).join(' ')).toMatch(
      /change d’impact genou : faible → modéré/,
    )
  })

  it('avertit quand le matériel déclaré ne permet pas l’exercice', () => {
    const apercu = apercuDuPlan(
      planValide({
        exercices: [
          {
            id: 'aquagym',
            nom: 'Aquagym',
            categorie: 'natation',
            impactGenou: 'faible',
            materielRequis: ['piscine'],
          },
        ],
        seances: [
          {
            date: '2026-11-16',
            type: 'natation',
            titre: 'Aquagym',
            exercices: [{ exerciceId: 'aquagym', cibles: { dureeMinutes: 30 } }],
          },
        ],
      }),
      {
        bibliotheque,
        precautions: { precautions: precautions.precautions, materiel: ['aucun'] },
      },
    )

    expect(apercu.applicable).toBe(true)
    expect(apercu.avertissements.map((a) => a.message).join(' ')).toMatch(/matériel non déclaré/)
  })

  it('ne dit rien des précautions quand aucun profil n’est fourni', () => {
    const apercu = apercuDuPlan(planValide(), { bibliotheque })

    expect(apercu.avertissements).toEqual([])
  })
})

// ------------------------------------------------------------- conversion

describe('convertirPlan en mode remplacement', () => {
  let compteur = 0
  const idsPrevisibles = () => 'id-' + String(++compteur)

  it('crée une nouvelle version de programme et y rattache les séances', () => {
    compteur = 0
    const elements = convertirPlan(planValide(), {
      mode: 'remplacer',
      version: 3,
      maintenant: MAINTENANT,
      nouvelId: idsPrevisibles,
    })

    expect(elements.nouveauProgramme).toBe(true)
    expect(elements.programme).toMatchObject({
      id: 'id-1',
      version: 3,
      dateDebut: '2026-11-16',
      dateFin: '2026-11-16',
      actif: true,
      creeLe: '2026-11-14T10:00:00.000Z',
    })
    expect(elements.programme.motifRevision).toMatch(/Plan de test/)
    expect(elements.seances[0]?.programmeId).toBe('id-1')
  })

  it('garde la trace de la version précédente', () => {
    const elements = convertirPlan(planValide(), {
      mode: 'remplacer',
      version: 2,
      programmeActif: unProgramme({ id: 'ancien' }),
      maintenant: MAINTENANT,
    })

    expect(elements.programme.versionPrecedenteId).toBe('ancien')
  })

  it('numérote les semaines depuis la date de début du plan', () => {
    const resultat = analyserPlan(lireExemple('exemple-plan.json'))
    if (!resultat.valide) throw new Error('exemple invalide')

    const elements = convertirPlan(resultat.plan, {
      mode: 'remplacer',
      version: 1,
      maintenant: MAINTENANT,
    })

    const parDate = new Map(elements.seances.map((seance) => [seance.date, seance.semaine]))
    expect(parDate.get('2026-11-16')).toBe(1)
    expect(parDate.get('2026-11-22')).toBe(1)
    expect(parDate.get('2026-11-23')).toBe(2)
    expect(parDate.get('2026-12-07')).toBe(4)
    expect(parDate.get('2026-12-13')).toBe(4)
  })

  it('numérote les exercices dans leur ordre de lecture', () => {
    const resultat = analyserPlan(lireExemple('exemple-plan.json'))
    if (!resultat.valide) throw new Error('exemple invalide')

    const elements = convertirPlan(resultat.plan, {
      mode: 'remplacer',
      version: 1,
      maintenant: MAINTENANT,
    })

    const renforcement = elements.seances.find((seance) => seance.type === 'renforcement')
    expect(renforcement?.exercices.map((exercice) => exercice.ordre)).toEqual([1, 2, 3, 4, 5])
    expect(renforcement?.exercices[0]?.exerciceId).toBe('squat-sur-chaise')
  })

  it('marque toutes les séances « à faire »', () => {
    const elements = convertirPlan(planValide(), {
      mode: 'remplacer',
      version: 1,
      maintenant: MAINTENANT,
    })

    expect(elements.seances.every((seance) => seance.statut === 'a-faire')).toBe(true)
  })

  it('marque les exercices du plan comme importés', () => {
    const plan = planValide({
      exercices: [
        {
          id: 'marche-frac',
          nom: 'Marche fractionnée',
          categorie: 'marche',
          impactGenou: 'faible',
          consigneSecurite: 'Revenir au calme si la respiration ne suit plus.',
        },
      ],
      seances: [
        {
          date: '2026-11-16',
          type: 'marche',
          titre: 'Marche',
          exercices: [{ exerciceId: 'marche-frac', cibles: { dureeMinutes: 24 } }],
        },
      ],
    })

    const elements = convertirPlan(plan, {
      mode: 'remplacer',
      version: 1,
      maintenant: MAINTENANT,
    })

    expect(elements.exercices[0]).toMatchObject({
      id: 'marche-frac',
      origine: 'import',
      creeLe: '2026-11-14T10:00:00.000Z',
    })
    expect(elements.exercices[0]?.consigneSecurite).toBeTruthy()
  })

  it('reprend les notes et consignes du fichier', () => {
    const plan = planValide({
      seances: [
        {
          date: '2026-11-16',
          type: 'marche',
          titre: 'Marche',
          notes: 'Prendre une bouteille d’eau.',
          exercices: [
            {
              exerciceId: 'marche-rapide',
              cibles: { dureeMinutes: 30 },
              consigne: 'Ralentir en côte.',
            },
          ],
        },
      ],
    })

    const elements = convertirPlan(plan, {
      mode: 'remplacer',
      version: 1,
      maintenant: MAINTENANT,
    })

    expect(elements.seances[0]?.notes).toBe('Prendre une bouteille d’eau.')
    expect(elements.seances[0]?.exercices[0]?.consigne).toBe('Ralentir en côte.')
  })
})

describe('convertirPlan en mode fusion', () => {
  it('rattache les séances au programme actif, sans en créer un nouveau', () => {
    const actif = unProgramme({ id: 'actif', version: 2, dateDebut: '2026-11-09' })

    const elements = convertirPlan(planValide(), {
      mode: 'fusionner',
      version: 2,
      programmeActif: actif,
      maintenant: MAINTENANT,
    })

    expect(elements.nouveauProgramme).toBe(false)
    expect(elements.programme.id).toBe('actif')
    expect(elements.programme.version).toBe(2)
    expect(elements.seances[0]?.programmeId).toBe('actif')
  })

  it('numérote les semaines depuis la date de début du programme en cours', () => {
    // Le programme a démarré le 9 novembre : le 16 est donc sa semaine 2,
    // même si le plan importé annonce sa propre date de début.
    const actif = unProgramme({ id: 'actif', dateDebut: '2026-11-09' })

    const elements = convertirPlan(planValide(), {
      mode: 'fusionner',
      version: 1,
      programmeActif: actif,
      maintenant: MAINTENANT,
    })

    expect(elements.seances[0]?.semaine).toBe(2)
  })

  it('étend la fin du programme si le plan va plus loin', () => {
    const actif = unProgramme({ id: 'actif', dateDebut: '2026-11-09', dateFin: '2026-11-15' })

    const elements = convertirPlan(planValide(), {
      mode: 'fusionner',
      version: 1,
      programmeActif: actif,
      maintenant: MAINTENANT,
    })

    expect(elements.programme.dateFin).toBe('2026-11-16')
  })

  it('ne raccourcit jamais le programme en cours', () => {
    const actif = unProgramme({ id: 'actif', dateDebut: '2026-11-09', dateFin: '2027-02-03' })

    const elements = convertirPlan(planValide(), {
      mode: 'fusionner',
      version: 1,
      programmeActif: actif,
      maintenant: MAINTENANT,
    })

    expect(elements.programme.dateFin).toBe('2027-02-03')
  })

  it('se comporte comme un remplacement s’il n’y a aucun programme en cours', () => {
    const elements = convertirPlan(planValide(), {
      mode: 'fusionner',
      version: 1,
      maintenant: MAINTENANT,
    })

    expect(elements.nouveauProgramme).toBe(true)
    expect(elements.programme.version).toBe(1)
  })
})

describe('aperçu et bibliothèque existante', () => {
  it('distingue les exercices nouveaux de ceux qu’il met à jour', () => {
    const existante = [unExercice({ id: 'deja-la', nom: 'Déjà là' })]

    const apercu = apercuDuPlan(
      planValide({
        exercices: [
          { id: 'deja-la', nom: 'Déjà là', categorie: 'marche', impactGenou: 'faible' },
          { id: 'tout-neuf', nom: 'Tout neuf', categorie: 'marche', impactGenou: 'faible' },
        ],
        seances: [
          {
            date: '2026-11-16',
            type: 'marche',
            titre: 'Marche',
            exercices: [{ exerciceId: 'tout-neuf', cibles: { dureeMinutes: 20 } }],
          },
        ],
      }),
      { bibliotheque: existante },
    )

    expect(apercu.exercicesMisAJour).toEqual(['Déjà là'])
    expect(apercu.exercicesNouveaux).toEqual(['Tout neuf'])
  })
})

describe('avertissements sur les exercices pris dans la bibliothèque', () => {
  function planQuiProgramme(exerciceId: string) {
    return planValide({
      seances: [
        {
          date: '2026-11-16',
          type: 'natation',
          titre: 'Séance',
          exercices: [{ exerciceId, cibles: { longueurs: 6 } }],
        },
      ],
    })
  }

  function messages(exerciceId: string): string {
    const apercu = apercuDuPlan(planQuiProgramme(exerciceId), { bibliotheque, precautions })
    return apercu.avertissements.map((avertissement) => avertissement.message).join(' | ')
  }

  it('signale la brasse même quand le plan ne la définit pas', () => {
    // Le cas réel : un plan préparé sur le PC référence la bibliothèque au
    // lieu de redéfinir les exercices. Sans ce contrôle, le mouvement que le
    // chapitre 10 demande de signaler passait sans un mot.
    expect(messages('nage-brasse')).toMatch(/flexion marquée/)
    expect(messages('nage-brasse')).toMatch(/Brasse/)
  })

  it('n’empêche pas l’import pour autant', () => {
    const apercu = apercuDuPlan(planQuiProgramme('nage-brasse'), { bibliotheque, precautions })

    expect(apercu.applicable).toBe(true)
    expect(apercu.erreurs).toEqual([])
  })

  it('signale un exercice à fort impact programmé depuis la bibliothèque', () => {
    expect(messages('course-a-pied')).toMatch(/fort impact/)
  })

  it('signale un impact modéré programmé depuis la bibliothèque', () => {
    expect(messages('marche-avec-denivele')).toMatch(/[Ii]mpact modéré/)
  })

  it('reste muet sur un exercice à faible impact', () => {
    expect(messages('marche-rapide')).toBe('')
  })

  it('désigne les séances plutôt que les exercices quand le plan ne le définit pas', () => {
    const apercu = apercuDuPlan(planQuiProgramme('nage-brasse'), { bibliotheque, precautions })

    expect(apercu.avertissements[0]?.chemin).toBe('seances')
  })

  it('n’avertit qu’une fois quand l’exercice est à la fois défini et programmé', () => {
    const plan = planValide({
      exercices: [
        {
          id: 'nage-brasse',
          nom: 'Brasse',
          categorie: 'natation',
          impactGenou: 'modere',
          flexionMarquee: true,
          materielRequis: ['piscine'],
        },
      ],
      seances: [
        {
          date: '2026-11-16',
          type: 'natation',
          titre: 'Séance',
          exercices: [{ exerciceId: 'nage-brasse', cibles: { longueurs: 6 } }],
        },
      ],
    })

    const apercu = apercuDuPlan(plan, { bibliotheque, precautions })
    const signalements = apercu.avertissements.filter((avertissement) =>
      /flexion marquée/.test(avertissement.message),
    )

    expect(signalements).toHaveLength(1)
    expect(signalements[0]?.chemin).toBe('exercices')
  })
})
