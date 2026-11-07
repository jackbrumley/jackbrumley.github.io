// Fills the "Other apps" footer from apps.js. The page provides the list
// element and names itself:
//
//   <ul class="app-tiles" data-other-apps data-current="rawtap"></ul>
//   <script src="https://brumley.info/shared/v1/apps.js" defer></script>
//   <script src="https://brumley.info/shared/v1/other-apps.js" defer></script>
//
// The page's own tile is highlighted (aria-current). Without this script
// the footer still has its "All apps" link to brumley.info.
(function () {
  'use strict';

  var script = document.currentScript;
  var iconBase = script ? script.src.replace(/[^/]*$/, '') + 'icons/' : 'https://brumley.info/shared/v1/icons/';
  var apps = window.BRUMLEY_APPS || [];
  var lists = document.querySelectorAll('[data-other-apps]');

  for (var l = 0; l < lists.length; l++) {
    var list = lists[l];
    var current = list.getAttribute('data-current');
    for (var i = 0; i < apps.length; i++) {
      var app = apps[i];
      var item = document.createElement('li');
      var link = document.createElement('a');
      link.className = 'app-tile' + (app.id === current ? ' is-current' : '');
      link.href = app.url;
      link.style.setProperty('--app', app.color);
      link.style.setProperty('--app-2', app.color2);
      if (app.id === current) link.setAttribute('aria-current', 'page');

      var tile = document.createElement('span');
      tile.className = 'tile';
      var icon = document.createElement('img');
      icon.src = iconBase + app.icon;
      icon.alt = '';
      icon.width = 34;
      icon.height = 34;
      tile.appendChild(icon);

      var name = document.createElement('span');
      name.className = 'app-name';
      name.textContent = app.name;

      link.appendChild(tile);
      link.appendChild(name);
      item.appendChild(link);
      list.appendChild(item);
    }
  }
})();
