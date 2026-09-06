/**
 * Onglet « Compte » : réglages généraux, compte en ligne, sauvegardes.
 *
 * Ces trois blocs vivaient en bas de la bibliothèque, où ils allongeaient
 * une page dont l'objet était de choisir un paquet. Ils forment ici un
 * écran à part, atteint par les onglets.
 */
import { useRef } from 'react';
import type { Settings } from '../domain/types';
import { repository } from '../data/repository';
import { Slider, Toggle } from './components';
import { AccountPanel } from './AccountPanel';
import type { Auth } from './useAuth';

export function Account({
  settings, auth, onSettings, onHome,
}: {
  settings: Settings;
  auth: Auth;
  onSettings: (s: Settings) => void;
  onHome: () => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);

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
    // Rechargement complet : les réglages et le compteur du jour sont
    // relus depuis la sauvegarde, pas seulement la liste des paquets.
    location.reload();
  }

  return (
    <>
      <h2 className="screen-title">Compte</h2>

      <AccountPanel auth={auth} />

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
