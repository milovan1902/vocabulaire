# Vocabulaire

Application web de révision de vocabulaire anglais par répétition espacée.
Fonctionne hors ligne, s'installe comme une application, et synchronise la
progression entre appareils pour qui se connecte avec un compte Google.

## Ce que fait l'application

Chaque mot revient juste avant d'être oublié. L'ordonnancement est confié à
**FSRS**, un algorithme de répétition espacée qui calcule un intervalle propre
à chaque carte d'après les réponses passées.

La connexion est **facultative**. Sans compte, tout reste sur l'appareil. Avec
un compte, la progression et le catalogue de paquets suivent d'un appareil à
l'autre. **Parler** (conversation avec une IA) passe par les fonctions serveur
de `functions/api` ; il est réservé à partir de la 4e et plafonné en coût.

## Architecture

| Dossier         | Rôle                                                        |
| --------------- | ----------------------------------------------------------- |
| `src/domain`    | Types et règles métier. Aucune dépendance technique.         |
| `src/engine`    | Ordonnancement FSRS, sessions, quotas quotidiens.            |
| `src/data`      | Stockage local (IndexedDB), Supabase, synchronisation.       |
| `src/ui`        | Composants React et écrans.                                 |
| `functions/api` | Fonctions serveur Cloudflare (Parler, bilan, signalements). |

Chaque couche ne connaît que celles au-dessus d'elle : la logique de révision
est testable sans navigateur ni base de données (tests de `src/engine`).

## Contenu et données

Le **code** est hébergé sur **Cloudflare Pages** ; le **contenu** (paquets,
cartes, catégories) et les comptes vivent dans **Supabase**. Ajouter un paquet
ou corriger une traduction est une opération SQL, sans nouveau déploiement.

Point à connaître pour toute insertion en base : la table `decks` possède une
colonne `published` dont la valeur par défaut est `false`, et la règle de
sécurité n'expose que les paquets publiés. **Un paquet inséré sans
`published = true` reste invisible dans l'application, sans message
d'erreur.**

## Développement

```bash
npm install      # dépendances
npm run dev      # serveur local avec rechargement à chaud
npm run build    # vérification TypeScript puis compilation dans dist/
npm run test     # tests unitaires
npm run lint     # analyse statique
```

Node 22 ou plus récent.

## Configuration

L'URL et la clé Supabase ont des valeurs par défaut dans
`src/data/supabase.ts`. Cette clé est *publiable* : la sécurité repose sur les
règles RLS de la base (durcies en livraison 152), pas sur son secret. Pour
pointer vers un autre projet Supabase, définir `VITE_SUPABASE_URL` et
`VITE_SUPABASE_KEY`.

Les clés secrètes (IA, clé de service Supabase) ne sont **jamais** dans le
code : elles sont réglées dans Cloudflare → Workers & Pages → projet →
Settings → Variables and Secrets.

## Déploiement

Tout push sur `main` :

1. lance le contrôle GitHub Actions (`.github/workflows/banc-essai.yml`) :
   tests, compilation, `npm audit` ;
2. déclenche la construction Cloudflare Pages (commande
   `npx vitest run && npm run build`, dossier `dist`, Node 22).

Si la construction échoue, Cloudflare garde la version précédente en ligne.

- Les en-têtes de sécurité sont dans `public/_headers`.
- Cloudflare renvoie automatiquement `index.html` pour toute adresse inconnue
  (application à page unique) : aucun fichier de redirection n'est nécessaire.
- Une nouvelle version s'annonce dans l'app par le bandeau « Nouvelle version
  disponible ».

## Points de vigilance

- **Synthèse vocale** : l'API du navigateur est gratuite mais sa qualité varie
  d'un appareil à l'autre. Tout est isolé dans `src/ui/speech.ts`.
- **Visuels** : vérifier la licence de toute image avant d'en faire l'identité
  du produit.
- **Marques** : ELTiS, Cambridge, WEP sont déposées. On peut dire qu'on prépare
  à un test ; jamais laisser entendre un partenariat.
- **Contenu** : les listes de mots sont originales. Ne pas y ajouter de listes
  recopiées d'un manuel.

## Licence

Projet personnel, tous droits réservés.
