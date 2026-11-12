/**
 * Installer l'application sur le téléphone (chapitre 9).
 *
 * Installée, l'application s'ouvre en plein écran depuis l'écran d'accueil, le
 * bouton retour d'Android y sert à quelque chose, et elle continue de marcher
 * sans réseau. Ouverte dans un onglet, elle marche aussi, mais il faut
 * retrouver l'onglet.
 *
 * Le bouton n'apparaît que si le navigateur propose vraiment l'installation.
 * Le reste du temps, l'écran dit le chemin par le menu du navigateur plutôt
 * que d'afficher un bouton qui ne ferait rien.
 */
import { useInstallation } from '../hooks/useInstallation'

export function Installation() {
  const { possible, installee, installer } = useInstallation()

  return (
    <section className="carte">
      <h2>Installer sur le téléphone</h2>

      {installee ? (
        <p className="succes">L’application est installée sur cet appareil.</p>
      ) : (
        <>
          <p className="discret" style={{ fontSize: '0.92rem' }}>
            Installée, elle s’ouvre depuis l’écran d’accueil, en plein écran, et le bouton
            retour d’Android y sert à quelque chose. Les données restent les mêmes : elles
            sont déjà sur l’appareil.
          </p>

          {possible ? (
            <button
              className="bouton"
              type="button"
              style={{ marginTop: 16 }}
              onClick={() => void installer()}
            >
              Installer sur cet appareil
            </button>
          ) : (
            <p className="discret" style={{ fontSize: '0.92rem', marginTop: 12 }}>
              Ce navigateur ne propose pas l’installation ici. Dans Chrome sur Android, le
              menu ⋮ offre « Installer l’application » ou « Ajouter à l’écran d’accueil ».
            </p>
          )}
        </>
      )}
    </section>
  )
}
