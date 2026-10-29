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
/* CHANTIER 358 — le tu et le vous : élève = tu, adulte = vous. */
import { tvp } from './ton';
import type { Streak } from '../engine/streak';
import {
  CARTES_PAR_JOUR, GELS_MAX, XP_MAX_GRATUIT, bilan, estPremium, gelsEnReserve, gelsPrevus, historiqueXp, meilleureSerie, serieValidee, xpTotal,
} from '../engine/xp';
import { credits } from './apparences';
import './gel.css';
import { niveauDe } from '../engine/niveau';

/* CHANTIER 268 — la frise des paliers d'apparence laisse place au solde de crédits. */
const JOURS_COURTS = ['D', 'L', 'M', 'M', 'J', 'V', 'S'];

export function MesXp({ streak }: { streak: Streak }) {
  const xp = xpTotal(streak);
  const niveau = niveauDe(xp).niveau;
  const serieXp = serieValidee(streak);
  const recordXp = Math.max(meilleureSerie(streak), serieXp);
  const jours14 = historiqueXp(streak, 14);
  const gels = gelsEnReserve(streak);
  /* 315 — jours manqués que la réserve comblera à la clôture de la semaine. */
  const prevus = gelsPrevus(streak);
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
            <span key={j.key} className={`xpj-jour ${prevus.includes(j.key) ? 'gel-prevu' : j.etat}`} title={prevus.includes(j.key) ? `${j.key.slice(8)}/${j.key.slice(5, 7)} : comblé par un gel à la fin de la semaine` : `${j.key.slice(8)}/${j.key.slice(5, 7)} : ${j.base + j.bonus + (j.defi ?? 0)} XP${j.defi ? ` (dont ${j.defi} du défi éclair)` : ''}`}>
              <span className="xpj-col">
                {/* 358 — le défi éclair, posé au-dessus, quel que soit l'état du jour. */}
                {!!j.defi && <i className="xpj-defi" style={{ height: `${(100 * j.defi) / 80}%` }} />}
                {j.etat === 'valide' && (
                  <>
                    {j.bonus > 0 && <i className="xpj-bonus" style={{ height: `${(100 * j.bonus) / 80}%` }} />}
                    <i className="xpj-base" style={{ height: `${(100 * j.base) / 80}%` }} />
                  </>
                )}
                {j.etat === 'encours' && (
                  <i className="xpj-auj" style={{ height: `${Math.max(4, (25 * Math.min(j.cartes, CARTES_PAR_JOUR)) / CARTES_PAR_JOUR)}%` }} />
                )}
                {j.etat === 'manque' && (prevus.includes(j.key) ? <i className="xpj-gel-prevu" /> : <i className="xpj-manque" />)}
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
        <span><i className="xpj-defi" />défi éclair</span>
        <span><i className="xpj-gel" />jour comblé par un gel</span>
        {prevus.length > 0 && <span><i className="xpj-gel-prevu" />gel prévu, posé en fin de semaine</span>}
        <span><i className="xpj-manque" />jour manqué</span>
        <span><i className="xpj-auj" />aujourd’hui ({Math.min(jours14[13].cartes, CARTES_PAR_JOUR)}/{CARTES_PAR_JOUR})</span>
      </div>

      <div className="xpj-bareme">
        <span><span>Du lundi au vendredi, 20 cartes</span><b>+20 XP</b></span>
        <span><span>Vendredi, 1re semaine à 5 / 5</span><b>+20 bonus</b></span>
        <span><span>2e semaine à 5 / 5 d’affilée</span><b>+40 bonus</b></span>
        <span><span>3e semaine et suivantes</span><b>+60 bonus</b></span>
        <span><span>Samedi ou dimanche, 20 cartes</span><b>+30 XP + 1 gel</b></span>
        <span><span>Défi éclair 5 / 5 (4 / 5)</span><b>+10 XP (+5)</b></span>
      </div>
      <p className="hint">
        La semaine repart à zéro chaque lundi. Un gel comble un jour manqué
        du lundi au vendredi : ce jour ne rapporte rien, mais la semaine
        compte pour 5 / 5. Le gel est posé quand la semaine se ferme : vendredi validé, ou samedi. {GELS_MAX} gels au plus en réserve. Une semaine
        incomplète fait repartir le bonus à +20, jamais {tvp('tes', 'vos')} XP. « Facile » ne
        rapporte rien de plus. Parler ne rapporte pas d’XP.
      </p>

      <p className="xpj-titre">{tvp('Tes crédits', 'Vos crédits')}</p>
      <p className="hint">
        Chaque XP gagné devient un crédit, à échanger contre l’apparence de {tvp('ton', 'votre')} choix
        dans Réglages › Apparence. {tvp('Tu as', 'Vous avez')} {credits(bilan(streak).xp).toLocaleString('fr-FR')} crédits.
      </p>
    </>
  );
}
