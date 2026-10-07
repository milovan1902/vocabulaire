/**
 * Onglet « Réglages » : six lignes, six tiroirs.
 *
 * CHANTIER 167 — « Aide » rejoint la liste : une septième ligne, un
 * septième tiroir (premiers pas, page d'accueil, confidentialité).
 *
 * CHANTIER 92 — réparation. Le chantier 91 avait ajouté « Revoir les
 * premiers pas » à partir d'une copie de cet écran antérieure au
 * chantier 37 : les six lignes à tiroirs, l'apparence et le choix clair
 * ou sombre avaient disparu avec. Ce fichier est celui du chantier 50,
 * tel qu'il tournait, plus le seul bouton qui manquait.
 *
 * CHANTIER 50 — la durée annoncée par « Charge de travail » comptait
 * sept secondes par carte, contre vingt partout ailleurs. Elle passe par
 * `engine/tempo`, désormais seule source du chiffre.
 *
 * CHANTIER 42 — `Ligne` et `Tiroir` déménagent dans `tiroir.tsx` :
 * « Mes progrès » adopte la même forme et lit les mêmes briques. Rien
 * d'autre ne change dans cet écran.
 *
 * CHANTIER 41 — deux retouches. Les icônes passent de 34 à 40 pixels :
 * la ligne en fait 64, dont 40 utiles entre ses marges, et c'est le
 * texte sur deux lignes qui fixait déjà sa hauteur — l'icône y flottait.
 * Et le tiroir « Charge de travail » cesse d'être trois curseurs qui se
 * ressemblent : il s'ouvre sur la phrase de la journée réglée, chiffres
 * en or, et le temps que ça demande.
 *
 * CHANTIER 40 — les cinq carrés en attente reçoivent leur illustration.
 * Rien d'autre ne bouge : six lignes, six icônes, mêmes tiroirs.
 *
 * CHANTIER 39 — l'écran devient une table des matières. Chaque réglage
 * est une ligne qui porte son nom, son icône et SA VALEUR ACTUELLE à
 * droite ; le détail s'ouvre au doigt. Deux raisons :
 *
 * — la petite capitale au-dessus de chaque bloc répétait le nom du
 *   réglage écrit juste en dessous. Deux fois le même mot, dont un en
 *   gris clair de 10 pixels ;
 * — neuf fois sur dix on vient VÉRIFIER un réglage, pas le changer. La
 *   valeur à droite répond sans rien ouvrir.
 *
 * « Données » devient « Connexion » et récupère le compte, qui flottait
 * en haut de l'écran sans intitulé : le compte et les sauvegardes sont
 * deux faces d'une même question — où vit ma progression.
 *
 * Les contrôles eux-mêmes n'ont pas changé d'un pixel ni d'un mot. Ils
 * ont seulement déménagé dans les tiroirs.
 *
 * CHANTIER 37 — deux changements. L'apparence devient un réglage, clair
 * ou sombre ou d'après le système ; et le bloc « Série » s'en va dans
 * « Mes progrès », qui affichait déjà les mêmes deux nombres — la série
 * du jour et le record. Il était ici par héritage, pas par logique : une
 * série est une progression, pas un réglage.
 *
 * CHANTIER 36 — « Ma classe » se replie derrière un bouton. Sept rangées
 * dépliées coûtaient un demi-écran à un réglage qu'on fait une fois ; la
 * ligne dit maintenant la classe déclarée, et la liste s'ouvre au doigt.
 * Le reste de l'écran remonte d'autant.
 *
 * CHANTIER 34 — deux changements, rien d'autre n'a bougé : le titre, et
 * « Ma classe » qui descend ici depuis la barre du catalogue. Ce n'est pas
 * un filtre mais un réglage d'identité ; il se règle une fois et se range
 * avec les autres. Le catalogue continue de s'y ordonner tout seul, en
 * « pour ma classe » et « pour plus tard ».
 *
 * Ces blocs vivaient en bas de la bibliothèque, où ils allongeaient une page
 * dont l'objet était de choisir un paquet. Ils forment ici un écran à part,
 * atteint par les onglets.
 */
