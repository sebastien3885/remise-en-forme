import { describe, expect, it } from 'vitest'

import { unExercice } from '../../tests/fixtures'
import type { Exercice, Precautions } from '../entites'
import { contexteDepuisProfil, type ContexteExercices } from '../profil/precautions'
import { profilParDefaut } from '../profil/profil-par-defaut'
import { bibliothequeInitiale } from './bibliotheque'
import { variantePlusDifficile, variantePlusDouce } from './variantes'

const bibliotheque = bibliothequeInitiale(new Date('2026-11-12T08:00:00.000Z'))
const parId = new Map(bibliotheque.map((exercice) => [exercice.id, exercice]))

function exercice(id: string): Exercice {
  const trouve = parId.get(id)
  if (!trouve) throw new Error('Exercice absent de la bibliothèque de test : ' + id)
  return trouve
}

const parDefaut = contexteDepuisProfil(profilParDefaut())

function contexte(precautions: Partial<Precautions> = {}): ContexteExercices {
  return {
    precautions: {
      impactGenouMaximal: 'modere',
      exclureFlexionMarquee: false,
      exercicesExclusIds: [],
      ...precautions,
    },
    materiel: ['tapis', 'piscine', 'velo'],
  }
}

describe('variantePlusDouce', () => {
  it('descend d’un cran sur la chaîne', () => {
    expect(variantePlusDouce(exercice('squat-mi-amplitude'), bibliotheque, parDefaut)?.id).toBe(
      'squat-sur-chaise',
    )
    expect(variantePlusDouce(exercice('marche-avec-denivele'), bibliotheque, parDefaut)?.id).toBe(
      'marche-rapide',
    )
    expect(variantePlusDouce(exercice('pompes-au-sol'), bibliotheque, parDefaut)?.id).toBe(
      'pompes-inclinees',
    )
  })

  it('ne rend rien quand on est déjà au plus doux', () => {
    expect(variantePlusDouce(exercice('marche-tranquille'), bibliotheque, parDefaut)).toBeUndefined()
    expect(variantePlusDouce(exercice('squat-sur-chaise'), bibliotheque, parDefaut)).toBeUndefined()
  })

  it('continue de descendre tant que la variante trouvée est écartée', () => {
    const chaine: Exercice[] = [
      unExercice({ id: 'dur', varianteFacileId: 'moyen' }),
      unExercice({ id: 'moyen', varianteFacileId: 'doux' }),
      unExercice({ id: 'doux' }),
    ]

    const resultat = variantePlusDouce(
      chaine[0] as Exercice,
      chaine,
      contexte({ exercicesExclusIds: ['moyen'] }),
    )

    expect(resultat?.id).toBe('doux')
  })

  it('ne rend rien si tout le bas de la chaîne est écarté', () => {
    const chaine: Exercice[] = [
      unExercice({ id: 'dur', varianteFacileId: 'moyen' }),
      unExercice({ id: 'moyen', varianteFacileId: 'doux' }),
      unExercice({ id: 'doux' }),
    ]

    const resultat = variantePlusDouce(
      chaine[0] as Exercice,
      chaine,
      contexte({ exercicesExclusIds: ['moyen', 'doux'] }),
    )

    expect(resultat).toBeUndefined()
  })

  it('ne tourne pas en rond sur une chaîne circulaire', () => {
    // Un plan importé peut contenir une chaîne mal saisie.
    const boucle: Exercice[] = [
      unExercice({ id: 'a', varianteFacileId: 'b' }),
      unExercice({ id: 'b', varianteFacileId: 'a' }),
    ]

    const resultat = variantePlusDouce(
      boucle[0] as Exercice,
      boucle,
      contexte({ exercicesExclusIds: ['a', 'b'] }),
    )

    expect(resultat).toBeUndefined()
  })

  it('ne rend rien quand la variante désignée n’existe pas', () => {
    const orphelin = unExercice({ id: 'orphelin', varianteFacileId: 'fantome' })

    expect(variantePlusDouce(orphelin, [orphelin], parDefaut)).toBeUndefined()
  })
})

describe('variantePlusDifficile', () => {
  it('monte d’un cran sur la chaîne', () => {
    expect(
      variantePlusDifficile(exercice('squat-sur-chaise'), bibliotheque, parDefaut)?.id,
    ).toBe('squat-mi-amplitude')
    expect(variantePlusDifficile(exercice('marche-rapide'), bibliotheque, parDefaut)?.id).toBe(
      'marche-avec-denivele',
    )
  })

  it('ne rend rien quand il n’y a pas de cran au-dessus', () => {
    expect(
      variantePlusDifficile(exercice('marche-avec-denivele'), bibliotheque, parDefaut),
    ).toBeUndefined()
  })

  it('s’arrête net si le cran suivant est écarté, sans chercher plus loin', () => {
    // Avec un plafond resserré, un palier sur le squat sur chaise ne doit
    // proposer ni le squat à mi-amplitude ni, surtout, le squat profond.
    const strict = contexte({ impactGenouMaximal: 'faible' })

    expect(variantePlusDifficile(exercice('squat-sur-chaise'), bibliotheque, strict)).toBeUndefined()
  })

  it('ne propose jamais un exercice à fort impact sous les précautions par défaut', () => {
    for (const depart of bibliotheque) {
      const suivant = variantePlusDifficile(depart, bibliotheque, parDefaut)
      if (suivant) {
        expect(suivant.impactGenou).not.toBe('eleve')
      }
    }
  })

  it('ne rend rien quand la variante désignée n’existe pas', () => {
    const orphelin = unExercice({ id: 'orphelin', varianteDifficileId: 'fantome' })

    expect(variantePlusDifficile(orphelin, [orphelin], parDefaut)).toBeUndefined()
  })
})
