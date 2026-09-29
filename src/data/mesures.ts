/**
 * CHANTIER 147 — LES MESURES D'USAGE, ANONYMES ET INTERNES
 *
 * But : savoir si l'app sert. Combien d'installations, où l'accueil perd
 * les élèves, combien reviennent le lendemain et la semaine suivante,
 * combien révisent, combien parlent.
 *
 * SANS OUTIL TIERS (programme Familles) et SANS LIEN AVEC LE COMPTE : un
 * identifiant tiré au hasard à la première ouverture, rangé sur le
 * téléphone, qui ne dit rien de la personne. Aucun e-mail, aucune classe,
 * aucun contenu. Conservation 13 mois (règle CNIL de la mesure d'audience).
 *
 * Chaque événement part UNE fois : une fois pour toujours (installation,
 * étapes d'accueil, compte) ou une fois par jour (ouverture, révision,
 * conversation). Un envoi raté est perdu, jamais bloquant.
 */

type Unique = 'installation' | 'onboarding' | 'onboarding_fini' | 'compte';
type Quotidien = 'ouverture' | 'revision' | 'parler';
export type Evenement = Unique | Quotidien;

const QUOTIDIENS = new Set<Evenement>(['ouverture', 'revision', 'parler']);
const CLE_ID = 'mesure-install';
const CLE_FAITS = 'mesure-faits';

function jour(): string {
  return new Date().toISOString().slice(0, 10);
}

function idInstallation(): string {
  let id = localStorage.getItem(CLE_ID);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(CLE_ID, id);
  }
  return id;
}

export function mesure(evenement: Evenement, detail?: string): void {
  try {
    if (import.meta.env.DEV) return;
    const faits = JSON.parse(localStorage.getItem(CLE_FAITS) ?? '{}') as Record<string, string>;
    const cle = detail ? evenement + ':' + detail : evenement;
    const aujourdhui = jour();
    if (QUOTIDIENS.has(evenement) ? faits[cle] === aujourdhui : cle in faits) return;
    faits[cle] = aujourdhui;
    localStorage.setItem(CLE_FAITS, JSON.stringify(faits));
    void fetch('/api/mesure', {
      method: 'POST',
      keepalive: true,
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ install: idInstallation(), evenement, detail: detail?.slice(0, 40) }),
    }).catch(() => {});
  } catch {
    /* Stockage ou réseau indisponible : on ne mesure pas, c'est tout. */
  }
}
