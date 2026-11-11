/* MoodlePro community (stage 1): how long tasks take, shared quizzes and tasks, a WhatsApp group per course, points with a log, and leaderboards.
   Loaded by index.html only when the community is on (or to show the invitation), so someone who keeps it off downloads none of it.
   Trust-based: the app makes a random id + secret (synced between the user's devices through Moodle, like the other settings);
   the Moodle token never leaves the device. The server is the same Cloudflare worker as the notifications (/social/…). */
(() => {
"use strict";
const SOC_V = "1.6.0-beta.1";
const MIN_N = 3;                                                   // reports needed before an average is shown
const HOURS = [[0.5, "⚡", "h1"], [2, "⏱️", "h2"], [4.5, "📚", "h3"], [8, "🔥", "h4"], [12, "💀", "h5"]];
const RANKS = [[0, "🌱", "rk0"], [20, "📝", "rk1"], [60, "🧠", "rk2"], [150, "⚡", "rk3"], [300, "👑", "rk4"], [600, "🏆", "rk5"]];
const DEGS = { b: ["opt", "ee", "se", "ie", "cs", "bio", "nur", "nur2", "acc", "ba"], m: ["m_cs", "m_phy", "m_nur"] };
const YEARS = ["1", "2", "3", "4"];

Object.assign(I18N.he, {
  socIntroT: "חדש: קהילת MoodlePro 🎉", socIntroP: "סטודנטים עוזרים לסטודנטים. הכל אופציונלי, ואפשר לכבות בכל רגע בהגדרות.",
  socB1: "⏳ כמה זמן לוקחת כל מטלה – לפי מה שסטודנטים אחרים דיווחו", socB2: "📢 בחנים ומשימות שמישהו מהקורס הוסיף – בלחיצה אחת אצלך",
  socB3: "💬 הקבוצת וואטסאפ של כל קורס במקום אחד", socB4: "🏆 נקודות, דרגות וטבלאות דירוג – כללית ולכל קורס",
  socYourDeg: "מה התואר שלך?", socYourYr: "שנה", socPickDeg: "בחר תואר", socPickYr: "שנה", socOtherDeg: "איזה תואר?",
  socPriv: "השם שלך מ-Moodle יופיע ליד מה שתשתף ובטבלאות. הטוקן של Moodle נשאר רק במכשיר.",
  socJoin: "יאללה, להצטרף", socLater: "לא עכשיו", socWelcome: "ברוך הבא לקהילה! 🎉",
  socGrpB: "תואר ראשון", socGrpM: "תואר שני", socOther: "אחר…",
  dg_opt: "פיזיקה יישומית / הנדסת אלקטרו-אופטיקה", dg_ee: "הנדסת חשמל ואלקטרוניקה", dg_se: "הנדסת תוכנה", dg_ie: "הנדסת תעשייה וניהול", dg_cs: "מדעי המחשב",
  dg_bio: "ביואינפורמטיקה", dg_nur: "סיעוד", dg_nur2: "הסבת אקדמאים לסיעוד", dg_acc: "חשבונאות ומערכות מידע", dg_ba: "מנהל עסקים",
  dg_m_cs: "מדעי המחשב – בינה מלאכותית (תואר שני)", dg_m_phy: "פיזיקה יישומית / אלקטרו-אופטיקה (תואר שני)", dg_m_nur: "סיעוד (תואר שני)",
  yr1: "שנה א׳", yr2: "שנה ב׳", yr3: "שנה ג׳", yr4: "שנה ד׳",
  rk0: "שורד סמסטר", rk1: "צדיק של סיכומים", rk2: "פותר בעיות מוסמך", rk3: "מציל מועדי א׳", rk4: "אגדת קמפוס", rk5: "מתרגל של כבוד",
  socTimeT: "סחתיין על ההגשה! כמה זמן לקח לך בערך?", socTimeHint: "עוזר לאחרים לתכנן את הזמן. לחיצה אחת.", socSkip: "דלג",
  h1: "עד שעה", h2: "\u20661–3\u2069 שעות", h3: "\u20663–6\u2069 שעות", h4: "\u20666–10\u2069 שעות", h5: "יותר מ-10 שעות",
  socThanks: "תודה! \u2066+1\u2069 נקודה", socThanks0: "עודכן ✓", estBadge: (h, n) => "~" + h + " שע׳ · " + n + " דיווחים", estTitle: (h, n) => "זמן ממוצע לפי " + n + " סטודנטים: כ-" + h + " שעות",
  socShared: (who, what, c, d) => who + " הוסיף " + what + " ב" + c + " · " + d, socSharedTask: (who, what, c, d) => who + " שיתף משימה: " + what + " · " + c + " · " + d,
  socAdd: "＋ הוסף לשלי", socIgnore: "התעלם", socAdded: "נוסף ✓", socShareOn: "שותף עם הקורס ✓", socShareOff: "השיתוף הוסר",
  waOpen: "קבוצת הוואטסאפ של הקורס", waAdd: "＋ הוסף קישור לקבוצת הוואטסאפ", waEdit: "עריכה", waT: "קבוצת הוואטסאפ של הקורס", waHint: "הדבק את קישור ההזמנה לקבוצה (מתחיל ב-https://chat.whatsapp.com/). כל הסטודנטים בקורס יראו אותו.",
  waBad: "זה לא נראה כמו קישור הזמנה של וואטסאפ", waSaved: "הקישור נשמר ✓", waRemove: "הקישור לא עובד? הסר אותו", waRemoved: "הקישור הוסר", waBy: n => "נוסף על ידי " + n, waNone: "אין עדיין קישור",
  socPts: n => n + " נק׳", socPos: n => "מקום " + n, socToNext: (n, r) => "עוד " + n + " נק׳ ל" + r, socTop: "הדרגה הגבוהה ביותר 🏆",
  socBoards: "טבלאות דירוג", socMyPts: "הנקודות שלי", socBoardT: "🏆 טבלת הדירוג", socAll: "כללית", socSem: "הסמסטר", socEver: "כל הזמנים", socAnyDeg: "כל התארים",
  socYou: "את/ה", socEmpty: "עדיין אין כאן נקודות. הראשון שתורם – בראש הטבלה!", socYourPos: (p, n) => "המקום שלך: " + p + " · " + n + " נק׳", socNoPos: "עוד אין לך נקודות כאן",
  socLogT: "יומן הנקודות", socLogEmpty: "עוד אין נקודות", socByCourse: "נקודות לפי קורס",
  lgAdd: (f, r) => f + " הוסיף אצלו את ״" + r + "״", lgTime: r => "דיווח זמן על ״" + r + "״", lgWa: "קישור לקבוצת הוואטסאפ", lgSomeone: "מישהו",
  socMute: "השתק משתמש זה 🔇", socUnmute: "בטל השתקה", socMuted: n => n + " הושתק. לא תראה יותר את מה שהוא משתף.", socUnmuted: "ההשתקה בוטלה",
  socOnLbl: "הקהילה פעילה", socOnHint: "כשכבוי – אין שום חיבור לשרת הקהילה ושום דבר מזה לא מוצג.", socProfT: "הפרופיל שלי", socWaT: "קבוצות וואטסאפ לפי קורס",
  socMuteT: "משתמשים מושתקים", socMuteNone: "אין", socHowT: "איך צוברים נקודות", socHow: ["\u2066+3\u2069 – מישהו הוסיף לשלו בוחן או משימה ששיתפת", "\u2066+1\u2069 – דיווח כמה זמן לקחה לך מטלה", "\u2066+1\u2069 – הוספת קישור לקבוצת הוואטסאפ של קורס"],
  socNet: "אין חיבור לשרת הקהילה כרגע", socLoading: "טוען…", socRanksT: "הדרגות", socJoinBtn: "הצטרפות לקהילה",
});
Object.assign(I18N.en, {
  socIntroT: "New: the MoodlePro community 🎉", socIntroP: "Students helping students. All optional, and you can switch it off any time in settings.",
  socB1: "⏳ How long each task takes – from what other students reported", socB2: "📢 Quizzes and tasks someone in the course added – yours in one tap",
  socB3: "💬 Every course’s WhatsApp group in one place", socB4: "🏆 Points, ranks and leaderboards – overall and per course",
  socYourDeg: "What’s your degree?", socYourYr: "Year", socPickDeg: "Choose a degree", socPickYr: "Year", socOtherDeg: "Which degree?",
  socPriv: "Your Moodle name appears next to what you share and on the leaderboards. Your Moodle token stays on this device.",
  socJoin: "Join", socLater: "Not now", socWelcome: "Welcome to the community! 🎉",
  socGrpB: "Bachelor’s", socGrpM: "Master’s", socOther: "Other…",
  dg_opt: "Applied Physics / Electro-Optics Eng.", dg_ee: "Electrical & Electronics Eng.", dg_se: "Software Eng.", dg_ie: "Industrial Eng. & Management", dg_cs: "Computer Science",
  dg_bio: "Bioinformatics", dg_nur: "Nursing", dg_nur2: "Nursing for graduates", dg_acc: "Accounting & Information Systems", dg_ba: "Business Administration",
  dg_m_cs: "M.Sc. Computer Science (AI)", dg_m_phy: "M.Sc. Applied Physics / Electro-Optics", dg_m_nur: "M.S.N. Nursing",
  yr1: "1st year", yr2: "2nd year", yr3: "3rd year", yr4: "4th year",
  rk0: "Semester Survivor", rk1: "Summary Saint", rk2: "Certified Solver", rk3: "Exam Saver", rk4: "Campus Legend", rk5: "Honorary TA",
  socTimeT: "Nice, submitted! Roughly how long did it take?", socTimeHint: "Helps others plan their time. One tap.", socSkip: "Skip",
  h1: "Up to 1 hour", h2: "1–3 hours", h3: "3–6 hours", h4: "6–10 hours", h5: "10+ hours",
  socThanks: "Thanks! +1 point", socThanks0: "Updated ✓", estBadge: (h, n) => "~" + h + " h · " + n + " reports", estTitle: (h, n) => "Average from " + n + " students: about " + h + " hours",
  socShared: (who, what, c, d) => who + " added " + what + " in " + c + " · " + d, socSharedTask: (who, what, c, d) => who + " shared a task: " + what + " · " + c + " · " + d,
  socAdd: "＋ Add to mine", socIgnore: "Ignore", socAdded: "Added ✓", socShareOn: "Shared with the course ✓", socShareOff: "No longer shared",
  waOpen: "The course’s WhatsApp group", waAdd: "＋ Add the WhatsApp group link", waEdit: "Edit", waT: "The course’s WhatsApp group", waHint: "Paste the group’s invite link (starts with https://chat.whatsapp.com/). Everyone in the course will see it.",
  waBad: "That doesn’t look like a WhatsApp invite link", waSaved: "Link saved ✓", waRemove: "Link not working? Remove it", waRemoved: "Link removed", waBy: n => "Added by " + n, waNone: "No link yet",
  socPts: n => n + " pts", socPos: n => "#" + n, socToNext: (n, r) => n + " pts to " + r, socTop: "Top rank 🏆",
  socBoards: "Leaderboards", socMyPts: "My points", socBoardT: "🏆 Leaderboard", socAll: "Overall", socSem: "This semester", socEver: "All time", socAnyDeg: "All degrees",
  socYou: "you", socEmpty: "No points here yet. The first to help tops the board!", socYourPos: (p, n) => "Your place: " + p + " · " + n + " pts", socNoPos: "No points here yet",
  socLogT: "Points log", socLogEmpty: "No points yet", socByCourse: "Points by course",
  lgAdd: (f, r) => f + " added “" + r + "” to theirs", lgTime: r => "Time report on “" + r + "”", lgWa: "WhatsApp group link", lgSomeone: "Someone",
  socMute: "Mute this user 🔇", socUnmute: "Unmute", socMuted: n => n + " is muted. You won’t see what they share.", socUnmuted: "Unmuted",
  socOnLbl: "Community on", socOnHint: "When off, nothing connects to the community server and none of this is shown.", socProfT: "My profile", socWaT: "WhatsApp groups by course",
  socMuteT: "Muted users", socMuteNone: "None", socHowT: "How to earn points", socHow: ["+3 – someone added a quiz or task you shared", "+1 – reporting how long a task took you", "+1 – adding a course’s WhatsApp group link"],
  socNet: "Can’t reach the community server right now", socLoading: "Loading…", socRanksT: "Ranks", socJoinBtn: "Join the community",
});
Object.assign(I18N.fr, {
  socIntroT: "Nouveau : la communauté MoodlePro 🎉", socIntroP: "Des étudiants qui s’entraident. Tout est facultatif, et désactivable à tout moment dans les réglages.",
  socB1: "⏳ Le temps que prend chaque devoir – d’après les autres étudiants", socB2: "📢 Les quiz et devoirs ajoutés par quelqu’un du cours – chez vous en un geste",
  socB3: "💬 Le groupe WhatsApp de chaque cours au même endroit", socB4: "🏆 Points, rangs et classements – général et par cours",
  socYourDeg: "Quel est votre diplôme ?", socYourYr: "Année", socPickDeg: "Choisir un diplôme", socPickYr: "Année", socOtherDeg: "Quel diplôme ?",
  socPriv: "Votre nom Moodle apparaît à côté de ce que vous partagez et dans les classements. Votre jeton Moodle reste sur cet appareil.",
  socJoin: "Rejoindre", socLater: "Pas maintenant", socWelcome: "Bienvenue dans la communauté ! 🎉",
  socGrpB: "Licence", socGrpM: "Master", socOther: "Autre…",
  dg_opt: "Physique appliquée / électro-optique", dg_ee: "Génie électrique et électronique", dg_se: "Génie logiciel", dg_ie: "Génie industriel et management", dg_cs: "Informatique",
  dg_bio: "Bio-informatique", dg_nur: "Soins infirmiers", dg_nur2: "Reconversion en soins infirmiers", dg_acc: "Comptabilité et systèmes d’information", dg_ba: "Administration des affaires",
  dg_m_cs: "M.Sc. Informatique (IA)", dg_m_phy: "M.Sc. Physique appliquée / électro-optique", dg_m_nur: "Soins infirmiers (M.S.N.)",
  yr1: "1re année", yr2: "2e année", yr3: "3e année", yr4: "4e année",
  rk0: "Survivant du semestre", rk1: "Saint des résumés", rk2: "Solveur certifié", rk3: "Sauveur d’examens", rk4: "Légende du campus", rk5: "Assistant d’honneur",
  socTimeT: "Bravo, c’est rendu ! Ça vous a pris combien de temps ?", socTimeHint: "Aide les autres à s’organiser. Un seul geste.", socSkip: "Passer",
  h1: "Jusqu’à 1 h", h2: "1 à 3 h", h3: "3 à 6 h", h4: "6 à 10 h", h5: "Plus de 10 h",
  socThanks: "Merci ! +1 point", socThanks0: "Mis à jour ✓", estBadge: (h, n) => "~" + h + " h · " + n + " avis", estTitle: (h, n) => "Moyenne de " + n + " étudiants : environ " + h + " heures",
  socShared: (who, what, c, d) => who + " a ajouté " + what + " en " + c + " · " + d, socSharedTask: (who, what, c, d) => who + " a partagé un devoir : " + what + " · " + c + " · " + d,
  socAdd: "＋ Ajouter chez moi", socIgnore: "Ignorer", socAdded: "Ajouté ✓", socShareOn: "Partagé avec le cours ✓", socShareOff: "Partage retiré",
  waOpen: "Le groupe WhatsApp du cours", waAdd: "＋ Ajouter le lien du groupe WhatsApp", waEdit: "Modifier", waT: "Le groupe WhatsApp du cours", waHint: "Collez le lien d’invitation (commence par https://chat.whatsapp.com/). Tous les étudiants du cours le verront.",
  waBad: "Ce n’est pas un lien d’invitation WhatsApp", waSaved: "Lien enregistré ✓", waRemove: "Le lien ne marche pas ? Le retirer", waRemoved: "Lien retiré", waBy: n => "Ajouté par " + n, waNone: "Pas encore de lien",
  socPts: n => n + " pts", socPos: n => n + "ᵉ", socToNext: (n, r) => "encore " + n + " pts pour " + r, socTop: "Rang le plus haut 🏆",
  socBoards: "Classements", socMyPts: "Mes points", socBoardT: "🏆 Classement", socAll: "Général", socSem: "Ce semestre", socEver: "Depuis toujours", socAnyDeg: "Tous les diplômes",
  socYou: "vous", socEmpty: "Pas encore de points ici. Le premier à aider prend la tête !", socYourPos: (p, n) => "Votre place : " + p + " · " + n + " pts", socNoPos: "Pas encore de points ici",
  socLogT: "Journal des points", socLogEmpty: "Pas encore de points", socByCourse: "Points par cours",
  lgAdd: (f, r) => f + " a ajouté « " + r + " » chez lui", lgTime: r => "Durée indiquée pour « " + r + " »", lgWa: "Lien du groupe WhatsApp", lgSomeone: "Quelqu’un",
  socMute: "Masquer cet utilisateur 🔇", socUnmute: "Ne plus masquer", socMuted: n => n + " est masqué. Vous ne verrez plus ses partages.", socUnmuted: "Plus masqué",
  socOnLbl: "Communauté activée", socOnHint: "Désactivée : aucune connexion au serveur de la communauté, et rien de tout cela n’est affiché.", socProfT: "Mon profil", socWaT: "Groupes WhatsApp par cours",
  socMuteT: "Utilisateurs masqués", socMuteNone: "Aucun", socHowT: "Comment gagner des points", socHow: ["+3 – quelqu’un a ajouté un quiz ou devoir que vous avez partagé", "+1 – indiquer combien de temps un devoir vous a pris", "+1 – ajouter le lien du groupe WhatsApp d’un cours"],
  socNet: "Serveur de la communauté injoignable pour l’instant", socLoading: "Chargement…", socRanksT: "Rangs", socJoinBtn: "Rejoindre la communauté",
});

/* ---------- state and the server ---------- */
const ST = { ov: LS.get("socOv", null), at: 0, busy: null, board: { cid: "", per: "sem", deg: "" }, queue: [] };
const hex = n => [...crypto.getRandomValues(new Uint8Array(n))].map(b => b.toString(16).padStart(2, "0")).join("");
function ensureId() { if (!P.soc_id) { P.soc_id = { uid: hex(16), sec: hex(24) }; savePrefs(); } return P.soc_id; }
const prof = () => P.soc_prof || { deg: "", yr: "" };
const myName = () => ((V.data && V.data.user) || "").trim();
async function api(op, body) {
  const id = ensureId(), pr = prof(), ctl = new AbortController(), tm = setTimeout(() => ctl.abort(), 12000);
  try {
    const r = await fetch(pushUrl() + "/social/" + op, { method: "POST", signal: ctl.signal, headers: { "Content-Type": "application/json" },
      body: JSON.stringify(Object.assign({ uid: id.uid, sec: id.sec, name: myName() || "?", deg: pr.deg, yr: pr.yr }, body || {})) });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) { const e = new Error(j.error || "http " + r.status); e.status = r.status; throw e; }
    return j;
  } finally { clearTimeout(tm); }
}
const myCourses = () => ((V.data && V.data.courses) || []).filter(c => !isOff(c.id));
async function overview(force) {
  if (!socOn() || !V.data) return null;
  if (!force && Date.now() - ST.at < 3 * 60000) return ST.ov;
  if (ST.busy) return ST.busy;
  ST.at = Date.now();
  ST.busy = api("overview", { courses: myCourses().map(c => ({ id: c.id, name: shortName(c.name) })) })
    .then(o => { ST.ov = o; ST.err = false; LS.set("socOv", o); LS.set("socPts", (o.me && o.me.all) || 0); render(); if (!$("#sheet").hidden) SOC.card(); return o; })
    .catch(e => { ST.err = true; return null; }).finally(() => { ST.busy = null; });
  return ST.busy;
}
const cdata = cid => (ST.ov && ST.ov.c && ST.ov.c[String(cid)]) || null;
const muted = uid => (P.soc_mute || []).some(m => m.uid === uid);
const isMe = uid => P.soc_id && P.soc_id.uid === uid;

/* ---------- labels ---------- */
const degLabel = d => !d ? "" : d.startsWith("x:") ? d.slice(2) : I18N.he["dg_" + d] ? t("dg_" + d) : d;
const profLine = (deg, yr) => [degLabel(deg), yr ? t("yr" + yr) : ""].filter(Boolean).join(" · ");
function rankOf(pts) { let i = 0; RANKS.forEach((r, k) => { if (pts >= r[0]) i = k; }); return { i, emo: RANKS[i][1], name: t(RANKS[i][2]), next: RANKS[i + 1] || null }; }
const rankTag = pts => { const r = rankOf(pts || 0); return '<span class="srk r' + r.i + '">' + r.emo + " " + esc(r.name) + "</span>"; };
const fmtH = h => String(Math.round(h * 10) / 10).replace(/\.0$/, "");
const nameBtn = (uid, name) => '<button class="sname" data-socu="' + esc(uid) + '"><bdi>' + esc(name || t("lgSomeone")) + "</bdi></button>";
const shortDate = ts => { try { return new Date(ts * 1000).toLocaleDateString(t("locale"), { day: "numeric", month: "numeric" }); } catch (e) { return ymd(ts); } };

/* ---------- how long tasks take ---------- */
const timeable = x => x && (x.type === "assign" || x.type === "quiz") && x.cid > 0;
function est(x) { const c = cdata(x.cid), v = c && c.t && c.t[x.key]; return v && v[1] >= MIN_N ? v[0] : 0; }
function badge(x) {
  const c = cdata(x.cid), v = c && c.t && c.t[x.key]; if (!v || v[1] < MIN_N) return "";
  return '<span class="sest" title="' + esc(t("estTitle", fmtH(v[0]), v[1])) + '">' + ic("hourglass") + "<span>" + esc(t("estBadge", fmtH(v[0]), v[1])) + "</span></span>";
}
const asked = k => (P.soc_asked || []).includes(k);
function markAsked(k) { if (!asked(k)) { P.soc_asked = (P.soc_asked || []).concat(k).slice(-400); savePrefs(); } }
function askTime(key) {
  const x = V.data && V.data.tasks.find(y => y.key === key);
  if (!timeable(x) || asked(key)) return;
  sheet("socTime", '<h3><span>' + esc(t("socTimeT")) + "</span>" + xbtn() + '</h3><div class="hint"><bdi>' + esc(x.name) + "</bdi> · <bdi>" + esc(shortName(x.course)) + "</bdi></div>" +
    '<div class="stime">' + HOURS.map(h => '<button data-soch="' + h[0] + '"><span class="e">' + h[1] + "</span><span>" + esc(t(h[2])) + "</span></button>").join("") + "</div>" +
    '<div class="hint" style="text-align:center">' + esc(t("socTimeHint")) + '</div><button class="link" data-socx style="width:100%;margin-top:4px">' + esc(t("socSkip")) + "</button>");
  ST.timeKey = key; markAsked(key);
}
async function sendTime(h) {
  const x = V.data && V.data.tasks.find(y => y.key === ST.timeKey); close("socTime"); if (!x) return;
  try { const r = await api("time", { cid: x.cid, aid: x.key, h, ref: x.name, cname: shortName(x.course) }); toast(t(r.first ? "socThanks" : "socThanks0")); overview(true); }
  catch (e) { toast(t("socNet")); }
}
function afterFetch(d, prevSt) {
  overview();
  if (!prevSt) return;
  for (const x of d.tasks) if (timeable(x) && x.status === "submitted" && prevSt[x.key] && prevSt[x.key] !== "submitted" && !asked(x.key) && !ST.queue.includes(x.key)) ST.queue.push(x.key);
  if (ST.queue.length) setTimeout(() => { if ($$(".sheet").some(s => !s.hidden) || !$("#tour").hidden) return; const k = ST.queue.shift(); if (k) askTime(k); }, 1500);
}

/* ---------- shared quizzes and tasks ---------- */
function offers(kind, now) {
  if (!ST.ov || !ST.ov.c) return [];
  const added = new Set(ST.ov.added || []), ign = P.soc_ign || [], out = [];
  const have = new Set((P.xq || []).map(q => q.from).concat((P.mine || []).map(m => m.from)).filter(Boolean));
  const mineSids = new Set((P.xq || []).map(q => q.sid).concat((P.mine || []).map(m => m.sid)).filter(Boolean));
  for (const c of myCourses()) {
    const cd = cdata(c.id); if (!cd) continue;
    for (const s of cd.sh || []) {
      if (s.kind !== kind || isMe(s.uid) || mineSids.has(s.id) || muted(s.uid) || ign.includes(s.id) || added.has(s.id) || have.has(s.id) || s.at < now - DAY) continue;
      out.push(Object.assign({ cid: c.id, cname: shortName(c.name) }, s));
    }
  }
  return out.sort((a, b) => a.at - b.at).slice(0, 6);
}
function offerHTML(s) {
  const who = nameBtn(s.uid, s.name), pl = profLine(s.deg, s.yr);
  const what = s.kind === "xq" ? t("xq_" + (XQ_KINDS.includes(s.d.k) ? s.d.k : "quiz")) + (s.d.note ? " (" + s.d.note + ")" : "") : s.d.n + (s.d.note ? " (" + s.d.note.slice(0, 60) + ")" : "");
  const line = t(s.kind === "xq" ? "socShared" : "socSharedTask", "\u0000", what, s.cname, s.kind === "xq" && !s.d.allDay ? when(s.at) : shortDate(s.at));
  const [a, b] = esc(line).split("\u0000");
  return '<div class="soffer" style="--c:' + colorOf(s.cid) + '"><span class="se">📢</span><div class="sb"><div>' + a + who + b + "</div>" + (pl ? '<small class="sprof">' + esc(pl) + "</small>" : "") + '<div class="sa"><button class="primary" data-socadd="' + s.id + '">' + esc(t("socAdd")) + '</button><button class="link" data-socign="' + s.id + '">' + esc(t("socIgnore")) + "</button></div></div></div>";
}
function examOffers(now) { const L = offers("xq", now); return L.length ? '<div class="soffers">' + L.map(offerHTML).join("") + "</div>" : ""; }
function addShared(id) {
  const s = [].concat(...myCourses().map(c => ((cdata(c.id) || {}).sh || []).map(x => Object.assign({ cid: c.id, cname: shortName(c.name) }, x)))).find(x => x.id === id);
  if (!s) return;
  if (s.kind === "xq") {
    const at = /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2})?$/.test(s.d.s || "") ? s.d.s : ymd(s.at);
    P.xq = (P.xq || []).concat({ id: Date.now().toString(36) + Math.random().toString(36).slice(2, 5), cid: s.cid, n: s.cname, k: XQ_KINDS.includes(s.d.k) ? s.d.k : "quiz", at, note: (s.d.note || "").slice(0, 80), from: s.id });
  } else P.mine = (P.mine || []).concat({ id: "m" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6), title: s.d.n || "?", due: s.at, cid: s.cid, note: s.d.note || "", from: s.id });
  if (ST.ov) ST.ov.added = (ST.ov.added || []).concat(id);
  savePrefs(); render(); toast(t("socAdded"));
  api("add", { id }).then(() => overview(true)).catch(() => {});
}
function ignoreShared(id) { P.soc_ign = (P.soc_ign || []).concat(id).slice(-500); savePrefs(); render(); }
// the "share with the course" box in the quiz / my-task forms
function formShare(kind, item) {
  const row = $(kind === "xq" ? "#xqShareRow" : "#mineShareRow"), box = $(kind === "xq" ? "#xqShare" : "#mineShare"), sel = $(kind === "xq" ? "#xqCourse" : "#mineCid");
  const upd = () => { row.hidden = !(Number(sel.value) > 0); };
  if (!sel.dataset.soc) { sel.dataset.soc = "1"; sel.addEventListener("change", () => { if (socOn()) upd(); }); }
  box.checked = !!(item && item.sid); upd();
}
async function afterSave(kind, item) {
  const row = $(kind === "xq" ? "#xqShareRow" : "#mineShareRow"), want = !row.hidden && $(kind === "xq" ? "#xqShare" : "#mineShare").checked && item.cid > 0;
  const c = myCourses().find(x => x.id === item.cid) || ((V.data && V.data.courses) || []).find(x => x.id === item.cid);
  if (!want) { if (item.sid) { unshare(item); delete item.sid; savePrefs(); toast(t("socShareOff")); } return; }
  const body = kind === "xq"
    ? { cid: item.cid, cname: c ? shortName(c.name) : "", kind: "xq", at: xqTs(item), d: { n: t("xq_" + item.k) + (item.note ? " · " + item.note : ""), k: item.k, note: item.note || "", s: item.at, allDay: !parseDT(item.at) } }
    : { cid: item.cid, cname: c ? shortName(c.name) : "", kind: "task", at: item.due, d: { n: item.title, note: (item.note || "").slice(0, 200) } };
  if (item.sid) body.id = item.sid;
  try {
    const r = await api("share", body);
    const live = (kind === "xq" ? P.xq : P.mine).find(x => x.id === item.id);
    if (live && r.id) { live.sid = r.id; savePrefs(); }
    toast(t("socShareOn")); overview(true);
  } catch (e) { toast(t("socNet")); }
}
function unshare(item) { if (item && item.sid) api("unshare", { id: item.sid }).then(() => overview(true)).catch(() => {}); }

