/**
 * CHANTIER 325 — RÉGLAGES › ABONNEMENT.
 *
 * Ce qui est gratuit, ce que l'abonnement ajoutera, et le mot aux parents
 * (ou, pour un adulte, ce que l'application lui apporte). Aucun bouton
 * d'achat : le paiement Google Play n'est pas encore branché. Les chiffres
 * sont ceux des fiches de la visite (Visite.tsx) : les changer aux deux
 * endroits.
 */
import './promesse.css';

type Ligne = { quoi: string; gratuit: string; abonne: string };

function lignes(adulte: boolean): Ligne[] {
  return [
    {
      quoi: 'Paquets du catalogue',
      gratuit: '2 paquets libres par niveau',
      abonne: 'Tout le catalogue, tous niveaux, paquets adultes compris',
    },
    {
      quoi: adulte ? 'Parler avec l’IA' : 'Parler avec l’IA (dès la 4e)',
      gratuit: '5 min par semaine',
      abonne: '10 min par jour',
    },
    {
      quoi: 'Paquets personnalisés',
      gratuit: '—',
      abonne: adulte
        ? 'Vos listes, la date de l’échéance, les passages calculés jusqu’au jour J'
        : 'Tes listes, la date du contrôle, les passages calculés jusqu’au jour J',
    },
    { quoi: 'Liste en photo', gratuit: '—', abonne: '3 photos par semaine' },
    { quoi: 'Apparences', gratuit: 'Une douzaine', abonne: 'Plus de 40, et celles du mois offertes' },
  ];
}

export function Abonnement({ adulte }: { adulte: boolean }) {
  return (
    <div className="abo">
      <p className="hint">
        L’abonnement arrive bientôt. Voici ce qui reste gratuit, et ce qu’il ajoutera.
      </p>

      <div className="abo-tableau" role="table" aria-label="Gratuit et abonnement">
        <div className="abo-tete" role="row">
          <span role="columnheader">Gratuit</span>
          <span role="columnheader">Abonnement</span>
        </div>
        {lignes(adulte).map((l) => (
          <div key={l.quoi} className="abo-ligne" role="row">
            <b role="rowheader">{l.quoi}</b>
            <span role="cell">{l.gratuit}</span>
            <span role="cell">{l.abonne}</span>
          </div>
        ))}
      </div>

      {adulte ? (
        <div className="abo-encart">
          <h3>Pour vous</h3>
          <ul>
            <li>Un test de niveau, puis des paquets par thème : travail, santé, logement, voyage…</li>
            <li>Des mises en situation à l’oral : entretien d’embauche, banque, médecin.</li>
            <li>Parler reste là pour garder votre niveau, ou progresser.</li>
          </ul>
        </div>
      ) : (
        <div className="abo-encart">
          <h3>Pour les parents</h3>
          <ul>
            <li>Aucune publicité, aucun traceur publicitaire.</li>
            <li>Des séances courtes : l’application dose les nouveaux mots et les révisions. La charge se règle dans Réglages › Charge de travail.</li>
            <li>Calé sur la classe : des paquets du CM2 à la Terminale, rangés par sujet.</li>
            <li>Des conversations encadrées : sujets adaptés, temps limité, bouton « Signaler ».</li>
            <li>Accord d’un parent demandé sous 15 ans. Le compte et ses données s’effacent à tout moment.</li>
          </ul>
          <a className="abo-lien" href="/confidentialite.html" target="_blank" rel="noopener">
            Politique de confidentialité
          </a>
        </div>
      )}

      <p className="hint">Le prix sera annoncé au lancement. Rien n’est facturé aujourd’hui.</p>
    </div>
  );
}
