# Vocabulaire — application de révision

Application de révision de vocabulaire anglais par répétition espacée (FSRS).
Fonctionne hors ligne, s'installe sur l'écran d'accueil d'un téléphone ou d'un
ordinateur, et ne dépend d'aucun serveur.

---

## 1. Mettre l'application en ligne (5 minutes, sans rien installer)

Vous n'avez besoin que du dossier **`dist/`**.

1. Allez sur https://app.netlify.com/drop
2. Glissez-déposez le dossier `dist` dans la zone indiquée.
3. Netlify vous donne une adresse du type `https://quelque-chose.netlify.app`.
   C'est l'adresse de l'application. Aucun compte n'est obligatoire pour un
   premier essai ; créez-en un si vous voulez conserver l'adresse.

Vous pouvez aussi utiliser https://app.vercel.com ou GitHub Pages : le dossier
`dist` est un site statique ordinaire.

### Installer sur le téléphone

Ouvrez l'adresse dans Chrome (Android) ou Safari (iPhone), puis :

- Android : menu ⋮ → « Installer l'application » ou « Ajouter à l'écran d'accueil »
- iPhone : bouton Partager → « Sur l'écran d'accueil »

L'application se lance ensuite en plein écran, sans barre de navigateur, et
fonctionne sans connexion.

> **Important** : le mode hors ligne et l'installation exigent une adresse en
> `https://`. Ouvrir `dist/index.html` directement depuis le disque affiche bien
> l'application, mais sans service worker ni installation.

---

## 2. Utilisation

**Bibliothèque.** Chaque paquet est une carte à jouer. La pastille jaune indique
le nombre de cartes à faire aujourd'hui, quotas compris.

**Créer un paquet.** Collez une liste : un mot par ligne, anglais puis français,
séparés par une virgule, un point-virgule ou une tabulation. Un copier-coller
depuis un tableur fonctionne tel quel. Les lignes mal formées sont signalées par
leur numéro.

**Image de paquet.** Toute image est recadrée au format 4:5 (idéal : 800 × 1000
pixels). Elle sert de dos de carte dans la bibliothèque et de décor pendant la
révision. Les marges du panneau de texte se règlent dans les réglages du paquet,
pour s'adapter à l'épaisseur du cadre de votre visuel.

**Réglages.** Nouveaux mots par jour et révisions par jour bornent la charge de
travail quotidienne. Cartes par session découpe cette charge en passages courts.

**Sauvegarde.** En bas de la bibliothèque. Exportez un fichier `.json`, puis
restaurez-le sur un autre appareil. La restauration remplace tout : partez
toujours de la sauvegarde la plus récente.

---

## 3. Modifier l'application

Il faut Node.js 20 ou plus.

```bash
npm install      # une seule fois
npm run dev      # développement, rechargement automatique
npm run build    # produit un nouveau dossier dist/
```

---

## 4. Organisation du code

```
src/
  domain/types.ts        Les types. Ne dépend de rien.
  engine/
    scheduler.ts         Enveloppe FSRS. Seul fichier à changer si
                         l'algorithme évolue.
    session.ts           Construction des files de révision, quotas.
  data/
    repository.ts        Stockage IndexedDB derrière une interface.
    seed/                Paquets fournis, générés.
  ui/                    Composants React, aucune logique métier.
```

Trois choix pensés pour un passage ultérieur à un usage commercial :

- **Le moteur ne connaît pas l'interface.** `engine/` est du TypeScript pur,
  testable et réutilisable ailleurs.
- **Le stockage est derrière une interface.** `Repository` dans
  `data/repository.ts` définit le contrat ; `IdbRepository` en est
  l'implémentation locale. Une version serveur (Supabase, par exemple) consiste
  à écrire une seconde classe respectant la même interface.
- **Les clés sont préfixées par un utilisateur.** Toutes les données sont rangées
  sous `u:local:…`. Ajouter de vrais comptes ne demandera pas de migration.

---

## 5. Points de vigilance avant un usage commercial

- **Synthèse vocale** : l'API du navigateur est gratuite mais sa qualité varie
  d'un appareil à l'autre. Un produit payant demandera un fournisseur sous
  licence. Tout est isolé dans `src/ui/speech.ts`.
- **Visuels** : vérifiez la licence de toute image générée ou téléchargée avant
  d'en faire l'identité du produit.
- **Marques** : ELTiS, Cambridge, WEP sont déposées. On peut dire qu'on prépare
  à un test ; jamais laisser entendre un partenariat.
- **Contenu** : les listes de mots livrées ici sont originales. N'y ajoutez pas
  de listes recopiées d'un manuel.
