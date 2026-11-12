import { describe, expect, it } from 'vitest'

import {
  ajouterJours,
  aujourdhui,
  dansLaPlage,
  dimancheDeLaSemaine,
  estDateIso,
  joursDeLaSemaine,
  joursEntre,
  lundiDeLaSemaine,
  memeSemaine,
  numeroDeSemaineProgramme,
  plageDeSemaine,
} from './dates'

describe('estDateIso', () => {
  it('accepte une date réelle', () => {
    expect(estDateIso('2026-11-12')).toBe(true)
    expect(estDateIso('2024-02-29')).toBe(true)
  })

  it('refuse un format approximatif', () => {
    expect(estDateIso('2026-1-5')).toBe(false)
    expect(estDateIso('12/11/2026')).toBe(false)
    expect(estDateIso('2026-11-12T08:00:00Z')).toBe(false)
    expect(estDateIso('')).toBe(false)
  })

  it('refuse une date qui n’existe pas', () => {
    expect(estDateIso('2026-02-31')).toBe(false)
    expect(estDateIso('2026-13-01')).toBe(false)
    expect(estDateIso('2025-02-29')).toBe(false)
  })
})

describe('aujourdhui', () => {
  // Dates construites en heure locale pour que le test ne dépende pas du
  // fuseau de la machine. Les mois partent de 0 : 10 vaut novembre.
  it('rend le jour local en fin de soirée', () => {
    expect(aujourdhui(new Date(2026, 10, 12, 23, 30))).toBe('2026-11-12')
  })

  it('rend le jour local juste après minuit, et pas la veille', () => {
    expect(aujourdhui(new Date(2026, 10, 13, 0, 30))).toBe('2026-11-13')
  })

  it('complète le mois et le jour sur deux chiffres', () => {
    expect(aujourdhui(new Date(2027, 0, 5, 12, 0))).toBe('2027-01-05')
  })
})

describe('ajouterJours', () => {
  it('avance et recule', () => {
    expect(ajouterJours('2026-11-12', 1)).toBe('2026-11-13')
    expect(ajouterJours('2026-11-12', -1)).toBe('2026-11-11')
  })

  it('franchit les mois et les années', () => {
    expect(ajouterJours('2026-11-30', 1)).toBe('2026-12-01')
    expect(ajouterJours('2026-12-31', 1)).toBe('2027-01-01')
    expect(ajouterJours('2024-02-28', 1)).toBe('2024-02-29')
  })

  it('franchit un changement d’heure sans décaler le jour', () => {
    // Dernier dimanche de mars 2026 : heure d'été en France.
    expect(ajouterJours('2026-03-28', 1)).toBe('2026-03-29')
    expect(ajouterJours('2026-03-29', 1)).toBe('2026-03-30')
    // Dernier dimanche d'octobre 2026 : retour à l'heure d'hiver.
    expect(ajouterJours('2026-10-24', 1)).toBe('2026-10-25')
    expect(ajouterJours('2026-10-25', 1)).toBe('2026-10-26')
  })
})

describe('joursEntre', () => {
  it('compte dans les deux sens', () => {
    expect(joursEntre('2026-11-12', '2026-11-19')).toBe(7)
    expect(joursEntre('2026-11-19', '2026-11-12')).toBe(-7)
    expect(joursEntre('2026-11-12', '2026-11-12')).toBe(0)
  })
})

describe('semaine du lundi au dimanche', () => {
  it('ramène chaque jour au lundi de sa semaine', () => {
    // 2026-11-12 est un jeudi.
    expect(lundiDeLaSemaine('2026-11-12')).toBe('2026-11-09')
    // Le lundi est son propre lundi.
    expect(lundiDeLaSemaine('2026-11-09')).toBe('2026-11-09')
    // Le dimanche appartient à la semaine qui s’achève, pas à la suivante.
    expect(lundiDeLaSemaine('2026-11-15')).toBe('2026-11-09')
  })

  it('rend le dimanche de fin de semaine', () => {
    expect(dimancheDeLaSemaine('2026-11-12')).toBe('2026-11-15')
    expect(dimancheDeLaSemaine('2026-11-15')).toBe('2026-11-15')
  })

  it('rend les bornes de la semaine', () => {
    expect(plageDeSemaine('2026-11-12')).toEqual({
      debut: '2026-11-09',
      fin: '2026-11-15',
    })
  })

  it('rend les sept jours dans l’ordre', () => {
    expect(joursDeLaSemaine('2026-11-12')).toEqual([
      '2026-11-09',
      '2026-11-10',
      '2026-11-11',
      '2026-11-12',
      '2026-11-13',
      '2026-11-14',
      '2026-11-15',
    ])
  })

  it('reconnaît deux jours de la même semaine', () => {
    expect(memeSemaine('2026-11-09', '2026-11-15')).toBe(true)
    expect(memeSemaine('2026-11-15', '2026-11-16')).toBe(false)
  })
})

describe('numeroDeSemaineProgramme', () => {
  it('place le jour de départ en semaine 1', () => {
    // Programme démarré le jeudi 2026-11-12.
    expect(numeroDeSemaineProgramme('2026-11-12', '2026-11-12')).toBe(1)
  })

  it('garde toute la semaine de départ en semaine 1, même avant le départ', () => {
    expect(numeroDeSemaineProgramme('2026-11-12', '2026-11-09')).toBe(1)
    expect(numeroDeSemaineProgramme('2026-11-12', '2026-11-15')).toBe(1)
  })

  it('passe en semaine 2 le lundi suivant', () => {
    expect(numeroDeSemaineProgramme('2026-11-12', '2026-11-16')).toBe(2)
  })

  it('compte les douze semaines du programme', () => {
    // La semaine 12 commence onze lundis après le premier.
    expect(numeroDeSemaineProgramme('2026-11-12', '2026-11-09')).toBe(1)
    expect(numeroDeSemaineProgramme('2026-11-12', ajouterJours('2026-11-09', 11 * 7))).toBe(12)
    expect(numeroDeSemaineProgramme('2026-11-12', ajouterJours('2026-11-09', 12 * 7))).toBe(13)
  })
})

describe('dansLaPlage', () => {
  it('inclut les bornes', () => {
    expect(dansLaPlage('2026-11-09', '2026-11-09', '2026-11-15')).toBe(true)
    expect(dansLaPlage('2026-11-15', '2026-11-09', '2026-11-15')).toBe(true)
    expect(dansLaPlage('2026-11-08', '2026-11-09', '2026-11-15')).toBe(false)
    expect(dansLaPlage('2026-11-16', '2026-11-09', '2026-11-15')).toBe(false)
  })
})