/* ---------- WhatsApp group per course ---------- */
function waBar(cid) {
  const cd = cdata(cid); if (!cd) return "";
  return '<div class="swabar">' + (cd.wa ? '<a class="swa" href="' + esc(cd.wa) + '" target="_blank" rel="noopener noreferrer">' + ic("message-circle") + "<span>" + esc(t("waOpen")) + "</span></a>" +
    '<button class="link" data-socwa="' + cid + '">' + esc(t("waEdit")) + "</button>" : '<button class="link swaadd" data-socwa="' + cid + '">' + esc(t("waAdd")) + "</button>") + "</div>";
}
function openWa(cid) {
  const cd = cdata(cid) || {}, c = ((V.data && V.data.courses) || []).find(x => x.id === cid);
  sheet("socWa", "<h3><span>" + esc(t("waT")) + "</span>" + xbtn() + '</h3><div class="stitle"><bdi>' + esc(c ? shortName(c.name) : "") + '</bdi></div><div class="hint">' + esc(t("waHint")) + "</div>" +
    '<input type="url" id="socWaIn" dir="ltr" placeholder="https://chat.whatsapp.com/…" value="' + esc(cd.wa || "") + '" style="width:100%;margin:10px 0">' +
    (cd.waBy ? '<div class="hint">' + esc(t("waBy", cd.waBy)) + "</div>" : "") + '<p class="err" id="socWaErr" hidden></p>' +
    '<button class="primary" data-socwasave="' + cid + '" style="width:100%">' + esc(t("save")) + "</button>" +
    (cd.wa ? '<button class="link danger" data-socwadel="' + cid + '" style="width:100%;margin-top:6px">' + esc(t("waRemove")) + "</button>" : ""));
}
async function saveWa(cid, del) {
  const url = del ? "" : ($("#socWaIn").value || "").trim().replace(/\?.*$/, "");
  if (!del && !/^https:\/\/chat\.whatsapp\.com\/[A-Za-z0-9]{10,40}$/.test(url)) { $("#socWaErr").textContent = t("waBad"); $("#socWaErr").hidden = false; return; }
  const c = ((V.data && V.data.courses) || []).find(x => x.id === cid);
  try { const r = await api("wa", { cid, url, cname: c ? shortName(c.name) : "" }); close("socWa"); toast(del ? t("waRemoved") : t("waSaved") + (r.pts ? " · \u2066+" + r.pts + "\u2069" : "")); await overview(true); if (V.spage === "soc") page(); }
  catch (e) { $("#socWaErr").textContent = t("socNet"); $("#socWaErr").hidden = false; }
}

