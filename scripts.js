const USERS = [
    { user: 'Operaciones',   pass: 'AdminAlvaco2026', accesoTotal: true },
    { user: 'Baja California',   pass: 'BCAdmin2026' },
    { user: 'Bajio',   pass: 'BjAdmin2026' },
    { user: 'Centro America',   pass: 'CAdmin2026' },
    { user: 'Centro Este',   pass: 'CEAdmin2026' },
    { user: 'Cuenca',   pass: 'CuencaAdmin2026' },
    { user: 'Distrito Federal',   pass: 'DFAdmin2026' },
    { user: 'Noreste',   pass: 'NEAdmin2026' },
    { user: 'Norte',   pass: 'NorteAdmin2026' },
    { user: 'Occidente',   pass: 'OcAdmin2026' }, 
    { user: 'Pacifico',   pass: 'PacAdmin2026' },
    { user: 'Soconusco',   pass: 'SocAdmin2026' },
    { user: 'Sur',   pass: 'SurAdmin2026' },
    { user: 'Sureste',   pass: 'SEAdmin2026' },
    { user: 'Gerencia Norte',   pass: 'GNAdmin2026' },
    { user: 'Gerencia Occidente',   pass: 'GOAdmin2026' },
    { user: 'Gerencia Centro',   pass: 'GCAdmin2026' },
    { user: 'Gerencia Sureste',   pass: 'SEAdmin2026' },
    // ↑ agrega el resto de tus 15 regiones siguiendo el mismo formato
];

const SESSION_KEY = 'muñelocos_session';

/* -------------------------------------------------------------------------
   PERMISOS POR USUARIO
   -------------------------------------------------------------------------
   - Los usuarios con `accesoTotal: true` (Operaciones) ven todo.
   - Los demás usuarios solo ven lo que está en estas dos listas:

   SECCIONES_PERMITIDAS: secciones completas (el id del div .tab-content).
       Todo botón que se agregue dentro de ellas se verá automáticamente.

   BOTONES_PERMITIDOS: botones sueltos, identificados por su data-title
       (tal como está escrito en el index.html).

   Las secciones del menú lateral que se queden sin ningún botón visible
   se ocultan solas.
------------------------------------------------------------------------- */
const SECCIONES_PERMITIDAS = [
    'tab15', // PayOut (todo)
    'tab9',  // Mapa de Regiones
    'tab13', // Faltantes (Excel y Power BI)
    'tab16', // Archivos de actualización y monitoreo diario (todos lo ven)
];

// Para que el recordatorio diario salga una sola vez por sesión
const DAILY_REMINDER_KEY = 'muñelocos_daily_reminder';

const BOTONES_PERMITIDOS = [
    // Estructura Operativa
    'Mapa de Regiones',
    'Rutas',
    'Diagramas de Procesos',          // botón "Proceso de visitas"
    'Proceso de visitas PPT',
    'Proceso de visitas Word',
    'Proceso de visitas Lucidchart',

    // Ventas y Objetivos
    'Ventas Diarias',
    'Objetivos por región',
    'Medias por marca',
    'Medias por región',
    'Ranking de ventas por ciudad',
    'Rentabilidad',

    // Indicadores
    'Visitas diarias',
    'Asistencia en rutas',
    'Cobertura',
    'Consumo Peluche',
    'Abasto Peluche',
    'Reportes sin abasto',

    // Controles Operativos
    'Faltantes',
    'Instalaciones electricas faltantes',
    'Instalaciones electricas',
];

/* -------------------------------------------------------------------------
   DOMINIOS QUE NUNCA SE PUEDEN MOSTRAR DENTRO DE UN IFRAME
   -------------------------------------------------------------------------
   Power BI, SharePoint/OneDrive y Lucidchart exigen iniciar sesión, y por
   seguridad esas páginas de inicio de sesión de Microsoft (y de Lucid)
   bloquean que se muestren dentro de un iframe ajeno — es una protección
   anti-clickjacking del lado de ellos, no algo que se pueda evitar desde
   aquí. Para esos casos, en vez de mostrar un panel en blanco, se abre
   directamente una pestaña nueva.
------------------------------------------------------------------------- */
const NO_EMBED_HOSTS = [
    'powerbi.com',
    'sharepoint.com',
    'live.com',
    'office.com',
    'lucid.app',
    'lucidchart.com',
];

