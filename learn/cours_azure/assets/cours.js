/* Améliorations progressives : le cours reste lisible sans JavaScript. */
(function () {
  'use strict';
  // Chaque étape garde son propre choix ; sans JS, les deux méthodes sont lisibles.
  document.querySelectorAll('.step[data-lab-methods]').forEach(function (step) {
    var heading = step.querySelector('h4');
    var alternative = step.querySelector('.lab-alternative');
    if (!heading || !alternative) return;
    var key = step.dataset.labMethods;
    var originalMethod = step.dataset.originalMethod || 'cli';
    var alternativeMethod = alternative.dataset.method || 'gui';
    if (originalMethod === alternativeMethod) return;
    // Les parcours de requête partagent une seule définition KQL dans le HTML.
    // Le volet CLI en tire une commande complète, sans dupliquer la requête source.
    if (alternative.hasAttribute('data-query-cli')) {
      var sourceQueries = Array.from(step.querySelectorAll('.code')).filter(function (block) {
        var label = block.querySelector('.ttl');
        return !alternative.contains(block) && label && /^KQL\b/.test(label.textContent);
      });
      var output = alternative.querySelector('[data-query-cli-output]');
      if (output && sourceQueries.length) {
        sourceQueries.forEach(function (block, index) {
          var text = block.querySelector('pre').textContent.trim();
          var code = document.createElement('div');
          code.className = 'code';
          var bar = document.createElement('div');
          bar.className = 'bar';
          var title = document.createElement('span');
          title.className = 'ttl';
          title.textContent = 'Azure CLI · requête ' + (index + 1);
          bar.appendChild(title);
          var pre = document.createElement('pre');
          pre.textContent = 'KQL=$(cat <<\'KQL_LAB\'\n' + text + '\nKQL_LAB\n)\n' +
            'az monitor log-analytics query --workspace "$LAW_GUID" \\\n' +
            '  --analytics-query "$KQL" --timespan ' + (alternative.dataset.queryTimespan || 'P90D') + ' --output json';
          code.appendChild(bar);
          code.appendChild(pre);
          output.appendChild(code);
        });
        var fallback = alternative.querySelector('.query-cli-fallback');
        if (fallback) fallback.hidden = true;
      }
    }
    var original = document.createElement('div');
    Array.from(step.childNodes).forEach(function (node) {
      if (node !== heading && node !== alternative) original.appendChild(node);
    });
    var panels = {};
    panels[originalMethod] = original;
    panels[alternativeMethod] = alternative;
    var labels = { gui: 'Portail Azure (GUI)', cli: 'Azure CLI / Cloud Shell' };
    if (step.dataset.originalLabel) labels[originalMethod] = step.dataset.originalLabel;
    if (alternative.dataset.label) labels[alternativeMethod] = alternative.dataset.label;
    var nav = document.createElement('div');
    nav.className = 'lab-method-tabs';
    nav.setAttribute('role', 'tablist');
    nav.setAttribute('aria-label', 'Méthode pour : ' + heading.textContent);
    var buttons = {};
    var storageKey = 'azure-secops:lab-method:v1:' + key;
    var selected = step.dataset.defaultMethod || 'gui';
    try {
      var saved = localStorage.getItem(storageKey);
      if (saved === 'gui' || saved === 'cli') selected = saved;
    } catch (_) { /* Le stockage local peut être bloqué, notamment en file://. */ }
    function select(method, remember) {
      ['gui', 'cli'].forEach(function (name) {
        var active = name === method;
        buttons[name].setAttribute('aria-selected', String(active));
        buttons[name].tabIndex = active ? 0 : -1;
        panels[name].hidden = !active;
      });
      if (remember) {
        try { localStorage.setItem(storageKey, method); } catch (_) { /* Choix valable pour la page ouverte. */ }
        update();
      }
    }
    ['gui', 'cli'].forEach(function (method, index) {
      var button = document.createElement('button');
      button.type = 'button';
      button.id = 'method-' + key + '-' + method;
      button.textContent = labels[method];
      button.setAttribute('role', 'tab');
      button.setAttribute('aria-controls', 'panel-' + key + '-' + method);
      panels[method].id = 'panel-' + key + '-' + method;
      panels[method].classList.add('lab-method-panel');
      panels[method].setAttribute('role', 'tabpanel');
      panels[method].setAttribute('aria-labelledby', button.id);
      panels[method].tabIndex = 0;
      button.addEventListener('click', function () { select(method, true); });
      button.addEventListener('keydown', function (event) {
        var target;
        if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') target = ['gui', 'cli'][1 - index];
        else if (event.key === 'Home') target = 'gui';
        else if (event.key === 'End') target = 'cli';
        else return;
        event.preventDefault();
        select(target, true);
        buttons[target].focus();
      });
      buttons[method] = button;
      nav.appendChild(button);
    });
    if (!step.id) step.id = 'step-' + key;
    step.classList.add('has-lab-methods');
    step.appendChild(nav);
    step.appendChild(panels.gui);
    step.appendChild(panels.cli);
    select(selected === 'cli' ? 'cli' : 'gui', false);
  });
  var progress = document.getElementById('progress');
  var links = Array.from(document.querySelectorAll('.toc a[href^="#"]'));
  var sections = links.map(function (link) { return document.getElementById(link.hash.slice(1)); });
  function update() {
    var height = document.documentElement.scrollHeight - window.innerHeight;
    if (progress) progress.style.width = (height > 0 ? window.scrollY / height * 100 : 0) + '%';
    var active = 0;
    sections.forEach(function (section, index) {
      if (section && section.getBoundingClientRect().top <= 150) active = index;
    });
    links.forEach(function (link, index) {
      link.classList.toggle('active', index === active);
      if (index === active) link.setAttribute('aria-current', 'location');
      else link.removeAttribute('aria-current');
    });
  }
  window.addEventListener('scroll', update, { passive: true });
  window.addEventListener('resize', update, { passive: true });
  update();
  document.querySelectorAll('.code').forEach(function (block) {
    var bar = block.querySelector('.bar');
    var pre = block.querySelector('pre');
    if (!bar || !pre) return;
    var button = document.createElement('button');
    button.type = 'button';
    button.className = 'copy-code';
    button.textContent = 'Copier';
    button.addEventListener('click', async function () {
      try {
        await navigator.clipboard.writeText(pre.textContent);
        button.textContent = 'Copié';
      } catch (_) {
        var range = document.createRange();
        range.selectNodeContents(pre);
        var selection = window.getSelection();
        selection.removeAllRanges();
        selection.addRange(range);
        button.textContent = 'Sélectionné : ⌘C / Ctrl+C';
      }
    });
    bar.appendChild(button);
  });
})();
