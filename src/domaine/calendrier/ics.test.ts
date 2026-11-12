import { describe, expect, it } from 'vitest'

import {
  construireIcs,
  nomDeFichierIcs,
  RAPPEL_PAR_DEFAUT,
  type EvenementAgenda,
} from './ics'
import type { DateIso, HorodatageIso } from '../entites/communs'

const GENERE_LE = '2026-11-12T19:30:00.000Z' as HorodatageIso
const ANTISLASH = String.fromCharCode(92)

function evenement(partiel: Partial<EvenementAgenda> = {}): EvenementAgenda {
  return {
    id: 'seance-1',
    date: '2026-11-16' as DateIso,
    titre: 'Marche rapide 30 min',
    ...partiel,
  }
}

/** Reconstitue les lignes logiques : le repli de la RFC est transparent. */
function lignesLogiques(ics: string): string[] {
  return ics
    .split('\r\n')
    .reduce<string[]>((lignes, ligne) => {
      if (ligne.startsWith(' ') && lignes.length > 0) {
        lignes[lignes.length - 1] += ligne.slice(1)
        return lignes
      }
      lignes.push(ligne)
      return lignes
    }, [])
    .filter((ligne) => ligne !== '')
}

function champ(ics: string, nom: string): string | undefined {
  const ligne = lignesLogiques(ics).find((candidate) => candidate.startsWith(nom))
  return ligne?.slice(nom.length)
}

