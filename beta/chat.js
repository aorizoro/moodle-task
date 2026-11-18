/* MoodlePro · AI chat (beta).
   Loaded by index.html (aiEnsure) once the student is connected. It draws the floating AI circle and, on tap, the chat window.
   Server: our own server (API_DEFAULT below). The Moodle token is NEVER stored by us: it stays in this phone (the app's own
   storage), is sent over HTTPS only to that server, with each message, and the server verifies it against Moodle on every use.
   Colours come only from the app's theme variables, so every colour pack works.
   Rules of the chat: it opens on the last conversation if the student left it up to an hour ago, otherwise on a new one;
   earlier conversations are under the history button. */
(function () {
  if (window.AIChat) return;

  const API_DEFAULT = "https://college-chat-lwdu.onrender.com";
  const HOUR = 3600 * 1000;

  /* ------------------------------------------------------------ texts (he / en / fr) */
  const TX = {
    he: {
      title: "אורי", sub: "העוזר של המרכז האקדמי לב", hello: n => "שלום " + n, helloNo: "שלום",
      intro: "אני אורי. אפשר לשאול אותי על המרכז האקדמי לב, ועל המטלות, הציונים, המועדים והקורסים שלך.",
      s1: "מה המטלות הפתוחות שלי?", s2: "מה המועדים הקרובים שלי?", s3: "איך הציונים שלי בקורסים?",
      ph: "כתוב שאלה…", send: "שלח", stop: "עצור", close: "סגור", hist: "שיחות קודמות", newc: "שיחה חדשה", back: "חזרה לשיחה",
      note: "AI עלול לטעות. כדאי לוודא פרטים חשובים ב-Moodle.", histEmpty: "עדיין אין שיחות קודמות", histNone: "שיחה ללא כותרת",
      connecting: "מתחבר…", wake: "השרת מתעורר, זה יכול לקחת עד דקה…", retry: "נסה שוב", cut: "(התשובה נקטעה)",
      errNet: "אין חיבור לשרת כרגע. נסה שוב בעוד רגע.", errMoodle: "החיבור ל-Moodle פג. התחבר מחדש בהגדרות ונסה שוב.",
      errRate: "יותר מדי הודעות בזמן קצר. נסה שוב בעוד רגע.", errGen: "משהו השתבש. נסה שוב.", errLoad: "לא הצלחתי לטעון את השיחה.",
      copy: "העתק", copied: "הועתק", share: "שתף", selectTxt: "בחר טקסט", reuse: "ערוך ושלח שוב", msgMenu: "אפשרויות להודעה",
      delAll: "מחק את כל השיחות", delOne: "מחק שיחה", delOk: "מחק", cancel: "ביטול", deleted: "נמחק", histCount: n => n === 1 ? "שיחה אחת" : n + " שיחות",
      delAllQ: "למחוק את כל השיחות הקודמות? אי אפשר לשחזר אותן.", delOneQ: "למחוק את השיחה הזו? אי אפשר לשחזר אותה.",
      dl: "הורד", dling: "מוריד…", fileGone: "הקובץ כבר לא זמין ב-Moodle.", fileBig: "הקובץ גדול מדי להורדה כאן (מעל 25MB). אפשר להוריד אותו ישירות ב-Moodle.", fileErr: "לא הצלחתי להוריד את הקובץ. נסה שוב.", errTitle: "משהו לא תקין",
      stSend: "שולח את הבקשה", stWait: "ממתין לתשובה מהשרת", stKb: "בודק במידע של המכללה", stMoodle: "בודק ב-Moodle שלך", stThink: "מחליט איך לענות לך הכי טוב", stRead: "קורא את השאלה שלך", stFound: t => "מצאתי: " + t, tl_show_ui: () => "מסדר לך את התשובה בכרטיסים", stWrite: "כותב את התשובה",
      stMemAdd: "שומר בזיכרון", stMemDel: "מוחק מהזיכרון", tlGeneric: "פונה ל-Moodle", tlVisual: "מסדר לך את זה בצורה ויזואלית",
      tl_get_my_courses: () => "מושך את רשימת הקורסים שלך מ-Moodle", tl_get_course_assignments: a => a ? "בודק מטלות ומועדי הגשה בקורס " + a : "בודק מטלות ומועדי הגשה",
      tl_get_course_grades: a => a ? "בודק את הציונים שלך בקורס " + a : "בודק את הציונים שלך", tl_get_calendar_events: () => "קורא את היומן שלך ב-Moodle",
      tl_get_course_content: a => a ? "קורא את התוכן של הקורס " + a : "קורא את תוכן הקורס", tl_get_course_files: (a, d) => (a ? "מחפש קבצים בקורס " + a : "מחפש קבצים") + (d ? " (" + d + ")" : ""),
      tl_get_assignment_submission_status: a => a ? "בודק סטטוס הגשה בקורס " + a : "בודק סטטוס הגשה", tl_get_upcoming_deadlines: () => "בודק מה דחוף בכל הקורסים",
      tl_get_overall_grades: () => "מושך סקירת ציונים כללית", tl_get_quiz_attempts: a => a ? "בודק ניסיונות במבחן מקוון בקורס " + a : "בודק ניסיונות במבחן מקוון",
      tl_get_completion_status: a => a ? "בודק מה כבר השלמת בקורס " + a : "בודק מה כבר השלמת", tl_search_college_info: () => "בודק במידע של המכללה", tl_get_my_exams: a => a ? "בודק מבחנים ובחנים בקורס " + a : "בודק את המבחנים והבחנים שלך", tl_remember_about_student: () => "שומר בזיכרון", tl_forget_about_student: () => "מוחק מהזיכרון",
      memBtn: "זיכרון", memTitle: "מה אני זוכר עליך", memIntro: "אלה דברים שסיפרת לי, כדי שאוכל לעזור לך יותר טוב. הם נשמרים רק אצלך ואפשר למחוק כל אחד.",
      memEmpty: "עדיין לא זכרתי שום דבר עליך. אפשר לספר לי, למשל ״עזבתי את הקורס אלגברה״.", memSaved: "נשמר בזיכרון", memGone: "נמחק מהזיכרון", memUndo: "בטל", memUndone: "בוטל",
      devT: "למפתחים: מפתח AI אישי", devNote: "אופציה למפתחים: הבוט יענה בעזרת מפתח ה-API שלך (Google, OpenAI, Grok או Groq) במקום המודל הציבורי. הקריאות מחויבות בחשבון שלך אצל הספק. המפתח נשמר מוצפן אצלנו ולא מוצג שוב.", devNone: "אין מפתח אישי: הבוט משתמש במודל הציבורי.", devSaved: m => "מפתח שמור: " + m, devPh: "הדבק מפתח API", devSave: "שמור מפתח", devList: "טען מודלים", devTest: "בדוק", devOn: "השתמש במפתח האישי שלי", devDel: "מחק את המפתח", devDelQ: "למחוק את המפתח האישי? הבוט יחזור למודל הציבורי.", devOk: ms => "עובד · " + ms + " שניות", devFail: "נכשל", useTitle: "שימוש במפתח", useCalls: "קריאות", useFails: "נכשלו", useEmpty: "עדיין אין שימוש בשבוע האחרון", useNote: "רק על המפתח האישי שלך, 7 הימים האחרונים. אצל הספק תראה את החיוב המלא.", useBtn: "השימוש במפתח שלי",
      winMin: "הקטן לחלון קטן (אפשר להמשיך להשתמש באפליקציה)", winMax: "הגדל למסך מלא", wipeBtn: "מחק את כל המידע שלי", wipeQ1: "למחוק את כל מה שיש עליך אצלנו? השיחות, הזיכרון והחשבון שלך יימחקו, ואי אפשר לשחזר.", wipeQ2: "בטוח? אחרי המחיקה זה כאילו מעולם לא פתחת את הצ'אט.", wipeOk: "המשך", wipeOk2: "מחק הכול", wiped: "כל המידע שלך נמחק", memDelAll: "מחק את כל הזיכרון", memDelAllQ: "למחוק את כל מה שאני זוכר עליך? אי אפשר לשחזר.", memLeft: "עזבת", memDelOne: "מחק", memCount: n => n === 1 ? "דבר אחד" : n + " דברים",
      fileHint: "הקש להורדה", dlDone: "הורד", dlProg: (p, a, b) => p + "% · " + a + " מתוך " + b,
    },
    en: {
      title: "Uri", sub: "The assistant of the Lev Academic Center", hello: n => "Hello " + n, helloNo: "Hello",
      intro: "I’m Uri. Ask me about the Lev Academic Center, and about your assignments, grades, deadlines and courses.",
      s1: "What are my open assignments?", s2: "What are my upcoming deadlines?", s3: "How are my grades in my courses?",
      ph: "Type a question…", send: "Send", stop: "Stop", close: "Close", hist: "Earlier chats", newc: "New chat", back: "Back to the chat",
      note: "AI can make mistakes. Check important details in Moodle.", histEmpty: "No earlier chats yet", histNone: "Untitled chat",
      connecting: "Connecting…", wake: "The server is waking up, this can take up to a minute…", retry: "Try again", cut: "(the answer was cut off)",
      errNet: "Can’t reach the server right now. Try again in a moment.", errMoodle: "The Moodle connection expired. Reconnect in Settings and try again.",
      errRate: "Too many messages in a short time. Try again in a moment.", errGen: "Something went wrong. Try again.", errLoad: "Couldn’t load the chat.",
      copy: "Copy", copied: "Copied", share: "Share", selectTxt: "Select text", reuse: "Edit and resend", msgMenu: "Message options",
      delAll: "Delete all chats", delOne: "Delete chat", delOk: "Delete", cancel: "Cancel", deleted: "Deleted", histCount: n => n + (n === 1 ? " chat" : " chats"),
      delAllQ: "Delete all earlier chats? This can’t be undone.", delOneQ: "Delete this chat? This can’t be undone.",
      dl: "Download", dling: "Downloading…", fileGone: "The file is no longer available in Moodle.", fileBig: "The file is too big to download here (over 25MB). You can download it directly in Moodle.", fileErr: "Couldn’t download the file. Try again.", errTitle: "Something’s not right",
      stSend: "Sending your request", stWait: "Waiting for the server", stKb: "Checking the college’s information", stMoodle: "Checking your Moodle", stThink: "Deciding how to answer you best", stRead: "Reading your question", stFound: t => "Found: " + t, tl_show_ui: () => "Laying out the answer as cards", stWrite: "Writing the answer",
      stMemAdd: "Saving to memory", stMemDel: "Removing from memory", tlGeneric: "Asking Moodle", tlVisual: "Laying it out visually for you",
      tl_get_my_courses: () => "Fetching your course list from Moodle", tl_get_course_assignments: a => a ? "Checking assignments and deadlines in " + a : "Checking assignments and deadlines",
      tl_get_course_grades: a => a ? "Checking your grades in " + a : "Checking your grades", tl_get_calendar_events: () => "Reading your Moodle calendar",
      tl_get_course_content: a => a ? "Reading the content of " + a : "Reading the course content", tl_get_course_files: (a, d) => (a ? "Searching files in " + a : "Searching files") + (d ? " (" + d + ")" : ""),
      tl_get_assignment_submission_status: a => a ? "Checking submission status in " + a : "Checking submission status", tl_get_upcoming_deadlines: () => "Checking what is urgent in all courses",
      tl_get_overall_grades: () => "Fetching an overall grades summary", tl_get_quiz_attempts: a => a ? "Checking quiz attempts in " + a : "Checking quiz attempts",
      tl_get_completion_status: a => a ? "Checking what you completed in " + a : "Checking what you completed", tl_search_college_info: () => "Checking the college’s information", tl_get_my_exams: a => a ? "Checking exams and quizzes in " + a : "Checking your exams and quizzes", tl_remember_about_student: () => "Saving to memory", tl_forget_about_student: () => "Removing from memory",
      memBtn: "Memory", memTitle: "What I remember about you", memIntro: "These are things you told me, so I can help you better. They are kept only for you and you can delete any of them.",
      memEmpty: "I haven’t remembered anything about you yet. You can tell me, for example “I left the Algebra course”.", memSaved: "Saved to memory", memGone: "Removed from memory", memUndo: "Undo", memUndone: "Undone",
      devT: "For developers: personal AI key", devNote: "Developer option: the bot answers with your own API key (Google, OpenAI, Grok or Groq) instead of the public model. Calls are billed to your account with the provider. The key is stored encrypted and never shown again.", devNone: "No personal key: the bot uses the public model.", devSaved: m => "Saved key: " + m, devPh: "Paste an API key", devSave: "Save key", devList: "Load models", devTest: "Test", devOn: "Use my personal key", devDel: "Delete the key", devDelQ: "Delete the personal key? The bot returns to the public model.", devOk: ms => "Works · " + ms + " s", devFail: "Failed", useTitle: "Key usage", useCalls: "calls", useFails: "failed", useEmpty: "No usage in the last week", useNote: "Only your personal key, last 7 days. The full bill is with the provider.", useBtn: "My key usage",
      winMin: "Shrink to a small window (keep using the app)", winMax: "Make full screen", wipeBtn: "Delete all my data", wipeQ1: "Delete everything we hold about you? Your chats, memory and account will be erased and this can’t be undone.", wipeQ2: "Are you sure? Afterwards it is as if you never opened the chat.", wipeOk: "Continue", wipeOk2: "Delete everything", wiped: "All your data was deleted", memDelAll: "Delete all memory", memDelAllQ: "Delete everything I remember about you? This can’t be undone.", memLeft: "Left", memDelOne: "Delete", memCount: n => n === 1 ? "1 item" : n + " items",
      fileHint: "Tap to download", dlDone: "Downloaded", dlProg: (p, a, b) => p + "% · " + a + " of " + b,
    },
    fr: {
      title: "Uri", sub: "L’assistant du Centre académique Lev", hello: n => "Bonjour " + n, helloNo: "Bonjour",
      intro: "Je suis Uri. Posez-moi des questions sur le Centre académique Lev, et sur vos devoirs, notes, échéances et cours.",
      s1: "Quels sont mes devoirs en cours ?", s2: "Quelles sont mes prochaines échéances ?", s3: "Comment sont mes notes dans mes cours ?",
      ph: "Écrivez une question…", send: "Envoyer", stop: "Arrêter", close: "Fermer", hist: "Conversations précédentes", newc: "Nouvelle conversation", back: "Retour à la conversation",
      note: "L’IA peut se tromper. Vérifiez les détails importants dans Moodle.", histEmpty: "Aucune conversation précédente", histNone: "Conversation sans titre",
      connecting: "Connexion…", wake: "Le serveur se réveille, cela peut prendre jusqu’à une minute…", retry: "Réessayer", cut: "(la réponse a été coupée)",
      errNet: "Impossible de joindre le serveur pour le moment. Réessayez dans un instant.", errMoodle: "La connexion à Moodle a expiré. Reconnectez-vous dans les réglages et réessayez.",
      errRate: "Trop de messages en peu de temps. Réessayez dans un instant.", errGen: "Une erreur s’est produite. Réessayez.", errLoad: "Impossible de charger la conversation.",
      copy: "Copier", copied: "Copié", share: "Partager", selectTxt: "Sélectionner le texte", reuse: "Modifier et renvoyer", msgMenu: "Options du message",
      delAll: "Supprimer toutes les conversations", delOne: "Supprimer la conversation", delOk: "Supprimer", cancel: "Annuler", deleted: "Supprimé", histCount: n => n + (n === 1 ? " conversation" : " conversations"),
      delAllQ: "Supprimer toutes les conversations précédentes ? Cette action est irréversible.", delOneQ: "Supprimer cette conversation ? Cette action est irréversible.",
      dl: "Télécharger", dling: "Téléchargement…", fileGone: "Le fichier n’est plus disponible dans Moodle.", fileBig: "Le fichier est trop volumineux pour être téléchargé ici (plus de 25 Mo). Vous pouvez le télécharger directement dans Moodle.", fileErr: "Impossible de télécharger le fichier. Réessayez.", errTitle: "Quelque chose ne va pas",
      stSend: "Envoi de la demande", stWait: "Attente du serveur", stKb: "Je consulte les informations du collège", stMoodle: "Je consulte ton Moodle", stThink: "Je choisis la meilleure façon de répondre", stRead: "Je lis ta question", stFound: t => "Trouvé : " + t, tl_show_ui: () => "Je mets la réponse en cartes", stWrite: "Rédaction de la réponse",
      stMemAdd: "Enregistrement en mémoire", stMemDel: "Suppression de la mémoire", tlGeneric: "Question à Moodle", tlVisual: "Je le mets en forme pour toi",
      tl_get_my_courses: () => "Récupération de vos cours sur Moodle", tl_get_course_assignments: a => a ? "Vérification des devoirs et échéances de " + a : "Vérification des devoirs et échéances",
      tl_get_course_grades: a => a ? "Vérification de vos notes en " + a : "Vérification de vos notes", tl_get_calendar_events: () => "Lecture de votre calendrier Moodle",
      tl_get_course_content: a => a ? "Lecture du contenu de " + a : "Lecture du contenu du cours", tl_get_course_files: (a, d) => (a ? "Recherche de fichiers dans " + a : "Recherche de fichiers") + (d ? " (" + d + ")" : ""),
      tl_get_assignment_submission_status: a => a ? "Vérification du statut de remise dans " + a : "Vérification du statut de remise", tl_get_upcoming_deadlines: () => "Vérification de ce qui est urgent dans tous les cours",
      tl_get_overall_grades: () => "Récupération d’un résumé général des notes", tl_get_quiz_attempts: a => a ? "Vérification des tentatives de quiz dans " + a : "Vérification des tentatives de quiz",
      tl_get_completion_status: a => a ? "Vérification de ce que vous avez terminé dans " + a : "Vérification de ce que vous avez terminé", tl_search_college_info: () => "Je consulte les informations du collège", tl_get_my_exams: a => a ? "Vérification des examens et quiz de " + a : "Vérification de vos examens et quiz", tl_remember_about_student: () => "Enregistrement en mémoire", tl_forget_about_student: () => "Suppression de la mémoire",
      memBtn: "Mémoire", memTitle: "Ce dont je me souviens", memIntro: "Ce sont des choses que vous m’avez dites, pour mieux vous aider. Elles ne sont gardées que pour vous et vous pouvez en supprimer.",
      memEmpty: "Je ne me souviens encore de rien à votre sujet. Vous pouvez me dire, par exemple « j’ai quitté le cours d’algèbre ».", memSaved: "Enregistré en mémoire", memGone: "Supprimé de la mémoire", memUndo: "Annuler", memUndone: "Annulé",
      devT: "Pour les développeurs : clé IA perso", devNote: "Option développeur : le bot répond avec ta propre clé API (Google, OpenAI, Grok ou Groq) au lieu du modèle public. Les appels sont facturés chez le fournisseur. La clé est chiffrée et jamais ré-affichée.", devNone: "Pas de clé perso : le bot utilise le modèle public.", devSaved: m => "Clé enregistrée : " + m, devPh: "Colle une clé API", devSave: "Enregistrer", devList: "Charger les modèles", devTest: "Tester", devOn: "Utiliser ma clé perso", devDel: "Supprimer la clé", devDelQ: "Supprimer la clé perso ? Le bot revient au modèle public.", devOk: ms => "OK · " + ms + " s", devFail: "Échec", useTitle: "Usage clé", useCalls: "appels", useFails: "échecs", useEmpty: "Aucun usage cette semaine", useNote: "Uniquement ta clé perso, 7 derniers jours.", useBtn: "Usage de ma clé",
      winMin: "Réduire en petite fenêtre (continuer à utiliser l’appli)", winMax: "Plein écran", wipeBtn: "Supprimer toutes mes données", wipeQ1: "Supprimer tout ce que nous avons sur toi ? Tes conversations, ta mémoire et ton compte seront effacés, de façon irréversible.", wipeQ2: "Sûr ? Ensuite, c’est comme si tu n’avais jamais ouvert le chat.", wipeOk: "Continuer", wipeOk2: "Tout supprimer", wiped: "Toutes tes données ont été supprimées", memDelAll: "Supprimer toute la mémoire", memDelAllQ: "Supprimer tout ce dont je me souviens ? Cette action est irréversible.", memLeft: "Quitté", memDelOne: "Supprimer", memCount: n => n === 1 ? "1 élément" : n + " éléments",
      fileHint: "Touchez pour télécharger", dlDone: "Téléchargé", dlProg: (p, a, b) => p + " % · " + a + " sur " + b,
    },
  };
  const lang = () => (typeof LANG === "string" && TX[LANG] ? LANG : "he");
  const tx = (k, ...a) => { const v = TX[lang()][k] !== undefined ? TX[lang()][k] : TX.he[k]; return typeof v === "function" ? v(...a) : v; };

  /* ------------------------------------------------------------ styles */
  const CSS = `
#aiFab{position:fixed;z-index:13;inset-inline-end:16px;bottom:calc(86px + env(safe-area-inset-bottom));width:58px;height:58px;padding:0;border:0;border-radius:50%;
  display:grid;place-items:center;cursor:pointer;color:var(--on-accent,#fff);-webkit-tap-highlight-color:transparent;
  background:linear-gradient(145deg,var(--accent),color-mix(in srgb,var(--accent) 45%,#7b5cff));
  box-shadow:0 8px 22px color-mix(in srgb,var(--accent) 42%,transparent),0 0 0 3px color-mix(in srgb,var(--card) 85%,transparent);
  transition:transform .18s ease,box-shadow .18s ease}
#aiFab[hidden]{display:none}
#aiFab:hover{box-shadow:0 10px 26px color-mix(in srgb,var(--accent) 55%,transparent),0 0 0 3px color-mix(in srgb,var(--card) 85%,transparent)}
#aiFab:active{transform:scale(.92)}
#aiFab:focus-visible{outline:3px solid var(--accent-t,var(--accent));outline-offset:3px}
#aiFab{-webkit-touch-callout:none;-webkit-user-select:none;user-select:none;touch-action:manipulation}
#aiFab svg{width:38px;height:38px;display:block;overflow:visible}
.aiFace .aiBub{fill:#fff;fill-opacity:.97}
.aiFace .aiEye{fill:color-mix(in srgb,var(--accent) 78%,#000)}
.aiFace .aiSmile{fill:none;stroke:color-mix(in srgb,var(--accent) 78%,#000);stroke-width:2.1;stroke-linecap:round}
.aiFace .aiSpark{fill:#ffd166;transform-box:fill-box;transform-origin:center}
#aiFab .aiTag{position:absolute;inset-block-end:-4px;inset-inline-start:-4px;padding:1px 6px;border-radius:99px;border:1px solid var(--line);
  background:var(--card);color:var(--accent-t,var(--accent));font-size:10px;font-weight:800;letter-spacing:.05em;line-height:14px}
@media (min-width:600px) and (max-width:999px){ #aiFab{bottom:calc(104px + env(safe-area-inset-bottom))} }
@media (min-width:1000px){ #aiFab{bottom:28px;inset-inline-end:28px;width:62px;height:62px} }
@media (prefers-reduced-motion:no-preference){
  body:not(.calm) #aiFab{animation:aiFloat 3.8s ease-in-out infinite}
  body:not(.calm) .aiFace .aiSpark{animation:aiTwinkle 2.6s ease-in-out infinite}
  body:not(.calm) .aiDots i{animation:aiDot 1.2s ease-in-out infinite}
}
@keyframes aiFloat{0%,100%{translate:0 0}50%{translate:0 -5px}}
@keyframes aiTwinkle{0%,100%{scale:1;opacity:1}50%{scale:.7;opacity:.75}}
@keyframes aiDot{0%,80%,100%{opacity:.25;translate:0 0}40%{opacity:1;translate:0 -3px}}

/* the chat is a screen of its own, on every device: it replaces the app while it is open (the app is turned off behind it, so there is nothing to scroll or tap
   behind), and the app comes back when the chat is closed. Sized to the visible area, so the keyboard never covers the input. */
html.aiOn body > *:not(.aiP):not(#toast):not(script):not(style):not(link):not(meta){visibility:hidden}
/* --aivh / --aivt / --aikb are set by the script from the visual viewport (the part of the screen the keyboard leaves free): its height, how far it was
   scrolled down, and how much of the bottom the keyboard covers. The window is moved with transform (cheap, no layout) and never follows the document scroll. */
.aiP{position:fixed;z-index:35;left:0;right:0;top:0;height:var(--aivh,100dvh);transform:translate3d(0,var(--aivt,0px),0);display:flex;flex-direction:column;
  background:var(--bg);color:var(--text);overscroll-behavior:none;contain:layout paint;
  opacity:0;translate:0 14px;transition:opacity .2s ease,translate .22s ease}
.aiP[hidden]{display:none}
.aiP.on{opacity:1;translate:0 0}
.aiP{--aicol:840px;container:aip / inline-size}
@container aip (min-width:1280px){.aiP>*{--aicol:960px}}
@container aip (min-width:1700px){.aiP>*{--aicol:1120px}}
body.calm .aiP{transition:none}
@container aip (min-width:900px){ .aiB{font-size:16px} }
@container aip (min-width:1280px){ .aiB{max-width:min(88%,720px)} }            /* big screens: the conversation stays in a centred column (the paddings below) */
.aiHd{flex:none;display:flex;align-items:center;gap:6px;padding:max(10px,env(safe-area-inset-top)) max(10px,env(safe-area-inset-right),calc((100% - var(--aicol,840px)) / 2)) 10px max(10px,env(safe-area-inset-left),calc((100% - var(--aicol,840px)) / 2));color:var(--on-accent,#fff);
  background:linear-gradient(135deg,var(--accent),color-mix(in srgb,var(--accent) 50%,#7b5cff))}
.aiHb{flex:none;width:40px;height:40px;padding:0;border:0;border-radius:12px;background:transparent;color:inherit;display:grid;place-items:center;cursor:pointer}
.aiHb:hover{background:#ffffff29}.aiHb:focus-visible{outline:2px solid #fff;outline-offset:1px}
.aiHb svg{width:22px;height:22px;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}
.aiTt{flex:1;min-width:0;display:flex;align-items:center;gap:10px}
.aiTt b{display:block;font-size:16.5px;line-height:1.2}.aiTt small{display:block;font-size:12px;opacity:.85;line-height:1.3}
.aiTt .aiTl{min-width:0}
.aiAv{flex:none;width:38px;height:38px;border-radius:50%;background:#ffffff33;display:grid;place-items:center;position:relative}
.aiAv svg{width:27px;height:27px;display:block;overflow:visible}
.aiAv .aiTag{position:absolute;inset-block-end:-3px;inset-inline-end:-5px;padding:0 5px;border-radius:99px;background:var(--card);color:var(--accent-t,var(--accent));font-size:9px;font-weight:800;line-height:13px;border:1px solid var(--line)}
.aiMs{overflow-anchor:none;flex:1;min-height:0;overflow-y:auto;overscroll-behavior:contain;-webkit-overflow-scrolling:touch;padding:14px 12px 8px;display:flex;flex-direction:column;gap:12px}
.aiM{display:flex;gap:8px;align-items:flex-end;max-width:100%}
.aiM.me{align-self:flex-end}.aiM.ai{align-self:flex-start}
html[dir=rtl] .aiM.me{align-self:flex-start}
html[dir=rtl] .aiM.ai{align-self:flex-end;flex-direction:row-reverse}
.aiM .aiAv{width:30px;height:30px;background:linear-gradient(145deg,var(--accent),color-mix(in srgb,var(--accent) 45%,#7b5cff));box-shadow:0 3px 10px -2px color-mix(in srgb,var(--accent) 55%,transparent)}
.aiM .aiAv svg{width:21px;height:21px}.aiM .aiAv .aiTag{display:none}
.aiB{max-width:min(88%,560px);padding:10px 14px;border-radius:19px;line-height:1.55;font-size:15px;overflow-wrap:anywhere;text-wrap:pretty;box-shadow:0 1px 2px #0000001a,0 6px 16px -8px #0000004d}
.aiM.ai .aiB{background:linear-gradient(180deg,color-mix(in srgb,var(--card) 94%,#fff),var(--card));border:1px solid var(--line);border-bottom-left-radius:5px}
.aiM.me .aiB{background:linear-gradient(145deg,var(--accent),color-mix(in srgb,var(--accent) 74%,#7b5cff));color:var(--on-accent,#fff);border-bottom-right-radius:5px;white-space:pre-wrap}
.aiB strong{font-weight:750}
.aiB p{margin:0 0 .55em}.aiB p:last-child,.aiB ul:last-child,.aiB ol:last-child,.aiB pre:last-child{margin-bottom:0}
.aiB ul,.aiB ol{margin:0 0 .55em;padding-inline-start:1.3em}.aiB li{margin:.12em 0}
.aiB code{font-family:ui-monospace,Menlo,Consolas,monospace;font-size:.92em;padding:1px 5px;border-radius:6px;background:color-mix(in srgb,var(--text) 9%,transparent)}
.aiB pre{margin:0 0 .55em;padding:9px 11px;border-radius:10px;overflow-x:auto;background:color-mix(in srgb,var(--text) 8%,transparent);direction:ltr;text-align:left}
.aiB pre code{padding:0;background:none}
.aiB .aiH{font-weight:800}
.aiB a{color:var(--accent-t,var(--accent));text-decoration:underline;word-break:break-all}
.aiDots{display:inline-flex;gap:4px;padding:5px 2px}.aiDots i{width:7px;height:7px;border-radius:50%;background:var(--muted);opacity:.6}
.aiDots i:nth-child(2){animation-delay:.18s}.aiDots i:nth-child(3){animation-delay:.36s}
.aiErr{color:var(--err);font-size:14px;margin-top:6px}
.aiErr button{margin-inline-start:6px;padding:3px 10px;border-radius:99px;border:1px solid currentColor;background:none;color:inherit;font:inherit;font-size:13px;font-weight:700;cursor:pointer}
.aiHi{margin:auto;text-align:center;padding:18px 12px;display:flex;flex-direction:column;align-items:center;gap:10px;width:100%}
.aiHi .aiBig{width:78px;height:78px;border-radius:50%;display:grid;place-items:center;
  background:linear-gradient(145deg,var(--accent),color-mix(in srgb,var(--accent) 45%,#7b5cff));box-shadow:0 10px 26px color-mix(in srgb,var(--accent) 40%,transparent)}
.aiHi .aiBig svg{width:52px;height:52px;overflow:visible}
.aiHi h2{margin:6px 0 0;font-size:23px}
.aiHi p{margin:0;color:var(--muted);max-width:32ch;line-height:1.5}
.aiSug{display:flex;flex-direction:column;gap:8px;width:100%;max-width:330px;margin-top:8px}
.aiSug button{padding:11px 14px;border-radius:14px;border:1px solid var(--line);background:var(--card);color:var(--text);text-align:start;font:inherit;font-size:14.5px;cursor:pointer}
.aiSug button:hover{border-color:var(--accent)}
@container aip (min-width:700px){.aiSug{max-width:480px}.aiHi p{max-width:44ch}.aiHi h2{font-size:27px}}
.aiPoll{margin-top:12px;padding:12px;border-radius:16px;border:1px solid var(--line);background:color-mix(in srgb,var(--accent) 7%,var(--card))}
.aiPq{font-weight:700;font-size:14.5px;margin-bottom:10px}
.aiPo{display:flex;flex-direction:column;gap:7px}
.aiPb{display:flex;align-items:center;gap:10px;width:100%;padding:10px 12px;border-radius:12px;border:1.5px solid var(--line);background:var(--card);color:var(--text);font:inherit;font-size:14.5px;text-align:start;cursor:pointer;
  transition:border-color .2s,background .2s,transform .15s}
.aiPb:active{transform:scale(.97)}
.aiPb i{flex:none;width:18px;height:18px;border-radius:50%;border:2px solid var(--muted);display:grid;place-items:center;transition:all .2s}
.aiPoll[data-multi="1"] .aiPb i{border-radius:6px}
.aiPb.on{border-color:var(--accent);background:color-mix(in srgb,var(--accent) 14%,var(--card))}
.aiPb.on i{background:var(--accent);border-color:var(--accent)}
.aiPb.on i::after{content:"";width:5px;height:9px;border:solid var(--on-accent,#fff);border-width:0 2px 2px 0;transform:rotate(45deg) translate(-1px,-1px)}
.aiPt{display:flex;gap:6px;margin-top:10px}
.aiPt input{flex:1;min-width:0;padding:9px 13px;border-radius:99px;border:1.5px solid var(--line);background:var(--bg);color:var(--text);font:inherit;font-size:16px}
.aiPt input:focus{outline:none;border-color:var(--accent)}
.aiPt button{flex:none;width:40px;height:40px;border-radius:50%;border:0;background:var(--accent);color:var(--on-accent,#fff);display:grid;place-items:center;cursor:pointer}
.aiPt button svg{width:18px;height:18px;fill:currentColor}
.aiPgo{margin-top:10px;padding:9px 18px;border-radius:99px;border:0;background:var(--accent);color:var(--on-accent,#fff);font:inherit;font-weight:700;font-size:14px;cursor:pointer;transition:opacity .2s,transform .15s}
.aiPgo:disabled{opacity:.35;cursor:default}
.aiPgo:not(:disabled):active{transform:scale(.95)}
.aiQuick{display:flex;flex-wrap:nowrap;gap:7px;margin-top:10px;overflow-x:auto;overscroll-behavior-x:contain;scrollbar-width:none;-webkit-overflow-scrolling:touch;scroll-snap-type:x proximity;padding:2px 1px 4px}
.aiQuick::-webkit-scrollbar{display:none}
.aiQuick button{flex:none;white-space:nowrap;max-width:78vw;overflow:hidden;text-overflow:ellipsis;scroll-snap-align:start;padding:6px 14px;border-radius:99px;border:1.5px solid var(--accent);background:transparent;color:var(--accent-t,var(--accent));font:inherit;font-size:13.5px;font-weight:600;cursor:pointer;transition:background .2s,transform .15s}
.aiQuick button:active{transform:scale(.94)}
.aiQuick button.on{background:var(--accent);color:var(--on-accent,#fff)}
.aiUi{display:flex;flex-direction:column;gap:9px;min-width:min(76vw,320px)}
.aiUiT{font-weight:800;font-size:15px;margin:2px 2px -2px}
.aiTk{display:flex;align-items:center;gap:12px;padding:11px 12px;border-radius:14px;background:var(--card);border:1px solid var(--line);border-inline-start:4px solid var(--dc)}
.aiTkB{flex:1;min-width:0;display:flex;flex-direction:column;gap:3px}
.aiTkB b{font-size:15px;line-height:1.3;font-weight:700;overflow-wrap:anywhere}
.aiTkB em{font-style:normal;font-size:12.5px;color:var(--muted);overflow-wrap:anywhere}
.aiTkB small{font-size:12px;color:var(--muted);opacity:.85}
.aiTk.late .aiTkB small,.aiTk .aiTkP.late~*{color:#e5484d}
.aiTkP{flex:none;max-width:44%;text-align:center;padding:5px 11px;border-radius:99px;font-size:12.5px;line-height:1.25;font-weight:800;color:var(--muted);background:color-mix(in srgb,var(--text) 8%,transparent)}
.aiTkP.soon{color:#e8a000;background:#e8a00024}
.aiTkP.hot{color:#e8590c;background:#e8590c24}
.aiTkP.late{color:#fff;background:#e5484d}
.aiTlW{position:relative;padding-inline-start:20px}
.aiTlW::before{content:"";position:absolute;inset-inline-start:5px;top:8px;bottom:8px;width:2px;border-radius:2px;background:linear-gradient(var(--accent),color-mix(in srgb,var(--accent) 15%,transparent))}
.aiTlD{margin-bottom:10px}
.aiTlH{position:relative;font-size:12.5px;font-weight:800;color:var(--accent-t,var(--accent));margin-bottom:5px}
.aiTlH i{position:absolute;inset-inline-start:-20px;top:3px;width:12px;height:12px;border-radius:50%;background:var(--card);border:3px solid var(--accent)}
.aiTlR{display:grid;grid-template-columns:1fr auto;gap:0 10px;align-items:baseline;padding:6px 10px;margin-bottom:4px;border-inline-start:3px solid var(--dc)}
.aiTlR b{font-size:14px;line-height:1.3;font-weight:650;overflow-wrap:anywhere}.aiTlR small{grid-column:1;font-size:11.5px;color:var(--muted)}
.aiTlR span{grid-row:1/3;grid-column:2;font-size:13px;font-weight:800;color:var(--dc)}
.aiFc{display:flex;align-items:center;gap:14px;padding:14px;border-radius:20px;color:var(--text);background:color-mix(in srgb,var(--dc) 12%,var(--card));border:1px solid color-mix(in srgb,var(--dc) 30%,var(--line))}
.aiFcN{flex:none;min-width:64px;text-align:center;color:var(--dc)}.aiFcN b{display:block;font-size:44px;line-height:.95;font-weight:900;letter-spacing:-.02em}.aiFcN small{font-size:12px;font-weight:800}
.aiFcX{min-width:0;display:flex;flex-direction:column;gap:2px}.aiFcX b{font-size:16px;line-height:1.3;overflow-wrap:anywhere}.aiFcX em{font-style:normal;font-size:12px;color:var(--muted)}.aiFcX span{font-size:13px;font-weight:800;color:var(--dc)}
.aiGgs{display:grid;grid-template-columns:repeat(auto-fill,minmax(84px,1fr));gap:10px}
.aiGg{position:relative;display:flex;flex-direction:column;align-items:center;gap:4px;padding:8px 4px}
.aiGg svg{width:68px;height:68px;transform:rotate(-90deg)}.aiGg circle{fill:none;stroke-width:6;stroke-linecap:round}
.aiGg .bg{stroke:color-mix(in srgb,var(--gc) 18%,transparent)}.aiGg .fg{stroke:var(--gc)}
.aiGg b{position:absolute;top:calc(8px + 34px);left:50%;transform:translate(-50%,-50%);font-size:15px;font-weight:850;color:var(--gc)}
.aiGg small{font-size:11.5px;color:var(--muted);text-align:center;line-height:1.25;overflow-wrap:anywhere}
.aiCh{display:flex;flex-wrap:wrap;gap:7px}.aiCh span{display:inline-flex;align-items:center;gap:7px;padding:6px 12px;border-radius:99px;font-size:13.5px;font-weight:600;background:color-mix(in srgb,var(--dc) 12%,var(--card));border:1px solid color-mix(in srgb,var(--dc) 35%,var(--line))}
.aiCh i{width:9px;height:9px;border-radius:50%;background:var(--dc)}
.aiLs>div{display:flex;justify-content:space-between;gap:10px;padding:8px 2px;border-bottom:1px solid var(--line);font-size:14px}.aiLs>div:last-child{border-bottom:0}.aiLs b{color:var(--accent-t,var(--accent))}
.aiCo{display:flex;gap:10px;align-items:flex-start;padding:11px 13px;border-radius:14px;font-size:14px;line-height:1.45;background:color-mix(in srgb,var(--cc) 11%,var(--card));border:1px solid color-mix(in srgb,var(--cc) 40%,var(--line))}
.aiCo{--cc:var(--accent)}.aiCo.warn{--cc:#e8590c}.aiCo.success{--cc:#22a55e}.aiCo.tip{--cc:#a855f7}
.aiCo svg{flex:none;width:21px;height:21px;fill:none;stroke:var(--cc);stroke-width:2;stroke-linecap:round;stroke-linejoin:round;margin-top:1px}
.aiCo b{display:block;margin-bottom:1px}
.aiStx{display:grid;grid-template-columns:repeat(auto-fit,minmax(70px,1fr));gap:8px}
.aiStx>div{text-align:center;padding:10px 4px;border-radius:14px;background:color-mix(in srgb,var(--accent) 9%,var(--card));border:1px solid var(--line)}
.aiStx b{display:block;font-size:24px;font-weight:900;color:var(--accent-t,var(--accent));line-height:1.1}.aiStx small{font-size:11.5px;color:var(--muted)}
.aiPr{display:flex;flex-direction:column;gap:10px}
.aiPrT{display:flex;justify-content:space-between;gap:10px;font-size:13.5px;margin-bottom:4px}.aiPrT b{font-weight:800}
.aiPr i{display:block;height:8px;border-radius:99px;background:color-mix(in srgb,var(--text) 10%,transparent);overflow:hidden}
.aiPr u{display:block;height:100%;border-radius:inherit;text-decoration:none;transition:width .6s}
.aiSp{margin:0;padding:0;list-style:none;counter-reset:s;display:flex;flex-direction:column;gap:7px}
.aiSp li{counter-increment:s;display:flex;gap:10px;align-items:flex-start;font-size:14.5px;line-height:1.4}
.aiSp li::before{content:counter(s);flex:none;width:22px;height:22px;border-radius:50%;display:grid;place-items:center;font-size:12px;font-weight:800;background:var(--accent);color:var(--on-accent,#fff)}
.c-def{--bc:var(--accent)}.c-blue{--bc:#3b82f6}.c-green{--bc:#22a55e}.c-orange{--bc:#f08c1a}.c-red{--bc:#e5484d}.c-purple{--bc:#8b5cf6}.c-teal{--bc:#14b8a6}.c-pink{--bc:#ec4899}.c-gray{--bc:#64748b}
.aiBk{border-radius:16px;padding:12px 13px;background:color-mix(in srgb,var(--bc) 8%,var(--card));border:1px solid color-mix(in srgb,var(--bc) 26%,var(--line));min-width:0}
.aiBkT{display:flex;align-items:center;gap:8px;font-weight:800;font-size:14.5px;margin-bottom:9px}
.aiBkT .aiIc{color:var(--bc)}
.aiIc{width:19px;height:19px;flex:none;fill:none;stroke:currentColor;stroke-width:1.9;stroke-linecap:round;stroke-linejoin:round}
.aiBk small{display:block;color:var(--muted);font-size:12.5px;line-height:1.35}
.aiNote{margin-top:8px;font-size:12.5px;color:var(--muted);line-height:1.4}
.aiUi.fresh .aiBk.a-fade{animation:aiKFade .5s ease calc(var(--i,0) * 70ms) both}
.aiUi.fresh .aiBk.a-rise{animation:aiKRise .55s cubic-bezier(.2,.9,.3,1) calc(var(--i,0) * 70ms) both}
.aiUi.fresh .aiBk.a-pop{animation:aiKPop .55s cubic-bezier(.34,1.56,.64,1) calc(var(--i,0) * 70ms) both}
.aiUi.fresh .aiBk.a-slide{animation:aiKSlide .55s cubic-bezier(.2,.9,.3,1) calc(var(--i,0) * 70ms) both}
.aiUi.fresh .aiBk.a-glow{animation:aiKRise .5s ease calc(var(--i,0) * 70ms) both,aiKGlow 1.6s ease calc(var(--i,0) * 70ms + .3s) 1}
.aiUi.fresh .aiBk li,.aiUi.fresh .aiBk .aiRtI,.aiUi.fresh .aiBk .aiHeroS>div,.aiUi.fresh .aiBk .aiTmI,.aiUi.fresh .aiBk .aiHlI,.aiUi.fresh .aiBk .aiPzI{animation:aiKRise .45s ease calc(var(--i,0) * 70ms + var(--k,0) * 55ms + 150ms) both}
@keyframes aiKFade{from{opacity:0}to{opacity:1}}
@keyframes aiKRise{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:none}}
@keyframes aiKPop{from{opacity:0;transform:scale(.88)}to{opacity:1;transform:none}}
@keyframes aiKSlide{from{opacity:0;transform:translateX(-26px)}to{opacity:1;transform:none}}
@keyframes aiKGlow{0%,100%{box-shadow:0 0 0 0 transparent}40%{box-shadow:0 0 0 7px color-mix(in srgb,var(--bc) 30%,transparent)}}
.aiAvt{flex:none;width:42px;height:42px;border-radius:50%;display:grid;place-items:center;font-weight:800;font-size:17px;color:#fff;background:linear-gradient(145deg,var(--bc),color-mix(in srgb,var(--bc) 55%,#000))}
.aiAvt .aiIc{width:21px;height:21px}
.aiCtH{display:flex;align-items:center;gap:11px}.aiCtH b{font-size:15.5px}.aiCtH small{margin-top:1px}
.aiCtA{display:flex;flex-direction:column;gap:7px;margin-top:11px}
.aiAcG{display:flex;gap:6px;min-width:0}
.aiAc{flex:1;min-width:0;display:flex;align-items:center;gap:10px;padding:9px 12px;border-radius:12px;border:1px solid color-mix(in srgb,var(--bc) 38%,var(--line));background:color-mix(in srgb,var(--bc) 13%,var(--card));color:var(--text);font:inherit;cursor:pointer;text-align:start;transition:transform .15s,background .2s,color .2s}
.aiAc .aiIc{color:var(--bc)}.aiAc span{min-width:0;display:flex;flex-direction:column}
.aiAc i{font-style:normal;font-weight:750;font-size:13.5px}
.aiAc em{font-style:normal;font-size:12px;color:var(--muted);direction:ltr;text-align:start;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.aiAc:active,.aiAcC:active{transform:scale(.96)}
.aiAcC{flex:none;width:40px;border-radius:12px;border:1px solid var(--line);background:var(--card);color:var(--muted);display:grid;place-items:center;cursor:pointer;transition:transform .15s,background .2s,color .2s}
.aiAc.done,.aiAcC.done{background:var(--bc);color:#fff;border-color:var(--bc)}.aiAc.done .aiIc,.aiAc.done em{color:#fff}
.aiAcT{font-size:13.5px;color:var(--muted)}
.aiCt.row{display:flex;align-items:center;gap:10px;padding:9px 11px}.aiCt.row .aiCtA{flex-direction:row;margin:0;margin-inline-start:auto;flex:none}
.aiCt.row .aiAc em,.aiCt.row .aiAc i,.aiCt.row .aiAcC{display:none}.aiCt.row .aiAc{padding:9px;flex:none}.aiCt.row .aiAvt{width:34px;height:34px;font-size:14px}
.aiCt.big{text-align:center}.aiCt.big .aiCtH{flex-direction:column}.aiCt.big .aiAvt{width:58px;height:58px;font-size:23px}.aiCt.big .aiCtH b{font-size:17px}.aiCt.big .aiAc{padding:13px}
.aiHH{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:9px;font-size:14.5px}.aiHH>.aiIc{color:var(--bc)}
.aiHbadge{margin-inline-start:auto;display:inline-flex;align-items:center;gap:6px;font-size:12px;font-weight:800;padding:3px 10px;border-radius:99px}
.aiHbadge i{width:8px;height:8px;border-radius:50%;background:currentColor}
.aiHbadge.on{color:#22a55e;background:#22a55e1f}.aiHbadge.on i{animation:aiHsP 1.6s ease-in-out infinite}.aiHbadge.off{color:#e5484d;background:#e5484d1f}
@keyframes aiHsP{0%,100%{opacity:1}50%{opacity:.35}}
.aiHtr{display:grid;grid-template-columns:auto minmax(0,1fr);gap:6px 10px;align-items:start;padding:8px 6px;border-bottom:1px dashed color-mix(in srgb,var(--bc) 26%,var(--line))}.aiHtr:last-child{border-bottom:0}
.aiHtr.today{background:color-mix(in srgb,var(--bc) 12%,transparent);border-radius:12px;border-bottom-color:transparent}
.aiHtd{display:flex;flex-direction:column;gap:2px;min-width:44px}.aiHtd b{font-size:14.5px;font-weight:850;white-space:nowrap}
.aiHtd small{font-size:11.5px;color:var(--muted)}.aiHtd em{font-style:normal;font-size:11px;font-weight:800;color:var(--bc)}
.aiHtt{display:flex;flex-wrap:wrap;gap:5px}
.aiHtt i{font-style:normal;direction:ltr;unicode-bidi:isolate;font-variant-numeric:tabular-nums;padding:3px 8px;border-radius:99px;font-size:12.5px;font-weight:800;letter-spacing:0;background:color-mix(in srgb,var(--bc) 15%,var(--card));border:1px solid color-mix(in srgb,var(--bc) 32%,var(--line))}
.aiHtt i.tx{direction:rtl;font-weight:650;font-size:12.5px;letter-spacing:0}
.aiHw{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:4px}
.aiHwd{border-radius:11px;padding:6px 1px;text-align:center;background:color-mix(in srgb,var(--text) 5%,transparent);font-size:10px;line-height:1.35;min-height:52px}
.aiHwd b{display:block;font-size:12.5px;margin-bottom:3px}.aiHwd span{display:block;direction:ltr;font-size:9.5px}.aiHwd.today{background:var(--bc);color:#fff}.aiHwd.none{opacity:.45}
.aiHc{display:flex;flex-wrap:wrap;gap:7px}.aiHc span{padding:5px 11px;border-radius:99px;background:color-mix(in srgb,var(--bc) 14%,var(--card));font-size:13px}
.aiSt2 ol{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:11px;position:relative}
.aiSt2 li{display:flex;gap:11px;align-items:flex-start;position:relative}
.aiStN{flex:none;width:26px;height:26px;border-radius:50%;display:grid;place-items:center;font-size:13px;font-weight:800;color:#fff;background:var(--bc);position:relative;z-index:1}
.aiSt2 li b{font-size:14.5px;line-height:1.35}
.aiSt2.timeline li:not(:last-child)::before{content:"";position:absolute;inset-inline-start:12px;top:26px;bottom:-12px;width:2px;background:color-mix(in srgb,var(--bc) 35%,transparent)}
.aiSt2.cards li{padding:10px;border-radius:13px;background:var(--card);border:1px solid var(--line)}
.aiFaR{display:flex;align-items:center;gap:9px;padding:7px 0;border-bottom:1px solid var(--line);font-size:14px}.aiFaR:last-child{border-bottom:0}
.aiFaR .aiIc{color:var(--bc)}.aiFaR span{flex:1;color:var(--muted)}.aiFaR b{font-weight:750;text-align:end;overflow-wrap:anywhere}
.aiFa.grid{display:grid;grid-template-columns:1fr 1fr;gap:8px}.aiFa.grid>.aiBkT{grid-column:1/-1;margin-bottom:0}
.aiFa.grid .aiFaR{flex-direction:column;align-items:flex-start;gap:3px;padding:9px;border:1px solid var(--line);border-radius:12px;background:var(--card)}.aiFa.grid .aiFaR b{text-align:start}
.aiFa.chips{display:flex;flex-wrap:wrap;gap:7px}.aiFa.chips>.aiBkT{flex-basis:100%;margin-bottom:0}
.aiFa.chips .aiFaR{border:0;padding:5px 11px;border-radius:99px;background:color-mix(in srgb,var(--bc) 14%,var(--card));font-size:13px}
.aiHl{display:flex;flex-wrap:wrap;gap:10px}.aiHl>.aiBkT{flex-basis:100%;margin-bottom:0}
.aiHlI{flex:1;min-width:84px;text-align:center}.aiHlI b{display:block;font-size:32px;line-height:1.05;font-weight:900;color:var(--bc);letter-spacing:-.02em}
.aiHlI span{display:block;font-weight:700;font-size:13px;margin-top:2px}
.aiHl.pill .aiHlI{flex:none;display:inline-flex;align-items:baseline;gap:7px;padding:6px 14px;border-radius:99px;background:color-mix(in srgb,var(--bc) 15%,var(--card))}.aiHl.pill .aiHlI b{font-size:18px}
.aiHl.row .aiHlI{text-align:start}
.aiPz{display:flex;flex-wrap:wrap;gap:8px}.aiPz>.aiBkT{flex-basis:100%;margin-bottom:0}
.aiPzI{display:flex;align-items:baseline;gap:8px;flex-wrap:wrap}.aiPzI span{font-size:13.5px}.aiPzI b{font-weight:850;color:var(--bc);font-size:15px}
.aiPz.tags .aiPzI{padding:6px 13px;border-radius:99px;background:color-mix(in srgb,var(--bc) 14%,var(--card));border:1px solid color-mix(in srgb,var(--bc) 30%,var(--line))}
.aiPz.rows{flex-direction:column;gap:0}.aiPz.rows .aiPzI{justify-content:space-between;padding:8px 0;border-bottom:1px dashed var(--line)}.aiPz.rows .aiPzI:last-child{border-bottom:0}
.aiPz.big .aiPzI{flex:1;min-width:110px;flex-direction:column;align-items:flex-start;gap:2px;padding:10px;border-radius:13px;background:var(--card);border:1px solid var(--line)}.aiPz.big .aiPzI b{font-size:24px}
.aiCo2,.aiBn{display:flex;gap:10px;align-items:flex-start;line-height:1.45;font-size:14px}.aiCo2>.aiIc,.aiBn>.aiIc{color:var(--bc);margin-top:1px}.aiCo2 b{display:block;margin-bottom:1px}
.aiBn{padding:9px 12px;border-radius:12px;background:var(--bc);color:#fff;border:0}.aiBn>.aiIc{color:#fff}.aiBn.card{padding:13px;font-size:15px}
.aiLi ul{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:9px}.aiLi li{display:flex;gap:10px;align-items:flex-start}
.aiLi .aiIc{color:var(--bc);margin-top:1px}.aiLiDot{flex:none;width:8px;height:8px;border-radius:50%;background:var(--bc);margin-top:7px}
.aiLiN{flex:none;width:22px;height:22px;border-radius:50%;display:grid;place-items:center;font-size:12px;font-weight:800;color:#fff;background:var(--bc)}
.aiLi li b{font-size:14.5px;line-height:1.35;font-weight:650}
.aiLi.cards li{padding:10px;border-radius:13px;background:var(--card);border:1px solid var(--line)}
.aiCkI{display:flex;gap:11px;align-items:flex-start;padding:7px 0;cursor:pointer}
.aiCkI input{position:absolute;opacity:0;pointer-events:none}
.aiCkI>i{flex:none;width:22px;height:22px;border-radius:7px;border:2px solid color-mix(in srgb,var(--bc) 55%,var(--line));display:grid;place-items:center;transition:background .2s,transform .2s}
.aiCkI>i .aiIc{width:15px;height:15px;color:#fff;stroke-width:3;stroke-dasharray:24;stroke-dashoffset:24;transition:stroke-dashoffset .3s}
.aiCkI input:checked~i{background:var(--bc);border-color:var(--bc);transform:scale(1.08)}.aiCkI input:checked~i .aiIc{stroke-dashoffset:0}
.aiCkI input:checked~div b{opacity:.55;text-decoration:line-through}
.aiCkI b{font-size:14.5px;font-weight:650;line-height:1.35;transition:opacity .2s}
.aiAcc details{border-bottom:1px solid var(--line)}.aiAcc details:last-child{border-bottom:0}
.aiAcc summary{display:flex;align-items:center;gap:10px;padding:10px 0;cursor:pointer;list-style:none;font-weight:700;font-size:14.5px}
.aiAcc summary::-webkit-details-marker{display:none}.aiAcc summary span{flex:1}
.aiAcc summary .aiIc{color:var(--bc);transition:transform .25s}.aiAcc details[open] summary .aiIc{transform:rotate(90deg)}
.aiAcc details p{margin:0 0 11px;font-size:14px;line-height:1.5;color:var(--text);animation:aiKRise .3s ease both}
.aiTbH{display:flex;gap:6px;margin-bottom:10px;flex-wrap:wrap}
.aiTbH button{padding:6px 14px;border-radius:99px;border:1.5px solid color-mix(in srgb,var(--bc) 40%,var(--line));background:transparent;color:var(--text);font:inherit;font-size:13px;font-weight:700;cursor:pointer;transition:background .2s,color .2s}
.aiTbH button.on{background:var(--bc);color:#fff;border-color:var(--bc)}
.aiTbP{display:none;font-size:14px;line-height:1.55;white-space:pre-line}.aiTbP.on{display:block;animation:aiKRise .3s ease both}
.aiTblW{overflow-x:auto;margin:0 -4px;padding:0 4px}.aiTbl table{border-collapse:collapse;width:100%;font-size:13.5px}
.aiTbl th,.aiTbl td{padding:8px 9px;text-align:start;border-bottom:1px solid var(--line);vertical-align:top}.aiTbl thead th{color:var(--bc);font-weight:800;font-size:12.5px}.aiTbl tbody th{font-weight:700;color:var(--muted)}
.aiTbl.striped tbody tr:nth-child(odd){background:color-mix(in srgb,var(--bc) 7%,transparent)}
.aiCmpC{display:flex;flex-wrap:wrap;gap:9px}.aiCmpC>.aiBkT{flex-basis:100%;margin-bottom:0}
.aiCmpCard{flex:1;min-width:130px;padding:10px;border-radius:13px;background:var(--card);border:1px solid var(--line)}.aiCmpCard>b{display:block;color:var(--bc);margin-bottom:6px}
.aiCmpCard div{font-size:13.5px;padding:3px 0}.aiCmpCard span{display:block;font-size:11.5px;color:var(--muted)}
.aiLkI{display:flex;align-items:center;gap:11px;width:100%;padding:10px 11px;margin-bottom:6px;border-radius:13px;border:1px solid color-mix(in srgb,var(--bc) 30%,var(--line));background:var(--card);color:var(--text);font:inherit;text-align:start;cursor:pointer;transition:transform .15s,border-color .2s}
.aiLkI:last-child{margin-bottom:0}.aiLkI:active{transform:scale(.98)}.aiLkI>.aiIc{color:var(--bc)}.aiLkI .go{margin-inline-start:auto;color:var(--muted);transform:scaleX(-1)}
.aiLkI span{min-width:0;flex:1}.aiLkI b{display:block;font-size:14.5px;font-weight:700}
.aiLk.chips{display:flex;flex-wrap:wrap;gap:7px}.aiLk.chips>.aiBkT{flex-basis:100%;margin-bottom:0}.aiLk.chips .aiLkI{width:auto;margin:0;padding:6px 13px;border-radius:99px}.aiLk.chips small,.aiLk.chips .go{display:none}
.aiLk.buttons .aiLkI{background:var(--bc);color:#fff;border-color:var(--bc);justify-content:center}.aiLk.buttons .aiLkI .aiIc{color:#fff}.aiLk.buttons .go,.aiLk.buttons small{display:none}
.aiLk.buttons .aiLkI span{flex:none}
.aiTmI{display:flex;gap:11px;position:relative;padding-bottom:12px}.aiTmI:last-child{padding-bottom:0}
.aiTmI>i{flex:none;width:12px;height:12px;border-radius:50%;background:var(--bc);margin-top:4px;position:relative;z-index:1}
.aiTm.vertical .aiTmI:not(:last-child)::before{content:"";position:absolute;inset-inline-start:5px;top:16px;bottom:0;width:2px;background:color-mix(in srgb,var(--bc) 32%,transparent)}
.aiTmI em{font-style:normal;font-weight:800;color:var(--bc);font-size:12.5px;display:block}.aiTmI b{font-size:14.5px;font-weight:650}
.aiTm.chips{display:flex;flex-wrap:wrap;gap:8px}.aiTm.chips>.aiBkT{flex-basis:100%;margin-bottom:0}
.aiTm.chips .aiTmI{padding:6px 12px;border-radius:13px;background:var(--card);border:1px solid var(--line);flex-direction:column;gap:0}.aiTm.chips .aiTmI>i,.aiTm.chips small{display:none}
.aiLocH{display:flex;gap:11px;align-items:flex-start}.aiLocH>.aiIc{width:26px;height:26px;color:var(--bc)}.aiLocH b{font-size:15px}
.aiLocA{display:flex;gap:7px;margin-top:11px}
.aiQt.quote{border-inline-start:4px solid var(--bc);border-radius:6px 16px 16px 6px}.aiQt p{margin:0;font-size:15.5px;line-height:1.5;font-weight:600}
.aiQt small{margin-top:6px}.aiQt.definition>b{display:block;color:var(--bc);font-size:15px;margin-bottom:3px}.aiQt.definition p{font-weight:500;font-size:14.5px}
.aiSm>b{display:flex;align-items:center;gap:8px;font-size:15.5px;margin-bottom:5px}.aiSm>b .aiIc{color:var(--bc)}.aiSm p{margin:0 0 6px;font-size:14.5px;line-height:1.5}
.aiSm ul{margin:4px 0 0;padding-inline-start:1.2em}.aiSm li{margin:3px 0;font-size:14px}
.aiSm.plain{background:none;border:0;padding:2px}.aiSm.glass{background:linear-gradient(135deg,color-mix(in srgb,var(--bc) 22%,transparent),color-mix(in srgb,var(--bc) 6%,transparent));-webkit-backdrop-filter:blur(8px);backdrop-filter:blur(8px)}
.aiHg{display:flex;gap:10px;align-items:center;background:none;border:0;padding:2px 2px 0}.aiHg>.aiIc{color:var(--bc);width:22px;height:22px}.aiHg b{font-size:17px;font-weight:850}
.aiHg.accent{border-inline-start:4px solid var(--bc);padding-inline-start:10px;border-radius:2px}.aiHg.centered{justify-content:center;text-align:center}
.aiTg{display:flex;flex-wrap:wrap;gap:7px}.aiTg>.aiBkT{flex-basis:100%;margin-bottom:0}.aiTg span{display:inline-flex;align-items:center;gap:6px;padding:4px 12px;border-radius:99px;background:color-mix(in srgb,var(--bc) 15%,var(--card));font-size:13px;font-weight:650}
.aiTg .aiIc{width:15px;height:15px;color:var(--bc)}
/* nothing inside an answer may ever be wider than the bubble: it wraps, scrolls inside itself, or is shortened */
.aiM .aiB{min-width:0}
.aiUi{width:100%;max-width:100%;min-width:0}
.aiBk{max-width:100%;box-sizing:border-box;overflow-wrap:anywhere}
.aiBk *{min-width:0;max-width:100%}
.aiHtab b{white-space:nowrap}
.aiDemo{position:absolute;inset:0;z-index:30;pointer-events:auto;overflow:hidden;background:transparent;transition:background .9s ease}
.aiDemo.hero{background:#05060d}
.aiDemo.hero.dim,.aiDemo.dim{background:#05060dc4}
.aiDmGlow{position:absolute;left:50%;top:34%;width:min(80vw,360px);aspect-ratio:1;margin:calc(min(80vw,360px) / -2) 0 0 calc(min(80vw,360px) / -2);border-radius:50%;background:radial-gradient(circle,color-mix(in srgb,var(--accent) 50%,transparent) 0%,transparent 66%);opacity:0;transition:opacity .9s;pointer-events:none}
.aiDemo.hero .aiDmGlow{opacity:1;animation:aiDmGlowP 3.4s ease-in-out infinite}
@keyframes aiDmGlowP{0%,100%{transform:scale(1)}50%{transform:scale(1.12)}}
.aiDmX{position:absolute;top:calc(10px + env(safe-area-inset-top));inset-inline-start:10px;z-index:3;width:36px;height:36px;border-radius:50%;border:1.5px solid #ffffff59;background:#0006;color:#fff;display:grid;place-items:center;cursor:pointer;padding:0}
.aiDemo.gate .aiDmX{display:none}
.aiDmX svg{width:16px;height:16px;fill:none;stroke:currentColor;stroke-width:2.4;stroke-linecap:round}
/* Uri walks around: --mx/--my are percentages of the screen, --ms the size */
.aiDmM{position:absolute;left:calc(var(--mx, 50) * 1%);top:calc(var(--my, 34) * 1%);width:var(--ms, 66px);height:var(--ms, 66px);margin:calc(var(--ms, 66px) / -2) 0 0 calc(var(--ms, 66px) / -2);z-index:2;
  transition:left 1.15s cubic-bezier(.34,1.35,.5,1),top 1.15s cubic-bezier(.34,1.35,.5,1),width .9s cubic-bezier(.34,1.3,.5,1),height .9s cubic-bezier(.34,1.3,.5,1),margin .9s cubic-bezier(.34,1.3,.5,1);
  filter:drop-shadow(0 6px 16px color-mix(in srgb,var(--accent) 65%,transparent));pointer-events:none}
.aiDmMi{width:100%;height:100%;transform-origin:50% 80%;animation:aiDmIdle 3.6s ease-in-out infinite}
.aiDmMi svg{width:100%;height:100%;display:block;overflow:visible}
@keyframes aiDmIdle{0%,100%{transform:translate(0,0) rotate(-2deg)}30%{transform:translate(6px,-7px) rotate(3deg)}65%{transform:translate(-6px,-3px) rotate(-3deg)}}
.aiDmS{position:absolute;left:0;right:0;top:0;height:var(--caph,64px);z-index:2;box-sizing:border-box;display:flex;align-items:center;gap:11px;padding:max(10px,env(safe-area-inset-top)) 14px 12px 14px;color:#fff;font-size:16px;font-weight:700;line-height:1.3;pointer-events:none;text-align:start;overflow:hidden;opacity:0;transition:opacity .3s ease;
  background:linear-gradient(110deg,#6d5df6,#a259ff 38%,#ff5fa2 70%,#6d5df6);background-size:260% 100%;animation:aiDmBg 7s linear infinite;box-shadow:0 10px 34px -8px #7b5cffcc,0 0 0 1px #ffffff2e inset}
@keyframes aiDmBg{to{background-position:260% 0}}
.aiDmS::before{content:"";position:absolute;top:0;bottom:0;width:38%;left:-45%;background:linear-gradient(100deg,transparent,#ffffff55,transparent);transform:skewX(-18deg);animation:aiDmShine 2.8s ease-in-out infinite;pointer-events:none}
@keyframes aiDmShine{0%{left:-45%}55%,100%{left:125%}}
.aiDmS.on{opacity:1}
.aiDmS.on .aiDmSt{animation:aiDmSay .5s cubic-bezier(.2,.9,.3,1)}
@keyframes aiDmSay{0%{transform:translateY(-10px) scale(.96);filter:brightness(2.2)}100%{transform:none;filter:none}}
.aiDmSa{position:relative;flex:none;width:46px;height:46px;border-radius:50%;background:#fff;display:grid;place-items:center;box-shadow:0 4px 14px -3px #0006;animation:aiDmTalk 1.1s ease-in-out infinite}
.aiDmSa::before,.aiDmSa::after{content:"";position:absolute;inset:-2px;border-radius:50%;border:2px solid #ffffffaa;animation:aiDmRing 1.8s ease-out infinite}.aiDmSa::after{animation-delay:.9s}
@keyframes aiDmRing{0%{transform:scale(1);opacity:.9}100%{transform:scale(1.6);opacity:0}}
@keyframes aiDmTalk{0%,100%{transform:scale(1) rotate(-2deg)}30%{transform:scale(1.07,.95) rotate(2deg)}60%{transform:scale(.97,1.05) rotate(-1deg)}}
.aiDmSa svg{width:34px;height:34px;display:block;overflow:visible}
.aiDmSt{position:relative;flex:1;min-width:0;text-shadow:0 1px 10px #3a1c8a99}
.aiDmSt b{font-size:17px;font-weight:850}
.aiDmSn{position:relative;flex:none;min-width:34px;height:22px;padding:0 7px;box-sizing:border-box;border-radius:99px;background:#00000040;display:grid;place-items:center;font-size:11.5px;font-weight:800;letter-spacing:.04em;direction:ltr}
.aiDmPb{position:absolute;left:0;right:0;bottom:0;height:4px;background:#00000030}.aiDmPb::after{content:"";position:absolute;inset-block:0;left:0;width:100%;transform-origin:0 50%;transform:scaleX(0);background:linear-gradient(90deg,#fff,#ffd24a);box-shadow:0 0 12px #ffd24a}
.aiDmPb.run::after{animation:aiDmFill var(--pd,8s) linear forwards}
@keyframes aiDmFill{to{transform:scaleX(1)}}
.aiDemo.hero .aiDmS{left:26px;right:26px;height:auto;display:block;padding:0;background:none;box-shadow:none;animation:none;text-align:center;font-size:17px;font-weight:600;line-height:1.55;color:#ffffffe6;text-shadow:0 2px 14px #000;overflow:visible}
.aiDemo.hero .aiDmS::before,.aiDemo.hero .aiDmSa,.aiDemo.hero .aiDmSn,.aiDemo.hero .aiDmPb{display:none}
.aiDemo.hero .aiDmSt{text-shadow:0 2px 14px #000;animation:none!important}
.aiDemo.hero .aiDmSt b{display:block;margin-bottom:4px;font-size:25px;font-weight:850;color:#fff}
.aiDmSt i{font-style:normal;display:inline-block;opacity:0;animation:aiDmWord .4s var(--wd) cubic-bezier(.2,.9,.3,1) both}
@keyframes aiDmWord{from{opacity:0;transform:translateY(8px);filter:blur(4px)}to{opacity:1;transform:none;filter:blur(0)}}
.aiDmMi.jump{animation:aiDmJump .75s cubic-bezier(.3,1.6,.5,1)}
.aiDmMi.wig{animation:aiDmWig .8s ease-in-out}
.aiDmMi.spin{animation:aiDmSpin .9s cubic-bezier(.3,1.2,.4,1)}
.aiDmMi.flip{animation:aiDmFlip 1s cubic-bezier(.3,1.1,.4,1)}
.aiDmMi.shake{animation:aiDmShake .7s ease-in-out}
.aiDmMi.wave{animation:aiDmWave 1.6s ease-in-out}
@keyframes aiDmJump{0%{transform:none}30%{transform:translateY(-26px) scale(.92,1.1)}55%{transform:translateY(0) scale(1.14,.88)}75%{transform:translateY(-9px)}100%{transform:none}}
@keyframes aiDmWig{0%,100%{transform:rotate(0)}20%{transform:rotate(-14deg)}45%{transform:rotate(12deg)}70%{transform:rotate(-8deg)}}
@keyframes aiDmSpin{0%{transform:rotate(0) scale(1)}60%{transform:rotate(380deg) scale(1.25)}100%{transform:rotate(360deg) scale(1)}}
@keyframes aiDmFlip{0%{transform:perspective(500px) rotateY(0)}100%{transform:perspective(500px) rotateY(360deg)}}
@keyframes aiDmShake{0%,100%{transform:translateX(0)}15%{transform:translateX(-9px) rotate(-6deg)}35%{transform:translateX(9px) rotate(6deg)}55%{transform:translateX(-6px)}75%{transform:translateX(5px)}}
@keyframes aiDmWave{0%,100%{transform:rotate(0)}15%{transform:rotate(-16deg)}30%{transform:rotate(14deg)}45%{transform:rotate(-12deg)}60%{transform:rotate(10deg)}}
/* the two buttons that open under Uri at the start (the walk-through is required) */
.aiDmBtns{position:absolute;left:24px;right:24px;bottom:calc(9% + env(safe-area-inset-bottom));z-index:2;display:flex;flex-direction:column;gap:10px}
.aiDmBtns.out{animation:aiDmOut .3s ease both}
@keyframes aiDmOut{to{opacity:0;transform:translateY(12px)}}
.aiDmBtns button{padding:14px;border-radius:16px;border:0;font:inherit;font-size:16px;font-weight:780;cursor:pointer;transition:transform .15s;animation:aiKPop .55s cubic-bezier(.34,1.56,.64,1) both}
.aiDmBtns .aiDmNow{animation-delay:1.1s}.aiDmBtns .aiDmLater{animation-delay:1.3s}
.aiDmBtns button:active{transform:scale(.97)}
.aiDmNow{background:linear-gradient(145deg,var(--accent),color-mix(in srgb,var(--accent) 60%,#7b5cff));color:var(--on-accent,#fff)}
.aiDmLater{background:#ffffff1f;color:#fff;border:1px solid #ffffff40!important}
.aiDmGo{position:absolute;left:22px;right:22px;bottom:calc(34px + env(safe-area-inset-bottom));z-index:2;padding:15px;border-radius:17px;border:0;font:inherit;font-size:17px;font-weight:800;color:var(--on-accent,#fff);background:linear-gradient(145deg,var(--accent),color-mix(in srgb,var(--accent) 60%,#7b5cff));cursor:pointer;box-shadow:0 12px 30px -8px color-mix(in srgb,var(--accent) 70%,#000);animation:aiKPop .55s cubic-bezier(.34,1.56,.64,1) both}
.aiDmTap{position:absolute;z-index:3;width:48px;height:48px;margin:-24px 0 0 -24px;border-radius:50%;border:3px solid #fff;background:#ffffff40;pointer-events:none;animation:aiDmTapA 1.1s ease-out both}
.aiDmTap.hold{animation:aiDmHoldA .9s ease-in-out both}
@keyframes aiDmTapA{0%{transform:scale(.3);opacity:1}100%{transform:scale(1.6);opacity:0}}
@keyframes aiDmHoldA{0%{transform:scale(.4);opacity:0}25%{opacity:1;transform:scale(1)}100%{transform:scale(.8);opacity:1;background:#ffffff80}}
.aiDmP{position:absolute;z-index:4;width:20px;height:20px;margin:-10px 0 0 -10px;pointer-events:none;opacity:0;animation:aiDmPart 1.7s cubic-bezier(.2,.8,.3,1) var(--dl,0ms) both}
.aiDmP .aiIc{width:100%;height:100%;fill:currentColor;stroke:none}
.aiDmP.dot{width:9px;height:9px;margin:-4px 0 0 -4px;border-radius:50%}
@keyframes aiDmPart{0%{opacity:0;transform:translate(0,0) scale(.3)}15%{opacity:1}100%{opacity:0;transform:translate(var(--dx),var(--dy)) scale(1) rotate(40deg)}}
.aiSd.aiDmPress{transform:scale(.8)!important;box-shadow:0 0 0 9px color-mix(in srgb,var(--accent) 38%,transparent)}
.aiIn.aiDmFocus textarea{outline:2px solid var(--accent);border-color:transparent;box-shadow:0 0 0 6px color-mix(in srgb,var(--accent) 22%,transparent)}
@media (prefers-reduced-motion:reduce){.aiDmS,.aiDmS::before,.aiDmSa,.aiDmSa::before,.aiDmSa::after,.aiDmSt,.aiDmMi,.aiDmSt i,.aiDmTap,.aiDmGo,.aiDmGlow,.aiDmP,.aiDmBtns button{animation:none!important}.aiDmSt i{opacity:1}}
.aiBk.aiHero{position:relative;overflow:hidden;display:flex;flex-wrap:wrap;align-items:center;gap:12px;padding:16px;color:#fff;border:0;background:linear-gradient(135deg,var(--bc),color-mix(in srgb,var(--bc) 52%,#1b1238))}
.aiBk.aiHero::before{content:"";position:absolute;inset-inline-end:-34px;top:-46px;width:140px;height:140px;border-radius:50%;background:#ffffff1c}
.aiBk.aiHero::after{content:"";position:absolute;inset-inline-start:-24px;bottom:-52px;width:110px;height:110px;border-radius:50%;background:#ffffff12}
.aiBk.aiHero.soft{color:var(--text);background:color-mix(in srgb,var(--bc) 14%,var(--card));border:1px solid color-mix(in srgb,var(--bc) 30%,var(--line))}
.aiHeroI{position:relative;flex:none;width:48px;height:48px;border-radius:15px;background:#ffffff2e;display:grid;place-items:center;animation:aiHeroF 3.2s ease-in-out infinite}.aiHeroI .aiIc{width:27px;height:27px;color:#fff}
.aiHero.soft .aiHeroI{background:var(--bc)}
.aiHeroT{position:relative;flex:1;min-width:0}.aiHeroT b{display:block;font-size:19px;font-weight:850;line-height:1.2}.aiHeroT em{display:block;font-style:normal;font-size:14px;opacity:.92;margin-top:2px}
.aiBk.aiHero .aiHeroT small{color:#ffffffd6;margin-top:3px}.aiBk.aiHero.soft .aiHeroT small{color:var(--muted)}
.aiHeroS{position:relative;flex-basis:100%;display:flex;gap:8px}.aiHeroS>div{flex:1;min-width:0;text-align:center;padding:8px 6px;border-radius:13px;background:#ffffff26}
.aiHero.soft .aiHeroS>div{background:color-mix(in srgb,var(--bc) 16%,var(--card))}
.aiHeroS b{display:block;font-size:20px;font-weight:900;line-height:1.15;direction:ltr}.aiBk.aiHero .aiHeroS small{color:#ffffffcc;font-size:12px}.aiBk.aiHero.soft .aiHeroS small{color:var(--muted)}
@keyframes aiHeroF{0%,100%{transform:translateY(0) rotate(-3deg)}50%{transform:translateY(-4px) rotate(3deg)}}
.aiRtI{display:flex;align-items:center;gap:12px;padding:8px 0}.aiRtI+.aiRtI{border-top:1px dashed color-mix(in srgb,var(--bc) 26%,var(--line))}
.aiRtI>i{flex:none;min-width:46px;height:38px;padding:0 10px;box-sizing:border-box;border-radius:13px;display:grid;place-items:center;font-style:normal;font-weight:900;font-size:18px;letter-spacing:-.01em;color:#fff;direction:ltr;background:linear-gradient(145deg,var(--rc),color-mix(in srgb,var(--rc) 58%,#000));box-shadow:0 5px 14px -5px var(--rc)}
.aiRtI>i.dot{min-width:14px;width:14px;height:14px;padding:0;border-radius:50%}
.aiRtI>div{min-width:0;flex:1}.aiRtI b{display:block;font-size:14.5px;line-height:1.25}
.aiRt.pills .aiRtI{display:inline-flex;margin:0 6px 6px 0;padding:5px 12px 5px 6px;border:1px solid color-mix(in srgb,var(--rc) 40%,var(--line));border-radius:99px;background:color-mix(in srgb,var(--rc) 12%,var(--card))}.aiRt.pills .aiRtI+.aiRtI{border-top:1px solid color-mix(in srgb,var(--rc) 40%,var(--line))}
.aiRt.pills .aiRtI>i{min-width:30px;height:28px;border-radius:99px;font-size:14px}.aiRt.pills .aiRtI small{display:none}
/* ---- desktop (a mouse and a wide screen): answers with cards use the whole column, side by side; hover feedback; the walk-through stays inside the column */
@media (hover:hover){
  .aiBk{transition:box-shadow .2s ease,border-color .2s ease}
  .aiBk:hover{border-color:color-mix(in srgb,var(--bc) 55%,var(--line));box-shadow:0 10px 26px -14px color-mix(in srgb,var(--bc) 70%,transparent)}
  .aiQuick button:hover{background:color-mix(in srgb,var(--accent) 14%,transparent)}
  .aiTk:hover{border-color:color-mix(in srgb,var(--accent) 45%,var(--line))}
}
@container aip (min-width:700px){
  .aiQuick{flex-wrap:wrap;overflow:visible;gap:8px}
  .aiQuick button{font-size:14px;padding:7px 16px}
  .aiB{max-width:min(88%,640px)}
  .aiDmS{padding-left:max(14px,calc((100% - var(--aicol,840px)) / 2 + 14px));padding-right:max(14px,calc((100% - var(--aicol,840px)) / 2 + 14px));font-size:18px}
  .aiDmSt b{font-size:20px}
  .aiDemo.hero .aiDmS{left:50%;right:auto;width:min(700px,90%);padding:0;transform:translateX(-50%);font-size:22px}
  .aiDemo.hero .aiDmSt b{font-size:36px;margin-bottom:8px}
  .aiDmBtns,.aiDmGo{left:max(24px,calc(50% - 190px));right:max(24px,calc(50% - 190px))}
  .aiDmBtns button,.aiDmGo{font-size:17px;padding:16px}
  .aiDmGlow{width:560px;margin:-280px 0 0 -280px}
  .aiDmX{width:42px;height:42px;inset-inline-start:max(14px,calc((100% - var(--aicol,840px)) / 2))}
}
/* answers with cards (every kind of display): the bubble takes the whole row (minus Uri's small face) at ANY width, so the cards are never squeezed to their content;
   from tablet width up the cards flow into as many columns as fit (each wants about 300px), full-width kinds take a whole row, and the last row stretches */
@supports selector(:has(a)){
  html[dir] .aiM.ai:has(.aiUi){align-self:stretch}
  .aiM.ai:has(.aiUi) .aiB{flex:1;min-width:0;max-width:100%}
  @container aip (min-width:600px){
    .aiUi{display:flex;flex-direction:row;flex-wrap:wrap;gap:11px;align-items:stretch}
    .aiUi>*{flex:1 1 300px;min-width:0}
    .aiUi>.aiUiT,.aiUi>.aiHero,.aiUi>.aiHg,.aiUi>.aiTg,.aiUi>.aiTbl,.aiUi>.aiAcc,.aiUi>.aiTb,.aiUi>.aiTm,.aiUi>.aiCmpC,.aiUi>.aiQuick,.aiUi>.aiCo,.aiUi>.aiCo2,.aiUi>.aiBn,.aiUi>.aiLk,.aiUi>.aiHl,.aiUi>.aiFoc,.aiUi>.aiSm,.aiUi>.aiStx{flex-basis:100%}
  }
}
/* ---- computer only: the chat as a small floating window (phone-sized) next to the app, which stays usable; it can be dragged and resized */
.aiRz{display:none}
.aiP.aiWin{left:var(--aiwx,24px);top:var(--aiwy,24px);right:auto;bottom:auto;width:var(--aiww,400px);height:var(--aiwh,640px)!important;transform:none!important;z-index:60;
  border-radius:18px;border:1px solid color-mix(in srgb,var(--accent) 38%,var(--line));box-shadow:0 26px 70px -14px #000d,0 0 0 1px #0005}
.aiP.aiWin .aiHd{cursor:grab;user-select:none;-webkit-user-select:none}.aiP.aiWin .aiHd:active{cursor:grabbing}
.aiP.aiWin .aiRz{display:block;position:absolute;right:0;bottom:0;width:22px;height:22px;z-index:50;cursor:nwse-resize;touch-action:none;
  background:linear-gradient(135deg,transparent 52%,color-mix(in srgb,var(--muted) 70%,transparent) 52% 60%,transparent 60% 72%,color-mix(in srgb,var(--muted) 70%,transparent) 72% 80%,transparent 80%)}
.aiP:has(.aiDemo) [data-a="win"]{display:none}
.aiHb[data-a="win"][hidden]{display:none}
/* ---- the WIDE designs (a computer, an iPad): not the phone cards stretched, but each display laid out for a big screen. They apply by the chat's own width, so the small floating window gets the phone design. */
@container aip (min-width:760px){
  .aiM.ai:has(.aiUi) .aiB{padding:16px 18px}
  .aiUi{align-items:flex-start}
  .aiBk{padding:18px 20px;border-radius:20px}
  .aiBkT{font-size:16.5px;margin-bottom:13px;gap:10px}.aiBkT .aiIc{width:22px;height:22px}
  .aiBk small{font-size:13.5px}
  .aiUiT{font-size:17px}
  /* opening card: icon + title on one side, the big numbers on the other */
  .aiBk.aiHero{padding:24px 28px;gap:24px;flex-wrap:wrap;align-items:center}
  .aiHeroI{width:68px;height:68px;border-radius:20px}.aiHeroI .aiIc{width:36px;height:36px}
  .aiHeroT b{font-size:29px}.aiHeroT em{font-size:16px}.aiBk.aiHero .aiHeroT small{font-size:14.5px}
  .aiHeroS{flex:1 1 auto;flex-basis:auto;margin-inline-start:auto;gap:12px;justify-content:flex-end}.aiHeroS>div{min-width:140px;padding:14px 18px;border-radius:16px}.aiHeroS b{font-size:30px}.aiBk.aiHero .aiHeroS small{font-size:13px}
  /* deadlines, grades, courses */
  .aiTk{padding:15px 18px;border-radius:16px;gap:16px}.aiTkB b{font-size:16.5px}.aiTkB em{font-size:13.5px}.aiTkB small{font-size:13px}.aiTkP{font-size:13.5px;padding:6px 14px}
  .aiGgs{grid-template-columns:repeat(auto-fill,minmax(124px,1fr));gap:14px}
  .aiGg svg{width:96px;height:96px}.aiGg circle{stroke-width:7}.aiGg b{top:calc(8px + 48px);font-size:20px}.aiGg small{font-size:13px}
  .aiCh{gap:9px}.aiCh span{padding:8px 16px;font-size:14.5px}
  /* contact: who on one side, the actions in a row on the other */
  .aiCt.card,.aiCt.big{display:flex;flex-wrap:wrap;align-items:center;gap:16px 26px}
  .aiCt.card .aiCtH,.aiCt.big .aiCtH{flex:1 1 230px}.aiCt.card .aiNote,.aiCt.big .aiNote{flex-basis:100%;order:3;margin:0}
  .aiCt.card .aiCtA,.aiCt.big .aiCtA{flex:1 1 300px;flex-direction:row;flex-wrap:wrap;margin:0}.aiCt.card .aiAcG{flex:1 1 200px}
  .aiAvt{width:52px;height:52px;font-size:21px}.aiCtH b{font-size:17px}
  .aiAc{padding:11px 15px}.aiAc i{font-size:14.5px}.aiAc em{font-size:12.5px}
  /* hours */
  .aiHtr{padding:11px 14px;gap:6px 22px}.aiHtd b{font-size:15.5px}.aiHtt{gap:8px}.aiHtt i{padding:5px 13px;font-size:14px}.aiHtt i.tx{font-size:13.5px}
  .aiHw{gap:9px}.aiHwd{min-height:92px;padding:14px 4px;border-radius:15px;font-size:12px}.aiHwd b{font-size:16px;margin-bottom:6px}.aiHwd span{font-size:12.5px}
  .aiHc span{padding:7px 15px;font-size:14px}
  /* steps: numbered tiles instead of a thin vertical line */
  .aiSt2 ol{flex-direction:row;flex-wrap:wrap;gap:12px}
  .aiSt2 li{flex:1 1 190px;flex-direction:column;align-items:flex-start;gap:10px;padding:14px 15px;border-radius:15px;background:var(--card);border:1px solid var(--line)}
  .aiSt2.timeline li:not(:last-child)::before{display:none}
  .aiStN{width:34px;height:34px;font-size:16px}.aiSt2 li b{font-size:15.5px}
  /* facts, lists, checklists: two columns inside the card */
  .aiFa:not(.chips):not(.grid),.aiCk{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));column-gap:30px}
  .aiFa:not(.chips):not(.grid)>.aiBkT,.aiCk>.aiBkT{grid-column:1/-1}
  .aiFaR{padding:10px 0;font-size:15px}
  .aiCkI{padding:9px 0}.aiCkI b{font-size:15.5px}
  .aiLi ul{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px 26px}.aiLi li b{font-size:15.5px}.aiLi.cards ul{gap:12px}
  /* numbers */
  .aiHl{gap:14px}.aiHlI b{font-size:46px}.aiHlI span{font-size:15px;margin-top:4px}
  .aiPzI span{font-size:15px}.aiPzI b{font-size:19px}.aiPz.tags .aiPzI{padding:9px 20px}.aiPz.big .aiPzI{padding:14px 16px}.aiPz.big .aiPzI b{font-size:32px}
  .aiStx{grid-template-columns:repeat(auto-fit,minmax(120px,1fr));gap:12px}.aiStx>div{padding:16px 6px;border-radius:16px}.aiStx b{font-size:36px}.aiStx small{font-size:13px}
  .aiPr{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px 28px}.aiPrT{font-size:15px}.aiPr i{height:11px}
  /* notes, banners, text */
  .aiCo2,.aiBn{font-size:15.5px;gap:14px}.aiBn{padding:14px 20px;border-radius:14px}
  .aiCo2>.aiIc,.aiBn>.aiIc{width:24px;height:24px}
  .aiQt p{font-size:17px;line-height:1.6}.aiSm p,.aiSm li{font-size:15.5px}.aiSm li{margin:.25em 0}
  .aiHg b{font-size:21px}.aiHg small{font-size:14.5px}
  .aiTg span,.aiTg i{font-size:14.5px;padding:7px 16px}
  /* questions, tabs, tables */
  .aiAcc summary{font-size:16px;padding:14px 0}.aiAcc details p{font-size:15.5px;line-height:1.6}
  .aiTbH button{padding:8px 20px;font-size:14.5px}.aiTbP{font-size:15.5px}
  .aiTbl table{font-size:15px}.aiTbl th,.aiTbl td{padding:12px 16px}.aiTbl thead th{font-size:13.5px}
  .aiCmpC{gap:13px}.aiCmpCard{flex:1 1 230px;padding:16px;border-radius:16px}
  /* links and places */
  .aiLk.list,.aiLk.buttons,.aiLk.chips{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}
  .aiLk>.aiBkT{grid-column:1/-1;margin-bottom:3px}
  .aiLoc{display:flex;flex-wrap:wrap;align-items:center;gap:16px 28px}.aiLocH{flex:1 1 260px}.aiLocA{flex:1 1 300px}
  /* routes: one tile per line / option */
  .aiRt.badges{display:grid;grid-template-columns:repeat(auto-fill,minmax(165px,1fr));gap:12px}
  .aiRt.badges>.aiBkT{grid-column:1/-1;margin-bottom:0}
  .aiRt.badges .aiRtI{flex-direction:column;align-items:flex-start;gap:12px;padding:16px;border:1px solid var(--line);border-radius:16px;background:var(--card)}
  .aiRt.badges .aiRtI+.aiRtI{border-top:1px solid var(--line)}
  .aiRtI>i{min-width:58px;height:46px;border-radius:15px;font-size:23px}.aiRtI b{font-size:16px}
  .aiTm .aiTmI b{font-size:15.5px}
}
@container aip (min-width:1000px){
  .aiUi>*{flex-basis:360px}
  .aiBk.aiHero{padding:28px 34px;flex-wrap:nowrap}
  .aiHeroS{flex:none}.aiHeroT b{font-size:32px}.aiHeroS b{font-size:34px}
}
.aiDev{margin:16px 0 4px;border:1px dashed var(--line);border-radius:14px;padding:2px 12px;opacity:.85}
.aiDev>summary{cursor:pointer;padding:10px 0;font-size:13px;font-weight:700;color:var(--muted);list-style:none}.aiDev>summary::-webkit-details-marker{display:none}
.aiDevB{display:flex;flex-direction:column;gap:9px;padding:2px 0 12px}.aiDevN{margin:0;font-size:12.5px;line-height:1.5;color:var(--muted)}
.aiDevS{font-size:13px;font-weight:700}.aiDevR{display:flex;gap:6px;flex-wrap:wrap}
.aiDev select,.aiDev input[type=password]{flex:1;min-width:0;padding:8px 10px;border-radius:10px;border:1px solid var(--line);background:var(--bg);color:var(--text);font:inherit;font-size:13px}
.aiDev button{padding:8px 12px;border-radius:10px;border:1px solid var(--accent);background:transparent;color:var(--accent-t,var(--accent));font:inherit;font-size:13px;font-weight:700;cursor:pointer}
.aiDev button.danger{border-color:var(--err,#e5484d);color:var(--err,#e5484d)}.aiDev button:disabled{opacity:.5}
.aiDevC{display:flex;align-items:center;gap:8px;font-size:13.5px;font-weight:700}.aiDevOut{font-size:12.5px}
.aiUse{display:flex;flex-direction:column;gap:14px;padding-top:6px}.aiUseT{display:flex;gap:10px}.aiUseT>div{flex:1;text-align:center;padding:12px 6px;border-radius:14px;background:var(--card);border:1px solid var(--line)}
.aiUseT b{display:block;font-size:26px;font-weight:900;color:var(--accent-t,var(--accent))}.aiUseT small{font-size:12px;color:var(--muted)}
.aiUseB{display:flex;align-items:flex-end;gap:6px;height:110px}.aiUseB>div{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:flex-end;gap:4px;height:100%;font-size:11px;color:var(--muted)}
.aiUseB i{display:block;width:100%;border-radius:6px 6px 2px 2px;background:linear-gradient(var(--accent),color-mix(in srgb,var(--accent) 50%,#7b5cff));min-height:2px}.aiUseB em{font-style:normal;font-weight:800;color:var(--text)}
.aiUseM{font-size:13px}.aiUseM>div{display:flex;justify-content:space-between;gap:8px;padding:6px 0;border-bottom:1px solid var(--line)}
.aiHb[data-a="use"][hidden]{display:none}
.aiWipe{display:flex;align-items:center;justify-content:center;gap:8px;width:100%;margin:18px 0 8px;padding:12px;border-radius:14px;border:1.5px solid color-mix(in srgb,var(--err,#e5484d) 55%,transparent);background:color-mix(in srgb,var(--err,#e5484d) 9%,transparent);color:var(--err,#e5484d);font:inherit;font-size:14px;font-weight:700;cursor:pointer}
.aiWipe svg{width:18px;height:18px;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}
.aiWipe:active{transform:scale(.98)}
.aiDemo.must .aiDmX{display:none}
.aiLocked{opacity:.6}
.aiLocked button{cursor:default}
.aiHs{flex:1;min-height:0;overflow-y:auto;overscroll-behavior:contain;padding:6px 10px}
.aiHr{display:flex;flex-direction:column;gap:2px;width:100%;text-align:start;padding:11px 12px;border:0;border-bottom:1px solid var(--line);border-radius:0;background:none;color:var(--text);font:inherit;cursor:pointer}
.aiHr b{font-weight:650;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.aiHr small{color:var(--muted);font-size:12.5px}
.aiHr.on{background:var(--accent-soft)}
.aiHe{margin:auto;color:var(--muted);text-align:center;padding:24px}
.aiFt{flex:none;padding:8px max(10px,env(safe-area-inset-right),calc((100% - var(--aicol,840px)) / 2)) calc(8px + env(safe-area-inset-bottom)) max(10px,env(safe-area-inset-left),calc((100% - var(--aicol,840px)) / 2));border-top:1px solid var(--line);background:color-mix(in srgb,var(--card) 92%,var(--bg))}
.aiP.aiKb .aiFt{padding-bottom:8px}                      /* the keyboard covers the home-indicator area: no gap between the input and the keyboard */
.aiSt{font-size:12.5px;color:var(--muted);text-align:center;padding:0 0 6px}
.aiIn{display:flex;gap:8px;align-items:flex-end}
.aiIn textarea{flex:1;min-width:0;resize:none;min-height:44px;max-height:132px;padding:11px 14px;border-radius:22px;border:1px solid var(--line);background:var(--bg);color:var(--text);font:inherit;font-size:16px;line-height:1.35}
.aiIn textarea:focus{outline:2px solid var(--accent);outline-offset:0;border-color:transparent}
.aiSd{flex:none;width:44px;height:44px;padding:0;border:0;border-radius:50%;background:var(--accent);color:var(--on-accent,#fff);display:grid;place-items:center;cursor:pointer}
.aiSd:disabled{opacity:.45;cursor:default}
.aiSd svg{width:21px;height:21px;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}
.aiSd .aiStopI{fill:currentColor;stroke:none}
html[dir=rtl] .aiSd .aiSendI{transform:scaleX(-1)}
.aiNt{font-size:11.5px;color:var(--muted);text-align:center;padding-top:6px;line-height:1.4}
.aiMs,.aiHs{padding-left:max(12px,env(safe-area-inset-left),calc((100% - var(--aicol,840px)) / 2));padding-right:max(12px,env(safe-area-inset-right),calc((100% - var(--aicol,840px)) / 2))}

/* long-press menu on a message */
.aiMnBg{position:absolute;inset:0;z-index:5;background:transparent}
.aiMn{position:absolute;z-index:7;min-width:200px;max-width:calc(100% - 16px);padding:6px;border-radius:16px;background:var(--card);border:1px solid var(--line);box-shadow:0 14px 40px #0006;display:flex;flex-direction:column}
.aiMi{display:flex;align-items:center;gap:12px;width:100%;padding:12px;border:0;border-radius:10px;background:none;color:var(--text);font:inherit;font-size:15px;text-align:start;cursor:pointer}
.aiMi:hover,.aiMi:focus-visible{background:var(--accent-soft);outline:none}
.aiMi svg{width:19px;height:19px;flex:none;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round;color:var(--accent-t,var(--accent))}
.aiHoldRow{position:relative;z-index:6}
.aiP:not(.aiBusy) .aiHd .aiAv{animation:aiBreathe 4.2s ease-in-out infinite}
.aiTk,.aiTlR,.aiGg,.aiCh span,.aiFc,.aiCo{transition:transform .16s ease,background-color .2s}
.aiTk:active,.aiTlR:active,.aiGg:active,.aiCh span:active,.aiFc:active{transform:scale(.982)}
.aiPeek{position:absolute;z-index:7;width:48px;height:30px;overflow:hidden;pointer-events:none}
.aiPeekF{position:absolute;left:0;bottom:-20px;width:48px;height:48px;animation:aiPeekUp .6s .1s cubic-bezier(.34,1.56,.64,1) both}
.aiPeekF svg{width:100%;height:100%;display:block;overflow:visible;filter:drop-shadow(0 3px 8px #0007);animation:aiPeekLook 2.6s .8s ease-in-out infinite}
.aiPeek.below .aiPeekF{top:-20px;bottom:auto;animation-name:aiPeekDown}
@keyframes aiPeekUp{from{transform:translateY(80%) rotate(-14deg) scale(.7);opacity:0}55%{opacity:1}to{transform:none;opacity:1}}
@keyframes aiPeekDown{from{transform:translateY(-80%) rotate(166deg) scale(.7);opacity:0}55%{opacity:1}to{transform:rotate(180deg);opacity:1}}
@keyframes aiPeekLook{0%,100%{transform:translateX(0) rotate(0)}28%{transform:translateX(7px) rotate(7deg)}62%{transform:translateX(-6px) rotate(-6deg)}}
.aiMn .aiMi{animation:aiMiIn .32s cubic-bezier(.2,.9,.3,1) calc(var(--k,0) * 45ms + 60ms) both}
@keyframes aiMiIn{from{opacity:0;transform:translateY(8px) scale(.96)}to{opacity:1;transform:none}}
.aiUi.fresh .aiTk,.aiUi.fresh .aiTlR,.aiUi.fresh .aiGg,.aiUi.fresh .aiFc{animation:aiUiIn .5s cubic-bezier(.2,.9,.3,1) calc(var(--i,0) * 55ms) both}
.aiB.aiStream .aiUi.fresh *{animation:none!important}
@keyframes aiUiIn{from{opacity:0;transform:translateY(12px) scale(.97)}to{opacity:1;transform:none}}
.aiPb.on i::after{animation:aiTickIn .28s cubic-bezier(.34,1.8,.6,1)}
@keyframes aiTickIn{from{scale:0}to{scale:1}}
.aiPb:hover{border-color:color-mix(in srgb,var(--accent) 60%,var(--line))}
@media (prefers-reduced-motion:reduce){.aiPeekF,.aiPeekF svg,.aiMn .aiMi,.aiUi.fresh *,.aiHold,.aiHs i,.aiAcc details p,.aiTbP.on{animation:none!important}}
.aiP.aiFocusing .aiMs .aiM:not(.aiHoldRow){filter:blur(6px);opacity:.5;transition:filter .28s,opacity .28s}
.aiP.aiFocusing > .aiHd,.aiP.aiFocusing > .aiFt{filter:blur(5px);opacity:.6;transition:filter .28s,opacity .28s}
.aiHasHold [data-it]:not(.aiHold){opacity:.3;filter:blur(3px);transition:opacity .25s,filter .25s}
.aiHold{position:relative;z-index:6;animation:aiLift .3s cubic-bezier(.34,1.56,.64,1) both;box-shadow:0 16px 36px -8px #000b,0 0 0 2px color-mix(in srgb,var(--accent) 70%,transparent)}
@keyframes aiLift{from{transform:scale(1)}to{transform:scale(1.055)}}
@media (hover:none){ .aiP{-webkit-touch-callout:none;-webkit-user-select:none;user-select:none} .aiP textarea,.aiP input{-webkit-user-select:text;user-select:text;-webkit-touch-callout:default} .aiB{-webkit-touch-callout:none;-webkit-user-select:none;user-select:none} }
.aiB.aiSel{-webkit-user-select:text;user-select:text;-webkit-touch-callout:default}

/* confirm dialog (delete) */
.aiDlg{position:absolute;inset:0;z-index:8;display:grid;place-items:center;padding:20px;background:#0008}
.aiDlg[hidden]{display:none}
.aiDlgBox{width:min(340px,100%);padding:18px;border-radius:18px;background:var(--card);border:1px solid var(--line);box-shadow:0 20px 50px #0007}
.aiDlgBox p{margin:0 0 16px;line-height:1.5;font-size:15.5px}
.aiDlgBtns{display:flex;gap:8px;justify-content:flex-end}
.aiDlgBtns button{padding:10px 18px;border-radius:12px;border:1px solid var(--line);background:var(--bg);color:var(--text);font:inherit;font-weight:650;cursor:pointer}
.aiDlgBtns .danger{background:var(--err);border-color:var(--err);color:#fff}

/* history: a delete button on every row, and "delete all" */
.aiHt{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:8px 2px 4px;color:var(--muted);font-size:13.5px}
.aiLink{border:0;background:none;color:var(--err);font:inherit;font-weight:700;cursor:pointer;padding:6px 4px}
.aiHrow{display:flex;align-items:stretch;border-bottom:1px solid var(--line)}
.aiHrow .aiHr{border-bottom:0;flex:1;min-width:0}
.aiHdel{flex:none;width:46px;border:0;border-radius:10px;background:none;color:var(--muted);display:grid;place-items:center;cursor:pointer}
.aiHdel:hover,.aiHdel:focus-visible{color:var(--err);background:color-mix(in srgb,var(--err) 10%,transparent)}
.aiHdel svg{width:19px;height:19px;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}


/* little room left (a phone with the keyboard open, a phone on its side): the chrome gets smaller so the conversation keeps the space */
.aiP.aiKb .aiNt,.aiP.aiCompact .aiNt{display:none}
.aiP.aiCompact .aiHd{padding-top:max(6px,env(safe-area-inset-top));padding-bottom:6px}
.aiP.aiCompact .aiHb{width:36px;height:36px}.aiP.aiCompact .aiTt small{display:none}
.aiP.aiCompact .aiAv{width:32px;height:32px}.aiP.aiCompact .aiAv svg{width:23px;height:23px}
.aiP.aiCompact .aiMs{padding-top:8px;gap:8px}
.aiP.aiCompact .aiHi{padding:6px 10px;gap:6px}.aiP.aiCompact .aiHi .aiBig,.aiP.aiCompact .aiHi p{display:none}
.aiP.aiCompact .aiHi h2{font-size:19px;margin:0}.aiP.aiCompact .aiSug{margin-top:2px;gap:6px}.aiP.aiCompact .aiSug button{padding:8px 12px}
.aiP.aiCompact .aiFt{padding-top:6px}.aiP.aiCompact .aiIn textarea{min-height:40px;max-height:96px;padding:9px 13px}
.aiP.aiCompact .aiSd{width:40px;height:40px}
.aiP.aiTiny .aiTt .aiTl,.aiP.aiTiny .aiHi .aiSug,.aiP.aiTiny .aiSt{display:none}.aiP.aiTiny .aiHd{padding-top:max(4px,env(safe-area-inset-top));padding-bottom:4px}
.aiP.aiTiny .aiHi h2{font-size:17px}
@container aip (max-width:359px){                          /* the narrowest windows (a 320 phone, a folded foldable, a small floating window) */
  .aiHb{width:36px;height:36px}.aiHd{gap:2px}.aiTt{gap:6px}.aiTt b{font-size:15px}.aiB{max-width:92%;padding:8px 11px;font-size:14.5px}
  .aiM{gap:6px}.aiM .aiAv{width:26px;height:26px}.aiM .aiAv svg{width:18px;height:18px}.aiSug button{font-size:14px}
}
@media (pointer:coarse){ .aiHb{width:44px;height:44px} .aiP.aiCompact .aiHb{width:40px;height:40px} }


/* ---- opening animation: the circle grows out of the button to a black screen, the face grows into it, winks and smiles; it stays until the chat is ready ---- */
.aiP.aiIntro{opacity:1;translate:0 0;transition:none;background:transparent}
.aiP.aiIntro > :not(.aiSplash){visibility:hidden}
.aiSplash{position:absolute;inset:0;z-index:9;overflow:hidden}
.aiSplash[hidden]{display:none}
.aiSplash.aiCovered{background:#050507}
.aiGrow{position:absolute;left:calc(var(--aicx,50%) - var(--aigr,29px));top:calc(var(--aicy,90%) - var(--aigr,29px));width:calc(var(--aigr,29px) * 2);height:calc(var(--aigr,29px) * 2);border-radius:50%;
  background:linear-gradient(145deg,var(--accent),color-mix(in srgb,var(--accent) 45%,#7b5cff));animation:aiGrow .5s cubic-bezier(.55,0,.2,1) both;will-change:transform}
.aiGrow::after{content:"";position:absolute;inset:0;border-radius:50%;background:#050507;animation:aiDarken .5s ease-in both}
.aiGrow > svg{position:absolute;inset:16%;width:68%;height:68%;overflow:visible;animation:aiFadeQuick .22s ease-out both}
@keyframes aiGrow{from{transform:scale(1)}to{transform:scale(var(--ais,20))}}
@keyframes aiDarken{0%,22%{opacity:0}100%{opacity:1}}
@keyframes aiFadeQuick{to{opacity:0;transform:scale(.8)}}
.aiSpl{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:20px}
.aiGlow{position:absolute;width:min(78vw,380px);aspect-ratio:1;border-radius:50%;opacity:0;animation:aiGlowIn .9s .3s ease-out both;
  background:radial-gradient(circle,color-mix(in srgb,var(--accent) 50%,transparent) 0%,transparent 66%)}
.aiFaceBig{position:relative;width:clamp(120px,34vw,176px);aspect-ratio:1;opacity:0;animation:aiFaceIn .62s .32s ease-out both,aiBreathe 3.2s 1.1s ease-in-out infinite;
  filter:drop-shadow(0 0 26px color-mix(in srgb,var(--accent) 65%,transparent))}
.aiFaceBig svg{width:100%;height:100%;display:block;overflow:visible}
.aiSplTx{position:relative;min-height:1.4em;max-width:80%;text-align:center;color:#ffffffa6;font-size:14px;line-height:1.4;opacity:0;transition:opacity .35s}
.aiSplTx.on{opacity:1}
@keyframes aiFaceIn{0%{opacity:0;transform:scale(.25) rotate(-10deg)}55%{opacity:1;transform:scale(1.12) rotate(3deg)}100%{opacity:1;transform:scale(1) rotate(0)}}
@keyframes aiGlowIn{from{opacity:0;transform:scale(.5)}to{opacity:1;transform:scale(1)}}
@keyframes aiBreathe{0%,100%{scale:1}50%{scale:1.045}}
/* the face's life: both eyes blink now and then; the wink closes the right eye and lifts the smile, with a little tilt and a twinkle */
.aiSplash .aiEye,.aiSplash .aiSmile{transform-box:fill-box;transform-origin:center}
.aiSplash .aiEye{animation:aiBlink 3.6s 1.5s infinite}
.aiSplash.aiWink .aiEyeR{animation:aiWinkEye .66s ease-in-out both}
.aiSplash.aiWink .aiSmile{animation:aiWinkSmile .66s ease-in-out both}
.aiSplash.aiWink .aiFaceBig svg{transform-origin:50% 60%;animation:aiTilt .66s ease-in-out both}
html .aiSplash.aiWink .aiSpark{animation:aiPop .66s ease-out both}
@keyframes aiBlink{0%,92%,100%{transform:scaleY(1)}96%{transform:scaleY(.1)}}
@keyframes aiWinkEye{0%{transform:scaleY(1)}30%,72%{transform:scaleY(.1) translateY(.5px)}100%{transform:scaleY(1)}}
@keyframes aiWinkSmile{0%{transform:none}30%,72%{transform:scale(1.18,1.14) translateY(-.4px)}100%{transform:none}}
@keyframes aiTilt{0%,100%{transform:rotate(0)}32%,70%{transform:rotate(-5deg)}}
@keyframes aiPop{0%{transform:scale(1) rotate(0)}40%{transform:scale(1.9) rotate(25deg)}100%{transform:scale(1) rotate(0)}}
.aiSplash.aiOut{animation:aiSplOut .34s ease-in forwards}
.aiSplash.aiOut .aiSpl{animation:aiSplZoom .34s ease-in forwards}
@keyframes aiSplOut{to{opacity:0}}
@keyframes aiSplZoom{to{transform:scale(1.14)}}
@media (prefers-reduced-motion:reduce){ .aiSplash *{animation:none!important} }

/* ---- the dead face: when something is wrong ---- */
.aiDeadFace .aiBub{fill:#ffe4e4}
.aiDeadFace .aiX,.aiDeadFace .aiMouth{fill:none;stroke:#e03131;stroke-width:2.2;stroke-linecap:round;stroke-linejoin:round}
.aiDeadFace .aiTongue{fill:#ff8787}
.aiFaceBig .aiDeadFace{position:absolute;inset:0;opacity:0;transition:opacity .2s}
.aiSpl::before{content:"";position:absolute;inset:0;background:radial-gradient(circle at 50% 46%,#4d0f15 0%,transparent 68%);opacity:0;transition:opacity .4s}
.aiSplash.aiBad .aiSpl::before{opacity:1}
.aiSplash.aiBad .aiFaceBig > svg:first-child{opacity:0;transition:opacity .15s}
.aiSplash.aiBad .aiFaceBig .aiDeadFace{opacity:1}
.aiSplash.aiBad .aiFaceBig{opacity:1;animation:aiDeadShake .75s both;filter:drop-shadow(0 0 28px #ff4d4d99)}
.aiSplash.aiBad .aiGlow{background:radial-gradient(circle,#ff4d4d66 0%,transparent 66%);animation:none;opacity:1}
.aiSplash.aiBad .aiSplTx{color:#ffffffb3}
.aiSplTx b{display:block;margin-bottom:4px;font-size:19px;color:#fff}
@keyframes aiDeadShake{0%{transform:scale(1) rotate(0)}15%{transform:translateX(-10px) rotate(-6deg)}30%{transform:translateX(9px) rotate(5deg)}45%{transform:translateX(-6px) rotate(-3deg)}60%{transform:translateX(4px)}100%{transform:scale(.96) rotate(7deg) translateY(4px)}}

/* ---- closing: the black circle shrinks back into the button, and the app comes back around it ---- */
.aiSplash.aiClosing{background:transparent}
.aiSplash.aiClosing .aiSpl{animation:aiFadeOutQ .16s ease-out forwards}
.aiSplash.aiClosing .aiGrow{transform:scale(var(--ais,20));animation:aiShrink .66s cubic-bezier(.5,0,.2,1) both}
.aiSplash.aiClosing .aiGrow::after{animation:aiLighten .66s ease-out both}
.aiSplash.aiClosing .aiGrow > svg{animation:aiFaceBack .66s ease-out both}
.aiSplash.aiClosing.aiFromBlack .aiGrow{animation-name:aiShrinkB}
@keyframes aiShrink{0%{transform:scale(var(--ais,20));opacity:0}20%{transform:scale(var(--ais,20));opacity:1}100%{transform:scale(1);opacity:1}}
@keyframes aiShrinkB{0%,10%{transform:scale(var(--ais,20));opacity:1}100%{transform:scale(1);opacity:1}}
@keyframes aiLighten{0%,35%{opacity:1}100%{opacity:0}}
@keyframes aiFaceBack{0%,55%{opacity:0;transform:scale(.6)}100%{opacity:1;transform:none}}
@keyframes aiFadeOutQ{to{opacity:0}}
body:not(.calm) #aiFab.aiPop{animation:aiFabPop .55s cubic-bezier(.34,1.56,.64,1) both,aiFloat 3.8s .55s ease-in-out infinite}
@keyframes aiFabPop{from{scale:.2;opacity:0}to{scale:1;opacity:1}}

/* ---- life: nearly everything in the chat moves a little ---- */
/* messages rise into place (the one you send rises out of the input bar), the answer fills in and settles with a little glow */
.aiP:not(.aiIntro) .aiM.aiIn{animation:aiMsgIn .45s cubic-bezier(.2,.9,.25,1.12) both;animation-delay:var(--ad,0ms)}
.aiP:not(.aiIntro) .aiM.aiIn .aiAv{animation:aiAvPop .5s calc(var(--ad,0ms) + 120ms) cubic-bezier(.34,1.56,.64,1) both}
.aiP:not(.aiIntro) .aiM.aiIn.aiPend .aiAv{animation:aiAvPop .5s calc(var(--ad,0ms) + 120ms) cubic-bezier(.34,1.56,.64,1) both,aiThink 1.1s calc(var(--ad,0ms) + 700ms) ease-in-out infinite}
@keyframes aiMsgIn{from{opacity:0;transform:translateY(var(--fy,18px)) scale(.72)}50%{opacity:1}to{opacity:1;transform:none}}
@keyframes aiAvPop{from{opacity:0;transform:scale(.2) rotate(-25deg)}to{opacity:1;transform:none}}
.aiM.aiPend .aiAv{animation:aiThink 1.1s ease-in-out infinite}
.aiP.aiBusy .aiHd .aiAv{animation:aiThink 1s ease-in-out infinite}
@keyframes aiThink{0%,100%{transform:translateY(0) rotate(0)}30%{transform:translateY(-3px) rotate(-6deg)}65%{transform:translateY(0) rotate(5deg)}}
.aiB.aiFill{animation:aiFill .3s ease-out}
/* the answer is re-drawn many times while it streams: cards inside it must not replay their entrance each time (that was the rattling) */
.aiB.aiStream .aiFile,.aiB.aiStream .aiPoll,.aiB.aiStream .aiQuick,.aiB.aiStream .aiMemChip{animation:none}
@keyframes aiFill{from{opacity:.4}to{opacity:1}}
.aiCaret{display:inline-block;width:7px;height:7px;margin-inline-start:5px;border-radius:50%;background:var(--accent);vertical-align:middle;animation:aiPulse .9s ease-in-out infinite}
@keyframes aiPulse{0%,100%{opacity:.25;transform:scale(.7)}50%{opacity:1;transform:scale(1.15)}}
.aiM.aiDone .aiAv{animation:aiHappy .7s ease-out}
.aiM.aiDone .aiB{animation:aiGlowRing 1s ease-out}
@keyframes aiHappy{0%{transform:scale(1)}30%{transform:scale(1.3) rotate(-10deg)}60%{transform:scale(.94) rotate(6deg)}100%{transform:none}}
@keyframes aiGlowRing{0%{box-shadow:0 0 0 0 color-mix(in srgb,var(--accent) 32%,transparent)}100%{box-shadow:0 0 0 8px transparent}}
.aiM.aiBad .aiAv{background:linear-gradient(145deg,#ff6b6b,#c92a2a);animation:aiDeadIn .6s ease-out both}
.aiM.aiBad .aiB{border-color:var(--err);background:color-mix(in srgb,var(--err) 9%,var(--card));animation:aiShake .55s}
@keyframes aiShake{0%,100%{translate:0}18%{translate:-7px}36%{translate:6px}54%{translate:-4px}72%{translate:3px}}
@keyframes aiDeadIn{0%{transform:scale(.6) rotate(-20deg)}50%{transform:scale(1.2) rotate(10deg)}100%{transform:none}}
/* the greeting comes in piece by piece; the faces blink now and then */
.aiP:not(.aiIntro) .aiHi .aiBig{animation:aiPopIn .65s cubic-bezier(.34,1.56,.64,1) both}
.aiP:not(.aiIntro) .aiHi h2{animation:aiUp .5s .12s ease-out both}
.aiP:not(.aiIntro) .aiHi p{animation:aiUp .5s .2s ease-out both}
.aiP:not(.aiIntro) .aiSug button{animation:aiUp .5s ease-out backwards}
.aiP:not(.aiIntro) .aiSug button:nth-child(1){animation-delay:.28s}
.aiP:not(.aiIntro) .aiSug button:nth-child(2){animation-delay:.35s}
.aiP:not(.aiIntro) .aiSug button:nth-child(3){animation-delay:.42s}
@keyframes aiUp{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:none}}
@keyframes aiPopIn{from{opacity:0;transform:scale(.4) rotate(-12deg)}to{opacity:1;transform:none}}
.aiHi .aiEye,.aiHd .aiEye{transform-box:fill-box;transform-origin:center;animation:aiBlink 4.4s 2s infinite}
/* buttons answer your finger */
.aiSug button,.aiHb,.aiSd,.aiMi,.aiFile,.aiHdel,.aiLink,.aiDlgBtns button,.aiErr button{transition:transform .12s ease,background-color .15s,border-color .15s,opacity .2s}
.aiSug button:active,.aiHb:active,.aiSd:active,.aiMi:active,.aiFile:active,.aiHdel:active,.aiDlgBtns button:active{transform:scale(.94)}
.aiSd.aiSwap svg{animation:aiIconPop .32s cubic-bezier(.34,1.56,.64,1)}
@keyframes aiIconPop{from{opacity:0;transform:scale(.3) rotate(-90deg)}to{opacity:1;transform:none}}
.aiIn textarea{transition:border-color .15s,box-shadow .15s}
/* menu, dialog */
.aiMnBg,.aiDlg{animation:aiFadeIn .17s ease-out}
.aiMn{animation:aiPop2 .2s cubic-bezier(.34,1.3,.64,1);transform-origin:var(--mo,50% 0)}
.aiDlgBox{animation:aiPop2 .24s cubic-bezier(.34,1.3,.64,1)}
@keyframes aiFadeIn{from{opacity:0}to{opacity:1}}
@keyframes aiPop2{from{opacity:0;transform:scale(.9) translateY(8px)}to{opacity:1;transform:none}}
/* history: rows come in one after the other and fold away when deleted */
.aiHrow{max-height:96px;overflow:hidden}
.aiP:not(.aiIntro) .aiHrow{animation:aiUp .35s ease-out backwards;animation-delay:calc(var(--i,0) * 40ms)}
.aiP .aiHrow.aiGone{animation:aiRowOut .3s ease-in forwards;animation-delay:calc(var(--i,0) * 40ms)}
@keyframes aiRowOut{to{opacity:0;transform:translateX(24px);max-height:0;border-bottom-width:0}}
.aiHe{animation:aiFadeUp .3s ease-out}
.aiP:not(.aiIntro) .aiMs.aiSwap{animation:aiFadeUp .24s ease-out}
@keyframes aiFadeUp{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}
/* files */
.aiFile{animation:aiUp .4s ease-out backwards}
@keyframes aiSpin{to{transform:rotate(360deg)}}

/* ---- what the bot is doing: a small list of steps in the waiting bubble ---- */
.aiAct{display:flex;flex-direction:column;align-items:flex-start;gap:7px;min-width:200px;font-size:14px;line-height:1.35}
.aiStp{display:flex;align-items:center;gap:9px;max-width:100%}.aiStp.now{animation:aiActIn .28s ease-out}
.aiAct.out{animation:aiActOut .17s ease-in forwards}
.aiAct .aiSi{flex:none;width:16px;height:16px;border-radius:50%;border:2.5px solid color-mix(in srgb,var(--accent) 22%,transparent);border-top-color:var(--accent);animation:aiSpin .8s linear infinite}
.aiAct span{min-width:0;overflow-wrap:anywhere}
@keyframes aiActIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}
@keyframes aiActOut{to{opacity:0;transform:translateY(-8px)}}
/* the greeting's waving hand (drawn here) */
.aiHand{display:inline-block}
.aiHand .aiWave{width:1.05em;height:1.05em;vertical-align:-.17em;overflow:visible}
.aiHand .aiWaveHand{transform-origin:16px 28px}
.aiP:not(.aiIntro) .aiHand .aiWaveHand{animation:aiWaveHand 1.7s ease-in-out .7s 2}
@keyframes aiWaveHand{0%,80%,100%{transform:rotate(0)}12%{transform:rotate(18deg)}26%{transform:rotate(-10deg)}40%{transform:rotate(16deg)}54%{transform:rotate(-6deg)}68%{transform:rotate(8deg)}}
.aiHb.on{background:#ffffff38}
/* what the bot remembered, under the answer */
.aiMemChip{display:flex;align-items:center;gap:8px;margin-top:9px;padding:7px 10px;border-radius:12px;font-size:13px;line-height:1.35;cursor:pointer;
  background:color-mix(in srgb,var(--accent) 10%,var(--card));border:1px solid color-mix(in srgb,var(--accent) 30%,var(--line));animation:aiUp .4s ease-out backwards}
.aiMemChip.del{background:color-mix(in srgb,var(--warn,#e8590c) 10%,var(--card));border-color:color-mix(in srgb,var(--warn,#e8590c) 35%,var(--line))}
.aiMemChip.undone{opacity:.55;text-decoration:line-through;cursor:default}
.aiMemChip .aiMemI{flex:none;width:20px;height:20px;display:grid;place-items:center}
.aiMemChip .aiMemI svg{width:18px;height:18px;fill:none;stroke:var(--accent-t,var(--accent));stroke-width:2;stroke-linecap:round;stroke-linejoin:round}
.aiMemChip .aiMemT{flex:1;min-width:0;overflow-wrap:anywhere}
.aiMemChip button{flex:none;border:0;background:none;color:var(--accent-t,var(--accent));font:inherit;font-weight:700;cursor:pointer;padding:2px 4px}
/* the memory screen */
.aiMemIntro{margin:6px 2px 10px;color:var(--muted);font-size:14px;line-height:1.5}
.aiMemRow{display:flex;align-items:center;gap:10px;padding:11px 4px;border-bottom:1px solid var(--line);max-height:120px;overflow:hidden}
.aiMemRow .aiMemB{flex:none;padding:2px 8px;border-radius:99px;font-size:11.5px;font-weight:800;background:color-mix(in srgb,var(--warn,#e8590c) 16%,transparent);color:var(--warn,#e8590c)}
.aiMemRow .aiMemX{flex:1;min-width:0;overflow-wrap:anywhere;line-height:1.45}
.aiP:not(.aiIntro) .aiMemRow{animation:aiUp .35s ease-out backwards;animation-delay:calc(var(--i,0) * 35ms)}
.aiP .aiMemRow.aiGone{animation:aiRowOut .3s ease-in forwards}

/* ---- a file the AI sends: a real file card with a progress bar ---- */
.aiFile{display:flex;align-items:center;gap:12px;width:100%;max-width:370px;margin:9px 0 2px;padding:10px 12px;border-radius:16px;border:1px solid var(--line);
  background:color-mix(in srgb,var(--text) 4%,var(--card));color:var(--text);font:inherit;text-align:start;cursor:pointer;position:relative;overflow:hidden;
  transition:border-color .2s,box-shadow .2s,background-color .2s,transform .12s}
.aiFile[data-t=pdf]{--ft:#e5484d}.aiFile[data-t=doc]{--ft:#3b82f6}.aiFile[data-t=ppt]{--ft:#f97316}.aiFile[data-t=xls]{--ft:#22a55e}
.aiFile[data-t=zip]{--ft:#64748b}.aiFile[data-t=img]{--ft:#a855f7}.aiFile[data-t=code]{--ft:#14b8a6}
.aiFile:hover,.aiFile:focus-visible{border-color:color-mix(in srgb,var(--ft,var(--accent)) 65%,var(--line));box-shadow:0 5px 18px color-mix(in srgb,var(--ft,var(--accent)) 20%,transparent);outline:none}
.aiFile .aiFi{flex:none;width:44px;height:52px;border-radius:9px 16px 9px 9px;position:relative;display:grid;place-items:end center;padding-bottom:7px;color:#fff;
  background:linear-gradient(160deg,color-mix(in srgb,var(--ft,var(--accent)) 78%,#fff),var(--ft,var(--accent)));box-shadow:0 3px 9px color-mix(in srgb,var(--ft,var(--accent)) 38%,transparent)}
.aiFile .aiFi::before{content:"";position:absolute;top:0;right:0;width:14px;height:14px;border-radius:0 16px 0 7px;background:linear-gradient(225deg,var(--card) 50%,#ffffff66 50%)}
.aiFile .aiFi b{font-size:11.5px;letter-spacing:.04em;font-weight:800}
.aiFile .aiFx{flex:1;min-width:0;display:flex;flex-direction:column;gap:3px}
.aiFile .aiFn{display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;overflow-wrap:anywhere;font-weight:650;font-size:14.5px;line-height:1.3}
.aiFile .aiFm{font-size:12.5px;color:var(--muted);line-height:1.3}
.aiFile .aiFp{height:4px;border-radius:99px;overflow:hidden;max-height:0;opacity:0;background:color-mix(in srgb,var(--ft,var(--accent)) 16%,transparent);transition:opacity .2s,max-height .2s,margin .2s}
.aiFile .aiFp i{display:block;height:100%;width:0;border-radius:inherit;background:var(--ft,var(--accent));transition:width .18s ease-out}
.aiFile.busy .aiFp{max-height:4px;opacity:1;margin-top:4px}
.aiFile.busy .aiFp.ind i{width:38%;animation:aiIndet 1.1s ease-in-out infinite}
@keyframes aiIndet{0%{margin-inline-start:-40%}100%{margin-inline-start:105%}}
.aiFile .aiFd{flex:none;width:42px;height:42px;border-radius:50%;display:grid;place-items:center;position:relative;color:var(--ft,var(--accent));
  background:color-mix(in srgb,var(--ft,var(--accent)) 14%,transparent);transition:background .2s,color .2s}
.aiFile .aiFd svg{width:21px;height:21px;fill:none;stroke:currentColor;stroke-width:2.3;stroke-linecap:round;stroke-linejoin:round}
.aiFile:hover .aiFd{background:var(--ft,var(--accent));color:#fff}
.aiFile.busy{cursor:progress}
.aiFile.busy .aiFd::after{content:"";position:absolute;inset:-3px;border-radius:50%;border:3px solid transparent;border-top-color:var(--ft,var(--accent));animation:aiSpin .8s linear infinite}
.aiFile.ok{border-color:#22a55e;background:color-mix(in srgb,#22a55e 8%,var(--card))}
.aiFile.ok .aiFd{background:#22a55e;color:#fff;animation:aiIconPop .4s cubic-bezier(.34,1.56,.64,1)}
.aiFile.ok .aiFd svg path{stroke-dasharray:30;stroke-dashoffset:30;animation:aiDraw .45s .1s ease-out forwards}
.aiFile.ok .aiFm{color:#22a55e;font-weight:650}
.aiFile.err{border-color:var(--err);background:color-mix(in srgb,var(--err) 7%,var(--card));animation:aiShake .5s}
.aiFile.err .aiFd{background:var(--err);color:#fff}.aiFile.err .aiFm{color:var(--err)}
@keyframes aiDraw{to{stroke-dashoffset:0}}
.aiLink.acc{color:var(--accent-t,var(--accent))}
@media (prefers-reduced-motion:reduce){ .aiP *,#aiFab{animation:none!important;transition:none!important} }
`;

  /* ------------------------------------------------------------ small pieces */
  const FACE = '<svg class="aiFace" viewBox="0 0 40 40" aria-hidden="true" focusable="false">' +
    '<path class="aiBub" d="M10 9h20a6 6 0 0 1 6 6v10a6 6 0 0 1-6 6H21l-6.2 5.1a.8.8 0 0 1-1.3-.6V31H10a6 6 0 0 1-6-6V15a6 6 0 0 1 6-6z"/>' +
    '<ellipse class="aiEye aiEyeL" cx="14.8" cy="19" rx="2.1" ry="2.7"/><ellipse class="aiEye aiEyeR" cx="25.2" cy="19" rx="2.1" ry="2.7"/>' +
    '<path class="aiSmile" d="M15.3 24.4q4.7 3.8 9.4 0"/>' +
    '<path class="aiSpark" d="M33.5 1.5l1.5 3.9 3.9 1.5-3.9 1.5-1.5 3.9-1.5-3.9-3.9-1.5 3.9-1.5z"/></svg>';
  // the "dead" face (X eyes, a wobbly mouth, the tongue out): shown when something is wrong
  const FACE_DEAD = '<svg class="aiFace aiDeadFace" viewBox="0 0 40 40" aria-hidden="true" focusable="false">' +
    '<path class="aiBub" d="M10 9h20a6 6 0 0 1 6 6v10a6 6 0 0 1-6 6H21l-6.2 5.1a.8.8 0 0 1-1.3-.6V31H10a6 6 0 0 1-6-6V15a6 6 0 0 1 6-6z"/>' +
    '<path class="aiX" d="M12.4 16.4l4.8 4.8M17.2 16.4l-4.8 4.8M22.8 16.4l4.8 4.8M27.6 16.4l-4.8 4.8"/>' +
    '<path class="aiMouth" d="M14.6 26.2q1.6-2.4 3.2 0t3.2 0 3.2 0"/><path class="aiTongue" d="M22.2 26.4v2.2a1.5 1.5 0 0 0 3 0v-2.2z"/></svg>';
  const I_X = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>';
  const I_HIST = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/><path d="M12 7v5l3 2"/></svg>';
  const I_PLAY = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M10 8.5v7l6-3.5z"/></svg>';
  const I_USE = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/></svg>';
  const I_NEW = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/></svg>';
  const I_BACK = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>';
  const I_SEND = '<svg class="aiSendI" viewBox="0 0 24 24" aria-hidden="true"><path d="M22 2L11 13"/><path d="M22 2l-7 20-4-9-9-4z"/></svg>';
  const I_STOP = '<svg viewBox="0 0 24 24" aria-hidden="true"><rect class="aiStopI" x="6" y="6" width="12" height="12" rx="2.5"/></svg>';

  const I_TRASH = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 6h18"/><path d="M8 6V4h8v2"/><path d="M6 6l1 14h10l1-14"/><path d="M10 11v6M14 11v6"/></svg>';
  const I_COPY = '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v1"/></svg>';
  const I_SHARE = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="M8.6 10.5l6.8-4M8.6 13.5l6.8 4"/></svg>';
  const I_SELECT = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7V5a1 1 0 0 1 1-1h2M17 4h2a1 1 0 0 1 1 1v2M20 17v2a1 1 0 0 1-1 1h-2M7 20H5a1 1 0 0 1-1-1v-2"/><path d="M8 12h8"/></svg>';
  const I_FILE = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5"/><path d="M12 11v6M9 14l3 3 3-3"/></svg>';

  const esc2 = s => String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  /* a small, safe markdown: everything is escaped first, then **bold**, `code`, lists, headings, http(s) links */
  function inline(s) {
    return esc2(s)
      .replace(/`([^`]+)`/g, "<code>$1</code>")
      .replace(/\*\*([^*]+)\*\*/g, "<b>$1</b>")
      .replace(/(^|[\s(])\*([^*\s][^*]*?)\*(?=[\s).,!?:;]|$)/g, "$1<i>$2</i>")
      .replace(/https?:\/\/[^\s<]*[^\s<.,;:!?)\]]/g, u => '<a href="' + u + '" target="_blank" rel="noopener noreferrer">' + u + "</a>");
  }
  // [[file:REF|name]] is how the server's file tool lets the AI hand a file over; it becomes a download card. The REF is only a path inside Moodle - no token.
  const FILE_RE = /\[\[file:([A-Za-z0-9_-]{4,1700})\|([^\]\n|]{1,120})(?:\|(\d{1,10}))?\]\]/g;
  const FTYPES = { pdf: ["PDF", "pdf"], doc: ["DOC", "doc"], docx: ["DOCX", "doc"], txt: ["TXT", "doc"], ppt: ["PPT", "ppt"], pptx: ["PPTX", "ppt"], xls: ["XLS", "xls"], xlsx: ["XLSX", "xls"], csv: ["CSV", "xls"],
    zip: ["ZIP", "zip"], rar: ["RAR", "zip"], "7z": ["7Z", "zip"], png: ["PNG", "img"], jpg: ["JPG", "img"], jpeg: ["JPG", "img"], gif: ["GIF", "img"], py: ["PY", "code"], java: ["JAVA", "code"], c: ["C", "code"], cpp: ["C++", "code"] };
  const ftype = name => { const p = String(name).split("."); const e = p.length > 1 ? p.pop().toLowerCase() : ""; return FTYPES[e] || [e ? e.slice(0, 4).toUpperCase() : "FILE", "other"]; };
  const fmtSize = n => { n = +n || 0; return n < 1024 ? n + " B" : n < 1048576 ? Math.round(n / 1024) + " KB" : (n / 1048576).toFixed(n < 10485760 ? 1 : 0) + " MB"; };
  const I_DL = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 4v11M7.5 11.5L12 16l4.5-4.5M5 20h14"/></svg>';
  const I_CHK = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>';
  const I_RETRY = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 11a8 8 0 1 0-2.3 5.6"/><path d="M20 4v7h-7"/></svg>';
  const I_BRAIN = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9.5 4A3 3 0 0 0 6.5 7a3 3 0 0 0-2 5 3 3 0 0 0 2 5 3 3 0 0 0 3 3 2.5 2.5 0 0 0 2.5-2.5v-11A2.5 2.5 0 0 0 9.5 4z"/><path d="M14.5 4A3 3 0 0 1 17.5 7a3 3 0 0 1 2 5 3 3 0 0 1-2 5 3 3 0 0 1-3 3 2.5 2.5 0 0 1-2.5-2.5"/></svg>';
  const fileCard = (ref, name, size) => {
    const [lab, t] = ftype(name), idle = lab + (size ? " · " + fmtSize(size) : "") + " · " + tx("fileHint");
    return '<button type="button" class="aiFile" data-t="' + t + '" data-ref="' + esc2(ref) + '" data-name="' + esc2(name) + '" data-size="' + (size || "") + '" data-idle="' + esc2(idle) + '" aria-label="' + esc2(tx("dl") + " " + name) + '">' +
      '<span class="aiFi"><b>' + esc2(lab) + '</b></span><span class="aiFx"><span class="aiFn" dir="auto">' + esc2(name) + '</span><span class="aiFm">' + esc2(idle) + '</span><span class="aiFp"><i></i></span></span>' +
      '<span class="aiFd">' + I_DL + "</span></button>";
  };
  // the bot is asked not to use emojis; if one slips through it is removed here (the chat has its own drawn icons)
  const EMOJI_RE = /[ \t]*[\p{Extended_Pictographic}\u{1F1E6}-\u{1F1FF}\uFE0F\u200D\u20E3]+[ \t]*/gu;     // (with the spaces around it, so no double space is left)
  // [[poll:multi|question|a|b|c]] / [[poll:single|...]] become a tappable poll, [[quick|a|b]] becomes quick-reply buttons. The answer goes back as a normal message.
  const POLL_RE = /\[\[(poll:(?:single|multi)|quick)\|([^\]\n]{1,700})\]\]/g;
  const PICKED = { he: "בחרתי: ", en: "I chose: ", fr: "J'ai choisi : " };
  const PSEND = { he: "שלח", en: "Send", fr: "Envoyer" };
  const PTXT = { he: "או כתוב משהו אחר…", en: "Or type something else…", fr: "Ou écris autre chose…" };
  function pollHTML(kind, body) {
    const parts = body.split("|").map(x => x.trim()).filter(Boolean);
    if (kind === "quick") {
      const o = parts.slice(0, 4); if (o.length < 1) return "";
      return '<div class="aiQuick">' + o.map(t => '<button type="button" data-qk="' + esc2(t) + '">' + esc2(t) + "</button>").join("") + "</div>";
    }
    const q = parts[0], o = parts.slice(1, 13); if (!q || o.length < 2) return "";
    const multi = kind === "poll:multi";
    return '<div class="aiPoll" data-multi="' + (multi ? 1 : 0) + '"><div class="aiPq">' + esc2(q) + '</div><div class="aiPo">' +
      o.map((t, i) => '<button type="button" class="aiPb" data-po="' + esc2(t) + '"><i></i><span>' + esc2(t) + "</span></button>").join("") + "</div>" +
      (multi ? '<button type="button" class="aiPgo" data-pgo disabled>' + esc2(PSEND[lang()] || PSEND.he) + "</button>" : "") +
      '<form class="aiPt"><input type="text" maxlength="200" enterkeyhint="send" autocomplete="off" placeholder="' + esc2(PTXT[lang()] || PTXT.he) + '"><button type="submit" aria-label="' + esc2(PSEND[lang()] || PSEND.he) + '"><svg viewBox="0 0 24 24"><path d="M4 12l16-8-6 16-3-7z"/></svg></button></form></div>';
  }
  // ---------------------------------------------------------------------------------------------
  // Deadline card: the server sends [[deadlines:BASE64]] (a list of [name, course, time]) and the app draws it: one headline, the most urgent item as a hero with a live
  // countdown ring, the rest grouped by urgency (today / this week / later), and a week strip. Much faster to read than a list of dates.
  // ---------------------------------------------------------------------------------------------
  const UI_RE = /\[\[ui:([A-Za-z0-9_-]{4,24000})\]\]/g;
  const DLT = {
    he: { n: (k) => k === 1 ? "מטלה אחת ממתינה" : k + " מטלות ממתינות", urgent: "הדחופה", today: "היום", week: "השבוע", later: "אחר כך", over: "באיחור", was: "היה אמור: ", mtg: "מפגש", ago: "לפני ", in: "בעוד ", min: " דק'", hr: " שעות", day: " ימים",
      tm: "מחר ", td: "היום ", days: ["א'", "ב'", "ג'", "ד'", "ה'", "ו'", "ש'"], all: "הכול", loc: "he-IL" },
    en: { n: (k) => k === 1 ? "1 task waiting" : k + " tasks waiting", urgent: "Most urgent", today: "Today", week: "This week", later: "Later", over: "Late", was: "was due ", mtg: "Meeting", ago: "", in: "in ", min: " min", hr: " h", day: " days",
      tm: "Tomorrow ", td: "Today ", days: ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"], all: "All", loc: "en-GB" },
    fr: { n: (k) => k === 1 ? "1 tâche en attente" : k + " tâches en attente", urgent: "La plus urgente", today: "Aujourd'hui", week: "Cette semaine", later: "Plus tard", over: "En retard", was: "prévu le ", mtg: "Réunion", ago: "il y a ", in: "dans ", min: " min", hr: " h", day: " jours",
      tm: "Demain ", td: "Aujourd'hui ", days: ["Di", "Lu", "Ma", "Me", "Je", "Ve", "Sa"], all: "Tout", loc: "fr-FR" },
  };
  const dlt = () => DLT[lang()] || DLT.he;
  function dlDecode(b64) {
    try {
      let b = b64.replace(/-/g, "+").replace(/_/g, "/"); b += "=".repeat((4 - b.length % 4) % 4);
      const bin = atob(b), bytes = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
      const arr = JSON.parse(new TextDecoder("utf-8").decode(bytes));
      return Array.isArray(arr) ? arr.filter(x => x && x.t).slice(0, 20) : [];
    } catch (e) { return []; }
  }
  const dlHue = c => { let h = 0; for (const ch of String(c || "")) h = (h * 31 + ch.charCodeAt(0)) % 360; return h; };
  const dlTime = t => new Date(t * 1000).toLocaleTimeString(dlt().loc, { hour: "2-digit", minute: "2-digit", hour12: false });
  const dayStart = d => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x.getTime(); };
  // "in 5 hours", "tomorrow 21:00", "Wed 21:00", "23/11" - always the shortest thing that tells the student when
  function dlRel(t, long) {
    const T = dlt(), now = Date.now(), ms = t * 1000 - now;
    if (ms < 0) return T.over;
    const mins = Math.round(ms / 60000);
    if (mins < 60) return T.in + Math.max(1, mins) + T.min;
    if (ms < 86400000 && dayStart(t * 1000) === dayStart(now)) return long ? T.in + Math.round(mins / 60) + T.hr : T.td + dlTime(t);
    const dd = Math.round((dayStart(t * 1000) - dayStart(now)) / 86400000);
    if (dd === 1) return T.tm + dlTime(t);
    if (dd < 7) return T.days[new Date(t * 1000).getDay()] + " " + dlTime(t);
    return new Date(t * 1000).toLocaleDateString(dlt().loc, { day: "2-digit", month: "2-digit" });
  }
  // ---------------------------------------------------------------------------------------------
  // The AI decides what to show and how: it calls the server's show_ui tool, the server validates it and sends [[ui:BASE64]] with ready blocks
  // (deadlines as tickets / timeline / focus, grades as gauges, courses as chips, callouts, big numbers, steps). The app only draws them.
  // ---------------------------------------------------------------------------------------------
  function uiDecode(b64) {
    try {
      let b = b64.replace(/-/g, "+").replace(/_/g, "/"); b += "=".repeat((4 - b.length % 4) % 4);
      const bin = atob(b), bytes = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
      const o = JSON.parse(new TextDecoder("utf-8").decode(bytes));
      return o && Array.isArray(o.b) ? o.b.slice(0, 12) : [];
    } catch (e) { return []; }
  }
  const UI_ICONS = {
    info: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8v.01"/></svg>',
    warn: '<svg viewBox="0 0 24 24"><path d="M12 4l9 16H3z"/><path d="M12 10v4M12 17v.01"/></svg>',
    success: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M8 12.5l2.7 2.7L16 9.8"/></svg>',
    tip: '<svg viewBox="0 0 24 24"><path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2V16h5v-.1c0-.8.4-1.5 1-2A6 6 0 0 0 12 3z"/></svg>',
  };
  const ordDay = (t) => { const d = new Date(t * 1000); return { wd: dlt().days[d.getDay()], day: d.getDate(), mon: d.toLocaleDateString(dlt().loc, { month: "short" }) }; };
  // how full the "time left" bar is: empty far away, full when it is due
  const uiUrgency = t => Math.max(0.05, Math.min(1, 1 - (t * 1000 - Date.now()) / (5 * 86400000)));
  const itAttr = (k, it) => ' data-it="' + esc2(JSON.stringify({ k, n: it.n || "", c: it.c || "", v: it.v || "", t: it.t || 0, d: it.d || "", u: it.u || "", o: it.o ? 1 : 0 })) + '"';
  // "Wed 18.11 · 21:00" - the exact moment, always shown
  const dlFull = t => { const d = new Date(t * 1000); return dlt().days[d.getDay()] + " " + String(d.getDate()).padStart(2, "0") + "." + String(d.getMonth() + 1).padStart(2, "0") + " · " + dlTime(t); };
  const dlAgo = t => {
    const T = dlt(), ms = Date.now() - t * 1000, mins = Math.round(ms / 60000), hrs = Math.round(mins / 60), dd = Math.round(ms / 86400000);
    if (lang() === "he") {
      if (mins < 60) return "לפני " + Math.max(1, mins) + " דק'";
      if (ms < 86400000) return hrs === 1 ? "לפני שעה" : hrs === 2 ? "לפני שעתיים" : "לפני " + hrs + " שעות";
      return dd === 1 ? "אתמול" : dd === 2 ? "לפני יומיים" : "לפני " + dd + " ימים";
    }
    const x = mins < 60 ? Math.max(1, mins) + T.min : ms < 86400000 ? hrs + T.hr : dd + T.day;
    return lang() === "en" ? x.trim() + " ago" : T.ago + x.trim();
  };
  let uiN = 0;
  const uiI = () => ";--i:" + Math.min(uiN++, 12);
  function uiTicket(it) {
    const left = it.t * 1000 - Date.now(), late = left < 0, hot = left < 86400000, soon = left < 3 * 86400000;
    const col = late ? "#e5484d" : "hsl(" + dlHue(it.c) + " 72% 58%)";
    const cls = late ? "late" : hot ? "hot" : soon ? "soon" : "";
    const T = dlt(), when = late ? T.was + dlFull(it.t) + " · " + dlAgo(it.t) : dlFull(it.t);
    return '<div class="aiTk"' + itAttr("d", it) + ' style="--dc:' + col + uiI() + '"><div class="aiTkB"><b>' + esc2(it.n) + "</b><em>" + esc2(it.c) + (it.g ? " · " + esc2(T.mtg) : "") + '</em><small>' + esc2(when) + '</small></div>' +
      '<span class="aiTkP ' + cls + '" data-due="' + it.t + '"' + (hot ? ' data-long="1"' : "") + ">" + esc2(dlRel(it.t, hot)) + "</span></div>";
  }
  function uiTimeline(items) {
    const days = []; items.forEach(it => { const k = dayStart(it.t * 1000); let g = days.find(x => x.k === k); if (!g) days.push(g = { k, t: it.t, list: [] }); g.list.push(it); });
    const T = dlt(), today = dayStart(Date.now());
    return '<div class="aiTlW">' + days.map(g => {
      const dd = Math.round((g.k - today) / 86400000), o = ordDay(g.t);
      const label = dd <= 0 ? T.today : dd === 1 ? T.tm.trim() : o.wd + " " + o.day + " " + o.mon;
      return '<div class="aiTlD"><div class="aiTlH"><i></i>' + esc2(label) + '</div>' + g.list.map(it => '<div class="aiTlR"' + itAttr("d", it) + ' style="--dc:' + (it.t * 1000 < Date.now() ? "#e5484d" : "hsl(" + dlHue(it.c) + " 72% 58%)") + uiI() + '"><b>' + esc2(it.n) + "</b><small>" + esc2(it.c) + '</small><span>' + esc2(it.t * 1000 < Date.now() ? dlt().over + " · " + dlTime(it.t) : dlTime(it.t)) + "</span></div>").join("") + "</div>";
    }).join("") + "</div>";
  }
  function uiFocus(items) {
    const f = items[0], lateF = f.t * 1000 < Date.now(), hrs = Math.max(0, Math.round((f.t * 1000 - Date.now()) / 3600000)), big = lateF ? "!" : hrs < 48 ? hrs : Math.round(hrs / 24), unit = lateF ? dlt().over : hrs < 48 ? dlt().hr.trim() : dlt().day.trim();
    const col = f.t * 1000 < Date.now() ? "#e5484d" : "hsl(" + dlHue(f.c) + " 72% 58%)";
    return '<div class="aiFc"' + itAttr("d", f) + ' style="--dc:' + col + '"><div class="aiFcN"><b data-focus="' + f.t + '">' + big + "</b><small>" + esc2(unit) + '</small></div><div class="aiFcX"><b>' + esc2(f.n) + "</b><em>" + esc2(f.c) + "</em><span data-due=\"" + f.t + "\">" + esc2(lateF ? dlt().was + dlFull(f.t) : dlRel(f.t, false)) + "</span></div></div>" +
      items.slice(1).map(it => uiTicket(it)).join("");
  }
  const gaugeCol = v => v >= 85 ? "#22a55e" : v >= 65 ? "#e8a000" : "#e5484d";
  function uiGauge(it) {
    const num = parseFloat(String(it.v).replace(/[^0-9.]/g, "")), ok = isFinite(num), C = 2 * Math.PI * 22, col = ok ? gaugeCol(num) : "var(--muted)";
    return '<div class="aiGg"' + itAttr("g", it) + ' style="--gc:' + col + uiI() + '"><svg viewBox="0 0 56 56"><circle cx="28" cy="28" r="22" class="bg"/><circle cx="28" cy="28" r="22" class="fg" stroke-dasharray="' + (ok ? (C * Math.min(1, num / 100)).toFixed(1) : 0) + " " + C.toFixed(1) + '"/></svg><b>' + esc2(it.v) + "</b><small>" + esc2(it.n) + "</small></div>";
  }
  // =============================================================================================
  // Display kit for information answers: contact cards with tap-to-call / mail / WhatsApp / copy, opening hours with "open now", steps, facts,
  // numbers, prices, banners, lists, checklists, FAQ, tabs, tables, links, timelines, places with navigation, quotes, summaries, headings, tags.
  // The AI picks the kind, style, color, icon and entrance animation; the server already checked every phone, mail and link.
  // =============================================================================================
  const UI_IC = {
    phone: "M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z",
    mail: "M3 6h18v12H3zM3 7l9 6 9-6",
    clock: "M12 7v5l3 2M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z",
    pin: "M12 21s7-6.2 7-11a7 7 0 1 0-14 0c0 4.8 7 11 7 11zM12 12a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z",
    book: "M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2zM4 19V5M9 7h6",
    money: "M3 7h18v10H3zM12 9.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5zM6 10v4M18 10v4",
    warning: "M12 4l9 16H3zM12 10v4M12 17v.01",
    info: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM12 11v5M12 8v.01",
    user: "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21a8 8 0 0 1 16 0",
    calendar: "M4 6h16v14H4zM4 10h16M8 3v4M16 3v4",
    file: "M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8zM14 3v5h5M9 13h6M9 17h4",
    link: "M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1",
    key: "M15 8a4 4 0 1 1-3.9 4.9L4 20v-3l2-2v-2h2l2.2-2.2A4 4 0 0 1 15 8z",
    shield: "M12 3l7 3v5c0 4.5-3 8-7 10-4-2-7-5.5-7-10V6zM9 12l2 2 4-4",
    heart: "M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.5A4 4 0 0 1 19 10c0 5.6-7 10-7 10z",
    star: "M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z",
    school: "M3 9l9-5 9 5-9 5zM7 12v4c0 1.5 2.2 3 5 3s5-1.5 5-3v-4",
    tool: "M14 6a4 4 0 0 0 5 5l-9 9a2.1 2.1 0 0 1-3-3l9-9a4 4 0 0 0-2-2z",
    chat: "M4 5h16v11H9l-5 4z",
    check: "M5 12.5l4.5 4.5L19 7.5",
    bolt: "M13 3L5 14h6l-1 7 8-11h-6z",
    globe: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18",
    id: "M3 6h18v12H3zM5.5 16a3 3 0 0 1 5 0M8 9.5v.01M14 10h4M14 14h3",
    food: "M6 3v8a2 2 0 0 0 2 2v8M10 3v8M6 7h4M17 3c-2 2-2 6 0 8v10",
    home: "M4 11l8-7 8 7v9H4zM10 20v-6h4v6",
    bus: "M5 5h14v12H5zM5 11h14M8 20v-3M16 20v-3M8 14.5v.01M16 14.5v.01",
    wifi: "M3 9a14 14 0 0 1 18 0M6 12.5a9 9 0 0 1 12 0M9 16a4.5 4.5 0 0 1 6 0M12 19.5v.01",
    print: "M7 8V3h10v5M5 8h14a2 2 0 0 1 2 2v6h-3M7 14h10v7H7z",
    lock: "M6 11h12v9H6zM8 11V8a4 4 0 0 1 8 0v3",
    bell: "M6 17V11a6 6 0 0 1 12 0v6l2 2H4zM10 21h4",
    gift: "M4 11h16v9H4zM3 7h18v4H3zM12 7v13M12 7C10 3 6 4 8 7M12 7c2-4 6-3 4 0",
    flag: "M5 21V4M5 4h11l-2 4 2 4H5",
    copy: "M9 9h11v11H9zM5 15V4h11",
    nav: "M12 3l7 17-7-4-7 4z",
    wa: "M4 20l1.3-4.2A8 8 0 1 1 8.2 18.8zM9 9c0 3 3 6 6 6l1.5-1.5-2-1-1 .7c-1-.4-2-1.4-2.4-2.4l.7-1-1-2z",
    arrow: "M9 6l6 6-6 6",
  };
  const uiIc = (n, cls) => '<svg class="aiIc' + (cls ? " " + cls : "") + '" viewBox="0 0 24 24" aria-hidden="true"><path d="' + (UI_IC[n] || UI_IC.info) + '"/></svg>';
  const UI_L = {
    he: { todayTag: "היום", email: "מייל", phone: "חיוג", whatsapp: "וואטסאפ", link: "פתח", address: "ניווט", copy: "העתק", copied: "הועתק", open: "פתוח עכשיו", closed: "סגור כעת", until: "עד ", opens: "נפתח ", waze: "Waze", maps: "מפות", dayN: ["א'", "ב'", "ג'", "ד'", "ה'", "ו'", "ש'"] },
    en: { todayTag: "Today", email: "Email", phone: "Call", whatsapp: "WhatsApp", link: "Open", address: "Navigate", copy: "Copy", copied: "Copied", open: "Open now", closed: "Closed now", until: "until ", opens: "opens ", waze: "Waze", maps: "Maps", dayN: ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"] },
    fr: { todayTag: "Aujourd'hui", email: "E-mail", phone: "Appeler", whatsapp: "WhatsApp", link: "Ouvrir", address: "Itinéraire", copy: "Copier", copied: "Copié", open: "Ouvert", closed: "Fermé", until: "jusqu'à ", opens: "ouvre ", waze: "Waze", maps: "Maps", dayN: ["Di", "Lu", "Ma", "Me", "Je", "Ve", "Sa"] },
  };
  const ul = () => UI_L[lang()] || UI_L.he;
  const uiCo = b => " c-" + (b.co || "def");
  const uiAn = b => " a-" + (b.an || "rise");
  const uiBk = (b, cls, inner, withTitle) => '<div class="aiBk ' + cls + uiCo(b) + uiAn(b) + '" style="--i:' + Math.min(uiN++, 12) + '">' +
    (withTitle && b.ti ? '<div class="aiBkT">' + (b.ic ? uiIc(b.ic) : "") + "<span>" + esc2(b.ti) + "</span></div>" : "") + inner + "</div>";
  // one tappable action: call, mail, WhatsApp, open, navigate - plus a small copy button next to the ones that carry a value
  function uiActBtn(a, big) {
    const L = ul(), v = esc2(a.v), t = a.t;
    if (t === "text") return '<span class="aiAcT">' + v + "</span>";
    const map = { email: ["mail", "mail"], phone: ["phone", "tel"], whatsapp: ["wa", "wa"], link: ["link", "url"], address: ["nav", "maps"] };
    const m = map[t] || map.link, label = esc2(a.l || L[t] || "");
    const short = esc2(String(a.v).replace(/^https?:\/\//, "").slice(0, 34));
    return '<span class="aiAcG ' + (big ? "big" : "") + '"><button type="button" class="aiAc" data-act="' + m[1] + '" data-v="' + v + '">' + uiIc(m[0]) + "<span><i>" + label + "</i><em>" + short + "</em></span></button>" +
      (t === "address" ? "" : '<button type="button" class="aiAcC" data-act="copy" data-v="' + v + '" aria-label="' + esc2(L.copy) + '">' + uiIc("copy") + "</button>") + "</span>";
  }
  function uiAction(el) {
    const act = el.dataset.act, v = String(el.dataset.v || "");
    const flash = () => { el.classList.add("done"); setTimeout(() => el.classList.remove("done"), 1100); };
    const go = u => { try { window.open(u, "_blank", "noopener,noreferrer"); } catch (e) {} };
    if (act === "copy") { copyText(v).then(ok => { toast(ok ? ul().copied : tx("errGen"), 1500); if (ok) flash(); }); return; }
    if (act === "tel" && /^[+*#0-9][0-9\-\s()*#+]{2,24}$/.test(v)) { location.href = "tel:" + v.replace(/[^0-9+*#]/g, ""); return; }
    if (act === "mail" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) { location.href = "mailto:" + v; return; }
    if (act === "wa") { let d = v.replace(/\D/g, ""); if (d.startsWith("0")) d = "972" + d.slice(1); if (d.length >= 9) go("https://wa.me/" + d); return; }
    if (act === "url" && /^https:\/\/[^\s]+$/.test(v)) { go(v); return; }
    if (act === "maps" && v) { go("https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(v)); return; }
    if (act === "waze" && v) { go("https://waze.com/ul?q=" + encodeURIComponent(v) + "&navigate=yes"); return; }
  }
  // opening hours: "א'-ה'" + "8:15-22:00" -> is it open right now?
  const HD = { "א": 0, "ב": 1, "ג": 2, "ד": 3, "ה": 4, "ו": 5, "ש": 6 };
  function uiDays(str) {
    let s = String(str || "").replace(/ימים|יום/g, " ").replace(/שבת/g, "ש").replace(/שישי/g, "ו").replace(/חמישי/g, "ה").replace(/רביעי/g, "ד").replace(/שלישי/g, "ג").replace(/שני/g, "ב").replace(/ראשון/g, "א");
    s = s.replace(/(^|[\s,'׳"])ו-\s*(?=[אבגדהש])/g, "$1,");
    const out = new Set(); s = s.replace(/[אבגדהוש]['׳"]?\s*[-–]\s*[אבגדהוש]['׳"]?/g, m => {
      const l = m.match(/[אבגדהוש]/g), a = HD[l[0]], b = HD[l[1]]; for (let i = a; ; i = (i + 1) % 7) { out.add(i); if (i === b) break; } return " ";
    });
    (s.match(/[אבגדהוש](?=['׳"]|\s|,|$)/g) || []).forEach(l => out.add(HD[l]));
    return out;
  }
  function uiRanges(str) {
    const out = []; String(str || "").replace(/(\d{1,2})[:.](\d{2})\s*[-–]\s*(\d{1,2})[:.](\d{2})/g, (m, a, b, c, d) => { out.push([+a * 60 + +b, +c * 60 + +d]); return m; });
    return out;
  }
  function uiOpenNow(rows) {
    const now = new Date(), day = now.getDay(), mins = now.getHours() * 60 + now.getMinutes();
    let known = false, until = null;
    for (const r of rows) {
      const days = uiDays(r.d), rg = uiRanges(r.h);
      if (!rg.length || !days.size) continue; known = true;
      if (days.has(day)) for (const [a, b] of rg) if (mins >= a && mins < b) until = b;
    }
    if (!known) return null;
    return until !== null ? { open: true, until } : { open: false };
  }
  const uiHM = m => String(Math.floor(m / 60)).padStart(2, "0") + ":" + String(m % 60).padStart(2, "0");
  // "א' - ה'" -> "א׳–ה׳" (one tidy label that never breaks across lines)
  const uiDayLabel = d => String(d || "").trim().replace(/\s*[-–]\s*/g, "–").replace(/'/g, "׳").replace(/\s*,\s*/g, ", ");
  // "06:00-09:00, 12:00-14:00 ו-18:00-01:00" -> three chips; anything that is not a plain range ("06:00 עד כניסת שבת") stays a text chip
  function uiTimeChips(h) {
    const parts = String(h || "").split(/\s*(?:,|;|\/|\s\+\s|\sו-?(?=\d))\s*/).map(x => x.trim()).filter(Boolean);
    return (parts.length ? parts : [String(h || "").trim()]).map(x => {
      const m = x.match(/^(\d{1,2})[:.](\d{2})\s*[-–]\s*(\d{1,2})[:.](\d{2})$/);
      return m ? { v: m[1].padStart(2, "0") + ":" + m[2] + "–" + m[3].padStart(2, "0") + ":" + m[4] } : { v: x, t: 1 };
    });
  }
  function uiHours(b) {
    const L = ul(), st = uiOpenNow(b.it);
    const badge = st ? '<span class="aiHbadge ' + (st.open ? "on" : "off") + '"><i></i>' + esc2(st.open ? L.open + " · " + L.until + uiHM(st.until) : L.closed) + "</span>" : "";
    let body;
    if (b.s === "week") {
      const today = new Date().getDay();
      body = '<div class="aiHw">' + L.dayN.map((n, d) => {
        const t = b.it.filter(r => uiDays(r.d).has(d)).map(r => r.h).join("\n");
        return '<div class="aiHwd' + (d === today ? " today" : "") + (t ? "" : " none") + '"><b>' + esc2(n) + "</b><span>" + (t ? esc2(t).replace(/\n/g, "<br>").replace(/\s*[-–]\s*/g, "<br>") : "-") + "</span></div>";
      }).join("") + "</div>";
    } else if (b.s === "compact") {
      body = '<div class="aiHc">' + b.it.map(r => "<span><b>" + esc2(r.l || r.d) + "</b> " + esc2(r.h) + "</span>").join("") + "</div>";
    } else {
      const todayN = new Date().getDay();
      body = '<div class="aiHtab">' + b.it.map(r => {
        const dayTxt = uiDayLabel(r.d), isToday = !!r.d && uiDays(r.d).has(todayN);
        const chips = uiTimeChips(r.h).map(c => '<i' + (c.t ? ' class="tx"' : "") + ">" + esc2(c.v) + "</i>").join("");
        return '<div class="aiHtr' + (isToday ? " today" : "") + '"><span class="aiHtd"><b>' + esc2(dayTxt || r.l || "") + "</b>" + (r.l && dayTxt ? "<small>" + esc2(r.l) + "</small>" : "") + (isToday ? '<em>' + esc2(L.todayTag) + "</em>" : "") + '</span><div class="aiHtt">' + chips + "</div></div>";
      }).join("") + "</div>";
    }
    return uiBk(b, "aiHours", '<div class="aiHH">' + uiIc(b.ic || "clock") + "<b>" + esc2(b.ti || "") + "</b>" + badge + "</div>" + body + (b.tx ? '<div class="aiNote">' + esc2(b.tx) + "</div>" : ""), false);
  }
  function uiContact(b) {
    const ini = esc2(String(b.ti || "?").trim().charAt(0));
    const av = '<span class="aiAvt">' + (b.ic ? uiIc(b.ic) : ini) + "</span>";
    const head = '<div class="aiCtH">' + av + "<div><b>" + esc2(b.ti || "") + "</b>" + (b.su ? "<small>" + esc2(b.su) + "</small>" : "") + "</div></div>";
    const acts = (b.it || []).map(a => uiActBtn(a, b.s === "big")).join("");
    return uiBk(b, "aiCt " + (b.s || "card"), head + (b.tx ? '<div class="aiNote">' + esc2(b.tx) + "</div>" : "") + (acts ? '<div class="aiCtA">' + acts + "</div>" : ""), false);
  }
  function uiNew(b) {
    const it = b.it || [];
    switch (b.k) {
      case "contact": return uiContact(b);
      case "hours": return it.length ? uiHours(b) : "";
      case "steps": {
        if (!it.length) return "";
        const st = b.s || "numbered";
        return uiBk(b, "aiSt2 " + st, "<ol>" + it.map((x, i) => '<li style="--k:' + i + '"><span class="aiStN">' + (i + 1) + "</span><div><b>" + esc2(x.l) + "</b>" + (x.d ? "<small>" + esc2(x.d) + "</small>" : "") + "</div></li>").join("") + "</ol>", true);
      }
      case "facts": return it.length ? uiBk(b, "aiFa " + (b.s || "list"), it.map(x => '<div class="aiFaR">' + (x.ic ? uiIc(x.ic) : "") + "<span>" + esc2(x.l) + "</span><b>" + esc2(x.v || "") + "</b></div>").join(""), true) : "";
      case "highlight": return it.length ? uiBk(b, "aiHl " + (b.s || "big"), it.map(x => '<div class="aiHlI"><b>' + esc2(x.v || x.l) + "</b>" + (x.v && x.l ? "<span>" + esc2(x.l) + "</span>" : "") + (x.d ? "<small>" + esc2(x.d) + "</small>" : "") + "</div>").join(""), true) : "";
      case "price": return it.length ? uiBk(b, "aiPz " + (b.s || "tags"), it.map(x => '<div class="aiPzI"><span>' + esc2(x.l) + "</span><b>" + esc2(x.v || "") + "</b>" + (x.d ? "<small>" + esc2(x.d) + "</small>" : "") + "</div>").join(""), true) : "";
      case "callout": case "banner": {
        const tone = b.tone || "info", ic = b.ic || { warn: "warning", danger: "warning", success: "check", tip: "bolt", info: "info" }[tone] || "info";
        return uiBk({ ...b, co: b.co || ({ warn: "orange", danger: "red", success: "green", tip: "purple", info: "blue" }[tone]) }, (b.k === "banner" ? "aiBn " : "aiCo2 ") + (b.s || ""), uiIc(ic) + "<div>" + (b.ti ? "<b>" + esc2(b.ti) + "</b>" : "") + "<span>" + esc2(b.tx) + "</span></div>", false);
      }
      case "list": return it.length ? uiBk(b, "aiLi " + (b.s || "bullets"), "<ul>" + it.map((x, i) => '<li style="--k:' + i + '">' + (b.s === "icons" || x.ic ? uiIc(x.ic || b.ic || "check") : b.s === "numbers" ? '<span class="aiLiN">' + (i + 1) + "</span>" : '<i class="aiLiDot"></i>') + "<div><b>" + esc2(x.l) + "</b>" + (x.d ? "<small>" + esc2(x.d) + "</small>" : "") + "</div></li>").join("") + "</ul>", true) : "";
      case "checklist": return it.length ? uiBk(b, "aiCk", it.map(x => '<label class="aiCkI"><input type="checkbox"><i>' + uiIc("check") + "</i><div><b>" + esc2(x.l) + "</b>" + (x.d ? "<small>" + esc2(x.d) + "</small>" : "") + "</div></label>").join(""), true) : "";
      case "accordion": return it.length ? uiBk(b, "aiAcc", it.map(x => '<details><summary><span>' + esc2(x.q) + "</span>" + uiIc("arrow") + "</summary><p>" + esc2(x.a) + "</p></details>").join(""), true) : "";
      case "tabs": return it.length ? uiBk(b, "aiTb", '<div class="aiTbH" role="tablist">' + it.map((x, i) => '<button type="button" role="tab" data-tab="' + i + '" class="' + (i === 0 ? "on" : "") + '">' + esc2(x.l) + "</button>").join("") + "</div>" + it.map((x, i) => '<div class="aiTbP' + (i === 0 ? " on" : "") + '" data-pane="' + i + '">' + esc2(x.tx) + "</div>").join(""), true) : "";
      case "table": case "compare": {
        if (!it.length) return "";
        const cols = b.col || [];
        if (b.k === "compare" && b.s === "cards" && cols.length) {
          return uiBk(b, "aiCmpC", cols.map((c, ci) => '<div class="aiCmpCard"><b>' + esc2(c) + "</b>" + it.map(r => "<div><span>" + esc2(r.l) + "</span>" + esc2((r.c || [])[ci] || "-") + "</div>").join("") + "</div>").join(""), true);
        }
        const head = cols.length ? "<thead><tr>" + (it.some(r => r.l) ? "<th></th>" : "") + cols.map(c => "<th>" + esc2(c) + "</th>").join("") + "</tr></thead>" : "";
        return uiBk(b, "aiTbl " + (b.s === "striped" || b.k === "compare" ? "striped" : ""), '<div class="aiTblW"><table>' + head + "<tbody>" + it.map(r => "<tr>" + (r.l ? "<th>" + esc2(r.l) + "</th>" : "") + (r.c || []).map(c => "<td>" + esc2(c) + "</td>").join("") + "</tr>").join("") + "</tbody></table></div>", true);
      }
      case "links": return it.length ? uiBk(b, "aiLk " + (b.s || "list"), it.map(x => '<button type="button" class="aiLkI" data-act="url" data-v="' + esc2(x.u) + '">' + uiIc(x.ic || "link") + "<span><b>" + esc2(x.l) + "</b>" + (x.d ? "<small>" + esc2(x.d) + "</small>" : "") + "</span>" + uiIc("arrow", "go") + "</button>").join(""), true) : "";
      case "timeline": return it.length ? uiBk(b, "aiTm " + (b.s || "vertical"), it.map((x, i) => '<div class="aiTmI" style="--k:' + i + '"><i></i><div><em>' + esc2(x.dt) + "</em><b>" + esc2(x.l) + "</b>" + (x.d ? "<small>" + esc2(x.d) + "</small>" : "") + "</div></div>").join(""), true) : "";
      case "location": {
        const L = ul(), addr = esc2(b.tx);
        return uiBk(b, "aiLoc", '<div class="aiLocH">' + uiIc(b.ic || "pin") + "<div><b>" + esc2(b.ti || b.tx) + "</b>" + (b.su ? "<small>" + esc2(b.su) + "</small>" : "") + (b.ti ? "<small>" + addr + "</small>" : "") + '</div></div><div class="aiLocA"><button type="button" class="aiAc" data-act="waze" data-v="' + addr + '">' + uiIc("nav") + "<span><i>" + esc2(L.waze) + '</i></span></button><button type="button" class="aiAc" data-act="maps" data-v="' + addr + '">' + uiIc("pin") + "<span><i>" + esc2(L.maps) + '</i></span></button><button type="button" class="aiAcC" data-act="copy" data-v="' + addr + '" aria-label="' + esc2(L.copy) + '">' + uiIc("copy") + "</button></div>", false);
      }
      case "quote": return uiBk(b, "aiQt " + (b.s || "quote"), (b.s === "definition" ? "<b>" + esc2(b.su || b.ti || "") + "</b><p>" + esc2(b.tx) + "</p>" : "<p>" + esc2(b.tx) + "</p>" + (b.su || b.ti ? "<small>" + esc2(b.su || b.ti) + "</small>" : "")), false);
      case "summary": return uiBk(b, "aiSm " + (b.s || "card"), (b.ti ? "<b>" + (b.ic ? uiIc(b.ic) : "") + esc2(b.ti) + "</b>" : "") + (b.tx ? "<p>" + esc2(b.tx) + "</p>" : "") + (it.length ? "<ul>" + it.map(x => "<li>" + esc2(x.l) + "</li>").join("") + "</ul>" : ""), false);
      case "heading": return uiBk(b, "aiHg " + (b.s || "plain"), (b.ic ? uiIc(b.ic) : "") + "<div><b>" + esc2(b.ti) + "</b>" + (b.tx ? "<small>" + esc2(b.tx) + "</small>" : "") + "</div>", false);
      case "hero": return b.ti ? uiBk(b, "aiHero " + (b.s || "gradient"), '<span class="aiHeroI">' + uiIc(b.ic || "star") + '</span><div class="aiHeroT"><b>' + esc2(b.ti) + "</b>" + (b.su ? "<em>" + esc2(b.su) + "</em>" : "") + (b.tx ? "<small>" + esc2(b.tx) + "</small>" : "") + "</div>" +
        (it.length ? '<div class="aiHeroS">' + it.map((x, i) => '<div style="--k:' + i + '"><b>' + esc2(x.v) + "</b><small>" + esc2(x.l) + "</small></div>").join("") + "</div>" : ""), false) : "";
      case "routes": return it.length ? uiBk(b, "aiRt " + (b.s || "badges"), it.map((x, i) => '<div class="aiRtI" style="--k:' + i + ";--rc:hsl(" + ((i * 57 + 212) % 360) + ' 66% 50%)">' + (x.b ? "<i>" + esc2(x.b) + "</i>" : '<i class="dot"></i>') + "<div><b>" + esc2(x.l) + "</b>" + (x.d ? "<small>" + esc2(x.d) + "</small>" : "") + "</div></div>").join(""), true) : "";
      case "tags": return it.length ? uiBk(b, "aiTg", it.map(x => "<span>" + (x.ic ? uiIc(x.ic) : "") + esc2(x.l) + "</span>").join(""), true) : "";
      default: return null;
    }
  }
  function uiBlock(b) {
    const nb = uiNew(b); if (nb !== null) return nb;
    const head = b.ti ? '<div class="aiUiT">' + esc2(b.ti) + "</div>" : "";
    if (b.k === "deadlines" && b.it && b.it.length) {
      const body = b.s === "timeline" ? uiTimeline(b.it) : b.s === "focus" ? uiFocus(b.it) : b.it.map(uiTicket).join("");
      return head + body;
    }
    if (b.k === "grades" && b.it && b.it.length) return head + (b.s === "list"
      ? '<div class="aiLs">' + b.it.map(it => "<div" + itAttr("g", it) + "><span>" + esc2(it.n) + "</span><b>" + esc2(it.v) + "</b></div>").join("") + "</div>"
      : '<div class="aiGgs">' + b.it.map(uiGauge).join("") + "</div>");
    if (b.k === "courses" && b.it && b.it.length) return head + (b.s === "list"
      ? '<div class="aiLs">' + b.it.map(it => "<div" + itAttr("c", it) + "><span>" + esc2(it.n) + "</span></div>").join("") + "</div>"
      : '<div class="aiCh">' + b.it.map(it => '<span' + itAttr("c", it) + ' style="--dc:hsl(' + dlHue(it.n) + ' 72% 58%)"><i></i>' + esc2(it.n) + "</span>").join("") + "</div>");
    if (b.k === "callout") return '<div class="aiCo ' + esc2(b.tone || "info") + '">' + (UI_ICONS[b.tone] || UI_ICONS.info) + "<div>" + (b.ti ? "<b>" + esc2(b.ti) + "</b>" : "") + "<span>" + esc2(b.tx) + "</span></div></div>";
    if (b.k === "stats" && b.it) return head + '<div class="aiStx">' + b.it.map(it => "<div><b>" + esc2(it.v) + "</b><small>" + esc2(it.l) + "</small></div>").join("") + "</div>";
    if (b.k === "steps" && b.it) return head + '<ol class="aiSp">' + b.it.map(it => "<li>" + esc2(it.l) + "</li>").join("") + "</ol>";
    if (b.k === "progress" && b.it) return head + '<div class="aiPr">' + b.it.map(it => { const v = Math.max(0, Math.min(100, parseFloat(it.v) || 0)); return '<div><div class="aiPrT"><span>' + esc2(it.l) + "</span><b>" + Math.round(v) + '%</b></div><i><u style="width:' + v + '%;background:' + gaugeCol(v) + '"></u></i></div>'; }).join("") + "</div>";
    if (b.k === "buttons" && b.it) return '<div class="aiQuick">' + b.it.map(it => '<button type="button" data-qk="' + esc2(it.v || it.l) + '">' + esc2(it.l) + "</button>").join("") + "</div>";
    return "";
  }
  const uiHTML = blocks => {
    if (!blocks.length) return "";
    uiN = 0;
    setTimeout(() => { try { document.querySelectorAll(".aiUi.fresh").forEach(x => x.classList.remove("fresh")); } catch (e) {} }, 2200);
    return '<div class="aiUi fresh">' + blocks.map(uiBlock).join("") + "</div>";
  };
  const uiPlain = blocks => blocks.map(b => (b.ti ? b.ti + ":\n" : "") + (b.tx || "") + (b.it || []).map(it => "- " + (it.n || it.l || "") + (it.c ? " (" + it.c + ")" : "") + (it.t ? " " + new Date(it.t * 1000).toLocaleString(dlt().loc) : "") + (it.v ? ": " + it.v : "")).join("\n")).join("\n\n");
  // the countdowns tick by themselves
  setInterval(() => {
    try { document.querySelectorAll(".aiUi [data-due]").forEach(el => { const v = dlRel(+el.dataset.due, el.dataset.long === "1"); if (el.textContent !== v) el.textContent = v; }); } catch (e) {}
  }, 30000);
  const noEmoji = s => String(s).replace(EMOJI_RE, " ");
  const plain = s => noEmoji(String(s).replace(FILE_RE, (m, r, n) => n).replace(POLL_RE, (m, k, b) => b.split("|").map(x => x.trim()).filter(Boolean).join(" / ")).replace(UI_RE, (m, b) => uiPlain(uiDecode(b))));                       // for copy and share
  // a waving hand, drawn here (not an emoji of the system)
  const WAVE = '<svg class="aiWave" viewBox="0 0 32 32" aria-hidden="true"><g class="aiWaveHand" fill="#ffc83d"><rect x="7.5" y="13" width="15" height="14" rx="6.5"/><rect x="8" y="5" width="3.8" height="14" rx="1.9"/>' +
    '<rect x="12.1" y="3" width="3.8" height="15" rx="1.9"/><rect x="16.2" y="4" width="3.8" height="14.5" rx="1.9"/><rect x="20.3" y="7" width="3.6" height="12" rx="1.8"/>' +
    '<rect x="2.6" y="15.5" width="3.8" height="10" rx="1.9" transform="rotate(-32 4.5 20.5)"/><path d="M11 22q4.5 3 9 0" fill="none" stroke="#e8a000" stroke-width="1.4" stroke-linecap="round"/></g></svg>';

  function md(src) {
    const files = [];
    src = noEmoji(src).replace(/\[\[[^\]]*$/, "")                                                // a marker still being typed by the stream: not shown yet
      .replace(FILE_RE, (m, ref, name, size) => { files.push([ref, name, size]); return "\u0001" + (files.length - 1) + "\u0001"; })
      .replace(POLL_RE, (m, kind, body) => { files.push(["\u0000", pollHTML(kind, body)]); return "\u0001" + (files.length - 1) + "\u0001"; })
      .replace(UI_RE, (m, b) => { files.push(["\u0000", uiHTML(uiDecode(b))]); return "\u0001" + (files.length - 1) + "\u0001"; });
    const html = md1(src);
    return files.length ? html.replace(/\u0001(\d+)\u0001/g, (m, i) => files[i][0] === "\u0000" ? files[i][1] : fileCard(files[i][0], files[i][1], files[i][2])) : html;
  }
  function md1(src) {
    const lines = String(src).replace(/\r/g, "").split("\n");
    const out = []; let para = [], list = null, code = null;
    const flushP = () => { if (para.length) { out.push("<p>" + para.map(inline).join("<br>") + "</p>"); para = []; } };
    const flushL = () => { if (list) { out.push("</" + list + ">"); list = null; } };
    for (const ln of lines) {
      if (code !== null) { if (/^\s*```/.test(ln)) { out.push("<pre><code>" + esc2(code.join("\n")) + "</code></pre>"); code = null; } else code.push(ln); continue; }
      if (/^\s*```/.test(ln)) { flushP(); flushL(); code = []; continue; }
      let m;
      if (/^\s*\u0001\d+\u0001\s*$/.test(ln)) { flushP(); flushL(); out.push(ln.trim()); continue; }
      if ((m = /^#{1,4}\s+(.*)$/.exec(ln))) { flushP(); flushL(); out.push('<p class="aiH">' + inline(m[1]) + "</p>"); continue; }
      if ((m = /^\s*[-*•]\s+(.*)$/.exec(ln))) { flushP(); if (list !== "ul") { flushL(); out.push("<ul>"); list = "ul"; } out.push("<li>" + inline(m[1]) + "</li>"); continue; }
      if ((m = /^\s*\d+[.)]\s+(.*)$/.exec(ln))) { flushP(); if (list !== "ol") { flushL(); out.push("<ol>"); list = "ol"; } out.push("<li>" + inline(m[1]) + "</li>"); continue; }
      if (!ln.trim()) { flushP(); flushL(); continue; }
      flushL(); para.push(ln);
    }
    if (code !== null) out.push("<pre><code>" + esc2(code.join("\n")) + "</code></pre>");
    flushP(); flushL();
    return out.join("");
  }

  /* ------------------------------------------------------------ server access */
  class AiErr extends Error { constructor(kind) { super(kind); this.kind = kind; } }

  const api = () => String(LS.get("aiApi", API_DEFAULT) || API_DEFAULT).replace(/\/+$/, "");
  // השרת בחינם נרדם אחרי חוסר פעילות; פינג שקט כשהאפליקציה נפתחת מעיר אותו לפני שהסטודנט מקליד את השאלה הראשונה
  let warmed = 0;
  function warmUp() {
    const now = Date.now();
    if (now - warmed < 240000) return;
    warmed = now;
    try { fetch(api() + "/api/health", { mode: "no-cors", cache: "no-store" }).catch(() => {}); } catch (e) {}
  }
  // the token only ever goes to https (or to a local test server) - never to any other address
  const okApi = b => { try { const u = new URL(b); return u.protocol === "https:" || (u.protocol === "http:" && /^(localhost|127\.0\.0\.1)$/.test(u.hostname)); } catch (e) { return false; } };
  const firstWord = s => String(s || "").trim().split(/\s+/)[0] || "";

  async function moodleId() {
    const u = LS.get("uid", 0); if (u) return u;
    try { return typeof myUserId === "function" ? await myUserId() : 0; } catch (e) { return 0; }
  }

  async function timedFetch(url, init, ms) {
    const ctl = init.ctl || new AbortController(); let timedOut = false;
    const to = setTimeout(() => { timedOut = true; ctl.abort(); }, ms || 95000);
    try { return await fetch(url, { ...init, ctl: undefined, signal: ctl.signal, cache: "no-store", credentials: "omit", referrerPolicy: "no-referrer" }); }
    catch (e) { if (e.name === "AbortError" && !timedOut) throw e; throw new AiErr("net"); }
    finally { clearTimeout(to); }
  }

  // an account for this student on our server (created on the first time), and a session for it. Re-done silently when the server forgot it.
  async function ensureSession(force) {
    if (ensureSession.p) return ensureSession.p;
    const run = async () => {
      const cur = await moodleId();
      const s0 = LS.get("aiSess", null);
      if (!force && s0 && s0.token && (!cur || String(s0.mid) === String(cur))) return s0;
      if (!M.token) throw new AiErr("moodle");
      const base = api(); if (!okApi(base)) throw new AiErr("gen");
      const res = await timedFetch(base + "/api/moodle/connect", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token: M.token }) });
      if (res.status === 401) throw new AiErr("moodle");
      if (res.status === 429) throw new AiErr("rate");
      if (!res.ok) throw new AiErr(res.status >= 500 ? "net" : "gen");
      const j = await res.json();
      const mid = j.moodle && j.moodle.userid != null ? String(j.moodle.userid) : "";
      if (j.new_user) { try { LS.del("aiDemoSeen"); LS.del("aiTourSeen"); LS.set("aiTourPending", "1"); } catch (e) {} }          // the first time we ever see this student: both introductions are due
      const s = { token: j.token, mid, name: j.display_name || firstWord(j.moodle && j.moodle.fullname) };
      if (s0 && String(s0.mid) !== mid) { LS.del("aiConv"); LS.del("aiLeft"); }   // a different student on this phone
      LS.set("aiSess", s);
      return s;
    };
    ensureSession.p = run().finally(() => { ensureSession.p = null; });
    return ensureSession.p;
  }

  async function call(path, opt, retried) {
    opt = opt || {};
    const s = await ensureSession(false);
    const base = api(); if (!okApi(base)) throw new AiErr("gen");
    const res = await timedFetch(base + path, {
      method: opt.method || "GET", ctl: opt.ctl,
      headers: { "Content-Type": "application/json", Authorization: "Bearer " + s.token },
      body: opt.body ? JSON.stringify(opt.body) : undefined,
    }, opt.timeout);
    if (res.status === 401 && !retried) { await ensureSession(true); return call(path, opt, true); }   // the server restarted and forgot the session
    return res;
  }

  const errKind = res => res.status === 403 ? "moodle" : res.status === 429 ? "rate" : res.status >= 500 || res.status === 401 ? "net" : "gen";
  const errText = e => tx(e && e.kind === "moodle" ? "errMoodle" : e && e.kind === "rate" ? "errRate" : e && e.kind === "net" ? "errNet" : "errGen");

  /* ------------------------------------------------------------ state */
  let fab = null, panel = null, splash = null, intro = null, ms = null, input = null, sendBtn = null, statusEl = null, titleEl = null, histBtn = null, memBtn = null, histMode = false, memMode = false;
  let animFrom = Infinity, loadAnimN = 0, closing = false, loadFail = null;
  let msgs = [], conv = null, busy = false, ctl = null, gen = 0, curBub = null, pushed = false, skipPop = 0, lastPending = "";

  const left = () => LS.set("aiLeft", Date.now());
  const sessName = () => { const s = LS.get("aiSess", null); return s && s.name ? s.name : ""; };

  /* ------------------------------------------------------------ rendering */
  // what the bot is doing: only the real actions (Moodle, memory), as one line that spins; when it is done the line goes and the next one comes
  const DOTS = '<span class="aiDots" aria-label="…"><i></i><i></i><i></i></span>';
  const activityHTML = (status, done) => status ? '<div class="aiAct" role="status">' + 
    '<div class="aiStp now"><i class="aiSi"></i><span>' + esc2(status) + "…</span></div></div>" : DOTS;
  // what the bot remembered or forgot in this answer
  const chipsHTML = mem => (mem || []).map((e, i) => '<div class="aiMemChip' + (e.op === "del" ? " del" : "") + (e.undone ? " undone" : "") + '"><span class="aiMemI">' + I_BRAIN + '</span><span class="aiMemT">' +
    esc2((e.op === "del" ? tx("memGone") : tx("memSaved")) + ": " + (e.text || "")) + "</span>" + (e.op === "add" && !e.undone ? '<button type="button" data-undo="' + esc2(e.id || "") + '">' + esc2(tx("memUndo")) + "</button>" : e.undone ? "<span>" + esc2(tx("memUndone")) + "</span>" : "") + "</div>").join("");
  const toolLabel = e => { const k = "tl_" + e.name; return (TX[lang()][k] || TX.he[k]) ? tx(k, e.arg) : tx("tlGeneric"); };
  // the steps queue up and each one stays at least 0.7s, so the student can read what Uri is doing; the answer's first words cut it short
  function paintAct(ai) {
    if (!curBub || ai.content) return;
    const old = curBub.querySelector(".aiAct");
    const draw = () => { if (curBub && !ai.content) { curBub.innerHTML = activityHTML(ai.status); scrollEnd(false); } };
    if (old && ai.status) { old.classList.add("out"); clearTimeout(ai.swapT); ai.swapT = setTimeout(draw, 170); }       // the finished step fades away completely, then the next one comes
    else draw();
  }
  function pumpAct(ai) {
    if (ai.stepTm) return;
    const next = (ai.stepQ || []).shift(); if (next === undefined) return;
    ai.status = next; paintAct(ai);
    ai.stepTm = setTimeout(() => { ai.stepTm = 0; pumpAct(ai); }, 900);
  }
  function setActivity(ai, label) {
    if (!label) { ai.stepQ = []; clearTimeout(ai.stepTm); ai.stepTm = 0; ai.status = ""; paintAct(ai); return; }       // writing: the dots come back
    const q = ai.stepQ = ai.stepQ || [];
    if (label === ai.status || q[q.length - 1] === label) return;
    q.push(label); if (q.length > 3) q.splice(1, q.length - 3);
    pumpAct(ai);
  }
  function onStreamEvent(ai, e) {
    if (!e) return;
    if (e.s === "mem") { (ai.mem = ai.mem || []).push(e); return; }                              // the note under the answer says it
    if (e.s === "kb") { setActivity(ai, tx("stKb")); return; }
    if (e.s === "moodle") { setActivity(ai, tx("stMoodle")); return; }
    if (e.s === "kbdone") { if (e.t) setActivity(ai, tx("stFound", e.t)); return; }
    if (e.s === "tool") { setActivity(ai, toolLabel(e)); return; }                                // every real action, in order
    if (e.s === "write" && ai.status) { setActivity(ai, ""); return; }                           // done: the dots come back
    if (e.s === "visual") {                                                                     // the iron rule: the text so far is being redrawn as cards
      ai.content = ""; ai.lastHtml = ""; ai.pending = true; ai.status = ""; ai.steps = []; ai.stepQ = [];
      if (curBub) { curBub.classList.remove("aiStream"); const r = curBub.closest(".aiM"); if (r) r.classList.add("aiPend"); }
      setActivity(ai, tx("tlVisual"));
    }
  }

  function bubble(role, content, opts) {
    const row = document.createElement("div"); row.className = "aiM " + (role === "user" ? "me" : "ai");
    if (opts && opts.bad) row.classList.add("aiBad");
    if (opts && opts.pending && !content) row.classList.add("aiPend");
    if (role !== "user") { const av = document.createElement("div"); av.className = "aiAv"; av.innerHTML = opts && opts.bad ? FACE_DEAD : FACE; row.appendChild(av); }
    const b = document.createElement("div"); b.className = "aiB"; b.dir = "auto";
    if (role === "user") b.textContent = content;
    else if (opts && opts.pending && !content) b.innerHTML = activityHTML(opts.status);
    else b.innerHTML = md(content) + chipsHTML(opts && opts.mem);
    if (!(opts && opts.pending && !content)) { b.tabIndex = 0; b.setAttribute("aria-haspopup", "menu"); }   // reachable from the keyboard (the Menu key opens the same menu)
    row.appendChild(b);
    return { row, b };
  }

  function greeting() {
    const n = sessName();
    const sug = ["s1", "s2", "s3"].map(k => '<button type="button" data-q="' + esc2(tx(k)) + '">' + esc2(tx(k)) + "</button>").join("");
    return '<div class="aiHi"><div class="aiBig">' + FACE + "</div><h2>" + esc2(n ? tx("hello", n) : tx("helloNo")) + ' <span class="aiHand">' + WAVE + "</span></h2><p>" + esc2(tx("intro")) +
      '</p><div class="aiSug">' + sug + "</div></div>";
  }

  const wait = d => new Promise(r => setTimeout(r, d));
  function swapAnim() { ms.classList.remove("aiSwap"); void ms.offsetWidth; ms.classList.add("aiSwap"); }   // a soft change of what the list shows

  // only the poll in the newest message can still be answered; older ones are shown as history
  const pollLive = el => !busy && !el.closest(".aiLocked") && el.closest(".aiM") === ms.lastElementChild;
  function lockPoll(card, chosen) {
    if (!card) return;
    card.classList.add("aiLocked");
    card.querySelectorAll("button,input").forEach(b => { b.disabled = true; });
    chosen.forEach(b => b.classList.add("on"));
  }
  function lockOldPolls() {
    const last = ms.lastElementChild;
    ms.querySelectorAll(".aiPoll,.aiQuick").forEach(c => { if (c.closest(".aiM") !== last) { c.classList.add("aiLocked"); c.querySelectorAll("button,input").forEach(b => { b.disabled = true; }); } });
  }

  function renderMsgs() {
    const fromHist = histMode || memMode;
    histMode = false; memMode = false; setMode();
    ms.innerHTML = ""; curBub = null;
    if (!msgs.length) { ms.innerHTML = greeting(); animFrom = Infinity; loadAnimN = 0; return; }
    const sent = animFrom !== Infinity;                                   // just sent: the new messages rise in
    const from = sent ? animFrom : (loadAnimN ? Math.max(0, msgs.length - loadAnimN) : Infinity);   // just opened: the last few come in one by one
    msgs.forEach((m, i) => {
      const { row, b } = bubble(m.role, m.content, { pending: m.pending, bad: !!m.err, status: m.status, mem: m.mem });
      row.dataset.i = i;
      if (i >= from && !(sent && m.role === "user")) {                    // (the sent message is started by send(), from the input bar)
        row.classList.add("aiIn"); row.style.setProperty("--ad", ((i - from) * (sent ? 170 : 45)) + "ms"); if (!sent) row.style.setProperty("--fy", "12px");
      }
      if (m.justDone) { row.classList.add("aiDone"); m.justDone = false; }  // the answer has just arrived
      if (m.err) addErr(b, m, i === msgs.length - 1);
      if (busy && i === msgs.length - 1 && m.role !== "user") curBub = b;
      ms.appendChild(row);
    });
    animFrom = Infinity; loadAnimN = 0;
    if (fromHist) swapAnim();
    lockOldPolls(); scrollEnd(true);
  }

  function addErr(b, m, isLast) {
    const d = document.createElement("div"); d.className = "aiErr"; d.setAttribute("role", "alert");
    d.append(document.createTextNode(m.err + " "));
    // "try again" only on the latest question, so it never re-sends a different one
    if (m.retry && isLast) { const r = document.createElement("button"); r.type = "button"; r.textContent = tx("retry"); r.onclick = () => retry(); d.appendChild(r); }
    b.appendChild(d);
  }

  const atEnd = () => ms.scrollHeight - ms.scrollTop - ms.clientHeight < 90;
  // a new message glides into view; while an answer streams the list just stays glued to the end (no competing animations = no shaking)
  function scrollEnd(force) {
    if (!(force || atEnd())) return;
    if (force && !busy && !matchMedia("(prefers-reduced-motion: reduce)").matches) { try { ms.scrollTo({ top: ms.scrollHeight, behavior: "smooth" }); return; } catch (e) {} }
    ms.scrollTop = ms.scrollHeight;
  }

  function setMode() {
    const sub = histMode || memMode;
    titleEl.querySelector("b").textContent = memMode ? tx("memTitle") : histMode ? tx("hist") : tx("title");
    titleEl.querySelector("small").textContent = sub ? "" : tx("sub");
    histBtn.innerHTML = sub ? I_BACK : I_HIST; histBtn.setAttribute("aria-label", sub ? tx("back") : tx("hist")); histBtn.title = sub ? tx("back") : tx("hist");
    panel.querySelector(".aiFt").hidden = sub;
    if (memBtn) { memBtn.classList.toggle("on", memMode); memBtn.setAttribute("aria-pressed", memMode ? "true" : "false"); }
  }

  function setBusy(b) {
    const was = busy; busy = b;
    if (panel) panel.classList.toggle("aiBusy", b);
    if (sendBtn && was !== b) { sendBtn.classList.remove("aiSwap"); void sendBtn.offsetWidth; sendBtn.classList.add("aiSwap"); setTimeout(() => sendBtn.classList.remove("aiSwap"), 360); }
    sendBtn.innerHTML = b ? I_STOP : I_SEND; sendBtn.setAttribute("aria-label", b ? tx("stop") : tx("send")); sendBtn.title = b ? tx("stop") : tx("send");
    sendBtn.disabled = !b && !input.value.trim();
  }
  function setStatus(txt) { statusEl.textContent = txt || ""; statusEl.hidden = !txt; }

  /* ------------------------------------------------------------ conversations */
  async function loadConv(id) {
    const my = ++gen;
    ms.innerHTML = '<div class="aiHe">' + esc2(tx("connecting")) + "</div>"; histMode = false; memMode = false; setMode();
    const wake = setTimeout(() => { if (my === gen) ms.innerHTML = '<div class="aiHe">' + esc2(tx("wake")) + "</div>"; }, 6000);
    try {
      const res = await call("/api/conversations/" + encodeURIComponent(id) + "/messages");
      if (my !== gen) return;
      if (res.status === 404) { startNew(); return; }
      if (!res.ok) throw new AiErr(errKind(res));
      const j = await res.json();
      msgs = (j.messages || []).map(m => ({ role: m.role === "user" ? "user" : "assistant", content: String(m.content || "") }));
      conv = id; LS.set("aiConv", id);
      loadAnimN = 8; renderMsgs();
    } catch (e) {
      if (my !== gen) return;
      loadFail = e instanceof AiErr ? e : new AiErr("net");
      ms.innerHTML = ""; const d = document.createElement("div"); d.className = "aiHe";
      d.append(document.createTextNode((e instanceof AiErr ? errText(e) : tx("errLoad")) + " "));
      const r = document.createElement("button"); r.type = "button"; r.className = "aiHr"; r.style.width = "auto"; r.textContent = tx("retry"); r.onclick = () => loadConv(id); d.appendChild(r);
      ms.appendChild(d);
    } finally { clearTimeout(wake); }
  }

  function startNew() {
    closeMenu();
    gen++; if (ctl) { ctl.abort(); } msgs = []; conv = null; LS.del("aiConv"); setBusy(false); setStatus("");
    renderMsgs();
  }

  async function openHistory() {
    const my = ++gen; histMode = true; memMode = false; setMode(); closeMenu();
    ms.innerHTML = '<div class="aiHe">' + esc2(tx("connecting")) + "</div>";
    try {
      const res = await call("/api/conversations");
      if (my !== gen) return;
      if (!res.ok) throw new AiErr(errKind(res));
      const list = ((await res.json()).conversations || []).filter(c => c && c.id);
      ms.innerHTML = "";
      if (!list.length) {
        ms.innerHTML = '<div class="aiHe">' + esc2(tx("histEmpty")) + "</div>"; return;
      }
      const wrap = document.createElement("div"); wrap.className = "aiHs"; wrap.style.cssText = "padding-top:0;padding-bottom:0;flex:none";
      const bar = document.createElement("div"); bar.className = "aiHt";
      const cnt = document.createElement("span"); cnt.textContent = tx("histCount", list.length);
      const all = document.createElement("button"); all.type = "button"; all.className = "aiLink"; all.textContent = tx("delAll"); all.onclick = () => deleteAll();
      bar.append(cnt, all); wrap.appendChild(bar);
      const loc = lang() === "he" ? "he-IL" : lang() === "fr" ? "fr-FR" : "en-GB";
      for (const c of list) {
        const row = document.createElement("div"); row.className = "aiHrow"; row.dataset.id = c.id; row.style.setProperty("--i", Math.min(list.indexOf(c), 9));
        const r = document.createElement("button"); r.type = "button"; r.className = "aiHr" + (c.id === conv ? " on" : "");
        const title = c.title && c.title !== "שיחה חדשה" ? c.title : tx("histNone");
        const when = new Date(c.updated_at || c.created_at);
        const b = document.createElement("b"); b.textContent = title; b.dir = "auto";
        const sm = document.createElement("small"); sm.textContent = isNaN(when) ? "" : when.toLocaleString(loc, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
        r.append(b, sm); r.onclick = () => { if (c.id === conv && msgs.length) { renderMsgs(); } else loadConv(c.id); };
        const del = document.createElement("button"); del.type = "button"; del.className = "aiHdel"; del.innerHTML = I_TRASH;
        del.setAttribute("aria-label", tx("delOne") + ": " + title); del.title = tx("delOne"); del.onclick = () => deleteOne(c.id);
        row.append(r, del); wrap.appendChild(row);
      }
      ms.appendChild(wrap); swapAnim();
    } catch (e) {
      if (my !== gen) return;
      ms.innerHTML = '<div class="aiHe">' + esc2(errText(e)) + "</div>";
    }
  }

  /* ------------------------------------------------------------ what the bot remembers about the student */
  async function openMemory() {
    const my = ++gen; histMode = false; memMode = true; setMode(); closeMenu();
    ms.innerHTML = '<div class="aiHe">' + esc2(tx("connecting")) + "</div>";
    try {
      const res = await call("/api/memory");
      if (my !== gen) return;
      if (!res.ok) throw new AiErr(errKind(res));
      const list = (await res.json()).memories || [];
      ms.innerHTML = "";
      const wrap = document.createElement("div"); wrap.className = "aiHs"; wrap.style.cssText = "padding-top:0;padding-bottom:0;flex:none";
      const intro = document.createElement("p"); intro.className = "aiMemIntro"; intro.textContent = tx("memIntro"); wrap.appendChild(intro);
      if (!list.length) { const e = document.createElement("div"); e.className = "aiHe"; e.textContent = tx("memEmpty"); wrap.appendChild(e); }
      else {
        const bar = document.createElement("div"); bar.className = "aiHt";
        const cnt = document.createElement("span"); cnt.textContent = tx("memCount", list.length);
        const delAll = document.createElement("button"); delAll.type = "button"; delAll.className = "aiLink"; delAll.textContent = tx("memDelAll"); delAll.onclick = () => deleteAllMem();
        bar.append(cnt, delAll); wrap.appendChild(bar);
        list.forEach((m, i) => {
          const row = document.createElement("div"); row.className = "aiMemRow"; row.dataset.id = m.id; row.style.setProperty("--i", Math.min(i, 9));
          if (m.kind === "left_course") { const b = document.createElement("span"); b.className = "aiMemB"; b.textContent = tx("memLeft"); row.appendChild(b); }
          const t = document.createElement("span"); t.className = "aiMemX"; t.textContent = m.content; t.dir = "auto"; row.appendChild(t);
          const d = document.createElement("button"); d.type = "button"; d.className = "aiHdel"; d.innerHTML = I_TRASH; d.setAttribute("aria-label", tx("memDelOne") + ": " + m.content); d.title = tx("memDelOne"); d.onclick = () => deleteMem(m.id, row);
          row.appendChild(d); wrap.appendChild(row);
        });
      }
      wrap.appendChild(buildDevSection());
      const wipe = document.createElement("button"); wipe.type = "button"; wipe.className = "aiWipe"; wipe.innerHTML = I_TRASH + "<span>" + esc2(tx("wipeBtn")) + "</span>"; wipe.onclick = () => deleteMyData();
      wrap.appendChild(wipe);
      ms.appendChild(wrap); swapAnim();
    } catch (e) {
      if (my !== gen) return;
      ms.innerHTML = '<div class="aiHe">' + esc2(e instanceof AiErr ? errText(e) : tx("errLoad")) + "</div>";
    }
  }

  // erase EVERYTHING we hold about this student (account, chats, memory) and forget it on this phone too: the next time is a first time again
  async function deleteMyData() {
    if (!(await confirmDlg(tx("wipeQ1"), tx("wipeOk")))) return;
    if (!(await confirmDlg(tx("wipeQ2"), tx("wipeOk2")))) return;
    try { const res = await call("/api/me", { method: "DELETE" }); if (!res.ok) throw new AiErr(errKind(res)); }
    catch (e) { toast(errText(e), 3500); return; }
    dropCurrent(); ["aiSess", "aiConv", "aiLeft", "aiDemoSeen", "aiTourSeen", "aiTourPending"].forEach(k => { try { LS.del(k); } catch (e) {} });
    toast(tx("wiped"), 3500);
    await wait(900); try { close(); } catch (e) {}
  }

  /* ------------------------------------------------------------ personal AI key (developers): hidden under the memory settings */
  let personalOn = false;
  function setPersonal(on) { personalOn = !!on; try { LS.set("aiPersonal", on ? 1 : 0); } catch (e) {} const b = panel && panel.querySelector('[data-a="use"]'); if (b) b.hidden = !on; }
  async function refreshAiMode() {
    try { const r = await call("/api/me/ai"); if (r.ok) { const j = await r.json(); setPersonal(j.mode === "personal" && j.has_key); } } catch (e) {}
  }
  const DEV_PROV = [["google", "Google Gemini"], ["openai", "OpenAI"], ["xai", "xAI Grok"], ["groq", "Groq"]];
  function buildDevSection() {
    const d = document.createElement("details"); d.className = "aiDev";
    const sm = document.createElement("summary"); sm.textContent = tx("devT"); d.appendChild(sm);
    const body = document.createElement("div"); body.className = "aiDevB"; d.appendChild(body);
    let st = null, models = [];
    const api = async (path, method, data) => {
      const r = await call(path, { method: method || "GET", body: data }); let j = {}; try { j = await r.json(); } catch (e) {}
      if (!r.ok) throw new Error(j.detail || "error"); return j;
    };
    const opt = (sel, v, label) => { const o = document.createElement("option"); o.value = v; o.textContent = label || v; sel.appendChild(o); };
    const render = () => {
      body.innerHTML = "";
      const n = document.createElement("p"); n.className = "aiDevN"; n.textContent = tx("devNote"); body.appendChild(n);
      const s1 = document.createElement("div"); s1.className = "aiDevS"; s1.textContent = st && st.has_key ? tx("devSaved", (DEV_PROV.find(x => x[0] === st.kind) || [0, st.kind])[1] + " " + st.masked) : tx("devNone"); body.appendChild(s1);
      const r1 = document.createElement("div"); r1.className = "aiDevR";
      const ps = document.createElement("select"); DEV_PROV.forEach(([v, l]) => opt(ps, v, l)); if (st && st.kind) ps.value = st.kind;
      const ki = document.createElement("input"); ki.type = "password"; ki.placeholder = tx("devPh"); ki.autocomplete = "off";
      const sv = document.createElement("button"); sv.type = "button"; sv.textContent = tx("devSave");
      sv.onclick = async () => { if (!ki.value.trim()) return; try { st = await api("/api/me/ai/key", "POST", { provider: ps.value, api_key: ki.value.trim() }); models = []; setPersonal(false); render(); } catch (e) { toast(e.message, 4000); } };
      r1.append(ps, ki, sv); body.appendChild(r1);
      if (!(st && st.has_key)) return;
      const r2 = document.createElement("div"); r2.className = "aiDevR";
      const m1 = document.createElement("select"), m2 = document.createElement("select");
      const fillSel = (sel, cur, withNone) => { sel.innerHTML = ""; if (withNone) opt(sel, "", "-"); const all = [...new Set([...(models || []), ...(st.models || [])])]; all.forEach(m => opt(sel, m)); sel.value = cur || ""; };
      fillSel(m1, (st.models || [])[0], false); fillSel(m2, (st.models || [])[1], true);
      const ld = document.createElement("button"); ld.type = "button"; ld.textContent = tx("devList");
      const out = document.createElement("div"); out.className = "aiDevOut";
      ld.onclick = async () => { try { const j = await api("/api/me/ai/models-list", "POST"); models = j.models; fillSel(m1, m1.value, false); fillSel(m2, m2.value, true); } catch (e) { out.textContent = e.message; } };
      const ts = document.createElement("button"); ts.type = "button"; ts.textContent = tx("devTest");
      ts.onclick = async () => {
        if (!m1.value) { out.textContent = "-"; return; } out.textContent = "...";
        try { const j = await api("/api/me/ai/test", "POST", { model: m1.value }); out.textContent = j.success ? "✓ " + tx("devOk", (j.latency_ms / 1000).toFixed(1)) : "✗ " + tx("devFail") + ": " + (j.error || j.status_code || ""); }
        catch (e) { out.textContent = "✗ " + e.message; }
      };
      r2.append(m1, m2, ld, ts); body.append(r2, out);
      const lb = document.createElement("label"); lb.className = "aiDevC"; const cb = document.createElement("input"); cb.type = "checkbox"; cb.checked = st.mode === "personal";
      lb.append(cb, document.createTextNode(tx("devOn"))); body.appendChild(lb);
      const apply = async () => {
        const ms = [m1.value, m2.value].filter((v, i, a) => v && a.indexOf(v) === i);
        try { st = await api("/api/me/ai/choose", "POST", { models: ms, mode: cb.checked ? "personal" : "public" }); setPersonal(st.mode === "personal"); }
        catch (e) { cb.checked = false; toast(e.message, 4000); }
      };
      cb.onchange = apply; m1.onchange = m2.onchange = () => { if (cb.checked) apply(); };
      const del = document.createElement("button"); del.type = "button"; del.className = "danger"; del.textContent = tx("devDel");
      del.onclick = async () => { if (!(await confirmDlg(tx("devDelQ"), tx("delOk")))) return; try { await api("/api/me/ai", "DELETE"); st = null; models = []; setPersonal(false); render(); } catch (e) { toast(e.message, 3500); } };
      body.appendChild(del);
    };
    const load = async () => { try { st = await api("/api/me/ai"); } catch (e) { st = null; } render(); };
    d.addEventListener("toggle", () => { if (d.open && !st) load(); });
    render();
    return d;
  }

  async function openUsage() {
    const my = ++gen; histMode = false; memMode = true; setMode(); closeMenu();
    titleEl.querySelector("b").textContent = tx("useTitle");
    ms.innerHTML = '<div class="aiHe">' + esc2(tx("connecting")) + "</div>";
    try {
      const res = await call("/api/me/ai/usage"); if (my !== gen) return;
      if (!res.ok) throw new AiErr(errKind(res));
      const j = await res.json();
      const byDay = {}; (j.days || []).forEach(d => { byDay[d.day] = d; });
      const days = []; for (let i = 6; i >= 0; i--) { const dt = new Date(Date.now() - i * 86400000); const k = dt.getFullYear() + "-" + String(dt.getMonth() + 1).padStart(2, "0") + "-" + String(dt.getDate()).padStart(2, "0"); days.push([k, (byDay[k] || {}).calls || 0]); }
      const top = Math.max(1, ...days.map(d => d[1]));
      const per = {}; (j.models || []).forEach(m => { per[m.model] = (per[m.model] || 0) + m.calls; });
      ms.innerHTML = "";
      const wrap = document.createElement("div"); wrap.className = "aiHs aiUse"; wrap.style.cssText = "padding-top:6px;padding-bottom:0;flex:none";
      wrap.innerHTML = '<div class="aiUseT"><div><b>' + (j.total_calls || 0) + "</b><small>" + esc2(tx("useCalls")) + '</small></div><div><b>' + (j.total_fails || 0) + "</b><small>" + esc2(tx("useFails")) + "</small></div></div>" +
        (j.total_calls || j.total_fails ? '<div class="aiUseB">' + days.map(([k, v]) => '<div><em>' + (v || "") + '</em><i style="height:' + Math.round(v / top * 80) + 'px"></i><span>' + k.slice(8) + "/" + k.slice(5, 7) + "</span></div>").join("") + "</div>" +
          '<div class="aiUseM">' + Object.entries(per).sort((a, b) => b[1] - a[1]).map(([m, c]) => "<div><span>" + esc2(m) + "</span><b>" + c + "</b></div>").join("") + "</div>" : '<div class="aiHe">' + esc2(tx("useEmpty")) + "</div>") +
        '<p class="aiDevN">' + esc2(tx("useNote")) + "</p>";
      ms.appendChild(wrap); swapAnim();
    } catch (e) {
      if (my !== gen) return;
      ms.innerHTML = '<div class="aiHe">' + esc2(e instanceof AiErr ? errText(e) : tx("errLoad")) + "</div>";
    }
  }

  async function deleteMem(id, row) {
    try { const res = await call("/api/memory/" + encodeURIComponent(id), { method: "DELETE" }); if (!res.ok && res.status !== 404) throw new AiErr(errKind(res)); }
    catch (e) { toast(errText(e), 3500); return; }
    msgs.forEach(m => (m.mem || []).forEach(x => { if (x.id === id) x.undone = true; }));
    if (row && memMode) { row.classList.add("aiGone"); await wait(320); row.remove(); const n = ms.querySelectorAll(".aiMemRow").length; const c = ms.querySelector(".aiHt span");
      if (!n) openMemory(); else if (c) c.textContent = tx("memCount", n); }
    toast(tx("deleted"), 1500);
  }

  async function deleteAllMem() {
    if (!(await confirmDlg(tx("memDelAllQ"), tx("delOk")))) return;
    try { const res = await call("/api/memory", { method: "DELETE" }); if (!res.ok) throw new AiErr(errKind(res)); }
    catch (e) { toast(errText(e), 3500); return; }
    msgs.forEach(m => (m.mem || []).forEach(x => { x.undone = true; }));
    toast(tx("deleted"), 1500); openMemory();
  }

  async function undoMem(id) {                // "undo" on the chip under an answer
    try { const res = await call("/api/memory/" + encodeURIComponent(id), { method: "DELETE" }); if (!res.ok && res.status !== 404) throw new AiErr(errKind(res)); }
    catch (e) { toast(errText(e), 3500); return; }
    msgs.forEach(m => (m.mem || []).forEach(x => { if (x.id === id) x.undone = true; }));
    if (!histMode && !memMode) renderMsgs();
  }

  /* ------------------------------------------------------------ deleting history */
  // our own confirm box (not window.confirm: it blocks the page and looks foreign); "cancel" has the focus, so a stray Enter deletes nothing
  function confirmDlg(message, okLabel) {
    return new Promise(res => {
      const d = panel.querySelector(".aiDlg"), ok = d.querySelector("[data-ok]"), no = d.querySelector("[data-no]");
      d.querySelector("p").textContent = message; ok.textContent = okLabel; no.textContent = tx("cancel");
      const done = v => { d.hidden = true; d.onkeydown = d.onclick = ok.onclick = no.onclick = null; res(v); try { histBtn.focus({ preventScroll: true }); } catch (e) {} };
      ok.onclick = () => done(true); no.onclick = () => done(false);
      d.onclick = e => { if (e.target === d) done(false); };
      d.onkeydown = e => { if (e.key === "Escape") { e.stopPropagation(); done(false); } };
      d.hidden = false; try { no.focus({ preventScroll: true }); } catch (e) {}
    });
  }

  function dropCurrent() {                    // the open conversation was deleted
    gen++; if (ctl) ctl.abort(); msgs = []; conv = null; LS.del("aiConv"); setBusy(false); setStatus("");
  }

  async function deleteOne(id) {
    if (!(await confirmDlg(tx("delOneQ"), tx("delOk")))) return;
    try {
      const res = await call("/api/conversations/" + encodeURIComponent(id), { method: "DELETE" });
      if (!res.ok && res.status !== 404) throw new AiErr(errKind(res));
    } catch (e) { toast(errText(e), 3500); return; }
    if (id === conv) dropCurrent();
    toast(tx("deleted"), 1800);
    const row = histMode ? ms.querySelector('.aiHrow[data-id="' + id + '"]') : null;
    if (!row) { openHistory(); return; }
    row.classList.add("aiGone"); await wait(340); row.remove(); afterHistChange();      // the row folds away, the count follows
  }

  function afterHistChange() {
    const n = ms.querySelectorAll(".aiHrow").length;
    if (!n) { ms.innerHTML = '<div class="aiHe">' + esc2(tx("histEmpty")) + "</div>"; return; }
    const c = ms.querySelector(".aiHt span"); if (c) c.textContent = tx("histCount", n);
  }

  async function deleteAll() {
    if (!(await confirmDlg(tx("delAllQ"), tx("delOk")))) return;
    try {
      const res = await call("/api/conversations", { method: "DELETE" });
      if (!res.ok) throw new AiErr(errKind(res));
    } catch (e) { toast(errText(e), 3500); return; }
    dropCurrent(); LS.del("aiLeft");
    toast(tx("deleted"), 1800);
    const rows = histMode ? [...ms.querySelectorAll(".aiHrow")] : [];
    if (!rows.length) { openHistory(); return; }
    rows.forEach((r, i) => { r.style.setProperty("--i", Math.min(i, 8)); r.classList.add("aiGone"); });
    await wait(340 + Math.min(rows.length, 9) * 40); ms.innerHTML = '<div class="aiHe">' + esc2(tx("histEmpty")) + "</div>";
  }

  /* ------------------------------------------------------------ long-press menu on a message (copy, share, select, edit and resend) */
  let menuEl = null, menuBg = null, menuFor = null, holdT = 0, holdXY = [0, 0];
  const cancelHold = () => { clearTimeout(holdT); holdT = 0; };

  let menuPeek = null;
  function closeMenu() {
    cancelHold();
    if (menuPeek) { menuPeek.remove(); menuPeek = null; }
    if (menuEl) { menuEl.remove(); menuEl = null; }
    if (menuBg) { menuBg.remove(); menuBg = null; }
    if (menuFor) { menuFor.classList.remove("aiHold"); menuFor = null; }
    if (panel) panel.classList.remove("aiFocusing");
    document.querySelectorAll(".aiHoldRow").forEach(x => x.classList.remove("aiHoldRow"));
    document.querySelectorAll(".aiHasHold").forEach(x => x.classList.remove("aiHasHold"));
  }

  async function copyText(t) {
    try { await navigator.clipboard.writeText(t); return true; } catch (e) {}
    try {                                      // older browsers / no permission: the classic way
      const ta = document.createElement("textarea"); ta.value = t; ta.readOnly = true; ta.style.cssText = "position:fixed;top:0;left:0;width:1px;height:1px;opacity:.01;font-size:16px";
      panel.appendChild(ta); ta.select(); ta.setSelectionRange(0, t.length); const ok = document.execCommand("copy"); ta.remove(); return ok;
    } catch (e) { return false; }
  }

  function showMenu(b, items, x, y, byKey) {
    closeMenu();
    try { getSelection().removeAllRanges(); } catch (e) {}
    menuBg = document.createElement("div"); menuBg.className = "aiMnBg"; menuBg.onclick = closeMenu;
    menuEl = document.createElement("div"); menuEl.className = "aiMn"; menuEl.setAttribute("role", "menu"); menuEl.setAttribute("aria-label", tx("msgMenu"));
    let ki = 0;
    for (const it of items) {
      const bt = document.createElement("button"); bt.type = "button"; bt.className = "aiMi"; bt.setAttribute("role", "menuitem"); bt.innerHTML = it.icon + "<span></span>"; bt.style.setProperty("--k", ki++);
      bt.lastChild.textContent = it.label;
      bt.onclick = async () => { closeMenu(); await it.run(); };
      menuEl.appendChild(bt);
    }
    menuEl.addEventListener("keydown", e => {
      const btns = [...menuEl.querySelectorAll(".aiMi")], i = btns.indexOf(document.activeElement);
      if (e.key === "Escape") { e.stopPropagation(); const back = b; closeMenu(); try { back.focus({ preventScroll: true }); } catch (er) {} }
      else if (e.key === "ArrowDown") { e.preventDefault(); btns[(i + 1) % btns.length].focus(); }
      else if (e.key === "ArrowUp") { e.preventDefault(); btns[(i - 1 + btns.length) % btns.length].focus(); }
    });
    panel.append(menuBg, menuEl); menuFor = b; b.classList.add("aiHold"); panel.classList.add("aiFocusing");
    // the message row is its own layer (it animates), so the row is what must rise above the blur; the other cards in the same bubble fade back
    const rowEl = b.closest(".aiM"); if (rowEl) rowEl.classList.add("aiHoldRow");
    const bub = b.closest(".aiB"); if (bub && bub !== b) bub.classList.add("aiHasHold");

    // the menu sits next to the pressed thing: below it if there is room, else above it, else in the middle; always inside the screen
    const P = panel.getBoundingClientRect(), B = b.getBoundingClientRect(), mw = menuEl.offsetWidth, mh = menuEl.offsetHeight, gap = 8;
    const cx = byKey ? (B.left + B.right) / 2 : x;
    const left = Math.min(Math.max(cx - P.left - mw / 2, gap), Math.max(gap, P.width - mw - gap));
    let top;
    if (B.bottom + gap + mh <= P.bottom - gap) top = B.bottom + gap - P.top;
    else if (B.top - gap - mh >= P.top + gap) top = B.top - gap - mh - P.top;
    else top = Math.max(gap, (P.height - mh) / 2);
    menuEl.style.left = Math.round(left) + "px"; menuEl.style.top = Math.round(top) + "px"; menuEl.style.setProperty("--mo", top < B.top - P.top ? "50% 100%" : "50% 0");
    // the chat's character peeks over the edge of the menu, looking at what was pressed (above the menu if there is room, else it hangs under it)
    try {
      const mr = menuEl.getBoundingClientRect(), pk = document.createElement("div"); pk.className = "aiPeek";
      pk.innerHTML = '<div class="aiPeekF">' + FACE + "</div>";
      const x = Math.min(Math.max(mr.left - P.left + 18, 6), P.width - 54);
      if (mr.top - P.top - 32 >= 4) { pk.style.top = Math.round(mr.top - P.top - 30) + "px"; }
      else { pk.classList.add("below"); pk.style.top = Math.round(mr.bottom - P.top) + "px"; }
      pk.style.left = Math.round(x) + "px"; panel.appendChild(pk); menuPeek = pk;
    } catch (e) {}
    try { menuEl.querySelector(".aiMi").focus({ preventScroll: true }); } catch (e) {}
  }

  function openMenu(b, x, y, byKey) {
    const row = b.closest(".aiM"), idx = row ? +row.dataset.i : -1, m = msgs[idx];
    if (!m || m.pending || !String(m.content || "").trim()) return;
    const text = plain(m.content);
    const items = [{ icon: I_COPY, label: tx("copy"), run: async () => toast((await copyText(text)) ? tx("copied") : tx("errGen"), 1600) }];
    if (navigator.share) items.push({ icon: I_SHARE, label: tx("share"), run: async () => { try { await navigator.share({ text }); } catch (e) {} } });
    items.push({ icon: I_SELECT, label: tx("selectTxt"), run: () => { b.classList.add("aiSel"); const r = document.createRange(); r.selectNodeContents(b); const s = getSelection(); s.removeAllRanges(); s.addRange(r); } });
    if (m.role === "user") items.push({ icon: I_NEW, label: tx("reuse"), run: () => { input.value = String(m.content); input.dispatchEvent(new Event("input")); try { input.focus(); input.setSelectionRange(input.value.length, input.value.length); } catch (e) {} } });
    showMenu(b, items, x, y, byKey);
  }

  // long press on a task, a course or a grade inside the AI's cards: ask about it, get its files, and so on
  const ITM = {
    he: { open: "פתח ב-Moodle", ask: "שאל על זה", files: "הקבצים של זה", tasks: "המטלות בקורס", grades: "הציונים בקורס", cfiles: "הקבצים של הקורס", copy: "העתק",
      q: { d: (n, c) => 'ספר לי על המטלה "' + n + '" בקורס ' + c, df: (n, c) => 'שלח לי קבצים שקשורים ל"' + n + '" בקורס ' + c, g: (n) => 'ספר לי על הציון "' + n + '" ואיך הוא מחושב', c: (n) => "ספר לי על הקורס " + n, ct: (n) => "מה המטלות שלי בקורס " + n + "?", cg: (n) => "מה הציונים שלי בקורס " + n + "?", cf: (n) => "אילו קבצים יש בקורס " + n + "?" } },
    en: { open: "Open in Moodle", ask: "Ask about this", files: "Files for this", tasks: "Tasks in this course", grades: "Grades in this course", cfiles: "Course files", copy: "Copy",
      q: { d: (n, c) => 'Tell me about the task "' + n + '" in ' + c, df: (n, c) => 'Send me files related to "' + n + '" in ' + c, g: (n) => 'Tell me about the grade "' + n + '" and how it is calculated', c: (n) => "Tell me about the course " + n, ct: (n) => "What are my tasks in " + n + "?", cg: (n) => "What are my grades in " + n + "?", cf: (n) => "Which files are in " + n + "?" } },
    fr: { open: "Ouvrir dans Moodle", ask: "Poser une question", files: "Fichiers liés", tasks: "Devoirs du cours", grades: "Notes du cours", cfiles: "Fichiers du cours", copy: "Copier",
      q: { d: (n, c) => 'Parle-moi du devoir "' + n + '" dans ' + c, df: (n, c) => 'Envoie-moi les fichiers liés à "' + n + '" dans ' + c, g: (n) => 'Parle-moi de la note "' + n + '" et de son calcul', c: (n) => "Parle-moi du cours " + n, ct: (n) => "Quels sont mes devoirs en " + n + " ?", cg: (n) => "Quelles sont mes notes en " + n + " ?", cf: (n) => "Quels fichiers y a-t-il dans " + n + " ?" } },
  };
  function openItemMenu(el, x, y, byKey) {
    let d; try { d = JSON.parse(el.dataset.it); } catch (e) { return; }
    const T = ITM[lang()] || ITM.he, n = d.n || "", c = d.c || "";
    const ctxOf = { n, c, t: d.t || 0, d: d.d || "", v: d.v || "", o: d.o ? 1 : 0 };
    const go = q => () => { send(q, ctxOf); };
    const items = [];
    if (d.k === "d") {
      items.push({ icon: I_NEW, label: T.ask, run: go(T.q.d(n, c)) }, { icon: I_SELECT, label: T.files, run: go(T.q.df(n, c)) });
      if (typeof d.u === "string" && d.u.startsWith("https://moodle.jct.ac.il/")) items.push({ icon: I_SHARE, label: T.open, run: () => { window.open(d.u, "_blank", "noopener,noreferrer"); } });
    }
    else if (d.k === "c") { items.push({ icon: I_NEW, label: T.ask, run: go(T.q.c(n)) }, { icon: I_SELECT, label: T.tasks, run: go(T.q.ct(n)) }, { icon: I_SELECT, label: T.grades, run: go(T.q.cg(n)) }, { icon: I_SELECT, label: T.cfiles, run: go(T.q.cf(n)) }); }
    else if (d.k === "g") items.push({ icon: I_NEW, label: T.ask, run: go(T.q.g(n)) });
    items.push({ icon: I_COPY, label: T.copy, run: async () => toast((await copyText(n + (c ? " - " + c : "") + (d.v ? ": " + d.v : ""))) ? tx("copied") : tx("errGen"), 1600) });
    showMenu(el, items, x, y, byKey);
  }

  /* ------------------------------------------------------------ files the AI sends */
  const fileErrText = e => tx(e && e.kind === "moodle" ? "errMoodle" : e && e.kind === "rate" ? "errRate" : e && e.kind === "nofile" ? "fileGone" : e && e.kind === "big" ? "fileBig" : e && e.kind === "net" ? "errNet" : "fileErr");

  function fileState(btn, state, meta) {         // idle | busy | ok | err
    btn.classList.remove("busy", "ok", "err"); if (state !== "idle") btn.classList.add(state);
    const m = btn.querySelector(".aiFm"); if (m && meta != null) m.textContent = meta;
    btn.querySelector(".aiFd").innerHTML = state === "ok" ? I_CHK : state === "err" ? I_RETRY : I_DL;
    if (state === "idle") btn.querySelector(".aiFp i").style.width = "";
  }

  async function downloadFile(btn) {
    if (btn.classList.contains("busy")) return;
    const ref = btn.dataset.ref, name = (btn.dataset.name || "file").replace(/[\\/:*?"<>|\r\n]+/g, "_"), size = +btn.dataset.size || 0, idle = btn.dataset.idle || "";
    const bar = btn.querySelector(".aiFp"), fill = bar.querySelector("i"), meta = btn.querySelector(".aiFm");
    fileState(btn, "busy", tx("dling")); bar.classList.add("ind"); fill.style.width = "";
    try {
      if (!M.token) throw new AiErr("moodle");
      const res = await call("/api/moodle/file", { method: "POST", timeout: 120000, body: { ref, moodle_token: M.token } });   // the token goes in the body, never in an address
      if (!res.ok) throw new AiErr(res.status === 403 ? "moodle" : res.status === 429 ? "rate" : res.status === 404 ? "nofile" : res.status === 413 ? "big" : res.status >= 500 ? "net" : "gen");
      const total = +res.headers.get("Content-Length") || size || 0;
      let blob;
      if (res.body && res.body.getReader) {                          // read it piece by piece, so the bar can show how far it is
        const rd = res.body.getReader(), parts = []; let got = 0, last = 0;
        for (;;) {
          const { done, value } = await rd.read(); if (done) break;
          parts.push(value); got += value.length;
          const now = performance.now();
          if (now - last > 80) {
            last = now;
            if (total) { bar.classList.remove("ind"); const p = Math.min(99, Math.round(got / total * 100)); fill.style.width = p + "%"; meta.textContent = tx("dlProg", p, fmtSize(got), fmtSize(total)); }
            else meta.textContent = tx("dling") + " " + fmtSize(got);
          }
        }
        blob = new Blob(parts, { type: res.headers.get("Content-Type") || "" });
      } else blob = await res.blob();
      bar.classList.remove("ind"); fill.style.width = "100%";
      const ios = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
      let shared = false;
      if (ios && navigator.canShare && typeof File === "function") {            // iPhone/iPad: the share sheet is where "Save to Files" lives
        const f = new File([blob], name, { type: blob.type });
        if (navigator.canShare({ files: [f] })) { try { await navigator.share({ files: [f], title: name }); shared = true; } catch (e) { if (e && e.name === "AbortError") shared = true; } }
      }
      if (!shared) {
        const url = URL.createObjectURL(blob), a = document.createElement("a");
        a.href = url; a.download = name; a.rel = "noopener"; panel.appendChild(a); a.click(); a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 60000);
      }
      await wait(250);
      fileState(btn, "ok", tx("dlDone") + " · " + fmtSize(blob.size));
      setTimeout(() => { if (btn.classList.contains("ok")) fileState(btn, "idle", idle); }, 3600);
    } catch (e) {
      fileState(btn, "err", fileErrText(e));
      setTimeout(() => { if (btn.classList.contains("err")) fileState(btn, "idle", idle); }, 6000);
    }
  }

  /* ------------------------------------------------------------ sending */
  async function send(text, ctx) {
    text = String(text || "").trim().slice(0, 2000);
    if (!text || busy || demoOn) return;
    gen++;                                    // a pending history/load result must not overwrite the chat now
    histMode = false; memMode = false; setMode();
    lastPending = text;
    const from = input.getBoundingClientRect();            // where the message starts its way up
    input.value = ""; input.style.height = "auto";
    animFrom = msgs.length;
    msgs.push({ role: "user", content: text });
    const ai = { role: "assistant", content: "", pending: true }; msgs.push(ai);
    setBusy(true); renderMsgs(); busy = true; curBub = ms.lastElementChild.querySelector(".aiB");
    const ur = ms.children[msgs.length - 2];
    // the rise starts at the input bar, but never more than 280px below the message (a short chat must not make it fly across the screen)
    if (ur) { ur.style.setProperty("--fy", Math.min(280, Math.max(0, Math.round(from.top - ur.getBoundingClientRect().top))) + "px"); void ur.offsetWidth; ur.classList.add("aiIn"); }
    const wake = setTimeout(() => setStatus(tx("wake")), 6000);
    ctl = new AbortController(); const myCtl = ctl;
    try {
      await ensureSession(false);
      if (!conv) {
        const r = await call("/api/conversations", { method: "POST" });
        if (!r.ok) throw new AiErr(errKind(r));
        conv = (await r.json()).id; LS.set("aiConv", conv);
      }
      let res = await call("/api/chat/stream/v2", { method: "POST", ctl: myCtl, timeout: 95000, body: { conversation_id: conv, question: text, moodle_token: M.token || null, status: true, ctx: ctx || undefined, lang: lang() } });
      if (res.status === 404) {                // the conversation is gone on the server: start a new one and send again
        const r = await call("/api/conversations", { method: "POST" });
        if (!r.ok) throw new AiErr(errKind(r));
        conv = (await r.json()).id; LS.set("aiConv", conv);
        res = await call("/api/chat/stream/v2", { method: "POST", ctl: myCtl, timeout: 95000, body: { conversation_id: conv, question: text, moodle_token: M.token || null, status: true, ctx: ctx || undefined, lang: lang() } });
      }
      if (!res.ok) throw new AiErr(errKind(res));
      clearTimeout(wake); setStatus();
      const withCaret = h => /(<\/(?:p|li)>)((?:<\/(?:ul|ol)>)?)$/.test(h) ? h.replace(/(<\/(?:p|li)>)((?:<\/(?:ul|ol)>)?)$/, '<span class="aiCaret"></span>$1$2') : h + '<span class="aiCaret"></span>';
      let buf = "";                                // the stream carries small events (\u0001{json}\u0002) between the answer's text: steps, memory
      const feed = chunk => {
        buf += chunk;
        for (;;) {
          const i = buf.indexOf("\u0001");
          if (i < 0) { ai.content += buf; buf = ""; break; }
          ai.content += buf.slice(0, i);
          const j = buf.indexOf("\u0002", i);
          if (j < 0) { buf = buf.slice(i); break; }          // an event cut in the middle: wait for the rest
          let ev = null; try { ev = JSON.parse(buf.slice(i + 1, j)); } catch (e) {}
          buf = buf.slice(j + 1);
          onStreamEvent(ai, ev);
        }
      };
      const upd = () => {
        if (!ai.content) return;                   // only events so far: the steps stay
        const first = ai.pending; ai.pending = false; ai.status = ""; ai.stepQ = []; clearTimeout(ai.stepTm); ai.stepTm = 0; clearTimeout(ai.swapT); ai.swapT = 0;
        if (curBub) {
          const h = (withCaret(md(ai.content)) + chipsHTML(ai.mem)) || curBub.innerHTML;
          curBub.classList.add("aiStream");
          if (h !== ai.lastHtml) { ai.lastHtml = h; curBub.innerHTML = h; }                  // not re-drawn when nothing changed
          if (first) { const r = curBub.closest(".aiM"); if (r) r.classList.remove("aiPend"); curBub.classList.remove("aiFill"); void curBub.offsetWidth; curBub.classList.add("aiFill"); }   // the dots turn into the answer
          scrollEnd(false);
        }
      };
      if (!res.body || !res.body.getReader) { feed(await res.text()); upd(); }
      else {
        const rd = res.body.getReader(), dec = new TextDecoder("utf-8"); let raf = 0;
        for (;;) {
          const { done, value } = await rd.read(); if (done) break;
          feed(dec.decode(value, { stream: true }));
          if (!raf) raf = requestAnimationFrame(() => { raf = 0; upd(); });
        }
        feed(dec.decode()); if (raf) cancelAnimationFrame(raf); upd();
      }
      if (!ai.content.trim()) throw new AiErr("gen");
      if (curBub) curBub.classList.remove("aiStream");
    } catch (e) {
      clearTimeout(wake); setStatus("");
      ai.pending = false;
      if (e && e.name === "AbortError") { const ix = msgs.indexOf(ai); if (!ai.content.trim() && ix >= 0) msgs.splice(ix, 1); }   // stopped by the student: keep what arrived
      else {
        const partial = ai.content.trim();
        ai.err = partial ? tx("cut") : errText(e); ai.retry = !partial && !(e && e.kind === "moodle");
        if (!partial) ai.content = "";
      }
    } finally {
      clearTimeout(wake); if (ctl === myCtl) ctl = null;
      setBusy(false); left();
      if (!ai.err && ai.content && ai.content.trim()) ai.justDone = true;
      if (panel && !panel.hidden && !histMode && !memMode && msgs.includes(ai)) renderMsgs();
    }
  }

  function retry() {
    if (busy) return;
    const i = msgs.length - 1;
    if (i >= 1 && msgs[i].role !== "user" && msgs[i].err) { msgs.splice(i - 1, 2); }   // drop the failed pair, then send the same question again
    send(lastPending);
  }

  /* ------------------------------------------------------------ the window */
  /* The keyboard. What the browsers do (researched): iOS Safari and Chrome on Android (since 108) leave the page's own size alone and shrink only the
     "visual viewport" (the part of the screen still visible), and iOS may also pan it; Firefox and some others resize the page itself. So the one
     reliable source is the visual viewport: the window takes its height and follows its offset (and, for a floating window, sits above the covered
     bottom). The page behind is locked so the browser never scrolls it to "reveal" the input, and the message list keeps the same messages next to
     the input while it shrinks, so the bubbles stay right above the keyboard and nothing jumps. */
  let baseH = 0, baseW = 0, lastKey = "", kbWas = false, vvOverride = null, fitRaf = 0, kbIntent = false, locked = false, lockY = 0, restoreY = null, bodyStyle = null;
  const vvp = () => vvOverride || window.visualViewport;
  const scheduleFit = () => { if (!fitRaf) fitRaf = requestAnimationFrame(() => { fitRaf = 0; fit(); }); };
  // browsers report the keyboard in several steps (and iOS late): look again a few times after it moves
  const fitSoon = () => { scheduleFit(); [120, 350, 800].forEach(d => setTimeout(scheduleFit, d)); };

  function keepBottom(fn) {              // run fn (which changes sizes) and keep the same messages next to the input
    const dist = ms.scrollHeight - ms.scrollTop - ms.clientHeight;
    fn();
    ms.scrollTop = Math.max(0, ms.scrollHeight - ms.clientHeight - dist);
  }

  function fit(force) {
    if (!panel || panel.hidden || winMode) return;
    const vv = vvp(), ih = innerHeight;
    const ok = vv && (vv.scale || 1) < 1.05;                   // pinch-zoomed in: that is not the keyboard, ignore it
    const vh = Math.round(ok ? vv.height : ih), off = Math.round(ok ? vv.offsetTop : 0), vw = Math.round(vv ? vv.width : innerWidth);
    const focused = document.activeElement === input;
    if (!baseH || Math.abs(vw - baseW) > 40) { baseH = Math.max(vh, ih); baseW = vw; }          // first time, or the phone was turned
    else if (vh > baseH || (!focused && !kbWas)) baseH = vh;                                      // the tallest the area was without the keyboard
    const inset = Math.max(0, Math.round(ih - (off + vh)));                                        // how much of the bottom is covered
    const kb = focused && (baseH - vh > 120 || inset > 120);
    kbWas = kb;
    const key = vh + "|" + off + "|" + inset + "|" + kb;
    if (key === lastKey && !force) return;
    lastKey = key;
    keepBottom(() => {
      const s = panel.style;
      s.setProperty("--aivh", vh + "px"); s.setProperty("--aivt", off + "px"); s.setProperty("--aikb", inset + "px");
      panel.classList.toggle("aiKb", kb); panel.classList.toggle("aiCompact", vh < 470); panel.classList.toggle("aiTiny", vh < 300);
    });
  }

  const needLock = () => true;               // the chat is a screen of its own on every device, so the page behind is always locked
  function lockPage() {
    if (locked || !needLock()) return;
    locked = true; lockY = window.scrollY || 0;
    const b = document.body; bodyStyle = b.getAttribute("style");
    b.style.position = "fixed"; b.style.top = -lockY + "px"; b.style.left = "0"; b.style.right = "0"; b.style.width = "100%";
    document.documentElement.style.overflow = "hidden";
  }
  function unlockPage() {
    if (!locked) return;
    locked = false; const b = document.body;
    if (bodyStyle === null) b.removeAttribute("style"); else b.setAttribute("style", bodyStyle);
    document.documentElement.style.overflow = "";
    restoreY = lockY; restoreScroll();
  }
  // the browser can put the page back to a scroll position it saved at the wrong moment (during "back"): say it again, after it is done
  function restoreScroll() {
    if (restoreY === null) return;
    const y = restoreY, go = () => { if (!locked) window.scrollTo({ top: y, left: 0, behavior: "instant" }); };
    go(); setTimeout(go, 60); setTimeout(() => { go(); if (!panel || panel.hidden) restoreY = null; }, 350);
  }

  /* ------------------------------------------------------------ the floating window (computer only) */
  const I_WIN = '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="4" width="18" height="16" rx="2.5"/><rect x="12" y="12" width="7" height="5.5" rx="1.2"/></svg>';
  const I_MAX = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14 4h6v6M10 20H4v-6M20 4l-7 7M4 20l7-7"/></svg>';
  let winMode = false, winGeo = null, fabRect = null;
  const winOK = () => matchMedia("(min-width:900px) and (hover:hover) and (pointer:fine)").matches && innerHeight >= 520;
  const winWanted = () => { try { return !!LS.get("aiWin", 0) && winOK() && demoSeen(); } catch (e) { return false; } };
  function winDefault() {
    const w = 400, h = Math.min(700, innerHeight - 56), fr = fabRect;
    const left = fr && fr.width && fr.left + fr.width / 2 < innerWidth / 2;
    return { x: left ? 24 : innerWidth - w - 24, y: innerHeight - h - 24, w, h };
  }
  function applyWinGeo() {
    const g = winGeo || (winGeo = LS.get("aiWinGeo", null) || winDefault());
    g.w = Math.round(Math.max(340, Math.min(g.w || 400, 760, innerWidth - 16)));
    g.h = Math.round(Math.max(420, Math.min(g.h || 640, innerHeight - 16)));
    g.x = Math.round(Math.max(8, Math.min(g.x, innerWidth - g.w - 8)));
    g.y = Math.round(Math.max(8, Math.min(g.y, innerHeight - g.h - 8)));
    const st = panel.style; st.setProperty("--aiwx", g.x + "px"); st.setProperty("--aiwy", g.y + "px"); st.setProperty("--aiww", g.w + "px"); st.setProperty("--aiwh", g.h + "px");
    panel.classList.toggle("aiCompact", g.h < 470); panel.classList.toggle("aiTiny", g.h < 300);
  }
  const saveWin = () => { try { LS.set("aiWinGeo", { x: winGeo.x, y: winGeo.y, w: winGeo.w, h: winGeo.h }); } catch (e) {} };
  function updateWinBtn() {
    const b = panel && panel.querySelector('[data-a="win"]'); if (!b) return;
    b.hidden = !winOK() && !winMode;
    b.innerHTML = winMode ? I_MAX : I_WIN; const l = tx(winMode ? "winMax" : "winMin"); b.setAttribute("aria-label", l); b.title = l;
  }
  function enterWinState() {                  // the window look, without touching history or the page lock
    winMode = true; panel.classList.add("aiWin"); panel.setAttribute("aria-modal", "false"); applyWinGeo();
    document.documentElement.classList.remove("aiOn"); unlockPage(); updateWinBtn();
  }
  function setWin(on, remember) {
    if (!panel || panel.hidden || on === winMode) return;
    if (on && (!winOK() || demoOn || intro)) return;
    if (on) {
      enterWinState();
      if (pushed) { pushed = false; skipPop++; try { history.back(); } catch (e) { skipPop = 0; } }      // the browser's Back must act on the app now, not close the chat
    } else {
      winMode = false; panel.classList.remove("aiWin"); panel.setAttribute("aria-modal", "true"); panel.style.removeProperty("height");
      if (!pushed) { try { history.pushState({ v: typeof V !== "undefined" ? V.view : "", ai: 1 }, ""); pushed = true; } catch (e) {} }
      lockPage(); document.documentElement.classList.add("aiOn"); baseH = 0; lastKey = ""; fit(true); fitSoon();
      panel.classList.remove("aiCompact", "aiTiny");
    }
    if (remember !== false) { try { LS.set("aiWin", on ? 1 : 0); } catch (e) {} }
    updateWinBtn(); if (!on) fit(true);
    try { ms.scrollTop = ms.scrollHeight; } catch (e) {}
  }
  function winPointers() {                    // drag by the header, resize by the corner, double click on the header = full screen
    const hd = panel.querySelector(".aiHd"), rz = panel.querySelector(".aiRz");
    let drag = null, size = null;
    hd.addEventListener("pointerdown", e => {
      if (!winMode || e.button !== 0 || e.target.closest(".aiHb")) return;
      drag = { id: e.pointerId, dx: e.clientX - winGeo.x, dy: e.clientY - winGeo.y }; try { hd.setPointerCapture(e.pointerId); } catch (er) {} e.preventDefault();
    });
    hd.addEventListener("pointermove", e => { if (drag && e.pointerId === drag.id) { winGeo.x = e.clientX - drag.dx; winGeo.y = e.clientY - drag.dy; applyWinGeo(); } });
    const endDrag = e => { if (drag && e.pointerId === drag.id) { drag = null; saveWin(); } };
    hd.addEventListener("pointerup", endDrag); hd.addEventListener("pointercancel", endDrag);
    hd.addEventListener("dblclick", e => { if (winMode && !e.target.closest(".aiHb")) setWin(false); });
    rz.addEventListener("pointerdown", e => {
      if (!winMode || e.button !== 0) return;
      size = { id: e.pointerId, x0: e.clientX, y0: e.clientY, w: winGeo.w, h: winGeo.h }; try { rz.setPointerCapture(e.pointerId); } catch (er) {} e.preventDefault();
    });
    rz.addEventListener("pointermove", e => { if (size && e.pointerId === size.id) { winGeo.w = size.w + (e.clientX - size.x0); winGeo.h = size.h + (e.clientY - size.y0); applyWinGeo(); } });
    const endSize = e => { if (size && e.pointerId === size.id) { size = null; saveWin(); } };
    rz.addEventListener("pointerup", endSize); rz.addEventListener("pointercancel", endSize);
    addEventListener("resize", () => {
      if (!panel || panel.hidden) { return; }
      if (winMode && !winOK()) setWin(false, false); else if (winMode) applyWinGeo();
      updateWinBtn();
    });
  }

  function build() {
    if (panel) return;
    const st = document.createElement("style"); st.textContent = CSS; document.head.appendChild(st);

    fab = document.createElement("button"); fab.id = "aiFab"; fab.type = "button"; fab.hidden = true;
    fab.innerHTML = FACE + '<span class="aiTag">AI</span>';
    // a short press opens the chat, a long press plays the intro again
    let fabHold = 0, fabLong = false;
    const fabCancel = () => { clearTimeout(fabHold); fabHold = 0; };
    fab.addEventListener("pointerdown", () => {
      fabLong = false; fabCancel();
      fabHold = setTimeout(() => { fabHold = 0; fabLong = true; try { navigator.vibrate && navigator.vibrate(15); } catch (e) {} try { runTour(true); } catch (e) {} }, 650);
    });
    ["pointerup", "pointercancel", "pointerleave"].forEach(t => fab.addEventListener(t, fabCancel));
    fab.addEventListener("contextmenu", e => e.preventDefault());
    fab.onclick = () => { if (fabLong) { fabLong = false; return; } open(); };
    document.body.appendChild(fab);

    panel = document.createElement("div"); panel.className = "aiP"; panel.hidden = true; panel.setAttribute("role", "dialog"); panel.setAttribute("aria-modal", "true");
    panel.innerHTML =
      '<div class="aiHd"><button type="button" class="aiHb" data-a="close"></button>' +
      '<div class="aiTt"><div class="aiAv">' + FACE + '<span class="aiTag">AI</span></div><div class="aiTl"><b></b><small></small></div></div>' +
      '<button type="button" class="aiHb" data-a="hist"></button><button type="button" class="aiHb" data-a="mem"></button><button type="button" class="aiHb" data-a="new"></button><button type="button" class="aiHb" data-a="demo"></button><button type="button" class="aiHb" data-a="win" hidden></button><button type="button" class="aiHb" data-a="use" hidden></button></div>' +
      '<div class="aiMs" role="log" aria-live="polite"></div>' +
      '<div class="aiFt"><div class="aiSt" hidden></div><div class="aiIn"><textarea rows="1" maxlength="2000" enterkeyhint="send"></textarea>' +
      '<button type="button" class="aiSd"></button></div><div class="aiNt"></div></div>' +
      '<div class="aiDlg" hidden role="alertdialog" aria-modal="true"><div class="aiDlgBox"><p></p><div class="aiDlgBtns"><button type="button" data-no></button><button type="button" class="danger" data-ok></button></div></div></div>' +
      '<div class="aiRz" aria-hidden="true"></div><div class="aiSplash" hidden aria-hidden="true"><div class="aiGrow">' + FACE + '</div><div class="aiSpl"><div class="aiGlow"></div><div class="aiFaceBig">' + FACE + FACE_DEAD + '</div><div class="aiSplTx"></div></div></div>';
    document.body.appendChild(panel);
    ms = panel.querySelector(".aiMs"); input = panel.querySelector("textarea"); sendBtn = panel.querySelector(".aiSd");
    splash = panel.querySelector(".aiSplash"); statusEl = panel.querySelector(".aiSt"); titleEl = panel.querySelector(".aiTt .aiTl"); histBtn = panel.querySelector('[data-a="hist"]'); memBtn = panel.querySelector('[data-a="mem"]');

    panel.querySelector('[data-a="close"]').onclick = () => close();
    histBtn.onclick = () => (histMode || memMode ? renderMsgs() : openHistory());
    memBtn.onclick = () => (memMode ? renderMsgs() : openMemory());
    panel.querySelector('[data-a="new"]').onclick = () => { startNew(); if (matchMedia("(hover:hover)").matches) input.focus(); };
    panel.querySelector('[data-a="demo"]').onclick = () => demoReplay();
    panel.querySelector('[data-a="win"]').onclick = () => setWin(!winMode);
    panel.querySelector('[data-a="use"]').onclick = () => (memMode ? renderMsgs() : openUsage());
    try { setPersonal(!!LS.get("aiPersonal", 0)); } catch (e) {}
    winPointers();
    // sending must not close the keyboard: remember if it was up, keep the focus where it is, and put it back after the send
    sendBtn.addEventListener("pointerdown", () => { kbIntent = document.activeElement === input; });
    sendBtn.addEventListener("mousedown", e => e.preventDefault());
    sendBtn.onclick = () => { const had = kbIntent; kbIntent = false; if (busy) { ctl && ctl.abort(); } else send(input.value); if (had) try { input.focus({ preventScroll: true }); } catch (e) {} };
    input.oninput = () => {
      keepBottom(() => { input.style.height = "auto"; input.style.height = Math.min(input.scrollHeight, panel.classList.contains("aiCompact") ? 96 : 132) + "px"; });
      if (!busy) sendBtn.disabled = !input.value.trim();
    };
    input.addEventListener("focus", fitSoon); input.addEventListener("blur", fitSoon);
    input.setAttribute("autocomplete", "off"); input.setAttribute("autocapitalize", "sentences");
    // dragging on the header or the input bar must not pan the page behind; the message list and the text box keep their own scrolling
    panel.addEventListener("touchmove", e => { if (!e.target.closest(".aiMs,.aiHs,textarea,pre")) e.preventDefault(); }, { passive: false });
    input.onkeydown = e => { if (e.key === "Enter" && !e.shiftKey && !e.isComposing && matchMedia("(hover:hover)").matches) { e.preventDefault(); if (!busy) send(input.value); } };
    ms.addEventListener("submit", e => {
      const f = e.target.closest && e.target.closest(".aiPt"); if (!f) return;
      e.preventDefault();
      const card = f.closest(".aiPoll"), v = f.querySelector("input").value.trim();
      if (!v || !pollLive(f)) return;
      lockPoll(card, []); send(v);
    });
    ms.addEventListener("click", e => {
      const u = e.target.closest("[data-undo]"); if (u) { undoMem(u.dataset.undo); return; }
      const mc = e.target.closest(".aiMemChip"); if (mc && !mc.classList.contains("undone")) { openMemory(); return; }
      const f = e.target.closest(".aiFile"); if (f) { downloadFile(f); return; }
      const q = e.target.closest("[data-q]"); if (q) send(q.dataset.q);
      const ac = e.target.closest("[data-act]"); if (ac) { uiAction(ac); return; }
      const tbb = e.target.closest("[data-tab]");
      if (tbb) {
        const box = tbb.closest(".aiTb"), i = tbb.dataset.tab;
        box.querySelectorAll("[data-tab]").forEach(x => x.classList.toggle("on", x === tbb));
        box.querySelectorAll("[data-pane]").forEach(x => x.classList.toggle("on", x.dataset.pane === i));
        return;
      }
      const qk = e.target.closest("[data-qk]"); if (qk) { if (pollLive(qk)) { lockPoll(qk.closest(".aiQuick"), [qk]); send(qk.dataset.qk); } return; }
      const pb = e.target.closest("[data-po]");
      if (pb) {
        const card = pb.closest(".aiPoll"); if (!pollLive(pb)) return;
        if (card.dataset.multi === "1") { pb.classList.toggle("on"); const go = card.querySelector("[data-pgo]"); if (go) go.disabled = !card.querySelector(".aiPb.on"); }
        else { lockPoll(card, [pb]); send((PICKED[lang()] || PICKED.he) + pb.dataset.po); }
        return;
      }
      const pg = e.target.closest("[data-pgo]");
      if (pg) {
        const card = pg.closest(".aiPoll"), on = [...card.querySelectorAll(".aiPb.on")]; if (!on.length || !pollLive(pg)) return;
        lockPoll(card, on); send((PICKED[lang()] || PICKED.he) + on.map(x => x.dataset.po).join(", "));
      }
    });
    // long press on a message (touch) or right click / the Menu key (computer) opens the message menu; moving the finger (scrolling) cancels it
    ms.addEventListener("pointerdown", e => {
      closeMenu();
      if (e.pointerType === "mouse" || e.button !== 0 || e.target.closest(".aiFile,a,.aiErr button")) return;
      const itEl = e.target.closest("[data-it]"), b = e.target.closest(".aiB"); if (!b) return;
      holdXY = [e.clientX, e.clientY];
      holdT = setTimeout(() => { holdT = 0; try { navigator.vibrate && navigator.vibrate(12); } catch (er) {} if (itEl && !busy) openItemMenu(itEl, holdXY[0], holdXY[1]); else openMenu(b, holdXY[0], holdXY[1]); }, 450);
    });
    ms.addEventListener("pointermove", e => { if (holdT && Math.hypot(e.clientX - holdXY[0], e.clientY - holdXY[1]) > 10) cancelHold(); });
    ["pointerup", "pointercancel", "pointerleave"].forEach(t => ms.addEventListener(t, cancelHold));
    ms.addEventListener("scroll", () => { cancelHold(); if (menuEl) closeMenu(); }, { passive: true });
    ms.addEventListener("contextmenu", e => {
      const b = e.target.closest(".aiB"); if (!b) return;
      e.preventDefault(); if (menuEl) return;
      const itEl = e.target.closest("[data-it]");
      if (itEl && !busy) openItemMenu(itEl, e.clientX, e.clientY, e.clientX === 0 && e.clientY === 0);
      else openMenu(b, e.clientX, e.clientY, e.clientX === 0 && e.clientY === 0);
    });
    document.addEventListener("pointerdown", e => { if (panel && !e.target.closest(".aiB")) document.querySelectorAll(".aiB.aiSel").forEach(x => x.classList.remove("aiSel")); }, true);
    // on a touch screen the browser must never start its own text selection from a long press (iPhone selected the whole screen): only what the student chose to select, and the text boxes
    panel.addEventListener("selectstart", e => {
      if (!matchMedia("(hover:none)").matches) return;
      const n = e.target.nodeType === 3 ? e.target.parentElement : e.target;
      if (n && n.closest && n.closest(".aiSel,textarea,input")) return;
      e.preventDefault();
    });
    panel.addEventListener("keydown", e => { if (e.key === "Escape") { e.stopPropagation(); close(); } });
    if (window.visualViewport) { visualViewport.addEventListener("resize", scheduleFit); visualViewport.addEventListener("scroll", scheduleFit); }
    addEventListener("resize", scheduleFit); addEventListener("orientationchange", fitSoon);
    document.addEventListener("visibilitychange", () => { if (!document.hidden) fitSoon(); });
    // leaving the page counts as leaving the chat: the one-hour rule runs from the last time the student was in it
    document.addEventListener("visibilitychange", () => { if (document.hidden && panel && !panel.hidden) left(); });
    addEventListener("pagehide", () => { if (panel && !panel.hidden) left(); });
    // the phone's back button closes the chat instead of leaving the app
    addEventListener("popstate", e => {
      if (skipPop > 0) { skipPop--; e.stopImmediatePropagation(); restoreScroll(); return; }
      if (pushed && panel && !panel.hidden) { pushed = false; e.stopImmediatePropagation(); close(true); restoreScroll(); }
    }, true);
    applyTexts();
  }

  function applyTexts() {
    panel.querySelector('[data-a="close"]').innerHTML = I_X; panel.querySelector('[data-a="close"]').setAttribute("aria-label", tx("close")); panel.querySelector('[data-a="close"]').title = tx("close");
    memBtn.innerHTML = I_BRAIN; memBtn.setAttribute("aria-label", tx("memTitle")); memBtn.title = tx("memTitle");
    const nb = panel.querySelector('[data-a="new"]'); nb.innerHTML = I_NEW; nb.setAttribute("aria-label", tx("newc")); nb.title = tx("newc");
    { const ub = panel.querySelector('[data-a="use"]'); ub.innerHTML = I_USE; ub.setAttribute("aria-label", tx("useBtn")); ub.title = tx("useBtn"); }
    const db = panel.querySelector('[data-a="demo"]'); db.innerHTML = I_PLAY; { const lbl = demoData().replay; db.setAttribute("aria-label", lbl); db.title = lbl; }
    input.placeholder = tx("ph"); input.setAttribute("aria-label", tx("ph"));
    panel.querySelector(".aiNt").textContent = tx("note");
    panel.setAttribute("aria-label", tx("title"));
    setMode(); setBusy(busy); try { updateWinBtn(); } catch (e) {}
  }

  /* ------------------------------------------------------------ the opening animation
     0 - 0.5s   the circle of the button grows over the screen, turning black (the app behind is still seen until it is covered)
     0.3s       the face grows into the middle, with a glow; it breathes and blinks
     ~1s        it winks and smiles; after that it waits (with a short line of text if it takes long) until the chat is ready, then fades into the chat
     At least 1.35s in all, so the wink is always seen. With "calm" or reduced motion there is no animation at all. */
  const INTRO_MIN = 1350;
  const introAllowed = () => !document.body.classList.contains("calm") && !matchMedia("(prefers-reduced-motion: reduce)").matches;
  const setSplText = t => { const e = splash && splash.querySelector(".aiSplTx"); if (e) { e.textContent = t || ""; e.classList.toggle("on", !!t); } };
  const setSplErr = (title, why) => { const e = splash && splash.querySelector(".aiSplTx"); if (e) { e.innerHTML = "<b>" + esc2(title) + "</b><span>" + esc2(why) + "</span>"; e.classList.add("on"); } };

  function startIntro(fr) {
    if (!introAllowed() || !splash) return null;
    panel.classList.add("aiIntro");                         // first (it removes the small slide-in offset), then measure
    const P = panel.getBoundingClientRect();
    const cx = fr && fr.width ? fr.left + fr.width / 2 - P.left : P.width - 44, cy = fr && fr.height ? fr.top + fr.height / 2 - P.top : P.height - 110;
    const gr = Math.max(20, fr && fr.width ? fr.width / 2 : 29);
    const R = Math.hypot(Math.max(cx, P.width - cx), Math.max(cy, P.height - cy)) + 8;
    const s = panel.style;
    s.setProperty("--aicx", Math.round(cx) + "px"); s.setProperty("--aicy", Math.round(cy) + "px"); s.setProperty("--aigr", gr + "px"); s.setProperty("--ais", (R / gr).toFixed(2));
    setSplText(""); splash.className = "aiSplash"; splash.hidden = false;
    const it = { t0: performance.now(), timers: [] };
    const at = (ms, fn) => it.timers.push(setTimeout(fn, ms));
    at(480, () => { splash.classList.add("aiCovered"); document.documentElement.classList.add("aiOn"); });     // covered: now the app behind can be turned off
    at(980, () => splash.classList.add("aiWink")); at(980 + 700, () => splash.classList.remove("aiWink"));
    at(2800, () => setSplText(tx("connecting"))); at(7000, () => setSplText(tx("wake")));
    return it;
  }

  function clearIntro() {
    if (intro) { intro.timers.forEach(clearTimeout); intro = null; }
    if (splash) { splash.hidden = true; splash.className = "aiSplash"; }
    if (panel) panel.classList.remove("aiIntro");
  }

  function failIntro(it, e) {                // no internet / a server error: a red dead face, "something is not right", then the screen shrinks away
    return new Promise(res => {
      setTimeout(() => {
        if (intro !== it) return res();       // closed in the meantime
        it.failed = true; it.timers.forEach(clearTimeout);
        document.documentElement.classList.add("aiOn"); splash.classList.add("aiCovered", "aiBad");
        const why = errText(e); setSplErr(tx("errTitle"), why);
        it.timers = [setTimeout(() => { if (intro === it) { close(false, false); setTimeout(() => { if (typeof toast === "function") toast(why, 4200); }, 700); } res(); }, 2600)];
      }, Math.max(0, 1000 - (performance.now() - it.t0)));     // the face is seen first, then it falls ill
    });
  }

  function finishIntro(it) {                  // resolves when the chat is on screen
    return new Promise(res => {
      if (!it) return res();
      setTimeout(() => {
        if (intro !== it) return res();       // closed in the meantime
        it.timers.forEach(clearTimeout); document.documentElement.classList.add("aiOn");
        splash.classList.add("aiOut"); panel.classList.add("on"); panel.classList.remove("aiIntro");
        setTimeout(() => { if (intro === it) { intro = null; splash.hidden = true; splash.className = "aiSplash"; } }, 360);
        res();
      }, Math.max(0, INTRO_MIN - (performance.now() - it.t0)));
    });
  }

  async function open() {
    build(); if (closing) return;
    if (!M.token) { if (typeof toast === "function") toast(tx("errMoodle"), 3500); return; }
    applyTexts();
    const fr = fab.getBoundingClientRect();                     // where the circle is, before it is hidden
    fabRect = fr;
    const winStart = winWanted();                               // a computer, and the student left it as a small window last time: it opens as one (no opening animation)
    panel.hidden = false; fab.hidden = true;
    if (winStart) enterWinState();
    else {
      // the history entry first (the browser saves the page's scroll position for the old entry now), only then lock the page
      if (!pushed) { try { history.pushState({ v: typeof V !== "undefined" ? V.view : "", ai: 1 }, ""); pushed = true; } catch (e) {} }
      lockPage();
    }
    baseH = 0; lastKey = ""; kbWas = false; fit(true); fitSoon(); updateWinBtn(); refreshAiMode();
    intro = winStart ? null : startIntro(fr);
    if (!intro) { if (!winMode) document.documentElement.classList.add("aiOn"); void panel.offsetWidth; panel.classList.add("on"); }   // no animation: just there (not requestAnimationFrame, which is paused in some background states)
    const my = intro;
    let fail = null;
    try { fail = await openLoad(); } catch (e) { fail = e; }
    if (fail && my) { await failIntro(my, fail); return; }
    await finishIntro(my);
    // the first time: Uri offers the guided walk-through, and the chat stays locked until it was watched (leaving = it is offered again next time)
    if (!demoSeen()) {
      if (!introAllowed()) { try { LS.set("aiDemoSeen", "1"); } catch (e) {} }
      else { const watched = await demoGate(); if (!watched) { close(); return; } }
    }
    if (matchMedia("(hover:hover)").matches) input.focus();
  }

  async function openLoad() {                 // what the chat needs before it can be shown; returns what went wrong, or null
    const sid = LS.get("aiConv", null), lf = LS.get("aiLeft", 0);
    const recent = sid && lf && Date.now() - lf <= HOUR;
    if (busy || (recent && conv === sid && msgs.length)) { renderMsgs(); return null; }    // still in memory: no waiting
    ms.innerHTML = '<div class="aiHe">' + esc2(tx("connecting")) + "</div>";
    try { await ensureSession(false); }
    catch (e) { ms.innerHTML = '<div class="aiHe">' + esc2(errText(e)) + "</div>"; return e; }
    if (busy || msgs.length) { renderMsgs(); return null; }       // (typed and sent while it was connecting)
    if (recent) { loadFail = null; await loadConv(sid); if (loadFail) return loadFail; } else startNew();   // an hour or more away: a new conversation
    return null;
  }

  function teardown() {                       // the visual part of closing, all at once
    demoStop(false); clearIntro(); panel.classList.remove("on", "aiIntro", "aiWin", "aiCompact", "aiTiny"); panel.hidden = true; winMode = false; panel.setAttribute("aria-modal", "true");
    document.documentElement.classList.remove("aiOn");        // the app is turned back on
    unlockPage();
    if (fab) { fab.style.visibility = ""; fab.hidden = false; }
  }

  // closing, with the animation: a black circle covers the chat (0.14s), the chat is turned off and the app comes back around it, and the circle shrinks into the button, which pops up
  function shrinkClose(fromBlack) {
    closing = true;
    if (intro) { intro.timers.forEach(clearTimeout); intro = null; }
    fab.style.visibility = "hidden"; fab.hidden = false;      // (to measure where it is)
    const fr = fab.getBoundingClientRect(), P = panel.getBoundingClientRect();
    const cx = fr.width ? fr.left + fr.width / 2 - P.left : P.width - 44, cy = fr.height ? fr.top + fr.height / 2 - P.top : P.height - 110, gr = Math.max(20, fr.width ? fr.width / 2 : 29);
    const R = Math.hypot(Math.max(cx, P.width - cx), Math.max(cy, P.height - cy)) + 8, st = panel.style;
    st.setProperty("--aicx", Math.round(cx) + "px"); st.setProperty("--aicy", Math.round(cy) + "px"); st.setProperty("--aigr", gr + "px"); st.setProperty("--ais", (R / gr).toFixed(2));
    splash.hidden = false; splash.className = "aiSplash aiClosing" + (fromBlack ? " aiFromBlack" : "");
    const cover = fromBlack ? 60 : 140;
    setTimeout(() => { panel.classList.add("aiIntro"); document.documentElement.classList.remove("aiOn"); unlockPage(); }, cover);
    setTimeout(() => {
      panel.classList.remove("on", "aiIntro"); panel.hidden = true; splash.hidden = true; splash.className = "aiSplash";
      fab.style.visibility = ""; fab.classList.remove("aiPop"); void fab.offsetWidth; fab.classList.add("aiPop"); setTimeout(() => fab.classList.remove("aiPop"), 800);
      try { fab.focus({ preventScroll: true }); } catch (e) {}
      closing = false;
    }, cover + 560);
  }

  function close(fromPop, instant) {
    if (!panel || panel.hidden || closing) return;
    left(); demoStop(false);
    try { if (document.activeElement === input) input.blur(); } catch (e) {}
    closeMenu(); const dlg = panel.querySelector(".aiDlg"); if (dlg) dlg.hidden = true;
    const failed = !!(intro && intro.failed), midIntro = !!(intro && !intro.failed);      // closed while the opening animation still plays: no fuss, just close
    const animate = !instant && !midIntro && introAllowed() && !!fab && !!splash && !winMode;
    if (pushed && !fromPop) { pushed = false; skipPop++; try { history.back(); } catch (e) { skipPop = 0; } }
    pushed = false;
    if (animate) { shrinkClose(failed); return; }
    teardown();
    if (fab && !fab.hidden) try { fab.focus({ preventScroll: true }); } catch (e) {}
  }

  // ---------------------------------------------------------------------------------------------
  // Welcome tour: a short animated "film" that introduces the AI helper. Plays on every app start for now
  // (plays only on the very first start; a long press on the AI button plays it again). It can be skipped with the X button.
  // ---------------------------------------------------------------------------------------------
  const TOUR_ONCE = true;
  const TOUR = {
    he: [
      { t: "היי! אני אורי, העוזר החדש שלך", s: "חדש באפליקציה" },
      { t: "שואלים אותי הכול על הלימודים", s: "מטלות, ציונים, מועדים וקורסים", chips: ["מטלות", "ציונים", "מועדים"] },
      { t: "אני מכיר את כל המרכז האקדמי לב", s: "לא רק את Moodle: מעונות, שכר לימוד, שעות ואנשי קשר", chips: ["מעונות", "שכר לימוד", "שעות", "מפת הקמפוס"] },
      { t: "אני גם שולח לך קבצים", s: "תרגילים והרצאות מהקורסים, ישר לצ'אט", icon: "file" },
      { t: "זוכר מה שחשוב לך", s: "והשיחות שלך נשארות רק שלך", icon: "shield" },
      { t: "לפתיחה, לוחצים על העיגול הזה", s: "תמיד כאן בשבילך · לחיצה ארוכה עליי מפעילה את ההסבר שוב", last: true },
    ],
    en: [
      { t: "Hi! I'm Uri, your new assistant", s: "New in the app" },
      { t: "Ask me anything about your studies", s: "Tasks, grades, deadlines and courses", chips: ["Tasks", "Grades", "Deadlines"] },
      { t: "I know the whole Lev Academic Center", s: "Not just Moodle: dorms, tuition, hours and contacts", chips: ["Dorms", "Tuition", "Hours", "Campus map"] },
      { t: "I can send you files too", s: "Exercises and lectures from your courses, right in the chat", icon: "file" },
      { t: "I remember what matters to you", s: "And your chats stay yours alone", icon: "shield" },
      { t: "To open me, tap this circle", s: "Always here for you · press and hold me to watch this again", last: true },
    ],
    fr: [
      { t: "Salut ! Je suis Uri, ton nouvel assistant", s: "Nouveau dans l'appli" },
      { t: "Demande-moi tout sur tes études", s: "Devoirs, notes, échéances et cours", chips: ["Devoirs", "Notes", "Échéances"] },
      { t: "Je connais tout le Centre académique Lev", s: "Pas seulement Moodle : résidences, frais, horaires et contacts", chips: ["Résidences", "Frais", "Horaires", "Plan du campus"] },
      { t: "Je t'envoie aussi des fichiers", s: "Exercices et cours, directement dans le chat", icon: "file" },
      { t: "Je retiens ce qui compte pour toi", s: "Et tes conversations restent privées", icon: "shield" },
      { t: "Pour m'ouvrir, touche ce cercle", s: "Toujours là pour toi · appui long pour revoir cette présentation", last: true },
    ],
  };
  const TOUR_CSS = `
#aiTour{position:fixed;inset:0;z-index:99;display:flex;flex-direction:column;align-items:center;justify-content:center;touch-action:none;user-select:none;overflow:hidden;
  animation:atIn .6s ease-out both}
