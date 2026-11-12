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
