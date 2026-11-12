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
2. Menu **⋮** → **Ajouter à l'écran d'accueil** (ou **Installer l'application**).
3. Une icône apparaît sur l'écran d'accueil.

L'application s'ouvre alors en plein écran, sans barre d'adresse, et
**fonctionne sans réseau** : tout le code est mis en cache à la première
ouverture. Un appui long sur l'icône propose deux raccourcis, « Séance du
jour » et « Repas ».

## 5. Sauvegarder

C'est le point le plus important et le plus facile à oublier.

**Vos données vivent dans le navigateur du téléphone.** Elles survivent aux
mises à jour de l'application, mais effacer les données du site dans Chrome,
réinitialiser le téléphone ou en changer les supprimerait.

Dans **Réglages → Sauvegarde → Exporter mes données**, l'application produit
un fichier JSON. Rangez-le ailleurs — Drive, un mail à vous-même, un câble USB
— de temps en temps. Le même écran sait le relire pour tout restaurer.

## Ce qui ne marche pas, et pourquoi

**Les rappels de séance à heure fixe.** Une application web installée ne peut
pas se réveiller toute seule pour envoyer une notification : il lui faudrait
un serveur qui la pousse, ou une application native. Le chapitre 9 du cahier
des charges les mentionne ; ils ne sont pas faisables en l'état, et plutôt que
de livrer un rappel qui ne partirait qu'une fois sur trois, l'application s'en
tient à des rappels **à l'ouverture** : la séance du jour sur l'écran
d'accueil, et le bandeau qui signale un bilan en attente.

Une alarme du téléphone, à l'heure où vous comptez vous entraîner, reste la
solution la plus fiable. Si les notifications programmées deviennent
indispensables, l'alternative citée par le chapitre 9 — un emballage natif
avec Capacitor — les rendrait possibles.

## Mettre à jour plus tard

```bash
git add -A
git commit -m "ce qui a changé"
git push
```

GitHub reconstruit et republie. Sur le téléphone, le service worker récupère
la nouvelle version à l'ouverture suivante. **Vos données ne sont pas
touchées** : elles vivent à côté du code, pas dedans.