/* ---------- the tasks tab: shared tasks, and the WhatsApp group of the course in focus ---------- */
function renderTop(now) {
  const el = $("#socTop"); if (!el) return;
  const L = offers("task", now), f = V.focus && V.focus.kind === "course" ? V.focus.cid : null;
  el.innerHTML = (f ? waBar(f) : "") + (L.length ? '<div class="soffers">' + L.map(offerHTML).join("") + "</div>" : "");
}

/* ---------- people: profile + points log, mute ---------- */
async function openUser(uid) {
  sheet("socUser", "<h3><span>" + esc(t("socLoading")) + "</span>" + xbtn() + "</h3>");
  let r; try { r = await api("user", { who: uid }); } catch (e) { $("#socUser .box").innerHTML = "<h3><span></span>" + xbtn() + '</h3><div class="hint">' + esc(t("socNet")) + "</div>"; return; }
  const u = r.u, me = isMe(u.uid), rk = rankOf(u.all);
  const desc = l => l.kind === "add" ? t("lgAdd", l.fname || t("lgSomeone"), l.ref) : l.kind === "time" ? t("lgTime", l.ref) : l.kind === "wa" ? t("lgWa") : l.kind;
  const day = ms => { try { return new Date(ms).toLocaleString(t("locale"), { day: "numeric", month: "numeric", hour: "2-digit", minute: "2-digit" }); } catch (e) { return ""; } };
  $("#socUser .box").innerHTML = "<h3><span><bdi>" + esc(u.name) + "</bdi>" + (me ? " (" + esc(t("socYou")) + ")" : "") + "</span>" + xbtn() + "</h3>" +
    '<div class="sprofcard"><div class="sav">' + esc((u.name || "?").trim().charAt(0)) + '</div><div><div class="hint">' + esc(profLine(u.deg, u.yr)) + "</div>" + rankTag(u.all) +
    '<div class="spts"><b>' + esc(t("socPts", u.all)) + "</b>" + (u.pos ? " · " + esc(t("socPos", u.pos)) : "") + " · " + esc(t("socSem")) + ": " + esc(t("socPts", u.sem)) + "</div>" + progress(u.all) + "</div></div>" +
    (r.by.length ? '<div class="stitle">' + esc(t("socByCourse")) + '</div><div class="sbyc">' + r.by.map(b => '<span class="chip on" style="--c:' + colorOf(Number(b.cid)) + '"><i></i><bdi>' + esc(b.name) + '</bdi> <span class="n">' + b.pts + "</span></span>").join("") + "</div>" : "") +
    '<div class="stitle">' + esc(t("socLogT")) + "</div>" +
    (r.log.length ? '<div class="slog">' + r.log.map(l => '<div class="sl"><b class="sp" dir="ltr">+' + l.pts + '</b><div><div><bdi>' + esc(desc(l)) + '</bdi></div><small class="hint">' + (l.cname ? "<bdi>" + esc(l.cname) + "</bdi> · " : "") + esc(day(l.at)) + "</small></div></div>").join("") + "</div>"
      : '<div class="hint">' + esc(t("socLogEmpty")) + "</div>") +
    (me ? "" : '<button class="link' + (muted(u.uid) ? "" : " danger") + '" data-socmute="' + esc(u.uid) + '" data-n="' + esc(u.name) + '" style="width:100%;margin-top:10px">' + esc(t(muted(u.uid) ? "socUnmute" : "socMute")) + "</button>");
}
function progress(pts) {
  const r = rankOf(pts); if (!r.next) return '<div class="hint">' + esc(t("socTop")) + "</div>";
  const lo = RANKS[r.i][0], hi = r.next[0], p = Math.round((pts - lo) / (hi - lo) * 100);
  return '<div class="sbar"><i style="width:' + p + '%"></i></div><div class="hint">' + esc(t("socToNext", hi - pts, r.next[1] + " " + t(r.next[2]))) + "</div>";
}
function toggleMute(uid, name) {
  if (muted(uid)) { P.soc_mute = P.soc_mute.filter(m => m.uid !== uid); toast(t("socUnmuted")); }
  else { P.soc_mute = (P.soc_mute || []).concat({ uid, name: (name || "").slice(0, 60) }); toast(t("socMuted", name || "")); }
  savePrefs(); close("socUser"); render(); if (V.spage === "soc") page();
}

