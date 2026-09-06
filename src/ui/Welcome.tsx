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

export function Welcome({ auth, onSkip }: { auth: Auth; onSkip: () => void }) {
  const [openMethod, setOpenMethod] = useState(false);

  return (
    <div className="welcome">
      <Backdrop />

      <header className="welcome-head">
        <Mark />
        <h1>Vocabulaire</h1>
        <p className="welcome-sub">
          L’anglais qui reste, quinze minutes par jour.
        </p>
      </header>

      <p className="welcome-lead">
        Chaque mot revient juste avant que vous ne l’oubliiez. Ni plus tôt, ce
        serait du temps perdu, ni plus tard, il faudrait tout réapprendre.
        L’application choisit le moment ; vous n’avez qu’à répondre.
      </p>

      <div className="welcome-actions">
        {auth.session ? (
          <>
            <button className="btn" onClick={onSkip}>
              Revenir à mes paquets
            </button>
            <p className="welcome-note">
              Connecté en tant que {auth.email}. Votre progression est
              sauvegardée en ligne.
            </p>
          </>
        ) : (
          <>
            <button className="btn google" onClick={() => void auth.signIn()}>
              <GoogleMark />
              Continuer avec Google
            </button>
            <p className="welcome-note">
              Votre progression est sauvegardée et vous retrouvez toute la
              bibliothèque de paquets, sur téléphone comme sur ordinateur.
            </p>

            <button className="btn ghost wide" onClick={onSkip}>
              Commencer sans compte
            </button>
            <p className="welcome-note">
              Les paquets fournis avec l’application, hors ligne, sans
              inscription. Tout reste sur cet appareil. Vous pourrez vous
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
            <Boxes />
            <p className="boxes-caption">
              Un mot su avance d’une boîte ; un mot raté revient à la première.
            </p>

            <p>
              Dans les années 1970, le journaliste allemand Sebastian Leitner
              range ses fiches dans cinq boîtes. Un mot su passe à la boîte
              suivante, qu’on révise plus rarement. Un mot raté retourne à la
              première, revue chaque jour. Le travail se concentre tout seul sur
              ce qui résiste.
            </p>
            <p>
              L’idée derrière est la <strong>répétition espacée</strong> :
              réviser à intervalles qui s’allongent ancre bien mieux qu’un
              bachotage de la veille, pour un temps total bien inférieur. C’est
              l’un des résultats les plus solides de la psychologie de la
              mémoire.
            </p>
            <p>
              Les boîtes ont un défaut : elles traitent tous les mots de la même
              façon. Cette application utilise un algorithme moderne, FSRS, qui
              garde le principe mais calcule un intervalle propre à chaque mot,
              d’après vos réponses passées. Un mot facile peut partir à trois
              semaines pendant qu’un mot rétif revient demain.
            </p>
            <p className="method-foot">
              En pratique : vous jugez chaque carte d’un mot — au hasard, dur,
              correct, facile. C’est tout. Le calendrier se fait seul.
            </p>
          </div>
        )}
      </section>

      <p className="welcome-legal">
        Aucune publicité, aucun traceur. La connexion ne sert qu’à retrouver
        votre progression.
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

/** Les cinq boîtes de Leitner, avec l'intervalle qui s'allonge. */
function Boxes() {
  const gaps = ["1 j", "2 j", "4 j", "1 sem", "2 sem"];
  return (
    <svg className="boxes" viewBox="0 0 314 74" aria-hidden="true">
      {gaps.map((g, i) => {
        const x = 4 + i * 62;
        const h = 26 + i * 7;
        return (
          <g key={g}>
            <rect
              x={x}
              y={54 - h}
              width="48"
              height={h}
              rx="4"
              fill="#f2b705"
              fillOpacity={0.13 + i * 0.06}
              stroke="#d9d5c8"
            />
            <text
              x={x + 24}
              y="68"
              textAnchor="middle"
              fontSize="10"
              fill="#6c7488"
              fontFamily="-apple-system, system-ui, sans-serif"
            >
              {g}
            </text>
            {i < 4 && (
              <path
                d={`M${x + 51} 40 l7 0 m-3 -3 l3 3 l-3 3`}
                stroke="#6c7488"
                strokeWidth="1"
                fill="none"
                strokeLinecap="round"
              />
            )}
          </g>
        );
      })}
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
