/**
 * Traduction des erreurs de schéma en phrases françaises.
 *
 * Partagée par l'import de plans et l'import de sauvegardes : les deux
 * refusent un fichier mal formé, et les deux doivent dire **où** et
 * **pourquoi**, sinon l'utilisateur ne peut rien corriger.
 */
import type { z } from 'zod'

export interface ProblemeDeFormat {
  /** Où, dans le fichier : `seances[2].exercices[0].cibles`. */
  chemin: string
  message: string
}

export function cheminLisible(chemin: ReadonlyArray<PropertyKey>): string {
  if (chemin.length === 0) return 'racine du fichier'
  return chemin.reduce<string>((accumule, segment) => {
    if (typeof segment === 'number') return accumule + '[' + String(segment) + ']'
    return accumule === '' ? String(segment) : accumule + '.' + String(segment)
  }, '')
}

function typeEnFrancais(attendu: string): string {
  const traductions: Record<string, string> = {
    string: 'du texte',
    number: 'un nombre',
    boolean: 'vrai ou faux',
    array: 'une liste',
    object: 'un objet',
  }
  return traductions[attendu] ?? attendu
}

export function messageEnFrancais(probleme: z.core.$ZodIssue): string {
  switch (probleme.code) {
    case 'invalid_type':
      return 'valeur attendue : ' + typeEnFrancais(probleme.expected)
    case 'unrecognized_keys':
      return (
        'clé inconnue : ' +
        probleme.keys.join(', ') +
        ' (une faute de frappe passerait inaperçue, donc le fichier est refusé)'
      )
    case 'invalid_value': {
      const attendues = probleme.values.map((valeur) => JSON.stringify(valeur)).join(', ')
      return 'valeur non reconnue ; attendu : ' + attendues
    }
    case 'too_small':
      return 'valeur trop petite ou liste trop courte (minimum ' + String(probleme.minimum) + ')'
    case 'too_big':
      return 'valeur trop grande (maximum ' + String(probleme.maximum) + ')'
    default:
      return probleme.message
  }
}

/** Les dix premiers problèmes : au-delà, la liste n'aide plus personne. */
export function formaterProblemes(
  issues: readonly z.core.$ZodIssue[],
  maximum = 10,
): ProblemeDeFormat[] {
  return issues.slice(0, maximum).map((probleme) => ({
    chemin: cheminLisible(probleme.path),
    message: messageEnFrancais(probleme),
  }))
}

/** Message d'un JSON illisible, avant même tout schéma. */
export function problemeDeJson(erreur: unknown): ProblemeDeFormat {
  return {
    chemin: 'fichier',
    message:
      'le fichier n’est pas du JSON valide : ' +
      (erreur instanceof Error ? erreur.message : String(erreur)),
  }
}
