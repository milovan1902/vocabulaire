/**
 * Rappel quotidien.
 *
 * Limite à connaître, et à assumer : sans serveur d'envoi, un navigateur ne
 * réveille pas une application fermée. Ce rappel ne se déclenche donc que si
 * l'application est encore ouverte, éventuellement dans un onglet en
 * arrière-plan — ce qui couvre l'ordinateur, pas le téléphone rangé dans une
 * poche. Un vrai rappel sur téléphone demande un envoi serveur (web push) :
 * c'est un chantier à part, avec une clé et une fonction de bord.
 *
 * D'où le partage des rôles : cette notification-ci fait ce qu'elle peut, et
 * l'écran « Aujourd'hui » dit à voix haute quand la série est en jeu — lui,
 * il est toujours vu.
 */

let timer: number | null = null;

export function canNotify(): boolean {
  return typeof Notification !== 'undefined';
}

export function permission(): NotificationPermission | 'unsupported' {
  return canNotify() ? Notification.permission : 'unsupported';
}

/** Demande l'autorisation. Renvoie true si elle est accordée. */
export async function askPermission(): Promise<boolean> {
  if (!canNotify()) return false;
  if (Notification.permission === 'granted') return true;
  if (Notification.permission === 'denied') return false;
  return (await Notification.requestPermission()) === 'granted';
}

/** Millisecondes jusqu'à la prochaine occurrence de HH:MM. */
function msUntil(at: string, from = new Date()): number {
  const [h, m] = at.split(':').map(Number);
  const cible = new Date(from);
  cible.setHours(h, m, 0, 0);
  if (cible.getTime() <= from.getTime()) cible.setDate(cible.getDate() + 1);
  return cible.getTime() - from.getTime();
}

/**
 * (Ré)arme le rappel. `null` l'annule.
 *
 * La charge du jour est relue au moment du déclenchement, pas à l'armement :
 * sur un onglet resté ouvert toute la journée, l'état d'il y a douze heures
 * n'a aucune valeur, et rien n'est plus agaçant qu'un rappel pour un travail
 * déjà fait.
 *
 * Réarmer plusieurs fois est sans danger : l'heure visée est absolue, le
 * minuteur précédent est annulé.
 */
export function scheduleReminder(
  at: string | null,
  dueToday: () => Promise<number>,
): void {
  if (timer !== null) {
    clearTimeout(timer);
    timer = null;
  }
  if (!at || permission() !== 'granted') return;

  timer = window.setTimeout(async () => {
    try {
      const n = await dueToday();
      if (n > 0) {
        new Notification('Vocabulaire', {
          body: `${n} carte${n > 1 ? 's' : ''} vous attend${n > 1 ? 'ent' : ''} aujourd’hui.`,
          icon: '/icon-192.png',
          tag: 'rappel-quotidien',
        });
      }
    } catch {
      // Un rappel manqué ne doit pas casser l'application : on se contente
      // de réarmer pour le lendemain.
    }
    scheduleReminder(at, dueToday);
  }, msUntil(at));
}

/** Heures proposées. Une liste courte vaut mieux qu'un choix libre. */
export const HEURES = ['08:00', '12:00', '17:00', '19:00', '21:00'];
