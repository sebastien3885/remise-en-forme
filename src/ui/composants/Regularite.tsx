/**
 * La régularité du journal alimentaire sur une semaine (chapitre 6).
 *
 * Affichée à deux endroits : dans l'écran Alimentation, et **à côté du bilan
 * sportif** dans Progrès, comme le demande le chapitre 6 — les deux côtés de
 * la même semaine se lisent alors au même endroit.
 *
 * Elle compte les jours notés et les jours tenus, et ne dit rien d'autre. Un
 * jour sans donnée n'est pas un jour manqué : il est hors jeu (chapitre 10).
 * C'est pourquoi les deux chiffres sont distincts — « 5 sur 7 notés » et
 * « 3 tenus » racontent deux choses, et les confondre ferait du journal un
 * registre de fautes.
 */
import type { ScoreRegularite } from '../../domaine/alimentation/reperes'

export function Regularite({ score }: { score: ScoreRegularite }) {
  const pluriel = score.joursTenus > 1 ? 's' : ''

  return (
    <section className="carte">
      <h2>Régularité du journal</h2>

      <div className="rangee-chiffres" style={{ background: 'transparent', padding: 0 }}>
        <div>
          <p className="chiffre">
            {score.joursRenseignes}
            <span className="discret">/7</span>
          </p>
          <p className="etiquette">jours notés</p>
        </div>
        <div>
          <p className="chiffre">{score.joursTenus}</p>
          <p className="etiquette">
            jour{pluriel} tenu{pluriel}
          </p>
        </div>
      </div>

      <p className="discret" style={{ marginTop: 14, fontSize: '0.9rem' }}>
        {score.atteint
          ? 'Objectif de régularité atteint : le journal est tenu ' +
            String(score.objectifJours) +
            ' jours ou plus.'
          : 'Objectif : noter le journal au moins ' +
            String(score.objectifJours) +
            ' jours par semaine.'}
      </p>
    </section>
  )
}
