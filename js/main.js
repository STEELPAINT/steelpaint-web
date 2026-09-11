/* ================================================================
   STEEL PAINT — main.js
   Particles · Counters · Calculator · Reveal · Nav
   ================================================================ */

(function () {
  'use strict';

  /* ── SCROLL PROGRESS ───────────────────────────────────────── */
  function initProgress() {
    const bar = document.createElement('div');
    bar.className = 'progress-bar';
    document.body.prepend(bar);
    window.addEventListener('scroll', function () {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      bar.style.width = (window.scrollY / max * 100) + '%';
    }, { passive: true });
  }

  /* ── NAVBAR ────────────────────────────────────────────────── */
  function initNav() {
    const nav = document.querySelector('.nav');
    if (!nav) return;
    function onScroll() {
      nav.classList.toggle('scrolled', window.scrollY > 60);
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  /* ── MOBILE MENU ───────────────────────────────────────────── */
  function initMobile() {
    const burger = document.querySelector('.nav__burger');
    const menu   = document.querySelector('.mobile-nav');
    const close  = document.querySelector('.mobile-nav__close');
    if (!burger || !menu) return;

    function abierto() {
      return menu.classList.contains('open');
    }
    /* El boton es el mismo para abrir y cerrar: el aria tiene que decir en
       cual de los dos estados esta. */
    function anunciar(estaAbierto) {
      burger.setAttribute('aria-expanded', estaAbierto ? 'true' : 'false');
      burger.setAttribute('aria-label', estaAbierto ? 'Cerrar menú' : 'Abrir menú');
    }
    function open() {
      menu.classList.add('open');
      document.body.style.overflow = 'hidden';
      anunciar(true);
    }
    function shut() {
      menu.classList.remove('open');
      document.body.style.overflow = '';
      anunciar(false);
    }

    burger.addEventListener('click', function () {
      if (abierto()) shut();
      else open();
    });
    if (close) close.addEventListener('click', shut);
    menu.querySelectorAll('a').forEach(function (a) {
      a.addEventListener('click', shut);
    });

    document.addEventListener('keydown', function (e) {
      /* defaultPrevented: si hay un modal abierto, el Escape ya es suyo. */
      if (e.key === 'Escape' && abierto() && !e.defaultPrevented) shut();
    });

    /* El overlay cubre toda la pantalla, asi que "fuera" son dos cosas: su
       propio fondo, y la barra del nav, que queda por encima. */
    document.addEventListener('click', function (e) {
      if (!abierto() || !e.target.closest) return;
      if (e.target === menu) { shut(); return; }
      if (e.target.closest('.mobile-nav') || e.target.closest('.nav__burger')) return;
      shut();
    });
  }

  /* ── CANVAS PARTICLES ──────────────────────────────────────── */
  function initParticles() {
    var canvas = document.getElementById('hero-canvas');
    if (!canvas) return;

    var ctx = canvas.getContext('2d');
    var W, H, pts = [];

    function resize() {
      W = canvas.width  = canvas.parentElement.offsetWidth;
      H = canvas.height = canvas.parentElement.offsetHeight;
    }

    function spawn() {
      pts = [];
      var n = Math.min(90, Math.floor(W * H / 10000));
      for (var i = 0; i < n; i++) {
        pts.push({
          x:  Math.random() * W,
          y:  Math.random() * H,
          vx: (Math.random() - 0.5) * 0.38,
          vy: (Math.random() - 0.5) * 0.38,
          r:  Math.random() * 1.4 + 0.5,
          a:  Math.random() * 0.35 + 0.1
        });
      }
    }

    function draw() {
      ctx.clearRect(0, 0, W, H);
      for (var i = 0; i < pts.length; i++) {
        var p = pts[i];
        p.x += p.vx; p.y += p.vy;
        if (p.x < 0 || p.x > W) p.vx *= -1;
        if (p.y < 0 || p.y > H) p.vy *= -1;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(34,197,94,' + p.a + ')';
        ctx.fill();

        for (var j = i + 1; j < pts.length; j++) {
          var q  = pts[j];
          var dx = p.x - q.x;
          var dy = p.y - q.y;
          var d  = Math.sqrt(dx * dx + dy * dy);
          if (d < 155) {
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(q.x, q.y);
            ctx.strokeStyle = 'rgba(22,163,74,' + (0.1 * (1 - d / 155)) + ')';
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        }
      }
      requestAnimationFrame(draw);
    }

    resize(); spawn(); draw();
    var ro = new ResizeObserver(function () { resize(); spawn(); });
    ro.observe(canvas.parentElement);
  }

  /* ── REVEAL ON SCROLL ──────────────────────────────────────── */
  function initReveal() {
    var els = document.querySelectorAll('.reveal, .reveal-l, .reveal-r');
    if (!els.length) return;
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) {
          e.target.classList.add('in');
          io.unobserve(e.target);
        }
      });
    }, { threshold: 0.1, rootMargin: '0px 0px -30px 0px' });
    els.forEach(function (el) { io.observe(el); });
  }

  /* ── COUNTERS ──────────────────────────────────────────────── */
  function initCounters() {
    var els = document.querySelectorAll('[data-count]');
    if (!els.length) return;
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) {
          runCounter(e.target);
          io.unobserve(e.target);
        }
      });
    }, { threshold: 0.5 });
    els.forEach(function (el) { io.observe(el); });
  }

  function runCounter(el) {
    var target   = parseFloat(el.dataset.count);
    var suffix   = el.dataset.suffix  || '';
    var prefix   = el.dataset.prefix  || '';
    var dur      = 2200;
    var t0       = performance.now();
    var decimals = el.dataset.decimals || 0;

    function tick(now) {
      var p = Math.min((now - t0) / dur, 1);
      var e = 1 - Math.pow(1 - p, 3);
      var v = target * e;
      el.textContent = prefix + v.toLocaleString('es-MX', {
        minimumFractionDigits: +decimals,
        maximumFractionDigits: +decimals
      }) + suffix;
      if (p < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }

  /* ── TELEFONO CON CODIGO DE PAIS ───────────────────────────── */
  /* Lista completa de paises. 'codigo' es el prefijo E.164 sin '+'; varios
     comparten uno (todo el plan norteamericano usa 1). */
  const TEL_PAISES = [
    { nombre: 'Afganistán', codigo: '93', iso: 'AF' },
    { nombre: 'Albania', codigo: '355', iso: 'AL' },
    { nombre: 'Alemania', codigo: '49', iso: 'DE' },
    { nombre: 'Andorra', codigo: '376', iso: 'AD' },
    { nombre: 'Angola', codigo: '244', iso: 'AO' },
    { nombre: 'Anguila', codigo: '1', iso: 'AI' },
    { nombre: 'Antártida', codigo: '672', iso: 'AQ' },
    { nombre: 'Antigua y Barbuda', codigo: '1', iso: 'AG' },
    { nombre: 'Arabia Saudí', codigo: '966', iso: 'SA' },
    { nombre: 'Argelia', codigo: '213', iso: 'DZ' },
    { nombre: 'Argentina', codigo: '54', iso: 'AR' },
    { nombre: 'Armenia', codigo: '374', iso: 'AM' },
    { nombre: 'Aruba', codigo: '297', iso: 'AW' },
    { nombre: 'Australia', codigo: '61', iso: 'AU' },
    { nombre: 'Austria', codigo: '43', iso: 'AT' },
    { nombre: 'Azerbaiyán', codigo: '994', iso: 'AZ' },
    { nombre: 'Bahamas', codigo: '1', iso: 'BS' },
    { nombre: 'Bangladés', codigo: '880', iso: 'BD' },
    { nombre: 'Barbados', codigo: '1', iso: 'BB' },
    { nombre: 'Baréin', codigo: '973', iso: 'BH' },
    { nombre: 'Bélgica', codigo: '32', iso: 'BE' },
    { nombre: 'Belice', codigo: '501', iso: 'BZ' },
    { nombre: 'Benín', codigo: '229', iso: 'BJ' },
    { nombre: 'Bermudas', codigo: '1', iso: 'BM' },
    { nombre: 'Bielorrusia', codigo: '375', iso: 'BY' },
    { nombre: 'Bolivia', codigo: '591', iso: 'BO' },
    { nombre: 'Bosnia y Herzegovina', codigo: '387', iso: 'BA' },
    { nombre: 'Botsuana', codigo: '267', iso: 'BW' },
    { nombre: 'Brasil', codigo: '55', iso: 'BR' },
    { nombre: 'Brunéi', codigo: '673', iso: 'BN' },
    { nombre: 'Bulgaria', codigo: '359', iso: 'BG' },
    { nombre: 'Burkina Faso', codigo: '226', iso: 'BF' },
    { nombre: 'Burundi', codigo: '257', iso: 'BI' },
    { nombre: 'Bután', codigo: '975', iso: 'BT' },
    { nombre: 'Cabo Verde', codigo: '238', iso: 'CV' },
    { nombre: 'Camboya', codigo: '855', iso: 'KH' },
    { nombre: 'Camerún', codigo: '237', iso: 'CM' },
    { nombre: 'Canadá', codigo: '1', iso: 'CA' },
    { nombre: 'Caribe neerlandés', codigo: '599', iso: 'BQ' },
    { nombre: 'Catar', codigo: '974', iso: 'QA' },
    { nombre: 'Chad', codigo: '235', iso: 'TD' },
    { nombre: 'Chequia', codigo: '420', iso: 'CZ' },
    { nombre: 'Chile', codigo: '56', iso: 'CL' },
    { nombre: 'China', codigo: '86', iso: 'CN' },
    { nombre: 'Chipre', codigo: '357', iso: 'CY' },
    { nombre: 'Ciudad del Vaticano', codigo: '379', iso: 'VA' },
    { nombre: 'Colombia', codigo: '57', iso: 'CO' },
    { nombre: 'Comoras', codigo: '269', iso: 'KM' },
    { nombre: 'Congo', codigo: '242', iso: 'CG' },
    { nombre: 'Corea del Norte', codigo: '850', iso: 'KP' },
    { nombre: 'Corea del Sur', codigo: '82', iso: 'KR' },
    { nombre: 'Costa Rica', codigo: '506', iso: 'CR' },
    { nombre: 'Côte d’Ivoire', codigo: '225', iso: 'CI' },
    { nombre: 'Croacia', codigo: '385', iso: 'HR' },
    { nombre: 'Cuba', codigo: '53', iso: 'CU' },
    { nombre: 'Curazao', codigo: '599', iso: 'CW' },
    { nombre: 'Dinamarca', codigo: '45', iso: 'DK' },
    { nombre: 'Dominica', codigo: '1', iso: 'DM' },
    { nombre: 'Ecuador', codigo: '593', iso: 'EC' },
    { nombre: 'Egipto', codigo: '20', iso: 'EG' },
    { nombre: 'El Salvador', codigo: '503', iso: 'SV' },
    { nombre: 'Emiratos Árabes Unidos', codigo: '971', iso: 'AE' },
    { nombre: 'Eritrea', codigo: '291', iso: 'ER' },
    { nombre: 'Eslovaquia', codigo: '421', iso: 'SK' },
    { nombre: 'Eslovenia', codigo: '386', iso: 'SI' },
    { nombre: 'España', codigo: '34', iso: 'ES' },
    { nombre: 'Estados Unidos', codigo: '1', iso: 'US' },
    { nombre: 'Estonia', codigo: '372', iso: 'EE' },
    { nombre: 'Esuatini', codigo: '268', iso: 'SZ' },
    { nombre: 'Etiopía', codigo: '251', iso: 'ET' },
    { nombre: 'Filipinas', codigo: '63', iso: 'PH' },
    { nombre: 'Finlandia', codigo: '358', iso: 'FI' },
    { nombre: 'Fiyi', codigo: '679', iso: 'FJ' },
    { nombre: 'Francia', codigo: '33', iso: 'FR' },
    { nombre: 'Gabón', codigo: '241', iso: 'GA' },
    { nombre: 'Gambia', codigo: '220', iso: 'GM' },
    { nombre: 'Georgia', codigo: '995', iso: 'GE' },
    { nombre: 'Ghana', codigo: '233', iso: 'GH' },
    { nombre: 'Gibraltar', codigo: '350', iso: 'GI' },
    { nombre: 'Granada', codigo: '1', iso: 'GD' },
    { nombre: 'Grecia', codigo: '30', iso: 'GR' },
    { nombre: 'Groenlandia', codigo: '299', iso: 'GL' },
    { nombre: 'Guadalupe', codigo: '590', iso: 'GP' },
    { nombre: 'Guam', codigo: '1', iso: 'GU' },
    { nombre: 'Guatemala', codigo: '502', iso: 'GT' },
    { nombre: 'Guayana Francesa', codigo: '594', iso: 'GF' },
    { nombre: 'Guernesey', codigo: '44', iso: 'GG' },
    { nombre: 'Guinea', codigo: '224', iso: 'GN' },
    { nombre: 'Guinea Ecuatorial', codigo: '240', iso: 'GQ' },
    { nombre: 'Guinea-Bisáu', codigo: '245', iso: 'GW' },
    { nombre: 'Guyana', codigo: '592', iso: 'GY' },
    { nombre: 'Haití', codigo: '509', iso: 'HT' },
    { nombre: 'Honduras', codigo: '504', iso: 'HN' },
    { nombre: 'Hong Kong', codigo: '852', iso: 'HK' },
    { nombre: 'Hungría', codigo: '36', iso: 'HU' },
    { nombre: 'India', codigo: '91', iso: 'IN' },
    { nombre: 'Indonesia', codigo: '62', iso: 'ID' },
    { nombre: 'Irak', codigo: '964', iso: 'IQ' },
    { nombre: 'Irán', codigo: '98', iso: 'IR' },
    { nombre: 'Irlanda', codigo: '353', iso: 'IE' },
    { nombre: 'Isla de Man', codigo: '44', iso: 'IM' },
    { nombre: 'Isla de Navidad', codigo: '61', iso: 'CX' },
    { nombre: 'Isla Norfolk', codigo: '672', iso: 'NF' },
    { nombre: 'Islandia', codigo: '354', iso: 'IS' },
    { nombre: 'Islas Aland', codigo: '358', iso: 'AX' },
    { nombre: 'Islas Caimán', codigo: '1', iso: 'KY' },
    { nombre: 'Islas Cocos', codigo: '61', iso: 'CC' },
    { nombre: 'Islas Cook', codigo: '682', iso: 'CK' },
    { nombre: 'Islas Feroe', codigo: '298', iso: 'FO' },
    { nombre: 'Islas Malvinas', codigo: '500', iso: 'FK' },
    { nombre: 'Islas Marianas del Norte', codigo: '1', iso: 'MP' },
    { nombre: 'Islas Marshall', codigo: '692', iso: 'MH' },
    { nombre: 'Islas Pitcairn', codigo: '64', iso: 'PN' },
    { nombre: 'Islas Salomón', codigo: '677', iso: 'SB' },
    { nombre: 'Islas Turcas y Caicos', codigo: '1', iso: 'TC' },
    { nombre: 'Islas Vírgenes Británicas', codigo: '1', iso: 'VG' },
    { nombre: 'Islas Vírgenes de EE. UU.', codigo: '1', iso: 'VI' },
    { nombre: 'Israel', codigo: '972', iso: 'IL' },
    { nombre: 'Italia', codigo: '39', iso: 'IT' },
    { nombre: 'Jamaica', codigo: '1', iso: 'JM' },
    { nombre: 'Japón', codigo: '81', iso: 'JP' },
    { nombre: 'Jersey', codigo: '44', iso: 'JE' },
    { nombre: 'Jordania', codigo: '962', iso: 'JO' },
    { nombre: 'Kazajistán', codigo: '7', iso: 'KZ' },
    { nombre: 'Kenia', codigo: '254', iso: 'KE' },
    { nombre: 'Kirguistán', codigo: '996', iso: 'KG' },
    { nombre: 'Kiribati', codigo: '686', iso: 'KI' },
    { nombre: 'Kosovo', codigo: '383', iso: 'XK' },
    { nombre: 'Kuwait', codigo: '965', iso: 'KW' },
    { nombre: 'Laos', codigo: '856', iso: 'LA' },
    { nombre: 'Lesoto', codigo: '266', iso: 'LS' },
    { nombre: 'Letonia', codigo: '371', iso: 'LV' },
    { nombre: 'Líbano', codigo: '961', iso: 'LB' },
    { nombre: 'Liberia', codigo: '231', iso: 'LR' },
    { nombre: 'Libia', codigo: '218', iso: 'LY' },
    { nombre: 'Liechtenstein', codigo: '423', iso: 'LI' },
    { nombre: 'Lituania', codigo: '370', iso: 'LT' },
    { nombre: 'Luxemburgo', codigo: '352', iso: 'LU' },
    { nombre: 'Macao', codigo: '853', iso: 'MO' },
    { nombre: 'Macedonia del Norte', codigo: '389', iso: 'MK' },
    { nombre: 'Madagascar', codigo: '261', iso: 'MG' },
    { nombre: 'Malasia', codigo: '60', iso: 'MY' },
    { nombre: 'Malaui', codigo: '265', iso: 'MW' },
    { nombre: 'Maldivas', codigo: '960', iso: 'MV' },
    { nombre: 'Mali', codigo: '223', iso: 'ML' },
    { nombre: 'Malta', codigo: '356', iso: 'MT' },
    { nombre: 'Marruecos', codigo: '212', iso: 'MA' },
    { nombre: 'Martinica', codigo: '596', iso: 'MQ' },
    { nombre: 'Mauricio', codigo: '230', iso: 'MU' },
    { nombre: 'Mauritania', codigo: '222', iso: 'MR' },
    { nombre: 'Mayotte', codigo: '262', iso: 'YT' },
    { nombre: 'México', codigo: '52', iso: 'MX' },
    { nombre: 'Micronesia', codigo: '691', iso: 'FM' },
    { nombre: 'Moldavia', codigo: '373', iso: 'MD' },
    { nombre: 'Mónaco', codigo: '377', iso: 'MC' },
    { nombre: 'Mongolia', codigo: '976', iso: 'MN' },
    { nombre: 'Montenegro', codigo: '382', iso: 'ME' },
    { nombre: 'Montserrat', codigo: '1', iso: 'MS' },
    { nombre: 'Mozambique', codigo: '258', iso: 'MZ' },
    { nombre: 'Myanmar (Birmania)', codigo: '95', iso: 'MM' },
    { nombre: 'Namibia', codigo: '264', iso: 'NA' },
    { nombre: 'Nauru', codigo: '674', iso: 'NR' },
    { nombre: 'Nepal', codigo: '977', iso: 'NP' },
    { nombre: 'Nicaragua', codigo: '505', iso: 'NI' },
    { nombre: 'Níger', codigo: '227', iso: 'NE' },
    { nombre: 'Nigeria', codigo: '234', iso: 'NG' },
    { nombre: 'Niue', codigo: '683', iso: 'NU' },
    { nombre: 'Noruega', codigo: '47', iso: 'NO' },
    { nombre: 'Nueva Caledonia', codigo: '687', iso: 'NC' },
    { nombre: 'Nueva Zelanda', codigo: '64', iso: 'NZ' },
    { nombre: 'Omán', codigo: '968', iso: 'OM' },
    { nombre: 'Países Bajos', codigo: '31', iso: 'NL' },
    { nombre: 'Pakistán', codigo: '92', iso: 'PK' },
    { nombre: 'Palaos', codigo: '680', iso: 'PW' },
    { nombre: 'Panamá', codigo: '507', iso: 'PA' },
    { nombre: 'Papúa Nueva Guinea', codigo: '675', iso: 'PG' },
    { nombre: 'Paraguay', codigo: '595', iso: 'PY' },
    { nombre: 'Perú', codigo: '51', iso: 'PE' },
    { nombre: 'Polinesia Francesa', codigo: '689', iso: 'PF' },
    { nombre: 'Polonia', codigo: '48', iso: 'PL' },
    { nombre: 'Portugal', codigo: '351', iso: 'PT' },
    { nombre: 'Puerto Rico', codigo: '1', iso: 'PR' },
    { nombre: 'Reino Unido', codigo: '44', iso: 'GB' },
    { nombre: 'República Centroafricana', codigo: '236', iso: 'CF' },
    { nombre: 'República Democrática del Congo', codigo: '243', iso: 'CD' },
    { nombre: 'República Dominicana', codigo: '1', iso: 'DO' },
    { nombre: 'Reunión', codigo: '262', iso: 'RE' },
    { nombre: 'Ruanda', codigo: '250', iso: 'RW' },
    { nombre: 'Rumanía', codigo: '40', iso: 'RO' },
    { nombre: 'Rusia', codigo: '7', iso: 'RU' },
    { nombre: 'Sáhara Occidental', codigo: '212', iso: 'EH' },
    { nombre: 'Samoa', codigo: '685', iso: 'WS' },
    { nombre: 'Samoa Americana', codigo: '1', iso: 'AS' },
    { nombre: 'San Bartolomé', codigo: '590', iso: 'BL' },
    { nombre: 'San Cristóbal y Nieves', codigo: '1', iso: 'KN' },
    { nombre: 'San Marino', codigo: '378', iso: 'SM' },
    { nombre: 'San Martín', codigo: '590', iso: 'MF' },
    { nombre: 'San Pedro y Miquelón', codigo: '508', iso: 'PM' },
    { nombre: 'San Vicente y las Granadinas', codigo: '1', iso: 'VC' },
    { nombre: 'Santa Elena', codigo: '290', iso: 'SH' },
    { nombre: 'Santa Lucía', codigo: '1', iso: 'LC' },
    { nombre: 'Santo Tomé y Príncipe', codigo: '239', iso: 'ST' },
    { nombre: 'Senegal', codigo: '221', iso: 'SN' },
    { nombre: 'Serbia', codigo: '381', iso: 'RS' },
    { nombre: 'Seychelles', codigo: '248', iso: 'SC' },
    { nombre: 'Sierra Leona', codigo: '232', iso: 'SL' },
    { nombre: 'Singapur', codigo: '65', iso: 'SG' },
    { nombre: 'Sint Maarten', codigo: '1', iso: 'SX' },
    { nombre: 'Siria', codigo: '963', iso: 'SY' },
    { nombre: 'Somalia', codigo: '252', iso: 'SO' },
    { nombre: 'Sri Lanka', codigo: '94', iso: 'LK' },
    { nombre: 'Sudáfrica', codigo: '27', iso: 'ZA' },
    { nombre: 'Sudán', codigo: '249', iso: 'SD' },
    { nombre: 'Sudán del Sur', codigo: '211', iso: 'SS' },
    { nombre: 'Suecia', codigo: '46', iso: 'SE' },
    { nombre: 'Suiza', codigo: '41', iso: 'CH' },
    { nombre: 'Surinam', codigo: '597', iso: 'SR' },
    { nombre: 'Svalbard y Jan Mayen', codigo: '47', iso: 'SJ' },
    { nombre: 'Tailandia', codigo: '66', iso: 'TH' },
    { nombre: 'Taiwán', codigo: '886', iso: 'TW' },
    { nombre: 'Tanzania', codigo: '255', iso: 'TZ' },
    { nombre: 'Tayikistán', codigo: '992', iso: 'TJ' },
    { nombre: 'Territorio Británico del Océano Índico', codigo: '246', iso: 'IO' },
    { nombre: 'Territorios Palestinos', codigo: '970', iso: 'PS' },
    { nombre: 'Timor-Leste', codigo: '670', iso: 'TL' },
    { nombre: 'Togo', codigo: '228', iso: 'TG' },
    { nombre: 'Tokelau', codigo: '690', iso: 'TK' },
    { nombre: 'Tonga', codigo: '676', iso: 'TO' },
    { nombre: 'Trinidad y Tobago', codigo: '1', iso: 'TT' },
    { nombre: 'Túnez', codigo: '216', iso: 'TN' },
    { nombre: 'Turkmenistán', codigo: '993', iso: 'TM' },
    { nombre: 'Turquía', codigo: '90', iso: 'TR' },
    { nombre: 'Tuvalu', codigo: '688', iso: 'TV' },
    { nombre: 'Ucrania', codigo: '380', iso: 'UA' },
    { nombre: 'Uganda', codigo: '256', iso: 'UG' },
    { nombre: 'Uruguay', codigo: '598', iso: 'UY' },
    { nombre: 'Uzbekistán', codigo: '998', iso: 'UZ' },
    { nombre: 'Vanuatu', codigo: '678', iso: 'VU' },
    { nombre: 'Venezuela', codigo: '58', iso: 'VE' },
    { nombre: 'Vietnam', codigo: '84', iso: 'VN' },
    { nombre: 'Wallis y Futuna', codigo: '681', iso: 'WF' },
    { nombre: 'Yemen', codigo: '967', iso: 'YE' },
    { nombre: 'Yibuti', codigo: '253', iso: 'DJ' },
    { nombre: 'Zambia', codigo: '260', iso: 'ZM' },
    { nombre: 'Zimbabue', codigo: '263', iso: 'ZW' }
  ];

  const TEL_DEFAULT_ISO = 'MX';

  /* Se muestran primero ante empate de relevancia: son los tres mercados
     desde los que llegan los leads, y con el filtro "1" o "5" quedarian
     sepultados entre decenas de paises que comparten prefijo. */
  const TEL_PRIORIDAD = ['MX', 'US', 'CN'];

  /* Sin acentos y en minusculas, para que "mexico" encuentre "México". */
  function telNorm(str) {
    var s = String(str == null ? '' : str).toLowerCase();
    return s.normalize ? s.normalize('NFD').replace(/[̀-ͯ]/g, '') : s;
  }

  function telLabel(pais) {
    return pais.nombre + ' +' + pais.codigo;
  }

  function telPaisPorIso(iso) {
    for (var i = 0; i < TEL_PAISES.length; i++) {
      if (TEL_PAISES[i].iso === iso) return TEL_PAISES[i];
    }
    return TEL_PAISES[0];
  }

  /* Ordena por que tan directa es la coincidencia: codigo exacto, nombre
     que empieza igual, nombre que la contiene, codigo que empieza igual. */
  function telFiltrar(query) {
    var q = telNorm(query).trim();
    if (!q) return TEL_PAISES.slice();

    /* "+1" y "1" son la misma busqueda; el usuario escribe cualquiera. */
    var qCodigo = q.replace(/[^0-9]/g, '');
    var out = [];

    TEL_PAISES.forEach(function (pais) {
      var nombre = telNorm(pais.nombre);
      var rango = -1;

      if (qCodigo && pais.codigo === qCodigo)        rango = 0;
      else if (nombre.indexOf(q) === 0)              rango = 1;
      else if (nombre.indexOf(q) > 0)                rango = 2;
      else if (qCodigo && pais.codigo.indexOf(qCodigo) === 0) rango = 3;

      if (rango >= 0) out.push({ pais: pais, rango: rango });
    });

    out.sort(function (a, b) {
      if (a.rango !== b.rango) return a.rango - b.rango;
      var pa = TEL_PRIORIDAD.indexOf(a.pais.iso);
      var pb = TEL_PRIORIDAD.indexOf(b.pais.iso);
      if (pa !== pb) return (pa < 0 ? 99 : pa) - (pb < 0 ? 99 : pb);
      return a.pais.nombre.localeCompare(b.pais.nombre, 'es');
    });

    return out.map(function (item) { return item.pais; });
  }

  /* El combobox se localiza por el contenedor, no por convencion de id. */
  function telParts(telId) {
    var input = document.getElementById(telId);
    var field = (input && input.closest) ? input.closest('.tel-field') : null;
    return {
      input: input,
      cc:    field ? field.querySelector('.tel-cc__input') : null
    };
  }

  /* El codigo vive en el dataset del combobox, no en un campo del form:
     no es un dato que el usuario escriba y no debe viajar en el payload. */
  function telCode(parts) {
    return (parts.cc && parts.cc.dataset.codigo) ? parts.cc.dataset.codigo : '';
  }

  /* "+" + codigo + digitos. Ejemplo: 52 y "81 2198 5802" dan
     "+528121985802". Si el navegador trae en cache un HTML sin combobox
     se mandan los digitos solos: inventar un pais seria peor que omitirlo. */
  function composeTel(telId) {
    var parts = telParts(telId);
    if (!parts.input) return '';
    var digits = parts.input.value.replace(/\D/g, '');
    if (!digits) return '';
    var code = telCode(parts);
    return code ? '+' + code + digits : digits;
  }

  function initTelCombobox(root) {
    var input = root.querySelector('.tel-cc__input');
    var list  = root.querySelector('.tel-cc__list');
    if (!input || !list) return;

    var visibles = [];
    var activo   = -1;
    var abierto  = false;
    var seleccionado = telPaisPorIso(TEL_DEFAULT_ISO);

    function aplicar(pais) {
      seleccionado = pais;
      input.value = telLabel(pais);
      input.dataset.codigo = pais.codigo;
      input.dataset.iso    = pais.iso;
    }

    /* La lista es position:fixed, asi que sus coordenadas se calculan
       contra la ventana. Se voltea hacia arriba si abajo no cabe: dentro
       del modal el campo puede quedar pegado al borde inferior. */
    function posicionar() {
      var r = input.getBoundingClientRect();
      list.style.width = r.width + 'px';
      list.style.left  = r.left + 'px';

      /* Con el teclado virtual abierto iOS no cambia innerHeight, solo el
         visualViewport: sin esto la lista se abriria hacia abajo, debajo
         del teclado, creyendo que hay sitio. */
      var altoVentana = (window.visualViewport && window.visualViewport.height) || window.innerHeight;
      var MARGEN = 8, SEP = 4, MAXIMO = 280;
      var libreAbajo  = altoVentana - r.bottom - SEP - MARGEN;
      var libreArriba = r.top - SEP - MARGEN;

      /* Se elige el lado con mas sitio y la lista se limita a ese hueco. Con
         el teclado abierto puede no caber entera en ninguno: antes se
         clavaba en el borde de arriba y acababa tapando el propio campo. */
      var haciaArriba = libreAbajo < MAXIMO && libreArriba > libreAbajo;
      var libre = haciaArriba ? libreArriba : libreAbajo;
      list.style.maxHeight = Math.max(0, Math.min(MAXIMO, libre)) + 'px';

      var alto = list.offsetHeight;
      list.style.top = haciaArriba
        ? Math.max(MARGEN, r.top - alto - SEP) + 'px'
        : (r.bottom + SEP) + 'px';
    }

    /* Mientras esta abierta hay que seguir al campo: el cuerpo del modal
       y la pagina pueden desplazarse debajo. */
    function reposicionar() {
      if (abierto) posicionar();
    }

    function pintar() {
      var html = '';
      visibles.forEach(function (pais, i) {
        html += '<li class="tel-cc__opt" role="option" id="' + list.id + '-opt-' + i +
                '" data-iso="' + pais.iso + '" aria-selected="' +
                (pais.iso === seleccionado.iso ? 'true' : 'false') + '">' +
                '<span class="tel-cc__nombre">' + pais.nombre + '</span>' +
                '<span class="tel-cc__codigo">+' + pais.codigo + '</span></li>';
      });
      list.innerHTML = html || '<li class="tel-cc__vacio" role="presentation">Sin resultados</li>';
      if (abierto) posicionar();
      marcar(visibles.length ? 0 : -1);
    }

    function marcar(i) {
      activo = i;
      var opts = list.querySelectorAll('.tel-cc__opt');
      Array.prototype.forEach.call(opts, function (el, idx) {
        if (idx === activo) el.classList.add('is-active');
        else el.classList.remove('is-active');
      });
      if (activo >= 0 && opts[activo]) {
        input.setAttribute('aria-activedescendant', opts[activo].id);
        /* scrollIntoView movería tambien la pagina; se ajusta solo la lista. */
        var el = opts[activo];
        if (el.offsetTop < list.scrollTop) list.scrollTop = el.offsetTop;
        else if (el.offsetTop + el.offsetHeight > list.scrollTop + list.clientHeight) {
          list.scrollTop = el.offsetTop + el.offsetHeight - list.clientHeight;
        }
      } else {
        input.removeAttribute('aria-activedescendant');
      }
    }

    function abrir() {
      if (abierto) return;
      abierto = true;
      visibles = telFiltrar('');
      /* Visible antes de resaltar: con display:none las medidas valen 0 y
         la lista no alcanzaria a bajar hasta la opcion seleccionada. */
      list.hidden = false;
      input.setAttribute('aria-expanded', 'true');
      /* true: el scroll del cuerpo del modal no burbujea hasta window. */
      window.addEventListener('scroll', reposicionar, true);
      window.addEventListener('resize', reposicionar);
      if (window.visualViewport) {
        window.visualViewport.addEventListener('resize', reposicionar);
        window.visualViewport.addEventListener('scroll', reposicionar);
      }
      pintar();
      var idx = -1;
      visibles.forEach(function (p, i) { if (p.iso === seleccionado.iso) idx = i; });
      if (idx >= 0) marcar(idx);
    }

    /* Cerrar siempre restaura la ultima seleccion valida: el control nunca
       se queda vacio ni con texto a medio escribir. */
    function cerrar() {
      abierto = false;
      window.removeEventListener('scroll', reposicionar, true);
      window.removeEventListener('resize', reposicionar);
      if (window.visualViewport) {
        window.visualViewport.removeEventListener('resize', reposicionar);
        window.visualViewport.removeEventListener('scroll', reposicionar);
      }
      list.hidden = true;
      input.setAttribute('aria-expanded', 'false');
      input.removeAttribute('aria-activedescendant');
      aplicar(seleccionado);
    }

    function elegir(i) {
      if (i < 0 || i >= visibles.length) return cerrar();
      aplicar(visibles[i]);
      cerrar();
    }

    input.addEventListener('focus', function () {
      abrir();
      input.select();
    });

    input.addEventListener('mousedown', function () {
      if (!abierto) return;   /* el focus ya abrio la lista */
      cerrar();
      input.blur();
    });

    input.addEventListener('input', function () {
      if (!abierto) abrir();
      visibles = telFiltrar(input.value);
      pintar();
    });

    input.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        if (!abierto) { abrir(); return; }
        if (!visibles.length) return;
        var next = activo + (e.key === 'ArrowDown' ? 1 : -1);
        if (next < 0) next = visibles.length - 1;
        if (next >= visibles.length) next = 0;
        marcar(next);
      } else if (e.key === 'Enter') {
        if (abierto) { e.preventDefault(); elegir(activo); }
      } else if (e.key === 'Escape') {
        if (abierto) { e.preventDefault(); cerrar(); }
      } else if (e.key === 'Tab') {
        if (abierto) cerrar();
      }
    });

    /* mousedown y no click: el blur del input llegaria antes que el click
       y cerraria la lista descartando la opcion que se acaba de tocar. */
    list.addEventListener('mousedown', function (e) {
      e.preventDefault();
      var opt = e.target.closest ? e.target.closest('.tel-cc__opt') : null;
      if (!opt) return;
      var opts = Array.prototype.slice.call(list.querySelectorAll('.tel-cc__opt'));
      elegir(opts.indexOf(opt));
    });

    document.addEventListener('mousedown', function (e) {
      if (abierto && !root.contains(e.target)) cerrar();
    });

    input.addEventListener('blur', function () {
      if (abierto) cerrar();
    });

    aplicar(seleccionado);
  }

  function initTelFields() {
    var roots = document.querySelectorAll('.tel-cc');
    Array.prototype.forEach.call(roots, function (root) { initTelCombobox(root); });
  }

  /* ── CALCULATOR ────────────────────────────────────────────── */
  function initCalc() {
    var gateForm  = document.getElementById('gate-form');
    var gateWrap  = document.getElementById('gate-wrap');
    var calcWrap  = document.getElementById('calc-wrap');
    var calcForm  = document.getElementById('calc-form');
    var resultDiv = document.getElementById('calc-result');
    var formalBtn = document.getElementById('btn-formal-quote');

    if (!gateForm && !calcForm) return;

    var lastCalc = null;

    function getLead() {
      try { return JSON.parse(localStorage.getItem('sp_lead')); }
      catch (e) { return null; }
    }

    function sendLeadWithCalc(calc) {
      var lead = getLead();
      if (!lead) return Promise.reject(new Error('No lead'));
      return fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre:   lead.nombre,
          empresa:  lead.empresa,
          telefono: lead.telefono,
          email:    lead.email,
          comms:    lead.comms,
          flow:     'cotizacion',
          largo:    calc.largo,
          ancho:    calc.ancho,
          caras:    calc.caras,
          piezas:   calc.piezas,
          total:    calc.total,
          gclid:    localStorage.getItem('sp_gclid') || '',
          attribution: window.SP_getAttribution
            ? window.SP_getAttribution()
            : { first: null, last: null }
        })
      }).then(function (res) {
        if (!res.ok) throw new Error('Request failed');
      });
    }

    /* If already registered, skip gate */
    if (localStorage.getItem('sp_lead')) {
      if (gateWrap) gateWrap.style.display = 'none';
      if (calcWrap) calcWrap.style.display = 'block';
    }

    /* Gate submit */
    if (gateForm) {
      gateForm.addEventListener('submit', function (e) {
        e.preventDefault();

        /* Honeypot: bot. Se simula el exito y no se envia nada. */
        var gateHp = document.getElementById('g-sp-website');
        if (gateHp && gateHp.value.trim() !== '') {
          if (gateWrap) gateWrap.style.display = 'none';
          if (calcWrap) calcWrap.style.display = 'block';
          return;
        }

        /* Un boton deshabilitado no frena el submit por Enter desde un
           campo de texto: sin esta guarda, ahi se cuela el segundo envio. */
        var enCurso = gateForm.querySelector('[type="submit"]');
        if (enCurso && enCurso.disabled) return;

        /* Required fields */
        var gErrors = [];
        var nombre   = val('g-nombre').trim();
        var empresa  = val('g-empresa').trim();
        var telefono = val('g-telefono').trim();
        var email    = val('g-email').trim();
        var gTelDigits = telefono.replace(/\D/g, '');
        if (!nombre)   gErrors.push('Ingresa tu nombre completo.');
        if (!empresa)  gErrors.push('Ingresa el nombre de tu empresa.');
        if (!gTelDigits) gErrors.push('Ingresa tu teléfono.');
        if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) gErrors.push('Ingresa un correo electrónico válido.');
        var gateErrEl = document.getElementById('gate-error');
        if (gErrors.length) {
          if (gateErrEl) {
            gateErrEl.innerHTML = gErrors.join('<br>');
            gateErrEl.style.display = 'block';
          }
          return;
        }
        if (gateErrEl) gateErrEl.style.display = 'none';

        var btn  = gateForm.querySelector('[type="submit"]');
        var originalText = btn.innerHTML;
        btn.textContent = 'Verificando...';
        btn.disabled    = true;

        var commsEl = document.getElementById('g-comms');
        var lead = {
          nombre:   val('g-nombre'),
          empresa:  val('g-empresa'),
          telefono: composeTel('g-telefono'),
          email:    val('g-email'),
          comms:    commsEl ? commsEl.checked : false,
          ts:       new Date().toISOString()
        };

        fetch('/api/contact', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            nombre:   lead.nombre,
            empresa:  lead.empresa,
            telefono: lead.telefono,
            email:    lead.email,
            comms:    lead.comms,
            gclid:    localStorage.getItem('sp_gclid') || '',
            flow:     'calculadora',
            attribution: window.SP_getAttribution
              ? window.SP_getAttribution()
              : { first: null, last: null }
          })
        })
          .then(function (res) {
            if (!res.ok) throw new Error('Request failed');
            localStorage.setItem('sp_lead', JSON.stringify(lead));
            window.dataLayer = window.dataLayer || [];
            dataLayer.push({ event: 'gate_form_success' });
            if (gateWrap) gateWrap.style.display = 'none';
            if (calcWrap) {
              calcWrap.style.display = 'block';
              calcWrap.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
          })
          .catch(function () {
            btn.innerHTML = originalText;
            btn.disabled = false;
            alert('Hubo un error enviando tus datos. Por favor intenta de nuevo.');
          });
      });
    }

    /* Calculator submit */
    if (calcForm) {
      calcForm.addEventListener('submit', function (e) {
        e.preventDefault();
        calculate();
      });

      /* Also recalculate live */
      calcForm.querySelectorAll('input, select').forEach(function (f) {
        f.addEventListener('input', function () {
          if (resultDiv && resultDiv.classList.contains('show')) calculate();
        });
      });
    }

    /* Formal quote button */
    if (formalBtn) {
      formalBtn.addEventListener('click', function () {
        /* Misma guarda que los otros tres: sin ella una segunda entrada
           captura "Enviando..." como texto original y lo deja puesto. */
        if (!lastCalc || formalBtn.disabled) return;
        var originalText = formalBtn.innerHTML;
        formalBtn.disabled = true;
        formalBtn.textContent = 'Enviando...';
        sendLeadWithCalc(lastCalc)
          .then(function () {
            formalBtn.innerHTML = '<i class="fa-solid fa-circle-check"></i> Cotización solicitada';
          })
          .catch(function () {
            formalBtn.innerHTML = originalText;
            formalBtn.disabled = false;
            alert('Hubo un error enviando tu solicitud. Por favor intenta de nuevo.');
          });
      });
    }

    var MIN_LARGO  = 0.30; /* 30 cm */
    var MIN_ANCHO  = 0.20; /* 20 cm */
    var MIN_PIEZAS = 10;

    function calculate() {
      var largo  = parseFloat(val('c-largo'))  || 0;
      var ancho  = parseFloat(val('c-ancho'))  || 0;
      var caras  = parseInt(val('c-caras'))    || 1;
      var piezas = parseInt(val('c-piezas'))   || 1;
      var pm2    = 130; /* $130 / m² */

      if (!largo || !ancho) return;

      /* Minimums */
      var errors = [];
      if (largo  < MIN_LARGO)  errors.push('El largo mínimo es 0.30 m (30 cm).');
      if (ancho  < MIN_ANCHO)  errors.push('El ancho mínimo es 0.20 m (20 cm).');
      if (piezas < MIN_PIEZAS) errors.push('El mínimo es 10 piezas por lote.');
      if (!showCalcError(errors)) return;

      var areaPieza = largo * ancho * caras;
      var areaTotal = areaPieza * piezas;
      var totalEst  = areaTotal  * pm2;
      var costoPieza = areaPieza * pm2;

      lastCalc = {
        largo:  largo,
        ancho:  ancho,
        caras:  caras,
        piezas: piezas,
        total:  '$' + totalEst.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
      };

      if (resultDiv) {
        resultDiv.classList.remove('show');
        void resultDiv.offsetWidth; /* force reflow for animation */
        resultDiv.classList.add('show');

        setText('bd-area-p',  areaPieza.toFixed(3) + ' m²');
        setText('bd-area-t',  areaTotal.toFixed(3) + ' m²');
        setText('bd-costo-p', '$' + costoPieza.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
        setText('bd-piezas',  piezas.toLocaleString('es-MX'));

        var totalEl = document.getElementById('calc-total');
        if (totalEl) {
          totalEl.dataset.count    = totalEst.toFixed(2);
          totalEl.dataset.prefix   = '$';
          totalEl.dataset.decimals = 2;
          runCounter(totalEl);
        }

        resultDiv.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }

    function val(id) {
      var el = document.getElementById(id);
      return el ? el.value : '';
    }
    function setText(id, txt) {
      var el = document.getElementById(id);
      if (el) el.textContent = txt;
    }
    /* Returns true if valid (no errors) */
    function showCalcError(errors) {
      var el = document.getElementById('calc-error');
      if (!errors.length) {
        if (el) el.style.display = 'none';
        return true;
      }
      if (el) {
        el.innerHTML = errors.join('<br>');
        el.style.display = 'block';
      }
      if (resultDiv) resultDiv.classList.remove('show');
      return false;
    }
  }

  /* ── MODALES ───────────────────────────────────────────────── */
  var modalAbierto = null;
  var modalOrigen  = null;

  var MODAL_FOCO = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

  /* Solo lo que se puede ver y enfocar. El honeypot esta fuera de pantalla
     pero mide, asi que se descarta por su tabindex -1, igual que hace el
     navegador al tabular. */
  function modalFocusables(modal) {
    return Array.prototype.filter.call(modal.querySelectorAll(MODAL_FOCO), function (el) {
      return el.tabIndex >= 0 && (el.offsetWidth > 0 || el.offsetHeight > 0);
    });
  }

  function abrirModal(modal, origen) {
    if (!modal || modalAbierto) return;
    modalAbierto = modal;
    modalOrigen  = origen || null;
    modal.hidden = false;

    /* Al bloquear el scroll desaparece la barra y la pagina brincaria de
       ancho; el padding ocupa exactamente ese hueco. */
    var barra = window.innerWidth - document.documentElement.clientWidth;
    document.body.classList.add('has-modal');
    if (barra > 0) document.body.style.paddingRight = barra + 'px';

    var primero = modal.querySelector('[data-modal-focus]') || modalFocusables(modal)[0];
    if (primero) primero.focus();
  }

  function cerrarModal() {
    if (!modalAbierto) return;
    modalAbierto.hidden = true;
    document.body.classList.remove('has-modal');
    document.body.style.paddingRight = '';
    /* El foco vuelve a quien abrio: si no, se va al inicio del documento
       y quien navega con teclado pierde el lugar. */
    if (modalOrigen && modalOrigen.focus) modalOrigen.focus();
    modalAbierto = null;
    modalOrigen  = null;
  }

  /* Un combobox abierto dentro del modal se come el clic al fondo y la
     tecla Escape: cierra su lista primero, sin cerrar el modal. */
  function modalTieneListaAbierta() {
    return !!(modalAbierto && modalAbierto.querySelector('.tel-cc__list:not([hidden])'));
  }

  function initModals() {
    /* Delegado en document: sumar un disparador es ponerle el atributo al
       HTML, sin volver a tocar este archivo. */
    document.addEventListener('click', function (e) {
      if (!e.target.closest) return;

      var abre = e.target.closest('[data-open-modal]');
      if (abre) {
        var modal = document.getElementById(abre.getAttribute('data-open-modal'));
        if (modal) {
          e.preventDefault();
          abrirModal(modal, abre);
        }
        return;
      }

      if (modalAbierto && e.target.closest('[data-close-modal]')) {
        e.preventDefault();
        cerrarModal();
      }
    });

    /* Fondo: solo cuenta si el objetivo es el overlay mismo, no algo de
       adentro. mousedown y no click para que arrastrar texto desde el
       dialogo hasta el fondo no cierre. */
    document.addEventListener('mousedown', function (e) {
      if (modalAbierto && e.target === modalAbierto && !modalTieneListaAbierta()) {
        cerrarModal();
      }
    });

    document.addEventListener('keydown', function (e) {
      if (!modalAbierto) return;

      /* El combobox ya consumio la tecla (Escape cierra su lista). */
      if (e.defaultPrevented) return;

      if (e.key === 'Escape') {
        e.preventDefault();
        cerrarModal();
        return;
      }

      if (e.key !== 'Tab') return;

      var foco = modalFocusables(modalAbierto);
      if (!foco.length) return;
      var primero = foco[0];
      var ultimo  = foco[foco.length - 1];

      if (e.shiftKey && document.activeElement === primero) {
        e.preventDefault();
        ultimo.focus();
      } else if (!e.shiftKey && document.activeElement === ultimo) {
        e.preventDefault();
        primero.focus();
      } else if (!modalAbierto.contains(document.activeElement)) {
        e.preventDefault();
        primero.focus();
      }
    });
  }

  /* ── CONTACT FORM ──────────────────────────────────────────── */
  function initContactForm() {
    var form = document.getElementById('contact-form');
    if (!form) return;
    form.addEventListener('submit', function (e) {
      e.preventDefault();

      /* Honeypot: bot. Se simula el exito y no se envia nada. */
      var hp = document.getElementById('c-sp-website');
      if (hp && hp.value.trim() !== '') {
        window.location.href = 'gracias.html';
        return;
      }

      /* Ver la nota del gate: el Enter en un campo de texto vuelve a
         enviar aunque el boton este deshabilitado. */
      var enCurso = form.querySelector('[type="submit"]');
      if (enCurso && enCurso.disabled) return;

      /* Required fields */
      var gv = function (id) {
        var el = document.getElementById(id);
        return el ? el.value.trim() : '';
      };
      var nombre   = gv('c-nombre');
      var empresa  = gv('c-empresa');
      var telefono = gv('c-telefono');
      var email    = gv('c-email');
      var cTelDigits = telefono.replace(/\D/g, '');
      var errors = [];
      if (!nombre)   errors.push('Ingresa tu nombre.');
      if (!empresa)  errors.push('Ingresa el nombre de tu empresa.');
      if (!cTelDigits) errors.push('Ingresa tu teléfono.');
      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.push('Ingresa un correo electrónico válido.');
      var errEl = document.getElementById('contact-error');
      if (errors.length) {
        if (errEl) {
          errEl.innerHTML = errors.join('<br>');
          errEl.style.display = 'block';
        }
        return;
      }
      if (errEl) errEl.style.display = 'none';

      var btn = form.querySelector('[type="submit"]');
      var originalText = btn.innerHTML;
      btn.textContent = 'Enviando...';
      btn.disabled    = true;

      var commsEl = document.getElementById('c-comms');
      var payload = {
        nombre:   nombre,
        empresa:  empresa,
        telefono: composeTel('c-telefono'),
        email:    email,
        mensaje:  gv('c-mensaje'),
        comms:    commsEl ? commsEl.checked : false,
        gclid:    localStorage.getItem('sp_gclid') || '',
        flow:     'contacto',
        attribution: window.SP_getAttribution
          ? window.SP_getAttribution()
          : { first: null, last: null }
      };

      fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
        .then(function (res) {
          if (!res.ok) throw new Error('Request failed');
          window.location.href = 'gracias.html';
        })
        .catch(function () {
          btn.innerHTML = originalText;
          btn.disabled = false;
          alert('Hubo un error enviando el mensaje. Por favor intenta de nuevo.');
        });
    });
  }

  /* ── VARIANTE DE CAMPAÑA (#ads) ────────────────────────────── */
  /* La clase v-ads la pone un script inline en el <head>. Aqui solo se
     evita que navegar por el nav reemplace el fragmento y borre #ads de la
     URL: se hace el scroll a mano y se cancela la navegacion. Los href del
     markup no cambian, asi que sin JS los enlaces siguen sirviendo. */
  function initAdsNav() {
    if (!document.documentElement.classList.contains('v-ads')) return;

    /* El logo apunta a index.html, que recarga y deja la URL sin #ads. Se
       reapunta al tope desde aqui y no desde el markup porque en la version
       normal debe seguir llevando a la home; y sin este JS no hay variante,
       asi que el href del HTML es justo el que corresponde a esa version. */
    var logo = document.querySelector('.nav__brand');
    if (logo) logo.setAttribute('href', '#inicio');

    document.addEventListener('click', function (e) {
      /* El CTA del nav abre el modal y ya llamo a preventDefault: no debe
         ademas desplazar la pagina hasta la seccion de contacto. */
      if (e.defaultPrevented) return;
      if (!e.target.closest) return;

      var enlace = e.target.closest('.nav__links a, .mobile-nav a, .nav__brand');
      if (!enlace || enlace.hasAttribute('data-open-modal')) return;

      var href = enlace.getAttribute('href') || '';
      var corte = href.indexOf('#');
      if (corte < 0) return;

      /* Solo anclas de esta misma pagina; un '#seccion' de otro documento
         debe navegar normal. */
      var base = href.slice(0, corte);
      if (base && base !== 'index.html' && base !== './index.html') return;

      var destino = document.getElementById(href.slice(corte + 1));
      if (!destino) return;

      e.preventDefault();
      /* Mismo punto de llegada que el salto nativo, para que la variante no
         se sienta distinta de la version normal. */
      destino.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }

  /* ── PREREGISTRO DE WHATSAPP ───────────────────────────────── */
  const WA_NUMERO = '528180294154';
  /* Sin O, 0, I ni 1: el folio se dicta por telefono y se teclea a mano. */
  const WA_ALFABETO = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const WA_LARGO    = 6;

  function waReferencia() {
    var out = '';
    for (var i = 0; i < WA_LARGO; i++) {
      out += WA_ALFABETO.charAt(Math.floor(Math.random() * WA_ALFABETO.length));
    }
    return out;
  }

  function waEnlace(nombre, referencia) {
    var texto = 'Hola, soy ' + nombre + '. Me interesa cotizar pintura electrostática. Ref: ' + referencia;
    return 'https://wa.me/' + WA_NUMERO + '?text=' + encodeURIComponent(texto);
  }

  function initWhatsappForm() {
    var form = document.getElementById('whatsapp-form');
    if (!form) return;

    var paso1 = document.getElementById('wa-paso-1');
    var paso2 = document.getElementById('wa-paso-2');
    var abrir = document.getElementById('wa-abrir');
    var errEl = document.getElementById('whatsapp-error');

    function mostrarPaso2(enlace) {
      if (abrir) abrir.setAttribute('href', enlace);
      if (paso1) paso1.hidden = true;
      if (paso2) {
        paso2.hidden = false;
        /* El foco estaba en un control que se acaba de ocultar; se lleva al
           unico boton que sigue importando. */
        if (abrir) abrir.focus();
      }
    }

    /* Al reabrir se vuelve al paso 1: si no, quien entra por segunda vez se
       encuentra la pantalla final de la vez anterior. No se limpia el
       formulario: el combobox guarda el pais en un dataset y un reset()
       dejaria el texto y el codigo diciendo cosas distintas. */
    function reiniciar() {
      if (paso1) paso1.hidden = false;
      if (paso2) paso2.hidden = true;
      if (errEl) errEl.style.display = 'none';
    }

    document.addEventListener('click', function (e) {
      if (e.target.closest && e.target.closest('[data-open-modal="whatsapp-modal"]')) reiniciar();
    });

    form.addEventListener('submit', function (e) {
      e.preventDefault();

      var enCurso = form.querySelector('[type="submit"]');
      if (enCurso && enCurso.disabled) return;

      var gv = function (id) {
        var el = document.getElementById(id);
        return el ? el.value.trim() : '';
      };
      var nombre   = gv('w-nombre');
      var telefono = gv('w-telefono');
      var digitos  = telefono.replace(/\D/g, '');

      var errores = [];
      if (!nombre)  errores.push('Ingresa tu nombre.');
      if (!digitos) errores.push('Ingresa tu teléfono.');
      if (errores.length) {
        if (errEl) {
          errEl.innerHTML = errores.join('<br>');
          errEl.style.display = 'block';
        }
        return;
      }
      if (errEl) errEl.style.display = 'none';

      var referencia = waReferencia();
      var enlace     = waEnlace(nombre, referencia);

      /* La pestaña se reserva aqui, dentro del gesto del usuario: abrirla
         despues de la respuesta del backend la convierte en un popup y el
         navegador la bloquea. Se navega cuando toca. */
      var pestana = null;
      try { pestana = window.open('', '_blank'); } catch (err) { pestana = null; }

      function abrirWhatsapp() {
        if (pestana && !pestana.closed) {
          try {
            /* Todavia es about:blank y del mismo origen: se le corta el
               acceso a esta ventana antes de mandarla a un sitio ajeno. */
            pestana.opener = null;
            pestana.location.href = enlace;
            return;
          } catch (err) { /* se cayo el handle: se intenta de nuevo abajo */ }
        }
        try { window.open(enlace, '_blank', 'noopener'); } catch (err) { /* no-op */ }
      }

      var hp  = document.getElementById('w-sp-website');
      /* Se lee recortado, igual que lo evalua el backend. */
      var honeypot = hp ? hp.value.trim() : '';

      var btn = form.querySelector('[type="submit"]');
      var textoOriginal = btn.innerHTML;
      btn.textContent = 'Generando...';
      btn.disabled    = true;

      fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          flow:        'whatsapp',
          nombre:      nombre,
          telefono:    composeTel('w-telefono'),
          referencia:  referencia,
          attribution: window.SP_getAttribution
            ? window.SP_getAttribution()
            : { first: null, last: null },
          sp_website:  hp ? hp.value : ''
        })
      })
        .then(function (res) {
          if (!res.ok) throw new Error('Request failed');
          /* El backend descarta al bot en silencio y contesta 200, asi que
             un honeypot lleno llega hasta aqui indistinguible de un envio
             bueno. Sin esta guarda, la conversion en Ads contaria bots. */
          if (honeypot) return;
          /* Solo con el registro confirmado: el evento debe contar
             preregistros guardados, no intentos. */
          window.dataLayer = window.dataLayer || [];
          dataLayer.push({ event: 'whatsapp_preregistro' });
        })
        .catch(function () {
          /* Sin evento, pero la conversacion sigue: perder el registro es
             mejor que perder el lead. */
        })
        .then(function () {
          btn.innerHTML = textoOriginal;
          btn.disabled  = false;
          abrirWhatsapp();
          mostrarPaso2(enlace);
        });
    });
  }

  /* ── FLOTANTE VS BOTONES DE ENVIAR ─────────────────────────── */
  /* Con solo hacer scroll, el flotante puede pasar por encima de una accion
     principal: la regla de :focus no cubre a quien nunca toca un campo.
     Aqui se aparta mientras alguna este en pantalla.
     Se declaran en el HTML con data-cta-principal, en vez de listarlas aqui,
     para que una accion nueva quede cubierta con solo marcarla. */
  function initFabForms() {
    var fab = document.querySelector('.wa-fab');
    if (!fab || !window.IntersectionObserver) return;

    /* Lo que este dentro de un modal queda fuera aunque lleve la marca: ahi
       el flotante ya se oculta por .has-modal, y ademas al abrirse el modal
       su boton entraria en pantalla y dejaria el flotante marcado justo
       cuando tiene que recibir el foco de vuelta al cerrarse. */
    var botones = Array.prototype.filter.call(
      document.querySelectorAll('[data-cta-principal]'),
      function (b) { return !(b.closest && b.closest('.modal')); }
    );
    if (!botones.length) return;

    var visibles = new Set();

    var observador = new IntersectionObserver(function (entradas) {
      entradas.forEach(function (e) {
        if (e.isIntersecting) visibles.add(e.target);
        else visibles.delete(e.target);
      });
      fab.classList.toggle('is-oculto', visibles.size > 0);
    }, {
      /* Colchon de 120px: el cambio ocurre antes de que lleguen a tocarse,
         no en el borde exacto, que es donde un scroll fino lo haria
         parpadear entrando y saliendo. */
      rootMargin: '120px 0px 120px 0px',
      threshold: 0
    });

    botones.forEach(function (b) { observador.observe(b); });
  }

  /* ── ACTIVE NAV LINK ───────────────────────────────────────── */
  function initActiveLink() {
    var page = window.location.pathname.split('/').pop() || 'index.html';
    document.querySelectorAll('.nav__links a, .mobile-nav a').forEach(function (a) {
      var href = a.getAttribute('href') || '';
      if (href === page || (page === 'index.html' && href === '') || href === './' + page) {
        a.classList.add('active');
      }
    });
  }

  /* ── GALLERY MARQUEE + LIGHTBOX ────────────────────────────── */
  function initGallery() {
    var gallery  = document.getElementById('gallery-mosaic');
    var lightbox = document.getElementById('lightbox');
    if (!gallery) return;

    var items = gallery.querySelectorAll('.mq-item');
    if (!items.length) return;

    function openLightbox(src, alt) {
      if (!lightbox) return;
      var img = lightbox.querySelector('.lightbox__img');
      img.src = src;
      img.alt = alt || '';
      lightbox.classList.add('is-open');
      lightbox.setAttribute('aria-hidden', 'false');
      document.body.style.overflow = 'hidden';
    }
    function closeLightbox() {
      if (!lightbox) return;
      lightbox.classList.remove('is-open');
      lightbox.setAttribute('aria-hidden', 'true');
      lightbox.querySelector('.lightbox__img').src = '';
      document.body.style.overflow = '';
    }

    items.forEach(function (item) {
      item.addEventListener('click', function () {
        var img = item.querySelector('img');
        if (img) openLightbox(img.src, img.getAttribute('alt') || 'Proyecto Steel Paint');
      });
      item.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          var img = item.querySelector('img');
          if (img) openLightbox(img.src, img.getAttribute('alt') || 'Proyecto Steel Paint');
        }
      });
    });

    if (lightbox) {
      var closeBtn = lightbox.querySelector('.lightbox__close');
      if (closeBtn) closeBtn.addEventListener('click', closeLightbox);
      lightbox.addEventListener('click', function (e) {
        if (e.target === lightbox) closeLightbox();
      });
      document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape' && lightbox.classList.contains('is-open')) {
          closeLightbox();
        }
      });
    }
  }

  /* ── ATRIBUCION (ADS + UTM) ────────────────────────────────── */
  const ATTR_TTL_MS   = 90 * 24 * 60 * 60 * 1000;   /* 90 dias */
  const ATTR_TTL_S    = ATTR_TTL_MS / 1000;
  const ATTR_ADS_KEYS = ['gclid', 'gbraid', 'wbraid'];
  const ATTR_UTM_KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content'];

  /* Respaldo en cookie de primera parte: el ITP de Safari borra a los ~7
     dias lo que JS escribe en localStorage, y la ventana de atribucion es
     de 90. La cookie la sigue leyendo JS, asi que nada de HttpOnly. */
  const ATTR_COOKIE     = 'sp_attr';
  /* El tope real por cookie ronda 4KB contando nombre y atributos; pasado
     ese punto el navegador la descarta en silencio y creeriamos tener
     respaldo. 3500 deja margen para 'sp_attr=' y los atributos. */
  const ATTR_COOKIE_MAX = 3500;

  /* Borra una clave sin propagar errores (modo privado) */
  function attrRemove(key) {
    try { localStorage.removeItem(key); } catch (e) { /* no-op */ }
  }

  /* Forma y vigencia. Misma regla para localStorage y para la cookie. */
  function attrVigente(touch) {
    if (!touch || typeof touch !== 'object' || !touch.ts) return false;
    var ts = Date.parse(touch.ts);
    return !isNaN(ts) && (Date.now() - ts) <= ATTR_TTL_MS;
  }

  /* Lee un toque guardado; si caduco o es ilegible, lo borra y devuelve null */
  function attrRead(key) {
    var raw;
    try { raw = localStorage.getItem(key); } catch (e) { return null; }
    if (!raw) return null;

    var touch = null;
    try { touch = JSON.parse(raw); } catch (e) { touch = null; }
    if (!attrVigente(touch)) {
      attrRemove(key);
      return null;
    }
    return touch;
  }

  /* Devuelve { first, last } de la cookie, o null si no hay o es ilegible. */
  function attrCookieRead() {
    var crudo = '';
    try { crudo = document.cookie || ''; } catch (e) { return null; }

    var partes = crudo.split(';');
    for (var i = 0; i < partes.length; i++) {
      var parte = partes[i].trim();
      if (parte.indexOf(ATTR_COOKIE + '=') !== 0) continue;
      try {
        var datos = JSON.parse(decodeURIComponent(parte.slice(ATTR_COOKIE.length + 1)));
        if (datos && typeof datos === 'object') return datos;
      } catch (e) { /* cookie ilegible: como si no estuviera */ }
      return null;
    }
    return null;
  }

  function attrCookieWrite(datos) {
    try {
      var valor = encodeURIComponent(JSON.stringify(datos));
      /* Ya codificado todo es ASCII, asi que length son bytes reales. */
      if (valor.length > ATTR_COOKIE_MAX) {
        console.warn('[attr] cookie omitida: ' + valor.length +
                     ' bytes supera el limite de ' + ATTR_COOKIE_MAX);
        return;
      }
      document.cookie = ATTR_COOKIE + '=' + valor +
        ';Max-Age=' + ATTR_TTL_S + ';Path=/;SameSite=Lax;Secure';
    } catch (e) { /* cookies deshabilitadas: queda solo localStorage */ }
  }

  /* localStorage manda; la cookie es el respaldo. Si localStorage perdio el
     dato (ITP) pero la cookie lo conserva vigente, se repuebla localStorage
     para que la siguiente lectura ya no dependa del respaldo. */
  function attrObtener(key, campo) {
    var touch = attrRead(key);
    if (touch) return touch;

    var cookie = attrCookieRead();
    var respaldo = cookie ? cookie[campo] : null;
    if (!attrVigente(respaldo)) return null;

    attrWrite(key, respaldo);
    return respaldo;
  }

  function attrWrite(key, touch) {
    try { localStorage.setItem(key, JSON.stringify(touch)); } catch (e) { /* no-op */ }
  }

  /* Toque "con senal": trae parametros de Ads, utm_ o viene de otro dominio */
  function attrHasSignal(touch, referrer) {
    var i;
    for (i = 0; i < ATTR_ADS_KEYS.length; i++) {
      if (touch[ATTR_ADS_KEYS[i]]) return true;
    }
    for (i = 0; i < ATTR_UTM_KEYS.length; i++) {
      if (touch[ATTR_UTM_KEYS[i]]) return true;
    }
    if (referrer) {
      try {
        if (new URL(referrer).hostname !== window.location.hostname) return true;
      } catch (e) { /* referrer no parseable: sin senal */ }
    }
    return false;
  }

  function initAttribution() {
    var params = new URLSearchParams(window.location.search);
    var touch  = {};

    ATTR_ADS_KEYS.concat(ATTR_UTM_KEYS).forEach(function (key) {
      touch[key] = params.get(key) || '';
    });

    var referrer = document.referrer || '';
    touch.referrer = referrer;
    touch.landing  = window.location.pathname;
    touch.ts       = new Date().toISOString();

    /* Compatibilidad: los formularios siguen leyendo sp_gclid */
    if (touch.gclid) {
      try {
        localStorage.setItem('sp_gclid', touch.gclid);
        localStorage.setItem('sp_gclid_ts', touch.ts);
      } catch (e) { /* no-op */ }
    }
    /* If no gclid in the URL but one is already stored, keep it */

    if (!attrHasSignal(touch, referrer)) return;

    /* El primer toque solo se escribe si no hay uno vigente. Se consulta
       con attrObtener y no con attrRead: si el ITP vacio localStorage, el
       primer toque real sigue en la cookie y no debe perderse. */
    var first = attrObtener('sp_attr_first', 'first');
    if (!first) {
      first = touch;
      attrWrite('sp_attr_first', touch);
    }
    attrWrite('sp_attr_last', touch);

    /* Los valores van de variables y no releidos de localStorage: en modo
       privado la escritura falla en silencio y la cookie quedaria vacia. */
    attrCookieWrite({ first: first, last: touch });
  }

  window.SP_getAttribution = function () {
    return {
      first: attrObtener('sp_attr_first', 'first'),
      last:  attrObtener('sp_attr_last', 'last')
    };
  };

  /* ── INIT ──────────────────────────────────────────────────── */
  document.addEventListener('DOMContentLoaded', function () {
    initAttribution();
    initTelFields();
    /* Antes que initModals: el reinicio de pasos debe correr antes de que el
       modal se abra, para que el foco caiga en un campo ya visible. */
    initWhatsappForm();
    initModals();
    initProgress();
    initNav();
    initMobile();
    initParticles();
    initReveal();
    initCounters();
    initCalc();
    initContactForm();
    initGallery();
    initActiveLink();
    initAdsNav();
    initFabForms();
  });

})();
