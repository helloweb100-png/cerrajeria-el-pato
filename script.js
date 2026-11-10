/* ==========================================================================
   Cerrajería El Pato — script.js
   Sin dependencias obligatorias. anime.js (CDN) solo añade detalles extra.
   Principio: el contenido es visible por defecto; el JS solo lo mejora.
   ========================================================================== */
(function () {
  'use strict';

  /* Marca de "el script cargó": el <head> quita la clase .js si no aparece en 4.5 s */
  window.__elPatoOK = true;

  /* ==========================================================================
     CONFIGURACIÓN
     ========================================================================== */
  // WhatsApp del negocio: 10 dígitos de México, sin +52, sin espacios ni guiones.
  // Mientras esté vacío, el botón flotante y el envío del formulario permanecen ocultos.
  var WHATSAPP_NUMERO = '';

  var WA_TEXTO_BASE = 'Hola, vi la página de Cerrajería El Pato y necesito ayuda con una cerradura.';
  var ZONA_HORARIA = 'America/Mexico_City';
  // Horario de servicio por día (0 = domingo): [apertura, cierre] en horas de 24 h
  var HORARIO = { 0: [10, 18], 1: [8, 18], 2: [8, 18], 3: [8, 18], 4: [8, 18], 5: [8, 18], 6: [9, 18] };

  /* ==========================================================================
     UTILIDADES
     ========================================================================== */
  var root = document.documentElement;
  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };
  var clamp = function (n, a, b) { a = a === undefined ? 0 : a; b = b === undefined ? 1 : b; return Math.min(b, Math.max(a, n)); };
  var easeOut = function (t) { return 1 - Math.pow(1 - t, 3); };
  var easeIO = function (t) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; };
  var reduce = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  var fine = !!(window.matchMedia && window.matchMedia('(hover: hover) and (pointer: fine)').matches);

  function rafOnce(fn) {
    var queued = false;
    return function () {
      if (queued) return;
      queued = true;
      requestAnimationFrame(function () { queued = false; fn(); });
    };
  }
  function safe(name, fn, onFail) {
    try { fn(); } catch (e) {
      if (window.console) console.warn('[El Pato] ' + name, e);
      if (onFail) onFail();
    }
  }
  // Si un módulo que oculta contenido falla, se apaga el modo .js y todo queda visible
  function showAll() { root.classList.remove('js'); }

  /* ==========================================================================
     WHATSAPP (el número vive solo en WHATSAPP_NUMERO)
     ========================================================================== */
  var waNum = String(WHATSAPP_NUMERO || '').replace(/\D/g, '');
  var WA_OK = /^\d{10}$/.test(waNum);
  function waUrl(text) { return 'https://wa.me/52' + waNum + '?text=' + encodeURIComponent(text); }

  function initWhatsApp() {
    root.classList.toggle('has-wa', WA_OK);
    if (!WA_OK) return; // sin número: botón flotante y formulario siguen ocultos; los CTA llevan a #contacto
    $$('[data-wa]').forEach(function (a) {
      a.href = waUrl(a.getAttribute('data-msg') || WA_TEXTO_BASE);
      a.target = '_blank';
      a.rel = 'noopener';
    });
    var fl = $('#waFloat'); if (fl) fl.hidden = false;
    var fw = $('#formWrap'); if (fw) fw.hidden = false;
    var v = $('#visit'); if (v) v.hidden = true;
  }

  function initForm() {
    var f = $('#waForm');
    if (!f) return;
    f.addEventListener('submit', function (e) {
      e.preventDefault();
      if (!WA_OK) return;
      if (f.reportValidity && !f.reportValidity()) return;
      var d = new FormData(f);
      var val = function (k) { return String(d.get(k) || '').trim(); };
      var msg = 'Hola, soy ' + val('nombre') + '. Necesito: ' + val('necesidad') + '.';
      if (val('zona')) msg += ' Mi zona: ' + val('zona') + '.';
      if (val('detalle')) msg += ' ' + val('detalle');
      var w = window.open(waUrl(msg), '_blank');
      if (w) { try { w.opener = null; } catch (err) { /* noop */ } } else { window.location.href = waUrl(msg); }
    });
  }

  /* ==========================================================================
     CARGADOR (desaparece en ≤ 2.3 s; el CSS tiene un respaldo a los 2.1 s)
     ========================================================================== */
  function setReady() { root.classList.add('is-ready'); }

  function initLoader() {
    var el = $('#loader');
    if (!el) { setReady(); return; }
    var pct = $('#loaderPct');
    var done = false;
    function finish() {
      if (done) return;
      done = true;
      el.classList.add('is-open', 'is-done');
      setReady();
      setTimeout(function () { if (el.parentNode) el.parentNode.removeChild(el); }, 950);
    }
    setTimeout(finish, 1700); // red de seguridad
    if (reduce) { finish(); return; }
    var dur = 1250, t0 = performance.now();
    (function tick(now) {
      var t = clamp((now - t0) / dur);
      if (pct) pct.textContent = String(Math.round(easeOut(t) * 100)).padStart(3, '0');
      if (done) return;
      if (t < 1) requestAnimationFrame(tick); else setTimeout(finish, 220);
    })(t0);
  }

  /* ==========================================================================
     ENCABEZADO Y MENÚ MÓVIL
     ========================================================================== */
  function initHeader() {
    var burger = $('#burger'), nav = $('#nav');
    if (!burger || !nav) return;
    function setMenu(open) {
      nav.classList.toggle('is-open', open);
      burger.setAttribute('aria-expanded', String(open));
      burger.setAttribute('aria-label', open ? 'Cerrar menú' : 'Abrir menú');
      document.body.classList.toggle('menu-open', open);
    }
    burger.addEventListener('click', function () { setMenu(!nav.classList.contains('is-open')); });
    $$('a', nav).forEach(function (a) { a.addEventListener('click', function () { setMenu(false); }); });
    window.addEventListener('keydown', function (e) { if (e.key === 'Escape') setMenu(false); });
    window.addEventListener('resize', function () { if (window.innerWidth >= 960) setMenu(false); });
  }

  /* ==========================================================================
     REVELADO AL HACER SCROLL
     IntersectionObserver + respaldo por geometría (scroll, resize y 2 s)
     ========================================================================== */
  function countUp(el) {
    var to = parseFloat(el.getAttribute('data-to'));
    if (isNaN(to) || reduce || el.__counted) return;
    el.__counted = true;
    var t0 = performance.now(), dur = 1400;
    (function tick(now) {
      var t = clamp((now - t0) / dur);
      el.textContent = String(Math.round(to * easeOut(t)));
      if (t < 1) requestAnimationFrame(tick); else el.textContent = String(to);
    })(t0);
  }

  function initReveal() {
    // escalonado de los hijos directos de cada grupo
    $$('[data-stagger]').forEach(function (g) {
      var i = 0;
      Array.prototype.forEach.call(g.children, function (el) {
        if (el.hasAttribute('data-reveal')) { el.style.setProperty('--d', (Math.min(i, 8) * 0.09).toFixed(2) + 's'); i++; }
      });
    });

    var items = $$('[data-reveal]');
    var pending = new Set(items);

    function reveal(el) {
      if (!pending.has(el)) return;
      pending.delete(el);
      el.classList.add('is-in');
      $$('[data-count]', el).forEach(countUp);
    }

    if (reduce || !('IntersectionObserver' in window)) { items.forEach(reveal); return; }

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { reveal(en.target); io.unobserve(en.target); }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
    items.forEach(function (el) { io.observe(el); });

    // Respaldo por geometría: revela todo lo que ya esté dentro (o por encima) de la ventana
    var sweep = function () {
      var vh = window.innerHeight;
      pending.forEach(function (el) {
        if (el.getBoundingClientRect().top < vh * 0.96) reveal(el);
      });
    };
    var sweepRaf = rafOnce(sweep);
    window.addEventListener('scroll', sweepRaf, { passive: true });
    window.addEventListener('resize', sweepRaf);
    window.addEventListener('load', function () { setTimeout(sweep, 400); });
    setTimeout(sweep, 2000);
    setTimeout(sweep, 4000);
    sweep();
  }

  /* ==========================================================================
     TEXTO QUE SE ILUMINA PALABRA POR PALABRA
     ========================================================================== */
  function wrapWords(node, list) {
    Array.prototype.slice.call(node.childNodes).forEach(function (ch) {
      if (ch.nodeType === 3) {
        var frag = document.createDocumentFragment();
        ch.textContent.split(/(\s+)/).forEach(function (t) {
          if (!t) return;
          if (/^\s+$/.test(t)) { frag.appendChild(document.createTextNode(t)); return; }
          var s = document.createElement('span');
          s.className = 'w';
          s.textContent = t;
          list.push(s);
          frag.appendChild(s);
        });
        ch.parentNode.replaceChild(frag, ch);
      } else if (ch.nodeType === 1) {
        wrapWords(ch, list);
      }
    });
  }

  function initScrub() {
    var p = $('[data-scrub]');
    if (!p) return null;
    var words = [];
    wrapWords(p, words);
    var marks = $$('mark', p).map(function (m) { return { el: m, w: $$('.w', m) }; });
    if (reduce) {
      words.forEach(function (w) { w.style.opacity = 1; });
      marks.forEach(function (m) { m.el.classList.add('is-lit'); });
      return null;
    }
    var last = [];
    return function update() {
      var r = p.getBoundingClientRect(), vh = window.innerHeight;
      var prog = clamp((vh * 0.85 - r.top) / (vh * 0.4 + r.height));
      var n = words.length, k = prog * (n + 3);
      words.forEach(function (w, i) {
        var o = (0.2 + 0.8 * clamp((k - i) / 3)).toFixed(2);
        if (last[i] !== o) { w.style.opacity = o; last[i] = o; }
      });
      marks.forEach(function (m) {
        var lw = m.w[m.w.length - 1];
        m.el.classList.toggle('is-lit', !!lw && parseFloat(lw.style.opacity || 0) >= 0.95);
      });
    };
  }

  /* ==========================================================================
     MARCA: la foto se abre en grande con el scroll
     ========================================================================== */
  function initMarca() {
    var track = $('#marcaTrack'), stick = $('#marcaStick');
    if (!track || !stick) return null;
    return function update() {
      if (reduce || !root.classList.contains('js')) { stick.style.removeProperty('--open'); return; }
      var r = track.getBoundingClientRect();
      var total = r.height - window.innerHeight;
      var p = total > 20 ? clamp(-r.top / total) : 1;
      stick.style.setProperty('--open', easeIO(clamp(p / 0.55)).toFixed(4));
    };
  }

  /* ==========================================================================
     PROCESO: la cerradura se alinea con el scroll
     ========================================================================== */
  function initMecanismo() {
    var sec = $('#proceso'), cyl = $('#cyl'), steps = $$('.paso');
    if (!sec || !cyl || !steps.length) return null;
    var wasOpen = false;
    return function update() {
      if (reduce || !root.classList.contains('js')) return;
      var vh = window.innerHeight;
      var focus = window.innerWidth < 960 ? vh * 0.68 : vh * 0.5;
      var center = function (el) { var r = el.getBoundingClientRect(); return r.top + r.height / 2; };
      var c0 = center(steps[0]), cN = center(steps[steps.length - 1]);
      var p = clamp((focus - c0) / Math.max(1, cN - c0));

      cyl.style.setProperty('--pk', easeOut(clamp(p / 0.45)).toFixed(3));
      for (var i = 0; i < 5; i++) {
        cyl.style.setProperty('--p' + i, easeOut(clamp((p - 0.3 - i * 0.06) / 0.38)).toFixed(3));
      }
      var open = p > 0.975;
      sec.classList.toggle('is-open', open);
      if (open && !wasOpen && window.anime) {
        window.anime({ targets: '#cyl .pin__k', translateY: [-5, 0], duration: 700, delay: window.anime.stagger(70), easing: 'easeOutElastic(1, .6)' });
      }
      wasOpen = open;

      var best = 0, bd = Infinity;
      steps.forEach(function (s, idx) {
        var d = Math.abs(center(s) - focus);
        if (d < bd) { bd = d; best = idx; }
      });
      steps.forEach(function (s, idx) { s.classList.toggle('is-active', idx === best); });
    };
  }

  /* ==========================================================================
     SCROLL GENERAL (una sola función por frame)
     ========================================================================== */
  function initScroll() {
    var prog = $('#progress'), hdr = $('#hdr'), stage = $('.hero__stage'), hero = $('.hero');
    var links = $$('.nav li a');
    var secs = links.map(function (a) { return $(a.getAttribute('href')); });
    var fx = [initScrub(), initMarca(), initMecanismo()].filter(Boolean);

    function update() {
      var y = window.scrollY || window.pageYOffset, vh = window.innerHeight;
      var max = document.documentElement.scrollHeight - vh;
      if (prog) prog.style.setProperty('--sp', max > 0 ? (y / max).toFixed(4) : '0');
      if (hdr) hdr.classList.toggle('is-solid', y > 24);

      if (stage && hero && !reduce && y < vh * 1.3) {
        stage.style.transform = 'translate3d(0,' + (y * 0.1).toFixed(1) + 'px,0)';
      }

      var cur = -1;
      secs.forEach(function (s, i) { if (s && s.getBoundingClientRect().top <= vh * 0.4) cur = i; });
      links.forEach(function (a, i) { a.classList.toggle('is-active', i === cur); });

      fx.forEach(function (fn) { safe('scroll-fx', fn); });
    }
    var run = rafOnce(update);
    window.addEventListener('scroll', run, { passive: true });
    window.addEventListener('resize', run);
    window.addEventListener('load', run);
    update();
  }

  /* ==========================================================================
     HERO: partículas con red de líneas (se anima siempre que el hero esté a la vista)
     ========================================================================== */
  function initCanvas() {
    var cv = $('.hero__cv');
    if (!cv || !cv.getContext) return;
    var hero = cv.parentElement, ctx = cv.getContext('2d');
    if (!ctx) return;
    var W = 0, H = 0, lastW = 0, pts = [], running = false, raf = 0, visible = true, mx = -9999, my = -9999;
    var LINK = 110, LINK2 = LINK * LINK;

    function make() {
      return {
        x: Math.random() * W, y: Math.random() * H,
        vx: (Math.random() - 0.5) * 0.3, vy: -(0.12 + Math.random() * 0.4),
        r: 0.8 + Math.random() * 1.9, a: 0.25 + Math.random() * 0.6,
        c: Math.random() < 0.72 ? '255,214,10' : '154,168,255'
      };
    }
    function draw(step) {
      ctx.clearRect(0, 0, W, H);
      var i, j, p, q;
      for (i = 0; i < pts.length; i++) {
        p = pts[i];
        if (step) {
          p.x += p.vx; p.y += p.vy;
          var dx = p.x - mx, dy = p.y - my, d2 = dx * dx + dy * dy;
          if (d2 < 14400) { var d = Math.sqrt(d2) || 1, f = (1 - d / 120) * 2; p.x += dx / d * f; p.y += dy / d * f; }
          if (p.y < -10) { p.y = H + 10; p.x = Math.random() * W; }
          if (p.x < -10) p.x = W + 10; else if (p.x > W + 10) p.x = -10;
        }
        ctx.fillStyle = 'rgba(' + p.c + ',' + p.a + ')';
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 6.2832); ctx.fill();
      }
      ctx.lineWidth = 1;
      for (i = 0; i < pts.length; i++) {
        p = pts[i];
        for (j = i + 1; j < pts.length; j++) {
          q = pts[j];
          var ax = p.x - q.x, ay = p.y - q.y, dd = ax * ax + ay * ay;
          if (dd < LINK2) {
            ctx.strokeStyle = 'rgba(154,168,255,' + ((1 - dd / LINK2) * 0.22).toFixed(3) + ')';
            ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(q.x, q.y); ctx.stroke();
          }
        }
      }
    }
    function size(force) {
      var r = hero.getBoundingClientRect();
      if (!force && Math.abs(r.width - lastW) < 2) return; // ignora cambios solo de alto (barra del navegador móvil)
      lastW = r.width;
      var dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = Math.max(1, r.width); H = Math.max(1, r.height);
      cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      var n = Math.round(clamp(W * H / 15000, 26, W < 700 ? 44 : 96));
      pts = [];
      for (var k = 0; k < n; k++) pts.push(make());
      if (reduce) draw(0);
    }
    function loop() { if (!running) return; draw(1); raf = requestAnimationFrame(loop); }
    function start() { if (running || reduce) return; running = true; raf = requestAnimationFrame(loop); }
    function stop() { running = false; cancelAnimationFrame(raf); }

    size(true);
    if (reduce) return;
    hero.addEventListener('pointermove', function (e) {
      var r = hero.getBoundingClientRect(); mx = e.clientX - r.left; my = e.clientY - r.top;
    }, { passive: true });
    hero.addEventListener('pointerleave', function () { mx = my = -9999; });
    window.addEventListener('resize', rafOnce(function () { size(false); }));
    document.addEventListener('visibilitychange', function () { if (document.hidden) stop(); else if (visible) start(); });
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (es) {
        visible = es[0].isIntersecting;
        if (visible && !document.hidden) start(); else stop();
      }).observe(hero);
    } else { start(); }
    start();
  }

  /* ==========================================================================
     INTERACCIÓN: inclinación 3D, foco en tarjetas, botones magnéticos
     ========================================================================== */
  function initTilt() {
    if (!fine || reduce) return;
    var hero = $('.hero'), tilt = $('#stageTilt'), stage = $('#stage');
    if (hero && tilt && stage) {
      hero.addEventListener('pointermove', function (e) {
        var r = stage.getBoundingClientRect();
        var x = (e.clientX - (r.left + r.width / 2)) / window.innerWidth;
        var y = (e.clientY - (r.top + r.height / 2)) / window.innerHeight;
        tilt.style.setProperty('--ry', (x * 26).toFixed(2) + 'deg');
        tilt.style.setProperty('--rx', (-y * 20).toFixed(2) + 'deg');
      }, { passive: true });
      hero.addEventListener('pointerleave', function () {
        tilt.style.setProperty('--ry', '0deg'); tilt.style.setProperty('--rx', '0deg');
      });
    }
    $$('[data-tilt]').forEach(function (c) {
      c.addEventListener('pointermove', function (e) {
        var r = c.getBoundingClientRect();
        var px = (e.clientX - r.left) / r.width, py = (e.clientY - r.top) / r.height;
        c.style.setProperty('--mx', (px * 100).toFixed(1) + '%');
        c.style.setProperty('--my', (py * 100).toFixed(1) + '%');
        c.style.setProperty('--ry', ((px - 0.5) * 7).toFixed(2) + 'deg');
        c.style.setProperty('--rx', ((0.5 - py) * 7).toFixed(2) + 'deg');
      }, { passive: true });
      c.addEventListener('pointerleave', function () {
        c.style.setProperty('--ry', '0deg'); c.style.setProperty('--rx', '0deg');
      });
    });
    $$('.btn').forEach(function (b) {
      b.addEventListener('pointermove', function (e) {
        var r = b.getBoundingClientRect();
        var x = (e.clientX - r.left - r.width / 2) * 0.16, y = (e.clientY - r.top - r.height / 2) * 0.26;
        b.style.transform = 'translate(' + x.toFixed(1) + 'px,' + y.toFixed(1) + 'px)';
      }, { passive: true });
      b.addEventListener('pointerleave', function () { b.style.transform = ''; });
    });
  }

  /* ==========================================================================
     HORARIO: estado "abierto ahora" y día de hoy resaltado (hora de CDMX)
     ========================================================================== */
  function nowMX() {
    try {
      var parts = new Intl.DateTimeFormat('en-US', { timeZone: ZONA_HORARIA, weekday: 'short', hour: 'numeric', minute: 'numeric', hourCycle: 'h23' }).formatToParts(new Date());
      var g = function (t) { var f = parts.filter(function (p) { return p.type === t; })[0]; return f ? f.value : ''; };
      var map = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
      return { d: map[g('weekday')], h: parseInt(g('hour'), 10) % 24, m: parseInt(g('minute'), 10) };
    } catch (e) {
      var n = new Date();
      return { d: n.getDay(), h: n.getHours(), m: n.getMinutes() };
    }
  }
  function fmt12(h) { return (h % 12 || 12) + ':00 ' + (h < 12 ? 'am' : 'pm'); }

  function initStatus() {
    function paint() {
      var now = nowMX();
      if (now.d === undefined || !HORARIO[now.d]) return;
      var a = HORARIO[now.d][0], b = HORARIO[now.d][1], t = now.h + now.m / 60;
      var txt, closed = false;
      if (t >= a && t < b) txt = 'Abierto ahora · hasta las ' + fmt12(b);
      else if (t < a) { txt = 'Fuera de horario · abrimos hoy a las ' + fmt12(a); closed = true; }
      else { txt = 'Fuera de horario · abrimos mañana a las ' + fmt12(HORARIO[(now.d + 1) % 7][0]); closed = true; }
      $$('[data-status]').forEach(function (el) {
        var s = $('.status__txt', el); if (s) s.textContent = txt;
        el.classList.toggle('is-closed', closed);
      });
      $$('[data-day]').forEach(function (el) { el.classList.toggle('is-today', Number(el.getAttribute('data-day')) === now.d); });
      $$('[data-days]').forEach(function (el) {
        var days = el.getAttribute('data-days').split(',').map(Number);
        el.classList.toggle('is-today', days.indexOf(now.d) !== -1);
      });
    }
    paint();
    setInterval(paint, 60000);
  }

  /* ==========================================================================
     PREGUNTAS FRECUENTES: una abierta a la vez
     ========================================================================== */
  function initFaq() {
    var all = $$('.faq details');
    all.forEach(function (d) {
      d.addEventListener('toggle', function () {
        if (d.open) all.forEach(function (o) { if (o !== d) o.open = false; });
      });
    });
  }

  /* ==========================================================================
     anime.js (opcional): llaves que flotan siempre en el hero
     ========================================================================== */
  function initAnime() {
    if (!window.anime || reduce) return;
    root.classList.add('anime-on');
    window.anime({
      targets: '.fkey',
      translateY: function () { return window.anime.random(-22, 22); },
      rotate: function () { return window.anime.random(-16, 16); },
      duration: function () { return window.anime.random(3000, 5600); },
      direction: 'alternate',
      loop: true,
      easing: 'easeInOutSine',
      delay: window.anime.stagger(240)
    });
  }

  /* ==========================================================================
     ARRANQUE
     ========================================================================== */
  function boot() {
    safe('whatsapp', initWhatsApp);
    safe('header', initHeader);
    safe('loader', initLoader, setReady);
    safe('status', initStatus);
    safe('reveal', initReveal, showAll);
    safe('scroll', initScroll, showAll);
    safe('canvas', initCanvas);
    safe('tilt', initTilt);
    safe('faq', initFaq);
    safe('form', initForm);
    var y = $('#year'); if (y) y.textContent = String(new Date().getFullYear());
    window.addEventListener('load', function () { safe('anime', initAnime); });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
