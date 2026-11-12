/* MoodlePro community (stage 1): how long tasks take, shared quizzes and tasks, a WhatsApp group per course, points with a log, and leaderboards.
   Loaded by index.html only when the community is on (or to show the invitation), so someone who keeps it off downloads none of it.
   Trust-based: the app makes a random id + secret (synced between the user's devices through Moodle, like the other settings);
   the Moodle token never leaves the device. The server is the same Cloudflare worker as the notifications (/social/…). */
(() => {
"use strict";
const SOC_V = "1.7.0-beta.10";
const MIN_N = 1;                                                   // reports needed before an average is shown
const HOURS = [[0.5, "⚡", "h1"], [2, "⏱️", "h2"], [4.5, "📚", "h3"], [8, "🔥", "h4"], [12, "💀", "h5"]];
const RANKS = [[0, "🌱", "rk0"], [20, "📝", "rk1"], [60, "🧠", "rk2"], [150, "⚡", "rk3"], [300, "👑", "rk4"], [600, "🏆", "rk5"]];
const DEGS = { b: ["opt", "ee", "se", "ie", "cs", "bio", "nur", "nur2", "acc", "ba", "pha"], m: ["m_cs", "m_phy", "m_nur"] };
const YEARS = ["1", "2", "3", "4"];

Object.assign(I18N.he, {
  tkEst: (h, n) => n === 1 ? "דיווח אחד עד עכשיו: בערך " + h + " שעות" : "לאחרים לקח בממוצע בערך " + h + " שעות (" + n + " דיווחים)", tkEstNone: "עוד אף אחד לא דיווח כמה זמן זה לקח", tkEstMine: "עד עכשיו רק את/ה דיווחת כמה זמן זה לקח",
  socTimeLate: "זמן ההגשה עבר, אז כבר אי אפשר לדווח כמה זמן זה לקח (הדיווח עוזר לאחרים רק לפני ההגשה)", tkRepAsk: "לחיצה כדי לדווח כמה זמן לקח לך", tkRepChange: "מה שדיווחת. אפשר לשנות", tkAfter: "אחרי שמגישים נשאל כמה זמן לקח, וזה עוזר לאחרים לתכנן", tkChat: "דיון על המטלה", tkChatNone: "עוד אין הודעות. אפשר לשאול כאן שאלה",
  noteT: () => "⭐ ההודעה שלך עזרה למישהו!", noteT2: n => "⭐ " + n + " הודעות שלך סומנו כמועילות!", noteStar: (f, w) => f + " סימן/ה את ההודעה שלך כתשובה מועילה" + (w ? " ב\u2068״" + w + "״\u2069" : ""), noteGo: "לצ'אט ←", notePts: n => "קיבלת \u2066+" + n + "\u2069 נקודות. ממשיכים לעזור 💪", noteOk: "יופי, תודה",
  tkWho: n => "מי דיווח וכמה זמן (" + n + ")", tkWhoSub: "כל הדיווחים: שם, תואר, כמה זמן ומתי", tmT: "⏳ כמה זמן זה לקח לכל אחד", tmWho: n => n === 1 ? "דיווח אחד" : n + " דיווחים", chatStarBy: s => "סימנו כמועיל: " + s, chmeSem: n => n + " בסמסטר הזה",
  socMergedT: "הנקודות מהמכשיר השני שלך אוחדו לחשבון הזה ✓", socJoinWait: "רגע, בודקים אם כבר הצטרפת ממכשיר אחר (כדי לא לפתוח חשבון שני בלי הנקודות שלך). נסו שוב בעוד כמה שניות.",
  socTimeAsk: "כמה זמן לקח?", socTimeT2: "כמה זמן לקח? (אפשר לשנות)",
  crsBoard: "טבלת הקורס", crsChatN: (n, tn) => n + " הודעות בצ'אט הקורס" + (tn ? " · " + tn + " דיונים על מטלות" : ""), crsChatNone: "עוד אין הודעות בצ'אט של הקורס. אפשר לכתוב ראשונים.",
  chvTagCourse: "צ'אט הקורס", chvTagTask: "דיון במטלה", chvFAct: "פעילות", chvFCourse: "קורסים", chvFTask: "מטלות", chvNoAct: "עוד אין שיחות. אפשר לפתוח את הצ'אט של אחד הקורסים ולכתוב ראשונים.", chvStart: "לצ'אטים של הקורסים", chvNoMatch: "לא נמצא צ'אט שמתאים לחיפוש",
  socIntroT: "חדש: קהילת MoodlePro 🎉", socIntroP: "סטודנטים עוזרים לסטודנטים. הכל אופציונלי, ואפשר לכבות בכל רגע בהגדרות.",
  socB1: "⏳ כמה זמן לוקחת כל מטלה – לפי מה שסטודנטים אחרים דיווחו", socB2: "📢 בחנים ומשימות שמישהו מהקורס הוסיף – בלחיצה אחת אצלך",
  socB3: "💬 הקבוצת וואטסאפ של כל קורס במקום אחד", socB4: "🏆 נקודות, דרגות וטבלאות דירוג – כללית ולכל קורס",
  socYourDeg: "מה התואר שלך?", socYourYr: "שנה", socPickDeg: "בחר תואר", socPickYr: "שנה", socOtherDeg: "איזה תואר?",
  socPriv: "השם שלך מ-Moodle יופיע ליד מה שתשתף ובטבלאות. הטוקן של Moodle נשאר רק במכשיר.",
  socJoin: "יאללה, להצטרף", socLater: "לא עכשיו", socWelcome: "ברוך הבא לקהילה! 🎉",
  socGrpB: "תואר ראשון", socGrpM: "תואר שני", socOther: "אחר…",
  dg_opt: "פיזיקה יישומית / הנדסת אלקטרו-אופטיקה", dg_ee: "הנדסת חשמל ואלקטרוניקה", dg_se: "הנדסת תוכנה", dg_ie: "הנדסת תעשייה וניהול", dg_cs: "מדעי המחשב",
  dg_bio: "ביואינפורמטיקה", dg_nur: "סיעוד", dg_nur2: "הסבת אקדמאים לסיעוד", dg_acc: "חשבונאות ומערכות מידע", dg_ba: "מנהל עסקים", dg_pha: "מדעי הרוקחות",
  dg_m_cs: "מדעי המחשב – בינה מלאכותית (תואר שני)", dg_m_phy: "פיזיקה יישומית / אלקטרו-אופטיקה (תואר שני)", dg_m_nur: "סיעוד (תואר שני)",
  yr1: "שנה א׳", yr2: "שנה ב׳", yr3: "שנה ג׳", yr4: "שנה ד׳",
  rk0: "שורד סמסטר", rk1: "צדיק של סיכומים", rk2: "פותר בעיות מוסמך", rk3: "מציל מועדי א׳", rk4: "אגדת קמפוס", rk5: "מתרגל של כבוד",
  socTimeT: "סחתיין על ההגשה! כמה זמן לקח לך בערך?", socTimeHint: "עוזר לאחרים לתכנן את הזמן. לחיצה אחת.", socSkip: "דלג",
  h1: "עד שעה", h2: "\u20661–3\u2069 שעות", h3: "\u20663–6\u2069 שעות", h4: "\u20666–10\u2069 שעות", h5: "יותר מ-10 שעות",
  socThanks: "תודה! \u2066+1\u2069 נקודה", socThanks0: "עודכן ✓", estBadge: (h, n) => "~" + h + " שע׳ · " + (n === 1 ? "דיווח אחד" : n + " דיווחים"), estTitle: (h, n) => n === 1 ? "סטודנט אחד דיווח: כ-" + h + " שעות" : "זמן ממוצע לפי " + n + " סטודנטים: כ-" + h + " שעות",
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
  socMuteT: "משתמשים מושתקים", socMuteNone: "אין", socHowT: "איך צוברים נקודות", socHow: ["\u2066+3\u2069 – מישהו הוסיף לשלו בוחן או משימה ששיתפת", "\u2066+1\u2069 – דיווח כמה זמן לקחה לך מטלה", "\u2066+1\u2069 – הוספת קישור לקבוצת הוואטסאפ של קורס", "\u2066+2\u2069 – מישהו סימן תשובה שלך בדיון כמועילה ⭐"],
  shT: "נוסף ללוח שלך ✓", shBig: "שתף עם כל הסטודנטים בקורס", shBigSub: "כולם יוכלו להוסיף לעצמם בלחיצה אחת · \u2066+3\u2069 נק׳ על כל מי שמוסיף", shAuto: "לשתף אוטומטית כל בוחן ומשימה שאוסיף לקורס",
  shAutoOn: "שיתוף אוטומטי פעיל ✓", shLater: "לא עכשיו", shBtn: "שתף", shShared: "משותף", shUnshare: "הסר שיתוף", shNoCourse: "אפשר לשתף רק פריט ששייך לקורס",
  shTaskT: "המשימה נשמרה ✓", shMineArea: "שיתוף עם הקורס", shAutoT: "שיתוף אוטומטי",
  chatBtn: "דיון", chatCourse: "הצ'אט של הקורס", chatT: "💬 דיון", chatTC: "💬 הצ'אט של הקורס", chatPh: "כתוב הודעה…", chatEmpty: "עוד אין כאן הודעות. שאלה, טיפ או תשובה – תהיה הראשון!",
  chatDel: "ההודעה נמחקה", chatReply: "הגב", chatReplyTo: n => "תגובה ל" + n, chatStar: "מועיל", chatStarT: "סמן כתשובה מועילה (\u2066+2\u2069 לכותב)", chatStarred: "סימנת כמועיל ⭐", chatDelQ: "למחוק את ההודעה?",
  chatReact: "הוסף תגובה", chatsT: "💬 צ'אטים ודיונים", chatsBtn: "צ'אטים", chatsNone: "עוד אין דיונים בקורסים שלך", chatMsgs: n => n + " הודעות", chatYou: "את/ה",
  lgStar: (f, r) => f + " סימן את התשובה שלך כמועילה" + (r ? " ב״" + r + "״" : ""),
  chvT: "💬 צ'אטים", chvHint: "לכל קורס יש צ'אט כללי, ולכל מטלה בקורס יש דיון משלה.", chvSearch: "חיפוש קורס או מטלה", chvGeneral: "הצ'אט הכללי של הקורס", chvGeneralSub: "שאלות, עדכונים ותיאומים לכל הקורס",
  chvTasks: n => "דיונים במטלות" + (n ? " (" + n + ")" : ""), chvMore: n => "עוד " + n + " מטלות", chvLess: "פחות", chvNoMsg: "אין הודעות עדיין · אפשר לפתוח", chvDue: d => "הגשה " + d, chvNone: "לא נמצאו קורסים או מטלות",
  chvUnread: n => n + " חדשות", chBread: "הצ'אט הכללי", chDisc: "דיון במטלה",
  socNet: "אין חיבור לשרת הקהילה כרגע", socLoading: "טוען…", socRanksT: "הדרגות", socJoinBtn: "הצטרפות לקהילה",
});
Object.assign(I18N.en, {
  tkEst: (h, n) => n === 1 ? "One student reported about " + h + " hours" : "It took others about " + h + " hours on average (" + n + " reports)", tkEstNone: "No one has reported how long it took yet", tkEstMine: "So far only you reported how long it took",
  socTimeLate: "The deadline has passed, so reporting how long it took is closed (a report only helps others before the deadline)", tkRepAsk: "Tap to report how long it took you", tkRepChange: "What you reported. You can change it", tkAfter: "Once you submit, we'll ask how long it took – it helps others plan", tkChat: "Discussion about this task", tkChatNone: "No messages yet. Ask a question here",
  noteT: () => "⭐ Your message helped someone!", noteT2: n => "⭐ " + n + " of your messages were marked helpful!", noteStar: (f, w) => f + " marked your message as a helpful answer" + (w ? " in “" + w + "”" : ""), noteGo: "Go to the chat →", notePts: n => "You got +" + n + " points. Keep helping 💪", noteOk: "Nice, thanks",
  tkWho: n => "Who reported and how long (" + n + ")", tkWhoSub: "Every report: name, degree, how long and when", tmT: "⏳ How long it took each person", tmWho: n => n === 1 ? "1 report" : n + " reports", chatStarBy: s => "Marked helpful by: " + s, chmeSem: n => n + " this semester",
  socMergedT: "The points from your other device were joined into this account ✓", socJoinWait: "One moment – checking whether you already joined on another device (so you don't get a second account without your points). Try again in a few seconds.",
  socTimeAsk: "How long did it take?", socTimeT2: "How long did it take? (you can change it)",
  crsBoard: "Course leaderboard", crsChatN: (n, tn) => n + " messages in the course chat" + (tn ? " · " + tn + " task discussions" : ""), crsChatNone: "No messages in the course chat yet. Be the first to write.",
  chvTagCourse: "Course chat", chvTagTask: "Task discussion", chvFAct: "Active", chvFCourse: "Courses", chvFTask: "Tasks", chvNoAct: "No conversations yet. Open one of your course chats and be the first to write.", chvStart: "Go to course chats", chvNoMatch: "No chat matches the search",
  socIntroT: "New: the MoodlePro community 🎉", socIntroP: "Students helping students. All optional, and you can switch it off any time in settings.",
  socB1: "⏳ How long each task takes – from what other students reported", socB2: "📢 Quizzes and tasks someone in the course added – yours in one tap",
  socB3: "💬 Every course’s WhatsApp group in one place", socB4: "🏆 Points, ranks and leaderboards – overall and per course",
  socYourDeg: "What’s your degree?", socYourYr: "Year", socPickDeg: "Choose a degree", socPickYr: "Year", socOtherDeg: "Which degree?",
  socPriv: "Your Moodle name appears next to what you share and on the leaderboards. Your Moodle token stays on this device.",
  socJoin: "Join", socLater: "Not now", socWelcome: "Welcome to the community! 🎉",
  socGrpB: "Bachelor’s", socGrpM: "Master’s", socOther: "Other…",
  dg_opt: "Applied Physics / Electro-Optics Eng.", dg_ee: "Electrical & Electronics Eng.", dg_se: "Software Eng.", dg_ie: "Industrial Eng. & Management", dg_cs: "Computer Science",
  dg_bio: "Bioinformatics", dg_nur: "Nursing", dg_nur2: "Nursing for graduates", dg_acc: "Accounting & Information Systems", dg_ba: "Business Administration", dg_pha: "Pharmaceutical Sciences",
  dg_m_cs: "M.Sc. Computer Science (AI)", dg_m_phy: "M.Sc. Applied Physics / Electro-Optics", dg_m_nur: "M.S.N. Nursing",
  yr1: "1st year", yr2: "2nd year", yr3: "3rd year", yr4: "4th year",
  rk0: "Semester Survivor", rk1: "Summary Saint", rk2: "Certified Solver", rk3: "Exam Saver", rk4: "Campus Legend", rk5: "Honorary TA",
  socTimeT: "Nice, submitted! Roughly how long did it take?", socTimeHint: "Helps others plan their time. One tap.", socSkip: "Skip",
  h1: "Up to 1 hour", h2: "1–3 hours", h3: "3–6 hours", h4: "6–10 hours", h5: "10+ hours",
  socThanks: "Thanks! +1 point", socThanks0: "Updated ✓", estBadge: (h, n) => "~" + h + " h · " + n + (n === 1 ? " report" : " reports"), estTitle: (h, n) => n === 1 ? "One student reported: about " + h + " hours" : "Average from " + n + " students: about " + h + " hours",
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
  socMuteT: "Muted users", socMuteNone: "None", socHowT: "How to earn points", socHow: ["+3 – someone added a quiz or task you shared", "+1 – reporting how long a task took you", "+1 – adding a course’s WhatsApp group link", "+2 – someone marked your answer in a discussion helpful ⭐"],
  shT: "Added to your board ✓", shBig: "Share with everyone in the course", shBigSub: "They can add it in one tap · +3 pts for each one who does", shAuto: "Share every quiz and task I add to a course automatically",
  shAutoOn: "Auto-share is on ✓", shLater: "Not now", shBtn: "Share", shShared: "Shared", shUnshare: "Stop sharing", shNoCourse: "Only items that belong to a course can be shared",
  shTaskT: "Task saved ✓", shMineArea: "Share with the course", shAutoT: "Auto-share",
  chatBtn: "Discuss", chatCourse: "Course chat", chatT: "💬 Discussion", chatTC: "💬 Course chat", chatPh: "Write a message…", chatEmpty: "No messages yet. A question, a tip or an answer – be the first!",
  chatDel: "Message deleted", chatReply: "Reply", chatReplyTo: n => "Replying to " + n, chatStar: "Helpful", chatStarT: "Mark as a helpful answer (+2 to the writer)", chatStarred: "Marked helpful ⭐", chatDelQ: "Delete this message?",
  chatReact: "React", chatsT: "💬 Chats & discussions", chatsBtn: "Chats", chatsNone: "No discussions in your courses yet", chatMsgs: n => n + " messages", chatYou: "you",
  lgStar: (f, r) => f + " marked your answer helpful" + (r ? " in “" + r + "”" : ""),
  chvT: "💬 Chats", chvHint: "Every course has a general chat, and every task in it has its own discussion.", chvSearch: "Search a course or task", chvGeneral: "The course’s general chat", chvGeneralSub: "Questions, updates and plans for the whole course",
  chvTasks: n => "Task discussions" + (n ? " (" + n + ")" : ""), chvMore: n => n + " more tasks", chvLess: "Less", chvNoMsg: "No messages yet · open it", chvDue: d => "Due " + d, chvNone: "No course or task found",
  chvUnread: n => n + " new", chBread: "General chat", chDisc: "Task discussion",
  socNet: "Can’t reach the community server right now", socLoading: "Loading…", socRanksT: "Ranks", socJoinBtn: "Join the community",
});
Object.assign(I18N.fr, {
  tkEst: (h, n) => n === 1 ? "Un étudiant a indiqué environ " + h + " h" : "Les autres ont mis environ " + h + " h en moyenne (" + n + " avis)", tkEstNone: "Personne n’a encore indiqué le temps passé", tkEstMine: "Pour l’instant, vous seul(e) l’avez indiqué",
  socTimeLate: "L’échéance est passée : on ne peut plus indiquer le temps (ça n’aide les autres qu’avant l’échéance)", tkRepAsk: "Touchez pour indiquer votre temps", tkRepChange: "Votre réponse, modifiable", tkAfter: "Après le rendu, on vous demandera le temps passé – ça aide les autres", tkChat: "Discussion sur ce devoir", tkChatNone: "Pas encore de messages. Posez une question ici",
  noteT: () => "⭐ Votre message a aidé quelqu’un !", noteT2: n => "⭐ " + n + " de vos messages ont été jugés utiles !", noteStar: (f, w) => f + " a marqué votre message comme réponse utile" + (w ? " dans « " + w + " »" : ""), noteGo: "Aller au chat →", notePts: n => "Vous avez gagné +" + n + " points. Continuez 💪", noteOk: "Super, merci",
  tkWho: n => "Qui a répondu et combien de temps (" + n + ")", tkWhoSub: "Toutes les réponses : nom, diplôme, durée et date", tmT: "⏳ Le temps pris par chacun", tmWho: n => n === 1 ? "1 réponse" : n + " réponses", chatStarBy: s => "Jugé utile par : " + s, chmeSem: n => n + " ce semestre",
  socMergedT: "Les points de votre autre appareil ont été réunis dans ce compte ✓", socJoinWait: "Un instant – on vérifie si vous avez déjà rejoint sur un autre appareil (pour ne pas créer un second compte sans vos points). Réessayez dans quelques secondes.",
  socTimeAsk: "Combien de temps ?", socTimeT2: "Combien de temps ? (modifiable)",
  crsBoard: "Classement du cours", crsChatN: (n, tn) => n + " messages dans le chat du cours" + (tn ? " · " + tn + " discussions de devoirs" : ""), crsChatNone: "Pas encore de message dans le chat du cours. Écrivez en premier.",
  chvTagCourse: "Chat du cours", chvTagTask: "Discussion du devoir", chvFAct: "Actives", chvFCourse: "Cours", chvFTask: "Devoirs", chvNoAct: "Pas encore de conversation. Ouvrez le chat d’un cours et écrivez en premier.", chvStart: "Aux chats des cours", chvNoMatch: "Aucun chat ne correspond",
  socIntroT: "Nouveau : la communauté MoodlePro 🎉", socIntroP: "Des étudiants qui s’entraident. Tout est facultatif, et désactivable à tout moment dans les réglages.",
  socB1: "⏳ Le temps que prend chaque devoir – d’après les autres étudiants", socB2: "📢 Les quiz et devoirs ajoutés par quelqu’un du cours – chez vous en un geste",
  socB3: "💬 Le groupe WhatsApp de chaque cours au même endroit", socB4: "🏆 Points, rangs et classements – général et par cours",
  socYourDeg: "Quel est votre diplôme ?", socYourYr: "Année", socPickDeg: "Choisir un diplôme", socPickYr: "Année", socOtherDeg: "Quel diplôme ?",
  socPriv: "Votre nom Moodle apparaît à côté de ce que vous partagez et dans les classements. Votre jeton Moodle reste sur cet appareil.",
  socJoin: "Rejoindre", socLater: "Pas maintenant", socWelcome: "Bienvenue dans la communauté ! 🎉",
  socGrpB: "Licence", socGrpM: "Master", socOther: "Autre…",
  dg_opt: "Physique appliquée / électro-optique", dg_ee: "Génie électrique et électronique", dg_se: "Génie logiciel", dg_ie: "Génie industriel et management", dg_cs: "Informatique",
  dg_bio: "Bio-informatique", dg_nur: "Soins infirmiers", dg_nur2: "Reconversion en soins infirmiers", dg_acc: "Comptabilité et systèmes d’information", dg_ba: "Administration des affaires", dg_pha: "Sciences pharmaceutiques",
  dg_m_cs: "M.Sc. Informatique (IA)", dg_m_phy: "M.Sc. Physique appliquée / électro-optique", dg_m_nur: "Soins infirmiers (M.S.N.)",
  yr1: "1re année", yr2: "2e année", yr3: "3e année", yr4: "4e année",
  rk0: "Survivant du semestre", rk1: "Saint des résumés", rk2: "Solveur certifié", rk3: "Sauveur d’examens", rk4: "Légende du campus", rk5: "Assistant d’honneur",
  socTimeT: "Bravo, c’est rendu ! Ça vous a pris combien de temps ?", socTimeHint: "Aide les autres à s’organiser. Un seul geste.", socSkip: "Passer",
  h1: "Jusqu’à 1 h", h2: "1 à 3 h", h3: "3 à 6 h", h4: "6 à 10 h", h5: "Plus de 10 h",
  socThanks: "Merci ! +1 point", socThanks0: "Mis à jour ✓", estBadge: (h, n) => "~" + h + " h · " + n + " avis", estTitle: (h, n) => n === 1 ? "Un étudiant a répondu : environ " + h + " heures" : "Moyenne de " + n + " étudiants : environ " + h + " heures",
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
  socMuteT: "Utilisateurs masqués", socMuteNone: "Aucun", socHowT: "Comment gagner des points", socHow: ["+3 – quelqu’un a ajouté un quiz ou devoir que vous avez partagé", "+1 – indiquer combien de temps un devoir vous a pris", "+1 – ajouter le lien du groupe WhatsApp d’un cours", "+2 – quelqu’un a marqué votre réponse utile ⭐"],
  shT: "Ajouté à votre tableau ✓", shBig: "Partager avec tout le cours", shBigSub: "Chacun peut l’ajouter en un geste · +3 pts par ajout", shAuto: "Partager automatiquement chaque quiz et devoir que j’ajoute à un cours",
  shAutoOn: "Partage automatique activé ✓", shLater: "Pas maintenant", shBtn: "Partager", shShared: "Partagé", shUnshare: "Ne plus partager", shNoCourse: "Seuls les éléments liés à un cours peuvent être partagés",
  shTaskT: "Devoir enregistré ✓", shMineArea: "Partager avec le cours", shAutoT: "Partage automatique",
  chatBtn: "Discuter", chatCourse: "Chat du cours", chatT: "💬 Discussion", chatTC: "💬 Chat du cours", chatPh: "Écrire un message…", chatEmpty: "Pas encore de messages. Une question, une astuce, une réponse – lancez-vous !",
  chatDel: "Message supprimé", chatReply: "Répondre", chatReplyTo: n => "En réponse à " + n, chatStar: "Utile", chatStarT: "Marquer comme réponse utile (+2 pour l’auteur)", chatStarred: "Marqué utile ⭐", chatDelQ: "Supprimer ce message ?",
  chatReact: "Réagir", chatsT: "💬 Chats et discussions", chatsBtn: "Chats", chatsNone: "Pas encore de discussions dans vos cours", chatMsgs: n => n + " messages", chatYou: "vous",
  lgStar: (f, r) => f + " a marqué votre réponse comme utile" + (r ? " dans « " + r + " »" : ""),
  chvT: "💬 Chats", chvHint: "Chaque cours a un chat général, et chaque devoir du cours a sa propre discussion.", chvSearch: "Chercher un cours ou un devoir", chvGeneral: "Le chat général du cours", chvGeneralSub: "Questions, nouvelles et organisation pour tout le cours",
  chvTasks: n => "Discussions des devoirs" + (n ? " (" + n + ")" : ""), chvMore: n => n + " devoirs de plus", chvLess: "Moins", chvNoMsg: "Pas encore de messages · ouvrir", chvDue: d => "À rendre " + d, chvNone: "Aucun cours ni devoir trouvé",
  chvUnread: n => n + " nouveaux", chBread: "Chat général", chDisc: "Discussion du devoir",
  socNet: "Serveur de la communauté injoignable pour l’instant", socLoading: "Chargement…", socRanksT: "Rangs", socJoinBtn: "Rejoindre la communauté",
});

/* ---------- state and the server ---------- */
const ST = { queue: LS.get("socTQ", []).filter(k => typeof k === "string").slice(-20), chf: LS.get("socChF", "act"), ov: LS.get("socOv", null), at: 0, busy: null, board: { cid: "", per: "sem", deg: "" }, queue: [] };
const hex = n => [...crypto.getRandomValues(new Uint8Array(n))].map(b => b.toString(16).padStart(2, "0")).join("");
/* a community account is made only when someone presses "join" (create = true). Anywhere else, no id = wait for sync – never a silent new account
   (a second, empty account that sync then spreads to the other devices is how points got "lost") */
function ensureId(create) {
  if (!P.soc_id) { if (!create) return null; P.soc_id = { uid: hex(16), sec: hex(24) }; savePrefs(); useHit("socNewId"); }
  const h = LS.get("socIds", []) || [];                       // every id this device ever had (kept here, never synced): a safety net for the points
  if (!h.some(x => x.uid === P.soc_id.uid)) LS.set("socIds", h.concat([{ uid: P.soc_id.uid, sec: P.soc_id.sec, at: Date.now() }]).slice(-8));
  return P.soc_id;
}
/* ids this device used before (if sync ever replaced one) that the server hasn't folded in yet */
function oldIds() {
  const cur = (ensureId() || {}).uid, done = LS.get("socMerged", []) || [];
  const all = (P.soc_old || []).concat(LS.get("socIds", []) || []).filter(x => x && x.uid !== cur && !done.includes(x.uid));
  return all.filter((x, i) => all.findIndex(y => y.uid === x.uid) === i).slice(-8).map(x => ({ uid: x.uid, sec: x.sec }));
}
const prof = () => P.soc_prof || { deg: "", yr: "" };
const myName = () => ((V.data && V.data.user) || "").trim();
async function api(op, body) {
  const id = ensureId(); if (!id) { syncSoon(500); throw Object.assign(new Error("noid"), { status: 0 }); }
  const pr = prof(), ctl = new AbortController(), tm = setTimeout(() => ctl.abort(), 12000);
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
  const old = oldIds();
  ST.busy = api("overview", Object.assign({ courses: myCourses().map(c => ({ id: c.id, name: shortName(c.name) })), ns: LS.get("socNs", 0) }, old.length ? { old } : {}))
    .then(o => {
      if (Array.isArray(o.merged) && o.merged.length) {          // the server folded them into this id: never send them again
        LS.set("socMerged", (LS.get("socMerged", []) || []).concat(o.merged).slice(-40));
        P.soc_old = (P.soc_old || []).filter(x => !o.merged.includes(x.uid)); savePrefs(); useHit("socMerged");
        if (o.me && o.me.all) toast(t("socMergedT"));
      }
      ST.ov = o; ST.err = false; LS.set("socOv", o); LS.set("socPts", (o.me && o.me.all) || 0); render(); if (!$("#sheet").hidden) SOC.card(); notesCheck(o.notes); return o; })
    .catch(e => { ST.err = true; return null; }).finally(() => { ST.busy = null; });
  return ST.busy;
}
const cdata = cid => (ST.ov && ST.ov.c && ST.ov.c[String(cid)]) || null;
const muted = uid => (P.soc_mute || []).some(m => m.uid === uid);
const isMe = uid => P.soc_id && P.soc_id.uid === uid;
const isMeName = n => !!n && n === myName();

/* ---------- labels ---------- */
const degLabel = d => !d ? "" : d.startsWith("x:") ? d.slice(2) : I18N.he["dg_" + d] ? t("dg_" + d) : d;
const profLine = (deg, yr) => [degLabel(deg), yr ? t("yr" + yr) : ""].filter(Boolean).join(" · ");
function rankOf(pts) { let i = 0; RANKS.forEach((r, k) => { if (pts >= r[0]) i = k; }); return { i, emo: RANKS[i][1], name: t(RANKS[i][2]), next: RANKS[i + 1] || null }; }
const rankTag = pts => { const r = rankOf(pts || 0); return '<span class="srk r' + r.i + '">' + r.emo + " " + esc(r.name) + "</span>"; };
const fmtH = h => String(Math.round(h * 10) / 10).replace(/\.0$/, "");
const nameBtn = (uid, name) => '<button class="sname" data-socu="' + esc(uid) + '"><bdi>' + esc(name || t("lgSomeone")) + "</bdi></button>";
const shortDate = ts => { try { return new Date(ts * 1000).toLocaleDateString(t("locale"), { day: "numeric", month: "numeric" }); } catch (e) { return ymd(ts); } };

/* ---------- how long tasks take ---------- */
const timeable = x => isAct(x);
/* what others reported: [average hours, reports], or null. Shown from the first report, unless the only one is mine */
function estV(x) { const c = cdata(x.cid), v = c && c.t && c.t[x.key]; return v && v[1] >= MIN_N && !(v[1] === 1 && myRep(x.key) !== undefined) ? v : null; }
function est(x) { const v = estV(x); return v ? v[0] : 0; }
function badge(x) {
  const v = estV(x); if (!v) return "";
  return '<span class="sest" title="' + esc(t("estTitle", fmtH(v[0]), v[1])) + '">' + ic("hourglass") + "<span>" + esc(t("estBadge", fmtH(v[0]), v[1])) + "</span></span>";
}
const asked = k => (P.soc_asked || []).includes(k);
function markAsked(k) { if (!asked(k)) { P.soc_asked = (P.soc_asked || []).concat(k).slice(-400); savePrefs(); } }
/* what I reported for each task (synced): the "how long did it take" button shows it, and it can be changed any time */
const myRep = k => (P.soc_rep || {})[k];
const repLbl = h => { const r = HOURS.find(x => x[0] === h); return r ? r[1] + " " + t(r[2]) : ""; };
/* how: "auto" (Moodle now shows it submitted: asked once), "done" (marked done by hand: asked unless already reported), "me" (the button: always) */
/* reporting closes 12 hours after the deadline: a report after that helps nobody plan (and shouldn't earn points). The 12 hours = submitted at the last minute, asked at the next refresh */
const TIME_GRACE = 12 * 3600;
const timeOpen = x => !x.due || nowS() < x.due + TIME_GRACE;
function askTime(key, how) {
  const x = V.data && V.data.tasks.find(y => y.key === key);
  if (!timeable(x)) return false;
  if (!timeOpen(x)) { if (how === "me") toast(t("socTimeLate")); return false; }
  if (how !== "me" && (myRep(key) !== undefined || (how !== "done" && asked(key)))) return false;
  const cur = myRep(key);
  sheet("socTime", '<h3><span>' + esc(t(cur !== undefined ? "socTimeT2" : "socTimeT")) + "</span>" + xbtn() + '</h3><div class="hint"><bdi>' + esc(x.name) + "</bdi> · <bdi>" + esc(shortName(x.course)) + "</bdi></div>" +
    '<div class="stime">' + HOURS.map(h => '<button data-soch="' + h[0] + '"' + (cur === h[0] ? ' class="on" aria-pressed="true"' : "") + '><span class="e">' + h[1] + "</span><span>" + esc(t(h[2])) + "</span></button>").join("") + "</div>" +
    '<div class="hint" style="text-align:center">' + esc(t("socTimeHint")) + '</div><button class="link" data-socx style="width:100%;margin-top:4px">' + esc(t("socSkip")) + "</button>");
  ST.timeKey = key; markAsked(key); return true;
}
/* the button on every submitted task (and on the course page): report, or change what was reported */
function timeBtn(x) {
  if (!timeable(x) || !(x.status === "submitted" || isDone(x))) return "";
  const h = myRep(x.key);
  if (!timeOpen(x)) return h !== undefined ? '<span class="stbtn on locked" title="' + esc(t("socTimeLate")) + '">' + ic("hourglass") + '<span class="at">' + esc(repLbl(h)) + "</span></span>" : "";
  return '<button class="stbtn' + (h !== undefined ? " on" : "") + '" data-soctime="' + esc(x.key) + '">' + ic("hourglass") + '<span class="at">' + esc(h !== undefined ? repLbl(h) : t("socTimeAsk")) + "</span></button>";
}
async function sendTime(h) {
  const x = V.data && V.data.tasks.find(y => y.key === ST.timeKey); close("socTime"); if (!x) return;
  try { const r = await api("time", { cid: x.cid, aid: x.key, h, ref: x.name, cname: shortName(x.course), due: x.due || 0 }); useHit("socTimeRep");
    P.soc_rep = Object.assign({}, P.soc_rep || {}, { [x.key]: h }); const ks = Object.keys(P.soc_rep); if (ks.length > 400) for (const k of ks.slice(0, ks.length - 400)) delete P.soc_rep[k];
    savePrefs(); render(); toast(t(r.first ? "socThanks" : "socThanks0")); overview(true); }
  catch (e) { toast(t(e.message === "late" ? "socTimeLate" : "socNet")); }
}
function afterFetch(d, prevSt) {
  overview();
  if (!prevSt) return;
  for (const x of d.tasks) if (timeable(x) && timeOpen(x) && x.status === "submitted" && prevSt[x.key] && prevSt[x.key] !== "submitted" && !asked(x.key) && myRep(x.key) === undefined && !ST.queue.includes(x.key)) ST.queue.push(x.key);
  LS.set("socTQ", ST.queue.slice(-20)); timeQueue();
}
/* ask about the newly submitted ones one at a time, when nothing else is open (kept across restarts until asked) */
let tqTimer = 0;
function timeQueue(delay) {
  clearTimeout(tqTimer); if (!ST.queue.length) return;
  tqTimer = setTimeout(() => {
    if ($$(".sheet").some(s => !s.hidden) || !$("#tour").hidden || !$("#setup").hidden || document.hidden) return timeQueue(3000);
    while (ST.queue.length) { const k = ST.queue.shift(); LS.set("socTQ", ST.queue); if (askTime(k, "auto")) break; }
  }, delay || 1500);
}

/* ---------- when I open the app: someone starred my message ---------- */
let noteTimer = 0;
function notesCheck(L) {
  const seen = LS.get("socNs", 0), fresh = (Array.isArray(L) ? L : []).filter(n => n && n.kind === "star" && n.at > seen);
  if (!fresh.length) return;
  clearTimeout(noteTimer);
  noteTimer = setTimeout(function tryShow() {             // when nothing else is open (the "how long did it take?" question goes first)
    if ($$(".sheet").some(s => !s.hidden) || !$("#tour").hidden || !$("#setup").hidden || document.hidden || ST.queue.length) { noteTimer = setTimeout(tryShow, 3000); return; }
    showNotes(fresh);
  }, 1800);
}
function showNotes(L) {
  LS.set("socNs", Math.max(LS.get("socNs", 0), ...L.map(n => n.at))); useHit("socNoteShown");
  const rows = L.slice(0, 6).map(n => {
    const where = chatTitle(Number(n.cid), n.tk) || n.ref;
    return '<div class="snote"><div>' + esc(t("noteStar", n.name || t("lgSomeone"), where || "")) + "</div>" + (n.body ? '<div class="sq"><bdi>' + esc(n.body) + "</bdi></div>" : "") +
      '<button class="link" data-socchat="' + esc(n.cid) + "|" + esc(n.tk) + '">' + esc(t("noteGo")) + "</button></div>";
  }).join("");
  sheet("socNote", "<h3><span>" + esc(t(L.length > 1 ? "noteT2" : "noteT", L.length)) + "</span>" + xbtn() + "</h3>" + rows +
    '<div class="hint" style="text-align:center">' + esc(t("notePts", L.length * 2)) + '</div><button class="primary" data-socx style="width:100%;margin-top:8px">' + esc(t("noteOk")) + "</button>");
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
  savePrefs(); render(); toast(t("socAdded")); useHit("socAddShared");
  api("add", { id }).then(() => overview(true)).catch(() => {});
}
function ignoreShared(id) { P.soc_ign = (P.soc_ign || []).concat(id).slice(-500); savePrefs(); render(); }
// sharing: after adding a quiz / task to a course, a big "share with the course" button (or automatically, if chosen)
const findItem = (kind, id) => (kind === "xq" ? P.xq || [] : P.mine || []).find(x => x.id === id);
const courseOf = cid => ((V.data && V.data.courses) || []).find(x => x.id === cid);
function shareBody(kind, item) {
  const c = courseOf(item.cid), cname = c ? shortName(c.name) : "";
  const b = kind === "xq"
    ? { cid: item.cid, cname, kind: "xq", at: xqTs(item), d: { n: t("xq_" + item.k) + (item.note ? " · " + item.note : ""), k: item.k, note: item.note || "", s: item.at, allDay: !parseDT(item.at) } }
    : { cid: item.cid, cname, kind: "task", at: item.due, d: { n: item.title, note: (item.note || "").slice(0, 200) } };
  if (item.sid) b.id = item.sid;
  return b;
}
async function shareItem(kind, id, quiet) {
  const item = findItem(kind, id); if (!item) return;
  if (!(item.cid > 0)) { toast(t("shNoCourse")); return; }
  try {
    const r = await api("share", shareBody(kind, item)), live = findItem(kind, id);
    if (live && r.id) { live.sid = r.id; savePrefs(); }
    if (!quiet) { toast(t("socShareOn")); useHit(kind === "xq" ? "socShareXq" : "socShareTask"); } overview(true); refreshForms();
  } catch (e) { toast(t("socNet")); }
}
function stopSharing(kind, id) { const item = findItem(kind, id); if (!item || !item.sid) return; unshare(item); delete item.sid; savePrefs(); toast(t("socShareOff")); refreshForms(); }
function refreshForms() { if (!$("#exSheet").hidden && typeof renderXq === "function") renderXq(); if (!$("#mineSheet").hidden && ST.mineOpen) $("#mineSoc").innerHTML = mineShare(findItem("mine", ST.mineOpen)); render(); }
async function afterSave(kind, item, isNew) {
  if (!(item.cid > 0)) return;
  if (item.sid) return shareItem(kind, item.id, true);              // an edit of something shared: everyone gets the change
  if (!isNew) return;
  if (P.soc_auto) return shareItem(kind, item.id);
  askShare(kind, item);
}
function askShare(kind, item) {
  const c = courseOf(item.cid), when_ = kind === "xq" ? (parseDT(item.at) ? when(xqTs(item)) : dayDate(xqTs(item))) : when(item.due);
  const what = kind === "xq" ? t("xq_" + item.k) + (item.note ? " · " + item.note : "") : item.title;
  sheet("socShare", "<h3><span>" + esc(t(kind === "xq" ? "shT" : "shTaskT")) + "</span>" + xbtn() + "</h3>" +
    '<div class="shitem" style="--c:' + colorOf(item.cid) + '"><i></i><div><b><bdi>' + esc(what) + '</bdi></b><small><bdi>' + esc(c ? shortName(c.name) : "") + "</bdi> · " + esc(when_) + "</small></div></div>" +
    '<button class="shbig" data-socsh="' + kind + "|" + esc(item.id) + '">' + ic("megaphone") + '<span><b>' + esc(t("shBig")) + "</b><small>" + esc(t("shBigSub")) + "</small></span></button>" +
    '<label class="socchk"><input type="checkbox" id="socAutoBox"' + (P.soc_auto ? " checked" : "") + "><span>" + esc(t("shAuto")) + "</span></label>" +
    '<button class="link" data-socx style="width:100%;margin-top:4px">' + esc(t("shLater")) + "</button>");
  $("#socAutoBox").onchange = e => setAuto(e.target.checked);
}
function setAuto(on) { P.soc_auto = !!on; savePrefs(); if (on) toast(t("shAutoOn")); if (V.spage === "soc") page(); }
// in the quiz list: shared / share
function xqShareBtn(q) {
  if (!(q.cid > 0) || q.from) return "";
  return q.sid ? '<button class="sshtag on" data-socunsh="xq|' + esc(q.id) + '" title="' + esc(t("shUnshare")) + '">' + ic("megaphone") + "<span>" + esc(t("shShared")) + "</span></button>"
    : '<button class="sshtag" data-socsh="xq|' + esc(q.id) + '">' + ic("megaphone") + "<span>" + esc(t("shBtn")) + "</span></button>";
}
// in the my-task form (editing an existing task)
function mineShare(m) {
  ST.mineOpen = m ? m.id : null;
  if (!m || !(m.cid > 0) || m.from) return "";
  return m.sid ? '<div class="shrow"><span class="sshtag on">' + ic("megaphone") + "<span>" + esc(t("shShared")) + '</span></span><button class="link" data-socunsh="mine|' + esc(m.id) + '">' + esc(t("shUnshare")) + "</button></div>"
    : '<button class="shbig sm" data-socsh="mine|' + esc(m.id) + '">' + ic("megaphone") + "<span><b>" + esc(t("shBig")) + "</b></span></button>";
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
  try { const r = await api("wa", { cid, url, cname: c ? shortName(c.name) : "" }); useHit(del ? "socWaDel" : "socWaSet"); close("socWa"); toast(del ? t("waRemoved") : t("waSaved") + (r.pts ? " · \u2066+" + r.pts + "\u2069" : "")); await overview(true); if (V.spage === "soc") page(); }
  catch (e) { $("#socWaErr").textContent = t("socNet"); $("#socWaErr").hidden = false; }
}

/* ---------- the tasks tab: shared tasks, and the WhatsApp group of the course in focus ---------- */
function renderTop(now) {
  const bd = $("#chatBadge"), tu = totalUnread(); if (bd) { bd.hidden = !tu; bd.textContent = tu; }
  const el = $("#socTop"); if (!el) return;
  const L = offers("task", now), f = V.focus && V.focus.kind === "course" ? V.focus.cid : null;
  el.innerHTML = (f ? '<div class="sfocus">' + chatBtnCourse(f) + waBar(f) + "</div>" : "") + (L.length ? '<div class="soffers">' + L.map(offerHTML).join("") + "</div>" : "");
}

/* ---------- chat: a discussion for every task, and a chat for every course ---------- */
const seenK = (cid, tk) => cid + "|" + tk;
const thInfo = (cid, tk) => { const c = cdata(cid), v = c && c.th && c.th[tk]; return v ? { n: v[0], last: v[1], ref: v[2], lb: v[3] || "", lt: v[4] || "" } : { n: 0, last: 0, ref: "", lb: "", lt: "" }; };
function unread(cid, tk) { const seen = LS.get("socSeen", {}), k = seenK(cid, tk), n = thInfo(cid, tk).n; return k in seen ? Math.max(0, n - seen[k]) : tk === "c" ? n : 0; }
function markSeen(cid, tk, n) { const seen = LS.get("socSeen", {}); seen[seenK(cid, tk)] = n; const ks = Object.keys(seen); if (ks.length > 400) delete seen[ks[0]]; LS.set("socSeen", seen); }
const chattable = x => x && x.cid > 0 && !x.mine;
function taskAct(x) {
  const tb = timeBtn(x);
  if (!chattable(x)) return tb;
  const n = thInfo(x.cid, x.key).n, u = unread(x.cid, x.key);
  return tb + '<button data-socchat="' + x.cid + "|" + esc(x.key) + '">' + ic("message-square") + '<span class="at">' + esc(t("chatBtn")) + "</span>" + (n ? '<span class="scnt' + (u ? " new" : "") + '">' + n + "</span>" : "") + "</button>";
}
function chatBtnCourse(cid) {
  const n = thInfo(cid, "c").n, u = unread(cid, "c");
  return '<button class="schatc" data-socchat="' + cid + '|c">' + ic("message-square") + "<span>" + esc(t("chatCourse")) + "</span>" + (n ? '<span class="scnt' + (u ? " new" : "") + '">' + (u || n) + "</span>" : "") + "</button>";
}
/* the community part of a task's page: how long it took others, what I reported, and its discussion */
function taskSoc(x) {
  let h = "";
  if (timeable(x)) {
    const v = estV(x), mine = myRep(x.key);
    h += '<div class="tksest">' + ic("hourglass") + "<span>" + (v ? esc(t("tkEst", fmtH(v[0]), v[1])) : esc(t(mine !== undefined ? "tkEstMine" : "tkEstNone"))) + "</span></div>";
    const tb = timeBtn(x);
    const all = cdata(x.cid), av = all && all.t && all.t[x.key];
    if (av && av[1] > 0) h += '<button class="crsli" data-soctimes="' + esc(x.key) + '">' + ic("users") + '<span class="sw"><b>' + esc(t("tkWho", av[1])) + "</b><small>" + esc(t("tkWhoSub")) + "</small></span></button>";
    h += !timeOpen(x) ? (tb ? '<div class="tksrow">' + tb + "</div>" : "") + '<p class="hint">' + esc(t("socTimeLate")) + "</p>"
      : tb ? '<div class="tksrow">' + tb + '<span class="hint">' + esc(t(mine !== undefined ? "tkRepChange" : "tkRepAsk")) + "</span></div>" : '<p class="hint">' + esc(t("tkAfter")) + "</p>";
  }
  if (chattable(x)) {
    const i = thInfo(x.cid, x.key), u = unread(x.cid, x.key);
    h += '<button class="crsli" data-socchat="' + x.cid + "|" + esc(x.key) + '">' + ic("message-square") + '<span class="sw"><b>' + esc(t("tkChat")) + (i.n ? ' <span class="scnt' + (u ? " new" : "") + '">' + i.n + "</span>" : "") + "</b><small>" +
      (i.n && i.lt ? "<bdi>" + esc(i.lb ? i.lb + ": " : "") + esc(i.lt) + "</bdi>" : esc(t("tkChatNone"))) + "</small></span></button>";
  }
  return h;
}
/* who reported how long a task took, and what they said */
async function openTimes(key) {
  const x = V.data && V.data.tasks.find(y => y.key === key); if (!x) return;
  useHit("socTimes");
  const head = "<h3><span>" + esc(t("tmT")) + "</span>" + xbtn() + '</h3><div class="hint"><bdi>' + esc(x.name) + "</bdi> · <bdi>" + esc(shortName(x.course)) + "</bdi></div>";
  sheet("socTimes", head + '<div class="hint">' + esc(t("socLoading")) + "</div>");
  let r; try { r = await api("times", { cid: x.cid, aid: x.key }); } catch (e) { sheet("socTimes", head + '<p class="err">' + esc(t("socNet")) + "</p>"); return; }
  const rows = (r.rows || []).filter(z => !muted(z.uid)), n = rows.length;
  const bars = HOURS.map(hh => { const c = rows.filter(z => z.h === hh[0]).length;
    return '<div class="tmb"><span class="l">' + hh[1] + " " + esc(t(hh[2])) + '</span><span class="b"><i style="width:' + (n ? Math.round(c / n * 100) : 0) + '%"></i></span><span class="n">' + c + "</span></div>"; }).join("");
  const list = rows.map(z => '<div class="tmr"><div class="sw">' + (isMe(z.uid) ? "<b>" + esc(t("chatYou")) + "</b>" : nameBtn(z.uid, z.name)) + (profLine(z.deg, z.yr) ? '<small class="sprof">' + esc(profLine(z.deg, z.yr)) + "</small>" : "") + "</div>" +
    '<span class="tma">' + esc(repLbl(z.h)) + "</span><small>" + esc(shortDate(Math.floor(z.at / 1000))) + "</small></div>").join("");
  sheet("socTimes", head + (n ? '<div class="tmbars">' + bars + "</div>" + '<div class="stitle">' + esc(t("tmWho", n)) + "</div>" + list : '<p class="hint">' + esc(t("tkEstNone")) + "</p>"));
}
/* the community part of a course's page: its chat, its WhatsApp group and its leaderboard */
function crsLinks(cid) {
  const n = thInfo(cid, "c").n, u = unread(cid, "c"), tn = Object.keys((cdata(cid) || {}).th || {}).filter(k => k !== "c").length;
  return '<div class="crsoc">' + chatBtnCourse(cid) + '<button class="crsbtn" data-socboard="' + cid + '">' + ic("trophy") + "<span>" + esc(t("crsBoard")) + "</span></button>" + "</div>" +
    '<p class="hint">' + esc(n || tn ? t("crsChatN", n, tn) : t("crsChatNone")) + (u ? " · " + esc(t("chvUnread", u)) : "") + "</p>" + waBar(cid);
}
function totalUnread() { let n = 0; for (const c of myCourses()) { const cd = cdata(c.id); if (!cd || !cd.th) continue; for (const tk in cd.th) n += unread(c.id, tk); } return n; }
function chatTitle(cid, tk) {
  if (tk === "c") { const c = courseOf(cid); return c ? shortName(c.name) : ""; }
  const x = V.data && V.data.tasks.find(y => y.key === tk); return x ? x.name : thInfo(cid, tk).ref;
}
function openChat(cid, tk) {
  const c = courseOf(cid), title = chatTitle(cid, tk);
  if (ST.chat && ST.chat.timer) clearInterval(ST.chat.timer);
  ST.chat = { cid, tk, title, ver: null, msgs: [], reply: 0 };
  const x = tk !== "c" && V.data ? V.data.tasks.find(y => y.key === tk) : null;
  const el = sheet("socChat", "<h3><span>" + esc(tk === "c" ? t("chatTC") : "💬 " + title) + "</span>" + xbtn() + '</h3><div class="schsub" style="--c:' + colorOf(cid) + '"><i></i>' + (c ? '<button class="bc" data-crs="' + cid + '"><bdi>' + esc(shortName(c.name)) + "</bdi></button>" : '<bdi class="bc"></bdi>') +
    '<span class="sep">›</span>' + (tk === "c" ? "<span>" + esc(t("chBread")) + "</span>" : "<span>" + esc(x ? typeLabel(x) : t("chDisc")) + "</span>" + (x && x.due ? '<span class="sep">·</span><span>' + esc(t("chvDue", shortDate(x.due))) + "</span>" : "") + (x ? '<button class="link schtk" data-tkgo="' + esc(x.key) + '">' + esc(t("tkPageBtn")) + "</button>" : "")) + '</div><div class="schl" id="socChL"><div class="hint">' + esc(t("socLoading")) + "</div></div>" +
    '<div class="schc"><div class="schrep" id="socRep" hidden></div><div class="schin"><textarea id="socTx" rows="1" maxlength="2000" placeholder="' + esc(t("chatPh")) + '"></textarea>' +
    '<button class="primary" data-socsend aria-label="send">' + ic("send") + "</button></div></div>");
  el.classList.add("chat");
  const tx = $("#socTx");
  tx.oninput = () => { tx.style.height = "auto"; tx.style.height = Math.min(tx.scrollHeight, 120) + "px"; };
  tx.onkeydown = e => { if (e.key === "Enter" && !e.shiftKey && matchMedia("(pointer: fine)").matches) { e.preventDefault(); sendMsg(); } };
  loadChat(true);
  ST.chat.timer = setInterval(() => { if (!ST.chat || el.hidden) { clearInterval(ST.chat && ST.chat.timer); return; } if (!document.hidden) loadChat(false); }, 6000);
  useHit("socChat");
}
async function loadChat(force) {
  const ch = ST.chat; if (!ch) return;
  let r; try { r = await api("thread", Object.assign({ cid: ch.cid, tk: ch.tk }, force || ch.ver === null ? {} : { ver: ch.ver })); }
  catch (e) { if (force) $("#socChL").innerHTML = '<div class="hint">' + esc(t("socNet")) + "</div>"; return; }
  if (ST.chat !== ch || r.same) return;
  ch.ver = r.ver; ch.msgs = r.msgs; drawChat();
  const n = r.msgs.filter(m => !m.del).length; markSeen(ch.cid, ch.tk, n);
  const cd = cdata(ch.cid); if (cd) { cd.th = cd.th || {}; const lm = [...r.msgs].reverse().find(m => !m.del);
    if (n && lm) cd.th[ch.tk] = [n, lm.at, (cd.th[ch.tk] || [])[2] || ch.title, lm.name, lm.body.replace(/\s+/g, " ").slice(0, 90)]; else delete cd.th[ch.tk]; }
  if (V.view === "chat") chatView(); renderTop(nowS());
}
const linkify = h => h.replace(/(https?:\/\/[^\s<]+)/g, u => '<a href="' + u + '" target="_blank" rel="noopener noreferrer" dir="ltr">' + u + "</a>");
function msgTime(ms) { const d = new Date(ms), now = new Date(); const hm = d.toLocaleTimeString(t("locale"), { hour: "2-digit", minute: "2-digit" });
  return d.toDateString() === now.toDateString() ? hm : d.toLocaleDateString(t("locale"), { day: "numeric", month: "numeric" }) + " " + hm; }
function drawChat() {
  const ch = ST.chat, el = $("#socChL"); if (!el) return;
  const atEnd = el.scrollHeight - el.scrollTop - el.clientHeight < 80 || !el.dataset.drawn;
  const byId = Object.fromEntries(ch.msgs.map(m => [m.id, m]));
  const L = ch.msgs.filter(m => !muted(m.uid));
  el.innerHTML = L.length ? L.map(m => {
    const mine = isMe(m.uid), rp = m.reply && byId[m.reply];
    return '<div class="sm' + (mine ? " me" : "") + '" id="sm' + m.id + '"><div class="smh">' + (mine ? "<b>" + esc(t("chatYou")) + "</b>" : nameBtn(m.uid, m.name)) + rankTag(m.total) + '<small>' + esc(msgTime(m.at)) + "</small></div>" +
      (rp ? '<div class="sq"><b><bdi>' + esc(rp.name) + "</bdi></b> " + esc(rp.del ? t("chatDel") : rp.body.slice(0, 90)) + "</div>" : "") +
      '<div class="smb' + (m.del ? " del" : "") + '">' + (m.del ? esc(t("chatDel")) : linkify(esc(m.body))) + "</div>" +
      (m.del ? "" : '<div class="smf">' + m.re.map(r => '<button class="sre' + (r[2] ? " on" : "") + '" data-socemo="' + m.id + "|" + r[0] + '">' + r[0] + " " + r[1] + "</button>").join("") +
        (mine || isMeName(m.name) ? (m.stars ? '<span class="sstar on">' + ic("star") + m.stars + "</span>" : "") : '<button class="sstar' + (m.starred ? " on" : "") + '" data-socstar="' + m.id + '" title="' + esc(t("chatStarT")) + '">' + ic("star") + "<span>" + esc(t("chatStar")) + "</span>" + (m.stars ? " " + m.stars : "") + "</button>") +
        '<button class="sic" data-socpick="' + m.id + '" aria-label="' + esc(t("chatReact")) + '">' + ic("smile-plus") + '</button><button class="sic" data-socrep="' + m.id + '" aria-label="' + esc(t("chatReply")) + '">' + ic("reply") + "</button>" +
        (mine ? '<button class="sic" data-socmdel="' + m.id + '" aria-label="delete">' + ic("trash-2") + "</button>" : "") + "</div>") +
      (!m.del && m.stars && (m.sb || []).length ? '<div class="ssb">' + ic("star") + "<span>" + esc(t("chatStarBy", m.sb.map(n => isMeName(n) ? t("chatYou") : n || t("lgSomeone")).join(", "))) + "</span></div>" : "") + "</div>";
  }).join("") : '<div class="hint schempty">' + esc(t("chatEmpty")) + "</div>";
  el.dataset.drawn = "1";
  if (atEnd) el.scrollTop = el.scrollHeight;
}
function setReply(id) {
  const ch = ST.chat, m = ch && ch.msgs.find(x => x.id === id), el = $("#socRep"); if (!el) return;
  ch.reply = m ? id : 0; el.hidden = !m;
  el.innerHTML = m ? "<span>" + esc(t("chatReplyTo", m.name || t("lgSomeone"))) + ": <i>" + esc(m.body.slice(0, 60)) + '</i></span><button class="sic" data-socrepx aria-label="x">' + ic("x") + "</button>" : "";
  if (m) $("#socTx").focus();
}
async function sendMsg() {
  const ch = ST.chat, tx = $("#socTx"), body = (tx.value || "").trim(); if (!ch || !body) return;
  const btn = $("[data-socsend]"); btn.disabled = true;
  try { await api("post", { cid: ch.cid, tk: ch.tk, body, reply: ch.reply || 0, ref: ch.tk === "c" ? "" : ch.title, cname: (courseOf(ch.cid) ? shortName(courseOf(ch.cid).name) : "") });
    useHit(ch.tk === "c" ? "socMsgCourse" : "socMsgTask"); tx.value = ""; tx.style.height = "auto"; setReply(0); $("#socChL").dataset.drawn = ""; await loadChat(true); }
  catch (e) { toast(t("socNet")); } finally { btn.disabled = false; }
}
async function chatAct(op, body) { try { await api(op, body); useHit(op === "star" ? "socStar" : op === "react" ? "socReact" : "socMsgDel"); if (op === "star") toast(t("chatStarred")); await loadChat(true); } catch (e) { toast(t("socNet")); } }
function pickEmoji(id) {
  const old = $(".spick"); if (old) { const same = old.dataset.mid === String(id); old.remove(); if (same) return; }
  const row = document.createElement("div"); row.className = "spick"; row.dataset.mid = id;
  row.innerHTML = ["👍", "❤️", "🔥", "😂", "🙏"].map(e => '<button data-socemo="' + id + "|" + e + '">' + e + "</button>").join("");
  const m = $("#sm" + id); if (m) m.appendChild(row);
}
function chatView() {
  const el = $("#chatList"); if (!el) return;
  const typing = document.activeElement && document.activeElement.id === "chq" ? document.activeElement.selectionStart : null;
  if (!ST.ov) { el.innerHTML = '<div class="hint" style="padding:20px;text-align:center">' + esc(t("socLoading")) + "</div>"; overview(); return; }
  /* one list, like WhatsApp: every conversation is a row that says plainly where it belongs (a course's chat, or a task's discussion inside a course) */
  const now = nowS(), q = (ST.chq || "").trim().toLowerCase(), f = ["act", "course", "task"].includes(ST.chf) ? ST.chf : "act";
  const rows = [];
  for (const c of myCourses()) {
    const cd = cdata(c.id) || {}, th = cd.th || {}, cname = shortName(c.name);
    rows.push({ kind: "c", c, cname, tk: "c", title: cname, i: thInfo(c.id, "c"), u: unread(c.id, "c"), wa: cd.wa });
    const seen = new Set();
    for (const x of ((V.data && V.data.tasks) || []).filter(x => x.cid === c.id && chattable(x))) {
      const i = thInfo(c.id, x.key); if (!(i.n > 0 || (!isDone(x) && (!x.due || x.due > now - 2 * DAY)))) continue;
      seen.add(x.key); rows.push({ kind: "t", c, cname, tk: x.key, x, title: x.name, i, u: unread(c.id, x.key) });
    }
    for (const tk in th) if (tk !== "c" && !seen.has(tk)) rows.push({ kind: "t", c, cname, tk, x: null, title: th[tk][2] || tk, i: thInfo(c.id, tk), u: unread(c.id, tk) });
  }
  const match = r => !q || (r.title + " " + r.cname).toLowerCase().includes(q);
  const pass = r => q ? true : f === "act" ? r.i.n > 0 : f === "course" ? r.kind === "c" : r.kind === "t";
  const L = rows.filter(r => match(r) && pass(r)).sort((a, b) => (b.u > 0) - (a.u > 0) || b.i.last - a.i.last ||
    (f === "task" ? ((a.x && a.x.due) || 9e9) - ((b.x && b.x.due) || 9e9) : 0) || (a.kind === "c" ? -1 : 0) - (b.kind === "c" ? -1 : 0) || a.title.localeCompare(b.title));
  const cnt = k => rows.filter(r => (k === "act" ? r.i.n > 0 : k === "course" ? r.kind === "c" : r.kind === "t")).length;
  const un = rows.reduce((n, r) => n + r.u, 0);
  const preview = i => i.n ? '<span class="chpv"><b><bdi>' + esc(i.lb && i.lb === myName() ? t("chatYou") : i.lb || "") + "</bdi>:</b> <bdi>" + esc(i.lt || "") + "</bdi></span>" : '<span class="chpv">' + esc(t("chvNoMsg")) + "</span>";
  const row = r => {
    const ini = (r.cname.replace(/^[^\p{L}\p{N}]+/u, "")[0] || "?").toUpperCase();
    const where = r.kind === "c" ? '<span class="chwhere"><span class="chtag">' + esc(t("chvTagCourse")) + "</span></span>"
      : '<span class="chwhere"><span class="chtag t">' + esc(t("chvTagTask")) + '</span> · <bdi>' + esc(r.cname) + "</bdi>" + (r.x && r.x.due ? " · " + esc(t("chvDue", shortDate(r.x.due))) : "") + "</span>";
    return '<button class="chrow2' + (r.u ? " un" : "") + '" data-socchat="' + r.c.id + "|" + esc(r.tk) + '" style="--c:' + colorOf(r.c.id) + '">' +
      '<span class="chav">' + esc(ini) + (r.kind === "t" ? '<i class="chsubic">' + ic(r.x && r.x.type === "quiz" ? "circle-check" : "file-text") + "</i>" : "") + "</span>" +
      '<span class="sw"><span class="chl1"><b><bdi>' + esc(r.title) + "</bdi></b><small>" + esc(r.i.last ? msgTime(r.i.last) : "") + "</small></span>" + where +
      '<span class="chl3">' + preview(r.i) + (r.u ? '<span class="scnt new">' + r.u + "</span>" : "") + "</span></span></button>";
  };
  const chip = (k, lbl) => '<button class="chf' + (f === k ? " on" : "") + '" data-chf="' + k + '" aria-pressed="' + (f === k) + '">' + esc(lbl) + ' <span class="n">' + cnt(k) + "</span></button>";
  const empty = q ? t("chvNoMatch") : f === "act" ? t("chvNoAct") : t("chvNone");
  el.innerHTML = '<div class="chvh"><h2>' + esc(t("chvT")) + (un ? ' <span class="scnt new">' + esc(t("chvUnread", un)) + "</span>" : "") + "</h2>" + meBar() +
    '<input type="search" id="chq" placeholder="' + esc(t("chvSearch")) + '" value="' + esc(ST.chq || "") + '">' +
    (q ? "" : '<div class="chfs">' + chip("act", t("chvFAct")) + chip("course", t("chvFCourse")) + chip("task", t("chvFTask")) + "</div>") + "</div>" +
    (L.length ? '<div class="chlist">' + L.map(row).join("") + "</div>" : '<div class="chempty"><p>' + esc(empty) + "</p>" + (f === "act" && !q ? '<button class="primary" data-chf="course">' + esc(t("chvStart")) + "</button>" : "") + "</div>");
  const inp = $("#chq");
  inp.oninput = () => { ST.chq = inp.value; chatView(); };
  if (typing !== null) { inp.focus(); try { inp.setSelectionRange(typing, typing); } catch (e) {} }
  overview();
}
function openChats() {
  const rows = [];
  for (const c of myCourses()) {
    const cd = cdata(c.id) || {}, th = cd.th || {}, ts = Object.keys(th).filter(k => k !== "c").sort((a, b) => th[b][1] - th[a][1]).slice(0, 8);
    rows.push('<div class="schg" style="--c:' + colorOf(c.id) + '"><div class="schgh"><i></i><bdi>' + esc(shortName(c.name)) + "</bdi></div>" +
      chatRow(c.id, "c", t("chatCourse")) + ts.map(k => chatRow(c.id, k, chatTitle(c.id, k))).join("") + "</div>");
  }
  sheet("socChats", "<h3><span>" + esc(t("chatsT")) + "</span>" + xbtn() + "</h3>" + (rows.join("") || '<div class="hint">' + esc(t("chatsNone")) + "</div>"));
}
function chatRow(cid, tk, title) {
  const i = thInfo(cid, tk), u = unread(cid, tk);
  return '<button class="schr" data-socchat="' + cid + "|" + esc(tk) + '">' + ic(tk === "c" ? "users" : "message-square") + '<span class="sw"><bdi>' + esc(title) + "</bdi><small>" + esc(i.n ? t("chatMsgs", i.n) : t("chatEmpty").split(".")[0]) + "</small></span>" + (u ? '<span class="scnt new">' + u + "</span>" : "") + "</button>";
}

/* ---------- people: profile + points log, mute ---------- */
async function openUser(uid) {
  sheet("socUser", "<h3><span>" + esc(t("socLoading")) + "</span>" + xbtn() + "</h3>");
  let r; try { r = await api("user", { who: uid }); } catch (e) { $("#socUser .box").innerHTML = "<h3><span></span>" + xbtn() + '</h3><div class="hint">' + esc(t("socNet")) + "</div>"; return; }
  const u = r.u, me = isMe(u.uid), rk = rankOf(u.all);
  const desc = l => l.kind === "add" ? t("lgAdd", l.fname || t("lgSomeone"), l.ref) : l.kind === "time" ? t("lgTime", l.ref) : l.kind === "wa" ? t("lgWa") : l.kind === "star" ? t("lgStar", l.fname || t("lgSomeone"), l.ref) : l.kind;
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
/* my rank, points and how close the next rank is (the chats tab) */
function meBar() {
  const pts = (ST.ov && ST.ov.me && ST.ov.me.all) || LS.get("socPts", 0), sem = (ST.ov && ST.ov.me && ST.ov.me.sem) || 0, n = myName();
  return '<div class="chme"><div class="chme1"><span class="sav">' + esc((n || "?").charAt(0)) + '</span><div class="sw"><div>' + rankTag(pts) + ' <span class="spts">' + esc(t("socPts", pts)) + "</span>" +
    (sem && sem !== pts ? ' <small class="hint">' + esc(t("chmeSem", sem)) + "</small>" : "") + "</div>" + progress(pts) + "</div></div>" +
    '<div class="sbtns"><button data-socboard>' + ic("trophy") + "<span>" + esc(t("socBoards")) + '</span></button><button data-socme>' + ic("award") + "<span>" + esc(t("socMyPts")) + "</span></button></div></div>";
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
  useHit("socBoard");
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
  el.innerHTML = '<div class="sprofcard spc"><div class="sav">' + esc((n || "?").charAt(0)) + '</div><div class="sw"><b><bdi>' + esc(n) + '</bdi></b><div class="hint">' + esc(profLine(pr.deg, pr.yr)) + "</div>" +
    rankTag(pts) + ' <span class="spts">' + esc(t("socPts", pts)) + "</span>" + progress(pts) +
    '<div class="sbtns"><button data-socboard>' + ic("trophy") + "<span>" + esc(t("socBoards")) + '</span></button><button data-socme>' + ic("award") + "<span>" + esc(t("socMyPts")) + '</span></button><button data-socchats>' + ic("message-square") + "<span>" + esc(t("chatsBtn")) + "</span>" + (totalUnread() ? '<span class="scnt new">' + totalUnread() + "</span>" : "") + "</button></div></div></div>";
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
    (on ? '<label class="sswitch" style="margin-top:8px"><span><b>' + esc(t("shAutoT")) + '</b><small class="hint">' + esc(t("shAuto")) + '</small></span><input type="checkbox" id="socAutoPg"' + (P.soc_auto ? " checked" : "") + "></label>" +
      '<div class="stitle">' + esc(t("socProfT")) + "</div>" + profFields("socP") +
      '<div class="stitle">' + esc(t("socWaT")) + '</div><div class="swalist">' + (cs.map(c => { const cd = cdata(c.id) || {};
        return '<div class="swarow" style="--c:' + colorOf(c.id) + '"><i></i><bdi>' + esc(shortName(c.name)) + "</bdi>" + (cd.wa ? '<a class="swa sm" href="' + esc(cd.wa) + '" target="_blank" rel="noopener noreferrer">' + ic("message-circle") + "</a>" : '<small class="hint">' + esc(t("waNone")) + "</small>") +
          '<button class="link" data-socwa="' + c.id + '">' + esc(t(cd.wa ? "waEdit" : "waAdd")) + "</button></div>"; }).join("") || '<div class="hint">' + esc(t("noCourses")) + "</div>") + "</div>" +
      '<div class="stitle">' + esc(t("socMuteT")) + "</div>" + ((P.soc_mute || []).length ? P.soc_mute.map(m => '<div class="swarow"><bdi>' + esc(m.name) + '</bdi><button class="link" data-socmute="' + esc(m.uid) + '" data-n="' + esc(m.name) + '">' + esc(t("socUnmute")) + "</button></div>").join("") : '<div class="hint">' + esc(t("socMuteNone")) + "</div>") +
      '<div class="stitle">' + esc(t("socHowT")) + '</div><ul class="show">' + t("socHow").map(x => "<li>" + esc(x) + "</li>").join("") + "</ul>" +
      '<div class="stitle">' + esc(t("socRanksT")) + '</div><div class="sranks">' + RANKS.map((r, i) => '<span class="srk r' + i + '">' + r[1] + " " + esc(t(r[2])) + " · \u2066" + r[0] + "+\u2069</span>").join("") + "</div>" +
      (ST.err ? '<div class="hint">' + esc(t("socNet")) + "</div>" : "") + '<div class="hint" style="margin-top:10px">' + esc(t("socPriv")) + "</div>"
      : '<button class="primary" data-socjoin style="width:100%;margin-top:10px">' + esc(t("socJoinBtn")) + "</button>");
  $("#socOnBox").onchange = e => { if (e.target.checked) { e.target.checked = false; intro(true); } else { P.soc_on = false; savePrefs(); render(); page(); renderSheet(); } };
  if (on) $("#socAutoPg").onchange = e => setAuto(e.target.checked);
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
  if (!P.soc_id && syncOnNow() && M.token) {
    const t0 = Date.now(); try { await Promise.race([syncNow(), new Promise(r => setTimeout(r, 12000))]); } catch (e) {}
    const st = LS.get("syncState", null);
    if (!P.soc_id && !(st && st.s === "ok" && st.at >= t0)) {        // sync didn't answer: maybe there's an account from another device we haven't seen. Don't make a second one
      if (btn) btn.disabled = false; useHit("socJoinWait"); toast(t("socJoinWait"), 6000); return;
    }
  }
  P.soc_prof = p; P.soc_on = true; ensureId(true); savePrefs(); useHit("socJoin");
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
  if ((b = g("[data-soctime]"))) { e.preventDefault(); useHit("socTimeBtn"); $$(".sheet:not([hidden])").forEach(sh => { if (sh.id !== "socTime" && sh.id !== "tkSheet") sh.hidden = true; }); return askTime(b.dataset.soctime, "me"); }
  if ((b = g("[data-socadd]"))) return addShared(Number(b.dataset.socadd));
  if ((b = g("[data-socign]"))) return ignoreShared(Number(b.dataset.socign));
  if ((b = g("[data-socu]"))) { e.stopPropagation(); return openUser(b.dataset.socu); }
  if ((b = g("[data-socwa]"))) return openWa(Number(b.dataset.socwa));
  if ((b = g("[data-socwasave]"))) return saveWa(Number(b.dataset.socwasave), false);
  if ((b = g("[data-socwadel]"))) return saveWa(Number(b.dataset.socwadel), true);
  if ((b = g("[data-socmute]"))) return toggleMute(b.dataset.socmute, b.dataset.n);
  if ((b = g("[data-socboard]"))) return openBoard(b.dataset.socboard ? Number(b.dataset.socboard) : undefined);
  if ((b = g("[data-socme]"))) return P.soc_id && openUser(P.soc_id.uid);
  if ((b = g("[data-socjoin]"))) return intro(true);
  if ((b = g("[data-socjoinnow]"))) return join();
  if ((b = g("[data-socsh]"))) { const [k, id] = b.dataset.socsh.split("|"); close("socShare"); return shareItem(k, id); }
  if ((b = g("[data-socunsh]"))) { const [k, id] = b.dataset.socunsh.split("|"); return stopSharing(k, id); }
  if ((b = g("[data-soctimes]"))) { e.preventDefault(); return openTimes(b.dataset.soctimes); }
  if ((b = g("[data-socchat]"))) { e.preventDefault(); close("socNote"); const i = b.dataset.socchat.indexOf("|"); return openChat(Number(b.dataset.socchat.slice(0, i)), b.dataset.socchat.slice(i + 1)); }
  if ((b = g("[data-socchats]"))) { $$(".sheet").forEach(x => x.hidden = true); setView("chat"); render(); window.scrollTo(0, 0); return; }
  if ((b = g("[data-chf]"))) { ST.chf = b.dataset.chf; LS.set("socChF", ST.chf); return chatView(); }
  if ((b = g("[data-socsend]"))) return sendMsg();
  if ((b = g("[data-socrep]"))) return setReply(Number(b.dataset.socrep));
  if ((b = g("[data-socrepx]"))) return setReply(0);
  if ((b = g("[data-socpick]"))) return pickEmoji(Number(b.dataset.socpick));
  if ((b = g("[data-socemo]"))) { const [id, emo] = b.dataset.socemo.split("|"); const pk = $(".spick"); if (pk) pk.remove(); return chatAct("react", { id: Number(id), emo }); }
  if ((b = g("[data-socstar]"))) { if (b.classList.contains("on")) return; return chatAct("star", { id: Number(b.dataset.socstar) }); }
  if ((b = g("[data-socmdel]"))) { if (!confirm(t("chatDelQ"))) return; return chatAct("msgdel", { id: Number(b.dataset.socmdel) }); }
}, true);

/* ---------- icons this file needs (Lucide, ISC) ---------- */
{
  const I = { "message-square": '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>',
    send: '<path d="M14.536 21.686a.5.5 0 0 0 .937-.024l6.5-19a.496.496 0 0 0-.635-.635l-19 6.5a.5.5 0 0 0-.024.937l7.93 3.18a2 2 0 0 1 1.112 1.11z"/><path d="m21.854 2.147-10.94 10.939"/>',
    reply: '<polyline points="9 17 4 12 9 7"/><path d="M20 18v-2a4 4 0 0 0-4-4H4"/>',
    star: '<path d="M11.525 2.295a.53.53 0 0 1 .95 0l2.31 4.679a2.123 2.123 0 0 0 1.595 1.16l5.166.756a.53.53 0 0 1 .294.904l-3.736 3.638a2.123 2.123 0 0 0-.611 1.878l.882 5.14a.53.53 0 0 1-.771.56l-4.618-2.428a2.122 2.122 0 0 0-1.973 0L6.396 21.01a.53.53 0 0 1-.77-.56l.881-5.139a2.122 2.122 0 0 0-.611-1.879L2.16 9.795a.53.53 0 0 1 .294-.906l5.165-.755a2.122 2.122 0 0 0 1.597-1.16z"/>',
    "smile-plus": '<path d="M22 11v1a10 10 0 1 1-9-10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" x2="9.01" y1="9" y2="9"/><line x1="15" x2="15.01" y1="9" y2="9"/><path d="M16 5h6"/><path d="M19 2v6"/>',
    megaphone: '<path d="m3 11 18-5v12L3 14v-3z"/><path d="M11.6 16.8a3 3 0 1 1-5.8-1.6"/>',
    "chevron-down": '<path d="m6 9 6 6 6-6"/>',
    "trash-2": '<path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/>' };
  const defs = document.querySelector("#icons defs") || document.querySelector("#icons");
  if (defs) for (const [k, v] of Object.entries(I)) if (!document.getElementById("i-" + k)) {
    const sy = document.createElementNS("http://www.w3.org/2000/svg", "symbol"); sy.id = "i-" + k; sy.setAttribute("viewBox", "0 0 24 24");
    sy.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' + v + "</svg>";
    defs.appendChild(sy);
  }
}

/* ---------- looks ---------- */
const css = document.createElement("style");
css.textContent = `
.ssb{display:flex;align-items:center;gap:4px;margin-top:4px;font-size:11.5px;color:#a26a12}.ssb .i{width:12px;height:12px;fill:#f6c34a;color:#f6c34a;flex:none}
.tmbars{display:grid;gap:6px;margin:10px 0 14px}.tmb{display:grid;grid-template-columns:minmax(110px,auto) 1fr 24px;align-items:center;gap:8px;font-size:13px}
.tmb .b{height:10px;border-radius:99px;background:var(--track);overflow:hidden}.tmb .b i{display:block;height:100%;background:var(--accent);border-radius:99px}.tmb .n{text-align:end;font-weight:700}
.tmr{display:flex;align-items:center;gap:10px;padding:9px 0;border-bottom:1px solid var(--line)}.tmr .sw{flex:1;min-width:0;display:flex;flex-direction:column}.tmr .tma{font-weight:700;font-size:13.5px;white-space:nowrap}.tmr small{color:var(--muted);font-size:12px}
.chme{margin:10px 0 4px;padding:12px;border-radius:16px;background:var(--row)}.chme1{display:flex;gap:12px;align-items:flex-start}.chme1 .sw{flex:1;min-width:0}.chme .sbtns{margin-top:8px}
.snote{padding:10px 0;border-bottom:1px solid var(--line);font-size:14.5px;line-height:1.5}.snote:last-of-type{border-bottom:0}.snote .link{padding:0;margin-top:4px}
.stbtn.locked{opacity:.75;cursor:default}
.tksest{display:flex;align-items:center;gap:8px;font-size:14px;padding:10px 12px;border-radius:12px;background:color-mix(in srgb,var(--accent) 9%,var(--card));margin-bottom:8px}.tksest .i{width:18px;height:18px;color:var(--accent-t);flex:none}
.tksrow{display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:8px}.tksrow .hint{margin:0}
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
.sprofcard.spc{padding:12px;border-radius:16px;background:var(--row);margin-bottom:12px}
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
.shitem{display:flex;gap:10px;align-items:center;padding:12px;border-radius:14px;background:var(--row);margin:6px 0 12px}
.shitem>i{width:10px;align-self:stretch;border-radius:6px;background:var(--c);flex:none}
.shitem div{display:flex;flex-direction:column;gap:2px}.shitem small{color:var(--muted)}
.shbig{display:flex;align-items:center;gap:12px;width:100%;padding:16px;border:0;border-radius:18px;color:#fff;text-align:start;cursor:pointer;
  background:linear-gradient(135deg,#5856d6,#af52de);box-shadow:0 8px 22px -8px #5856d6aa}
.shbig .i{width:30px;height:30px;flex:none}
.shbig span{display:flex;flex-direction:column;gap:3px}.shbig b{font-size:17px}.shbig small{opacity:.9;font-size:13px}
.shbig.sm{padding:12px 14px;margin:8px 0}.shbig.sm b{font-size:15px}.shbig.sm .i{width:22px;height:22px}
.shbig:active{transform:scale(.98)}
.shrow{display:flex;align-items:center;gap:10px;margin:8px 0}
.sshtag{display:inline-flex;align-items:center;gap:4px;padding:4px 10px;border-radius:99px;border:0;font-size:12.5px;font-weight:700;background:color-mix(in srgb,#5856d6 12%,var(--card));color:#5856d6;white-space:nowrap}
.sshtag.on{background:#5856d6;color:#fff}.sshtag .i{width:14px;height:14px}
.sfocus{display:flex;flex-wrap:wrap;align-items:center;gap:8px;margin:0 0 10px}.sfocus .swabar{margin:0}
.schatc{display:inline-flex;align-items:center;gap:6px;padding:9px 14px;border-radius:12px;border:0;font-weight:700;font-size:14px;background:color-mix(in srgb,var(--accent) 14%,var(--card));color:var(--accent-t)}
.schatc .i{width:18px;height:18px}
.scnt{display:inline-grid;place-items:center;min-width:18px;height:18px;padding:0 5px;border-radius:99px;font-size:11px;font-weight:800;background:var(--track);color:var(--text);margin-inline-start:4px}
.scnt.new{background:#ff3b30;color:#fff}
.sheet.chat .box{height:min(88vh,760px);display:flex;flex-direction:column;overflow:hidden;padding-bottom:0}
.schsub{display:flex;align-items:center;gap:8px;color:var(--muted);font-size:13px;margin:-4px 0 6px}
.schsub>i{width:9px;height:9px;border-radius:50%;background:var(--c);flex:none}
.schl{flex:1;overflow:auto;display:flex;flex-direction:column;gap:8px;padding:6px 2px 10px;overscroll-behavior:contain}
.schempty{text-align:center;margin:auto;padding:20px}
.sm{align-self:flex-start;max-width:86%;padding:8px 12px;border-radius:16px 16px 16px 4px;background:var(--row);position:relative}
.sm.me{align-self:flex-end;border-radius:16px 16px 4px 16px;background:color-mix(in srgb,var(--accent) 14%,var(--card))}
html[dir=rtl] .sm{border-radius:16px 16px 4px 16px}html[dir=rtl] .sm.me{border-radius:16px 16px 16px 4px}
.smh{display:flex;align-items:center;gap:6px;flex-wrap:wrap;font-size:13px}.smh small{color:var(--muted);font-size:11px}.smh .srk{font-size:10.5px;padding:1px 6px;margin:0}
.smb{white-space:pre-wrap;word-break:break-word;font-size:15px;line-height:1.45;margin-top:2px}.smb.del{color:var(--muted);font-style:italic}
.smb a{color:var(--accent-t);word-break:break-all}
.sq{font-size:12.5px;color:var(--muted);border-inline-start:3px solid var(--accent);padding:2px 8px;margin:4px 0;border-radius:4px;background:color-mix(in srgb,var(--accent) 6%,transparent)}
.smf{display:flex;flex-wrap:wrap;align-items:center;gap:4px;margin-top:5px}
.sre{border:1px solid var(--line);background:var(--card);border-radius:99px;padding:1px 8px;font-size:13px}.sre.on{border-color:var(--accent);background:color-mix(in srgb,var(--accent) 12%,var(--card))}
.sstar{display:inline-flex;align-items:center;gap:3px;border:1px solid var(--line);background:var(--card);border-radius:99px;padding:1px 8px;font-size:12px;font-weight:600;color:var(--muted)}
.sstar .i{width:13px;height:13px}.sstar.on{color:#b7791f;border-color:#f6c34a;background:color-mix(in srgb,#f6c34a 18%,var(--card))}.sstar.on .i{fill:#f6c34a}
.sic{border:0;background:none;padding:3px;color:var(--muted);display:inline-grid;place-items:center}.sic .i{width:16px;height:16px}
.spick{display:flex;gap:4px;margin-top:6px}.spick button{border:0;background:var(--card);border-radius:10px;font-size:20px;padding:4px 7px}
.schc{border-top:1px solid var(--line);padding:8px 0 calc(10px + env(safe-area-inset-bottom));background:inherit}
.schrep{display:flex;align-items:center;justify-content:space-between;gap:8px;font-size:12.5px;color:var(--muted);padding:0 4px 6px}
.schin{display:flex;gap:8px;align-items:flex-end}
.schin textarea{flex:1;resize:none;min-height:42px;max-height:120px;padding:10px 12px;border-radius:14px;font:inherit;font-size:15px}
.schin .primary{width:44px;height:44px;border-radius:50%;padding:0;display:grid;place-items:center;flex:none}.schin .primary .i{width:20px;height:20px}
html[dir=rtl] .schin .primary .i{transform:scaleX(-1)}
.schg{margin:10px 0}.schgh{display:flex;align-items:center;gap:8px;font-weight:700;margin-bottom:4px}.schgh>i{width:10px;height:10px;border-radius:50%;background:var(--c)}
.schr{display:flex;align-items:center;gap:10px;width:100%;text-align:start;padding:10px;border:0;border-bottom:1px solid var(--line);border-radius:0;background:none}
.schr .sw{flex:1;min-width:0;display:flex;flex-direction:column}.schr small{color:var(--muted);font-size:12px}.schr .i{width:18px;height:18px;color:var(--accent-t)}
.task .act .scnt{margin-inline-start:2px}
.schsub .bc{font-weight:700;color:var(--text);border:0;background:none;padding:0;font-size:inherit;text-decoration:underline;text-underline-offset:3px;text-decoration-color:color-mix(in srgb,currentColor 35%,transparent);cursor:pointer}.schsub{flex-wrap:wrap}.schsub .schtk{font-size:13px;padding:0;margin-inline-start:auto}.schsub .sep{opacity:.6}
.chvh h2{margin:4px 0 2px}.chvh p{margin:0 0 10px}.chvh input{width:100%;margin-bottom:12px}
.chcard{background:var(--card);border-radius:18px;margin:0 0 12px;overflow:hidden;box-shadow:var(--shadow, 0 1px 3px #0000001a);border:1px solid var(--line)}
.chhead{display:flex;align-items:center;gap:10px;width:100%;padding:14px 16px;border:0;border-radius:0;text-align:start;font-size:16.5px;font-weight:800;
  background:linear-gradient(to left,color-mix(in srgb,var(--c) 16%,var(--card)),var(--card));border-bottom:1px solid var(--line)}
html[dir=ltr] .chhead{background:linear-gradient(to right,color-mix(in srgb,var(--c) 16%,var(--card)),var(--card))}
.chhead .chdot{width:12px;height:12px;border-radius:50%;background:var(--c);flex:none}.chhead .chname{flex:1;min-width:0}
.chhead .chev{width:18px;height:18px;color:var(--muted)}
.chbody{padding:6px 10px 10px}
.chrow{display:flex;align-items:center;gap:10px;width:100%;text-align:start;padding:10px 8px;border:0;border-radius:12px;background:none}
.chrow:hover{background:var(--row)}
.chrow .sw{flex:1;min-width:0;display:flex;flex-direction:column;gap:1px}.chrow b{font-weight:650;font-size:14.5px}
.chrow.gen{background:color-mix(in srgb,var(--c) 8%,var(--card))}.chrow.gen b{font-weight:800}
.chic{flex:none;width:34px;height:34px;border-radius:10px;display:grid;place-items:center;background:color-mix(in srgb,var(--c) 15%,var(--card));color:color-mix(in srgb,var(--c) 75%,var(--text))}
.chic .i{width:18px;height:18px}
.chpv,.chmeta{color:var(--muted);font-size:12.5px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.chmeta{font-size:12px}
.chwa{display:inline-flex;align-items:center;gap:6px;margin:6px 8px 0;padding:6px 12px;border-radius:10px;background:#25d36622;color:#128c4a;font-weight:700;font-size:13px;text-decoration:none}.chwa .i{width:16px;height:16px}
.chsub{font-size:12.5px;font-weight:700;color:var(--muted);margin:12px 8px 4px;text-transform:none}
.chtree{margin-inline-start:22px;padding-inline-start:10px;border-inline-start:2px solid color-mix(in srgb,var(--c) 35%,var(--line))}
.chmore{margin:4px 8px}
.chfs{display:flex;gap:6px;margin:0 0 10px;overflow-x:auto}
.chf{flex:none;padding:7px 14px;border-radius:99px;border:1px solid var(--line);background:var(--card);font-weight:650;font-size:13.5px}
.chf.on{background:var(--accent);border-color:var(--accent);color:var(--on-accent,#fff)}.chf .n{opacity:.7;font-weight:500}
.chlist{background:var(--card);border:1px solid var(--line);border-radius:18px;overflow:hidden}
.chrow2{display:flex;align-items:center;gap:12px;width:100%;text-align:start;padding:12px 14px;border:0;border-bottom:1px solid var(--line);border-radius:0;background:none}
.chrow2:last-child{border-bottom:0}.chrow2:hover{background:var(--row)}
.chav{position:relative;flex:none;width:46px;height:46px;border-radius:50%;display:grid;place-items:center;font-weight:800;font-size:18px;background:color-mix(in srgb,var(--c) 22%,var(--card));color:color-mix(in srgb,var(--c) 70%,var(--text))}
.chsubic{position:absolute;inset-block-end:-2px;inset-inline-end:-2px;width:20px;height:20px;border-radius:50%;display:grid;place-items:center;background:var(--card);border:1px solid var(--line);color:var(--muted)}
.chsubic .i{width:12px;height:12px}
.chrow2 .sw{flex:1;min-width:0;display:flex;flex-direction:column;gap:2px}
.chl1{display:flex;gap:8px;align-items:baseline}.chl1 b{flex:1;min-width:0;font-size:15px;font-weight:700;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.chl1 small{flex:none;color:var(--muted);font-size:12px}.chrow2.un .chl1 small{color:var(--accent-t);font-weight:700}
.chwhere{font-size:12.5px;color:var(--muted);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.chtag{display:inline-block;padding:0 7px;border-radius:6px;font-size:11.5px;font-weight:700;background:color-mix(in srgb,var(--c) 18%,var(--card));color:color-mix(in srgb,var(--c) 70%,var(--text))}
.chtag.t{background:var(--row);color:var(--muted)}
.chl3{display:flex;gap:8px;align-items:center}.chl3 .chpv{flex:1;min-width:0}.chrow2.un .chpv{color:var(--text)}
.crsoc{display:flex;gap:8px;flex-wrap:wrap}.crsoc .schatc,.crsbtn{flex:1 1 140px}
.stime button.on{outline:2px solid var(--accent);background:color-mix(in srgb,var(--accent) 14%,var(--card))}
.stbtn.on{color:var(--accent-t)}
.chempty{text-align:center;padding:28px 16px;color:var(--muted)}.chempty p{margin:0 0 14px}
`;
document.head.appendChild(css);

window.SOC = { taskSoc, timeBtn, crsLinks, chatView, v: SOC_V, est, badge, examOffers, render: renderTop, afterFetch, askTime, afterSave, unshare, xqShareBtn, mineShare, taskAct, openChat, openChats, card, page, intro, openBoard, openUser, overview };
})();
