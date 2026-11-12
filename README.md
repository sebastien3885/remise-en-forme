# Remise en forme

Application web personnelle (PWA installable sur Android) de suivi des séances
de sport et de l'alimentation. Les données restent sur le téléphone : pas de
compte, pas de serveur, fonctionnement hors ligne.

- Cahier des charges : [CAHIER_DES_CHARGES.md](CAHIER_DES_CHARGES.md)
- Repères de développement : [CLAUDE.md](CLAUDE.md)

## Démarrer

```bash
npm install
npm run dev
```

## Vérifier

```bash
npm test
npm run build
```

## Sauvegarde

Les séances, le profil et les plans vivent dans le navigateur du téléphone.
Effacer les données de Chrome les supprimerait : l'export JSON depuis l'écran
Réglages sert de sauvegarde.

## Mise en ligne

L'application se publie sur GitHub Pages, et le téléphone l'installe depuis
cette adresse. Marche à suivre, une fois pour toutes :
[docs/mise-en-ligne.md](docs/mise-en-ligne.md).

Chaque poussée sur `main` relance les tests puis republie
([.github/workflows/deploy.yml](.github/workflows/deploy.yml)).

## Importer un programme

Un plan de séances écrit à la main se charge en JSON depuis l'écran Semaine :
le format est décrit dans [docs/format-plan.md](docs/format-plan.md), avec un
exemple de quatre semaines dans [data/plans](data/plans).