import { useEffect, useRef, useState } from 'react';
import type { Classe, Settings } from '../domain/types';
import { CLASSES, CLASSE_LABELS } from '../domain/types';
import { repository } from '../data/repository';
import { Slider, Toggle } from './components';
import { Ligne, Tiroir } from './tiroir';
import { minutesPour } from '../engine/tempo';
import { AccountPanel } from './AccountPanel';
import { phraseErreur } from '../data/messageErreur';
import { telechargeSauvegarde } from '../data/stockage';
import type { Auth } from './useAuth';
import type { Streak } from '../engine/streak';
import { HEURES, askPermission, permission } from './reminder';
import type { Theme } from './theme';
import { THEME_LABELS, setTheme, themeChoisi } from './theme';
import { DEBLOCAGE, estDebloquee, retenir } from './apparences';
import {
  XP_MAX_GRATUIT, estPremium, xpTotal,
} from '../engine/xp';

/**
 * Un curseur de la charge de travail : nom, rail, valeur, sur une
 * ligne. Trois fois la même ligne — ce qui distingue les trois
 * réglages, ce sont leurs nombres, pas leur mise en page.
 *
 * Le `Slider` général reste en place ailleurs : il écrit son libellé
 * au-dessus et sa valeur en gros à droite, ce qui convient à un curseur
 * seul (la vitesse de la voix) mais empilait trois pavés identiques
 * ici.
 */
function Curseur({
  label, min, max, step, value, onChange,
}: {
  label: string;
  min: number;
  max: number;
  step: number;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <label className="chargeligne">
      <span>{label}</span>
      <input
        type="range" min={min} max={max} step={step} value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      />
      <b>{value}</b>
    </label>
  );
}

/**
 * Le temps que la journée réglée demande.
 *
 * Un mot nouveau entraîne environ cinq révisions dans les semaines qui
 * suivent : une fois le rythme installé, la journée pèse les nouveaux
 * plus cinq fois les nouveaux, plafonnés par le maximum de révisions.
 *
 * CHANTIER 50 — deux corrections.
 *
 * La durée passait par sept secondes par carte, quand tout le reste de
 * l'application en compte vingt : le même travail s'annonçait en douze
 * minutes ici et en quarante sur l'écran d'accueil. Elle passe par
 * `minutesPour`, comme les trois autres endroits, et l'arrondi aux cinq
 * minutes tombe — il ajoutait sa propre erreur à une estimation qui en a
 * déjà une.
 *
 * Et la phrase dit désormais de quoi elle parle. Ce nombre n'est PAS
 * celui de l'accueil, et il n'a pas à l'être : l'accueil compte les
 * cartes réellement dues aujourd'hui, qui varient d'un jour à l'autre ;
 * ici on décrit le rythme qu'on vient de régler, une fois installé. Deux
 * questions différentes, deux réponses différentes — ce qui était
 * fautif, c'était de ne pas le dire.
 */
function tempsDit(s: Settings): string {
  if (s.newPerDay === 0) {
    return 'Aucun nouveau mot : il ne reste que les révisions déjà '
      + 'lancées, de moins en moins nombreuses.';
  }
  const revisions = Math.min(s.newPerDay * 5, s.reviewsPerDay);
  const cartes = s.newPerDay + revisions;
  return `Une fois ce rythme installé : environ ${cartes} cartes par `
    + `jour, soit ${minutesPour(cartes)} minutes.`;
}

/** Quel tiroir est ouvert. Un seul à la fois, et aucun au départ. */
type Tiroirs = null | 'connexion' | 'classe' | 'apparence' | 'rappel' | 'charge' | 'revision' | 'aide';


