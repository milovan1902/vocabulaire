/**
 * CHANTIER 293 — LA PREMIÈRE CONNEXION GUIDÉE, DANS LA VRAIE APPLICATION.
 *
 * Remplace les douze étapes du chantier 292 (Onboarding.tsx, qui n'est
 * plus appelé). Plus de présentation à part : l'élève touche les vrais
 * boutons. Un voile couvre tout l'écran sauf le bouton attendu, entouré
 * d'or ; le reste est verrouillé jusqu'à la fin. « Passer » saute
 * l'étape, « i » ouvre les précisions.
 *
 * Les cibles sont trouvées dans la page par leur sélecteur ET leur
 * libellé : aucun écran n'a eu à changer pour être guidé. Leur position
 * est relue en continu (défilement, animations d'écran, tiroirs).
 *
 * Trois étapes interceptent le bouton au lieu de le laisser agir :
 * « Commencer à parler » (on regarde un exemple, sans consommer de
 * minutes) et « Créer mon paquet de révision » (on montre les trois
 * étapes sans créer de paquet). Une cible introuvable (classe avant la
 * 4e, aucun paquet dû…) laisse place à « Continuer » au bout d'1,5 s.
 *
 * CHANTIER 295 — la visite se joue toujours en apparence « Clair », posée
 * en aperçu (rien n'est enregistré). À la fin, l'apparence de l'élève
 * revient ; s'il en choisit une à la dernière étape, c'est elle qui reste.
 *
 * CHANTIER 297 —
 *  • le prénom est redemandé en tout premier (gardé dans localStorage,
 *    clé « vocab:prenom ») et repris dans les bulles et l'exemple de Parler ;
 *  • « Réviser » est retenu le temps d'une bulle « Comment réviser » (la
 *    carte, la réponse, les quatre notes), puis rejoué : la révision
 *    s'ouvre seulement après ;
 *  • chaque bulle a un « ‹ Retour » vers l'étape précédente. Les étapes
 *    qui supposent un sous-écran ouvert sont sautées : on revient au
 *    dernier geste qui se refait d'où l'on est (un onglet, en général).
 *
 * CHANTIER 298 —
 *  • « Comment réviser » dit le bon sens : on lit le français, on cherche
 *    l'anglais (le sens par défaut, FR → EN) ;
 *  • 1000 crédits offerts après la connexion Google, pour une première
 *    apparence. Ils passent par un « achat » à prix négatif (id
 *    « bienvenue ») : le solde (XP − prix payés) monte de 1000, une seule
 *    fois, et le cadeau voyage entre appareils avec les autres achats ;
 *  • le retour aux Réglages se fait par l'onglet du bas, plus par le
 *    chevron en haut à gauche : toucher l'onglet ferme aussi le tiroir.
 *
 * CHANTIER 325 — la toute première question : « Je suis élève » ou « Je
 *  suis adulte ». Elle règle le ton (tu ou vous) et le chemin : l'adulte
 *  passe son test de niveau dans Réglages › Mon profil, la visite s'efface.
 *
 * Obligatoire à la première connexion ; l'étape en cours est gardée par
 * App.tsx, la visite reprend donc après un rechargement. L'administrateur
 * la relance depuis Réglages › Aide › Revoir la première connexion.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { createPortal } from 'react-dom';
import type { Classe, Grade } from '../domain/types';
import { CLASSES, CLASSE_LABELS } from '../domain/types';
import { mesure } from '../data/mesures';
import { appliquerApercu, finApercu } from './theme';
import { ajouterAchat } from '../data/apparencesStock';
/* CHANTIER 325 — élève ou adulte, tu ou vous. */
import { EVT_PROFIL, poseProfil, profilLocal, type Profil } from './ton';
import './visite.css';

/** CHANTIER 297 — le prénom de l'élève, demandé à la première étape. */
export const PRENOM = 'vocab:prenom';

/** CHANTIER 298 — les crédits de bienvenue. */
const CADEAU = 1000;
function offrirCredits() {
  ajouterAchat({ t: 'bienvenue', prix: -CADEAU, at: Date.now() });
}

type Fiche = 'paquets' | 'methode' | 'frise' | 'progres' | 'minutes' | 'oral' | 'gratuit' | 'abonnes' | 'photos' | 'apparences';
type Cible = {
  sel: string; texte?: string; debut?: boolean; max?: number; tous?: boolean;
  /** Toucher cette cible prépare l'étape sans la finir (choisir un paquet avant « Réviser »). */
  sansAvancer?: boolean;
  /** Ce que dit la bulle quand c'est cette cible qui est trouvée. */
  consigne?: string;
  /** 325 — la même consigne, au vouvoiement. */
  consigneVous?: string;
};
type Etape = {
  id: string;
  /** Le numéro montré : plusieurs gestes peuvent faire une même étape. */
  n: number;
  /** Le texte, ou une fonction du prénom. */
  texte: string | ((prenom: string, adulte: boolean) => string);
  /** Une cible, ou plusieurs essayées dans l'ordre : la première affichée gagne. */
  cible?: Cible | Cible[];
  /** Le clic sur la cible est pris par la visite et n'atteint pas l'application. */
  intercepte?: boolean;
  /** 297 — le clic est retenu, puis rejoué à la fin de l'étape suivante (« lance »). */
  retient?: boolean;
  /** 297 — l'étape rejoue le clic retenu à l'étape précédente. */
  lance?: boolean;
  /** 297 — l'étape demande le prénom. */
  saisie?: boolean;
  /** 325 — l'étape demande : élève ou adulte ? */
  profil?: boolean;
  /** 325 — étape réservée à un profil. */
  seulAdulte?: boolean;
  seulEleve?: boolean;
  /** 325 — la visite s'efface jusqu'à ce que le niveau soit validé dans Réglages. */
  attente?: boolean;
  /** 298 — toucher la cible ferme aussi le tiroir ouvert (chevron « ‹ Réglages »). */
  fermeTiroir?: boolean;
  /** 298 — l'étape offre les crédits de bienvenue dès qu'elle s'affiche. */
  cadeau?: boolean;
  /** 297 — l'écran (App.tsx) où l'étape a du sens : sert au « Retour ». */
  ecran?: string;
  /** Pas de geste attendu : un bouton pour continuer. */
  continuer?: string;
  info?: Fiche;
  exemple?: 'seance' | 'bilan' | 'creer' | 'reviser' | 'credits' | 'rdv';
  /** La visite s'efface pendant la révision et reprend à sa sortie. */
  pause?: boolean;
  /** La cible est déjà dans l'état voulu : l'étape se saute seule. */
  dejaFait?: (el: HTMLElement) => boolean;
};

