$(document).ready(function() {
  /* Add custom javascript code here */

  // eIquidus toggles the sidebar labels with jQuery .show()/.hide(). jQuery
  // caches the computed display at hide time and restores it on show, which
  // here comes back as "block" and breaks the inline layout. Rewrite block ->
  // inline as it happens; leave "none" alone so collapsing still works.
  var labelSelector = '#side-nav-bar li.nav-item > a.nav-link > span:last-child';

  function fixDisplay(el) {
    if (el && el.style && el.style.display === 'block')
      el.style.display = 'inline';
  }

  var observer = new MutationObserver(function(mutations) {
    mutations.forEach(function(m) {
      if (m.type === 'attributes' && m.attributeName === 'style')
        fixDisplay(m.target);
    });
  });

  document.querySelectorAll(labelSelector).forEach(function(el) {
    fixDisplay(el);
    observer.observe(el, { attributes: true, attributeFilter: ['style'] });
  });
});
