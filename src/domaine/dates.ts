/**
 * Primitives de date, en UTC pour que la semaine d'une séance ne change pas
 * selon le fuseau du téléphone. Module pur, sans dépendance.
 *
 * La semaine va du lundi au dimanche : le bilan hebdomadaire est généré le
 * dimanche soir (chapitre 5).
 */
import type { DateIso, HorodatageIso } from './entites/communs'

const FORMAT_DATE_ISO = /^\d{4}-\d{2}-\d{2}$/

const MS_PAR_JOUR = 24 * 60 * 60 * 1000

/** Convertit un instant en date ISO (jour UTC). */
export function versDateIso(instant: Date): DateIso {
  return instant.toISOString().slice(0, 10)
}

/** Convertit une date ISO en instant (minuit UTC). */
export function versInstant(date: DateIso): Date {
  return new Date(date + 'T00:00:00.000Z')
}

/** Vrai si la chaîne est une date ISO `AAAA-MM-JJ` qui existe réellement. */
export function estDateIso(valeur: string): valeur is DateIso {
  if (!FORMAT_DATE_ISO.test(valeur)) return false
  const instant = Date.parse(valeur + 'T00:00:00.000Z')
  if (Number.isNaN(instant)) return false
  // Rejette 2026-02-31, que Date.parse accepterait en débordant sur mars.
  return versDateIso(new Date(instant)) === valeur
}

/**
 * Date du jour, selon le calendrier **local** du téléphone.
 *
 * C'est la seule fonction du module qui ne raisonne pas en UTC, et c'est
 * voulu : à Paris, une séance saisie à 00 h 30 doit porter la date du jour qui
 * commence, pas celle de la veille (il serait encore 23 h 30 en UTC). Le
 * calcul des semaines, lui, reste en UTC parce qu'il ne manipule que des
 * minuits déjà figés.
 *
 * L'instant est injectable pour rendre les tests déterministes.
 */
export function aujourdhui(maintenant: Date = new Date()): DateIso {
  const annee = maintenant.getFullYear()
  const mois = String(maintenant.getMonth() + 1).padStart(2, '0')
  const jour = String(maintenant.getDate()).padStart(2, '0')
  return annee + '-' + mois + '-' + jour
}

/** Horodatage complet, pour les champs `creeLe` et `saisieLe`. */
export function maintenantIso(maintenant: Date = new Date()): HorodatageIso {
  return maintenant.toISOString()
}

/** Décale une date de `jours` jours (négatif pour reculer). */
export function ajouterJours(date: DateIso, jours: number): DateIso {
  return versDateIso(new Date(versInstant(date).getTime() + jours * MS_PAR_JOUR))
}

/** Nombre de jours de `depuis` à `jusqua` (négatif si `jusqua` est avant). */
export function joursEntre(depuis: DateIso, jusqua: DateIso): number {
  const ecart = versInstant(jusqua).getTime() - versInstant(depuis).getTime()
  return Math.round(ecart / MS_PAR_JOUR)
}

/** Lundi de la semaine contenant `date`. */
export function lundiDeLaSemaine(date: DateIso): DateIso {
  const jour = versInstant(date).getUTCDay() // 0 = dimanche
  const reculDeJours = (jour + 6) % 7
  return ajouterJours(date, -reculDeJours)
}

/** Dimanche de la semaine contenant `date`. */
export function dimancheDeLaSemaine(date: DateIso): DateIso {
  return ajouterJours(lundiDeLaSemaine(date), 6)
}

/** Bornes incluses de la semaine contenant `date`. */
export function plageDeSemaine(date: DateIso): { debut: DateIso; fin: DateIso } {
  const debut = lundiDeLaSemaine(date)
  return { debut, fin: ajouterJours(debut, 6) }
}

/** Les sept dates de la semaine contenant `date`, du lundi au dimanche. */
export function joursDeLaSemaine(date: DateIso): DateIso[] {
  const debut = lundiDeLaSemaine(date)
  return Array.from({ length: 7 }, (_, decalage) => ajouterJours(debut, decalage))
}

/**
 * Numéro de semaine du programme, 1 pour la semaine qui contient la date de
 * début. Le découpage suit les semaines calendaires : la semaine 2 commence le
 * lundi suivant, même si le programme a démarré un jeudi.
 */
export function numeroDeSemaineProgramme(dateDebut: DateIso, date: DateIso): number {
  const premierLundi = lundiDeLaSemaine(dateDebut)
  return Math.floor(joursEntre(premierLundi, date) / 7) + 1
}

/** Vrai si les deux dates tombent dans la même semaine, du lundi au dimanche. */
export function memeSemaine(a: DateIso, b: DateIso): boolean {
  return lundiDeLaSemaine(a) === lundiDeLaSemaine(b)
}

/** Vrai si `date` est dans la plage, bornes incluses. */
export function dansLaPlage(date: DateIso, debut: DateIso, fin: DateIso): boolean {
  return date >= debut && date <= fin
}
