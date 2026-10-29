/* script.js: scroll progress, active menu link, back-to-top button, and the encryption demo.
   Plain JavaScript, no libraries. */
(function () {
  'use strict';

  /* ---------- Scroll progress bar and back-to-top button ---------- */
  var bar = document.querySelector('.progress span');
  var toTop = document.querySelector('.to-top');

  function onScroll() {
    var root = document.documentElement;
    var max = root.scrollHeight - root.clientHeight;
    var progress = max > 0 ? root.scrollTop / max : 0;
    if (bar) { bar.style.transform = 'scaleX(' + progress + ')'; }
    if (toTop) { toTop.classList.toggle('show', root.scrollTop > 600); }
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* ---------- Highlight the menu link of the section on screen ---------- */
  var links = document.querySelectorAll('.nav-links a');
  var sections = [];
  links.forEach(function (link) {
    var target = document.querySelector(link.getAttribute('href'));
    if (target) { sections.push(target); }
  });

  if ('IntersectionObserver' in window) {
    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) { return; }
        links.forEach(function (link) {
          var active = link.getAttribute('href') === '#' + entry.target.id;
          link.classList.toggle('active', active);
          if (active) { link.setAttribute('aria-current', 'true'); }
          else { link.removeAttribute('aria-current'); }
        });
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    sections.forEach(function (section) { observer.observe(section); });
  }

  /* ---------- Encryption demo (Web Crypto API) ---------- */
  var demo = document.getElementById('crypto-demo');
  if (!demo) { return; }

  var input = document.getElementById('demo-message');
  var btnEncrypt = document.getElementById('btn-encrypt');
  var btnDecrypt = document.getElementById('btn-decrypt');
  var btnTamper = document.getElementById('btn-tamper');
  var status = document.getElementById('demo-status');
  var out = {
    key: document.getElementById('out-key'),
    cipher: document.getElementById('out-cipher'),
    hash: document.getElementById('out-hash'),
    plain: document.getElementById('out-plain')
  };

  var encoder = new TextEncoder();
  var decoder = new TextDecoder();
  var state = null; // holds the key, IV, encrypted bytes and original hash

  function setStatus(message, type) {
    status.textContent = message;
    status.className = 'demo-status' + (type ? ' ' + type : '');
  }

  function toHex(buffer) {
    return Array.prototype.map.call(new Uint8Array(buffer), function (b) {
      return b.toString(16).padStart(2, '0');
    }).join('');
  }

  if (!(window.crypto && window.crypto.subtle)) {
    btnEncrypt.disabled = true;
    setStatus('This demo needs the Web Crypto API. Open the page over https or from a local server.', 'error');
    return;
  }

  async function encrypt() {
    var text = input.value;
    if (!text) { setStatus('Type a message first.', 'error'); return; }
    try {
      var key = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, true, ['encrypt', 'decrypt']);
      var iv = crypto.getRandomValues(new Uint8Array(12));
      var data = await crypto.subtle.encrypt({ name: 'AES-GCM', iv: iv }, key, encoder.encode(text));
      var rawKey = await crypto.subtle.exportKey('raw', key);
      var hash = await crypto.subtle.digest('SHA-256', encoder.encode(text));

      state = { key: key, iv: iv, data: new Uint8Array(data), hash: toHex(hash) };
      out.key.textContent = toHex(rawKey);
      out.cipher.textContent = toHex(state.data);
      out.hash.textContent = state.hash;
      out.plain.textContent = 'Press Decrypt';
      btnDecrypt.disabled = false;
      btnTamper.disabled = false;
      setStatus('Message encrypted with a new random key. Press Decrypt, or tamper with the data first.');
    } catch (error) {
      setStatus('Encryption failed in this browser.', 'error');
    }
  }

  async function decrypt() {
    if (!state) { return; }
    try {
      var plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: state.iv }, state.key, state.data);
      var hash = toHex(await crypto.subtle.digest('SHA-256', plain));
      out.plain.textContent = decoder.decode(plain);
      if (hash === state.hash) {
        setStatus('Decrypted successfully. The SHA-256 hash matches, so the message is intact.', 'ok');
      } else {
        setStatus('The hash does not match the original message.', 'error');
      }
    } catch (error) {
      out.plain.textContent = 'Could not decrypt';
      setStatus('Decryption failed because the data was modified. This is how tampering is detected.', 'error');
    }
  }

  function tamper() {
    if (!state) { return; }
    state.data[0] = state.data[0] ^ 1; // flip one bit
    out.cipher.textContent = toHex(state.data);
    setStatus('One bit of the encrypted data was changed. Now press Decrypt.');
  }

  btnEncrypt.addEventListener('click', encrypt);
  btnDecrypt.addEventListener('click', decrypt);
  btnTamper.addEventListener('click', tamper);
})();