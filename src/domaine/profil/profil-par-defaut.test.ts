import { describe, expect, it } from 'vitest'

import { unProfil } from '../../tests/fixtures'
import { ID_PROFIL } from '../entites'
import { avisMedicalConseille, profilParDefaut } from './profil-par-defaut'

const MAINTENANT = new Date(2026, 10, 12, 9, 0) // jeudi 12 novembre 2026, heure locale

describe('profilParDefaut', () => {
  it('porte la clé unique du profil', () => {
    expect(profilParDefaut({ maintenant: MAINTENANT }).id).toBe(ID_PROFIL)
  })

  it('démarre aujourd’hui, sauf date imposée', () => {
    expect(profilParDefaut({ maintenant: MAINTENANT }).dateDebut).toBe('2026-11-12')
    expect(profilParDefaut({ dateDebut: '2026-12-01', maintenant: MAINTENANT }).dateDebut).toBe(
      '2026-12-01',
    )
  })

  it('ne suppose aucun antécédent médical', () => {
    // Un profil de départ ne sait rien du corps de qui l'installe. Les
    // antécédents se déclarent ; ils ne se devinent pas, et ils ne sont pas
    // ce qui protège — ce sont les précautions ci-dessous.
    expect(profilParDefaut({ maintenant: MAINTENANT }).antecedents).toEqual([])
  })

  it('exclut le fort impact et se contente de signaler la flexion marquée', () => {
    // Le chapitre 10 exclut course, sauts et squats profonds, mais « signale »
    // les mouvements à flexion marquée : il ne les interdit pas.
    const { precautions } = profilParDefaut({ maintenant: MAINTENANT })

    expect(precautions.impactGenouMaximal).toBe('modere')
    expect(precautions.exclureFlexionMarquee).toBe(false)
    expect(precautions.exercicesExclusIds).toEqual([])
  })

  it('laisse le niveau de départ vide : il se constate, il ne se devine pas', () => {
    expect(profilParDefaut({ maintenant: MAINTENANT }).niveauDepart).toEqual({})
  })

  it('reprend les deux cibles chiffrées des indicateurs à 12 semaines', () => {
    const objectifs = profilParDefaut({ maintenant: MAINTENANT }).objectifs

    expect(objectifs).toHaveLength(2)
    expect(objectifs[0]).toMatchObject({ indicateur: 'dureeMinutes', cible: 30 })
    expect(objectifs[1]).toMatchObject({ indicateur: 'longueurs', cible: 4 })
  })

  it('n’a pas encore montré l’avertissement de santé ni posé la question d’alerte', () => {
    const profil = profilParDefaut({ maintenant: MAINTENANT })

    expect(profil.avertissementSanteAccepte).toBe(false)
    expect(profil.alerteSante).toBeNull()
  })

  it('n’impose aucune cible chiffrée hors hydratation', () => {
    // Garde-fou du chapitre 6 : aucun objectif calorique généré automatiquement.
    const profil = profilParDefaut({ maintenant: MAINTENANT })

    expect(profil.objectifVerresEau).toBeGreaterThan(0)
    expect(profil.masquerPoids).toBe(false)
  })
})

describe('avisMedicalConseille', () => {
  it('ne conseille rien tant que la question d’alerte n’a pas été posée', () => {
    expect(avisMedicalConseille(unProfil({ alerteSante: null }))).toBe(false)
  })

  it('ne conseille rien quand toutes les réponses sont négatives', () => {
    const profil = unProfil({
      alerteSante: {
        douleursThoraciques: false,
        malaises: false,
        problemesCardiaquesConnus: false,
        repondueLe: '2026-11-12T09:00:00.000Z',
      },
    })

    expect(avisMedicalConseille(profil)).toBe(false)
  })

  it('conseille un avis dès qu’une seule réponse est positive', () => {
    const base = {
      douleursThoraciques: false,
      malaises: false,
      problemesCardiaquesConnus: false,
      repondueLe: '2026-11-12T09:00:00.000Z',
    }

    expect(avisMedicalConseille(unProfil({ alerteSante: { ...base, malaises: true } }))).toBe(
      true,
    )
    expect(
      avisMedicalConseille(unProfil({ alerteSante: { ...base, douleursThoraciques: true } })),
    ).toBe(true)
    expect(
      avisMedicalConseille(
        unProfil({ alerteSante: { ...base, problemesCardiaquesConnus: true } }),
      ),
    ).toBe(true)
  })
})
