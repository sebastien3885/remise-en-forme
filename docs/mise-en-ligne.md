# Mettre l'application en ligne et l'installer sur le téléphone

Tout se fait une fois. Ensuite, chaque modification poussée sur `main` met
l'application à jour toute seule, et le téléphone la récupère à la prochaine
ouverture.

## 1. Le dépôt GitHub

Créez un dépôt vide, **public ou privé**, puis notez son nom exact.

> Avec un dépôt privé, GitHub Pages reste disponible sur un compte Pro ou une
> organisation ; sur un compte gratuit, il faut un dépôt public. Le code est
> sans danger à publier : il ne contient ni donnée personnelle, ni clé. Vos
> séances et votre journal restent sur le téléphone.

Si le nom du dépôt n'est pas `remise-en-forme`, changez la ligne
correspondante dans [vite.config.ts](../vite.config.ts) :

```ts
const NOM_DEPOT = 'remise-en-forme'
```

C'est elle qui fixe le chemin public des fichiers. Un nom qui ne correspond
pas donne une page blanche : le navigateur cherche le code au mauvais endroit.

## 2. Activer GitHub Pages

Dans le dépôt : **Settings → Pages → Build and deployment → Source :
GitHub Actions**.

Cette étape passe avant la première poussée. Sans elle, la mise en ligne
échoue — avec un message clair, mais elle échoue.

## 3. Pousser

```bash
git remote add origin https://github.com/<votre-compte>/remise-en-forme.git
git push -u origin main
```

L'onglet **Actions** montre la construction : les tests tournent, puis
l'application est publiée. Comptez une à deux minutes.

L'adresse est alors :

```
https://<votre-compte>.github.io/remise-en-forme/
```

## 4. Installer sur Android

1. Ouvrir cette adresse dans **Chrome** sur le téléphone.
2. Aller dans **Réglages** : la carte « Installer sur le téléphone » propose un
   bouton **Installer sur cet appareil** dès que Chrome juge l'installation
   possible. À défaut, le menu **⋮** de Chrome offre **Installer
   l'application** ou **Ajouter à l'écran d'accueil** — c'est le même geste.
3. Une icône apparaît sur l'écran d'accueil.

L'application s'ouvre alors en plein écran, sans barre d'adresse, et
**fonctionne sans réseau** : tout le code est mis en cache à la première
ouverture. Un appui long sur l'icône propose deux raccourcis, « Séance du
jour » et « Repas ».

### Ce qui a été vérifié, et ce qui ne peut l'être que sur le téléphone

Les conditions que Chrome exige pour proposer l'installation ont été
contrôlées sur la version de production, servie en local :

- le manifeste est servi et lu (nom, `display: standalone`, `start_url`,
  langue, couleur de thème) ;
- les icônes de 192 et 512 pixels répondent, dans les bonnes dimensions, plus
  une icône `maskable` séparée pour le recadrage d'Android ;
- le service worker s'enregistre, s'active et prend la main sur la page ;
- son cache contient la page, le script, la feuille de style, le manifeste et
  les icônes — de quoi démarrer sans réseau.

Ce qui reste à faire sur un vrai téléphone, et que rien ici ne peut remplacer :

- [ ] l'installation elle-même, depuis Chrome sur Android ;
- [ ] l'icône sur l'écran d'accueil, et son recadrage ;
- [ ] le bouton retour d'Android dans l'application installée ;
- [ ] une ouverture en mode avion, pour voir l'application démarrer sans
      réseau ;
- [ ] l'export vers l'agenda (section 6) depuis le téléphone ;
- [ ] une photo de repas prise avec l'appareil photo.

## 5. Sauvegarder

C'est le point le plus important et le plus facile à oublier.

**Vos données vivent dans le navigateur du téléphone.** Elles survivent aux
mises à jour de l'application, mais effacer les données du site dans Chrome,
réinitialiser le téléphone ou en changer les supprimerait.

Dans **Réglages → Sauvegarde → Exporter mes données**, l'application produit
un fichier JSON. Rangez-le ailleurs — Drive, un mail à vous-même, un câble USB
— de temps en temps. Le même écran sait le relire pour tout restaurer.

## 6. Les rappels

**L'application ne peut pas vous notifier à une heure fixe.** Installée, elle
ne se réveille pas toute seule : il lui faudrait un serveur qui la pousse, ou
une application native. Un rappel qui ne partirait qu'une fois sur trois serait
pire que pas de rappel du tout — on finirait par compter dessus.

Elle confie donc les séances à l'outil du téléphone qui sait réveiller.
Dans **Réglages → Rappels**, choisissez l'heure du rappel et appuyez sur
« Envoyer vers mon agenda » : le fichier `.ics` qui en sort s'ouvre dans Google
Agenda ou l'agenda d'Android, et chaque séance à venir devient une journée
entière avec son rappel du matin.

- Les séances déjà faites, annulées ou remplacées n'y sont pas.
- Les jours de repos non plus : une alarme pour ne rien faire est du bruit.
- Réexporter plus tard ne crée pas de doublons — chaque séance garde son
  identifiant et l'agenda met l'événement à jour. Pensez-y après une révision
  de programme.

Dans l'application même, les rappels restent **à l'ouverture** : la séance du
jour sur l'écran d'accueil, et le bandeau qui signale un bilan en attente.

Si les notifications programmées devenaient indispensables, l'alternative citée
par le chapitre 9 — un emballage natif avec Capacitor — les rendrait possibles.

## Mettre à jour plus tard

```bash
git add -A
git commit -m "ce qui a changé"
git push
```

GitHub reconstruit et republie. Sur le téléphone, le service worker récupère
la nouvelle version à l'ouverture suivante. **Vos données ne sont pas
touchées** : elles vivent à côté du code, pas dedans.

Une surprise à connaître : la **première ouverture après une mise en ligne
montre encore la version précédente**. C'est le propre d'une application qui
démarre depuis son cache — elle s'affiche d'abord, se met à jour derrière, et
la fois suivante est à jour. Vérifié en servant deux versions de suite en
local. En cas de doute, fermer l'application et la rouvrir.