const ONGLET = '.tabbar button';
/* CHANTIER 296 — les écrans qui portent la barre d'onglets (App.tsx). */
const ECRANS_A_ONGLETS = ['today', 'library', 'parler', 'account', 'progress'];

function visesOnglet(c: Etape['cible']): boolean {
  const l = c ? (Array.isArray(c) ? c : [c]) : [];
  return l.some((x) => x.sel === ONGLET);
}

const virgule = (p: string) => (p ? `, ${p}` : '');

const CIBLES_REVISER: Cible[] = [
  { sel: '.ly-go' },
  { sel: '.hz-go' },
  { sel: '.avant > button.btn:not(.ghost)' },
  { sel: '.workrow-main', tous: true, sansAvancer: true, consigne: 'Touche un paquet pour le choisir. Le bouton pour réviser apparaîtra.', consigneVous: 'Touchez un paquet pour le choisir. Le bouton pour réviser apparaîtra.' },
];

/*
 * CHANTIER 325 — la toute première question : élève ou adulte. Elle fixe le
 * ton de la visite (tu ou vous) et le chemin : l'élève choisit sa classe,
 * l'adulte passe son test de niveau (la visite s'efface le temps du test).
 */
const T = (tu: string, vous: string) => (_p: string, a: boolean) => (a ? vous : tu);

/** Une étape propre à l'autre profil se saute. */
function saute(et: Etape, a: boolean): boolean {
  return (!!et.seulAdulte && !a) || (!!et.seulEleve && a);
}

