# Remise en forme — repères pour Claude Code

Application personnelle de suivi de forme et d'alimentation. Un seul utilisateur,
usage surtout sur téléphone Android. Le cahier des charges complet est dans
[CAHIER_DES_CHARGES.md](CAHIER_DES_CHARGES.md) : il fait référence, et les numéros
de chapitre cités dans le code y renvoient.

## Stack

| Sujet | Choix |
| --- | --- |
| Interface | React 19 + TypeScript, Vite |
| Stockage | IndexedDB via Dexie — aucun serveur, aucun compte |
| Validation des fichiers importés | zod |
| Hors ligne | `vite-plugin-pwa` (service worker, `registerType: autoUpdate`) |
| Tests | Vitest (Playwright arrive à l'étape 5) |
| Hébergement | GitHub Pages, `base` défini dans `vite.config.ts` (`NOM_DEPOT`) |

## Commandes

```bash
npm run dev         # serveur de développement
npm test            # tous les tests, une passe
npm run test:watch  # tests en continu
npm run typecheck   # TypeScript seul
npm run build       # typecheck + build de production (génère le service worker)
npm run lint        # ESLint
```

## Organisation du code

```
src/config/      progression.json (les règles du chapitre 5) + son schéma zod
src/domaine/     métier pur : ni React, ni Dexie, ni DOM. Testable seul.
  entites/       les neuf entités du chapitre 7
  exercices/     bibliothèque et choix de variantes
  plans/         format d'import, contrôle, aperçu, conversion
  profil/        profil par défaut et précautions du chapitre 10
  progression/   le moteur : statistiques, règles, propositions
src/stockage/    la seule couche qui connaît IndexedDB (Dexie + dépôts)
src/ui/          écrans, composants, navigation, hooks
```

**Les règles de progression se règlent dans `src/config/progression.json`**, pas
dans le code. Le fichier est contrôlé au chargement, et il ne peut pas franchir
les garde-fous du chapitre 10 : une augmentation au-delà de 10 % ou un minimum
de zéro jour de repos font échouer le démarrage.

**Le moteur ne lit et n'écrit rien.** `genererBilan` reçoit des séances et rend
un bilan ; `proposerSemaineSuivante` reçoit une semaine et en rend une autre.
Aucun accès à la base, aucun état.

**Règle d'architecture.** `src/domaine/` n'importe jamais rien de `src/stockage/`
ni de `src/ui/`. Le moteur de progression est un module pur : il reçoit des
données, rend une proposition, et ne lit ni n'écrit rien.

**Nommage en français**, pour coller au vocabulaire du cahier des charges
(`seanceRealisee`, `bilanHebdo`, `ressenti`, `depots`). Les noms d'outillage
restent conventionnels (`src`, `public`, `dist`).

**Le réalisé est la source de vérité** (chapitre 4). Le moteur de progression se
base sur les séances réalisées, jamais sur le programme théorique.

**Jamais d'écrasement** (chapitre 7). Une révision de programme crée une nouvelle
version ; l'historique est conservé.

**La navigation passe par le fragment d'URL** (`#/semaine`), sans bibliothèque de
routage : c'est ce qui rend le bouton retour d'Android utile dans l'application
installée. Les cinq onglets sont déclarés une fois dans
`src/ui/navigation/onglets.ts`.

**Une séance déjà saisie ne se déplace pas.** Son réalisé porte la date du jour
où elle a eu lieu, et c'est lui qui fait foi : déplacer le prévu détacherait les
deux. Déposer une séance sur un jour occupé **échange** les deux, ce qui préserve
tout seul le jour de repos hebdomadaire.

## Langage visuel — « Grand geste »

Direction retenue parmi six maquettes. Fond presque noir, **un seul accent**
très lumineux, chiffres énormes, et une action principale large comme un
pouce : c'est la traduction visuelle de la contrainte des deux minutes du
chapitre 4 — l'action qui compte est la plus grosse chose à l'écran.

Tous les jetons sont dans `src/styles/global.css`, en variables CSS. **Aucune
couleur ni aucun rayon en dur dans un composant** : si une valeur manque,
ajouter un jeton plutôt qu'un littéral.

| Jeton | Valeur | Emploi |
| --- | --- | --- |
| `--fond` | `#0d1014` | fond d'écran |
| `--fond-carte` | `#171c22` | cartes et lignes |
| `--texte` / `--texte-discret` | `#f2f5f8` / `#9aa5b1` | encre (6,8:1 sur les cartes) |
| `--accent` / `--accent-texte` | `#c8f751` / `#121807` | l'action, et elle seule |
| `--cible-tactile` | 48 px | toute cible cliquable |
| `--cible-principale` | 76 px | `.bouton--principal`, un par écran |

Classes utiles : `.page`, `.carte`, `.bouton` (+ `--principal`, `--secondaire`,
`--icone`, `--fichier`), `.rangee-chiffres`, `.ligne`, `.donnees`, `.chiffre`,
`.surtitre`, `.liste-nue` (+ `.erreurs`, `.avertissements`, `.liste-ecartes`).

Trois règles qui ne se voient pas mais qui tiennent l'ensemble :

- **Un seul `.bouton--principal` par écran.** S'il y en a deux, l'écran n'a
  plus d'action principale.
- **L'accent ne sert jamais à décorer**, seulement à désigner ce sur quoi on
  appuie, ou le chiffre qui compte.
- **La couleur ne porte jamais seule une information.** Une erreur, un
  avertissement ou un état s'accompagne toujours d'un mot.

Le fond sombre est un choix de l'utilisateur, fait en connaissance du
compromis : un fond clair se lit mieux en plein soleil. L'accent est donc
volontairement très lumineux pour compenser.

## Règles de santé et de sécurité à respecter dans le code (chapitre 10)

Ces règles ne sont pas des suggestions d'interface : elles sont codées et testées.

- **Plafond de progression :** jamais plus de +10 % de charge d'une semaine à
  l'autre, quelle que soit la règle qui s'applique.
- **Un seul levier à la fois :** durée, ou intensité, ou fréquence. Pas deux.
- **Au moins un jour de repos complet par semaine**, imposé par l'application.
- **Genou** (antécédent articulaire déclaré) : chaque exercice
  porte un niveau d'impact sur le genou. Par défaut la v1 exclut course, sauts et
  squats profonds, et signale les mouvements à flexion marquée. Ce sont des
  précautions, pas un avis médical : l'utilisateur peut les lever lui-même.
- **Douleur signalée deux fois sur le même exercice** : proposer une variante plus
  douce et suggérer un avis médical.
- **Aucune cible calorique restrictive générée automatiquement.** Toute valeur
  chiffrée est saisie par l'utilisateur.
- **Aucun avis médical.** L'application accompagne, elle ne diagnostique pas.

## Vie privée

Les données restent sur l'appareil. Aucun suivi publicitaire, aucun outil
d'analyse tiers, aucune clé d'API ni donnée personnelle dans le dépôt.
