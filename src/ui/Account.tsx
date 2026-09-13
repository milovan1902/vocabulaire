/**
 * Onglet « Réglages » : six lignes, six tiroirs.
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
import { AccountPanel } from './AccountPanel';
import type { Auth } from './useAuth';
import type { Streak } from '../engine/streak';
import { HEURES, askPermission, permission } from './reminder';
import type { Theme } from './theme';
import { THEME_LABELS, setTheme, themeChoisi } from './theme';

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
 * Sept secondes par carte, arrondi aux cinq minutes.
 *
 * C'est une estimation, et elle se dit comme telle. Annoncée comme une
 * promesse, elle se retournerait contre l'application le jour où elle
 * tombe à côté.
 */
function tempsDit(s: Settings): string {
  if (s.newPerDay === 0) {
    return 'Aucun nouveau mot : il ne reste que les révisions déjà '
      + 'lancées, de moins en moins nombreuses.';
  }
  const revisions = Math.min(s.newPerDay * 5, s.reviewsPerDay);
  const cartes = s.newPerDay + revisions;
  const minutes = Math.max(5, Math.round((cartes * 7) / 60 / 5) * 5);
  return `Environ ${cartes} cartes par jour, soit ${minutes} minutes, `
    + 'une fois le rythme installé.';
}

/** Quel tiroir est ouvert. Un seul à la fois, et aucun au départ. */
type Tiroirs = null | 'connexion' | 'classe' | 'apparence' | 'rappel' | 'charge' | 'revision';

export function Account({
  settings, auth, onSettings, onHome,
}: {
  settings: Settings;
  auth: Auth;
  /*
   * La série est partie dans « Mes progrès » : cet écran ne la lit plus.
   * Le prop reste accepté pour qu'`App.tsx` n'ait pas à changer — il le
   * passe encore, sans conséquence.
   */
  streak: Streak;
  onSettings: (s: Settings) => void;
  onHome: () => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [autorisation, setAutorisation] = useState(permission());
  const [tiroir, setTiroir] = useState<Tiroirs>(null);
  const [theme, setThemeLocal] = useState<Theme>(themeChoisi());

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

  async function exportBackup() {
    try {
      const data = await repository.exportAll();
      const payload = {
        format: 'vocab-backup',
        version: 3,
        date: new Date().toISOString(),
        data,
      };
      const blob = new Blob([JSON.stringify(payload)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `vocabulaire-sauvegarde-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 400);
    } catch (e) {
      alert('Sauvegarde impossible : ' + (e as Error).message);
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
      </div>

      <button className="btn ghost" style={{ marginTop: 18 }} onClick={onHome}>
        Revoir la page d’accueil
      </button>

      {tiroir === 'connexion' && (
        <Tiroir titre="Connexion" onFermer={() => setTiroir(null)}>
          <AccountPanel auth={auth} />
          <p className="hint" style={{ marginTop: 14 }}>
            Sans compte, la progression reste sur cet appareil. Pour la
            retrouver ailleurs, exportez une sauvegarde ici et restaurez-la
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
        <Tiroir titre="Ma classe" onFermer={() => setTiroir(null)}>
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
        <Tiroir titre="Apparence" onFermer={() => setTiroir(null)}>
          <div className="themechoix">
            {(['auto', 'clair', 'sombre'] as Theme[]).map((t) => (
              <button
                key={t}
                className={theme === t ? 'on' : ''}
                aria-pressed={theme === t}
                onClick={() => { setTheme(t); setThemeLocal(t); }}
              >
                {THEME_LABELS[t]}
              </button>
            ))}
          </div>
          <p className="hint">
            Le thème reste sur cet appareil : il ne suit pas le compte, et ne
            part pas dans les sauvegardes. « Automatique » suit le système et
            continue de le suivre.
          </p>
        </Tiroir>
      )}

      {tiroir === 'rappel' && (
        <Tiroir titre="Rappel quotidien" onFermer={() => setTiroir(null)}>
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
                  : 'Le rappel n’arrive que si l’application est encore ouverte, même en arrière-plan. Sur téléphone rangé, comptez plutôt sur l’écran d’accueil, qui prévient quand la série est en jeu.'}
            </p>
          </div>
        </Tiroir>
      )}

      {tiroir === 'charge' && (
        <Tiroir titre="Charge de travail" onFermer={() => setTiroir(null)}>
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
              min={0} max={60} step={5} value={settings.newPerDay}
              onChange={(v) => onSettings({ ...settings, newPerDay: v })}
            />
            <Curseur
              label="Révisions max."
              min={20} max={200} step={10} value={settings.reviewsPerDay}
              onChange={(v) => onSettings({ ...settings, reviewsPerDay: v })}
            />
            <Curseur
              label="Cartes / passage"
              min={10} max={60} step={5} value={settings.cardsPerSession}
              onChange={(v) => onSettings({ ...settings, cardsPerSession: v })}
            />
          </div>
          <p className="hint chargenote">
            Un nouveau mot entraîne environ cinq révisions dans les semaines
            qui suivent. Ces réglages valent pour tous les paquets, sauf ceux
            qui ont les leurs — un paquet se particularise depuis son propre
            écran.
          </p>
        </Tiroir>
      )}

      {tiroir === 'revision' && (
        <Tiroir titre="Révision" onFermer={() => setTiroir(null)}>
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
