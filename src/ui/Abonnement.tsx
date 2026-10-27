/**
 * CHANTIER 325 — RÉGLAGES › ABONNEMENT.
 *
 * Ce qui est gratuit, ce que l'abonnement ajoutera, et le mot aux parents
 * (ou, pour un adulte, ce que l'application lui apporte). Aucun bouton
 * d'achat : le paiement Google Play n'est pas encore branché. Les chiffres
 * sont ceux des fiches de la visite (Visite.tsx) : les changer aux deux
 * endroits.
 *
 * CHANTIER 335 — la grille du 26/10 : 6,99 € par mois ou 69,99 € par an,
 * 7 jours d'essai, aucune publicité pour personne.
 *
 * CHANTIER 346 — deux cartes au lieu d'un tableau : « Gratuit », puis
 * « Abonnement » (logo, prix, ce qu'il ajoute). Maquette 2a validée.
 */
import './promesse.css';

function gratuit(adulte: boolean): string[] {
  return adulte
    ? [
        '1 paquet du catalogue offert : Voyager',
        'Votre premier paquet personnalisé, photo comprise',
        '1 conversation de 10 min avec l’IA',
        'Les mises en situation, offertes une fois',
        '3 apparences, jusqu’à 12 avec vos crédits',
      ]
    : [
        '1 paquet offert par classe',
        'Ton premier paquet personnalisé, photo comprise',
        '1 conversation de 10 min avec l’IA (dès la 4e)',
        'Les mises en situation, offertes une fois',
        '3 apparences, jusqu’à 12 avec tes crédits',
      ];
}

const ABONNE: Array<[string, string]> = [
  ['Tout le catalogue,', 'tous niveaux, paquets adultes compris'],
  ['Paquets personnalisés illimités,', 'dont 3 photos par semaine'],
  ['10 min d’oral par jour', 'avec l’IA'],
  ['3 mises en situation', 'nouvelles chaque jour'],
  ['Les 12 apparences offertes, 30 de plus,', 'et celles du mois'],
];

function Coche({ or }: { or?: boolean }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={or ? '#c99700' : '#5f6c8a'}
      strokeWidth={or ? 2.6 : 2.4} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

export function Abonnement({ adulte }: { adulte: boolean }) {
  return (
    <div className="abo">
      <p className="abo-sanspub">Sans publicité, pour tous</p>

      <section className="abo-carte" aria-label="Gratuit">
        <div className="abo-carte-tete">
          <h3>Gratuit</h3>
          <small>pour toujours</small>
        </div>
        <ul className="abo-liste">
          {gratuit(adulte).map((t) => <li key={t}><Coche /><span>{t}</span></li>)}
        </ul>
      </section>

      <section className="abo-carte abo-plus" aria-label="Abonnement">
        <div className="abo-marque">
          <img src="/ico-abonnement.png" alt="" />
          <div>
            <h3>Abonnement</h3>
            <span className="abo-essai">7 jours d’essai offerts</span>
          </div>
        </div>
        <div className="abo-prix">
          <div><b>6,99 €</b><span>par mois</span></div>
          <div><b>69,99 €</b><span>par an · 2 mois offerts</span></div>
        </div>
        <span className="abo-kicker">En plus du gratuit</span>
        <ul className="abo-liste">
          {ABONNE.map(([gras, suite]) => <li key={gras}><Coche or /><span><b>{gras}</b> {suite}</span></li>)}
        </ul>
        <p className="abo-bientot">Bientôt disponible. Rien n’est facturé aujourd’hui.</p>
      </section>

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
            <li>Des séances courtes : l’application dose les mots et les révisions.</li>
            <li>Des paquets de la 6e à la Terminale, et des conversations encadrées, avec un bouton « Signaler ».</li>
            <li>Avant 15 ans, l’accord d’un parent est demandé pour créer un compte.</li>
            <li>Vous pouvez supprimer le compte et toutes ses données à tout moment, depuis Réglages › Connexion.</li>
          </ul>
          <a className="abo-lien" href="/confidentialite.html" target="_blank" rel="noopener">
            Politique de confidentialité
          </a>
        </div>
      )}
    </div>
  );
}