export function Account({
  settings, auth, streak, onSettings, onHome, onGuide,
}: {
  settings: Settings;
  auth: Auth;
  /* CHANTIER 168 — relu ici pour les XP qui débloquent les apparences. */
  streak: Streak;
  onSettings: (s: Settings) => void;
  onHome: () => void;
  /** CHANTIER 91 — rejouer le guidage des premiers pas. */
  onGuide: () => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [autorisation, setAutorisation] = useState(permission());
  const [tiroir, setTiroir] = useState<Tiroirs>(null);
  const [theme, setThemeLocal] = useState<Theme>(themeChoisi());
  /* CHANTIER 168 — le message sous une apparence encore verrouillée. */
  const [verrou, setVerrou] = useState<string | null>(null);
  const xp = xpTotal(streak);

  /*
   * L'apparence en cours est acquise pour de bon, et chaque palier
   * atteint aussi. C'est ce qui garde à qui l'utilisait déjà le Cahier ou
   * le Lycée, quel que soit son total d'XP.
   */
  useEffect(() => {
    retenir(themeChoisi());
    for (const t of Object.keys(DEBLOCAGE) as Theme[]) if (xp >= (DEBLOCAGE[t] ?? Infinity)) retenir(t);
  }, [xp]);

  /*
   * CHANTIER 114 — bornes resserrées : nouveaux mots 0 à 20, révisions
   * 20 à 100, cartes par passage 10 à 100. Un réglage enregistré avant,
   * hors de ces bornes, y est ramené une fois.
   */
  useEffect(() => {
    const n = Math.min(20, Math.max(0, settings.newPerDay));
    const r = Math.min(100, Math.max(20, settings.reviewsPerDay));
    const c = Math.min(100, Math.max(10, settings.cardsPerSession));
    if (n !== settings.newPerDay || r !== settings.reviewsPerDay || c !== settings.cardsPerSession) {
      onSettings({ ...settings, newPerDay: n, reviewsPerDay: r, cardsPerSession: c });
    }
  }, [settings, onSettings]);

  // L'autorisation peut avoir été changée dans les réglages du navigateur
  // pendant que l'application était ouverte.
  useEffect(() => { setAutorisation(permission()); }, []);

  /*
   * Ce que le bouton affiche à droite. « Non déclarée » est un état, pas
   * un vide : il se dit, sinon la ligne a l'air de ne pas être réglée.
   */
  const classeDite = settings.classe === null
    ? 'Non déclarée'
    : CLASSE_LABELS[settings.classe];

  /* Le tiroir se ferme dès qu'on a choisi : un réglage à choix unique
     n'a rien à confirmer. Les tiroirs à plusieurs réglages, eux, restent
     ouverts — on y règle souvent deux choses de suite. */
  function choisir(c: Classe | null) {
    onSettings({ ...settings, classe: c });
    setTiroir(null);
  }

  /*
   * Ce que chaque ligne affiche à droite : l'état du réglage, dit en
   * trois mots au plus. C'est la moitié de l'intérêt de l'écran.
   */
  const valeurs = {
    connexion: auth.email ? 'Connecté' : 'Sans compte',
    classe: classeDite,
    apparence: THEME_LABELS[theme],
    rappel: settings.reminderAt ? settings.reminderAt.replace(':', ' h ') : 'Désactivé',
    charge: `${settings.newPerDay} mots/j`,
    revision: settings.reversed ? 'EN → FR' : 'FR → EN',
  };

  async function activerRappel(actif: boolean) {
    if (!actif) {
      onSettings({ ...settings, reminderAt: null });
      return;
    }
    const ok = await askPermission();
    setAutorisation(permission());
    if (!ok) return;
    onSettings({ ...settings, reminderAt: settings.reminderAt ?? '19:00' });
  }

  /* CHANTIER 154 — le téléchargement vit dans data/stockage.ts : la bannière
     de « Mon travail » s'en sert aussi. */
  async function exportBackup() {
    try {
      await telechargeSauvegarde();
    } catch (e) {
      alert('Sauvegarde impossible. ' + phraseErreur(e, 'sauvegarde'));
    }
  }

  async function importBackup(file: File) {
    let payload: { format?: string; data?: Record<string, unknown>; date?: string };
    try {
      payload = JSON.parse(await file.text());
    } catch {
      alert("Fichier illisible : ce n'est pas une sauvegarde valide.");
      return;
    }
    if (payload.format !== 'vocab-backup' || !payload.data) {
      alert("Ce fichier n'est pas une sauvegarde de cette application.");
      return;
    }
    const when = (payload.date ?? '').slice(0, 10);
    if (!confirm(
      `Restaurer la sauvegarde du ${when} ?\n\n` +
      'Tous les paquets et la progression de cet appareil seront remplacés.',
    )) return;
    await repository.importAll(payload.data);
    alert('Sauvegarde restaurée.');
    // Rechargement complet : les réglages, la série et le compteur du jour
    // sont relus depuis la sauvegarde, pas seulement la liste des paquets.
    location.reload();
  }

  return (
    <>
      {/* CHANTIER 186 — un sous-menu ouvert prend la place de la liste. */}
      {!tiroir && (<>
      <h2 className="screen-title">Réglages</h2>

      <div className="reglist">
        <Ligne
          icone="/ico-connexion.png"
          titre="Connexion"
          sous="Compte et sauvegardes."
          valeur={valeurs.connexion}
          onClick={() => setTiroir('connexion')}
        />
        <Ligne
          icone="/btn-classe.png"
          titre="Ma classe"
          sous="Elle range le catalogue, sans rien fermer."
          valeur={valeurs.classe}
          onClick={() => setTiroir('classe')}
        />
        <Ligne
          icone="/ico-apparence.png"
          titre="Apparence"
          sous="Clair, sombre, ou d’après le système."
          valeur={valeurs.apparence}
          onClick={() => setTiroir('apparence')}
        />
        <Ligne
          icone="/ico-rappel.png"
          titre="Rappel quotidien"
          sous="Si la journée n’est pas faite."
          valeur={valeurs.rappel}
          onClick={() => setTiroir('rappel')}
        />
        <Ligne
          icone="/ico-charge.png"
          titre="Charge de travail"
          sous="Nouveaux mots et révisions par jour."
          valeur={valeurs.charge}
          onClick={() => setTiroir('charge')}
        />
        <Ligne
          icone="/ico-revision.png"
          titre="Révision"
          sous="Voix, sens des cartes, prononciation."
          valeur={valeurs.revision}
          onClick={() => setTiroir('revision')}
        />
        {/* CHANTIER 185 — « Mes XP » déménage dans « Mes progrès ». */}
        {/*
          * CHANTIER 167 — « Aide » devient une ligne comme les autres. Les
          * trois boutons qui traînaient sous la liste passent dans son
          * tiroir : même geste pour tous les réglages, quel que soit le thème.
          */}
        <Ligne
          icone="/ico-aide.png"
          titre="Aide"
          sous="Premiers pas, accueil, confidentialité."
          valeur=""
          onClick={() => setTiroir('aide')}
        />
      </div>
      </>)}

      {tiroir === 'aide' && (
        <Tiroir titre="Aide" retour="Réglages" onFermer={() => setTiroir(null)}>
          <button className="btn ghost" onClick={() => { setTiroir(null); onGuide(); }}>
            Revoir les premiers pas
          </button>
          <button className="btn ghost" onClick={() => { setTiroir(null); onHome(); }}>
            Revoir la page d’accueil
          </button>
          {/*
            CHANTIER 138 — la politique de confidentialité, accessible depuis
            l'application : Google Play l'exige. Un vrai lien, ouvert dans un
            nouvel onglet, pour que l'élève ne quitte pas sa séance.
          */}
          <a
            className="btn ghost"
            href="/confidentialite.html"
            target="_blank"
            rel="noopener"
          >
            Politique de confidentialité
          </a>
          <p className="hint" style={{ marginTop: 14 }}>
            Les premiers pas : la méthode en une page, puis cinq cartes du paquet
            en jeu. Ces cartes comptent comme une vraie révision.
          </p>
        </Tiroir>
      )}

      {tiroir === 'connexion' && (
        <Tiroir titre="Connexion" retour="Réglages" onFermer={() => setTiroir(null)}>
          <AccountPanel auth={auth} />
          <p className="hint" style={{ marginTop: 14 }}>
            Sans compte, la progression reste sur cet appareil. Pour la
            retrouver ailleurs, exporte une sauvegarde ici et restaure-la
            là-bas.
          </p>
          <button className="btn ghost" onClick={exportBackup}>Enregistrer une sauvegarde</button>
          <button className="btn ghost" onClick={() => fileRef.current?.click()}>
            Restaurer une sauvegarde
          </button>
          <input
            ref={fileRef} type="file" accept="application/json,.json" hidden
            onChange={(e) => {
              const f = e.target.files?.[0];
              e.target.value = '';
              if (f) void importBackup(f);
            }}
          />
        </Tiroir>
      )}

      {tiroir === 'classe' && (
        <Tiroir titre="Ma classe" retour="Réglages" onFermer={() => setTiroir(null)}>
          <p className="hint">
            Elle range le catalogue en « pour ma classe » et « pour plus tard ».
            Rien ne se ferme : les paquets des classes suivantes restent
            visibles, plus bas.
          </p>
          {CLASSES.map((c: Classe) => (
            <button
              key={c}
              className={`classrow${settings.classe === c ? ' on' : ''}`}
              onClick={() => choisir(c)}
            >
              <i />
              <span>{CLASSE_LABELS[c]}</span>
            </button>
          ))}
          <button
            className={`classrow${settings.classe === null ? ' on' : ''}`}
            onClick={() => choisir(null)}
          >
            <i />
            <span>Non déclarée — voir tout le catalogue</span>
          </button>
        </Tiroir>
      )}

      {tiroir === 'apparence' && (
        <Tiroir titre="Apparence" retour="Réglages" onFermer={() => setTiroir(null)}>
          {/* CHANTIER 168 — les XP, et ce qu'ils débloquent. */}
          <div className="xp-bloc">
            <span className="xp-ligne">
              <span>Tes XP</span>
              <b>{xp.toLocaleString('fr-FR')}{estPremium() ? '' : ` / ${XP_MAX_GRATUIT.toLocaleString('fr-FR')}`}</b>
            </span>
            <span className="xp-barre"><i style={{ width: `${Math.min(100, (100 * xp) / XP_MAX_GRATUIT)}%` }} /></span>
          </div>
          <div className="themechoix themechoix-6">
            {(['auto', 'clair', 'sombre', 'cahier', 'cahier-vert', 'cahier-rose', 'cahier-bleu', 'lycee-clair', 'lycee', 'decollage', 'orbite', 'tableau-vert', 'tableau-noir', 'arcade', 'neon', 'grand-bleu', 'carnet-kraft', 'manga', 'bd-pop', 'jardin', 'parquet', 'pelouse', 'melee', 'strass', 'grille', 'diner', 'tv', 'tapis-vert', 'salon-prive', 'station', 'fashion', 'cinema', 'bibliotheque'] as Theme[]).map((t) => {
              const libre = estDebloquee(t, xp);
              const seuil = DEBLOCAGE[t] ?? 0;
              return (
                <button
                  key={t}
                  className={`${theme === t ? 'on' : ''}${libre ? '' : ' verrou'}`}
                  aria-pressed={theme === t}
                  aria-disabled={!libre}
                  onClick={() => {
                    if (!libre) {
                      const manque = seuil - xp;
                      const j = Math.ceil(manque / 20);
                      setVerrou(`« ${THEME_LABELS[t]} » se débloque à ${seuil} XP. Il t’en manque ${manque} : environ ${j} jour${j > 1 ? 's' : ''} à 20 cartes.`);
                      return;
                    }
                    setVerrou(null);
                    setTheme(t);
                    setThemeLocal(t);
                    retenir(t);
                  }}
                >
                  {THEME_LABELS[t]}
                  {!libre && (
                    <small className="verrou-seuil">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
                        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                      </svg>
                      {seuil} XP
                    </small>
                  )}
                </button>
              );
            })}
          </div>
          {verrou && <p className="xp-verrou" role="status">{verrou}</p>}
          <p className="hint">
            Tu gagnes 20 XP chaque jour où tu révises au moins 20 cartes. Tous
            les 5 jours d’affilée, un bonus : +20, puis +40, puis +60. Un jour
            manqué remet le bonus à zéro, jamais tes XP. D’autres apparences
            arrivent à 600, 800 et 1 000 XP.
          </p>
          <p className="hint">
            Le thème choisi reste sur cet appareil. « Automatique » suit le
            système. Les quatre « Cahier » (jaune, vert, rose, bleu) sont le même
            cahier d’école, sur quatre couleurs de papier.
            « Lycée clair » et « Lycée foncé » ont la même forme — niveaux,
            défi du jour, paquets en éventail — sur fond clair ou sombre.
            « Décollage » et « Orbite » reprennent cette forme dans l’espace :
            une station orbitale, ou des paquets en orbite autour d’une planète.
            « Tableau vert » et « Tableau noir » : la salle de classe, écrite à la craie.
            « Borne arcade » et « Néon » : la salle de jeux, ou la ville la nuit.
            « Grand bleu » : la plongée, sous l’eau.
            « Carnet kraft » : le carnet de voyage. « Manga » et « BD pop » : la bande dessinée.
            « Jardin » : le potager au soleil, où chaque note est une fleur en pot.
            « Parquet », « Pelouse » et « Mêlée » : le basket, le football et le rugby.
            « Strass » : la soirée de gala. « Grille de départ » : le circuit automobile.
            « Diner » et « TV » : les années 50 et 60.
            « Tapis vert » et « Salon privé » : la table de poker, ou le salon de jeu noir et or.
            « Station 1936 » : l’affiche de ski rétro, où les paquets sont des télécabines.
            « Fashion week » : le défilé en noir et blanc, où les paquets sont des housses pendues à un portant.
            « Cinéma muet » : la salle obscure, où les paquets défilent sur une pellicule.
            « Bibliothèque » : la salle de lecture, où les paquets sont des livres rangés sur un rayon.
          </p>
        </Tiroir>
      )}

      {tiroir === 'rappel' && (
        <Tiroir titre="Rappel quotidien" retour="Réglages" onFermer={() => setTiroir(null)}>
          <div className="setting">
            <Toggle
              label="Me rappeler de réviser"
              checked={settings.reminderAt !== null}
              onChange={(v) => void activerRappel(v)}
            />
            {settings.reminderAt !== null && (
              <div className="heures">
                {HEURES.map((h) => (
                  <button
                    key={h}
                    className={settings.reminderAt === h ? 'on' : ''}
                    onClick={() => onSettings({ ...settings, reminderAt: h })}
                  >
                    {h.replace(':', ' h ')}
                  </button>
                ))}
              </div>
            )}
            <p className="hint">
              {autorisation === 'unsupported'
                ? 'Ce navigateur ne sait pas afficher de notification.'
                : autorisation === 'denied'
                  ? 'Les notifications sont bloquées pour ce site : à réautoriser dans les réglages du navigateur.'
                  : 'Le rappel n’arrive que si l’application est encore ouverte, même en arrière-plan. Sur téléphone rangé, compte plutôt sur l’écran d’accueil, qui prévient quand la série est en jeu.'}
            </p>
          </div>
        </Tiroir>
      )}

      {tiroir === 'charge' && (
        <Tiroir titre="Charge de travail" retour="Réglages" onFermer={() => setTiroir(null)}>
          {/* La journée réglée, dite en une phrase : on voit ce qu'on
              fabrique avant de toucher aux curseurs. */}
          <p className="chargephrase">
            <b>{settings.newPerDay}</b> nouveaux mots par jour,{' '}
            <b>{settings.reviewsPerDay}</b> révisions au plus, par passages
            de <b>{settings.cardsPerSession}</b> cartes.
          </p>
          <p className="chargetemps">{tempsDit(settings)}</p>
          <div className="chargelist">
            <Curseur
              label="Nouveaux mots"
              min={0} max={20} step={1} value={settings.newPerDay}
              onChange={(v) => onSettings({ ...settings, newPerDay: v })}
            />
            <Curseur
              label="Révisions max."
              min={20} max={100} step={5} value={settings.reviewsPerDay}
              onChange={(v) => onSettings({ ...settings, reviewsPerDay: v })}
            />
            <Curseur
              label="Cartes / passage"
              min={10} max={100} step={5} value={settings.cardsPerSession}
              onChange={(v) => onSettings({ ...settings, cardsPerSession: v })}
            />
          </div>
          <p className="hint chargenote">
            Un nouveau mot entraîne environ cinq révisions dans les semaines
            qui suivent. Le nombre annoncé ici est celui du rythme installé :
            l’écran d’accueil, lui, compte les cartes réellement dues
            aujourd’hui, qui sont plus ou moins nombreuses selon les jours.
            Ces réglages valent pour tous les paquets, sauf ceux qui ont les
            leurs — un paquet se particularise depuis son propre écran.
          </p>
        </Tiroir>
      )}

      {tiroir === 'revision' && (
        <Tiroir titre="Révision" retour="Réglages" onFermer={() => setTiroir(null)}>
          <Slider
            label="Vitesse de la voix"
            min={0.6} max={1.1} step={0.05} value={settings.speechRate}
            format={(v) => v.toFixed(2).replace('.', ',')}
            onChange={(v) => onSettings({ ...settings, speechRate: v })}
          />
          <div className="setting" style={{ display: 'flex', flexDirection: 'column', gap: 13 }}>
            <Toggle
              label="Prononcer automatiquement à la réponse"
              checked={settings.autoSpeak}
              onChange={(v) => onSettings({ ...settings, autoSpeak: v })}
            />
            <Toggle
              label="Sens inverse : anglais → français"
              checked={settings.reversed}
              onChange={(v) => onSettings({ ...settings, reversed: v })}
            />
          </div>
        </Tiroir>
      )}
    </>
  );
}
