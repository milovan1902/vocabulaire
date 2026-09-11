/**
 * Onglet « Réglages » : classe, rappel, charge de travail, compte, sauvegardes.
 *
 * CHANTIER 34 — deux changements, rien d'autre n'a bougé : le titre, et
 * « Ma classe » qui descend ici depuis la barre du catalogue. Ce n'est pas
 * un filtre mais un réglage d'identité ; il se règle une fois et se range
 * avec les autres. Le catalogue continue de s'y ordonner tout seul, en
 * « pour ma classe » et « pour plus tard ».
 *
 * Le bloc « Série » reste : il dit si la journée est en jeu, ce qui est une
 * information du présent. Le passé — total, record, calendrier — est parti
 * dans « Mes progrès », son écran.
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
import { AccountPanel } from './AccountPanel';
import type { Auth } from './useAuth';
import type { Streak } from '../engine/streak';
import { liveStreak } from '../engine/streak';
import { HEURES, askPermission, permission } from './reminder';

export function Account({
  settings, auth, streak, onSettings, onHome,
}: {
  settings: Settings;
  auth: Auth;
  streak: Streak;
  onSettings: (s: Settings) => void;
  onHome: () => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [autorisation, setAutorisation] = useState(permission());

  // L'autorisation peut avoir été changée dans les réglages du navigateur
  // pendant que l'application était ouverte.
  useEffect(() => { setAutorisation(permission()); }, []);

  const serie = liveStreak(streak);

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

      <AccountPanel auth={auth} />

      <p className="rayon-label">Ma classe</p>
      <div className="classpanel plain">
        <p className="hint">
          Elle range le catalogue en « pour ma classe » et « pour plus tard ».
          Rien ne se ferme : les paquets des classes suivantes restent
          visibles, plus bas.
        </p>
        {CLASSES.map((c: Classe) => (
          <button
            key={c}
            className={`classrow${settings.classe === c ? ' on' : ''}`}
            onClick={() => onSettings({ ...settings, classe: c })}
          >
            <i />
            <span>{CLASSE_LABELS[c]}</span>
          </button>
        ))}
        <button
          className={`classrow${settings.classe === null ? ' on' : ''}`}
          onClick={() => onSettings({ ...settings, classe: null })}
        >
          <i />
          <span>Non déclarée — voir tout le catalogue</span>
        </button>
      </div>

      <p className="rayon-label">Série</p>
      <div className="serie-bloc">
        <b>{serie}</b>
        <div>
          <p>jour{serie > 1 ? 's' : ''} d’affilée</p>
          <p className="hint">
            {streak.best > 0 ? `Record : ${streak.best} jours` : 'Une révision par jour suffit à la tenir.'}
          </p>
        </div>
      </div>

      <p className="rayon-label">Rappel quotidien</p>
      <div className="panelbox open">
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
      </div>

      <p className="rayon-label">Charge de travail</p>
      <div className="panelbox open">
        <Slider
          label="Nouveaux mots par jour"
          hint="Chaque nouveau mot génère environ 5 révisions dans les semaines qui suivent."
          min={0} max={60} step={5} value={settings.newPerDay}
          onChange={(v) => onSettings({ ...settings, newPerDay: v })}
        />
        <Slider
          label="Révisions maximum par jour"
          min={20} max={200} step={10} value={settings.reviewsPerDay}
          onChange={(v) => onSettings({ ...settings, reviewsPerDay: v })}
        />
        <Slider
          label="Cartes par session"
          hint="Pour découper la journée en plusieurs passages courts."
          min={10} max={60} step={5} value={settings.cardsPerSession}
          onChange={(v) => onSettings({ ...settings, cardsPerSession: v })}
        />
      </div>

      <p className="rayon-label">Révision</p>
      <div className="panelbox open">
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
      </div>
      <p className="hint">
        Ces réglages s’appliquent à tous les paquets, sauf à ceux qui ont
        les leurs. Un paquet se particularise depuis son propre écran.
      </p>

      <p className="rayon-label">Données</p>
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
      <p className="hint">
        Sans compte, la progression reste sur cet appareil. Pour la retrouver
        ailleurs, exportez une sauvegarde ici et restaurez-la là-bas.
      </p>

      <button className="btn ghost" style={{ marginTop: 18 }} onClick={onHome}>
        Revoir la page d’accueil
      </button>
    </>
  );
}
