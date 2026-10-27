/**
 * Page d'accueil : première ouverture, et retour possible depuis la
 * bibliothèque tant qu'aucun compte n'est lié.
 *
 * Trois choses, dans cet ordre : ce que fait l'application, comment on
 * commence, pourquoi la méthode marche. La connexion reste facultative —
 * un visiteur doit pouvoir réviser sans jamais donner d'adresse.
 */
import { useState } from "react";
import type { Auth } from "./useAuth";
import { useAccordCompte } from "./accordParental";
/* CHANTIER 325 — les promesses : élèves d'abord, adultes ensuite. */
import "./promesse.css";

export function Welcome({ auth, onSkip }: { auth: Auth; onSkip: () => void }) {
  const [openMethod, setOpenMethod] = useState(false);
  // CHANTIER 141 — accord parental avant « Continuer avec Google ».
  const accord = useAccordCompte();

  return (
    <div className="welcome">
      <Backdrop />

      <header className="welcome-head">
        <Mark />
        <h1>Neuro Anglais</h1>
        <p className="welcome-sub">
          L’apprentissage par révision espacée, une méthode efficace en quelques minutes par jour.
        </p>
      </header>

      {/*
        * CHANTIER 325 — la promesse aux élèves, en quatre axes, puis une
        * ligne pour les adultes. « Neuro » est dit en une phrase.
        */}
      <section className="promesse" aria-label="Ce que fait l’application">
        {/* 335 — un argument, pas une note de bas de page. */}
        <p className="promesse-sanspub">Application sans publicité</p>
        <p className="promesse-titre">
          Prépare tes contrôles, enrichis ton vocabulaire et ose parler anglais.
        </p>
        {/* 343 — plus d'air, et une icône (Lucide) au-dessus de chaque axe. */}
        <ul className="promesse-axes">
          {AXES.map(([nom, icone, texte]) => (
            <li key={nom}>
              <div className="promesse-axe">
                <span className="promesse-ico" aria-hidden="true">
                  <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">{icone}</svg>
                </span>
                <b>{nom}</b>
              </div>
              <span>{texte}</span>
            </li>
          ))}
        </ul>
        <p className="promesse-adulte">
          <b>Adulte ?</b> Remettez-vous à l’anglais, gardez le niveau ou progressez !
          Un test de niveau, des paquets par thème et des mises en situation à l’oral.
        </p>
      </section>

      <p className="welcome-lead">
        <em>Neuro</em>, parce que l’application suit ta mémoire : chaque mot
        revient juste avant que tu ne l’oublies. Ni plus tôt, ce serait du
        temps perdu, ni plus tard, il faudrait tout réapprendre.
      </p>

      <div className="welcome-actions">
        {auth.session ? (
          <>
            <button className="btn" onClick={onSkip}>
              Revenir à mes paquets
            </button>
            <p className="welcome-note">
              Connecté en tant que {auth.email}. Ta progression est
              sauvegardée en ligne.
            </p>
          </>
        ) : (
          <>
            {accord.caseAccord}
            <button
              className="btn google"
              disabled={!accord.pret}
              onClick={() => void auth.signIn()}
            >
              <GoogleMark />
              Continuer avec Google
            </button>
            <p className="welcome-note">
              Ta progression est sauvegardée et tu retrouves toute la
              bibliothèque de paquets, sur téléphone comme sur ordinateur.
            </p>

            <button className="btn ghost wide" onClick={onSkip}>
              Commencer sans compte
            </button>
            <p className="welcome-note">
              Les paquets fournis avec l’application, hors ligne, sans
              inscription. Tout reste sur cet appareil. Tu pourras te
              connecter plus tard sans rien perdre.
            </p>
          </>
        )}
      </div>

      <section className="method">
        <button
          className="method-toggle"
          aria-expanded={openMethod}
          onClick={() => setOpenMethod((v) => !v)}
        >
          <span>La méthode, en deux minutes</span>
          <span className="chev" aria-hidden="true">
            {openMethod ? "−" : "+"}
          </span>
        </button>

        {openMethod && (
          <div className="method-body">
            {/* 343 — l'espacement dans le temps, plus les boîtes de Leitner. */}
            <div className="frise-rappels">
              <span className="frise-titre">Les rappels d’un mot</span>
              <Frise />
              <p>Chaque rappel réussi éloigne le suivant ; un mot qui résiste revient plus souvent.</p>
            </div>

            <p>
              Sans révision, on oublie vite : une grande partie de ce qu’on
              vient d’apprendre s’efface en quelques jours. C’est la{" "}
              <strong>courbe de l’oubli</strong>, décrite dès 1885 par le
              psychologue Hermann Ebbinghaus.
            </p>
            <p>
              La <strong>répétition espacée</strong> consiste à revoir un mot au
              moment où il commence à s’effacer. À chaque rappel réussi, le
              souvenir se renforce et le rappel suivant peut attendre plus
              longtemps : un jour, puis trois, une semaine, trois semaines, deux
              mois… On retient mieux qu’en bachotant la veille, en y passant
              bien moins de temps.
            </p>
            <p>
              L’application calcule cet espacement pour chaque mot, d’après tes
              réponses, avec un algorithme moderne (FSRS). Un mot facile peut
              partir à trois semaines pendant qu’un mot qui résiste revient
              demain.
            </p>
            <p className="method-foot">
              En pratique : tu notes chaque carte — <strong>À revoir</strong>,{" "}
              <strong>Difficile</strong>, <strong>Correct</strong> ou{" "}
              <strong>Facile</strong>. C’est tout, le calendrier se fait seul.
            </p>
          </div>
        )}
      </section>

      <p className="welcome-legal">
        Aucune publicité, aucun traceur. La connexion ne sert qu’à retrouver
        ta progression.
      </p>
    </div>
  );
}