export const ETAPES: Etape[] = [
  { id: 'profil', n: 1, profil: true, texte: 'Bienvenue dans Neuro Anglais ! Pour commencer, qui apprend ?' },
  { id: 'prenom', n: 1, saisie: true, continuer: 'Continuer', texte: T('Comment t’appelles-tu ?', 'Comment vous appelez-vous ?') },
  {
    id: 'reglages', n: 1, cible: { sel: ONGLET, texte: 'Réglages' },
    texte: (p, a) => (a
      ? `Enchanté${virgule(p)} ! On commence par faire connaissance : touchez « Réglages ».`
      : `Enchanté${virgule(p)} ! On commence par faire connaissance : touche « Réglages ».`),
  },
  { id: 'ma-classe', n: 1, cible: { sel: '.reglig', texte: 'Mon profil' }, texte: T('Touche « Mon profil ».', 'Touchez « Mon profil ».') },
  { id: 'classe', n: 2, seulEleve: true, cible: { sel: '.classrow', tous: true }, texte: 'Choisis ta classe : un paquet de ton niveau sera mis en jeu.', info: 'paquets' },
  { id: 'niveau', n: 2, seulAdulte: true, attente: true, texte: '' },
  { id: 'aujourdhui', n: 3, cible: { sel: ONGLET, texte: 'Aujourd’hui' }, texte: T('Ton premier paquet t’attend. Va dans « Aujourd’hui ».', 'Votre premier paquet vous attend. Allez dans « Aujourd’hui ».') },
  /*
   * 293 bis — le bouton de révision change de forme et de libellé selon
   * l'apparence (« Réviser 12 cartes », « C’est parti · 12 cartes »,
   * l'horloger…). On le cherche par sa classe. Sur l'écran ordinaire, tant
   * qu'aucun paquet n'est choisi, il n'existe pas : on entoure d'abord la
   * liste des paquets.
   * 297 — le clic est retenu : la bulle « Comment réviser » passe avant.
   */
  {
    id: 'reviser', n: 3, info: 'methode', ecran: 'today', retient: true,
    texte: T('Le paquet de ta classe. Touche « Réviser » pour essayer tes premiers mots.', 'Le paquet de votre niveau. Touchez « Réviser » pour essayer vos premiers mots.'),
    cible: CIBLES_REVISER,
  },
  {
    id: 'comment', n: 4, ecran: 'today', lance: true, exemple: 'reviser', continuer: 'Je commence',
    texte: (p, a) => (a
      ? `À vous${virgule(p)} ! Répondez honnêtement : c’est votre note qui décide quand le mot reviendra.`
      : `À toi${virgule(p)} ! Réponds honnêtement : c’est ta note qui décide quand le mot reviendra.`),
  },
  { id: 'etude', n: 4, pause: true, texte: '' },
  { id: 'echeances', n: 5, exemple: 'rdv', continuer: 'Continuer', texte: T('Chaque mot revient au bon moment, selon ta réponse : plus il a été difficile, plus il revient tôt.', 'Chaque mot revient au bon moment, selon votre réponse : plus il a été difficile, plus il revient tôt.'), info: 'frise' },
  { id: 'methode', n: 6, continuer: 'Continuer', texte: 'C’est tout : quelques minutes par jour, l’application tient le calendrier.', info: 'progres' },
  { id: 'parler', n: 7, cible: { sel: ONGLET, texte: 'Parler' }, texte: T('Maintenant, l’oral. Touche « Parler ».', 'Maintenant, l’oral. Touchez « Parler ».') },
  {
    id: 'sujet', n: 7, ecran: 'parler', cible: { sel: '.parler-themes button', texte: 'Me présenter' }, texte: T('Choisis un sujet : « Me présenter ».', 'Choisissez un sujet : « Me présenter ».'), info: 'minutes',
    dejaFait: (el) => el.getAttribute('aria-pressed') === 'true',
  },
  { id: 'commencer', n: 7, ecran: 'parler', cible: { sel: '.parler-go' }, intercepte: true, texte: T('Touche « Commencer à parler » : cette fois, regarde l’exemple. Tu peux parler à l’oral ou à l’écrit, comme tu préfères.', 'Touchez « Commencer à parler » : cette fois, regardez l’exemple. Vous pouvez parler à l’oral ou à l’écrit, comme vous préférez.'), info: 'minutes' },
  { id: 'seance', n: 7, exemple: 'seance', continuer: 'Voir le bilan', texte: T('L’IA glisse tes mots dans la conversation. Si tu fais une faute, une voix en français te corrige.', 'L’IA glisse vos mots dans la conversation. Si vous faites une faute, une voix en français vous corrige.'), info: 'minutes' },
  { id: 'bilan', n: 8, exemple: 'bilan', continuer: 'Continuer', texte: T('Le bilan : tes fautes corrigées, et les mots que tu choisis d’ajouter à tes paquets.', 'Le bilan : vos fautes corrigées, et les mots que vous choisissez d’ajouter à vos paquets.'), info: 'oral' },
  { id: 'paquets', n: 9, cible: { sel: ONGLET, texte: 'Paquets' }, texte: T('Passons aux paquets. Touche « Paquets ».', 'Passons aux paquets. Touchez « Paquets ».') },
  { id: 'catalogue', n: 9, ecran: 'library', cible: { sel: '.screen button', texte: 'catalogue', max: 24 }, texte: T('Ouvre le catalogue.', 'Ouvrez le catalogue.'), info: 'gratuit' },
  { id: 'defile', n: 9, ecran: 'library', continuer: 'Continuer', texte: T('Fais défiler pour tout voir : chaque classe a ses paquets, rangés par sujet.', 'Faites défiler pour tout voir : chaque niveau a ses paquets, rangés par thème.'), info: 'gratuit' },
  { id: 'collection', n: 10, ecran: 'library', cible: { sel: '.screen button', texte: 'collection', max: 24 }, texte: T('Retourne dans « Ma collection ».', 'Retournez dans « Ma collection ».') },
  { id: 'creer', n: 10, ecran: 'library', cible: { sel: '.screen button', texte: 'Créer mon paquet' }, intercepte: true, texte: T('Un contrôle approche ? Touche « Créer mon paquet de révision ».', 'Un examen, un entretien ou un voyage approche ? Touchez « Créer mon paquet de révision ».'), info: 'abonnes' },
  { id: 'creer-ex', n: 11, exemple: 'creer', continuer: 'Continuer', texte: T('Ton paquet se prépare en trois étapes. L’application cale ensuite tes passages jusqu’au jour J.', 'Votre paquet se prépare en trois étapes. L’application cale ensuite vos passages jusqu’au jour J.'), info: 'photos' },
  { id: 'reglages-2', n: 12, cible: { sel: ONGLET, texte: 'Réglages' }, texte: T('Dernière chose : ne perds rien de tes progrès. Touche « Réglages ».', 'Dernière chose : ne perdez rien de vos progrès. Touchez « Réglages ».') },
  { id: 'connexion', n: 12, ecran: 'account', cible: { sel: '.reglig', texte: 'Connexion' }, texte: T('Touche « Connexion ».', 'Touchez « Connexion ».') },
  { id: 'google', n: 12, ecran: 'account', continuer: 'Continuer', texte: T('Un compte Google suffit : tout est sauvegardé et te suit sur tes appareils. Tu pourras te connecter quand tu veux.', 'Un compte Google suffit : tout est sauvegardé et vous suit sur vos appareils. Vous pourrez vous connecter quand vous voulez.') },
  {
    id: 'credits', n: 13, cadeau: true, exemple: 'credits', continuer: 'Merci !',
    texte: (p, a) => (a
      ? `Visite terminée${virgule(p)} ! Nous vous offrons ${CADEAU} crédits pour débloquer l’apparence de votre choix.`
      : `Tuto terminé${virgule(p)} ! Nous t’offrons ${CADEAU} crédits pour débloquer l’apparence de ton choix.`),
  },
  { id: 'retour', n: 14, cible: { sel: ONGLET, texte: 'Réglages' }, fermeTiroir: true, texte: T('Pour les dépenser, touche « Réglages ».', 'Pour les dépenser, touchez « Réglages ».') },
  { id: 'apparence', n: 14, ecran: 'account', cible: { sel: '.reglig', texte: 'Apparence' }, texte: T(`Tes ${CADEAU} crédits t’attendent : touche « Apparence ».`, `Vos ${CADEAU} crédits vous attendent : touchez « Apparence ».`), info: 'apparences' },
  {
    id: 'fin', n: 14, ecran: 'account', continuer: 'Terminer', info: 'apparences',
    texte: (p, a) => (a
      ? `Bravo${virgule(p)}, vous connaissez l’application ! Choisissez une apparence maintenant, ou plus tard : vos crédits restent là, et ceux gagnés en révisant s’y ajoutent.`
      : `Bravo${virgule(p)}, tu connais l’application ! Choisis une apparence maintenant, ou plus tard : tes crédits restent là, et ceux gagnés en révisant s’y ajoutent.`),
  },
];
const TOTAL = ETAPES[ETAPES.length - 1].n;

/*
 * 297 — une étape où « Retour » peut se poser : elle se refait depuis
 * l'écran affiché. Sinon (sous-écran à rouvrir, révision, étape qui se
 * saute seule), on recule encore.
 */
function seRefait(et: Etape, vue: string): boolean {
  if (et.pause || et.attente || et.dejaFait) return false;
  if (et.ecran) return et.ecran === vue;
  return !et.cible || visesOnglet(et.cible);
}

const TITRES: Record<Fiche, string> = {
  paquets: 'Ce qu’est un paquet', methode: 'La méthode spirale', frise: 'Les rendez-vous d’un mot',
  progres: 'Mes progrès', minutes: 'Le temps de parole', oral: 'Mes progrès à l’oral',
  gratuit: 'Ce qui est inclus', abonnes: 'Paquets personnalisés', photos: 'Ajouter des mots', apparences: 'Les apparences',
};