#aiTour.atOut{animation:atOut .7s ease-in both}
.atBg{position:absolute;inset:0;background:radial-gradient(ellipse at 50% 40%,color-mix(in srgb,var(--accent) 22%,#05060d99) 0%,#05060d8c 75%);-webkit-backdrop-filter:blur(4px) saturate(1.1);backdrop-filter:blur(4px) saturate(1.1)}
.atStar{position:absolute;width:var(--sz);height:var(--sz);border-radius:50%;background:#fff;opacity:0;left:var(--x);top:var(--y);animation:atTw var(--d) var(--dl) ease-in-out infinite}
.atFace{position:absolute;left:50%;top:50%;width:132px;height:132px;margin:-66px 0 0 -66px;z-index:2;
  transform:translate(var(--fx),var(--fy)) scale(var(--fs)) rotate(var(--fr));transition:transform 1s cubic-bezier(.34,1.3,.5,1);
  filter:drop-shadow(0 0 28px color-mix(in srgb,var(--accent) 70%,transparent))}
.atIn{position:absolute;inset:0}
.atIn.w1{animation:atWander 5.2s ease-in-out infinite}
.atIn.w2{animation:atSpin 1.3s cubic-bezier(.3,1.2,.4,1) both,atWander 5.2s 1.3s ease-in-out infinite}
.atIn.w3{animation:atBob .9s ease-in-out infinite}
.atIn.w4{animation:atFlip 1.5s cubic-bezier(.3,1.1,.4,1) both,atWander 4.6s 1.5s ease-in-out infinite}
.atIn.w5{animation:atWander 3.4s ease-in-out infinite}
.atFace svg{width:100%;height:100%;display:block;overflow:visible}
.atOrb{position:absolute;inset:-26px;animation:atOrbit 5s linear infinite}
.atOrb.o2{inset:-40px;animation-duration:7.5s;animation-direction:reverse}
.atOrb i{position:absolute;left:50%;top:0;width:8px;height:8px;margin-left:-4px;border-radius:50%;background:color-mix(in srgb,var(--accent) 50%,#fff);box-shadow:0 0 12px var(--accent)}
.atOrb.o2 i{width:5px;height:5px;background:#fff}
.atSp{position:absolute;z-index:2;width:7px;height:7px;margin:-3px 0 0 -3px;border-radius:50%;background:#fff;box-shadow:0 0 10px var(--accent);pointer-events:none;opacity:0;animation:atSpark 1.15s ease-out forwards}
.atFace.atBreathe svg{animation:aiBreathe 2.6s ease-in-out infinite}
.atRing{position:absolute;inset:-14px;border-radius:50%;border:2px solid color-mix(in srgb,var(--accent) 80%,#fff);opacity:0;animation:atRing 2.4s ease-out infinite}
.atRing.r2{animation-delay:1.2s}
.atTx{position:absolute;left:0;right:0;top:calc(50% + 100px);z-index:3;padding:0 max(24px,calc((100% - 780px) / 2));text-align:center;color:#fff;pointer-events:none}
.atTx b{display:block;text-shadow:0 2px 14px #000c;font-size:clamp(22px,6.4vw,32px);line-height:1.25;font-weight:800;letter-spacing:.2px}
.atTx b span{display:inline-block;opacity:0;animation:atWord .7s var(--wd) cubic-bezier(.2,.9,.3,1) both}
.atTx small{display:block;margin-top:10px;font-size:clamp(14px,4vw,17px);color:#ffffffb8;opacity:0;animation:atSub .7s .55s ease-out both}
.atTx.atGone{animation:atGone .45s ease-in both}
@media (min-width:700px){.atTx b{font-size:clamp(32px,4.4vw,46px)}.atTx small{font-size:20px;margin-top:14px}.atSkip{width:46px;height:46px}}
.atChips{margin-top:16px;display:flex;gap:8px;justify-content:center;flex-wrap:wrap}
.atChips i{font-style:normal;padding:6px 14px;border-radius:99px;background:#ffffff1f;border:1px solid #ffffff3d;color:#fff;font-size:14px;opacity:0;animation:atChip .6s var(--cd) cubic-bezier(.2,.9,.3,1.4) both}
.atIcon{margin:16px auto 0;width:44px;height:44px;color:color-mix(in srgb,var(--accent) 55%,#fff);opacity:0;animation:atChip .7s .45s cubic-bezier(.2,.9,.3,1.4) both}
.atIcon svg{width:100%;height:100%;display:block}
.atSkip{position:absolute;z-index:5;top:calc(14px + env(safe-area-inset-top));inset-inline-end:14px;width:40px;height:40px;padding:0;border-radius:50%;border:1.5px solid #ffffff59;background:#ffffff1f;color:#fff;
  display:grid;place-items:center;cursor:pointer;pointer-events:auto;-webkit-backdrop-filter:blur(6px);backdrop-filter:blur(6px);opacity:0;animation:atChip .6s .8s cubic-bezier(.2,.9,.3,1.3) both;transition:background .2s,transform .15s}
.atSkip:hover{background:#ffffff40}
.atSkip:active{transform:scale(.9)}
.atSkip:focus-visible{outline:3px solid #fff;outline-offset:3px}
.atSkip svg{width:18px;height:18px;display:block}
.atDots{position:absolute;bottom:calc(34px + env(safe-area-inset-bottom));left:0;right:0;display:flex;gap:7px;justify-content:center;z-index:3}
.atDots i{width:7px;height:7px;border-radius:99px;background:#ffffff40;transition:width .4s,background .4s}
.atDots i.on{width:22px;background:#fff}
.atArrow{position:absolute;z-index:3;width:34px;height:34px;color:#fff;animation:atBounce 1s ease-in-out infinite}
.atArrow svg{width:100%;height:100%;display:block}
@keyframes atIn{from{opacity:0}to{opacity:1}}
@keyframes atWander{0%,100%{transform:translate(0,0) rotate(0)}20%{transform:translate(38px,-18px) rotate(7deg)}45%{transform:translate(-30px,-34px) rotate(-8deg)}70%{transform:translate(-42px,16px) rotate(5deg)}85%{transform:translate(22px,22px) rotate(-4deg)}}
@keyframes atSpin{0%{transform:rotate(0) scale(1)}60%{transform:rotate(380deg) scale(1.25)}100%{transform:rotate(360deg) scale(1)}}
@keyframes atBob{0%,100%{transform:translateY(0) scale(1,1)}30%{transform:translateY(-26px) scale(.94,1.08)}55%{transform:translateY(0) scale(1.1,.9)}75%{transform:translateY(-9px) scale(.98,1.03)}}
@keyframes atFlip{0%{transform:perspective(500px) rotateY(0)}100%{transform:perspective(500px) rotateY(360deg)}}
@keyframes atOrbit{to{transform:rotate(360deg)}}
@keyframes atSpark{0%{opacity:1;transform:translate(0,0) scale(1)}100%{opacity:0;transform:translate(var(--dx),var(--dy)) scale(.2)}}
@keyframes atOut{to{opacity:0}}
@keyframes atTw{0%,100%{opacity:0;transform:scale(.6)}50%{opacity:.85;transform:scale(1)}}
@keyframes atRing{0%{opacity:.7;transform:scale(.8)}100%{opacity:0;transform:scale(1.9)}}
@keyframes atWord{from{opacity:0;transform:translateY(18px) scale(.9);filter:blur(8px)}to{opacity:1;transform:none;filter:blur(0)}}
@keyframes atSub{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}
@keyframes atGone{to{opacity:0;transform:translateY(-16px);filter:blur(6px)}}
@keyframes atChip{from{opacity:0;transform:translateY(14px) scale(.7)}to{opacity:1;transform:none}}
@keyframes atBounce{0%,100%{transform:translateY(0)}50%{transform:translateY(7px)}}
`;
  const TOUR_ICONS = {
    file: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5"/><path d="M9 13h6M9 17h4"/></svg>',
    shield: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l7 3v5c0 4.5-3 8-7 10-4-2-7-5.5-7-10V6z"/><path d="M9 12l2 2 4-4"/></svg>',
    arrow: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 4v15M6 13l6 6 6-6"/></svg>',
  };
  const SKIP_LABEL = { he: "דלג על ההסבר", en: "Skip the intro", fr: "Passer l'introduction" };
  let tourState = 0;                                            // 0 = not yet, 1 = running, 2 = done (this page load)
  // is this student new to our server? (the connection tells us) - if so the home-screen tour plays
  async function welcome() {
    try { await ensureSession(false); } catch (e) {}
    try { runTour(); } catch (e) { tourState = 2; const t = document.getElementById("aiTour"); if (t) t.remove(); if (fab) fab.style.visibility = ""; }
  }
  function runTour(force) {
    if (tourState === 1 || !fab || !panel || !panel.hidden) return;
    if (!force) {
      if (tourState) return;
      try { if (!LS.get("aiTourPending", "") || LS.get("aiTourSeen", "")) return; } catch (e) { return; }          // only for a student who is new to our server
    }
    const mustWatch = !force;                       // first time: no skip button; a long press on the chat button plays it again whenever
    if (force) { try { LS.set("aiTourSeen", "1"); } catch (e) {} }
    tourState = 1;
    const scenes = TOUR[lang()] || TOUR.he;
    const st = document.createElement("style"); st.textContent = TOUR_CSS; document.head.appendChild(st);
    fab.style.visibility = "hidden"; fab.hidden = false;
    const fr = fab.getBoundingClientRect();
    const vw = innerWidth, vh = innerHeight;
    const fabX = fr.left + fr.width / 2 - vw / 2, fabY = fr.top + fr.height / 2 - vh / 2;
    const fabS = fr.width / 132;
    const root = document.createElement("div"); root.id = "aiTour"; root.setAttribute("role", "status"); root.setAttribute("aria-live", "polite");
    let stars = "";
    for (let i = 0; i < 26; i++) stars += '<span class="atStar" style="--x:' + (Math.random() * 100).toFixed(1) + '%;--y:' + (Math.random() * 100).toFixed(1) + '%;--sz:' + (1 + Math.random() * 2.4).toFixed(1) + 'px;--d:' + (2.4 + Math.random() * 3).toFixed(1) + 's;--dl:' + (Math.random() * 3).toFixed(1) + 's"></span>';
    root.innerHTML = '<div class="atBg"></div>' + stars + '<div class="atFace" style="--fx:' + fabX + 'px;--fy:' + fabY + 'px;--fs:' + fabS + ';--fr:0deg"><div class="atIn w1">' + FACE + '<i class="atRing"></i><i class="atRing r2"></i><div class="atOrb"><i></i></div><div class="atOrb o2"><i></i></div></div></div><div class="atTx"></div><div class="atDots">' + scenes.map(() => "<i></i>").join("") + '</div>' + (mustWatch ? "" : '<button type="button" class="atSkip" aria-label="' + (SKIP_LABEL[lang()] || SKIP_LABEL.he) + '"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg></button>');
    document.body.appendChild(root);
    const face = root.querySelector(".atFace"), inner = root.querySelector(".atIn"), txEl = root.querySelector(".atTx"), dots = root.querySelectorAll(".atDots i");
    const setFace = (x, y, s, r) => { face.style.setProperty("--fx", x + "px"); face.style.setProperty("--fy", y + "px"); face.style.setProperty("--fs", s); face.style.setProperty("--fr", r + "deg"); };
    // where the face rests in each scene (a little drift and tilt, like it is alive); the last scene flies it onto the real button
    const ds = vw >= 700 ? Math.min(1.5, 1 + (vw - 600) / 1200) : 1;                          // a wide screen: Uri is bigger and roams a central area, near the words
    const hh = vh / 2, ww = Math.min(vw, 620) / 2;
    const lay = [
      { f: [0, -hh * .26, 1, 0], top: "calc(50% + 100px)", dx: 0 },
      { f: [-ww * .42, hh * .5, .8, -10], top: "max(56px, calc(50% - 250px))", dx: 0 },
      { f: [ww * .4, -hh * .5, .84, 9], top: "calc(50% + 24px)", dx: -ww * .12 },
      { f: [-ww * .3, -hh * .08, .9, -6], top: "calc(50% + 70px)", dx: ww * .1 },
    ];
    const burst = () => {
      const r = face.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2;
      for (let k = 0; k < 12; k++) {
        const sp = document.createElement("i"); sp.className = "atSp"; const a = Math.PI * 2 * k / 12 + Math.random() * .4, d = 70 + Math.random() * 70;
        sp.style.left = cx + "px"; sp.style.top = cy + "px"; sp.style.setProperty("--dx", Math.cos(a) * d + "px"); sp.style.setProperty("--dy", Math.sin(a) * d + "px");
        root.appendChild(sp); setTimeout(() => sp.remove(), 1250);
      }
    };
    const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
    let timers = [], finished = false;
    const later = (fn, ms) => { timers.push(setTimeout(fn, ms)); };
    function scene(i) {
      const sc = scenes[i]; if (!sc) return;
      dots.forEach((d, k) => d.classList.toggle("on", k === i));
      const words = sc.t.split(" ").map((w, k) => '<span style="--wd:' + (0.08 + k * 0.11).toFixed(2) + 's">' + esc(w) + "</span>").join(" ");
      let extra = "";
      if (sc.chips) extra += '<div class="atChips">' + sc.chips.map((c, k) => '<i style="--cd:' + (0.5 + k * 0.16).toFixed(2) + 's">' + esc(c) + "</i>").join("") + "</div>";
      if (sc.icon) extra += '<div class="atIcon">' + TOUR_ICONS[sc.icon] + "</div>";
      txEl.classList.remove("atGone"); void txEl.offsetWidth;
      txEl.innerHTML = "<b>" + words + "</b><small>" + esc(sc.s) + "</small>" + extra;
      if (sc.last) {
        face.classList.remove("atBreathe");
        setFace(fabX, fabY, fabS, 0);
        const ar = document.createElement("div"); ar.className = "atArrow";
        ar.style.left = Math.max(8, Math.min(vw - 42, fr.left + fr.width / 2 - 17)) + "px"; ar.style.top = Math.max(8, fr.top - 46) + "px";
        ar.innerHTML = TOUR_ICONS.arrow; root.appendChild(ar);
        txEl.style.top = "calc(50% - 70px)"; txEl.style.left = "0px"; txEl.style.right = "0px";
        inner.className = "atIn w5";
      } else {
        const L = lay[Math.min(i, lay.length - 1)]; setFace(L.f[0], L.f[1], L.f[2] * ds, L.f[3]);
        txEl.style.top = L.top; txEl.style.left = L.dx + "px"; txEl.style.right = -L.dx + "px";
        face.classList.add("atBreathe");
        inner.className = "atIn w" + (i + 1);
        setTimeout(burst, 650);
      }
    }
    function finish() {
      if (finished) return; finished = true;
      if (mustWatch) { try { LS.set("aiTourSeen", "1"); LS.del("aiTourPending"); } catch (e) {} }
      timers.forEach(clearTimeout);
      root.classList.add("atOut");
      setTimeout(() => {
        root.remove(); st.remove();
        fab.style.visibility = ""; fab.classList.remove("aiPop"); void fab.offsetWidth; fab.classList.add("aiPop"); setTimeout(() => fab.classList.remove("aiPop"), 800);
        tourState = 2;
      }, 720);
    }
    const skipBtn = root.querySelector(".atSkip"); if (skipBtn) skipBtn.addEventListener("click", e => { e.stopPropagation(); finish(); });
    // timeline: the face grows out of the circle into the middle of the screen, then the scenes follow one another
    later(() => { setFace(0, -vh / 2 * .26, ds, 0); face.classList.add("atBreathe"); }, 350);
    later(burst, 1000);
    const START = 1300, STEP = 2800;
    scenes.forEach((sc, i) => {
      later(() => scene(i), START + i * STEP);
      if (i < scenes.length - 1) later(() => txEl.classList.add("atGone"), START + (i + 1) * STEP - 420);
    });
    later(finish, START + scenes.length * STEP);             // the last part gets exactly the same time as every other part
    later(finish, 30000);                                      // safety net: whatever happens, the screen is never locked for good
  }

  // =============================================================================================
  // Uri's guided demo: the first time the chat is opened (after the wink) the screen stays black, Uri stays on it, and two buttons open: the walk-through is required before chatting.
  // It plays INSIDE the real chat: a question is typed into the real input box, the real send button is pressed, the real bubbles and cards appear.
  // Nothing is sent to the server - the answers are prepared and simply come up with the same animations. Uri (the mascot) walks around the screen and explains every feature.
  // Every part of the walk-through lasts exactly the same time (DEMO_PART). A button in the chat header plays it again.
  // =============================================================================================
  let demoOn = false, demoTok = 0;
  const DEMO_PART = 8000;
  const demoSeen = () => { try { return !!LS.get("aiDemoSeen", ""); } catch (e) { return true; } };
  const demoUi = bl => { const bytes = new TextEncoder().encode(JSON.stringify({ b: bl })); let bin = ""; bytes.forEach(c => { bin += String.fromCharCode(c); }); return "[[ui:" + btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "") + "]]"; };
  const demoData = () => {
    const now = Math.floor(Date.now() / 1000), H = 3600;
    const he = {
      gateT: "אורי מתחיל הסבר קצר", gateS: "כדי להתחיל לשוחח איתי צריך לצפות בהסבר קצר, זה לוקח כדקה.",
      now: "מתחילים את ההסבר", later: "בפעם אחרת", go: "יאללה, מתחילים", exit: "יציאה", replay: "הסבר מאורי (סרטון)",
      hi: "היי, אני אורי! בדקה אראה לך איך הכול עובד. זו הדגמה, אף שאלה לא נשלחת באמת.",
      s1: "כותבים לי שאלה, בדיוק כמו לחבר", s1b: "ושולחים. אני עונה תוך רגע, עם כפתורים ללחיצה",
      s2: "אני מכיר את כל המידע על המרכז האקדמי לב, לא רק את Moodle", s2b: "מעונות, שכר לימוד, שעות, אנשי קשר, לוח שנה ומפות. הכול מהאתר הרשמי",
      s3: "וגם את האישי שלך מ-Moodle: מטלות, ציונים וקבצים", s3b: "איחורים באדום, וספירה לאחור לכל מועד (זו דוגמה)",
      s4: "צריך לדבר עם מישהו? אני נותן את הפרטים", s4b: "חיוג, מייל, וואטסאפ או העתקה, בלחיצה אחת",
      s5: "ועוד טריק: לחיצה ארוכה", s5b: "על מטלה, קורס או הודעה, ואני פותח תפריט: לשאול עליה, לקבל קבצים או להעתיק",
      heart: "ואם משהו לא ברור, תגידו לי. אני לומד מכם ומשתפר כל הזמן, כי אכפת לי שיהיה לכם קל.",
      bye: "זהו! אני אורי, ואני כאן בשבילך. שאלו אותי כל דבר.",
      q1: "איך מגיעים לקמפוס לב?", q2: "כמה עולה חדר במעונות?", q3: "מה המטלות שלי השבוע?", q4: "איך מדברים עם מזכירות תלמידים?",
      a1: [{ k: "location", s: "card", ti: "קמפוס לב", su: "גבעת מרדכי, ירושלים", tx: "קמפוס לב, גבעת מרדכי, ירושלים", co: "green" },
        { k: "tags", s: "chips", ti: "קווי אוטובוס", co: "blue", ic: "bus", it: [{ l: "5" }, { l: "6" }, { l: "9" }, { l: "39" }] },
        { k: "banner", s: "bar", tone: "tip", co: "purple", tx: "סטודנטים נכנסים בשער הדרומי, מכיוון בית וגן" }],
      a2: [{ k: "price", s: "tags", ti: "מעונות רווקים בלב, לשנה", co: "orange", ic: "money", it: [{ l: "החל מ", v: "8,100 ש\"ח" }, { l: "עד", v: "14,300 ש\"ח" }] },
        { k: "tags", s: "chips", ti: "ועוד על המרכז", co: "teal", it: [{ l: "שכר לימוד", ic: "book" }, { l: "שעות", ic: "clock" }, { l: "אנשי קשר", ic: "user" }, { l: "לוח שנה", ic: "calendar" }, { l: "מפות", ic: "pin" }] }],
      a3: [{ k: "deadlines", s: "tickets", ti: "", it: [{ n: "תרגיל בית 4", c: "מתמטיקה בדידה", t: now - 2 * H }, { n: "דוח מעבדה", c: "פיזיקה", t: now + 5 * H }, { n: "הגשת פרויקט", c: "מבוא למדעי המחשב", t: now + 3 * 86400 }] }],
      a4: [{ k: "contact", s: "card", ti: "מזכירות תלמידים", su: "קמפוס לב", co: "blue", ic: "user", it: [{ t: "phone", v: "02-675-1009", l: "" }, { t: "email", v: "maztal@jct.ac.il", l: "" }] },
        { k: "hours", s: "compact", ti: "שעות קבלה", co: "blue", it: [{ d: "א', ג'", h: "13:00-16:30", l: "" }, { d: "ב', ד', ה'", h: "13:00-15:00", l: "" }] }],
    };
    const en = {
      gateT: "Uri is starting a short walk-through", gateS: "To start chatting with me you need to watch a short walk-through first, it takes about a minute.",
      now: "Start the walk-through", later: "Another time", go: "Let's start", exit: "Exit", replay: "Watch Uri's walk-through",
      hi: "Hi, I'm Uri! In a minute I'll show you how everything works. This is a demo, no question is really sent.",
      s1: "You write me a question, just like to a friend", s1b: "and send it. I answer in a moment, with buttons you can tap",
      s2: "I know all the information about the Lev Academic Center, not only Moodle", s2b: "Dorms, tuition, hours, contacts, calendar and maps. All from the official site",
      s3: "And your personal data from Moodle too: tasks, grades and files", s3b: "Late items in red, and a countdown for every deadline (this is an example)",
      s4: "Need to talk to someone? I give you the details", s4b: "Call, email, WhatsApp or copy, with one tap",
      s5: "One more trick: a long press", s5b: "on a task, a course or a message, and I open a menu: ask about it, get its files or copy",
      heart: "And if something is unclear, tell me. I learn from you and keep getting better, because I care that it is easy for you.",
      bye: "That's it! I'm Uri and I'm here for you. Ask me anything.",
      q1: "How do I get to the Lev campus?", q2: "How much is a dorm room?", q3: "What are my tasks this week?", q4: "How do I contact the students' secretariat?",
      a1: [{ k: "location", s: "card", ti: "Lev campus", su: "Givat Mordechai, Jerusalem", tx: "Lev campus, Givat Mordechai, Jerusalem", co: "green" },
        { k: "tags", s: "chips", ti: "Bus lines", co: "blue", ic: "bus", it: [{ l: "5" }, { l: "6" }, { l: "9" }, { l: "39" }] },
        { k: "banner", s: "bar", tone: "tip", co: "purple", tx: "Students enter through the south gate, from the Beit Vegan side" }],
      a2: [{ k: "price", s: "tags", ti: "Single dorms at Lev, per year", co: "orange", ic: "money", it: [{ l: "From", v: "8,100 NIS" }, { l: "Up to", v: "14,300 NIS" }] },
        { k: "tags", s: "chips", ti: "And more about the college", co: "teal", it: [{ l: "Tuition", ic: "book" }, { l: "Hours", ic: "clock" }, { l: "Contacts", ic: "user" }, { l: "Calendar", ic: "calendar" }, { l: "Maps", ic: "pin" }] }],
      a3: [{ k: "deadlines", s: "tickets", ti: "", it: [{ n: "Homework 4", c: "Discrete Math", t: now - 2 * H }, { n: "Lab report", c: "Physics", t: now + 5 * H }, { n: "Project submission", c: "Intro to CS", t: now + 3 * 86400 }] }],
      a4: [{ k: "contact", s: "card", ti: "Students' secretariat", su: "Lev campus", co: "blue", ic: "user", it: [{ t: "phone", v: "02-675-1009", l: "" }, { t: "email", v: "maztal@jct.ac.il", l: "" }] },
        { k: "hours", s: "compact", ti: "Reception hours", co: "blue", it: [{ d: "Sun, Tue", h: "13:00-16:30", l: "" }, { d: "Mon, Wed, Thu", h: "13:00-15:00", l: "" }] }],
    };
    return lang() === "he" ? he : en;
  };

  function demoStop(restore) {
    if (!panel) return;
    const was = demoOn; demoOn = false; demoTok++;
    panel.querySelectorAll(".aiDemo,.aiDmTap,.aiDmP").forEach(x => x.remove());
    if (!was) return;
    try { closeMenu(); } catch (e) {}
    if (input) { input.readOnly = false; input.value = ""; const w = input.closest(".aiIn"); if (w) w.classList.remove("aiDmFocus"); }
    if (sendBtn) sendBtn.classList.remove("aiDmPress");
    if (ms) { ms.style.paddingBottom = ""; }
    if (restore) { try { renderMsgs(); } catch (e) {} }
  }

  // builds the black stage with Uri on it; used both for the first-time gate and for the replay
  function demoStage(L, withGate) {
    const ov = document.createElement("div"); ov.className = "aiDemo hero" + (withGate ? " gate must" : "");
    ov.innerHTML = '<div class="aiDmGlow"></div><button type="button" class="aiDmX" aria-label="' + esc2(L.exit) + '"><svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg></button><div class="aiDmM"><div class="aiDmMi">' + FACE + '</div></div><div class="aiDmS"><span class="aiDmSa">' + FACE + '</span><span class="aiDmSt"></span><span class="aiDmSn"></span><i class="aiDmPb"></i></div>' +
      (withGate ? '<div class="aiDmBtns"><button type="button" class="aiDmNow">' + esc2(L.now) + "</button></div>" : "");
    panel.appendChild(ov);
    try { const hd = panel.querySelector(".aiHd"); if (hd) { const cs = getComputedStyle(hd); const hh = Math.round(hd.getBoundingClientRect().bottom - panel.getBoundingClientRect().top); if (hh > 24) ov.style.setProperty("--caph", hh + "px"); ov.style.setProperty("--capbg", cs.backgroundImage && cs.backgroundImage !== "none" ? cs.backgroundImage : cs.backgroundColor); } } catch (e) {}
    return ov;
  }

  // resolves true when the student finished the demo, false when he left (the chat then closes and the demo is offered again next time)
  function demoGate() {
    return new Promise(res => {
      const L = demoData();
      demoOn = true; const tok = ++demoTok;
      const ov = demoStage(L, true), api = demoApi(ov, L, tok);
      api.place(50, 34, 124, true);
      api.say('<b>' + esc2(L.gateT) + "</b><br>" + esc2(L.gateS), true);
      api.act("wave");
      ov.querySelector(".aiDmNow").onclick = async () => {
        ov.classList.remove("gate"); const b = ov.querySelector(".aiDmBtns"); if (b) { b.classList.add("out"); setTimeout(() => b.remove(), 350); }
        const ok = await demoRun(L, tok, ov, api, () => res(false));
        if (ok) { try { LS.set("aiDemoSeen", "1"); } catch (e) {} demoStop(true); res(true); }
      };
    });
  }

  // replay from the button in the header (does not change the "seen" flag; leaving just returns to the chat)
  async function demoReplay() {
    if (!panel || demoOn || busy || closing) return;
    if (winMode) setWin(false, false);                          // the walk-through is a full-screen thing
    const L = demoData();
    demoOn = true; const tok = ++demoTok;
    const ov = demoStage(L, false), api = demoApi(ov, L, tok);
    api.place(50, 34, 124, true);
    const ok = await demoRun(L, tok, ov, api, () => { try { renderMsgs(); } catch (e) {} });      // leaving early also brings the real chat back
    if (ok) demoStop(true);
  }

  // Uri's body language: where it stands, what it says, how it moves, and emotional bursts
  function demoApi(ov, L, tok) {
    const M = ov.querySelector(".aiDmM"), Mi = ov.querySelector(".aiDmMi"), S = ov.querySelector(".aiDmS"), St = S.querySelector(".aiDmSt"), Sn = S.querySelector(".aiDmSn"), Pb = S.querySelector(".aiDmPb");
    Mi.addEventListener("animationend", () => { if (Mi.className !== "aiDmMi") Mi.className = "aiDmMi"; });
    const api = {
      dw: t => new Promise((ok, no) => setTimeout(() => (demoOn && demoTok === tok) ? ok() : no(new Error("demo-stop")), t)),
      // x, y are percentages of the screen (physical left/top), size in px; the speech bubble goes below Uri when Uri is in the upper half, above it otherwise
      place(x, y, size, hero) {
        ov.classList.toggle("hero", !!hero);
        const pw = panel.clientWidth || innerWidth, wide = pw >= 700, k = wide ? Math.min(1, 900 / pw) : 1, ds = wide ? Math.min(1.55, 1 + (pw - 600) / 1200) : 1;          // a wide screen: Uri stays near the conversation column and is bigger
        M.style.setProperty("--mx", 50 + (x - 50) * k); M.style.setProperty("--my", y); M.style.setProperty("--ms", Math.round(size * ds) + "px");
        S.style.top = hero ? "calc(" + y + "% + " + (size / 2 + 20) + "px)" : "";
      },
      say(t, html) {
        St.innerHTML = html ? "<span>" + t + "</span>" : "<span>" + String(t).split(" ").map((w, k) => '<i style="--wd:' + (k * 0.05).toFixed(2) + 's">' + esc2(w) + "</i>").join(" ") + "</span>";
        S.classList.remove("on"); void S.offsetWidth; S.classList.add("on");
      },
      act(n) { Mi.className = "aiDmMi"; void Mi.offsetWidth; Mi.className = "aiDmMi " + n; },
      step(n, total) { Sn.textContent = n + "/" + total; Pb.classList.remove("run"); void Pb.offsetWidth; Pb.style.setProperty("--pd", (DEMO_PART / 1000) + "s"); Pb.classList.add("run"); },
      burst(kind) {
        const r = M.getBoundingClientRect(), P = panel.getBoundingClientRect(), cx = r.left + r.width / 2 - P.left, cy = r.top + r.height / 2 - P.top;
        const cols = ["#ff6b8b", "#ffd24a", "#7ad7ff", "#9b8cff", "#5ee0a0", "#ff9f43"];
        for (let k = 0; k < 18; k++) {
          const e = document.createElement("i"); e.className = "aiDmP"; const a = Math.random() * Math.PI * 2, d = 70 + Math.random() * 110;
          e.style.left = cx + "px"; e.style.top = cy + "px"; e.style.setProperty("--dx", Math.cos(a) * d + "px"); e.style.setProperty("--dy", (Math.sin(a) * d - 50) + "px"); e.style.setProperty("--dl", (k * 25) + "ms");
          if (kind === "hearts" || (kind === "mix" && k % 2 === 0)) { e.innerHTML = uiIc("heart"); e.style.color = "#ff6b8b"; }
          else if (kind === "stars") { e.innerHTML = uiIc("star"); e.style.color = "#ffd24a"; }
          else { e.classList.add("dot"); e.style.background = cols[k % cols.length]; }
          panel.appendChild(e); setTimeout(() => e.remove(), 1900);
        }
      },
    };
    return api;
  }

  async function demoRun(L, tok, ov, api, onExit) {
    const { dw, place, say, act, burst, step } = api;
    ov.querySelector(".aiDmX").onclick = () => { demoStop(false); onExit(); };
    const type = async text => {
      const wrap = input.closest(".aiIn"); input.readOnly = true; if (wrap) wrap.classList.add("aiDmFocus");
      for (let i = 1; i <= text.length; i++) { input.value = text.slice(0, i); input.dispatchEvent(new Event("input")); await dw(40); }
      await dw(380); sendBtn.classList.add("aiDmPress"); await dw(240); sendBtn.classList.remove("aiDmPress");
      if (wrap) wrap.classList.remove("aiDmFocus"); input.value = ""; input.dispatchEvent(new Event("input"));
      const u = bubble("user", text); u.row.classList.add("aiIn"); ms.appendChild(u.row); scrollEnd(true);
    };
    const answer = async blocks => {
      const a = bubble("assistant", "", { pending: true }); a.row.classList.add("aiIn", "aiPend"); ms.appendChild(a.row); scrollEnd(true);
      await dw(550);
      a.row.classList.remove("aiPend"); a.b.innerHTML = md(demoUi(blocks)); a.b.classList.remove("aiFill"); void a.b.offsetWidth; a.b.classList.add("aiFill");
      try { ms.scrollTo({ top: Math.max(0, a.row.offsetTop - 10), behavior: "smooth" }); } catch (e) { ms.scrollTop = a.row.offsetTop; }
      return a;
    };
    // every part lasts exactly DEMO_PART: the scene runs, then waits for whatever time is left
    let partNo = 0;
    const part = async fn => { const t0 = Date.now(); step(++partNo, 8); await fn(); await dw(Math.max(0, DEMO_PART - (Date.now() - t0))); };
    try {
      ms.innerHTML = ""; ms.style.paddingBottom = "190px";
      // part 1: hello (big, in the middle, on the black stage)
      await part(async () => { act("wave"); burst("stars"); say(L.hi); await dw(1200); });
      ov.classList.remove("hero"); ov.querySelector(".aiDmS").style.top = "";
      // part 2: write and send; Uri stands by the input and then runs up to the answer
      await part(async () => {
        place(18, 72, 70); act("jump"); say(L.s1); await dw(1700);
        await type(L.q1); act("jump"); const a = await answer(L.a1); place(82, 20, 66); say(L.s1b); act("wig");
      });
      // part 3: everything about the college
      await part(async () => {
        place(20, 26, 70); act("flip"); say(L.s2); await dw(1900);
        await type(L.q2); place(82, 76, 66); await answer(L.a2); say(L.s2b); act("jump");
      });
      // part 4: the personal Moodle data
      await part(async () => {
        place(82, 76, 70); act("jump"); say(L.s3); await dw(1900);
        await type(L.q3); place(18, 24, 66); await answer(L.a3); say(L.s3b); act("wig");
      });
      // part 5: contacts with one-tap actions
      await part(async () => {
        place(16, 74, 70); act("shake"); say(L.s4); await dw(1500);
        await type(L.q4); const c4 = await answer(L.a4); place(84, 26, 66); say(L.s4b); act("jump"); await dw(1300);
        const btn = c4.b.querySelector(".aiAc");
        if (btn) { const r = btn.getBoundingClientRect(), P = panel.getBoundingClientRect(); const t = document.createElement("i"); t.className = "aiDmTap"; t.style.left = (r.left + r.width / 2 - P.left) + "px"; t.style.top = (r.top + r.height / 2 - P.top) + "px"; panel.appendChild(t); setTimeout(() => t.remove(), 1200); }
      });
      // part 6: long press on a task
      await part(async () => {
        const card = ms.querySelector(".aiTk");
        place(84, 80, 70); act("spin"); say(L.s5);
        if (card) {
          card.scrollIntoView({ block: "center", behavior: "smooth" }); await dw(1700);
          const r = card.getBoundingClientRect(), P = panel.getBoundingClientRect(), x = r.left + r.width * 0.3, y = r.top + r.height / 2;
          const t = document.createElement("i"); t.className = "aiDmTap hold"; t.style.left = (x - P.left) + "px"; t.style.top = (y - P.top) + "px"; panel.appendChild(t);
          await dw(900); t.remove(); openItemMenu(card, x, y); say(L.s5b); act("wig"); await dw(3600); closeMenu();
        }
      });
      // part 7: the emotional one - Uri comes close, the screen dims, hearts float up
      await part(async () => { ms.style.paddingBottom = ""; ov.classList.add("dim"); place(50, 46, 112); act("jump"); say(L.heart); await dw(900); burst("hearts"); await dw(2200); burst("hearts"); });
      // part 8: goodbye
      await part(async () => { ov.classList.remove("dim"); place(50, 34, 124, true); act("spin"); say(L.bye); await dw(1000); burst("mix"); });
      const go = document.createElement("button"); go.type = "button"; go.className = "aiDmGo"; go.textContent = L.go; ov.appendChild(go);
      await new Promise((ok, no) => { go.onclick = ok; const iv = setInterval(() => { if (!(demoOn && demoTok === tok)) { clearInterval(iv); no(new Error("demo-stop")); } }, 300); });
      return true;
    } catch (e) {
      if (!e || e.message !== "demo-stop") console.error(e);
      return false;
    }
  }

  window.AIChat = {
    show() { build(); warmUp(); const l = tx("title"); fab.setAttribute("aria-label", l); fab.title = l; if (panel.hidden) fab.hidden = false; welcome(); },
    hide() { if (fab) fab.hidden = true; if (panel && !panel.hidden) close(false, true); },
    open,
    // for tests only: pretend the visible area is something else (a keyboard of a given size), then re-measure
    _vv(v) { vvOverride = v || null; baseH = 0; lastKey = ""; kbWas = false; fit(true); },
    _fit() { fit(true); },
    _md(src) { return md(src); },
    _demo() { return demoGate(); },                      // for tests only: render a message text the way the chat does
  };
})();
