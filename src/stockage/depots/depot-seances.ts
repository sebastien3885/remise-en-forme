/**
 * Dépôt des séances : le prévu et le réalisé, séparés comme les entités.
 *
 * Les deux sous-dépôts sont volontairement distincts pour qu'aucun appel ne
 * puisse confondre les deux sources. Le moteur de progression ne lira que
 * `realisees` (règle de conception du chapitre 4).
 */
import type { DateIso, Id, SeancePrevue, SeanceRealisee } from '../../domaine/entites'
import { db, type BaseForme } from '../db'

export function depotSeances(base: BaseForme = db) {
  return {
    prevues: {
      async parId(id: Id): Promise<SeancePrevue | undefined> {
        return base.seancesPrevues.get(id)
      },

      async parDate(date: DateIso): Promise<SeancePrevue[]> {
        return base.seancesPrevues.where('date').equals(date).toArray()
      },

      /** Séances d'une plage de dates, bornes incluses, triées par date. */
      async parPlage(debut: DateIso, fin: DateIso): Promise<SeancePrevue[]> {
        const seances = await base.seancesPrevues
          .where('date')
          .between(debut, fin, true, true)
          .toArray()
        return seances.sort((a, b) => a.date.localeCompare(b.date))
      },

      async parSemaine(programmeId: Id, semaine: number): Promise<SeancePrevue[]> {
        const seances = await base.seancesPrevues
          .where('[programmeId+semaine]')
          .equals([programmeId, semaine])
          .toArray()
        return seances.sort((a, b) => a.date.localeCompare(b.date))
      },

      async parProgramme(programmeId: Id): Promise<SeancePrevue[]> {
        const seances = await base.seancesPrevues
          .where('programmeId')
          .equals(programmeId)
          .toArray()
        return seances.sort((a, b) => a.date.localeCompare(b.date))
      },

      async enregistrer(seance: SeancePrevue): Promise<void> {
        await base.seancesPrevues.put(seance)
      },

      async enregistrerPlusieurs(seances: SeancePrevue[]): Promise<void> {
        if (seances.length === 0) return
        await base.seancesPrevues.bulkPut(seances)
      },

      async supprimer(id: Id): Promise<void> {
        await base.seancesPrevues.delete(id)
      },

      /** Retire les séances d'un programme. Sert au remplacement d'un plan. */
      async supprimerDuProgramme(programmeId: Id): Promise<number> {
        return base.seancesPrevues.where('programmeId').equals(programmeId).delete()
      },

      async compter(): Promise<number> {
        return base.seancesPrevues.count()
      },
    },

    realisees: {
      async parId(id: Id): Promise<SeanceRealisee | undefined> {
        return base.seancesRealisees.get(id)
      },

      async parDate(date: DateIso): Promise<SeanceRealisee[]> {
        return base.seancesRealisees.where('date').equals(date).toArray()
      },

      /** Séances d'une plage de dates, bornes incluses : la base du bilan. */
      async parPlage(debut: DateIso, fin: DateIso): Promise<SeanceRealisee[]> {
        const seances = await base.seancesRealisees
          .where('date')
          .between(debut, fin, true, true)
          .toArray()
        return seances.sort((a, b) => a.date.localeCompare(b.date))
      },

      /** La réalisation d'une séance prévue, si elle a été saisie. */
      async pourSeancePrevue(seancePrevueId: Id): Promise<SeanceRealisee | undefined> {
        return base.seancesRealisees.where('seancePrevueId').equals(seancePrevueId).first()
      },

      async enregistrer(seance: SeanceRealisee): Promise<void> {
        await base.seancesRealisees.put(seance)
      },

      async enregistrerPlusieurs(seances: SeanceRealisee[]): Promise<void> {
        if (seances.length === 0) return
        await base.seancesRealisees.bulkPut(seances)
      },

      async supprimer(id: Id): Promise<void> {
        await base.seancesRealisees.delete(id)
      },

      async compter(): Promise<number> {
        return base.seancesRealisees.count()
      },
    },
  }
}

export type DepotSeances = ReturnType<typeof depotSeances>
