/* ============================================================================
   Linkju Docs — shared top navigation (single source of truth).
   Every page has <div id="site-nav"></div>; this injects the identical nav and
   marks the active link by filename. Add a page in ONE place: NAV_ITEMS below.
   ============================================================================ */
(function () {
  var NAV_ITEMS = [
    { href: 'mvp-research.html',   label: 'MVP 調研' },
    { href: 'pm-bd-playbook.html', label: 'PM/BD 框架' },
    { href: 'gtm-strategy.html',   label: 'GTM 策略' },
    { href: 'team.html',           label: '團隊' },
    { href: 'architecture.html',   label: '架構設計' },
    { href: 'cis-proposal.html',   label: '品牌 CIS' },
    { href: 'logo-concepts.html',  label: 'Logo 概念' },
  ];

  var path = location.pathname.split('/').pop() || 'index.html';

  var links = NAV_ITEMS.map(function (it) {
    var active = it.href === path ? ' active' : '';
    return '<a href="' + it.href + '" class="nav-link' + active + '">' + it.label + '</a>';
  }).join('');

  var homeActive = path === 'index.html' || path === '' ? ' active' : '';
  var html =
    '<nav class="topnav">' +
      '<a href="index.html" class="nav-logo' + homeActive + '">' +
        '<span class="logo-mark">◆</span> 鄰聚 Linkju Docs' +
      '</a>' +
      '<div class="nav-links">' + links + '</div>' +
    '</nav>';

  function mount() {
    var slot = document.getElementById('site-nav');
    if (slot) slot.outerHTML = html;
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mount);
  } else {
    mount();
  }
})();
