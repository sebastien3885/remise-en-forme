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