/**
 * Fond dessiné plutôt qu'image : quelques kilo-octets, net à toutes les
 * tailles, et le contraste du texte reste sous contrôle.
 */
function Backdrop() {
  return (
    <svg
      className="backdrop"
      aria-hidden="true"
      preserveAspectRatio="xMidYMin slice"
      viewBox="0 0 400 560"
    >
      <defs>
        <linearGradient id="wsky" x1="0" y1="0" x2="0.3" y2="1">
          <stop offset="0%" stopColor="#f4efe1" />
          <stop offset="100%" stopColor="#fbfaf6" />
        </linearGradient>
        <filter id="wgrain">
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.9"
            numOctaves="3"
          />
          <feColorMatrix type="saturate" values="0" />
        </filter>
      </defs>

      <rect width="400" height="560" fill="url(#wsky)" />

      <g fill="none" stroke="#16233f" strokeOpacity="0.07" strokeWidth="1">
        <circle cx="330" cy="70" r="150" />
        <circle cx="330" cy="70" r="110" />
        <circle cx="330" cy="70" r="70" />
        <circle cx="40" cy="330" r="120" />
      </g>

      <g opacity="0.5">
        <rect
          x="292"
          y="26"
          width="52"
          height="70"
          rx="6"
          fill="#f2b705"
          fillOpacity="0.16"
          transform="rotate(-12 318 61)"
        />
        <rect
          x="308"
          y="34"
          width="52"
          height="70"
          rx="6"
          fill="#16233f"
          fillOpacity="0.05"
          transform="rotate(6 334 69)"
        />
      </g>

      <rect width="400" height="560" filter="url(#wgrain)" opacity="0.035" />
    </svg>
  );
}

/** Marque : la même géométrie que les dos de cartes, pour l'unité visuelle. */
function Mark() {
  return (
    <svg className="welcome-mark" viewBox="0 0 620 874" aria-hidden="true">
      <rect
        x="1"
        y="1"
        width="60"
        height="82"
        rx="7"
        fill="#fbfaf6"
        stroke="#d9d5c8"
      />
      <g stroke="#f2b705" strokeWidth="1.1" fill="none">
        <path d="M31 9 L52 42 L31 75 L10 42 Z" />
        <path d="M31 20 L43 42 L31 64 L19 42 Z" />
      </g>
      <circle cx="31" cy="42" r="11" fill="#16233f" />
      <text
        x="31"
        y="46.5"
        textAnchor="middle"
        fontSize="11"
        fontWeight="700"
        fill="#fbfaf6"
        fontFamily="-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif"
      >
        Ab
      </text>
    </svg>
  );
}

