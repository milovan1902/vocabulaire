/**
 * CHANTIER 185 — « Mes XP », le contenu du tiroir.
 *
 * Il vivait dans les Réglages (chantier 169). Il rejoint « Mes progrès » :
 * on vient y REGARDER où l'on en est, pas régler quoi que ce soit.
 * Aujourd'hui l'ouvre aussi, d'un appui sur le niveau.
 * Les chiffres viennent de engine/xp.ts, comme au niveau d'Aujourd'hui :
 * le même calcul partout, donc le même niveau partout.
 *
 * CHANTIER 228 — barème de la semaine de cinq jours, et les gels.
 */
import type { Streak } from '../engine/streak';
import {
  CARTES_PAR_JOUR, GELS_MAX, XP_MAX_GRATUIT, estPremium, gelsEnReserve, historiqueXp, meilleureSerie, serieValidee, xpTotal,
} from '../engine/xp';
import './gel.css';
import { niveauDe } from '../engine/niveau';

/* CHANTIER 169 — la frise des apparences du tiroir « Mes XP ». Les trois
   dernières places attendent les prochaines apparences gratuites. */
const FRISE: Array<{ seuil: number; nom: string }> = [
  { seuil: 100, nom: 'Cahier' },
  { seuil: 250, nom: 'Lycée clair' },
  { seuil: 400, nom: 'Lycée foncé' },
  { seuil: 600, nom: 'à venir' },
  { seuil: 800, nom: 'à venir' },
  { seuil: 1000, nom: 'à venir' },
];
const JOURS_COURTS = ['D', 'L', 'M', 'M', 'J', 'V', 'S'];

export function MesXp({ streak }: { streak: Streak }) {
  const xp = xpTotal(streak);
  const niveau = niveauDe(xp).niveau;
  const serieXp = serieValidee(streak);
  const recordXp = Math.max(meilleureSerie(streak), serieXp);
  const jours14 = historiqueXp(streak, 14);
  const gels = gelsEnReserve(streak);
  return (
    <>
      <div className="xpj-chiffres quatre">
        <span>
          <b>{xp.toLocaleString('fr-FR')}</b>
          <small>{estPremium() ? 'XP' : `XP sur ${XP_MAX_GRATUIT.toLocaleString('fr-FR')}`}</small>
        </span>
        <span>
          <b>{niveau}</b>
          <small>niveau</small>
        </span>
        <span>
          <b>{serieXp} / {recordXp}</b>
          <small>série en cours / meilleure</small>
        </span>
        <span>
          <b>{gels} / {GELS_MAX}</b>
          <small>gels en réserve</small>
        </span>
      </div>

      <p className="xpj-titre">Les 14 derniers jours</p>
      <div className="xpj-barres" role="img" aria-label="XP gagnés chacun des 14 derniers jours">
        {jours14.map((j) => {
          const nom = JOURS_COURTS[new Date(j.key + 'T12:00:00').getDay()];
          return (
            <span key={j.key} className={`xpj-jour ${j.etat}`} title={`${j.key.slice(8)}/${j.key.slice(5, 7)} : ${j.base + j.bonus} XP`}>
              <span className="xpj-col">
                {j.etat === 'valide' && (
                  <>
                    {j.bonus > 0 && <i className="xpj-bonus" style={{ height: `${(100 * j.bonus) / 80}%` }} />}
                    <i className="xpj-base" style={{ height: `${(100 * j.base) / 80}%` }} />
                  </>
                )}
                {j.etat === 'encours' && (
                  <i className="xpj-auj" style={{ height: `${Math.max(4, (25 * Math.min(j.cartes, CARTES_PAR_JOUR)) / CARTES_PAR_JOUR)}%` }} />
                )}
                {j.etat === 'manque' && <i className="xpj-manque" />}
                {j.etat === 'gel' && <i className="xpj-gel" />}
              </span>
              <small>{nom}</small>
            </span>
          );
        })}
      </div>
      <div className="xpj-legende">
        <span><i className="xpj-base" />XP du jour</span>
        <span><i className="xpj-bonus" />bonus de semaine</span>
        <span><i className="xpj-gel" />jour comblé par un gel</span>
        <span><i className="xpj-manque" />jour manqué</span>
        <span><i className="xpj-auj" />aujourd’hui ({Math.min(jours14[13].cartes, CARTES_PAR_JOUR)}/{CARTES_PAR_JOUR})</span>
      </div>

      <div className="xpj-bareme">
        <span><span>Du lundi au vendredi, 20 cartes</span><b>+20 XP</b></span>
        <span><span>Vendredi, 1re semaine à 5 / 5</span><b>+20 bonus</b></span>
        <span><span>2e semaine à 5 / 5 d’affilée</span><b>+40 bonus</b></span>
        <span><span>3e semaine et suivantes</span><b>+60 bonus</b></span>
        <span><span>Samedi ou dimanche, 20 cartes</span><b>+30 XP + 1 gel</b></span>
      </div>
      <p className="hint">
        La semaine repart à zéro chaque lundi. Un gel comble un jour manqué
        du lundi au vendredi : ce jour ne rapporte rien, mais la semaine
        compte pour 5 / 5. {GELS_MAX} gels au plus en réserve. Une semaine
        incomplète fait repartir le bonus à +20, jamais tes XP. « Facile » ne
        rapporte rien de plus. Parler ne rapporte pas d’XP.
      </p>

      <p className="xpj-titre">Apparences à gagner</p>
      <div className="xpj-frise">
        {FRISE.map((p, i) => {
          const avant = i === 0 ? 0 : FRISE[i - 1].seuil;
          const plein = xp >= p.seuil;
          const part = plein ? 100 : xp > avant ? (100 * (xp - avant)) / (p.seuil - avant) : 0;
          return (
            <span key={p.seuil} className={plein ? 'acquis' : part > 0 ? 'encours' : ''}>
              <i><i style={{ width: `${part}%` }} /></i>
              <b>{p.seuil.toLocaleString('fr-FR')}</b>
              <small>{p.nom}</small>
            </span>
          );
        })}
      </div>
    </>
  );
}