function shouldEmbed(url) {
    try {
        const u = new URL(url);
        const host = u.hostname.toLowerCase();
        if (host === 'app.powerbi.com' && (u.pathname.startsWith('/view') || u.pathname.startsWith('/reportEmbed'))) {
            return true;
        }
        if (host.endsWith('sharepoint.com') && u.searchParams.get('action') === 'embedview') {
            return true;
        }
        if (host === 'onedrive.live.com' && u.pathname.startsWith('/embed')) {
            return true;
        }

        return !NO_EMBED_HOSTS.some(blocked => host === blocked || host.endsWith('.' + blocked));
    } catch {
        return false;
    }
}

document.addEventListener('DOMContentLoaded', () => {

    /* ============================ LOGIN ============================ */
    const loginScreen = document.getElementById('loginScreen');
    const appShell     = document.getElementById('appShell');
    const loginForm    = document.getElementById('loginForm');
    const loginUserSel = document.getElementById('loginUser');
    const loginPassInp = document.getElementById('loginPass');
    const loginError   = document.getElementById('loginError');
    const togglePass   = document.getElementById('togglePass');
    const sidebarUserName = document.getElementById('sidebarUserName');
    const logoutBtn    = document.getElementById('logoutBtn');

    // Poblar el <select> con los usuarios definidos arriba
    USERS.forEach(u => {
        const opt = document.createElement('option');
        opt.value = u.user;
        opt.textContent = u.user;
        loginUserSel.appendChild(opt);
    });

    function aplicarPermisos(userName) {
        const userData = USERS.find(u => u.user === userName);
        if (userData && userData.accesoTotal) return; // Operaciones ve todo

        const permitido = (el) => {
            const seccion = el.closest('.tab-content');
            if (seccion && SECCIONES_PERMITIDAS.includes(seccion.id)) return true;
            return BOTONES_PERMITIDOS.includes(el.dataset.title);
        };

        // 1) Botones dentro de las secciones
        document.querySelectorAll('.tab-content .btn-big').forEach(btn => {
            if (!permitido(btn)) btn.classList.add('no-access');
        });

        // 2) Secciones a las que se entra desde un botón (Regiones, Procesos, Faltantes...)
        document.querySelectorAll('.tab-content').forEach(sec => {
            if (sec.id === 'tab00' || sec.id === 'tabEmbed') return;
            if (SECCIONES_PERMITIDAS.includes(sec.id)) return;
            const enSidebar = document.querySelector(`.tab-link[data-tab="${sec.id}"]`);
            const visible = enSidebar
                // sección del menú lateral: se ve si le queda algún botón
                ? sec.querySelector('.btn-big:not(.no-access)')
                // sub-sección: se ve si hay un botón permitido que lleve a ella
                : document.querySelector(`[data-action="tab"][data-tab="${sec.id}"]:not(.no-access)`);
            if (!visible) sec.classList.add('no-access');
        });

        // 3) Menú lateral: ocultar secciones vacías y links directos no permitidos
        document.querySelectorAll('.tab-link').forEach(link => {
            if (link.dataset.tab === 'tab00') return; // "Menu" siempre visible
            if (link.dataset.url) {
                if (!BOTONES_PERMITIDOS.includes(link.dataset.title)) link.classList.add('no-access');
                return;
            }
            const sec = document.getElementById(link.dataset.tab);
            if (!sec || sec.classList.contains('no-access')) link.classList.add('no-access');
        });
    }

    let currentUser = null;

    function enterApp(userName) {
        currentUser = userName;
        aplicarPermisos(userName);
        actualizarProgresoDiario();
        sidebarUserName.textContent = userName;
        loginScreen.classList.add('hidden');
        appShell.classList.remove('hidden');
        mostrarRecordatorio();
    }

    /* ===================== RECORDATORIO DIARIO ===================== */
    const dailyModal = document.getElementById('dailyModal');
    const dailyGo    = document.getElementById('dailyGo');
    const dailyLater = document.getElementById('dailyLater');

    /* ---- Progreso diario: qué archivos de tab16 ya se abrieron hoy ----
       Se guarda en el navegador (localStorage) por usuario y por fecha,
       así que cada día empieza de cero. */
    function hoyISO() {
        const d = new Date();
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    }

    function claveRevisados() {
        return `muñelocos_revisados_${currentUser}_${hoyISO()}`;
    }

    function leerRevisados() {
        try {
            return JSON.parse(localStorage.getItem(claveRevisados())) || [];
        } catch {
            return [];
        }
    }

    function marcarRevisado(title) {
        const revisados = leerRevisados();
        if (revisados.includes(title)) return;
        revisados.push(title);
        try {
            localStorage.setItem(claveRevisados(), JSON.stringify(revisados));
        } catch { /* sin almacenamiento: solo no se recuerda */ }
        actualizarProgresoDiario();
    }

    function archivosDiarios() {
        return [...document.querySelectorAll('#tab16 .btn-big[data-action="viewer"]:not(.disabled):not(.no-access)')];
    }

    function actualizarProgresoDiario() {
        const botones = archivosDiarios();
        const revisados = leerRevisados();
        const total = botones.length;
        let hechos = 0;

        const lista = document.getElementById('dailyProgressList');
        if (lista) lista.innerHTML = '';

        botones.forEach(btn => {
            const title = btn.dataset.title;
            const ok = revisados.includes(title);
            if (ok) hechos++;
            btn.classList.toggle('is-reviewed', ok);

            if (lista) {
                const li = document.createElement('li');
                li.className = ok ? 'done' : 'pending';
                li.innerHTML = `<i class="fa-solid ${ok ? 'fa-circle-check' : 'fa-circle'}"></i> `;
                li.appendChild(document.createTextNode(title));
                lista.appendChild(li);
            }
        });

        const pendientes = total - hechos;
        const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
        set('dailyPendingCount', pendientes);
        set('dailyDoneCount', hechos);

        const fill = document.getElementById('dailyProgressFill');
        if (fill) fill.style.width = total ? `${(hechos / total) * 100}%` : '0%';

        set('dailyBannerProgress', total
            ? (pendientes ? `Llevas ${hechos} de ${total} revisados hoy · ${pendientes} pendientes` : `¡Listo! Revisaste los ${total} archivos de hoy`)
            : '');

        // Texto de la alerta según si falta algo o ya está todo
        const completo = total > 0 && pendientes === 0;
        set('dailyModalTitle', completo ? '¡Todo al día!' : '¡Recordatorio diario!');
        const msg = document.getElementById('dailyModalMsg');
        if (msg) msg.innerHTML = completo
            ? 'Ya revisaste todos los <strong>Archivos de actualización y monitoreo diario</strong> de hoy. ¡Buen trabajo!'
            : 'No olvides <strong>visualizar y llenar</strong> los <strong>Archivos de actualización y monitoreo diario</strong> el día de hoy.';

        return { total, hechos, pendientes };
    }

    function mostrarRecordatorio() {
        if (!dailyModal || sessionStorage.getItem(DAILY_REMINDER_KEY)) return;
        actualizarProgresoDiario();
        dailyModal.classList.remove('hidden');
    }

    function cerrarRecordatorio() {
        dailyModal.classList.add('hidden');
        sessionStorage.setItem(DAILY_REMINDER_KEY, '1');
    }

    dailyGo.addEventListener('click', () => {
        cerrarRecordatorio();
        showTab('tab16', 'Archivos de actualización y monitoreo diario');
    });
    dailyLater.addEventListener('click', cerrarRecordatorio);

    // ¿Ya había una sesión abierta en esta pestaña del navegador?
    const savedSession = sessionStorage.getItem(SESSION_KEY);
    if (savedSession) {
        enterApp(savedSession);
    }

    loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const userVal = loginUserSel.value;
        const passVal = loginPassInp.value;

        const match = USERS.find(u => u.user === userVal && u.pass === passVal);

        if (match) {
            sessionStorage.setItem(SESSION_KEY, match.user);
            loginError.textContent = '';
            enterApp(match.user);
            loginForm.reset();
        } else {
            loginError.textContent = 'Usuario o contraseña incorrectos. Verifica e intenta de nuevo.';
            const card = document.querySelector('.login-card');
            card.classList.remove('shake');
            void card.offsetWidth; // reinicia la animación
            card.classList.add('shake');
        }
    });

    togglePass.addEventListener('click', () => {
        const isPass = loginPassInp.type === 'password';
        loginPassInp.type = isPass ? 'text' : 'password';
        togglePass.innerHTML = isPass ? '<i class="fa fa-eye-slash"></i>' : '<i class="fa fa-eye"></i>';
    });

    logoutBtn.addEventListener('click', () => {
        sessionStorage.removeItem(SESSION_KEY);
        sessionStorage.removeItem(DAILY_REMINDER_KEY);
        location.reload();
    });

    /* ========================= NAVEGACIÓN ========================== */
    const sidebar    = document.getElementById('sidebar');
    const menuBtn    = document.getElementById('menuBtn');
    const tabs       = document.querySelectorAll('.tab-link');
    const contents   = document.querySelectorAll('.tab-content');
    const pageTitle  = document.querySelector('.page-title');
    const quickFilter = document.getElementById('quickFilter');

    window.showTab = function (tabId, title) {
        contents.forEach(c => c.classList.remove('active'));
        tabs.forEach(t => t.classList.remove('active'));

        const targetContent = document.getElementById(tabId);
        const targetTab = document.querySelector(`.tab-link[data-tab="${tabId}"]`);

        // Si el usuario no tiene permiso para esa sección, regresa al Menú
        if (targetContent && targetContent.classList.contains('no-access')) {
            return showTab('tab00', 'Menu');
        }

        if (targetContent) targetContent.classList.add('active');
        if (targetTab) targetTab.classList.add('active');
        if (title) pageTitle.innerText = title;

        document.querySelector('.main-body').scrollTop = 0;

        // limpiar el buscador al cambiar de sección
        if (quickFilter) {
            quickFilter.value = '';
            filterButtons('');
        }

        if (window.innerWidth <= 1024) sidebar.classList.remove('active');
    };

    tabs.forEach(tab => {
        tab.addEventListener('click', function () {
            // los links que abren el visor (data-url) se manejan aparte
            if (this.dataset.url) return;
            const tabId = this.getAttribute('data-tab');
            const title = this.textContent.trim();
            showTab(tabId, title);
        });
    });

    menuBtn.addEventListener('click', () => sidebar.classList.toggle('active'));

    // Cerrar el menú móvil si se toca fuera de él
    document.addEventListener('click', (e) => {
        if (window.innerWidth <= 1024 &&
            sidebar.classList.contains('active') &&
            !sidebar.contains(e.target) &&
            !menuBtn.contains(e.target)) {
            sidebar.classList.remove('active');
        }
    });

    /* ===================== REPORTE INCRUSTADO (fijo en la página, como el tab00) ===================== */
    const embedFrame = document.getElementById('embedFrame');
    const embedTitleEl = document.getElementById('embedTitle');
    const embedBack = document.getElementById('embedBack');
    const embedOpenTab = document.getElementById('embedOpenTab');

    let lastTabId = 'tab00';
    let lastTabTitle = 'Menu';

    function openEmbedded(url, title) {
        // Recuerda desde dónde llegamos, para que "Volver" regrese ahí
        const current = document.querySelector('.tab-content.active');
        if (current && current.id !== 'tabEmbed') {
            lastTabId = current.id;
            const activeLink = document.querySelector('.tab-link.active');
            lastTabTitle = activeLink ? activeLink.textContent.trim() : pageTitle.textContent;
        }

        embedFrame.src = url;
        embedTitleEl.textContent = title || '';
        // El mismo reporte, pero en una pestaña nueva del navegador
        if (embedOpenTab) embedOpenTab.href = url;
        showTab('tabEmbed', title || 'Reporte');
    }

    if (embedBack) {
        embedBack.addEventListener('click', () => showTab(lastTabId, lastTabTitle));
    }

    /* ===================== ABRIR EN PESTAÑA NUEVA (con aviso) ===================== */
    const toast = document.getElementById('toast');
    const toastText = document.getElementById('toastText');
    let toastTimer = null;

    function showToast(message) {
        toastText.textContent = message;
        toast.classList.add('active');
        clearTimeout(toastTimer);
        toastTimer = setTimeout(() => toast.classList.remove('active'), 2200);
    }

    function openExternal(url, title) {
        // window.open debe llamarse de forma síncrona dentro del evento de clic,
        // si no el navegador lo trata como pop-up y lo bloquea.
        window.open(url, '_blank', 'noopener');
        showToast(`Abriendo "${title || 'reporte'}" en una pestaña nueva…`);
    }

    // Decide automáticamente: si el link permite iframe (por ejemplo, un
    // reporte "Publicado en la Web" de Power BI), se muestra fijo en la
    // página; si no (Power BI normal, SharePoint, Lucidchart...), se abre
    // en pestaña nueva.
    function openLink(url, title) {
        if (shouldEmbed(url)) {
            openEmbedded(url, title);
        } else {
            openExternal(url, title);
        }
    }

    // Delegación de eventos: cualquier botón/link con data-action
    document.addEventListener('click', (e) => {
        const el = e.target.closest('[data-action]');
        if (!el) return;

        if (el.classList.contains('disabled')) return;
        if (el.closest('.no-access')) return;

        const action = el.dataset.action;
        if (action === 'viewer') {
            e.preventDefault();
            if (el.closest('#tab16')) marcarRevisado(el.dataset.title);
            openLink(el.dataset.url, el.dataset.title);
        } else if (action === 'tab') {
            e.preventDefault();
            showTab(el.dataset.tab, el.dataset.title);
        }
    });

    // Los tab-link del sidebar marcados con .js-viewer también usan la misma lógica
    document.querySelectorAll('.tab-link.js-viewer').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            openLink(link.dataset.url, link.dataset.title);
        });
    });

    /* ===================== BUSCADOR RÁPIDO ===================== */
    function normalize(str) {
        return str
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '');
    }

    function filterButtons(query) {
        const q = normalize(query.trim());
        const activeTab = document.querySelector('.tab-content.active');
        if (!activeTab) return;

        activeTab.querySelectorAll('.btn-big').forEach(btn => {
            const label = btn.querySelector('.label');
            const text = label ? normalize(label.textContent) : '';
            const visible = !q || text.includes(q);
            btn.classList.toggle('is-filtered-out', !visible);
        });
    }

    if (quickFilter) {
        quickFilter.addEventListener('input', () => filterButtons(quickFilter.value));
    }
});