/* ---------- leaderboards ---------- */
function openBoard(cid) {
  if (cid !== undefined) ST.board.cid = String(cid || "");
  const cs = myCourses(), b = ST.board;
  sheet("socBoard", "<h3><span>" + esc(t("socBoardT")) + "</span>" + xbtn() + "</h3>" +
    '<select id="socBc" aria-label="course"><option value="">' + esc(t("socAll")) + "</option>" + cs.map(c => '<option value="' + c.id + '">' + esc(shortName(c.name)) + "</option>").join("") + "</select>" +
    '<div class="seg" id="socBp" style="display:flex;margin:8px 0"><button data-per="sem">' + esc(t("socSem")) + '</button><button data-per="all">' + esc(t("socEver")) + "</button></div>" +
    '<select id="socBd" aria-label="degree">' + degOptions(b.deg, true) + "</select>" + '<div id="socBl" class="sboard"><div class="hint">' + esc(t("socLoading")) + "</div></div>");
  $("#socBc").value = b.cid; $("#socBd").value = b.deg;
  $$("#socBp button").forEach(x => x.classList.toggle("on", x.dataset.per === b.per));
  $("#socBc").onchange = () => { b.cid = $("#socBc").value; loadBoard(); };
  $("#socBd").onchange = () => { b.deg = $("#socBd").value; loadBoard(); };
  $("#socBp").onclick = e => { const x = e.target.closest("[data-per]"); if (!x) return; b.per = x.dataset.per; $$("#socBp button").forEach(y => y.classList.toggle("on", y === x)); loadBoard(); };
  loadBoard();
}
async function loadBoard() {
  const b = ST.board, el = $("#socBl"); if (!el) return;
  el.innerHTML = '<div class="hint">' + esc(t("socLoading")) + "</div>";
  let r; try { r = await api("board", { cid: b.cid, per: b.per, deg: b.deg }); } catch (e) { el.innerHTML = '<div class="hint">' + esc(t("socNet")) + "</div>"; return; }
  if (ST.board !== b || $("#socBl") !== el) return;
  const rows = r.rows.filter(x => !muted(x.uid));
  el.innerHTML = (rows.length ? rows.map((x, i) => '<button class="sbr' + (isMe(x.uid) ? " me" : "") + '" data-socu="' + esc(x.uid) + '"><span class="sn">' + (i < 3 ? ["🥇", "🥈", "🥉"][i] : i + 1) + '</span><span class="sw"><b><bdi>' + esc(x.name) + "</bdi>" + (isMe(x.uid) ? " (" + esc(t("socYou")) + ")" : "") +
      "</b><small>" + esc(profLine(x.deg, x.yr)) + "</small>" + rankTag(x.total) + '</span><span class="sv">' + x.pts + "</span></button>").join("") : '<div class="hint">' + esc(t("socEmpty")) + "</div>") +
    '<div class="hint sme">' + esc(r.me.pos ? t("socYourPos", r.me.pos, r.me.pts) : t("socNoPos")) + "</div>";
}