describe('construireIcs', () => {
  it('encadre les événements dans un calendrier valide', () => {
    const ics = construireIcs([evenement()], { genereLe: GENERE_LE })
    const lignes = lignesLogiques(ics)

    expect(lignes[0]).toBe('BEGIN:VCALENDAR')
    expect(lignes.at(-1)).toBe('END:VCALENDAR')
    expect(lignes).toContain('VERSION:2.0')
    expect(lignes.filter((ligne) => ligne === 'BEGIN:VEVENT')).toHaveLength(1)
    expect(lignes.filter((ligne) => ligne === 'END:VEVENT')).toHaveLength(1)
  })

  it('termine chaque ligne par CRLF, fin de fichier comprise', () => {
    const ics = construireIcs([evenement()], { genereLe: GENERE_LE })

    expect(ics.endsWith('END:VCALENDAR\r\n')).toBe(true)
    // Aucun saut de ligne seul : tous sont précédés d'un retour chariot.
    expect(ics.split('\n').every((morceau, index, tous) => {
      if (index === tous.length - 1) return morceau === ''
      return morceau.endsWith('\r')
    })).toBe(true)
  })

  it('pose une journée entière, du jour au lendemain', () => {
    const ics = construireIcs([evenement({ date: '2026-11-16' as DateIso })], {
      genereLe: GENERE_LE,
    })

    expect(champ(ics, 'DTSTART;VALUE=DATE:')).toBe('20261116')
    // DTEND est exclusif : la séance tient sur le seul 16.
    expect(champ(ics, 'DTEND;VALUE=DATE:')).toBe('20261117')
    // Une séance n'occupe pas un créneau de l'agenda.
    expect(lignesLogiques(ics)).toContain('TRANSP:TRANSPARENT')
  })

  it('franchit un changement de mois sans se tromper de lendemain', () => {
    const ics = construireIcs([evenement({ date: '2026-11-30' as DateIso })], {
      genereLe: GENERE_LE,
    })

    expect(champ(ics, 'DTEND;VALUE=DATE:')).toBe('20261201')
  })

  it('reprend l’identifiant de la séance, pour mettre à jour au lieu de dupliquer', () => {
    const premier = construireIcs([evenement({ id: 'abc-123' })], { genereLe: GENERE_LE })
    const second = construireIcs([evenement({ id: 'abc-123' })], {
      genereLe: '2026-12-01T06:00:00.000Z' as HorodatageIso,
    })

    expect(champ(premier, 'UID:')).toBe('abc-123@remise-en-forme')
    // Le même identifiant d'un export à l'autre : l'agenda reconnaît l'événement.
    expect(champ(second, 'UID:')).toBe(champ(premier, 'UID:'))
    expect(champ(premier, 'DTSTAMP:')).toBe('20261112T193000Z')
  })

  it('échappe les caractères que la RFC réserve', () => {
    const ics = construireIcs(
      [
        evenement({
          titre: 'Vélo, 30 min ; côte',
          details: 'Première ligne\nSeconde ' + ANTISLASH + ' ligne',
        }),
      ],
      { genereLe: GENERE_LE },
    )

    expect(champ(ics, 'SUMMARY:')).toBe('Vélo' + ANTISLASH + ', 30 min ' + ANTISLASH + '; côte')
    expect(champ(ics, 'DESCRIPTION:')).toBe(
      'Première ligne' +
        ANTISLASH +
        'nSeconde ' +
        ANTISLASH +
        ANTISLASH +
        ' ligne',
    )
  })

  it('replie les lignes longues à 75 octets, sans couper un accent en deux', () => {
    const titre = 'Étirements des ischio-jambiers, du quadriceps et des mollets après la marche'
    const ics = construireIcs([evenement({ titre })], { genereLe: GENERE_LE })
    const encodeur = new TextEncoder()

    for (const ligne of ics.split('\r\n')) {
      expect(encodeur.encode(ligne).length).toBeLessThanOrEqual(75)
    }
    // Le repli est transparent : recollé, le titre est intact et lisible.
    expect(champ(ics, 'SUMMARY:')).toBe(titre.replace(',', ANTISLASH + ','))
    expect(ics).not.toContain('�')
  })

  it('pose un rappel le matin même, réglable', () => {
    const parDefaut = construireIcs([evenement()], { genereLe: GENERE_LE })
    const aMidiTrente = construireIcs([evenement()], {
      genereLe: GENERE_LE,
      rappelMinutes: 12 * 60 + 30,
    })
    const aMinuit = construireIcs([evenement()], { genereLe: GENERE_LE, rappelMinutes: 0 })

    expect(RAPPEL_PAR_DEFAUT).toBe(480)
    expect(champ(parDefaut, 'TRIGGER;RELATED=START:')).toBe('PT8H')
    expect(champ(aMidiTrente, 'TRIGGER;RELATED=START:')).toBe('PT12H30M')
    expect(champ(aMinuit, 'TRIGGER;RELATED=START:')).toBe('PT0S')
    expect(lignesLogiques(parDefaut)).toContain('ACTION:DISPLAY')
  })

  it('tient sans détail, et sans aucune séance', () => {
    const sansDetail = construireIcs([evenement({ details: undefined })], {
      genereLe: GENERE_LE,
    })
    const vide = construireIcs([], { genereLe: GENERE_LE })

    expect(sansDetail).not.toContain('DESCRIPTION:\r\n')
    expect(lignesLogiques(vide)).toEqual([
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Remise en forme//Seances//FR',
      'CALSCALE:GREGORIAN',
      'X-WR-CALNAME:Remise en forme',
      'END:VCALENDAR',
    ])
  })

  it('garde les séances dans l’ordre reçu', () => {
    const ics = construireIcs(
      [
        evenement({ id: 'a', date: '2026-11-16' as DateIso, titre: 'Lundi' }),
        evenement({ id: 'b', date: '2026-11-18' as DateIso, titre: 'Mercredi' }),
      ],
      { genereLe: GENERE_LE },
    )
    const titres = lignesLogiques(ics)
      .filter((ligne) => ligne.startsWith('SUMMARY:'))
      .map((ligne) => ligne.slice('SUMMARY:'.length))

    expect(titres).toEqual(['Lundi', 'Mercredi'])
  })
})

describe('nomDeFichierIcs', () => {
  it('porte la date de l’export', () => {
    expect(nomDeFichierIcs(GENERE_LE)).toBe('remise-en-forme-seances-2026-11-12.ics')
  })
})
