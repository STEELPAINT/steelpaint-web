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

    function open() {
      menu.classList.add('open');
      document.body.style.overflow = 'hidden';
    }
    function shut() {
      menu.classList.remove('open');
      document.body.style.overflow = '';
    }
    burger.addEventListener('click', open);
    if (close) close.addEventListener('click', shut);
    menu.querySelectorAll('a').forEach(function (a) {
      a.addEventListener('click', shut);
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
          largo:    calc.largo,
          ancho:    calc.ancho,
          caras:    calc.caras,
          piezas:   calc.piezas,
          total:    calc.total
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
        var btn  = gateForm.querySelector('[type="submit"]');
        var originalText = btn.innerHTML;
        btn.textContent = 'Verificando...';
        btn.disabled    = true;

        var commsEl = document.getElementById('g-comms');
        var lead = {
          nombre:   val('g-nombre'),
          empresa:  val('g-empresa'),
          telefono: val('g-telefono'),
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
            email:    lead.email
          })
        })
          .then(function (res) {
            if (!res.ok) throw new Error('Request failed');
            localStorage.setItem('sp_lead', JSON.stringify(lead));
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
        if (!lastCalc) return;
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

    function calculate() {
      var largo  = parseFloat(val('c-largo'))  || 0;
      var ancho  = parseFloat(val('c-ancho'))  || 0;
      var caras  = parseInt(val('c-caras'))    || 1;
      var piezas = parseInt(val('c-piezas'))   || 1;
      var pm2    = 130; /* $130 / m² */

      if (!largo || !ancho) return;

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
  }

  /* ── CONTACT FORM ──────────────────────────────────────────── */
  function initContactForm() {
    var form = document.getElementById('contact-form');
    if (!form) return;
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var btn = form.querySelector('[type="submit"]');
      var originalText = btn.innerHTML;
      btn.textContent = 'Enviando...';
      btn.disabled    = true;

      var payload = {
        nombre:   document.getElementById('c-nombre').value,
        empresa:  document.getElementById('c-empresa').value,
        telefono: document.getElementById('c-telefono').value,
        email:    document.getElementById('c-email').value,
        mensaje:  document.getElementById('c-mensaje').value
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

  /* ── INIT ──────────────────────────────────────────────────── */
  document.addEventListener('DOMContentLoaded', function () {
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
  });

})();