/* ---------- settings: the profile card on top, and the community page ---------- */
function card() {
  const el = $("#socCard"); if (!el) return;
  if (!socOn()) { el.innerHTML = ""; return; }
  const pts = (ST.ov && ST.ov.me && ST.ov.me.all) || LS.get("socPts", 0), n = myName(), pr = prof();
  el.innerHTML = '<div class="sprofcard top"><div class="sav">' + esc((n || "?").charAt(0)) + '</div><div class="sw"><b><bdi>' + esc(n) + '</bdi></b><div class="hint">' + esc(profLine(pr.deg, pr.yr)) + "</div>" +
    rankTag(pts) + ' <span class="spts">' + esc(t("socPts", pts)) + "</span>" + progress(pts) +
    '<div class="sbtns"><button data-socboard>' + ic("trophy") + "<span>" + esc(t("socBoards")) + '</span></button><button data-socme>' + ic("award") + "<span>" + esc(t("socMyPts")) + "</span></button></div></div></div>";
}
function degOptions(cur, any) {
  const o = (v, l) => '<option value="' + esc(v) + '"' + (v === cur ? " selected" : "") + ">" + esc(l) + "</option>";
  const other = cur && cur.startsWith("x:");
  return (any ? o("", t("socAnyDeg")) : o("", t("socPickDeg"))) + '<optgroup label="' + esc(t("socGrpB")) + '">' + DEGS.b.map(d => o(d, t("dg_" + d))).join("") + "</optgroup>" +
    '<optgroup label="' + esc(t("socGrpM")) + '">' + DEGS.m.map(d => o(d, t("dg_" + d))).join("") + "</optgroup>" + (any ? (other ? o(cur, cur.slice(2)) : "") : o("x", t("socOther")) + (other ? o(cur, cur.slice(2)) : ""));
}
const yrOptions = cur => '<option value="">' + esc(t("socPickYr")) + "</option>" + YEARS.map(y => '<option value="' + y + '"' + (y === cur ? " selected" : "") + ">" + esc(t("yr" + y)) + "</option>").join("");
function profFields(pfx) {
  const pr = prof(), other = pr.deg && pr.deg.startsWith("x:");
  return '<div class="sprofrow"><label class="fld"><span>' + esc(t("socYourDeg")) + '</span><select id="' + pfx + 'Deg">' + degOptions(pr.deg, false) + "</select></label>" +
    '<label class="fld sy"><span>' + esc(t("socYourYr")) + '</span><select id="' + pfx + 'Yr">' + yrOptions(pr.yr) + "</select></label></div>" +
    '<input type="text" id="' + pfx + 'Other" maxlength="60" placeholder="' + esc(t("socOtherDeg")) + '" value="' + esc(other ? pr.deg.slice(2) : "") + '"' + (other ? "" : " hidden") + ' style="width:100%;margin-bottom:8px">';
}
function wireProf(pfx, onChange) {
  const sel = $("#" + pfx + "Deg"), oth = $("#" + pfx + "Other"), yr = $("#" + pfx + "Yr");
  sel.onchange = () => { oth.hidden = !(sel.value === "x" || sel.value.startsWith("x:")); if (sel.value === "x") oth.focus(); if (onChange) onChange(); };
  if (onChange) { yr.onchange = onChange; oth.onchange = onChange; }
}
function readProf(pfx) {
  const sel = $("#" + pfx + "Deg").value, oth = ($("#" + pfx + "Other").value || "").trim().slice(0, 60);
  return { deg: sel === "x" || sel.startsWith("x:") ? (oth ? "x:" + oth : "") : sel, yr: $("#" + pfx + "Yr").value };
}
function page() {
  const el = $("#socPage"); if (!el) return;
  const on = socOn(), cs = myCourses();
  el.innerHTML = '<label class="sswitch"><span><b>' + esc(t("socOnLbl")) + '</b><small class="hint">' + esc(t("socOnHint")) + '</small></span><input type="checkbox" id="socOnBox"' + (on ? " checked" : "") + "></label>" +
    (on ? '<div class="stitle">' + esc(t("socProfT")) + "</div>" + profFields("socP") +
      '<div class="stitle">' + esc(t("socWaT")) + '</div><div class="swalist">' + (cs.map(c => { const cd = cdata(c.id) || {};
        return '<div class="swarow" style="--c:' + colorOf(c.id) + '"><i></i><bdi>' + esc(shortName(c.name)) + "</bdi>" + (cd.wa ? '<a class="swa sm" href="' + esc(cd.wa) + '" target="_blank" rel="noopener noreferrer">' + ic("message-circle") + "</a>" : '<small class="hint">' + esc(t("waNone")) + "</small>") +
          '<button class="link" data-socwa="' + c.id + '">' + esc(t(cd.wa ? "waEdit" : "waAdd")) + "</button></div>"; }).join("") || '<div class="hint">' + esc(t("noCourses")) + "</div>") + "</div>" +
      '<div class="stitle">' + esc(t("socMuteT")) + "</div>" + ((P.soc_mute || []).length ? P.soc_mute.map(m => '<div class="swarow"><bdi>' + esc(m.name) + '</bdi><button class="link" data-socmute="' + esc(m.uid) + '" data-n="' + esc(m.name) + '">' + esc(t("socUnmute")) + "</button></div>").join("") : '<div class="hint">' + esc(t("socMuteNone")) + "</div>") +
      '<div class="stitle">' + esc(t("socHowT")) + '</div><ul class="show">' + t("socHow").map(x => "<li>" + esc(x) + "</li>").join("") + "</ul>" +
      '<div class="stitle">' + esc(t("socRanksT")) + '</div><div class="sranks">' + RANKS.map((r, i) => '<span class="srk r' + i + '">' + r[1] + " " + esc(t(r[2])) + " · \u2066" + r[0] + "+\u2069</span>").join("") + "</div>" +
      (ST.err ? '<div class="hint">' + esc(t("socNet")) + "</div>" : "") + '<div class="hint" style="margin-top:10px">' + esc(t("socPriv")) + "</div>"
      : '<button class="primary" data-socjoin style="width:100%;margin-top:10px">' + esc(t("socJoinBtn")) + "</button>");
  $("#socOnBox").onchange = e => { if (e.target.checked) { e.target.checked = false; intro(true); } else { P.soc_on = false; savePrefs(); render(); page(); renderSheet(); } };
  if (on) wireProf("socP", () => { const p = readProf("socP"); if (p.deg === "" && $("#socPDeg").value === "x") return; P.soc_prof = p; savePrefs(); overview(true); });
}

