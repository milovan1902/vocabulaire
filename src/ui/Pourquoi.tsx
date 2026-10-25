/**
 * CHANTIER 325 — MES PROGRÈS › POURQUOI ÇA MARCHE.
 *
 * La boucle d'apprentissage en quatre étapes, puis les trois raisons, sans
 * promettre plus que ce que dit la recherche sur la mémoire.
 */
import { tv } from './ton';
import './promesse.css';

export function Pourquoi({ adulte }: { adulte: boolean }) {
  const t = (tu: string, vous: string) => tv(adulte, tu, vous);
  const etapes: Array<[string, string]> = [
    [t('Tu découvres un mot', 'Vous découvrez un mot'), 'Avec sa voix, et souvent un exemple.'],
    [t('Tu le retrouves de mémoire', 'Vous le retrouvez de mémoire'), 'Sans le relire : c’est cet effort qui l’ancre.'],
    ['Il revient juste avant l’oubli', 'À chaque réussite, un peu plus tard. L’écart est calculé mot par mot (algorithme FSRS).'],
    [
      t('Tu l’emploies à l’oral', 'Vous l’employez à l’oral'),
      'Avec l’IA, dans Parler. Les mots qui coincent rejoignent le paquet « Reprise des fautes à l’oral ».',
    ],
  ];
  return (
    <div className="pq">
      <p className="pq-accroche">
        <em>Neuro</em>, parce que l’application suit {t('ta', 'votre')} mémoire : chaque mot revient
        juste avant que {t('tu ne l’oublies', 'vous ne l’oubliiez')}.
      </p>

      <ol className="pq-boucle">
        {etapes.map(([titre, detail]) => (
          <li key={titre}>
            <b>{titre}</b>
            <span>{detail}</span>
          </li>
        ))}
      </ol>
      <p className="pq-cran">↻ Puis la boucle recommence, un cran plus haut.</p>

      <h3>Pourquoi ça marche</h3>
      <ul>
        <li>
          <b>La répétition espacée.</b> Revoir un mot à des intervalles qui s’allongent le fait mieux
          retenir que dix relectures la veille, et en moins de temps. C’est l’un des résultats les plus
          solides de la recherche sur la mémoire.
        </li>
        <li>
          <b>Le rappel actif.</b> Chercher la réponse avant de la voir fait davantage travailler la
          mémoire que relire.
        </li>
        <li>
          <b>L’emploi.</b> Dire un mot dans une phrase à soi, à voix haute, aide à le retrouver le jour
          où on en a besoin.
        </li>
      </ul>
      <p className="hint">
        {t('Ton rôle : répondre honnêtement. Le calendrier se fait seul.', 'Votre rôle : répondre honnêtement. Le calendrier se fait seul.')}
      </p>
    </div>
  );
}