/* =========================================================================
   NOTA DE SEGURIDAD
   -------------------------------------------------------------------------
   Este login es un filtro de cortesía, no un sistema de seguridad real:
   como todo el código corre en el navegador, cualquiera que sepa ver el
   código fuente puede leer los usuarios y contraseñas de USERS. Sirve para
   evitar que alguien entre "por accidente" o sin invitación, pero NO
   protege información confidencial.

   Los reportes de Power BI y los archivos de SharePoint que se abren desde
   aquí ya piden el inicio de sesión de Microsoft de cada persona, así que
   la protección real de esos datos sigue estando del lado de Microsoft 365.
   Si más adelante quieres control de acceso de verdad (por ejemplo, que
   solo cierta gente vea ciertos botones), lo ideal es integrar un inicio de
   sesión con Azure AD / Microsoft Entra ID en vez de esta lista de
   contraseñas en texto plano.

   Por la misma razón, los reportes de Power BI, SharePoint/OneDrive y
   Lucidchart NO se pueden mostrar dentro de un panel/iframe: sus páginas de
   inicio de sesión bloquean activamente que se les incruste en otro sitio
   (protección anti-clickjacking). Por eso esos enlaces se abren en una
   pestaña nueva (ver NO_EMBED_HOSTS arriba) en vez de en el visor.
   ========================================================================= */