/* ---------- the invitation (after the update, or from settings) ---------- */
function intro(manual) {
  sheet("socIntro", "<h3><span>" + esc(t("socIntroT")) + "</span>" + xbtn() + '</h3><div class="hint">' + esc(t("socIntroP")) + '</div><ul class="sintro">' +
    ["socB1", "socB2", "socB3", "socB4"].map(k => "<li>" + esc(t(k)) + "</li>").join("") + "</ul>" + profFields("socI") +
    '<div class="hint">' + esc(t("socPriv")) + '</div><button class="primary" data-socjoinnow style="width:100%;margin-top:12px">' + esc(t("socJoin")) + '</button><button class="link" data-socx style="width:100%;margin-top:6px">' + esc(t(manual ? "xqCancel" : "socLater")) + "</button>");
  wireProf("socI");
  LS.set("socIntro", true); useHit("socIntro");
}
async function join() {
  const p = readProf("socI"), btn = $("[data-socjoinnow]"); if (btn) btn.disabled = true;
  // joined already on another device? take that id (and its points) instead of making a second one
  if (!P.soc_id && syncOnNow() && M.token) { try { await Promise.race([syncNow(), new Promise(r => setTimeout(r, 4000))]); } catch (e) {} }
  P.soc_prof = p; P.soc_on = true; ensureId(); savePrefs(); useHit("socJoin");
  close("socIntro"); toast(t("socWelcome")); render(); overview(true);
  if (!$("#sheet").hidden) { renderSheet(); if (V.spage === "soc") page(); }
}