/** 343 — les quatre axes de l'accueil : nom, icône Lucide, texte. */
const AXES: Array<[string, JSX.Element, string]> = [
  ['Contrôles', <><rect width="8" height="4" x="8" y="2" rx="1" /><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" /><path d="m9 14 2 2 4-4" /></>,
    'Prépare tes interrogations toi-même ou en prenant une liste en photo : l’application se charge du programme de révision !'],
  ['Vocabulaire', <><path d="m12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83Z" /><path d="m22 17.65-9.17 4.16a2 2 0 0 1-1.66 0L2 17.65" /><path d="m22 12.65-9.17 4.16a2 2 0 0 1-1.66 0L2 12.65" /></>,
    'Des paquets de cartes de révision par classe et par thème.'],
  ['Oral', <><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" /><path d="M19 10v2a7 7 0 0 1-14 0v-2" /><line x1="12" x2="12" y1="19" y2="22" /></>,
    'Des conversations et mises en situation avec une IA à ton niveau, qui te corrige en direct et te crée des rapports.'],
  ['La boucle', <><path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" /><path d="M21 3v5h-5" /><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" /><path d="M8 16H3v5" /></>,
    'Les mots qui coincent à l’oral rejoignent un paquet spécial : tu les révises, tu les réemploies, et tu montes d’un cran dans tes compétences.'],
];

/**
 * 343 — la frise des rappels : un mot facile (rappels de plus en plus
 * espacés, jusqu'à 2 mois) et un mot qui résiste (rappels rapprochés).
 * Échelle en racine carrée des jours, pour que les premiers jours se lisent.
 */
function Frise() {
  const X = (j: number) => 20 + Math.sqrt(j / 60) * 280;
  const facile = [0, 1, 3, 8, 21, 60];
  const resiste = [0, 1, 2, 4, 7, 12, 20];
  const reperes: Array<[number, string]> = [[0, 'auj.'], [1, '1 j'], [7, '1 sem'], [21, '3 sem'], [60, '2 mois']];
  const ligne = (y: number, jours: number[], c: string) => (
    <>
      <line x1="20" y1={y} x2="304" y2={y} stroke="currentColor" strokeOpacity="0.2" strokeWidth="1.5" />
      {jours.map((j, i) => <circle key={j} cx={X(j)} cy={y} r="5" fill={i ? c : 'currentColor'} />)}
    </>
  );
  return (
    <svg className="frise" viewBox="0 0 314 112" aria-label="Un mot facile revient après 1 jour, 3 jours, 8 jours, 3 semaines puis 2 mois ; un mot qui résiste revient bien plus souvent.">
      <g fontSize="10" fontWeight="700" fill="currentColor">
        <text x="0" y="22">Facile</text>
        <text x="0" y="60">Qui résiste</text>
      </g>
      {ligne(34, facile, '#f2b705')}
      {ligne(72, resiste, '#d9822b')}
      <line x1="20" y1="90" x2="304" y2="90" stroke="currentColor" strokeOpacity="0.3" />
      <g fontSize="9.5" fill="currentColor" fillOpacity="0.75" textAnchor="middle">
        {reperes.map(([j, t]) => <text key={t} x={Math.min(X(j), 296)} y="105">{t}</text>)}
      </g>
    </svg>
  );
}

function GoogleMark() {
  return (
    <svg viewBox="0 0 18 18" width="18" height="18" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62z"
      />
      <path
        fill="#34A853"
        d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.8.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.02-3.7H.96v2.33A9 9 0 0 0 9 18z"
      />
      <path
        fill="#FBBC05"
        d="M3.98 10.72a5.4 5.4 0 0 1 0-3.44V4.95H.96a9 9 0 0 0 0 8.1l3.02-2.33z"
      />
      <path
        fill="#EA4335"
        d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0A9 9 0 0 0 .96 4.95l3.02 2.33C4.68 5.16 6.66 3.58 9 3.58z"
      />
    </svg>
  );
}
