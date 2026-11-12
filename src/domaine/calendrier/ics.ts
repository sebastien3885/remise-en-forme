/**
 * Export iCalendar des séances à venir — les « rappels » du chapitre 9.
 *
 * Une application web installée **ne peut pas se réveiller à une heure dite**
 * pour envoyer une notification : il lui faudrait un serveur qui la pousse.
 * Plutôt qu'un rappel qui ne partirait qu'une fois sur trois, l'application
 * confie les séances à l'outil du téléphone qui sait réveiller : l'agenda.
 *
 * Deux choix qui tiennent au cahier des charges :
 *
 * - **Journée entière, pas d'horaire.** « Pas de créneaux fixes à déclarer »
 *   (chapitre 2) : une séance porte une date, jamais une heure. Inventer
 *   « 18 h 00 » serait une donnée qui n'existe pas.
 * - **Un rappel le matin même**, parce qu'un événement sans alarme ne rappelle
 *   rien. L'heure est un réglage de l'export, pas une propriété de la séance,
 *   et l'agenda permet de la changer ensuite.
 *
 * L'identifiant d'un événement est celui de la séance : réimporter le fichier
 * met les événements à jour au lieu de les dupliquer.
 */
import { ajouterJours } from '../dates'
import type { DateIso, HorodatageIso } from '../entites/communs'

/** Une séance vue par l'agenda : une date, un titre, un détail facultatif. */
export interface EvenementAgenda {
  /** Identifiant stable de la séance. */
  id: string
  date: DateIso
  titre: string
  details?: string
}

export interface OptionsIcs {
  genereLe: HorodatageIso
  /** Heure du rappel le jour même, en minutes depuis minuit. */
  rappelMinutes?: number
}

/** 8 h 00 : assez tôt pour organiser sa journée, pas au milieu de la nuit. */
export const RAPPEL_PAR_DEFAUT = 8 * 60

const PRODID = '-//Remise en forme//Seances//FR'
const encodeur = new TextEncoder()

const ANTISLASH = String.fromCharCode(92)

/**
 * Échappe un champ TEXT (RFC 5545, 3.3.11).
 *
 * L'ordre compte : l'antislash en premier, sinon on échapperait les antislashes
 * que l'on vient d'ajouter.
 */
function echapper(valeur: string): string {
  return valeur
    .split(ANTISLASH)
    .join(ANTISLASH + ANTISLASH)
    .split(';')
    .join(ANTISLASH + ';')
    .split(',')
    .join(ANTISLASH + ',')
    .replace(/\r\n|\r|\n/g, ANTISLASH + 'n')
}

/**
 * Replie une ligne à 75 octets (RFC 5545, 3.1).
 *
 * En **octets**, pas en caractères : « étirements » en compte plus qu'il n'a de
 * lettres. Le découpage se fait entre points de code, jamais au milieu d'un
 * caractère accentué, et l'espace de continuation compte dans les 75.
 */
function plier(ligne: string): string[] {
  const lignes: string[] = []
  let courante = ''
  let octets = 0

  for (const caractere of ligne) {
    const taille = encodeur.encode(caractere).length
    if (octets + taille > 75) {
      lignes.push(courante)
      courante = ' '
      octets = 1
    }
    courante += caractere
    octets += taille
  }

  lignes.push(courante)
  return lignes
}

/** 2026-11-12 → 20261112 */
function versDateIcs(date: DateIso): string {
  return date.split('-').join('')
}

/** 2026-11-12T19:30:00.000Z → 20261112T193000Z */
function versHorodatageIcs(horodatage: HorodatageIso): string {
  const utc = new Date(horodatage).toISOString()
  return utc.slice(0, 19).replace(/[-:]/g, '') + 'Z'
}

/** 480 → PT8H, 90 → PT1H30M, 0 → PT0S */
function versDuree(minutes: number): string {
  const heures = Math.floor(minutes / 60)
  const reste = minutes % 60
  if (heures === 0 && reste === 0) return 'PT0S'
  return 'PT' + (heures > 0 ? String(heures) + 'H' : '') + (reste > 0 ? String(reste) + 'M' : '')
}

/** Construit le fichier .ics. Rien n'est envoyé nulle part : c'est du texte. */
export function construireIcs(
  evenements: readonly EvenementAgenda[],
  options: OptionsIcs,
): string {
  const rappel = versDuree(options.rappelMinutes ?? RAPPEL_PAR_DEFAUT)
  const horodatage = versHorodatageIcs(options.genereLe)

  const lignes: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:' + PRODID,
    'CALSCALE:GREGORIAN',
    'X-WR-CALNAME:Remise en forme',
  ]

  for (const evenement of evenements) {
    lignes.push(
      'BEGIN:VEVENT',
      'UID:' + echapper(evenement.id) + '@remise-en-forme',
      'DTSTAMP:' + horodatage,
      'DTSTART;VALUE=DATE:' + versDateIcs(evenement.date),
      // DTEND est exclusif : le lendemain, pour une journée entière.
      'DTEND;VALUE=DATE:' + versDateIcs(ajouterJours(evenement.date, 1)),
      'SUMMARY:' + echapper(evenement.titre),
    )

    if (evenement.details !== undefined && evenement.details !== '') {
      lignes.push('DESCRIPTION:' + echapper(evenement.details))
    }

    lignes.push(
      // Une séance n'occupe pas un créneau : elle ne doit pas rendre « occupé ».
      'TRANSP:TRANSPARENT',
      'BEGIN:VALARM',
      'ACTION:DISPLAY',
      'DESCRIPTION:' + echapper(evenement.titre),
      'TRIGGER;RELATED=START:' + rappel,
      'END:VALARM',
      'END:VEVENT',
    )
  }

  lignes.push('END:VCALENDAR')

  // CRLF, y compris en fin de fichier : la RFC ne laisse pas le choix.
  return lignes.flatMap(plier).join('\r\n') + '\r\n'
}

/** remise-en-forme-seances-2026-11-12.ics */
export function nomDeFichierIcs(genereLe: HorodatageIso): string {
  return 'remise-en-forme-seances-' + genereLe.slice(0, 10) + '.ics'
}