/* ---------- small sheets made on demand, like the app's own ---------- */
const xbtn = () => ' <button class="xbtn" data-socx aria-label="' + esc(t("close")) + '">' + ic("x") + "</button>";
function sheet(id, html) {
  let el = document.getElementById(id);
  if (!el) { el = document.createElement("div"); el.className = "sheet soc"; el.id = id; el.innerHTML = '<div class="box"></div>'; document.body.appendChild(el);
    el.addEventListener("click", e => { if (e.target === el) close(id); }); }
  el.querySelector(".box").innerHTML = html; el.hidden = false; el.querySelector(".box").scrollTop = 0;
  return el;
}
function close(id) { const el = document.getElementById(id); if (el) el.hidden = true; }

document.addEventListener("click", e => {
  const g = s => e.target.closest(s);
  let b;
  if ((b = g("[data-socx]"))) { const s = b.closest(".sheet"); if (s) s.hidden = true; return; }
  if ((b = g("[data-soch]"))) return sendTime(Number(b.dataset.soch));
  if ((b = g("[data-socadd]"))) return addShared(Number(b.dataset.socadd));
  if ((b = g("[data-socign]"))) return ignoreShared(Number(b.dataset.socign));
  if ((b = g("[data-socu]"))) { e.stopPropagation(); return openUser(b.dataset.socu); }
  if ((b = g("[data-socwa]"))) return openWa(Number(b.dataset.socwa));
  if ((b = g("[data-socwasave]"))) return saveWa(Number(b.dataset.socwasave), false);
  if ((b = g("[data-socwadel]"))) return saveWa(Number(b.dataset.socwadel), true);
  if ((b = g("[data-socmute]"))) return toggleMute(b.dataset.socmute, b.dataset.n);
  if ((b = g("[data-socboard]"))) return openBoard();
  if ((b = g("[data-socme]"))) return P.soc_id && openUser(P.soc_id.uid);
  if ((b = g("[data-socjoin]"))) return intro(true);
  if ((b = g("[data-socjoinnow]"))) return join();
}, true);