const norm = (s: string) => s.replace(/[’']/g, "'").replace(/\s+/g, ' ').trim().toLowerCase();

function trouve(c: Cible): HTMLElement[] {
  const t = c.texte ? norm(c.texte) : null;
  return Array.from(document.querySelectorAll<HTMLElement>(c.sel)).filter((el) => {
    if (el.closest('.visite')) return false;
    const r = el.getBoundingClientRect();
    if (r.width < 2 || r.height < 2) return false;
    if (!t) return true;
    const x = norm(el.textContent ?? '');
    if (c.max && x.length > c.max) return false;
    return c.debut ? x.startsWith(t) : x.includes(t);
  });
}

type Boite = { top: number; left: number; width: number; height: number };

function boite(els: HTMLElement[]): Boite {
  const rs = els.map((e) => e.getBoundingClientRect());
  const top = Math.min(...rs.map((r) => r.top));
  const left = Math.min(...rs.map((r) => r.left));
  const bottom = Math.max(...rs.map((r) => r.bottom));
  const right = Math.max(...rs.map((r) => r.right));
  return { top, left, width: right - left, height: bottom - top };
}

const pareil = (a: Boite, b: Boite) =>
  Math.abs(a.top - b.top) < 0.5 && Math.abs(a.left - b.left) < 0.5
  && Math.abs(a.width - b.width) < 0.5 && Math.abs(a.height - b.height) < 0.5;

function classeDe(texte: string): Classe | null {
  const t = norm(texte);
  return CLASSES.find((c) => norm(CLASSE_LABELS[c]) === t) ?? null;
}

/** 325 ter — une carte de la première révision, et son prochain rendez-vous. */
export type RendezVous = { id: string; en: string; fr: string; note: Grade; due: number };

export function Visite({
  etape, vue, relue, rdv = [], onEtape, onFin, onClasse, onAccueil,
}: {
  /** 325 ter — les cartes de la première révision (vide : la frise n'est pas montrée). */
  rdv?: RendezVous[];
  etape: number;
  /** Le nom de l'écran affiché (App.tsx) : sert à suivre la révision. */
  vue: string;
  /** Relancée par l'administrateur : rien n'est mesuré. */
  relue: boolean;
  onEtape: (n: number) => void;
  onFin: () => void;
  /** La classe touchée à l'étape 2 : App.tsx met un paquet en jeu. */
  onClasse: (c: Classe | null) => void;
  /** CHANTIER 296 — revenir sur « Aujourd'hui », où la barre d'onglets est affichée. */
  onAccueil: () => void;
}) {
  const e = ETAPES[Math.min(etape, ETAPES.length - 1)];
  const [cadre, setCadre] = useState<Boite | null>(null);
  const [perdu, setPerdu] = useState(false);
  const [info, setInfo] = useState(false);
  const [toast, setToast] = useState(false);
  const [prenom, setPrenom] = useState(() => localStorage.getItem(PRENOM) ?? '');
  /* 325 — le profil choisi à la première étape : il règle le ton. */
  const [adulte, setAdulte] = useState(() => profilLocal() === 'adulte');
  const elements = useRef<HTMLElement[]>([]);
  const [trouvee, setTrouvee] = useState<Cible | null>(null);
  const trouveeRef = useRef<Cible | null>(null);
  trouveeRef.current = trouvee;
  /** 297 — le bouton « Réviser » touché, rejoué après la bulle « Comment réviser ». */
  const retenu = useRef<HTMLElement | null>(null);
  const debut = useRef(Date.now());
  const defile = useRef(false);
  const vuEtude = useRef(false);

  /* 295 — l'apparence Clair le temps de la visite. */
  useEffect(() => {
    appliquerApercu('clair');
    return () => finApercu();
  }, []);

  /* 325 — les étapes propres à l'autre profil sont sautées. */
  const allerApres = useCallback((a: boolean) => {
    setInfo(false);
    let j = etape + 1;
    while (j < ETAPES.length && saute(ETAPES[j], a)) j++;
    if (j >= ETAPES.length) onFin();
    else onEtape(j);
  }, [etape, onEtape, onFin]);
  const suivante = useCallback(() => allerApres(adulte), [allerApres, adulte]);

  /* 325 — élève ou adulte : le ton et le chemin de la visite en dépendent. */
  const choisirProfil = useCallback((p: Profil) => {
    poseProfil(p);
    const a = p === 'adulte';
    setAdulte(a);
    if (!relue) mesure('onboarding', `profil-${p}`);
    allerApres(a);
  }, [allerApres, relue]);

  /* 297 — « ‹ Retour ». */
  const precedente = useCallback(() => {
    let j = etape - 1;
    while (j > 0 && (!seRefait(ETAPES[j], vue) || saute(ETAPES[j], adulte))) j--;
    setInfo(false);
    onEtape(Math.max(0, j));
  }, [etape, vue, onEtape, adulte]);

  /* 297 — le prénom est gardé, puis on avance. */
  const validePrenom = useCallback(() => {
    const p = prenom.trim();
    if (!p) return;
    localStorage.setItem(PRENOM, p);
    setPrenom(p);
    suivante();
  }, [prenom, suivante]);

  /* 297 — on rejoue le « Réviser » retenu : la révision s'ouvre maintenant. */
  const lancer = useCallback(() => {
    let el = retenu.current;
    retenu.current = null;
    if (!el || !el.isConnected) {
      el = null;
      for (const c of CIBLES_REVISER) {
        if (c.sansAvancer) continue;
        const els = trouve(c);
        if (els.length) { el = els[0]; break; }
      }
    }
    suivante();
    if (el) { const b = el; window.setTimeout(() => b.click(), 0); }
  }, [suivante]);

  useEffect(() => {
    debut.current = Date.now();
    defile.current = false;
    vuEtude.current = false;
    elements.current = [];
    setCadre(null);
    setTrouvee(null);
    setPerdu(false);
    setInfo(false);
    if (!relue) mesure('onboarding', e.id);
    /* 298 — une seule fois (même id), et pas pendant une relecture. */
    if (e.cadeau && !relue) offrirCredits();
  }, [e, relue]);

  /*
   * CHANTIER 296 — l'étape attend un onglet, mais l'écran affiché n'a pas
   * de barre d'onglets (« Session terminée », un paquet ouvert…) : on
   * revient sur « Aujourd'hui », et l'onglet attendu est entouré.
   */
  useEffect(() => {
    if (e.pause || !visesOnglet(e.cible)) return;
    if (!ECRANS_A_ONGLETS.includes(vue)) {
      debut.current = Date.now();
      onAccueil();
    }
  }, [e, vue, onAccueil]);

  /* La cible, relue toutes les 120 ms : elle bouge avec l'écran. */
  useEffect(() => {
    const liste = e.cible ? (Array.isArray(e.cible) ? e.cible : [e.cible]) : [];
    if (!liste.length || e.pause) return undefined;
    let minuteur = 0;
    let vivant = true;
    const tour = () => {
      if (!vivant) return;
      let c: Cible = liste[0];
      let els: HTMLElement[] = [];
      for (const x of liste) {
        els = trouve(x);
        if (els.length) { c = x; break; }
      }
      if (!els.length) {
        elements.current = [];
        setCadre(null);
        setTrouvee(null);
        if (Date.now() - debut.current > 1500) setPerdu(true);
      } else {
        if (e.dejaFait?.(els[0])) { suivante(); return; }
        const choisis = c.tous ? els : [els[0]];
        elements.current = choisis;
        setTrouvee((p) => (p === c ? p : c));
        const b = boite(choisis);
        setPerdu(false);
        setCadre((p) => (p && pareil(p, b) ? p : b));
        if (!defile.current) {
          defile.current = true;
          const h = window.innerHeight;
          if (!c.tous && (b.top < 70 || b.top + b.height > h - 110)) {
            window.scrollBy({ top: b.top + b.height / 2 - h / 2, behavior: 'smooth' });
          }
        }
      }
      minuteur = window.setTimeout(tour, 120);
    };
    tour();
    return () => { vivant = false; clearTimeout(minuteur); };
  }, [e, suivante]);

  /* Le vrai bouton a été touché : il fait son travail, puis on avance. */
  useEffect(() => {
    if (!e.cible || e.intercepte || e.pause) return undefined;
    const surClic = (ev: MouseEvent) => {
      const el = elements.current.find((x) => x.contains(ev.target as Node));
      if (!el) return;
      if (e.id === 'classe') onClasse(classeDe(el.textContent ?? ''));
      if (trouveeRef.current?.sansAvancer) return;
      /* 297 — capté avant React : l'application ne le reçoit pas encore. */
      if (e.retient) {
        ev.preventDefault();
        ev.stopPropagation();
        ev.stopImmediatePropagation();
        retenu.current = el;
      }
      /* 298 — l'onglet « Réglages » ne ferme pas le tiroir ouvert : on le ferme ici. */
      if (e.fermeTiroir) {
        window.setTimeout(() => document.querySelector<HTMLElement>('.sousecran-retour')?.click(), 0);
      }
      window.setTimeout(suivante, 0);
    };
    document.addEventListener('click', surClic, true);
    return () => document.removeEventListener('click', surClic, true);
  }, [e, suivante, onClasse]);

  /* La révision : on s'efface, et on reprend quand elle se termine. 6 s d'attente :
     certaines apparences jouent jusqu'à 4,25 s d'animation avant d'ouvrir la révision. */
  useEffect(() => {
    if (!e.pause) return undefined;
    if (vue === 'study') { vuEtude.current = true; return undefined; }
    if (vuEtude.current) { suivante(); return undefined; }
    const t = window.setTimeout(() => { if (!vuEtude.current) suivante(); }, 6000);
    return () => clearTimeout(t);
  }, [e, vue, suivante]);

  /* 325 — l'adulte valide son niveau dans Réglages › Mon profil (ou choisit finalement une classe). */
  useEffect(() => {
    if (!e.attente) return undefined;
    const fait = (ev: Event) => {
      onClasse((ev as CustomEvent<{ classe: Classe | null }>).detail?.classe ?? null);
      const a = profilLocal() === 'adulte';
      setAdulte(a);
      allerApres(a);
    };
    window.addEventListener(EVT_PROFIL, fait);
    return () => window.removeEventListener(EVT_PROFIL, fait);
  }, [e, allerApres, onClasse]);

  const verrou = () => {
    setToast(true);
    window.setTimeout(() => setToast(false), 1600);
  };

  if (e.pause) return null;

  /* 325 — pendant le test de niveau, la visite s'efface : seul « Passer » reste, en haut. */
  if (e.attente) {
    return createPortal(
      <div className="visite">
        <button className="visite-passer visite-attente" onClick={suivante}>Passer cette étape</button>
      </div>,
      document.body,
    );
  }

  const M = 6;
  const trou = cadre && !perdu
    ? { top: cadre.top - M, left: cadre.left - M, width: cadre.width + 2 * M, height: cadre.height + 2 * M }
    : null;
  const H = window.innerHeight;
  const voiles: CSSProperties[] = trou
    ? [
      { top: 0, left: 0, right: 0, height: Math.max(0, trou.top) },
      { top: trou.top + trou.height, left: 0, right: 0, bottom: 0 },
      { top: trou.top, left: 0, width: Math.max(0, trou.left), height: trou.height },
      { top: trou.top, left: trou.left + trou.width, right: 0, height: trou.height },
    ]
    : [{ top: 0, left: 0, right: 0, bottom: 0 }];

  let placeBulle: CSSProperties = { top: '50%', transform: 'translateY(-50%)' };
  if (trou) {
    const dessus = trou.top;
    const dessous = H - trou.top - trou.height;
    if (Math.max(dessus, dessous) < 170) placeBulle = { top: 12 };
    else if (dessous >= dessus) placeBulle = { top: trou.top + trou.height + 14 };
    else placeBulle = { bottom: H - trou.top + 14 };
  }

  const continuer = e.continuer ?? (perdu ? 'Continuer' : null);
  const avance = e.saisie ? validePrenom : e.lance ? lancer : suivante;
  const p = prenom.trim();
  const consigne = adulte ? trouvee?.consigneVous ?? trouvee?.consigne : trouvee?.consigne;
  const texte = consigne ?? (typeof e.texte === 'function' ? e.texte(p, adulte) : e.texte);

  return createPortal(
    <div className="visite" role="dialog" aria-live="polite" aria-label="Première connexion guidée">
      {voiles.map((s, i) => (
        <div key={i} className="visite-voile" style={s} onClick={verrou} />
      ))}
      {e.cadeau && <Confettis />}
      {trou && (
        <>
          <div className="visite-anneau" style={trou} aria-hidden="true" />
          {e.intercepte && (
            <button className="visite-capte" style={trou} aria-label="Toucher le bouton entouré" onClick={suivante} />
          )}
        </>
      )}

      <div className="visite-bulle" style={placeBulle}>
        <div className="visite-tete">
          {etape > 0 && (
            <button className="visite-retour" onClick={precedente} aria-label="Étape précédente">‹ Retour</button>
          )}
          <span className="visite-kicker">
            {relue ? 'Relecture · ' : ''}Étape {e.n} sur {TOTAL}
          </span>
          {e.id !== 'fin' && (
            /* 297 — « Passer » le prénom ne l'enregistre pas ; « Passer » la consigne ouvre quand même la révision. */
            <button className="visite-passer" onClick={e.lance ? lancer : suivante}>Passer</button>
          )}
        </div>

        {e.exemple === 'seance' && <ExempleSeance prenom={p || 'Léa'} a={adulte} />}
        {e.exemple === 'bilan' && <ExempleBilan a={adulte} />}
        {e.exemple === 'creer' && <ExempleCreer a={adulte} />}
        {e.exemple === 'reviser' && <ExempleReviser a={adulte} />}
        {e.exemple === 'rdv' && rdv.length > 0 && <FriseRdv rdv={rdv} a={adulte} />}
        {e.exemple === 'credits' && (
          <div className="visite-cadeau" aria-hidden="true"><b>{CADEAU}</b><small>crédits</small></div>
        )}

        <p className="visite-texte">{texte}</p>
        {e.profil && (
          <div className="visite-profils" role="group" aria-label="Qui apprend ?">
            <button className="visite-profil" onClick={() => choisirProfil('eleve')}>
              Je suis élève<small>de la 6e à la Terminale</small>
            </button>
            <button className="visite-profil" onClick={() => choisirProfil('adulte')}>
              Je suis adulte<small>pour me remettre à l’anglais</small>
            </button>
          </div>
        )}
        {e.saisie && (
          <input
            className="visite-champ"
            type="text"
            autoFocus
            autoComplete="given-name"
            autoCapitalize="words"
            maxLength={30}
            placeholder={adulte ? 'Votre prénom' : 'Ton prénom'}
            aria-label={adulte ? 'Votre prénom' : 'Ton prénom'}
            value={prenom}
            onChange={(ev) => setPrenom(ev.target.value)}
            onKeyDown={(ev) => { if (ev.key === 'Enter') validePrenom(); }}
          />
        )}
        {perdu && !e.continuer && (
          <p className="visite-note">{adulte ? 'Ce bouton n’est pas affiché pour vous ici : continuez.' : 'Ce bouton n’est pas affiché pour toi ici : continue.'}</p>
        )}

        {(e.info || continuer) && (
          <div className="visite-actions">
            {e.info && (
              <button className="visite-i" aria-label="Plus d’informations" onClick={() => setInfo(true)}>i</button>
            )}
            {continuer && (
              <button className="visite-go" onClick={avance} disabled={e.saisie && !p}>{continuer}</button>
            )}
          </div>
        )}
      </div>

      {toast && <div className="visite-toast">{adulte ? 'Touchez le bouton entouré d’or.' : 'Touche le bouton entouré d’or.'}</div>}

      {info && e.info && (
        <>
          <div className="visite-fond" onClick={() => setInfo(false)} />
          <div className="visite-fiche" role="dialog" aria-label={TITRES[e.info]}>
            <i className="visite-poignee" aria-hidden="true" />
            <div className="visite-fiche-titre">
              <span aria-hidden="true">i</span>
              <h3>{TITRES[e.info]}</h3>
            </div>
            <ContenuFiche f={e.info} a={adulte} />
            <button className="visite-go large" onClick={() => setInfo(false)}>Compris</button>
          </div>
        </>
      )}
    </div>,
    document.body,
  );
}

/* CHANTIER 325 bis — les 1000 crédits : une pluie de confettis, une seule fois (2,6 s).
   Rien ne bouge si le téléphone demande moins d'animations (visite.css). */
const COULEURS_CONFETTIS = ['#f2b705', '#e4572e', '#29a36a', '#2f6fde', '#c04ab5', '#ffffff'];
function Confettis() {
  const bouts = useMemo(() => Array.from({ length: 70 }, (_, k) => ({
    left: `${Math.random() * 100}%`,
    background: COULEURS_CONFETTIS[k % COULEURS_CONFETTIS.length],
    width: `${6 + Math.random() * 6}px`,
    height: `${8 + Math.random() * 8}px`,
    animationDelay: `${Math.random() * 0.6}s`,
    animationDuration: `${1.8 + Math.random() * 1.2}s`,
    ['--vc-x' as string]: `${(Math.random() - 0.5) * 160}px`,
    ['--vc-r' as string]: `${(Math.random() - 0.5) * 1440}deg`,
    borderRadius: k % 3 === 0 ? '999px' : '2px',
  }) as CSSProperties), []);
  return (
    <div className="visite-confettis" aria-hidden="true">
      {bouts.map((st, k) => <i key={k} style={st} />)}
    </div>
  );
}

/*
 * CHANTIER 325 ter — LA FRISE DES RENDEZ-VOUS. Les cartes de la première
 * révision, chacune à la date où elle reviendra. Échelle logarithmique :
 * aujourd'hui, demain et trois jours restent lisibles à côté d'un mois.
 */
const JOUR = 86_400_000;
const HORIZON = 30;
const REPERES: Array<[number, string]> = [[0, 'auj.'], [1, '1 j'], [3, '3 j'], [7, '1 sem.'], [30, '1 mois']];
const NOM_NOTE: Record<string, string> = { again: 'À revoir', hard: 'Difficile', good: 'Correct', easy: 'Facile' };

function joursJusqua(due: number): number {
  const a = new Date(); a.setHours(0, 0, 0, 0);
  const b = new Date(due); b.setHours(0, 0, 0, 0);
  return Math.max(0, Math.round((b.getTime() - a.getTime()) / JOUR));
}
function quand(n: number): string {
  if (n === 0) return 'aujourd’hui';
  if (n === 1) return 'demain';
  if (n < 14) return `dans ${n} jours`;
  if (n < 60) return `dans ${Math.round(n / 7)} semaines`;
  return `dans ${Math.round(n / 30)} mois`;
}
const place = (n: number) => Math.min(1, Math.log1p(n) / Math.log1p(HORIZON)) * 100;

function FriseRdv({ rdv, a }: { rdv: RendezVous[]; a: boolean }) {
  const lignes = [...rdv].sort((x, y) => x.due - y.due).map((r) => ({ ...r, j: joursJusqua(r.due) }));
  return (
    <div className="visite-exemple visite-rdv">
      <span className="visite-petit">{a ? 'Vos' : 'Tes'} {lignes.length} mots · prochain rendez-vous</span>
      {lignes.map((r) => {
        const x = place(r.j);
        return (
          <div key={r.id} className="visite-rdv-ligne">
            <div className="visite-rdv-mot">
              <b>{r.en}</b>
              <small className={r.note}>{NOM_NOTE[r.note] ?? ''}</small>
            </div>
            <div className="visite-rdv-piste" aria-label={`${r.en} : ${quand(r.j)}`}>
              <i className={`visite-rdv-point ${r.note}`} style={{ left: `${x}%` }} />
              <span className={`visite-rdv-quand${x > 62 ? ' gauche' : ''}`} style={{ left: `${x}%` }}>{quand(r.j)}</span>
            </div>
          </div>
        );
      })}
      <div className="visite-rdv-ligne visite-rdv-axe" aria-hidden="true">
        <div />
        <div className="visite-rdv-piste">
          {REPERES.map(([n, l]) => (
            <span key={l} style={{ left: `${place(n)}%` }}>{l}</span>
          ))}
        </div>
      </div>
    </div>
  );
}

/* 297 — comment travailler une carte, avant la première révision. */
const NOTES: Array<[string, string, string]> = [
  ['again', 'À revoir', 'je ne l’avais pas'],
  ['hard', 'Difficile', 'trouvé, mais avec peine'],
  ['good', 'Correct', 'trouvé après un temps'],
  ['easy', 'Facile', 'trouvé tout de suite'],
];

/* 325 — `a` : profil adulte, au vouvoiement, avec des exemples d'adulte. */
function ExempleReviser({ a }: { a: boolean }) {
  return (
    <div className="visite-exemple">
      <span className="visite-petit">Comment réviser</span>
      <ol className="visite-trois visite-sans-fond">
        <li><b>{a ? 'Lisez la carte' : 'Lis la carte'}</b> Un mot, une phrase ou une expression en français.</li>
        <li><b>{a ? 'Traduisez de tête' : 'Traduis dans ta tête'}</b> {a ? 'Cherchez l’anglais, sans rien écrire.' : 'Cherche l’anglais, sans rien écrire.'}</li>
        <li><b>{a ? 'Affichez la réponse' : 'Affiche la réponse'}</b> {a ? 'Puis dites si vous l’aviez :' : 'Puis dis si tu l’avais :'}</li>
      </ol>
      <ul className="visite-notes">
        {NOTES.map(([k, l, d]) => (
          <li key={k}><b className={k}>{l}</b>{d}</li>
        ))}
      </ul>
    </div>
  );
}

function ExempleSeance({ prenom, a }: { prenom: string; a: boolean }) {
  if (a) {
    return (
      <div className="visite-exemple">
        <span className="visite-petit">Exemple · Se présenter</span>
        <p className="visite-b lui">Hi! What’s your name, and what do you do?</p>
        <p className="visite-b moi">My name is {prenom}. I work in a bank since five years.</p>
        <p className="visite-b fr">Pour une durée qui continue, l’anglais dit « have worked » et « for » : I have worked in a bank for five years.</p>
        <p className="visite-b moi">I have worked in a bank for five years.</p>
        <p className="visite-b lui">Great! Do you get on well with your <u>colleagues</u>?</p>
      </div>
    );
  }
  return (
    <div className="visite-exemple">
      <span className="visite-petit">Exemple · Me présenter</span>
      <p className="visite-b lui">Hi! What’s your name, and how old are you?</p>
      <p className="visite-b moi">My name is {prenom}. I have fourteen years.</p>
      <p className="visite-b fr">En anglais, l’âge se dit avec « be » : I am fourteen.</p>
      <p className="visite-b moi">I am fourteen. I live near my school.</p>
      <p className="visite-b lui">Nice! Do you have a <u>neighbour</u> you like?</p>
    </div>
  );
}

function ExempleBilan({ a }: { a: boolean }) {
  if (a) {
    return (
      <div className="visite-exemple">
        <span className="visite-petit">Ce qui a coincé</span>
        <p className="visite-faux">I work in a bank since five years.</p>
        <p className="visite-juste">I have worked in a bank for five years.</p>
        <span className="visite-petit">Vous voulez les revoir ?</span>
        <ul className="visite-coches">
          <li className="on"><b>a colleague</b> un collègue</li>
          <li className="on"><b>for five years</b> depuis cinq ans</li>
          <li><b>to get on well</b> bien s’entendre</li>
        </ul>
      </div>
    );
  }
  return (
    <div className="visite-exemple">
      <span className="visite-petit">Ce qui a coincé</span>
      <p className="visite-faux">I have fourteen years.</p>
      <p className="visite-juste">I am fourteen.</p>
      <span className="visite-petit">Tu veux les revoir ?</span>
      <ul className="visite-coches">
        <li className="on"><b>a neighbour</b> un voisin</li>
        <li className="on"><b>to be … years old</b> avoir … ans</li>
        <li><b>near</b> près de</li>
      </ul>
    </div>
  );
}

function ExempleCreer({ a }: { a: boolean }) {
  if (a) {
    return (
      <ol className="visite-exemple visite-trois">
        <li><b>L’échéance</b> Un examen, un entretien ou un voyage, et sa date : par exemple dans 7 jours.</li>
        <li><b>Le paquet</b> Un nom (« entretien ») et une couleur.</li>
        <li><b>Les mots</b> Tapés à la main, ou une liste prise en photo : l’IA fabrique les cartes.</li>
      </ol>
    );
  }
  return (
    <ol className="visite-exemple visite-trois">
      <li><b>Le contrôle</b> Oui, un contrôle — et sa date, par exemple dans 7 jours.</li>
      <li><b>Le paquet</b> Un nom (« animaux ») et une couleur.</li>
      <li><b>Les mots</b> Tapés à la main, ou la liste du prof prise en photo : l’IA fabrique les cartes.</li>
    </ol>
  );
}

function boucle(a: boolean): Array<[string, string]> {
  const fait = a ? 'Vous faites' : 'Tu fais';
  const gagne = a ? 'Vous gagnez' : 'Tu gagnes';
  const ton = a ? 'votre' : 'ton';
  const tes = a ? 'vos' : 'tes';
  return [
    [fait, 'Travail de révision sur des paquets de cartes, par niveau et par thème'],
    [gagne, `Enrichissement de ${ton} vocabulaire`],
    [fait, 'Dialogue avec l’IA, et correction'],
    [gagne, 'Amélioration de la compréhension orale et de la fluence'],
    [fait, `Mise à jour de ${tes} paquets pour renforcer ${tes} acquis`],
    [gagne, `Le niveau suivant, qui se cale sur ${tes} progrès`],
  ];
}

function Lignes({ l }: { l: Array<[string, string]> }) {
  return (
    <div className="visite-lignes">
      {l.map(([x, y]) => <p key={x + y}><b>{x}</b>{y}</p>)}
    </div>
  );
}

function ContenuFiche({ f, a }: { f: Fiche; a: boolean }) {
  switch (f) {
    case 'paquets':
      return (
        <>
          {a
            ? <p><b>Des paquets par niveau</b>, rangés par thème : travail, santé, logement, voyage…</p>
            : <p><b>10 paquets par classe</b> : 5 pour le début d’année, 5 pour la fin. Chacun couvre un sujet du programme, rangé en thèmes.</p>}
          <div className="visite-encart">
            <span className="visite-petit">Une carte, c’est</span>
            <p><b>un mot</b> · la maison → <em>the house</em></p>
            <p><b>ou une phrase</b> · Je suis allé à la plage. → <em>I went to the beach.</em></p>
          </div>
          <p>{a
            ? 'Vous lisez le français, vous cherchez l’anglais de tête, puis vous retournez la carte : exemple et voix compris.'
            : 'Tu lis le français, tu cherches l’anglais dans ta tête, puis tu retournes la carte : exemple et voix compris.'}</p>
        </>
      );
    case 'methode':
      return (
        <>
          <p><em>Une boucle d’apprentissage qui crante à chaque tour.</em></p>
          <ol className="visite-boucle">
            {boucle(a).map(([k, t], i) => (
              <li key={i}><small>{k}</small>{t}</li>
            ))}
          </ol>
          <p className="visite-or">↻ Et la boucle recommence, un cran plus haut.</p>
        </>
      );
    case 'frise':
      return (
        <>
          <p>Un mot revu juste avant l’oubli se mémorise plus profondément qu’un mot relu dix fois.</p>
          <div className="visite-encart">
            <span className="visite-petit">Les rappels d’un même mot</span>
            <svg viewBox="0 0 300 50" className="visite-frise" aria-hidden="true">
              <line x1="8" y1="30" x2="292" y2="30" stroke="#16233f" strokeOpacity=".25" />
              <circle cx="8" cy="30" r="5" fill="#16233f" />
              <text x="8" y="48" fontSize="10" fill="#3d4f73">auj.</text>
              {([[21.5, '1 j'], [48.6, '3 j'], [116.2, '8 j'], [292, '21 j']] as Array<[number, string]>).map(([x, l]) => (
                <g key={l}>
                  <circle cx={x} cy="30" r="5" fill="#f2b705" />
                  <text x={x} y="16" textAnchor={x === 292 ? 'end' : 'middle'} fontSize="10" fill="#16233f">{l}</text>
                </g>
              ))}
            </svg>
          </div>
          <p>L’écart s’allonge à chaque réussite et se referme au moindre oubli. L’application le calcule carte par carte (algorithme FSRS). {a ? 'Vous, répondez honnêtement.' : 'Toi, tu réponds honnêtement.'}</p>
        </>
      );
    case 'progres':
      return (
        <>
          <p>Dans « Mes progrès », chaque mot passe d’un tas à l’autre. Exemple fictif, après huit semaines :</p>
          <Lignes l={[['À reprendre', '7 mots'], ['En cours', '38 mots'], ['Presque acquis', '29 mots'], ['Acquis', '118 mots']]} />
        </>
      );
    case 'minutes':
      return (
        <>
          <Lignes l={[['10 min', 'offertes une fois, pour essayer.'], ['10 min', 'par jour, avec l’abonnement.']]} />
          <p>{a
            ? 'Votre niveau fixe les temps employés et la longueur des phrases. Les mots de vos paquets reviennent dans la conversation.'
            : 'Ta classe fixe les temps employés et la longueur des phrases. Les mots de tes paquets reviennent dans la conversation. La conversation s’ouvre à partir de la 4e.'}</p>
        </>
      );
    case 'oral':
      return (
        <>
          <p><em>Exemple fictif, après 6 semaines.</em></p>
          <Lignes l={[['46 min', 'parlées'], ['212', 'phrases dites'], ['63', `mots de ${a ? 'vos' : 'tes'} paquets réemployés`], ['18', 'fautes passées en cartes']]} />
        </>
      );
    case 'gratuit':
      return <Lignes l={[['Gratuit', '1 paquet offert par niveau.'], ['Abonnement', 'l’intégralité du catalogue, tous niveaux.']]} />;
    case 'abonnes':
      return a
        ? <p>Votre <b>premier paquet personnalisé</b> est offert, photo comprise. Avec l’abonnement, autant que vous voulez : vos listes, la date de l’échéance, les passages calculés jusqu’au jour J, et la liste de vos mots fragiles à relire le matin même.</p>
        : <p>Ton <b>premier paquet personnalisé</b> est offert, photo comprise. Avec l’abonnement, autant que tu veux : tes listes, la date du contrôle, les passages calculés jusqu’au jour J, et la liste de tes mots fragiles à relire le matin même.</p>;
    case 'photos':
      /* 344 — sans abonnement, un seul paquet personnalisé (photo ou main) : rien d'illimité. */
      return <Lignes l={[
        ['Gratuit', '1 paquet personnalisé offert, à la main ou avec 1 photo.'],
        ['Abonnement', a ? 'autant de paquets que vous voulez, dont 3 photos par semaine.' : 'autant de paquets que tu veux, dont 3 photos par semaine.'],
      ]} />;
    case 'apparences':
      return <Lignes l={[['Pour tous', '3 apparences, jusqu’à 12 avec tes crédits.'], ['Abonnés', 'les 12 offertes, 30 de plus, et celles du mois.']]} />;
  }
}
