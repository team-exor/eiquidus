const fs = require('fs');
const settings = require('../lib/settings');

console.log('Compiling CSS.. Please wait..');

// ensure the selected theme is properly installed
fs.writeFile('./public/css/_theme-selector.scss', `$theme-name: "${settings.shared_pages.theme}";`, function (err) {
  const sass = require('sass');

  // generate minified css from style.scss file
  const minified = sass.compile('./public/css/style.scss', {style: 'compressed'});

  // save the minified css to file
  fs.writeFile('./public/css/style.min.css', minified.css, function (err) {
    // generate minified css from custom.scss file
    const custom_minified = sass.compile('./public/css/custom.scss', {style: 'compressed'});

    // save the minified css to file
    fs.writeFile('./public/css/custom.min.css', custom_minified.css, function (err) {
      // finished compiling css
      process.exit(0);
    });
  });
});