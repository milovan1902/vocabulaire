/**
 * CHANTIER 213 — Fashion week (maquette 43b) : le podium et les mannequins.
 *
 * Une couche fixe, derrière tout (classe `fond-anime` : mêmes règles que les
 * autres fonds animés), affichée sur « Aujourd'hui » seulement (mode.css).
 * Le podium file vers un point de fuite ; à gauche, trois mannequins arrivent
 * du fond et grandissent ; à droite, trois repartent et rapetissent. Chacun
 * marche (pas croisés, bras et hanches qui balancent) et porte deux ombres
 * longues, une par projecteur. Tout le mouvement est en CSS (mode.css).
 *
 * « Réduire les animations » : le podium reste, sans mannequins.
 */
import { createPortal } from 'react-dom';
import { useStyle } from './useStyle';

type Tenue = 'robe' | 'tailleur' | 'manteau';

const calme = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;

/* [décalage (s), tenue, touche de rouge] — un cycle dure 10,7 s, trois mannequins par sens. */
const VIENNENT: Array<[number, Tenue, boolean]> = [[0, 'robe', false], [-3.57, 'manteau', true], [-7.14, 'tailleur', false]];
const PARTENT: Array<[number, Tenue, boolean]> = [[-1.79, 'tailleur', true], [-5.36, 'robe', false], [-8.93, 'manteau', false]];

function Corps({ t, a }: { t: Tenue; a: boolean }) {
  return (
    <>
      <i className={`fw-jambe g ${t}`} />
      <i className={`fw-jambe d ${t}`} />
      <span className="fw-hanches">
        <i className="fw-bras g" />
        <i className="fw-bras d" />
        <i className={`fw-buste ${t}`} />
        {t === 'manteau' && <i className={`fw-ceinture${a ? ' rouge' : ''}`} />}
        {a && t !== 'manteau' && <i className="fw-sac" />}
      </span>
      <i className="fw-tete" />
      <i className="fw-chignon" />
      <i className="fw-cou" />
      {/* La robe longue : un grand chapeau rouge, de travers. */}
      {t === 'robe' && <span className="fw-chapeau"><i /><i /><i /></span>}
    </>
  );
}

function Mannequin({ sens, d, t, a }: { sens: 'vient' | 'part'; d: number; t: Tenue; a: boolean }) {
  return (
    <span className={`fw-mannequin ${sens}`} style={{ animationDelay: `${d}s` }}>
      <span className="fw-ombre g"><Corps t={t} a={a} /></span>
      <span className="fw-ombre d"><Corps t={t} a={a} /></span>
      <i className="fw-pied" />
      <span className="fw-corps"><Corps t={t} a={a} /></span>
    </span>
  );
}

export function Defile() {
  const style = useStyle();
  if (style !== 'fashion') return null;
  const anime = !calme();
  return createPortal(
    <div className="fond-anime fashion fw-defile" aria-hidden="true">
      <i className="fw-projo g" />
      <i className="fw-projo d" />
      <i className="fw-podium" />
      <i className="fw-lattes" />
      <i className="fw-fuite" />
      {anime && PARTENT.map(([d, t, a], k) => <Mannequin key={`p${k}`} sens="part" d={d} t={t} a={a} />)}
      {anime && VIENNENT.map(([d, t, a], k) => <Mannequin key={`v${k}`} sens="vient" d={d} t={t} a={a} />)}
    </div>,
    document.body,
  );
}