/* ---------- looks ---------- */
const css = document.createElement("style");
css.textContent = `
.sest{display:inline-flex;align-items:center;gap:4px;font-size:12px;padding:2px 8px;border-radius:99px;background:color-mix(in srgb,var(--accent) 12%,var(--card));color:var(--accent-t);margin-inline-start:6px;white-space:nowrap;vertical-align:middle}
.sest .i{width:13px;height:13px}
.hero .sest{background:#ffffff2e;color:#fff;margin:6px 0 0}
.soffers{display:flex;flex-direction:column;gap:8px;margin:0 0 10px}
.soffer{display:flex;gap:10px;padding:10px 12px;border-radius:14px;background:color-mix(in srgb,var(--c) 9%,var(--card));border:1px solid color-mix(in srgb,var(--c) 28%,var(--line));font-size:14px;line-height:1.45}
.soffer .se{font-size:18px;line-height:1.2}
.soffer .sb{flex:1;min-width:0}
.soffer .sa{display:flex;gap:8px;align-items:center;margin-top:6px}
.soffer .sa .primary{padding:6px 12px;font-size:13px}
.sname{background:none;border:0;padding:0;font:inherit;font-weight:700;color:var(--text);text-decoration:underline dotted;text-underline-offset:3px;cursor:pointer}
.sprof{display:block;color:var(--muted);font-size:12px}
.swabar{display:flex;align-items:center;gap:10px;margin:0 0 10px}
.swa{display:inline-flex;align-items:center;gap:8px;padding:9px 14px;border-radius:12px;background:#25d366;color:#fff;font-weight:700;text-decoration:none;font-size:14px}
.swa .i{width:18px;height:18px}
.swa.sm{padding:5px 8px;border-radius:9px}
.swaadd{font-weight:600}
.socchk{display:flex;align-items:center;gap:8px;margin:6px 0;font-size:14px}
.socchk input{width:18px;height:18px;accent-color:var(--accent)}
.stime{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin:12px 0}
.stime button{display:flex;flex-direction:column;align-items:center;gap:2px;padding:12px 6px;border-radius:14px;font-weight:600}
.stime button:last-child{grid-column:1/-1}
.stime .e{font-size:22px}
.srk{display:inline-block;font-size:12px;font-weight:700;padding:2px 8px;border-radius:99px;margin:4px 0;white-space:nowrap}
.srk.r0{background:#e6f6ea;color:#2b8a3e}.srk.r1{background:#e7f1fd;color:#1c63b7}.srk.r2{background:#f3e8ff;color:#7c3aed}
.srk.r3{background:#fff4e0;color:#c05600}.srk.r4{background:#fff8d6;color:#9a6b00}.srk.r5{background:linear-gradient(90deg,#ffe9a8,#ffd1e8);color:#7a2e5a}
.sprofcard{display:flex;gap:12px;align-items:flex-start;padding:4px 0 8px}
.sprofcard.top{padding:12px;border-radius:16px;background:var(--row);margin-bottom:12px}
.sprofcard .sw{flex:1;min-width:0}
.sav{flex:none;width:46px;height:46px;border-radius:50%;display:grid;place-items:center;font-size:20px;font-weight:800;color:#fff;background:linear-gradient(135deg,#5856d6,#af52de)}
.spts{font-size:13px;color:var(--muted)}
.spts b{color:var(--text)}
.sbar{height:6px;border-radius:99px;background:var(--track);overflow:hidden;margin:8px 0 3px}
.sbar i{display:block;height:100%;background:linear-gradient(90deg,#5856d6,#af52de);border-radius:99px}
.sbtns{display:flex;gap:8px;margin-top:10px;flex-wrap:wrap}
.sbtns button{display:inline-flex;align-items:center;gap:6px;padding:7px 12px;border-radius:10px;font-size:13px;font-weight:600}
.sbtns .i{width:16px;height:16px}
.sbyc{display:flex;flex-wrap:wrap;gap:6px}
.slog{display:flex;flex-direction:column}
.sl{display:flex;gap:10px;align-items:flex-start;padding:8px 0;border-bottom:1px solid var(--line);font-size:14px}
.sl .sp{flex:none;min-width:30px;color:var(--ok)}
.sboard{margin-top:10px}
#socBc,#socBd{width:100%}
.sbr{display:flex;align-items:center;gap:10px;width:100%;text-align:start;padding:10px;border:0;border-bottom:1px solid var(--line);border-radius:0;background:none}
.sbr.me{background:color-mix(in srgb,var(--accent) 10%,var(--card));border-radius:12px}
.sbr .sn{flex:none;width:28px;text-align:center;font-weight:800}
.sbr .sw{flex:1;min-width:0;display:flex;flex-direction:column}
.sbr .sw small{color:var(--muted);font-size:12px}
.sbr .sw .srk{align-self:flex-start}
.sbr .sv{font-weight:800;font-size:16px}
.sme{text-align:center;margin-top:10px}
.sswitch{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:10px 12px;border-radius:14px;background:var(--row)}
.sswitch span{display:flex;flex-direction:column}
.sswitch input{width:22px;height:22px;accent-color:var(--accent);flex:none}
.sprofrow{display:flex;gap:8px}
.sprofrow .fld{flex:1;min-width:0}
.sprofrow .fld.sy{flex:0 0 34%}
.sprofrow select{width:100%}
.swalist{display:flex;flex-direction:column}
.swarow{display:flex;align-items:center;gap:8px;padding:8px 0;border-bottom:1px solid var(--line);font-size:14px}
.swarow>i{width:10px;height:10px;border-radius:50%;background:var(--c);flex:none}
.swarow bdi{flex:1;min-width:0}
.show{margin:4px 0;padding-inline-start:20px;font-size:14px;line-height:1.7}
.sranks{display:flex;flex-wrap:wrap;gap:4px}
.sintro{margin:10px 0;padding-inline-start:20px;line-height:1.8;font-size:15px}
body[data-density=clean] .task .sest span{display:none}
`;
document.head.appendChild(css);

window.SOC = { v: SOC_V, est, badge, examOffers, render: renderTop, afterFetch, askTime, formShare, afterSave, unshare, card, page, intro, openBoard, openUser, overview };
})();
