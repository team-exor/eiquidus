const fs = require('fs');
const css_path = './public/css/';
const theme_selector_filename = '_theme-selector.scss';
const style_filename = 'style.scss';
const style_min_filename = 'style.min.css'
const custom_filename = 'custom.scss';
const custom_min_filename = 'custom.min.css'
const theme_selector_template_text = `$theme-name: "replace";`;
const settings = require('../lib/settings');
let compile_theme_css = false;
let compile_custom_css = false;
let theme_name = '';

// check if the theme selector file exists
if (!fs.existsSync(`${css_path}${theme_selector_filename}`)) {
  // theme file doesn't exist, so it is necessary to compile the css
  compile_theme_css = true;
} else {
  const last_theme = fs.readFileSync(`${css_path}${theme_selector_filename}`, 'utf-8');

  theme_name = settings.shared_pages.theme;

  // check if the theme name has changed since last run
  if (theme_selector_template_text.replace('replace', theme_name) != last_theme) {
    // theme name has changed, so it is necessary to compile the css
    compile_theme_css = true;
  } else if (!fs.existsSync(`${css_path}${style_min_filename}`)) {
    // the minified style file does not exist, so it is necessary to compile the css 
    compile_theme_css = true;
  } else {
    const style_stats = fs.statSync(`${css_path}${style_filename}`);
    const style_min_stats = fs.statSync(`${css_path}${style_min_filename}`);

    // check if the style file was last modified after the minified style file
    if (style_stats.mtime > style_min_stats.mtime) {
      // style file was modified since the style min file was created, so it is necessary to compile the css
      compile_theme_css = true;
    }
  }
}

// check if the minified custom file exists
if (!fs.existsSync(`${css_path}${custom_min_filename}`)) {
  // the minified custom file does not exist, so it is necessary to compile the css 
  compile_custom_css = true;
} else {
  const custom_stats = fs.statSync(`${css_path}${custom_filename}`);
  const custom_min_stats = fs.statSync(`${css_path}${custom_min_filename}`);

  // check if the custom file was last modified after the minified custom file
  if (custom_stats.mtime > custom_min_stats.mtime) {
    // custom file was modified since the custom min file was created, so it is necessary to compile the css
    compile_custom_css = true;
  }
}

// check if it necessary to compile any css files
if (compile_theme_css || compile_custom_css) {
  console.log(`${settings.localization.compiling_css}.. ${settings.localization.please_wait}..`);

  const sass = require('sass');

  // check if the theme css should be compiled
  if (compile_theme_css) {
    // ensure the selected theme is properly installed
    fs.writeFileSync(`${css_path}${theme_selector_filename}`, `$theme-name: "${theme_name}";`, 'utf-8');

    // generate minified css from style.scss file
    const minified = sass.compile(`${css_path}${style_filename}`, {style: 'compressed'});

    // save the minified css to file
    fs.writeFileSync(`${css_path}${style_min_filename}`, minified.css, 'utf-8');
  }

  // check if the custom css should be compiled
  if (compile_custom_css) {
    // generate minified css from custom.scss file
    const custom_minified = sass.compile(`${css_path}${custom_filename}`, {style: 'compressed'});

    // save the minified css to file
    fs.writeFileSync(`${css_path}${custom_min_filename}`, custom_minified.css, 'utf-8');
  }
}

// finished compiling css
process.exit(0);