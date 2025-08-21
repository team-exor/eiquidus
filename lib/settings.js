/**
* The Settings Module reads the settings out of settings.json and provides this information to the other modules
*/

// locale: Change language definitions. Only English is supported for now
exports.locale = "locale/en.json";

// dbsettings: a collection of settings that allow the explorer to connect to MongoDB
exports.dbsettings = {
  // user: The MongoDB username
  "user": "eiquidus",
  // password: The MongoDB password
  "password": "Nd^p2d77ceBX!L",
  // database: The MongoDB database name (default: explorerdb)
  "database": "explorerdb",
  // address: The MongoDB hostname. This should always be 'localhost' if connecting to a local instance, otherwise specify the ip address of a remote instance
  "address": "localhost",
  // port: The port # that MongoDB is configured to listen for requests on (default: 27017)
  "port": 27017
};

// wallet: a collection of settings that allow the explorer to connect to the coin wallet
exports.wallet = {
  // host: The hostname or ip address of the wallet to connect to (default: localhost)
  "host": "localhost",
  // port: The port # that the wallet is configured to listen for RPC requests on (default: 51573 for Exor wallet)
  "port": 51573,
  // username: The wallet RPC username
  "username": "exorrpc",
  // password: The wallet RPC password
  "password": "sSTLyCkrD94Y8&9mr^m6W^Mk367Vr!!K"
};

// webserver: a collection of settings that pertain to the node.js express web framework (read more: https://www.npmjs.com/package/express)
exports.webserver = {
  // port: Port # to configure the express webserver to listen for http requests on
  //       NOTE: Be sure to configure firewalls to allow traffic through this port or the explorer website may not be accessible remotely
  "port": process.env.PORT || 3001,
  // tls: a collection of settings that pertain to the TLS (Transport Layer Security) protocol feature (aka: ssl or https)
  "tls": {
    // enabled: Enable/disable TLS
    //          If set to true, the express webserver will be configured to use an https connection
    //          If set to false, all TLS features will be completely disabled
    "enabled": false,
    // port: Port # to configure the express webserver to listen for https requests on
    //       NOTE: Be sure to configure firewalls to allow traffic through this port or the explorer website may not be accessible remotely
    "port": 443,
    // always_redirect: Force all explorer traffic to use https
    //                  If set to true, all http web requests will automatically be forwarded to https
    //                  If set to false, the webserver will allow both http and https traffic
    "always_redirect": false,
    // cert_file: The absolute or relative path to the tls certificate file. Typically this file will be generated from certbot (read more: https://certbot.eff.org)
    "cert_file": "/etc/letsencrypt/live/domain-name-here/cert.pem",
    // chain_file: The absolute or relative path to the tls chain file. Typically this file will be generated from certbot (read more: https://certbot.eff.org)
    "chain_file": "/etc/letsencrypt/live/domain-name-here/chain.pem",
    // key_file: The absolute or relative path to the tls private key file. Typically this file will be generated from certbot (read more: https://certbot.eff.org)
    "key_file": "/etc/letsencrypt/live/domain-name-here/privkey.pem"
  },
  // cors: a collection of settings that pertain to the cors feature
  //       Cross-Origin Resource Sharing (CORS) support (read more: https://www.maxcdn.com/one/visual-glossary/cors/)
  //       Enable this setting to allow another website to access data from the explorer without violating the same-origin policy
  "cors": {
    // enabled: Enable/disable CORS
    //          If set to true, a new output header will be added to all http requests like this: Access-Control-Allow-Origin: <corsorigin>
    //          If set to false, the cors feature will be completely disabled
    "enabled": false,
    // corsorigin: Used to whitelist an http domain name for access to this explorer's resources
    //             The whitelisted domain must be in the format: https://example.com
    //             Specifying a "*" for the corsorigin will allow any domain to access the resources of this site
    "corsorigin": "*"
  }
};

// coin: a collection of settings that pertain to the cryptocurrency being explored
exports.coin = {
  // name: Name of the cryptocurrency coin being explored. This value is displayed in the page header when the "shared_pages.page_header.home_link" setting is set to "coin".
  //       NOTE: This value acts as a unique identifier for data stored in mongo and therefore cannot be changed without re-syncing all existing data.
  "name": "Exor",
  // symbol: The cryptocurrency coin ticker/symbol value. This value is displayed anywhere that coin data is displayed including the index, address, block, movement, reward, richlist/top100 and tx pages
  "symbol": "EXOR"
};

// network_history: a collection of settings that controls saving of extra historical network data during a block sync
exports.network_history = {
  // enabled: Enable/disable the saving of additional network history data (true/false)
  //          If set to false, historical data such as network hashrate and difficulty values will not be saved or available for network charts
  "enabled": true,
  // max_saved_records: The maximum # of blocks to save historical data for
  "max_saved_records": 120,
  // max_hours: The maximum # of hours to save historical data for. The max_saved_records value will supercede this value so be sure to set max_saved_records to 0 if wanting to display data for a certain number of hours
  "max_hours": 24
};

/* Shared page settings */

// shared_pages: a collection of settings that pertain to all webpages for the explorer
exports.shared_pages = {
  // theme: Change the look & feel of the explorer with a unique theme. Uses bootswatch themes (https://bootswatch.com)
  //        Valid options: Cerulean, Cosmo, Cyborg, Darkly, Exor, Flatly, Journal, Litera, Lumen, Lux, Materia, Minty, Morph, Pulse, Quartz, Sandstone, Simplex, Sketchy, Slate, Solar, Spacelab, Superhero, United, Vapor, Yeti, Zephyr
  //        (see /public/css/themes for available themes)
  "theme": "Exor",
  // page_title: The text to display at the end of the HTML title tag and also displayed in the page header when the "shared_pages.page_header.home_link" setting is set to "title"
  "page_title": "eIquidus",
  // favicons: a collection of image or icon files that are displayed in a browser window/tab and serve as branding for your website. Their main purpose is to help visitors locate your page easier when they have multiple tabs open
  //          Modern favicon sizes were inspired by this web article: https://www.emergeinteractive.com/insights/detail/The-Essentials-of-FavIcons/
  //          NOTE: If any of the favicons are left blank or not set to a valid file, they will be disabled and unused
  "favicons": {
    // favicon32: The path to a 32x32 image or icon file
    //            NOTE: The path root is /public
    "favicon32": "favicon-32.png",
    // favicon128: The path to a 128x128 image or icon file
    //            NOTE: The path root is /public
    "favicon128": "favicon-128.png",
    // favicon180: The path to a 180x180 image or icon file
    //            NOTE: The path root is /public
    "favicon180": "favicon-180.png",
    // favicon192: The path to a 192x192 image or icon file
    //            NOTE: The path root is /public
    "favicon192": "favicon-192.png"
  },
  // logo: The path to an image file that is displayed on the api page as well as in one of the top panels when enabled
  //       This logo can also be displayed in the header when the "shared_pages.page_header.home_link" setting is set to "logo" and the "shared_pages.page_header.home_link_logo" setting is blank or an invalid file
  //       NOTE: The path root is /public
  //             The optimum logo size is 128x128 as the image will be forced to 128px high when displayed
  "logo": "/img/logo.png",
  // date_time: a collection of settings that pertain to the date and time values displayed in the explorer
  "date_time": {
    // display_format: The format to use when displaying date/time values
    //                 Date/time values are formatted using the Luxon library and must follow the correct syntax (read more: https://moment.github.io/luxon/#/formatting?id=table-of-tokens)
    //                 Ex: LLL dd, yyyy HH:mm:ss ZZZZ = May 27, 2019 22:04:11 UTC
    "display_format": "LLL dd, yyyy HH:mm:ss ZZZZ",
    // timezone: All dates and times are stored as UTC dates and can either be displayed in UTC format or else they can be displayed in the local timezone according to a user's web browser settings
    //           valid options: utc or local
    "timezone": "utc",
    // enable_alt_timezone_tooltips: Determine if dates and times should have a mouse-over tooltip which displays an alternate timezone value
    //                               If set to true and the "shared_pages.date_time.timezone" setting is set to "utc" then enabling this option will display date/time tooltips in the local browser's timezone
    //                               If set to true and the "shared_pages.date_time.timezone" setting is set to "local" then enabling this option will display date/time tooltips in the UTC timezone
    //                               If set to false, no tooltips will be displayed for any date/time values
    "enable_alt_timezone_tooltips": false
  },
  // table_header_bgcolor: Change the background color of all table headers
  //                       valid options: light, dark or leave blank ( "" ) for default colors
  "table_header_bgcolor": "",
  // confirmations: Number of confirmations before a block or transaction can be considered valid
  //                if confirms are >= to this value then the block or tx is considered valid and shows up in green
  //                if confirms are < this value by more than 50% then the block or tx is considered unconfirmed and shows up in red
  //                if confirms are < this value by less than 50% then the block or tx is considered unconfirmed and shows up in orange
  "confirmations": 40,
  // difficulty: Determine which network difficulty value to display (valid options are: POW, POS or Hybrid)
  //             Some blockchains show different difficulty values depending on available POW/POS options:
  //             POW: Display the proof-of-work difficulty value
  //             POS: Display the proof-of-stake difficulty value
  //             Hybrid: Display both the proof-of-work and proof-of-stake difficulty values
  "difficulty": "POS",
  // show_hashrate: Determine whether to show network hash rate where applicable (true/false)
  //                If set to false, the /api/getnetworkhashps and /ext/getsummary apis will no longer show hash rate information, and the network hashrate chart will automatically be disabled
  "show_hashrate": true,
  // page_header: A collection of settings that pertain to the page header that is displayed at the top of all pages
  "page_header": {
    // menu: Valid options:
    //       top: display menu items horizontally across the top of the page
    //       side: display menu items vertically across the left-hand side of the page
    "menu": "top",
    // sticky_header: Determine whether page header "sticks" to top of page or not (true/false)
    "sticky_header": true,
    // bgcolor: Change the background color of the page header
    //          valid options: light, dark, primary, secondary, success, info, warning, danger or leave blank ( "" ) for default colors
    "bgcolor": "",
    // home_link: The home link setting determines what is displayed in the top-left corner of the header menu. Valid options:
    //            title: display "shared_pages.page_title" text setting
    //            coin: display "coin.name" text setting
    //            logo: display the "shared_pages.page_header.home_link_logo" image if it's set to a valid image, otherwise display the "shared_pages.logo" image
    "home_link": "logo",
    // home_link_logo: The path to a logo image that is displayed on page header when the "shared_pages.page_header.home_link" setting is set to "logo"
    //                 If the home_link_logo is left blank or not set to a valid file, the "shared_pages.page_header.home_link" = "logo" setting will automatically default to displaying the original "shared_pages.logo" instead of the "shared_pages.page_header.home_link_logo"
    //                 NOTE: The path root is /public
    "home_link_logo": "/img/header-logo.png",
    // home_link_logo_height: The max-height value of the "shared_pages.page_header.home_link" logo image (value in px, only valid if "shared_pages.page_header.home_link" = 'logo')
    "home_link_logo_height": 50,
    // panels: a collection of settings that pertain to the panels displayed on page header of all pages (NOTE: you can show/hide the entire group of panels on each page independently by changing the show_panels value in the settings for each page)
    //         A maximum of 5 panels can be shown across the top of the page at any time, so if more than 5 are enabled, only the first 5 will be shown
    "panels": {
      // network_panel: a collection of settings that pertain to the network panel which displays the current network hash rate (only applicable to POW coins)
      "network_panel": {
        // enabled: Enable/disable the network panel (true/false)
        //          If set to false, the network panel will be completely inaccessible
        "enabled": false,
        // display_order: Determine which order this panel is shown from 1-5
        //                1 = far left panel, 5 = far right panel
        //                The panel will be disabled with a value of 0
        "display_order": 0,
        // nethash: Determine how to acquire network hashrate. Valid options:
        //          getnetworkhashps: retrieved from getnetworkhashps rpc cmd
        //          netmhashps: retrieved from getmininginfo rpc cmd
        "nethash": "getnetworkhashps",
        // nethash_units: Determine which units should be used to display the network hashrate. Valid options:
        //                P: Display value in petahashes (PH/s)
        //                T: Display value in terahashes (TH/s)
        //                G: Display value in gigahashes (GH/s)
        //                M: Display value in megahashes (MH/s)
        //                K: Display value in kilohashes (KH/s)
        //                H: Display value in hashes (H/s)
        "nethash_units": "G"
      },
      // difficulty_panel: a collection of settings that pertain to the difficulty panel which displays the current proof-of-work difficulty (only applicable to POW coins)
      "difficulty_panel": {
        // enabled: Enable/disable the difficulty panel (true/false)
        //          If set to false, the difficulty panel will be completely inaccessible
        "enabled": false,
        // display_order: Determine which order this panel is shown from 1-5
        //                1 = far left panel, 5 = far right panel
        //                The panel will be disabled with a value of 0
        "display_order": 0
      },
      // masternodes_panel: a collection of settings that pertain to the masternode panel which displays a count of online and unreachable masternodes (only applicable to masternode coins)
      "masternodes_panel": {
        // enabled: Enable/disable the masternode panel (true/false)
        //          If set to false, the masternode panel will be completely inaccessible
        "enabled": true,
        // display_order: Determine which order this panel is shown from 1-5
        //                1 = far left panel, 5 = far right panel
        //                The panel will be disabled with a value of 0
        "display_order": 2
      },
      // coin_supply_panel: a collection of settings that pertain to the coin supply panel which displays the current circulating coin supply value
      "coin_supply_panel": {
        // enabled: Enable/disable the coin supply panel (true/false)
        //          If set to false, the coin supply panel will be completely inaccessible
        "enabled": true,
        // display_order: Determine which order this panel is shown from 1-5
        //                1 = far left panel, 5 = far right panel
        //                The panel will be disabled with a value of 0
        "display_order": 1
      },
      // price_panel: a collection of settings that pertain to the price panel which displays the current market price as determined by the markets_page.market_price value
      "price_panel": {
        // enabled: Enable/disable the price panel (true/false)
        //          If set to false, the price panel will be completely inaccessible
        "enabled": true,
        // display_order: Determine which order this panel is shown from 1-5
        //                1 = far left panel, 5 = far right panel
        //                The panel will be disabled with a value of 0
        "display_order": 4
      },
      // usd_price_panel: a collection of settings that pertain to the usd price panel which displays the current market price measured in USD
      "usd_price_panel": {
        // enabled: Enable/disable the usd price panel (true/false)
        //          If set to false, the usd price panel will be completely inaccessible
        "enabled": false,
        // display_order: Determine which order this panel is shown from 1-5
        //                1 = far left panel, 5 = far right panel
        //                The panel will be disabled with a value of 0
        "display_order": 0
      },
      // market_cap_panel: a collection of settings that pertain to the market cap panel which displays the current market cap value as determined by the markets_page.market_price value
      "market_cap_panel": {
        // enabled: Enable/disable the market cap panel (true/false)
        //          If set to false, the market cap panel will be completely inaccessible
        "enabled": true,
        // display_order: Determine which order this panel is shown from 1-5
        //                1 = far left panel, 5 = far right panel
        //                The panel will be disabled with a value of 0
        "display_order": 5
      },
      // usd_market_cap_panel: a collection of settings that pertain to the market cap panel which displays the current market cap value measured in USD
      "usd_market_cap_panel": {
        // enabled: Enable/disable the usd market cap panel (true/false)
        //          If set to false, the usd market cap panel will be completely inaccessible
        "enabled": false,
        // display_order: Determine which order this panel is shown from 1-5
        //                1 = far left panel, 5 = far right panel
        //                The panel will be disabled with a value of 0
        "display_order": 0
      },
      // logo_panel: a collection of settings that pertain to the logo panel which displays the selected "shared_pages.logo" image
      "logo_panel": {
        // enabled: Enable/disable the logo panel (true/false)
        //          If set to false, the logo panel will be completely inaccessible
        "enabled": true,
        // display_order: Determine which order this panel is shown from 1-5
        //                1 = far left panel, 5 = far right panel
        //                The panel will be disabled with a value of 0
        "display_order": 3
      },
      // spacer_panel_1: a collection of settings that pertain to the 1st spacer panel which allows inserting a blank space into the top panels
      //                 NOTE: spacer panels are only visible on desktop and tablet screen sizes and are hidden on mobile screens
      "spacer_panel_1": {
        // enabled: Enable/disable the spacer panel (true/false)
        //          If set to false, the spacer panel will be completely inaccessible
        "enabled": false,
        // display_order: Determine which order this panel is shown from 1-5
        //                1 = far left panel, 5 = far right panel
        //                The panel will be disabled with a value of 0
        "display_order": 0
      },
      // spacer_panel_2: a collection of settings that pertain to the 2nd spacer panel which allows inserting a blank space into the top panels
      //                 NOTE: spacer panels are only visible on desktop and tablet screen sizes and are hidden on mobile screens
      "spacer_panel_2": {
        // enabled: Enable/disable the spacer panel (true/false)
        //          If set to false, the spacer panel will be completely inaccessible
        "enabled": false,
        // display_order: Determine which order this panel is shown from 1-5
        //                1 = far left panel, 5 = far right panel
        //                The panel will be disabled with a value of 0
        "display_order": 0
      },
      // spacer_panel_3: a collection of settings that pertain to the 3rd spacer panel which allows inserting a blank space into the top panels
      //                 NOTE: spacer panels are only visible on desktop and tablet screen sizes and are hidden on mobile screens
      "spacer_panel_3": {
        // enabled: Enable/disable the spacer panel (true/false)
        //          If set to false, the spacer panel will be completely inaccessible
        "enabled": false,
        // display_order: Determine which order this panel is shown from 1-5
        //                1 = far left panel, 5 = far right panel
        //                The panel will be disabled with a value of 0
        "display_order": 0
      }
    },
    // search: A collection of settings that pertain to the search feature
    "search": {
      // enabled: Enable/disable the ability to search the explorer website (true/false)
      //          If set to false, the explorer will not display a search box or respond to search queries
      "enabled": true,
      // position: Determine where the search box should appear on the website
      //           valid options: inside-header, below-header
      "position": "inside-header"
    },
    // page_title_image: A collection of settings that pertain to the page title image for each page
    "page_title_image": {
      // image_path: The path to an image file that is displayed in the header section of all pages next to the page title (NOTE: This image can be enabled/disabled on a per-page basis)
      //             NOTE: The path root is /public
      //             The optimum logo size is 48x48 as the image will be forced to this size when displayed
      "image_path": "/img/page-title-img.png",
      // enable_animation: Enable/disable the flip/spin animation on the page title image (true/false)
      "enable_animation": true
    },
    // network_charts: A collection of settings that pertain to the network hashrate and difficulty line charts displayed on page header of all pages
    //                 NOTE: You can independently show/hide individual charts by changing the show_nethash_chart and show_difficulty_chart values in the settings for each page
    //                       The "network_history.enabled" setting must be set to true for network charts to work correctly
    //                       If the "network_history.enabled" setting is false, all network charts will be completely disabled, regardless of their independent settings
    "network_charts": {
      // nethash_chart: A collection of settings that pertain to the network hashrate chart
      "nethash_chart": {
        // enabled: Enable/disable the network hashrate chart (true/false)
        //          If set to false, the network hashrate chart will be completely inaccessible
        //          NOTE: The `shared_pages.show_hashrate` option must be set to true or else the network hashrate chart will be completely inaccessible
        "enabled": true,
        // chart_title: A collection of settings that pertain to the chart title
        "chart_title": {
          // enabled: Enable/disable the chart title (true/false)
          //          If set to false, the chart title will be completely absent from the chart
          "enabled": false,
          // title_text: The text to display in the chart title
          //             NOTE: You can add a "/n" character for a carriage return
          //             The following keywords can be used in the chart title:
          //             {coin_name}: Display the name of the coin from the `coin.name` setting
          //             {max_saved_records}: Display the number of records the chart is showing data for from the `network_history.max_saved_records` setting
          //             {max_hours}: Display the number of hours the chart is showing data for from the `network_history.max_hours` setting
          //             {current_nethash}: Display the most recent nethash value from the network chart data
          //             {highest_nethash}: Display the highest nethash value from the network chart data
          //             {lowest_nethash}: Display the lowest nethash value from the network chart data
          //             {highest_block}: Display the highest block height value from the network chart data
          //             {lowest_block}: Display the lowest block height value from the network chart data
          "title_text": "{coin_name} Network Hashrate History for the last {max_hours} hours\nHigh: {highest_nethash}\nCurrent: {current_nethash}\nLow: {lowest_nethash}\nBlock: {highest_block}",
          // alignment: Determine how to align the chart title text horizontally
          //            Valid options are left, center and right
          "alignment": "center",
          // color: Change the chart title text color
          //        Set this to any valid html color
          //        Ex: "#ffffff" or "rgba(255, 255, 255, 1)" or "white"
          "color": "#666666",
          // font: A collection of settings that pertain to the chart title font
          "font": {
            // family: The font to use for the chart title
            //         Valid options are: Arial, Verdana, Times New Roman, Georgia, Courier New, Tahoma
            "family": "Arial",
            // size: Determine the size of the font text in pixels
            "size": 20,
            // weight: Determine the thickness of the font text
            //         Valid options are: normal, bold, bolder, lighter, 100, 200, 300, 400, 500, 600, 700, 800, 900
            "weight": "bold"
          }
        },
        // legend: A collection of settings that pertain to the chart legend
        "legend": {
          // enabled: Enable/disable the chart legend (true/false)
          //          If set to false, the legend will be completely absent from the chart
          "enabled": true,
          // position: Determine where to position the chart legend
          //           Valid options are top, left, bottom and right
          "position": "bottom"
        },
        // bgcolor: Change the background color of the network hashrate chart
        //          Set this to any valid html color
        //          Ex: "#ffffff" or "rgba(255, 255, 255, 1)" or "white"
        "bgcolor": "#ffffff",
        // line_color: Change the line color of the network hashrate chart
        //             Set this to any valid html color
        //             Ex: "#ffffff" or "rgba(255, 255, 255, 1)" or "white"
        "line_color": "rgba(54, 162, 235, 1)",
        // fill_color: Change the fill color of the network hashrate chart
        //             Set this to any valid html color
        //             Ex: "#ffffff" or "rgba(255, 255, 255, 1)" or "white"
        "fill_color": "rgba(54, 162, 235, 0.2)",
        // crosshair_color: Change the vertical crosshair line color of the network hashrate chart
        //                  Set this to any valid html color
        //                  Ex: "#ffffff" or "rgba(255, 255, 255, 1)" or "white"
        "crosshair_color": "#000000",
        // block_line: A collection of settings that pertain to the vertical block line on the network hashrate chart
        "block_line": {
          // enabled: Enable/disable the vertical block line (true/false)
          //          If set to false, the vertical block line will be completely hidden from the chart
          //          NOTE: The `network_history.max_saved_records` option must also be set to 0 or else the vertical block line will be completely hidden from the chart
          "enabled": true,
          // block_line_color: Change the line color of the block data for the network hashrate chart
          //                   Set this to any valid html color
          //                   Ex: "#ffffff" or "rgba(255, 255, 255, 1)" or "white"
          "block_line_color": "rgba(0, 128, 0, 0.2)"
        },
        // round_decimals: Set how many decimal places the hash rates are rounded to (Max 20)
        //                 NOTE: Set to a value of -1 to output the raw value without rounding
        "round_decimals": 3,
        // chart_height: Height of chart in px
        "chart_height": 300,
        // full_row: Determine whether the chart will appear in its own row or can have another chart beside it in the same row
        //           If set to true, the chart will take up the full width of the page
        //           If set to false, and another chart is configured to display, the 2nd chart will appear beside this chart, both taking up 50% of the width of the screen
        //           NOTE: On smaller screens such as mobile phones and some tablets, each chart will take up it's own row regardless of what the full_row setting is set to due to limited screen real estate
        "full_row": false,
        // stretch_to_fit: Determine if the chart should be fit inside the surrounding chart box with or without padding
        //                 If set to true, the chart will take up the full available space inside the chart box
        //                 If set to false, there will be some padding on all 4 sides of the chart box
        "stretch_to_fit": false
      },
      // difficulty_chart: A collection of settings that pertain to the network difficulty chart
      "difficulty_chart": {
        // enabled: Enable/disable the network difficulty chart (true/false)
        //          If set to false, the network difficulty chart will be completely inaccessible
        "enabled": true,
        // chart_title: A collection of settings that pertain to the chart title
        "chart_title": {
          // enabled: Enable/disable the chart title (true/false)
          //          If set to false, the chart title will be completely absent from the chart
          "enabled": false,
          // title_text: The text to display in the chart title
          //             NOTE: You can add a "/n" character for a carriage return
          //             The following keywords can be used in the chart title:
          //             {coin_name}: Display the name of the coin from the `coin.name` setting
          //             {max_saved_records}: Display the number of records the chart is showing data for from the `network_history.max_saved_records` setting
          //             {max_hours}: Display the number of hours the chart is showing data for from the `network_history.max_hours` setting
          //             {current_pow_difficulty}: Display the most recent POW difficulty value from the network chart data
          //             {highest_pow_difficulty}: Display the highest POW difficulty value from the network chart data
          //             {lowest_pow_difficulty}: Display the lowest POW difficulty value from the network chart data
          //             {current_pos_difficulty}: Display the most recent POS difficulty value from the network chart data
          //             {highest_pos_difficulty}: Display the highest POS difficulty value from the network chart data
          //             {lowest_pos_difficulty}: Display the lowest POS difficulty value from the network chart data
          //             {highest_block}: Display the highest block height value from the network chart data
          //             {lowest_block}: Display the lowest block height value from the network chart data
          "title_text": "{coin_name} Difficulty Rate History for the last {max_hours} hours\nHigh: {highest_pos_difficulty}\nCurrent: {current_pos_difficulty}\nLow: {lowest_pos_difficulty}\nBlock: {highest_block}",
          // alignment: Determine how to align the chart title text horizontally
          //            Valid options are left, center and right
          "alignment": "center",
          // color: Change the chart title text color
          //        Set this to any valid html color
          //        Ex: "#ffffff" or "rgba(255, 255, 255, 1)" or "white"
          "color": "#666666",
          // font: A collection of settings that pertain to the chart title font
          "font": {
            // family: The font to use for the chart title
            //         Valid options are: Arial, Verdana, Times New Roman, Georgia, Courier New, Tahoma
            "family": "Arial",
            // size: Determine the size of the font text in pixels
            "size": 20,
            // weight: Determine the thickness of the font text
            //         Valid options are: normal, bold, bolder, lighter, 100, 200, 300, 400, 500, 600, 700, 800, 900
            "weight": "bold"
          }
        },
        // legend: A collection of settings that pertain to the chart legend
        "legend": {
          // enabled: Enable/disable the chart legend (true/false)
          //          If set to false, the legend will be completely absent from the chart
          "enabled": true,
          // position: Determine where to position the chart legend
          //           Valid options are top, left, bottom and right
          "position": "bottom"
        },
        // bgcolor: Change the background color of the network difficulty chart
        //          Set this to any valid html color
        //          Ex: "#ffffff" or "rgba(255, 255, 255, 1)" or "white"
        "bgcolor": "#ffffff",
        // pow_line_color: Change the line color of the network difficulty chart for POW coins
        //                 Set this to any valid html color
        //                 Ex: "#ffffff" or "rgba(255, 255, 255, 1)" or "white"
        "pow_line_color": "rgba(255, 99, 132, 1)",
        // pow_fill_color: Change the fill color of the network difficulty chart for POW coins
        //                 Set this to any valid html color
        //                 Ex: "#ffffff" or "rgba(255, 255, 255, 1)" or "white"
        "pow_fill_color": "rgba(255, 99, 132, 0.2)",
        // pos_line_color: Change the line color of the network difficulty chart for POS coins
        //                 Set this to any valid html color
        //                 Ex: "#ffffff" or "rgba(255, 255, 255, 1)" or "white"
        "pos_line_color": "rgba(255, 161, 0, 1)",
        // pos_fill_color: Change the fill color of the network difficulty chart for POS coins
        //                 Set this to any valid html color
        //                 Ex: "#ffffff" or "rgba(255, 255, 255, 1)" or "white"
        "pos_fill_color": "rgba(255, 161, 0, 0.2)",
        // crosshair_color: Change the vertical crosshair line color of the network difficulty chart
        //                  Set this to any valid html color
        //                  Ex: "#ffffff" or "rgba(255, 255, 255, 1)" or "white"
        "crosshair_color": "#000000",
        // block_line: A collection of settings that pertain to the vertical block line on the network difficulty chart
        "block_line": {
          // enabled: Enable/disable the vertical block line (true/false)
          //          If set to false, the vertical block line will be completely hidden from the chart
          //          NOTE: The `network_history.max_saved_records` option must also be set to 0 or else the vertical block line will be completely hidden from the chart
          "enabled": true,
          // block_line_color: Change the line color of the block data for the network difficulty chart
          //                   Set this to any valid html color
          //                   Ex: "#ffffff" or "rgba(255, 255, 255, 1)" or "white"
          "block_line_color": "rgba(0, 128, 0, 0.2)"
        },
        // round_decimals: Set how many decimal places the difficulty values are rounded to (Max 20)
        //                 NOTE: Set to a value of -1 to output the raw value without rounding
        "round_decimals": 3,
        // chart_height: Height of chart in px
        "chart_height": 300,
        // full_row: Determine whether the chart will appear in its own row or can have another chart beside it in the same row
        //           If set to true, the chart will take up the full width of the page
        //           If set to false, and another chart is configured to display, the 2nd chart will appear beside this chart, both taking up 50% of the width of the screen
        //           NOTE: On smaller screens such as mobile phones and some tablets, each chart will take up it's own row regardless of what the full_row setting is set to due to limited screen real estate
        "full_row": false,
        // stretch_to_fit: Determine if the chart should be fit inside the surrounding chart box with or without padding
        //                 If set to true, the chart will take up the full available space inside the chart box
        //                 If set to false, there will be some padding on all 4 sides of the chart box
        "stretch_to_fit": false
      },
      // reload_chart_seconds: The time in seconds to automatically reload the network chart data from the server
      //                       Set to 0 to disable automatic reloading of chart data
      "reload_chart_seconds": 60,
      // sync_charts: Determine if multiple network charts should be synced while cycling through different data points
      //              If set to true, all network charts will be synced so that when clicking on or moving the mouse cursor over a particular chart, all other network charts will also have their crosshairs set to the same data point for easy comparison
      //              If set to false, only the chart that is currently being manipulated will display a crosshair for the data point being viewed
      "sync_charts": false
    }
  },
  // page_footer: A collection of settings that pertain to the page footer that is displayed at the bottom of all pages
  "page_footer": {
    // sticky_footer: Determine whether the page footer "sticks" to bottom of the page or not (true/false)
    "sticky_footer": false,
    // bgcolor: Change the background color of the page footer
    //          valid options: light, dark, primary, secondary, success, info, warning, danger or leave blank ( "" ) for default colors
    "bgcolor": "",
    // Customize the height of the footer for the following screen sizes:
    // Mobile (0-575px)
    // Tablet (576-991px)
    // Desktop (>= 992px)
    // Supports any valid height value in pixels (Ex: "50px") or percent (Ex: "10%")
    // footer_height_desktop: Forced footer height value for desktop screens
    "footer_height_desktop": "50px",
    // footer_height_tablet: Forced footer height value for tablet screens
    "footer_height_tablet": "70px",
    // footer_height_mobile: Forced footer height value for mobile screens
    "footer_height_mobile": "70px",
    // social_links: a collection of settings that pertain to the social links on the page footer
    //               Add as many custom social links to be displayed in the page footer as desired
    //               For each entry you must fill in the image_path or fontawesome_class to determine the image or icon to show for the url link. It is not necessary to fill in both as only the 1st filled-in value will be used
    "social_links": [],
    // Customize the height of the social media links in the footer for the following screen sizes:
    // Mobile (0-575px)
    // Tablet (576-991px)
    // Desktop (>= 992px)
    // This is a percentage value and must be a positive number between 1-100
    // social_link_percent_height_desktop: Forced social link height percentage value for desktop screens
    "social_link_percent_height_desktop": 70,
    // social_link_percent_height_tablet: Forced social link height percentage value for tablet screens
    "social_link_percent_height_tablet": 42,
    // social_link_percent_height_mobile: Forced social link height percentage value for mobile screens
    "social_link_percent_height_mobile": 40,
    // powered_by_text: Customize the "powered by" text in the center of the footer with some custom html
    //                  NOTE: Add the keyword {explorer_version} to display the current version number of the explorer
    "powered_by_text": "<a class='nav-link poweredby' href='https://github.com/team-exor/eiquidus' target='_blank'>eIquidus Explorer v{explorer_version}</a>"
  }
};

/* Built-in Pages (cannot be disabled) */

// index_page: a collection of settings that pertain to the index page
exports.index_page = {
  // show_panels: Determine whether to show the panels configured in the shared_pages.page_header section across the top of this page (true/false)
  "show_panels": true,
  // show_nethash_chart: Determine whether to show the network hashrate chart configured in the shared_pages.network_charts.nethash_chart section across the top of this page (true/false)
  "show_nethash_chart": true,
  // show_difficulty_chart: Determine whether to show the network difficulty chart configured in the shared_pages.network_charts.difficulty_chart section across the top of this page (true/false)
  "show_difficulty_chart": true,
  // page_header: a collection of settings that pertain to the index page header
  "page_header": {
    // show_img: Determine whether to show the page title image defined in the "shared_pages.page_header.page_title_image" setting (true/false)
    "show_img": true,
    // show_title: Determine whether to show the page title as defined in "localization.ex_title" (true/false)
    "show_title": true,
    // show_last_updated: Determine whether to show a label below the page title with the last updated date (true/false)
    "show_last_updated": true,
    // show_description: Determine whether to show the page description as defined in "localization.ex_description" (true/false)
    "show_description": true
  },
  // transaction_table: a collection of settings that pertain to the transaction table on the index page
  //                    Table data is populated via the /ext/getlasttxs api
  "transaction_table": {
    // page_length_options: An array of page length options that determine how many items/records to display in the table at any given time
    //                      NOTE: Page length options will be limited based on the max_items_per_query for the /ext/getlasttxs api
    "page_length_options": [ 10, 25, 50, 75, 100, 250, 500, 1000 ],
    // items_per_page: The default amount of items/records to display in the table at any given time
    "items_per_page": 10,
    // reload_table_seconds: The time in seconds to automatically reload the table data from the server
    //                       Set to 0 to disable automatic reloading of table data
    "reload_table_seconds": 60
  },
  // show_extracted_by: Determine whether to show a new column with the address(es) that mined the block
  //                    If enabled, a new column will be displayed on the index page that displays the address(es) that mined the block for the coinbase transaction only
  "show_extracted_by": false
};

// block_page: a collection of settings that pertain to the block page
exports.block_page = {
  // show_panels: Determine whether to show the panels configured in the shared_pages.page_header section across the top of this page (true/false)
  "show_panels": false,
  // show_nethash_chart: Determine whether to show the network hashrate chart configured in the shared_pages.network_charts.nethash_chart section across the top of this page (true/false)
  "show_nethash_chart": false,
  // show_difficulty_chart: Determine whether to show the network difficulty chart configured in the shared_pages.network_charts.difficulty_chart section across the top of this page (true/false)
  "show_difficulty_chart": false,
  // page_header: a collection of settings that pertain to the block page header
  "page_header": {
    // show_img: Determine whether to show the page title image defined in the "shared_pages.page_header.page_title_image" setting (true/false)
    "show_img": true,
    // show_title: Determine whether to show the page title as defined in "localization.block_title" (true/false)
    "show_title": true,
    // show_description: Determine whether to show the page description as defined in "localization.block_description" (true/false)
    "show_description": true
  },
  // genesis_block: Your coins genesis block hash is used to determine the beginning of the blockchain
  //                For many bitcoin clones you can use the following cmd to get the block hash of the genesis block: coin-cli getblockhash 0
  //                NOTE: If this value is not entered correctly it will not be possible for the explorer to find or navigate to the genesis block, neither via block or transaction hash
  "genesis_block": "00014f36c648cdbc750f7dd28487a23cd9e0b0f95f5fccc5b5d01367e3f57469",
  // multi_algorithm: a collection of settings that can be used to show a new column with the hash algorithm that was used to mine a particular block for multi-algo coins
  //                  If enabled, a new column will be displayed on the block page and main transaction homepage that displays the hash algorithm used to mine a particular block or tx
  //                  NOTE: Changing any of the options in this section will require a full reindex of the blockchain data before previously synced blocks can display the algorithm
  "multi_algorithm": {
    // show_algo: Determine whether to read and display the hash algorithm that was used to mine a particular block for multi-algo coins
    //            NOTE: Enabling this option will require a full reindex of the blockchain data before previously synced blocks can display the algorithm
    "show_algo": false,
    // key_name: The name of the key or identifier in the raw block data that determines which hash algorithm was used to mine a particular block
    //           NOTE: Changing this option will require a full reindex of the blockchain data before previously synced blocks can display the algorithm
    "key_name": "pow_algo"
  },
  // show_extracted_by: Determine whether to show a new column with the address(es) that mined the block
  //                    If enabled, a new column will be displayed on the block page that displays the address(es) that mined the block
  "show_extracted_by": false
};

// transaction_page: a collection of settings that pertain to the transaction/tx page
exports.transaction_page = {
  // show_panels: Determine whether to show the panels configured in the shared_pages.page_header section across the top of this page (true/false)
  "show_panels": false,
  // show_nethash_chart: Determine whether to show the network hashrate chart configured in the shared_pages.network_charts.nethash_chart section across the top of this page (true/false)
  "show_nethash_chart": false,
  // show_difficulty_chart: Determine whether to show the network difficulty chart configured in the shared_pages.network_charts.difficulty_chart section across the top of this page (true/false)
  "show_difficulty_chart": false,
  // page_header: a collection of settings that pertain to the transaction/tx page header
  "page_header": {
    // show_img: Determine whether to show the page title image defined in the "shared_pages.page_header.page_title_image" setting (true/false)
    "show_img": true,
    // show_title: Determine whether to show the page title as defined in "localization.tx_title" (true/false)
    "show_title": true,
    // show_description: Determine whether to show the page description as defined in "localization.tx_description" (true/false)
    "show_description": true
  },
  // genesis_tx: Your coins genesis transaction hash is used to determine the beginning of the blockchain
  //             For many bitcoin clones you can use the following cmd to find the list of transaction hashes from the genesis block: coin-cli getblock 00014f36c648cdbc750f7dd28487a23cd9e0b0f95f5fccc5b5d01367e3f57469
  //             NOTE: If this value is not entered correctly it will not be possible for the explorer to find or navigate to the genesis block by searching for the genesis transaction hash
  "genesis_tx": "dd1d332ad2d8d8f49195056d482ae3c96fd2d16e9d166413b27ca7f19775644c",
  // show_op_return: Determine whether to decode and show OP_RETURN values that may have been embeddeded in a transaction
  //                 NOTE: Enabling this option will require a full reindex of the blockchain data before previously synced transactions can display the OP_RETURN value
  "show_op_return": false,
  // show_extracted_by: Determine whether to show a new column with the address(es) that mined the block
  //                    If enabled, a new column will be displayed on the transaction page that displays the address(es) that mined the block for the coinbase transaction only
  "show_extracted_by": false
};

// address_page: a collection of settings that pertain to the address page
exports.address_page = {
  // show_panels: Determine whether to show the panels configured in the shared_pages.page_header section across the top of this page (true/false)
  "show_panels": false,
  // show_nethash_chart: Determine whether to show the network hashrate chart configured in the shared_pages.network_charts.nethash_chart section across the top of this page (true/false)
  "show_nethash_chart": false,
  // show_difficulty_chart: Determine whether to show the network difficulty chart configured in the shared_pages.network_charts.difficulty_chart section across the top of this page (true/false)
  "show_difficulty_chart": false,
  // page_header: a collection of settings that pertain to the address page header
  "page_header": {
    // show_img: Determine whether to show the page title image defined in the "shared_pages.page_header.page_title_image" setting (true/false)
    "show_img": true,
    // show_title: Determine whether to show the page title as defined in "localization.a_title" (true/false)
    "show_title": true,
    // show_description: Determine whether to show the page description as defined in "localization.a_description" (true/false)
    "show_description": true
  },
  // show_sent_received: Determine whether to show Total Sent and Total Received columns at the top of the address page
  "show_sent_received": false,
  // enable_hidden_address_view: Determine whether to allow viewing the special 'hidden_address' wallet address which is populated anytime a private/hidden wallet address is involved in a transaction
  //                              NOTE: Enabling this option will add hyperlinks to all Hidden Addresses and allow viewing of the /address/hidden_address page
  //                                    Disabling this option will display all Hidden Addresses in plain-text without a hyperlink and visiting the /address/hidden_address page will result in a 404 error
  "enable_hidden_address_view": false,
  // enable_unknown_address_view: Determine whether to allow viewing the special 'unknown_address' wallet address which is populated anytime a wallet address cannot be deciphered
  //                              NOTE: Enabling this option will add hyperlinks to all Unknown Addresses and allow viewing of the /address/unknown_address page
  //                                    Disabling this option will display all Unknown Addresses in plain-text without a hyperlink and visiting the /address/unknown_address page will result in a 404 error
  "enable_unknown_address_view": false,
  // history_table: a collection of settings that pertain to the history table on the address page
  //                Table data is populated via the /ext/getaddresstxs api
  "history_table": {
    // page_length_options: An array of page length options that determine how many items/records to display in the table at any given time
    //                      NOTE: Page length options will be limited based on the max_items_per_query for the /ext/getaddresstxs api
    "page_length_options": [ 10, 25, 50, 75, 100, 250, 500, 1000 ],
    // items_per_page: The default amount of items/records to display in the table at any given time
    "items_per_page": 50
  }
};

// error_page: a collection of settings that pertain to the error page
exports.error_page = {
  // show_panels: Determine whether to show the panels configured in the shared_pages.page_header section across the top of this page (true/false)
  "show_panels": false,
  // show_nethash_chart: Determine whether to show the network hashrate chart configured in the shared_pages.network_charts.nethash_chart section across the top of this page (true/false)
  "show_nethash_chart": false,
  // show_difficulty_chart: Determine whether to show the network difficulty chart configured in the shared_pages.network_charts.difficulty_chart section across the top of this page (true/false)
  "show_difficulty_chart": false,
  // page_header: a collection of settings that pertain to the error page header
  "page_header": {
    // show_img: Determine whether to show the page title image defined in the "shared_pages.page_header.page_title_image" setting (true/false)
    "show_img": true,
    // show_title: Determine whether to show the page title as defined in "localization.error_title" (true/false)
    "show_title": true,
    // show_description: Determine whether to show the page description as defined in "localization.error_description" (true/false)
    "show_description": true
  }
};

/* Additional Pages (can be enabled/disabled via settings) */

// masternodes_page: a collection of settings that pertain to the masternodes page
exports.masternodes_page = {
  // enabled: Enable/disable the masternodes page (true/false)
  //          If set to false, the masternodes page will be completely inaccessible
  "enabled": true,
  // show_panels: Determine whether to show the panels configured in the shared_pages.page_header section across the top of this page (true/false)
  "show_panels": false,
  // show_nethash_chart: Determine whether to show the network hashrate chart configured in the shared_pages.network_charts.nethash_chart section across the top of this page (true/false)
  "show_nethash_chart": false,
  // show_difficulty_chart: Determine whether to show the network difficulty chart configured in the shared_pages.network_charts.difficulty_chart section across the top of this page (true/false)
  "show_difficulty_chart": false,
  // page_header: a collection of settings that pertain to the masternodes page header
  "page_header": {
    // show_img: Determine whether to show the page title image defined in the "shared_pages.page_header.page_title_image" setting (true/false)
    "show_img": true,
    // show_title: Determine whether to show the page title as defined in "localization.mn_title" (true/false)
    "show_title": true,
    // show_last_updated: Determine whether to show a label below the page title with the last updated date (true/false)
    "show_last_updated": true,
    // show_description: Determine whether to show the page description as defined in "localization.mn_description" (true/false)
    "show_description": true
  },
  // masternode_table: a collection of settings that pertain to the masternode table on the masternodes page
  //                   Table data is populated via the /ext/getmasternodelist api
  "masternode_table": {
    // page_length_options: An array of page length options that determine how many items/records to display in the table at any given time
    "page_length_options": [ 10, 25, 50, 75, 100, 250, 500, 1000 ],
    // items_per_page: The default amount of items/records to display in the table at any given time
    "items_per_page": 10
  }
};

// movement_page: a collection of settings that pertain to the movement page
exports.movement_page = {
  // enabled: Enable/disable the movement page (true/false)
  //          If set to false, the movement page will be completely inaccessible
  "enabled": true,
  // show_panels: Determine whether to show the panels configured in the shared_pages.page_header section across the top of this page (true/false)
  "show_panels": false,
  // show_nethash_chart: Determine whether to show the network hashrate chart configured in the shared_pages.network_charts.nethash_chart section across the top of this page (true/false)
  "show_nethash_chart": false,
  // show_difficulty_chart: Determine whether to show the network difficulty chart configured in the shared_pages.network_charts.difficulty_chart section across the top of this page (true/false)
  "show_difficulty_chart": false,
  // page_header: a collection of settings that pertain to the movement page header
  "page_header": {
    // show_img: Determine whether to show the page title image defined in the "shared_pages.page_header.page_title_image" setting (true/false)
    "show_img": true,
    // show_title: Determine whether to show the page title as defined in "localization.move_title" (true/false)
    "show_title": true,
    // show_last_updated: Determine whether to show a label below the page title with the last updated date (true/false)
    "show_last_updated": true,
    // show_description: Determine whether to show the page description as defined in "localization.move_description" (true/false)
    "show_description": true
  },
  // movement_table: a collection of settings that pertain to the movement table on the movement page
  //                 Table data is populated via the /ext/getlasttxs api
  "movement_table": {
    // page_length_options: An array of page length options that determine how many items/records to display in the table at any given time
    //                      NOTE: Page length options will be limited based on the max_items_per_query for the /ext/getlasttxs api
    "page_length_options": [ 10, 25, 50, 75, 100, 250, 500, 1000 ],
    // items_per_page: The default amount of items/records to display in the table at any given time
    "items_per_page": 10,
    // reload_table_seconds: The time in seconds to automatically reload the table data from the server
    //                       Set to 0 to disable automatic reloading of table data
    "reload_table_seconds": 45,
    // min_amount: The minimum number of coins that need to be received in a single transaction to show up on the movement page
    "min_amount": 5000,
    // low low_warning_flag: Flag all transactions in yellow/orange that are sent with coin amounts above this value
    "low_warning_flag": 50000,
    // high_warning_flag: Flag all transactions in red that are sent with coin amounts above this value
    "high_warning_flag": 100000
  }
};

// network_page: a collection of settings that pertain to the network page
exports.network_page = {
  // enabled: Enable/disable the network page (true/false)
  //          If set to false, the network page will be completely inaccessible
  "enabled": true,
  // show_panels: Determine whether to show the panels configured in the shared_pages.page_header section across the top of this page (true/false)
  "show_panels": false,
  // show_nethash_chart: Determine whether to show the network hashrate chart configured in the shared_pages.network_charts.nethash_chart section across the top of this page (true/false)
  "show_nethash_chart": false,
  // show_difficulty_chart: Determine whether to show the network difficulty chart configured in the shared_pages.network_charts.difficulty_chart section across the top of this page (true/false)
  "show_difficulty_chart": false,
  // page_header: a collection of settings that pertain to the network page header
  "page_header": {
    // show_img: Determine whether to show the page title image defined in the "shared_pages.page_header.page_title_image" setting (true/false)
    "show_img": true,
    // show_title: Determine whether to show the page title as defined in "localization.net_title" (true/false)
    "show_title": true,
    // show_last_updated: Determine whether to show a label below the page title with the last updated date (true/false)
    "show_last_updated": true,
    // show_description: Determine whether to show the page description as defined in "localization.net_description" (true/false)
    "show_description": true
  },
  // connections_table: a collection of settings that pertain to the connections table on the network page
  //                    Table data is populated via the /ext/getnetworkpeers api
  "connections_table": {
    // enabled: Enable/disable the connections table (true/false)
    //          If set to false, the connections table will be completely inaccessible
    "enabled": true,
    // page_length_options: An array of page length options that determine how many items/records to display in the table at any given time
    "page_length_options": [ 10, 25, 50, 75, 100 ],
    // items_per_page: The default amount of items/records to display in the table at any given time
    "items_per_page": 10,
    // port_filter: Specify a port number to only allow showing peers on the selected port.
    //              Set this value to 0 to show all peers on any port.
    //              Set this value to -1 to hide the port column. NOTE: If the -1 value is set then instead of showing multiple duplicate rows for ip addresses that connected on different ports, only a single row will be shown per unique ip address
    "port_filter": 0,
    // hide_protocols: An array of protocol numbers that will be filtered out of the table results
    //                 If a peer connects to the explorer wallet with one of these protocol numbers, that record will not be displayed in this table
    //                 Add as many protocol values as necessary in the following format: [ 0, 70803, 70819 ]
    "hide_protocols": [ ]
  },
  // addnodes_table: a collection of settings that pertain to the add nodes table on the network page
  //                 Table data is populated via the /ext/getnetworkpeers api
  "addnodes_table": {
    // enabled: Enable/disable the addnodes table (true/false)
    //          If set to false, the addnodes table will be completely inaccessible
    "enabled": true,
    // page_length_options: An array of page length options that determine how many items/records to display in the table at any given time
    "page_length_options": [ 10, 25, 50, 75, 100 ],
    // items_per_page: The default amount of items/records to display in the table at any given time
    "items_per_page": 10,
    // port_filter: Specify a port number to only allow showing peers on the selected port.
    //              Set this value to 0 to show all peers on any port.
    //              Set this value to -1 to prevent the port portion of the addnode string from being displayed. NOTE: If the -1 value is set then instead of showing multiple duplicate rows for ip addresses that connected on different ports, only a single row will be shown per unique ip address
    "port_filter": 0,
    // hide_protocols: An array of protocol numbers that will be filtered out of the table results
    //                 If a peer connects to the explorer wallet with one of these protocol numbers, that record will not be displayed in this table
    //                 Add as many protocol values as necessary in the following format: [ 0, 70803, 70819 ]
    "hide_protocols": [ ]
  },
  // onetry_table: a collection of settings that pertain to the one try table on the network page
  //               Table data is populated via the /ext/getnetworkpeers api
  "onetry_table": {
    // enabled: Enable/disable the onetry table (true/false)
    //          If set to false, the onetry table will be completely inaccessible
    "enabled": true,
    // page_length_options: An array of page length options that determine how many items/records to display in the table at any given time
    "page_length_options": [ 10, 25, 50, 75, 100 ],
    // items_per_page: The default amount of items/records to display in the table at any given time
    "items_per_page": 10,
    // port_filter: Specify a port number to only allow showing peers on the selected port.
    //              Set this value to 0 to show all peers on any port.
    //              Set this value to -1 to prevent the port portion of the onetry string from being displayed. NOTE: If the -1 value is set then instead of showing multiple duplicate rows for ip addresses that connected on different ports, only a single row will be shown per unique ip address
    "port_filter": 0,
    // hide_protocols: An array of protocol numbers that will be filtered out of the table results
    //                 If a peer connects to the explorer wallet with one of these protocol numbers, that record will not be displayed in this table
    //                 Add as many protocol values as necessary in the following format: [ 0, 70803, 70819 ]
    "hide_protocols": [ ]
  }
};

// richlist_page: a collection of settings that pertain to the richlist/top100 page
exports.richlist_page = {
  // enabled: Enable/disable the richlist/top100 page (true/false)
  //          If set to false, the richlist/top100 page will be completely inaccessible
  "enabled": true,
  // show_panels: Determine whether to show the panels configured in the shared_pages.page_header section across the top of this page (true/false)
  "show_panels": false,
  // show_nethash_chart: Determine whether to show the network hashrate chart configured in the shared_pages.network_charts.nethash_chart section across the top of this page (true/false)
  "show_nethash_chart": false,
  // show_difficulty_chart: Determine whether to show the network difficulty chart configured in the shared_pages.network_charts.difficulty_chart section across the top of this page (true/false)
  "show_difficulty_chart": false,
  // page_header: a collection of settings that pertain to the richlist/top100 page header
  "page_header": {
    // show_img: Determine whether to show the page title image defined in the "shared_pages.page_header.page_title_image" setting (true/false)
    "show_img": true,
    // show_title: Determine whether to show the page title as defined in "localization.rl_title" (true/false)
    "show_title": true,
    // show_last_updated: Determine whether to show a label below the page title with the last updated date (true/false)
    "show_last_updated": true,
    // show_description: Determine whether to show the page description as defined in "localization.rl_description" (true/false)
    "show_description": true
  },
  // show_current_balance: Determine whether to show the top 100 list of wallet addresses that currently have the most coins in a single wallet (true/false)
  "show_current_balance": true,
  // show_received_coins: Determine whether to show the top 100 list of wallet addresses that have the highest total number of coins received based on adding up all received transactions (true/false)
  "show_received_coins": true,
  // wealth_distribution: a collection of settings that pertain to the wealth distribution section of the richlist/top100 page
  //                      This section features a summary table with the breakdown of coins owned by the top 1-25, 26-50, 51-75, 76-100, 101+ wallets and all burned coins plus an associated pie chart
  "wealth_distribution": {
    // show_distribution_table: Show/hide the wealth distribution summary table with the breakdown of coins owned by the top 1-25, 26-50, 51-75, 76-100, 101+ wallets and all burned coins (true/false)
    //                          If set to false, the wealth distribution table will be completely hidden
    "show_distribution_table": true,
    // show_distribution_chart: Show/hide the wealth distribution pie chart with the breakdown of coins owned by the top 1-25, 26-50, 51-75, 76-100, 101+ wallets and all burned coins (true/false)
    //                          If set to false, the wealth distribution pie chart will be completely hidden
    "show_distribution_chart": true,
    // colors: An array of html color codes to represent the top 100 groupings in the wealth distribution table and pie chart
    //         From left-to-right the 6 colors are represented as the following: "top 1-25", "top 26-50", "top 51-75", "top 76-100", "101+" and "burned coins" - which is used if the include_burned_coins_in_distribution setting is enabled
    "colors": [ "#e73cbd", "#00bc8c", "#3498db", "#e3ce3e", "#adb5bd", "#e74c3c" ],
    // show_address_count: Show/hide the total count of all unique addresses used in at least 1 transaction at the bottom of the wealth distribution table
    //                     If set to true, the address count will be determined at the end of the richlist sync and displayed in the wealth distribution table
    //                     If set to false, the richlist sync will finish faster because the address count will not be looked up and not displayed in the wealth distribution table
    "show_address_count": false
  },
  // burned_coins: a collection of settings that pertain to the wallet addresses that should not appear in the richlist/top100 page
  //               NOTE: These settings won't take effect until after running (and completing) a normal index sync or reindex-rich
  "burned_coins": {
    // addresses: An array of wallet addresses to exclude from the richlist/top100 page
    //            Use this setting to prevent specific wallet addresses from being displayed in the rich list and wealth distribution chart sections
    //            These wallet addresses will be completely removed from the rich list, but will still be viewable and accessible via the rest of the explorer pages as per normal
    //            Add as many wallet addresses as necessary in the following format: [ "EPUzEEHa45Rsn87WBos6SqkZZ8GrsfgvtZ", "EUzgat1r5AFyoTXK5WgTyM8kABPJY1SX7E" ]
    "addresses": [ "EXorBurnAddressXXXXXXXXXXXXXW7cDZQ" ],
    // include_burned_coins_in_distribution: Determine whether to include burned coins in the wealth distribution section or not
    //                                       This setting will need to be changed depending on whether your main coin supply value already has the burned coins removed from its total or not
    //                                       Set this value to false if your blockchain already has a mechanism for removing burned coins from the total supply and the burned coins will not be included in the distribution totals
    //                                       Set this value to true if your blockchain still has the burned coins included in its total supply and a 'Burned Coins' section will be added to the distribution table and chart
    "include_burned_coins_in_distribution": false
  }
};

// markets_page: a collection of settings that pertain to the markets page
exports.markets_page = {
  // enabled: Enable/disable the markets pages (true/false)
  //          If set to false, all market pages will be completely inaccessible
  "enabled": false,
  // show_panels: Determine whether to show the panels configured in the shared_pages.page_header section across the top of this page (true/false)
  "show_panels": false,
  // show_nethash_chart: Determine whether to show the network hashrate chart configured in the shared_pages.network_charts.nethash_chart section across the top of this page (true/false)
  "show_nethash_chart": false,
  // show_difficulty_chart: Determine whether to show the network difficulty chart configured in the shared_pages.network_charts.difficulty_chart section across the top of this page (true/false)
  "show_difficulty_chart": false,
  // page_header: a collection of settings that pertain to the markets page header
  "page_header": {
    // show_img: Determine whether to show the page title image defined in the "shared_pages.page_header.page_title_image" setting (true/false)
    "show_img": true,
    // show_title: Determine whether to show the page title as defined in "localization.mkt_title" (true/false)
    "show_title": true,
    // show_last_updated: Determine whether to show a label below the page title with the last updated date (true/false)
    "show_last_updated": true,
    // show_exchange_url: Determine whether to show an external link to the exchange trading page for the selected pair (true/false)
    "show_exchange_url": true,
    // show_description: Determine whether to show the page description as defined in "localization.mkt_description" (true/false)
    "show_description": true
  },
  // show_market_dropdown_menu: Determine whether the markets menu in the page header will function as a dropdown or a single-click menu item that opens the default market (true/false)
  //                            If set to true, the markets header menu will function as a dropdown that allows selecting from all available markets
  //                            If set to false, the markets header menu will function as a single-click menu item that opens the default market only
  //                            NOTE: The dropdown will only work when 2 or more markets are enabled, otherwise it will default to a single-click menu item automatically
  "show_market_dropdown_menu": true,
  // show_market_select: Determine whether all market pages will display a clickable list of enabled markets near the top of the page for quick selection or not (true/false)
  //                     If set to true, then all market pages will display a clickable list of enabled markets near the top of the page for quick selection
  //                     If set to false, then no market select box will be shown on market pages
  //                     NOTE: The market select box will only be visible when 2 or more markets are enabled, otherwise it will be hidden automatically
  "show_market_select": true,
  // exchanges: Enable/disable api integration with any of the available built-in exchanges
  //            Enabled exchanges display a number of exchange-related metrics including market summary, 24 hour chart, most recent buy/sell orders and latest trade history
  //            Supported exchanges: altmarkets, dex-trade, dexomy, freiexchange/freixlite, nonkyc, poloniex, xeggex, yobit
  "exchanges": {
    // altmarkets: a collection of settings that pertain to the altmarkets exchange
    "altmarkets": {
      // enabled: Enable/disable the altmarkets exchange (true/false)
      //          If set to false, the altmarkets page will be completely inaccessible and no market data will be downloaded for this exchange
      "enabled": false,
      // trading_pairs: An array of market trading pair symbols
      //                You can add as many trading pairs as necessary
      //                All entries must specify your coins symbol as it is displayed on the exchange, followed by a slash (/) and ending with the symbol of the market or asset that is being traded against
      //                Ex: "LTC/BTC", "LTC/USDT", "LTC/ETH"
      "trading_pairs": [ "LTC/BTC", "LTC/ETH" ]
    },
    // dextrade: a collection of settings that pertain to the dex-trade exchange    
    "dextrade": {
      // enabled: Enable/disable the dex-trade exchange (true/false)
      //          If set to false, the dex-trade page will be completely inaccessible and no market data will be downloaded for this exchange
      "enabled": false,
      // trading_pairs: An array of market trading pair symbols
      //                You can add as many trading pairs as necessary
      //                All entries must specify your coins symbol as it is displayed on the exchange, followed by a slash (/) and ending with the symbol of the market or asset that is being traded against
      //                Ex: "LTC/BTC", "LTC/USDT", "LTC/ETH"
      "trading_pairs": [ "LTC/BTC" ]
    },
    // dexomy: a collection of settings that pertain to the dexomy exchange    
    "dexomy": {
      // enabled: Enable/disable the dexomy exchange (true/false)
      //          If set to false, the dexomy page will be completely inaccessible and no market data will be downloaded for this exchange
      "enabled": false,
      // trading_pairs: An array of market trading pair symbols
      //                You can add as many trading pairs as necessary
      //                All entries must specify your coins symbol as it is displayed on the exchange, followed by a slash (/) and ending with the symbol of the market or asset that is being traded against
      //                Ex: "LTC/BTC", "LTC/USDT", "LTC/ETH"
      "trading_pairs": [ "BTC/USDT" ]
    },
    // freiexchange: a collection of settings that pertain to the freiexchange/freixlite exchange
    //               NOTE: freiexchange does not display a 24-hour chart due to a lack of OHLCV api data
    "freiexchange": {
      // enabled: Enable/disable the freiexchange/freixlite exchange (true/false)
      //          If set to false, the freiexchange/freixlite page will be completely inaccessible and no market data will be downloaded for this exchange
      "enabled": false,
      // trading_pairs: An array of market trading pair symbols
      //                You can add as many trading pairs as necessary
      //                All entries must specify your coins symbol as it is displayed on the exchange, followed by a slash (/) and ending with the symbol of the market or asset that is being traded against
      //                Ex: "LTC/BTC", "LTC/USDT", "LTC/ETH"
      "trading_pairs": [ "LTC/BTC" ]
    },
    // nonkyc: a collection of settings that pertain to the nonkyc exchange
    "nonkyc": {
      // enabled: Enable/disable the nonkyc exchange (true/false)
      //          If set to false, the nonkyc page will be completely inaccessible and no market data will be downloaded for this exchange
      "enabled": false,
      // trading_pairs: An array of market trading pair symbols
      //                You can add as many trading pairs as necessary
      //                All entries must specify your coins symbol as it is displayed on the exchange, followed by a slash (/) and ending with the symbol of the market or asset that is being traded against
      //                Ex: "LTC/BTC", "LTC/USDT", "LTC/ETH"
      "trading_pairs": [ "LTC/USDT" ]
    },
    // poloniex: a collection of settings that pertain to the poloniex exchange
    "poloniex": {
      // enabled: Enable/disable the poloniex exchange (true/false)
      //          If set to false, the poloniex page will be completely inaccessible and no market data will be downloaded for this exchange
      "enabled": false,
      // trading_pairs: An array of market trading pair symbols
      //                You can add as many trading pairs as necessary
      //                All entries must specify your coins symbol as it is displayed on the exchange, followed by a slash (/) and ending with the symbol of the market or asset that is being traded against
      //                Ex: "LTC/BTC", "LTC/USDT", "LTC/ETH"
      "trading_pairs": [ "LTC/BTC" ]
    },
    // xeggex: a collection of settings that pertain to the xeggex exchange
    "xeggex": {
      // enabled: Enable/disable the xeggex exchange (true/false)
      //          If set to false, the xeggex page will be completely inaccessible and no market data will be downloaded for this exchange
      "enabled": false,
      // trading_pairs: An array of market trading pair symbols
      //                You can add as many trading pairs as necessary
      //                All entries must specify your coins symbol as it is displayed on the exchange, followed by a slash (/) and ending with the symbol of the market or asset that is being traded against
      //                Ex: "LTC/BTC", "LTC/USDT", "LTC/ETH"
      "trading_pairs": [ "LTC/USDT" ]
    },
    // yobit: a collection of settings that pertain to the yobit exchange
    //        NOTE: yobit does not display a 24-hour chart due to a lack of OHLCV api data
    "yobit": {
      // enabled: Enable/disable the yobit exchange (true/false)
      //          If set to false, the yobit page will be completely inaccessible and no market data will be downloaded for this exchange
      "enabled": false,
      // trading_pairs: An array of market trading pair symbols
      //                You can add as many trading pairs as necessary
      //                All entries must specify your coins symbol as it is displayed on the exchange, followed by a slash (/) and ending with the symbol of the market or asset that is being traded against
      //                Ex: "LTC/BTC", "LTC/USDT", "LTC/ETH"
      "trading_pairs": [ "LTC/BTC" ]
    }
  },
  // market_price: Determine how to calculate the market price
  //               NOTE: The market price is always retrieved at the end of the market sync process
  //               Valid options:
  //               AVERAGE : Market price is calculated based on averaging all supported exchange trading pairs that are enabled in the explorer and measured in the default_exchange.trading_pair value
  //               COINGECKO : Market price is retrieved directly from the coingecko api. This option is somewhat special in that it does not require the markets_page option or any supported markets to be set up or enabled to function correctly
  "market_price": "AVERAGE",
  // coingecko_currency: Determine the default cryptocurrency value to measure your coin against when using the COINGECKO market_price option
  //                     NOTE: This value is only necessary to fill out if you set market_price = "COINGECKO".
  //                           This can be any cryptocurrency symbol value that the coingecko api supports such as BTC or ETH for example.
  //                           Although the coingecko api supports multiple different currencies, the explorer only supports 1 cryptocurrency market price and therefore specifying multiple currencies separated by commas will not work here.
  //                           The USD fiat currency is also built-in and automatically returned from the coingecko api so there is no need to specify USD here.
  //                           For more information about which currency values are supported, you can review the vs_currencies parameter of the /simple/price api from here: https://www.coingecko.com/api/documentation
  "coingecko_currency": "BTC",
  // "coingecko_api_key": Supply a free or paid coingecko api key for fetching USD price and/or market price via the market_price = "COINGECKO" option
  //                      NOTE: As of Feb 2024, the free "keyless" coingecko api will be deprecated and require an api key to continue use
  "coingecko_api_key": "",
  // default_exchange: a collection of settings that pertain to the default exchange
  //                   When the "show_market_dropdown_menu" setting is disabled, the market header menu will navigate directly to the default exchange page
  //                   The default_exchange.trading_pair is used to determine the last market price when the market_price value is set to AVERAGE
  //                   If left blank or filled out incorrectly, the first enabled exchange and trading pair will be used as the default exchange
  "default_exchange": {
    // exchange_name: The name of the default exchange must exactly match the name of an exchange in the "exchanges" setting above
    //                See the list of supported exchanges above for the list of supported exchange names
    "exchange_name": "freiexchange",
    // trading_pair: The name of the trading pair for the default exchange must exactly match the name of a trading pair from the "exchanges" setting above
    "trading_pair": "LTC/BTC"
  }
};

// api_page: a collection of settings that pertain to the api page
exports.api_page = {
  // enabled: Enable/disable the public api system (true/false)
  //          If set to false, the entire api page will be disabled and all public api endpoints will show a "This method is disabled" msg when called regardless of their individual enabled statuses
  "enabled": true,
  // show_panels: Determine whether to show the panels configured in the shared_pages.page_header section across the top of this page (true/false)
  "show_panels": false,
  // show_nethash_chart: Determine whether to show the network hashrate chart configured in the shared_pages.network_charts.nethash_chart section across the top of this page (true/false)
  "show_nethash_chart": false,
  // show_difficulty_chart: Determine whether to show the network difficulty chart configured in the shared_pages.network_charts.difficulty_chart section across the top of this page (true/false)
  "show_difficulty_chart": false,
  // page_header: a collection of settings that pertain to the api page header
  "page_header": {
    // show_img: Determine whether to show the page title image defined in the "shared_pages.page_header.page_title_image" setting (true/false)
    "show_img": true,
    // show_title: Determine whether to show the page title as defined in "localization.api_title" (true/false)
    "show_title": true,
    // show_description: Determine whether to show the page description as defined in "localization.api_description" (true/false)
    "show_description": true
  },
  // show_logo: Determine whether to show the `shared_pages.logo` image at the top of the API Documentation panel or not
  "show_logo": true,
  // sample_data: a collection of settings that pertain to the sample data that is used to display example api links to real data
  "sample_data": {
    // blockindex: This value can be any valid block height number from your coins blockchain
    //             NOTE: This value is only used to build example api links on the api page from the /api/getblockhash api for example
    "blockindex": 64152,
    // blockhash: This value can be any valid block hash from your coins blockchain
    //            For many bitcoin clones you can use the following cmd to get the block hash for a given block height: coin-cli getblockhash 64152
    //            NOTE: This value is only used to build example api links on the api page from the /api/getblock api for example
    "blockhash": "775d67da29dd6553268061f86368d06654944dd5d5c61db4c97e4c7960c11a74",
    // txhash: This value can be any valid transaction hash from your coins blockchain
    //         For many bitcoin clones you can use the following cmd to find a list of tx hashes for a given block hash: coin-cli getblock 000000001ba119a0f6d49ebabd83343b125d7ee3d3184b1b41d6a7f2051153eb
    //         NOTE: This value is only used to build example api links on the api page from the /api/getrawtransaction api for example
    "txhash": "6cb3babd256de253f926f10bc8574dadf0a3e2fc8380107b81eb07c67d1e73ed",
    // address: This value can be any valid wallet address from your coins blockchain that has received at least 1 or more coin transactions
    //          NOTE: This value is only used to build example api links on the api page from the /ext/getaddress api for example
    "address": "ELvb8AZRgHmdsDnD1HYFwbSY4UkPhoECCW"
  },
  // public_apis: a collection of settings that pertain to the public api command system
  //              NOTE: Disabling any of these apis will remove the api definition from the api page and will return a "This method is disabled" msg if the api endpoint is called.
  //                    Some public apis are used internally by the explorer such as the /ext/getlasttxs api and even if disabled from here the internal api will still continue to function.
  "public_apis": {
    // rpc: a collection of settings that pertain to the rpc cmd apis that are retrieved from the coin wallet rpc api
    "rpc": {
      // getdifficulty: a collection of settings that pertain to the /api/getdifficulty api endpoint
      //                Returns the proof-of-work difficulty as a multiple of the minimum difficulty
      //                NOTE: This api is not used internally and is therefore only publicly available
      "getdifficulty": {
        // enabled: Enable/disable the /api/getdifficulty api endpoint (true/false)
        //          If set to false, the /api/getdifficulty api will be completely disabled for public use (no definition on the api page and a disabled error msg if you try to call the endpoint directly)
        "enabled": true
      },
      // getconnectioncount: a collection of settings that pertain to the /api/getconnectioncount api endpoint
      //                     Returns the number of connections to other nodes
      //                     NOTE: This api is not used internally and is therefore only publicly available
      "getconnectioncount": {
        // enabled: Enable/disable the /api/getconnectioncount api endpoint (true/false)
        //          If set to false, the /api/getconnectioncount api will be completely disabled for public use (no definition on the api page and a disabled error msg if you try to call the endpoint directly)
        "enabled": true
      },
      // getblockcount: a collection of settings that pertain to the /api/getblockcount api endpoint
      //                Returns the number of blocks in the longest blockchain
      //                NOTE: This api is not used internally and is therefore only publicly available
      "getblockcount": {
        // enabled: Enable/disable the /api/getblockcount api endpoint (true/false)
        //          If set to false, the /api/getblockcount api will be completely disabled for public use (no definition on the api page and a disabled error msg if you try to call the endpoint directly)
        "enabled": true
      },
      // getblockhash: a collection of settings that pertain to the /api/getblockhash api endpoint
      //               Returns hash of block in best-block-chain at height provided
      //               NOTE: This api is not used internally and is therefore only publicly available
      "getblockhash": {
        // enabled: Enable/disable the /api/getblockhash api endpoint (true/false)
        //          If set to false, the /api/getblockhash api will be completely disabled for public use (no definition on the api page and a disabled error msg if you try to call the endpoint directly)
        "enabled": true
      },
      // getblock: a collection of settings that pertain to the /api/getblock api endpoint
      //           Returns an object with information about the block
      //           NOTE: This api is not used internally except for a link on the block page to view the raw block data, which will be automatically removed/hidden when this api is disabled
      "getblock": {
        // enabled: Enable/disable the /api/getblock api endpoint (true/false)
        //          If set to false, the /api/getblock api will be completely disabled for public use (no definition on the api page and a disabled error msg if you try to call the endpoint directly)
        "enabled": true
      },
      // getrawtransaction: a collection of settings that pertain to the /api/getrawtransaction api endpoint
      //                    Returns raw transaction data
      //                    NOTE: This api is not used internally except for a link on the transaction/tx page to view the raw transaction data, which will be automatically removed/hidden when this api is disabled
      "getrawtransaction": {
        // enabled: Enable/disable the /api/getrawtransaction api endpoint (true/false)
        //          If set to false, the /api/getrawtransaction api will be completely disabled for public use (no definition on the api page and a disabled error msg if you try to call the endpoint directly)
        "enabled": true
      },
      // getnetworkhashps: a collection of settings that pertain to the /api/getnetworkhashps api endpoint
      //                   Returns the estimated network hashes per second
      //                   NOTE: This api is not used internally and is therefore only publicly available
      "getnetworkhashps": {
        // enabled: Enable/disable the /api/getnetworkhashps api endpoint (true/false)
        //          If set to false, the /api/getnetworkhashps api will be completely disabled for public use (no definition on the api page and a disabled error msg if you try to call the endpoint directly)
        "enabled": true
      },
      // getvotelist: a collection of settings that pertain to the /api/getvotelist api endpoint
      //              Returns an object with details regarding the current vote list
      //              NOTE: This api is not used internally and is therefore only publicly available
      "getvotelist": {
        // enabled: Enable/disable the /api/getvotelist api endpoint (true/false)
        //          If set to false, the /api/getvotelist api will be completely disabled for public use (no definition on the api page and a disabled error msg if you try to call the endpoint directly)
        "enabled": true
      },
      // getmasternodecount: a collection of settings that pertain to the /api/getmasternodecount api endpoint
      //                     Returns a json object containing the total number of masternodes on the network (only applicable to masternode coins)
      //                     NOTE: This api is not used internally and is therefore only publicly available
      "getmasternodecount": {
        // enabled: Enable/disable the /api/getmasternodecount api endpoint (true/false)
        //          If set to false, the /api/getmasternodecount api will be completely disabled for public use (no definition on the api page and a disabled error msg if you try to call the endpoint directly)
        "enabled": true
      }
    },
    // ext: a collection of settings that pertain to the extended apis that are retrieved from local mongo database collection
    "ext": {
      // getmoneysupply: a collection of settings that pertain to the /ext/getmoneysupply api endpoint
      //                 Returns current money supply
      //                 NOTE: This api is not used internally and is therefore only publicly available
      "getmoneysupply": {
        // enabled: Enable/disable the /ext/getmoneysupply api endpoint (true/false)
        //          If set to false, the /ext/getmoneysupply api will be completely disabled for public use (no definition on the api page and a disabled error msg if you try to call the endpoint directly)
        "enabled": true
      },
      // getdistribution: a collection of settings that pertain to the /ext/getdistribution api endpoint
      //                  Returns wealth distribution stats
      //                  NOTE: This api is not used internally and is therefore only publicly available
      "getdistribution": {
        // enabled: Enable/disable the /ext/getdistribution api endpoint (true/false)
        //          If set to false, the /ext/getdistribution api will be completely disabled for public use (no definition on the api page and a disabled error msg if you try to call the endpoint directly)
        "enabled": true
      },
      // getaddress: a collection of settings that pertain to the /ext/getaddress api endpoint
      //             Returns information for given address
      //             NOTE: This api is not used internally and is therefore only publicly available
      "getaddress": {
        // enabled: Enable/disable the /ext/getaddress api endpoint (true/false)
        //          If set to false, the /ext/getaddress api will be completely disabled for public use (no definition on the api page and a disabled error msg if you try to call the endpoint directly)
        "enabled": true
      },
      // getaddresstxs: a collection of settings that pertain to the /ext/getaddresstxs api endpoint
      //                Returns transactions for a wallet address starting from a particular offset
      //                NOTE: This api is used internally via ajax call to populate the Address History table on the address page. Disabling the api from here will not stop the Address History table from displaying data
      "getaddresstxs": {
        // enabled: Enable/disable the /ext/getaddresstxs api endpoint (true/false)
        //          If set to false, the /ext/getaddresstxs api will be completely disabled for public use (no definition on the api page and a disabled error msg if you try to call the endpoint directly) but the api will still be available internally to the explorer
        "enabled": true,
        // max_items_per_query: The maximum # of transactions that can be returned from the /ext/getaddresstxs api endpoint in a single call
        "max_items_per_query": 100
      },
      // gettx: a collection of settings that pertain to the /ext/gettx api endpoint
      //        Returns information for given tx hash
      //        NOTE: This api is not used internally and is therefore only publicly available
      "gettx": {
        // enabled: Enable/disable the /ext/gettx api endpoint (true/false)
        //          If set to false, the /ext/gettx api will be completely disabled for public use (no definition on the api page and a disabled error msg if you try to call the endpoint directly)
        "enabled": true
      },
      // getbalance: a collection of settings that pertain to the /ext/getbalance api endpoint
      //             Returns current balance of given address
      //             NOTE: This api is not used internally and is therefore only publicly available
      "getbalance": {
        // enabled: Enable/disable the /ext/getbalance api endpoint (true/false)
        //          If set to false, the /ext/getbalance api will be completely disabled for public use (no definition on the api page and a disabled error msg if you try to call the endpoint directly)
        "enabled": true
      },
      // getlasttxs: a collection of settings that pertain to the /ext/getlasttxs api endpoint
      //             Returns transactions greater than a specific number of coins, starting from a particular offset
      //             NOTE: This api is used internally via ajax call to populate the Transaction tables on the index and movement pages. Disabling the api from here will not stop the Transaction tables from displaying data
      "getlasttxs": {
        // enabled: Enable/disable the /ext/getlasttxs api endpoint (true/false)
        //          If set to false, the /ext/getlasttxs api will be completely disabled for public use (no definition on the api page and a disabled error msg if you try to call the endpoint directly) but the api will still be available internally to the explorer
        "enabled": true,
        // max_items_per_query: The maximum # of transactions that can be returned from the /ext/getlasttxs api endpoint in a single call
        "max_items_per_query": 100,
        // show_extracted_by: Determine whether to return a new field with the address(es) that mined the block
        //                    If enabled, a new field will be added to the /ext/getlasttxs api endpoint that displays the address(es) that mined the block for the coinbase transaction only
        "show_extracted_by": false
      },
      // getcurrentprice: a collection of settings that pertain to the /ext/getcurrentprice api endpoint
      //                  Returns last known exchange price
      //                  NOTE: This api is not used internally and is therefore only publicly available
      "getcurrentprice": {
        // enabled: Enable/disable the /ext/getcurrentprice api endpoint (true/false)
        //          If set to false, the /ext/getcurrentprice api will be completely disabled for public use (no definition on the api page and a disabled error msg if you try to call the endpoint directly)
        "enabled": true
      },
      // getnetworkpeers: a collection of settings that pertain to the /ext/getnetworkpeers api endpoint
      //                  Returns the list of network peers that have connected to the explorer node in the last 24 hours
      //                  NOTE: This api is used internally via ajax call to populate the connections, add nodes and one try tables on the network page. Disabling the api from here will not stop the network page tables from displaying data
      "getnetworkpeers": {
        // enabled: Enable/disable the /ext/getnetworkpeers api endpoint (true/false)
        //          If set to false, the /ext/getnetworkpeers api will be completely disabled for public use (no definition on the api page and a disabled error msg if you try to call the endpoint directly) but the api will still be available internally to the explorer
        "enabled": true
      },
      // getbasicstats: a collection of settings that pertain to the /ext/getbasicstats api endpoint
      //                Returns basic statistics about the coin including: block count, circulating supply, USD price, default market price and # of masternodes (# of masternodes is only applicable to masternode coins)
      //                NOTE: This api is not used internally and is therefore only publicly available
      "getbasicstats": {
        // enabled: Enable/disable the /ext/getbasicstats api endpoint (true/false)
        //          If set to false, the /ext/getbasicstats api will be completely disabled for public use (no definition on the api page and a disabled error msg if you try to call the endpoint directly)
        "enabled": true
      },
      // getsummary: a collection of settings that pertain to the /ext/getsummary api endpoint
      //             Returns a summary of coin data including: difficulty, hybrid difficulty, circulating supply, hash rate, default market price, network connection count, block count, count of online masternodes and count of offline masternodes (masternode counts are only applicable to masternode coins)
      //             NOTE: This api is used internally via ajax call to populate many of the panel boxes that are found at the top of all pages. Disabling the api from here will not stop the panel boxes from displaying data
      "getsummary": {
        // enabled: Enable/disable the /ext/getsummary api endpoint (true/false)
        //          If set to false, the /ext/getsummary api will be completely disabled for public use (no definition on the api page and a disabled error msg if you try to call the endpoint directly) but the api will still be available internally to the explorer
        "enabled": true
      },
      // getmasternodelist: a collection of settings that pertain to the /ext/getmasternodelist api endpoint
      //                    Returns the complete list of masternodes on the network (only applicable to masternode coins)
      //                    NOTE: This api is used internally via ajax call to populate the Masternodes table on the masternodes page. Disabling the api from here will not stop the Masternodes table from displaying data
      "getmasternodelist": {
        // enabled: Enable/disable the /ext/getmasternodelist api endpoint (true/false)
        //          If set to false, the /ext/getmasternodelist api will be completely disabled for public use (no definition on the api page and a disabled error msg if you try to call the endpoint directly) but the api will still be available internally to the explorer
        "enabled": true
      },
      // getmasternoderewards: a collection of settings that pertain to the /ext/getmasternoderewards api endpoint
      //                       Returns a list of masternode reward transactions for a specific address that arrived after a specific block height (only applicable to masternode coins)
      //                       NOTE: This api is not used internally and is therefore only publicly available
      "getmasternoderewards": {
        // enabled: Enable/disable the /ext/getmasternoderewards api endpoint (true/false)
        //          If set to false, the /ext/getmasternoderewards api will be completely disabled for public use (no definition on the api page and a disabled error msg if you try to call the endpoint directly)
        "enabled": true
      },
      // getmasternoderewardstotal: a collection of settings that pertain to the /ext/getmasternoderewardstotal api endpoint
      //                            Returns the total number of coins earned in masternode rewards for a specific address that arrived after a specific block height (only applicable to masternode coins)
      //                            NOTE: This api is not used internally and is therefore only publicly available
      "getmasternoderewardstotal": {
        // enabled: Enable/disable the /ext/getmasternoderewardstotal api endpoint (true/false)
        //          If set to false, the /ext/getmasternoderewardstotal api will be completely disabled for public use (no definition on the api page and a disabled error msg if you try to call the endpoint directly)
        "enabled": true
      }
    }
  }
};

// claim_address_page: a collection of settings that pertain to the claim address page
exports.claim_address_page = {
  // enabled: Enable/disable the ability for users to claim a wallet address (true/false)
  //          If set to false, the claim page will be completely inaccessible
  //          NOTE: Disabling this feature after addresses have already been claimed will effectively hide the claimed values and restore the original wallet addresses again
  "enabled": true,
  // show_panels: Determine whether to show the panels configured in the shared_pages.page_header section across the top of this page (true/false)
  "show_panels": false,
  // show_nethash_chart: Determine whether to show the network hashrate chart configured in the shared_pages.network_charts.nethash_chart section across the top of this page (true/false)
  "show_nethash_chart": false,
  // show_difficulty_chart: Determine whether to show the network difficulty chart configured in the shared_pages.network_charts.difficulty_chart section across the top of this page (true/false)
  "show_difficulty_chart": false,
  // page_header: a collection of settings that pertain to the claim address page header
  "page_header": {
    // show_img: Determine whether to show the page title image defined in the "shared_pages.page_header.page_title_image" setting (true/false)
    "show_img": true,
    // show_title: Determine whether to show the page title as defined in "localization.claim_title" (true/false)
    "show_title": true,
    // show_description: Determine whether to show the page description as defined in "localization.claim_description" (true/false)
    "show_description": true
  },
  // show_header_menu: Show/hide the "Claim Address" header menu item (true/false)
  //                   If set to false, the claim address page can still be accessed via the claim link on each address page
  //                   NOTE: The "claim_address_page.enabled" setting must also be set to true or else the header item will automatically be hidden as well
  "show_header_menu": true,
  // enable_bad_word_filter: Enable/disable the "bad word" filter for claimed addresses, so that trying to claim an address with a bad word like "ash0le" will fail
  //                         This feature uses the default blacklist from the "bad-words" plugin from here: https://www.npmjs.com/package/bad-words
  "enable_bad_word_filter": true,
  // enable_captcha: Enable/disable using captcha security when filling out and submitting the claim address form
  //                 NOTE: you must also configure and enable one of the options in the main "captcha" settings for this option to function correctly
  "enable_captcha": false
};

// orphans_page: a collection of settings that pertain to the orphans page
exports.orphans_page = {
  // enabled: Enable/disable the orphans page (true/false)
  //          If set to false, the orphans page will be completely inaccessible
  "enabled": false,
  // show_panels: Determine whether to show the panels configured in the shared_pages.page_header section across the top of this page (true/false)
  "show_panels": false,
  // show_nethash_chart: Determine whether to show the network hashrate chart configured in the shared_pages.network_charts.nethash_chart section across the top of this page (true/false)
  "show_nethash_chart": false,
  // show_difficulty_chart: Determine whether to show the network difficulty chart configured in the shared_pages.network_charts.difficulty_chart section across the top of this page (true/false)
  "show_difficulty_chart": false,
  // page_header: a collection of settings that pertain to the orphans page header
  "page_header": {
    // show_img: Determine whether to show the page title image defined in the "shared_pages.page_header.page_title_image" setting (true/false)
    "show_img": true,
    // show_title: Determine whether to show the page title as defined in "localization.orphan_title" (true/false)
    "show_title": true,
    // show_last_updated: Determine whether to show a label below the page title with the last updated date (true/false)
    "show_last_updated": true,
    // show_description: Determine whether to show the page description as defined in "localization.orphan_description" (true/false)
    "show_description": true
  },
  // orphans_table: a collection of settings that pertain to the orphans table on the orphans page
  //                Table data is populated via the /ext/getorphanlist api
  "orphans_table": {
    // page_length_options: An array of page length options that determine how many items/records to display in the table at any given time
    "page_length_options": [ 10, 25, 50, 75, 100, 250, 500, 1000 ],
    // items_per_page: The default amount of items/records to display in the table at any given time
    "items_per_page": 10
  }
};

// sync: a collection of settings that pertain to the data synchronization process
exports.sync = {
  // block_parallel_tasks: Use multiple threads to do blockchain syncing which greatly improves the initial sync speed
  "block_parallel_tasks": 8,
  // update_timeout: The amount of time to wait (in milliseconds) before moving to the next block or transaction during blockchain sync or reindex (/path/to/node scripts/sync.js update or /path/to/node scripts/sync.js reindex)
  "update_timeout": 10,
  // check_timeout: The amount of time to wait (in milliseconds) before moving to the next block or transaction during a check sync (/path/to/node scripts/sync.js check)
  "check_timeout": 250,
  // save_stats_after_sync_blocks: During index syncronization, stats are saved after processing this many blocks to save time by not having to save after each block
  "save_stats_after_sync_blocks": 100,
  // show_sync_msg_when_syncing_more_than_blocks: Show the sync msg at the top of all pages during index syncronization if there are more than this many blocks to process
  "show_sync_msg_when_syncing_more_than_blocks": 1000,
  // supply: Determine how to calculate current coin supply
  //         NOTE: The supply is always retrieved right before doing a normal index sync, reindex or check
  //         Valid options:
  //         COINBASE : retrieve the total coins sent from the coinbase (Often used for PoW coins)
  //         GETINFO : retrieved from getinfo rpc cmd (Often used for PoS coins)
  //         GETBLOCKCHAININFO : retrieved from getblockchaininfo rpc cmd
  //         HEAVY: retrieved from getsupply rpc cmd (The "blockchain_specific.heavycoin.enabled" setting must be set to true and the "blockchain_specific.heavycoin.api_cmds.getsupply" setting must be set up correctly for this option to work properly)
  //         BALANCES : get the supply by running a query on the addresses collection and summing up all positive balances (potentially a long running query for blockchains with tons of addresses)
  //         TXOUTSET : retrieved from gettxoutsetinfo rpc cmd
  "supply": "GETINFO",
  // batch_size: The maximum number of records before saving data to the database.
  //             This value is used for syncing transactions, addresses and address transactions.
  //             Each record type is processed within a single block so batching only happens if there are more than `batch_size` txes in a single block for example.
  //             If the number of txes is lower than `batch_size` then all txes are saved in one batch.
  //             A higher batch_size can save data faster than having to do smaller batches but only up to a certain point since it also requires more memory and resources for larger batches and the optimal number depends entirely on your server's resources.
  //             A lower batch size generally ensures there will be no memory limitations although it can also slow down the sync process.
  //             It is recommended to leave this value alone unless you know what you are doing although some experimentation with different batch sizes using the benchmark script can often help determine the optimal setting for your server.
  "batch_size": 5000,
  // elastic_stack_size: If a "RangeError: Maximum call stack size exceeded" error occurs during a block sync (which can happen when dealing with large transactions with many addresses), the sync script will automatically be reloaded using a larger stack size value which increases memory usage based on this value.
  //                     NOTE: If the first reload of the sync script still doesn't have enough memory to handle processing of a large transaction, the sync is smart enough to continue increasing the stack size by this value again and again until it finishes processing all blocks and then returns back to the default amount of memory for future blocks.
  //                           It is recommended to leave this value alone unless you know what you are doing.
  "elastic_stack_size": 4096,
  // wait_for_bulk_database_save: Determine whether to wait for all records to be saved or just send the records without waiting for save confirmation when saving bulk data
  //                              This setting only controls how to treat records that are bulk saved to the database which include txes, addresstxes and addresses
  //                              If set to true, bulk transactions to the database will wait for save confirmation which results in a slower save time but also returns information about which records failed to save
  //                              If set to false, bulk transactions to the database will not wait for save confirmation which results in a faster save time but will not return any error message for records that failed to save
  //                              NOTE: If you want to sync data as fast as possible and are sure that your blockchain doesn't contain any problematic or unsupported data types then you can set this value to "false" to maximize the speed of the block sync
  "wait_for_bulk_database_save": true,
  // rate_limit: a collection of settings that pertain to the amount of time to wait between requests
  "rate_limit": {
    // peer_sync_rate_limit: The amount of time to wait (in milliseconds) between geolocation api requests when syncing peer data
    "peer_sync_rate_limit": 2000
  }
};

// captcha: a collection of settings that pertain to the captcha security used by different elements of the explorer
// NOTE: only 1 captcha option can be enabled and used at any given time. If you enable 2 or more options the explorer will use the first available enabled option it finds
exports.captcha = {
  // google_recaptcha3: a collection of settings that pertain to using Google reCAPTCHA v3. Signup to get your site and secret keys here: https://www.google.com/recaptcha/admin
  "google_recaptcha3": {
    // enabled: Enable/disable the use of Google reCAPTCHA v3 (true/false)
    //          If set to false, Google reCAPTCHA v3 will be completely disabled as a security feature
    "enabled": false,
    // pass_score: A numeric score between 0.0 and 1.0 used to deteremine if a particular captcha request passed or failed
    //             Google reCAPTCHA v3 returns a score value for every captcha request. 1.0 is very likely a good interaction whereas 0.0 is very likely a bot
    //             Google recommends using 0.5 by default but you may increase the passing score if you are receiving too many automated bot submissions or lower the score if legitimate users are having troubles passing the captcha challenge
    "pass_score": 0.5,
    // site_key: Enter the SITE KEY value from your Google reCAPTCHA v3 settings here
    "site_key": "",
    // secret_key: Enter the SECRET KEY value from your Google reCAPTCHA v3 settings here
    "secret_key": ""
  },
  // google_recaptcha2: a collection of settings that pertain to using Google reCAPTCHA v2. Signup to get your site and secret keys here: https://www.google.com/recaptcha/admin
  "google_recaptcha2": {
    // enabled: Enable/disable the use of Google reCAPTCHA v2 (true/false)
    //          If set to false, Google reCAPTCHA v2 will be completely disabled as a security feature
    "enabled": false,
    // captcha_type: Determine the type of captcha to use for security validation
    //               Valid options:
    //               checkbox: The "I'm not a robot" Checkbox requires the user to click a checkbox indicating the user is not a robot. This will either pass the user immediately (with No CAPTCHA) or challenge them to validate whether or not they are human
    //               invisible: The invisible reCAPTCHA badge does not require the user to click on a checkbox. By default only the most suspicious traffic will be prompted to solve a captcha
    "captcha_type": "checkbox",
    // site_key: Enter the SITE KEY value from your Google reCAPTCHA v2 settings here
    "site_key": "",
    // secret_key: Enter the SECRET KEY value from your Google reCAPTCHA v2 settings here
    "secret_key": ""
  },
  // hcaptcha: a collection of settings that pertain to using hCaptcha. Signup to get your site and secret keys here: https://dashboard.hcaptcha.com/signup
  //           NOTE: Only the free "Always Challenge" mode is currently supported
  "hcaptcha": {
    // enabled: Enable/disable the use of hCaptcha (true/false)
    //          If set to false, hCaptcha will be completely disabled as a security feature
    "enabled": false,
    // site_key: Enter the SITE KEY value from your hCaptcha settings here
    "site_key": "",
    // secret_key: Enter the SECRET KEY value from your hCaptcha settings here
    "secret_key": ""
  }
};

// labels: a collection of settings that pertain to the list of customized wallet address labels
//         Adding entries to this section will display a custom label beside each affected wallet address when displayed in the explorer
//         NOTE: You can add as many address labels as desired
exports.labels = {};

// default_coingecko_ids: a collection of settings that pertain to the list of coingecko api symbols and ids
//                        Adding entries to this section will force a particular coin symbol to the associated coingecko id when the coingecko api is used for USD lookups and when using the markets_page.market_price = "COINGECKO" option
//                        This is useful when there are multiple coins available in the coingecko api that have the same symbol, since by default, the explorer will match to the first one in the list which may not always be the correct coin
//                        Visit the coingecko coin list api to manually find the correct ids to plug in here for the symbols you use with the explorer: https://api.coingecko.com/api/v3/coins/list?include_platform=false
//                        You can add as many coingecko id defaults as necessary in the following format: [ { "symbol": "btc", "id": "bitcoin" }, { "symbol": "eth", "id": "ethereum" } ]
//                        NOTE: If all symbols that the explorer needs to look up via the coingecko coin list api are defaulted here, then the market sync will save an api call and skip making the call to the coingecko coin list api whenever it would usually be called
exports.default_coingecko_ids = [
  { "symbol": "btc", "id": "bitcoin" },
  { "symbol": "eth", "id": "ethereum" },
  { "symbol": "usdt", "id": "tether" },
  { "symbol": "ltc", "id": "litecoin" },
  { "symbol": "exor", "id": "exor" }
];

//api_cmds: A collection of settings that pertain to the list of customizable rpc api commands
//          Not all blockchains utilize the same rpc cmds for accessing the internal daemon api. Use these settings to set alternate names for similar api cmds.
//          Leaving a cmd value blank ( "" ) will completely disable use of that cmd.
//          NOTICE: Some apis such as getblockhash for example, are integral to the functionality of the explorer and will result in a fairly unusable experience if disabled.
exports.api_cmds = {
  // use_rpc: Determine whether to call rpc api cmds directly using the faster rpc method or using the older method via internal http api (true/false)
  //          NOTE: This should always be set to true unless there is a specific need to test or log certain apis
  "use_rpc": true,
  // rpc_concurrent_tasks: The maximum number of rpc cmds that can be run simultaneously. Additional rpc cmds will go into a queue and be run on a first-in-first-out basis
  "rpc_concurrent_tasks": 1,
  // getnetworkhashps: Returns the estimated network hashes per second. This should be a positive whole number
  "getnetworkhashps": "getnetworkhashps",
  // getmininginfo: Returns a json object containing mining-related information
  "getmininginfo": "getmininginfo",
  // getdifficulty: Returns the proof-of-work difficulty as a multiple of the minimum difficulty. This should be a positive whole or decimal number
  "getdifficulty": "getdifficulty",
  // getconnectioncount: Returns the number of connections to other nodes. This should be a positive whole number
  "getconnectioncount": "getconnectioncount",
  // getblockcount: Returns the number of blocks in the longest blockchain. This should be a positive whole number
  "getblockcount": "getblockcount",
  // getblockhash: Returns hash of block in best-block-chain at height provided. This should be a string value
  "getblockhash": "getblockhash",
  // getblock: Returns an object with information about a particular block
  "getblock": "getblock",
  // getrawtransaction: Returns raw transaction data. Can return a hex-encoded string that is serialized or an object with txid information depending on the decrypt value (0 = false or 1 = true)
  "getrawtransaction": "getrawtransaction",
  // getinfo: Returns an object containing various state info
  "getinfo": "getinfo",
  // getblockchaininfo: Returns an object containing various state info regarding blockchain processing
  "getblockchaininfo": "getblockchaininfo",
  // getpeerinfo: Returns data about each connected network node as a json array of objects
  "getpeerinfo": "getpeerinfo",
  // gettxoutsetinfo: Returns an object with statistics about the unspent transaction output set
  "gettxoutsetinfo": "gettxoutsetinfo",
  // getvotelist: Returns an object with details regarding the current vote list
  "getvotelist": "masternodelist votes",
  // getmasternodecount: Returns a json object containing the total number of masternodes on the network
  "getmasternodecount": "getmasternodecount",
  // getmasternodelist: Returns a json array containing status information for all masternodes on the network
  "getmasternodelist": "listmasternodes",
  // verifymessage: Verify a signed message. Must accept the following arguments:
  //                address: The wallet address to use for the signature
  //                signature: The signature provided by the signer in base 64 encoding
  //                message: The message that was signed
  "verifymessage": "verifymessage"
};

// blockchain_specific: A collection of settings that pertain to non-standard blockchain features that can extend the functionality of the default explorer
exports.blockchain_specific = {
  // bitcoin: A collection of settings that pertain to Bitcoin-specific scripts (P2PK support)
  "bitcoin": {
    // enabled: Enable/disable the use of bitcoin scripts in the explorer (true/false)
    //          If set to false, all P2PK transactions will be saved without addresses as they require special encoding to reveal the more familiar P2PKH address
    //          NOTE: Enabling this feature will require a full reindex of the blockchain data to fix any P2PK transactions that were previously not displaying addresses
    "enabled": false,
    //api_cmds: A collection of settings that pertain to the list of customizable bitcoin rpc api commands
    //          Not all blockchains utilize the same rpc cmds for accessing the internal daemon api. Use these settings to set alternate names for similar api cmds.
    //          Leaving a cmd value blank ( "" ) will completely disable use of that cmd.
    "api_cmds": {
      // getdescriptorinfo: Accepts a descriptor as input and returns an object with more detailed information, including its computed checksum
      "getdescriptorinfo": "getdescriptorinfo",
      // deriveaddresses: Accepts an output descriptor as input and returns an array containing one or more P2PKH addresses
      "deriveaddresses": "deriveaddresses"
    }
  },
  // heavycoin: A collection of settings that pertain to the democratic voting and reward capabilities of the heavycoin blockchain
  "heavycoin": {
    // enabled: Enable/disable the use of heavycoin features in the explorer (true/false)
    //          If set to false, all heavycoin features will be completely inaccessible
    //          If set to true, an additional heavycoin sync will be performed immidiately before any index sync or reindex
    "enabled": false,
    // reward_page: a collection of settings that pertain to the reward page
    "reward_page": {
      // enabled: Enable/disable the reward page (true/false)
      //          If set to false, the reward page will be completely inaccessible
      "enabled": true,
      // show_panels: Determine whether to show the panels configured in the shared_pages.page_header section across the top of this page (true/false)
      "show_panels": false,
      // show_nethash_chart: Determine whether to show the network hashrate chart configured in the shared_pages.network_charts.nethash_chart section across the top of this page (true/false)
      "show_nethash_chart": false,
      // show_difficulty_chart: Determine whether to show the network difficulty chart configured in the shared_pages.network_charts.difficulty_chart section across the top of this page (true/false)
      "show_difficulty_chart": false,
      // page_header: a collection of settings that pertain to the reward page header
      "page_header": {
        // show_img: Determine whether to show the page title image defined in the "shared_pages.page_header.page_title_image" setting (true/false)
        "show_img": true,
        // show_title: Determine whether to show the page title as defined in "localization.reward_title" (true/false)
        "show_title": true,
        // show_last_updated: Determine whether to show a label below the page title with the last updated date (true/false)
        "show_last_updated": true,
        // show_description: Determine whether to show the page description as defined in "localization.reward_description" (true/false)
        "show_description": true
      }
    },
    //api_cmds: A collection of settings that pertain to the list of customizable heavycoin rpc api commands
    //          Not all blockchains utilize the same rpc cmds for accessing the internal daemon api. Use these settings to set alternate names for similar api cmds.
    //          Leaving a cmd value blank ( "" ) will completely disable use of that cmd.
    "api_cmds": {
      // getmaxmoney: Returns the number of coins that will be produced in total. This should be a positive whole or decimal number
      "getmaxmoney": "getmaxmoney",
      // getmaxvote: Returns the maximum allowed vote for the current phase of voting. This should be a positive whole number
      "getmaxvote": "getmaxvote",
      // getvote: Returns the current block reward vote setting. This should be a positive whole number
      "getvote": "getvote",
      // getphase: Returns the current voting phase name. This should be a string value
      "getphase": "getphase",
      // getreward: Returns the current block reward. This should be a positive whole or decimal number
      "getreward": "getreward",
      // getsupply: Returns the current money supply. This should be a positive whole or decimal number
      "getsupply": "getsupply",
      // getnextrewardestimate: Returns an estimate for the next block reward based on the current state of decentralized voting. This should be a positive whole or decimal number
      "getnextrewardestimate": "getnextrewardestimate",
      // getnextrewardwhenstr: Returns a string describing how long until the votes are tallied and the next block reward is computed
      "getnextrewardwhenstr": "getnextrewardwhenstr"
    },
    // public_apis: a collection of settings that pertain to the heavycoin public api command system
    //              NOTE: If the "api_page.enabled" setting is set to false, these apis will be completely disabled and will return a "This method is disabled" msg if the api endpoint is called.
    //                    Disabling any of these apis will remove the api definition from the api page and will return a "This method is disabled" msg if the api endpoint is called.
    "public_apis": {
      // getmaxmoney: a collection of settings that pertain to the /api/getmaxmoney api endpoint
      //              Returns the number of coins that will be produced in total
      //              NOTE: This api is not used internally and is therefore only publicly available
      "getmaxmoney": {
        // enabled: Enable/disable the /api/getmaxmoney api endpoint (true/false)
        //          If set to false, the /api/getmaxmoney api will be completely disabled for public use (no definition on the api page and a disabled error msg if you try to call the endpoint directly)
        "enabled": true
      },
      // getmaxvote: a collection of settings that pertain to the /api/getmaxvote api endpoint
      //             Returns the maximum allowed vote for the current phase of voting
      //             NOTE: This api is not used internally and is therefore only publicly available
      "getmaxvote": {
        // enabled: Enable/disable the /api/getmaxvote api endpoint (true/false)
        //          If set to false, the /api/getmaxvote api will be completely disabled for public use (no definition on the api page and a disabled error msg if you try to call the endpoint directly)
        "enabled": true
      },
      // getvote: a collection of settings that pertain to the /api/getvote api endpoint
      //          Returns the current block reward vote setting
      //          NOTE: This api is not used internally and is therefore only publicly available
      "getvote": {
        // enabled: Enable/disable the /api/getvote api endpoint (true/false)
        //          If set to false, the /api/getvote api will be completely disabled for public use (no definition on the api page and a disabled error msg if you try to call the endpoint directly)
        "enabled": true
      },
      // getphase: a collection of settings that pertain to the /api/getphase api endpoint
      //           Returns the current voting phase name
      //           NOTE: This api is not used internally and is therefore only publicly available
      "getphase": {
        // enabled: Enable/disable the /api/getphase api endpoint (true/false)
        //          If set to false, the /api/getphase api will be completely disabled for public use (no definition on the api page and a disabled error msg if you try to call the endpoint directly)
        "enabled": true
      },
      // getreward: a collection of settings that pertain to the /api/getreward api endpoint
      //            Returns the current block reward
      //            NOTE: This api is not used internally and is therefore only publicly available
      "getreward": {
        // enabled: Enable/disable the /api/getreward api endpoint (true/false)
        //          If set to false, the /api/getreward api will be completely disabled for public use (no definition on the api page and a disabled error msg if you try to call the endpoint directly)
        "enabled": true
      },
      // getsupply: a collection of settings that pertain to the /api/getsupply api endpoint
      //            Returns the current money supply
      //            NOTE: This api is not used internally and is therefore only publicly available
      "getsupply": {
        // enabled: Enable/disable the /api/getsupply api endpoint (true/false)
        //          If set to false, the /api/getsupply api will be completely disabled for public use (no definition on the api page and a disabled error msg if you try to call the endpoint directly)
        "enabled": true
      },
      // getnextrewardestimate: a collection of settings that pertain to the /api/getnextrewardestimate api endpoint
      //                        Returns an estimate for the next block reward based on the current state of decentralized voting
      //                        NOTE: This api is not used internally and is therefore only publicly available
      "getnextrewardestimate": {
        // enabled: Enable/disable the /api/getnextrewardestimate api endpoint (true/false)
        //          If set to false, the /api/getnextrewardestimate api will be completely disabled for public use (no definition on the api page and a disabled error msg if you try to call the endpoint directly)
        "enabled": true
      },
      // getnextrewardwhenstr: a collection of settings that pertain to the /api/getnextrewardwhenstr api endpoint
      //                       Returns a string describing how long until the votes are tallied and the next block reward is computed
      //                       NOTE: This api is not used internally and is therefore only publicly available
      "getnextrewardwhenstr": {
        // enabled: Enable/disable the /api/getnextrewardwhenstr api endpoint (true/false)
        //          If set to false, the /api/getnextrewardwhenstr api will be completely disabled for public use (no definition on the api page and a disabled error msg if you try to call the endpoint directly)
        "enabled": true
      }
    }
  },
  // zksnarks: A collection of settings that pertain to Zcash zk-SNARKs private transactions
  "zksnarks": {
    // enabled: Enable/disable Zcash zk-SNARKs private transaction support (true/false)
    //          If set to false, zk-SNARKs private txs will not be properly read or saved by the explorer
    //          NOTE: Enabling this feature will require a full reindex of the blockchain data
    "enabled": false
  }
};

// plugins: A collection of settings that pertain to extended functionality from external plugins that support explorer integration
exports.plugins = {
  // plugin_secret_code: A secret code that will be received from all plugins to validate the plugin data request before modifying local database data
  //                     NOTE: This is used as an internal password for your own plugins that can be run on different servers to validate that plugin data being received by the explorer is coming from you and not from a malicious user
  //                           This code should be a random set of numbers, letters and special characters that cannot be easily guessed that must also match the plugin_secret_code in all plugin external.settings.json files
  //                     WARNING: Be sure to change the default secret code as it is only a sample and will be the first code that malicious users try to use to manipulate your explorer's data
  "plugin_secret_code": "SJs2=&r^ScLGLgTaNm7#74=s?48zf*4+vm5S",
  // allowed_plugins: A collection of settings that pertain to the list of plugins allowed to be used with this explorer instance
  //                  You can add as many plugins as necessary in the following format: [ { "plugin_name": "new_plugin_1", "enabled": "true" }, { "plugin_name": "new_plugin_2", "enabled": "false" } ]
  //                  NOTE: Plugins enabled here must also have the actual plugin downloaded into the explorer's /plugins directory with the same name as the plugin_name specified here or they will be ignored
  "allowed_plugins": []
};

// benchmark: a collection of settings that allow the benchmark to connect to MongoDB
exports.benchmark = {
  // user: The MongoDB username used only for the benchmark script
  "user": "eiquidus",
  // password: The MongoDB password used only for the benchmark script
  "password": "Nd^p2d77ceBX!L",
  // database: The MongoDB database name used only for the benchmark script
  "database": "explorer-benchmark",
  // address: The MongoDB hostname. This should always be 'localhost' if connecting to a local instance, otherwise specify the ip address of a remote instance
  "address": "localhost",
  // port: The port # that MongoDB is configured to listen for requests on (default: 27017)
  "port": 27017,
  // block_to_sync: The total # of blocks that should be indexed for benchmarking
  "block_to_sync": 5000,
  // auto_add_user: Determine if the benchmark script should check if the MongoDB user already exists and automatically add it to MongoDB
  //                If set to true, the MongoDB user information above will automatically be added to the correct benchmark database if it doesn't already exist
  //                If set to false, the benchmark script will assume you have already created the MongoDB user in the correct database as indicated above
  //                NOTE: If you have MongoDB authentication enabled you must set this value to false and create the user and database manually. Enabling this option while MongoDB authentication is enabled will prevent the benchmark script from running properly.
  "auto_add_user": true
};

exports.loadSettings = function loadSettings() {
  const fs = require('fs');
  const path = require('path');
  const jsonminify = require('jsonminify');
  const filename = `${path.parse(path.basename(__filename)).name}.json`;
  const settings_filename = `./${filename}`;
  let settings;
  let json_settings;

  // check if the settings.json file exists
  if (fs.existsSync(settings_filename)) {
    try {
      // read settings.json into a string variable
      settings = fs.readFileSync(settings_filename).toString();
    } catch(e) {
      console.warn(`${exports.localization.missing_settings_file.replace('{1}', settings_filename.split('/')[1])}. ${exports.localization.continuing_using_defaults}`);
    }
  } else
    console.warn(`${exports.localization.missing_settings_file.replace('{1}', settings_filename.split('/')[1])}. ${exports.localization.continuing_using_defaults}`);

  try {
    // check if the settings string was populated
    if (settings) {
      // get settings string ready for json conversion
      settings = jsonminify(settings).replace(",]","]").replace(",}","}");
      // convert settings string to json object
      json_settings = JSON.parse(settings);
    }
  } catch(e) {
    console.error(`${exports.localization.error_processing_settings.replace('{1}', settings_filename.split('/')[1])}: ${e.message}`);
    process.exit(1);
  }

  // check if the json settings were populated
  if (json_settings != null) {
    // fix old deprecated settings from v1.01
    json_settings = fix_deprecated_setting(json_settings, 'title', 'shared_pages.page_title');
    json_settings = fix_deprecated_setting(json_settings, 'coin', 'coin.name');
    json_settings = fix_deprecated_setting(json_settings, 'symbol', 'coin.symbol');
    json_settings = fix_deprecated_setting(json_settings, 'headerlogo', 'shared_pages.page_header.home_link_logo');
    json_settings = fix_deprecated_setting(json_settings, 'favicon', 'shared_pages.favicon');
    json_settings = fix_deprecated_setting(json_settings, 'homelink', 'shared_pages.page_header.home_link');
    json_settings = fix_deprecated_setting(json_settings, 'logoheight', 'shared_pages.page_header.home_link_logo_height');
    json_settings = fix_deprecated_setting(json_settings, 'sticky_header', 'shared_pages.page_header.sticky_header');
    json_settings = fix_deprecated_setting(json_settings, 'sticky_footer', 'shared_pages.page_footer.sticky_footer');
    json_settings = fix_deprecated_setting(json_settings, 'footer_height_desktop', 'shared_pages.page_footer.footer_height_desktop');
    json_settings = fix_deprecated_setting(json_settings, 'footer_height_tablet', 'shared_pages.page_footer.footer_height_tablet');
    json_settings = fix_deprecated_setting(json_settings, 'footer_height_mobile', 'shared_pages.page_footer.footer_height_mobile');
    json_settings = fix_deprecated_setting(json_settings, 'social_link_percent_height_desktop', 'shared_pages.page_footer.social_link_percent_height_desktop');
    json_settings = fix_deprecated_setting(json_settings, 'social_link_percent_height_tablet', 'shared_pages.page_footer.social_link_percent_height_tablet');
    json_settings = fix_deprecated_setting(json_settings, 'social_link_percent_height_mobile', 'shared_pages.page_footer.social_link_percent_height_mobile');
    json_settings = fix_deprecated_setting(json_settings, 'theme', 'shared_pages.theme');
    json_settings = fix_deprecated_setting(json_settings, 'port', 'webserver.port');
    json_settings = fix_deprecated_setting(json_settings, 'update_timeout', 'sync.update_timeout');
    json_settings = fix_deprecated_setting(json_settings, 'check_timeout', 'sync.check_timeout');
    json_settings = fix_deprecated_setting(json_settings, 'block_parallel_tasks', 'sync.block_parallel_tasks');
    json_settings = fix_deprecated_setting(json_settings, 'use_rpc', 'api_cmds.use_rpc');
    json_settings = fix_deprecated_setting(json_settings, 'confirmations', 'shared_pages.confirmations');
    json_settings = fix_deprecated_setting(json_settings, 'display.api', 'api_page.enabled');
    json_settings = fix_deprecated_setting(json_settings, 'display.markets', 'markets_page.enabled');
    json_settings = fix_deprecated_setting(json_settings, 'display.richlist', 'richlist_page.enabled');
    json_settings = fix_deprecated_setting(json_settings, 'display.search', 'shared_pages.page_header.show_search');
    json_settings = fix_deprecated_setting(json_settings, 'display.movement', 'movement_page.enabled');
    json_settings = fix_deprecated_setting(json_settings, 'display.network', 'network_page.enabled');
    json_settings = fix_deprecated_setting(json_settings, 'display.masternodes', 'masternodes_page.enabled');
    json_settings = fix_deprecated_setting(json_settings, 'display.masternodesdisplay.claim_address', 'claim_address_page.enabledmasternodes_page.enabled');
    json_settings = fix_deprecated_setting(json_settings, 'display.claim_address_header_menu', 'claim_address_page.show_header_menu');
    json_settings = fix_deprecated_setting(json_settings, 'display.page_header_bgcolor', 'shared_pages.page_header.bgcolor');
    json_settings = fix_deprecated_setting(json_settings, 'display.page_footer_bgcolor', 'shared_pages.page_footer.bgcolor');
    json_settings = fix_deprecated_setting(json_settings, 'display.table_header_bgcolor', 'shared_pages.table_header_bgcolor');
    json_settings = fix_deprecated_setting(json_settings, 'display.networkpnl', 'shared_pages.page_header.panels.network_panel.display_order');
    json_settings = fix_deprecated_setting(json_settings, 'display.difficultypnl', 'shared_pages.page_header.panels.difficulty_panel.display_order');
    json_settings = fix_deprecated_setting(json_settings, 'display.masternodespnl', 'shared_pages.page_header.panels.masternodes_panel.display_order');
    json_settings = fix_deprecated_setting(json_settings, 'display.coinsupplypnl', 'shared_pages.page_header.panels.coin_supply_panel.display_order');
    json_settings = fix_deprecated_setting(json_settings, 'display.pricepnl', 'shared_pages.page_header.panels.price_panel.display_order');
    json_settings = fix_deprecated_setting(json_settings, 'display.marketcappnl', 'shared_pages.page_header.panels.market_cap_panel.display_order');
    json_settings = fix_deprecated_setting(json_settings, 'display.logopnl', 'shared_pages.page_header.panels.logo_panel.display_order');
    json_settings = fix_deprecated_setting(json_settings, 'index.show_last_updated', 'index_page.show_last_updated');
    json_settings = fix_deprecated_setting(json_settings, 'index.show_hashrate', 'shared_pages.show_hashrate');
    json_settings = fix_deprecated_setting(json_settings, 'index.difficulty', 'shared_pages.difficulty');
    json_settings = fix_deprecated_setting(json_settings, 'index.last_txs', 'api_page.public_apis.ext.getlasttxs.max_items_per_query');
    json_settings = fix_deprecated_setting(json_settings, 'reward_page.show_last_updated', 'blockchain_specific.heavycoin.reward_page.show_last_updated');
    json_settings = fix_deprecated_setting(json_settings, 'api.blockindex', 'api_page.sample_data.blockindex');
    json_settings = fix_deprecated_setting(json_settings, 'api.blockhash', 'api_page.sample_data.blockhash');
    json_settings = fix_deprecated_setting(json_settings, 'api.txhash', 'api_page.sample_data.txhash');
    json_settings = fix_deprecated_setting(json_settings, 'api.address', 'api_page.sample_data.address');
    json_settings = fix_deprecated_setting(json_settings, 'markets.default', 'markets_page.default_exchange.exchange_name');
    json_settings = fix_deprecated_setting(json_settings, 'markets.market_dropdown_menu', 'markets_page.show_market_dropdown_menu');
    json_settings = fix_deprecated_setting(json_settings, 'markets.market_select_visible', 'markets_page.show_market_select');
    json_settings = fix_deprecated_setting(json_settings, 'richlist.distribution', 'richlist_page.wealth_distribution.show_distribution_chart');
    json_settings = fix_deprecated_setting(json_settings, 'richlist.received', 'richlist_page.show_received_coins');
    json_settings = fix_deprecated_setting(json_settings, 'richlist.balance', 'richlist_page.show_current_balance');
    json_settings = fix_deprecated_setting(json_settings, 'movement.min_amount', 'movement_page.movement_table.min_amount');
    json_settings = fix_deprecated_setting(json_settings, 'movement.low_flag', 'movement_page.movement_table.low_warning_flag');
    json_settings = fix_deprecated_setting(json_settings, 'movement.high_flag', 'movement_page.movement_table.high_warning_flag');
    json_settings = fix_deprecated_setting(json_settings, 'genesis_tx', 'transaction_page.genesis_tx');
    json_settings = fix_deprecated_setting(json_settings, 'genesis_block', 'block_page.genesis_block');
    json_settings = fix_deprecated_setting(json_settings, 'heavy', 'blockchain_specific.heavycoin.enabled');
    json_settings = fix_deprecated_setting(json_settings, 'save_stats_after_sync_blocks', 'sync.save_stats_after_sync_blocks');
    json_settings = fix_deprecated_setting(json_settings, 'txcount', 'api_page.public_apis.ext.getaddresstxs.max_items_per_query');
    json_settings = fix_deprecated_setting(json_settings, 'txcount_per_page', 'address_page.history_table.items_per_page');
    json_settings = fix_deprecated_setting(json_settings, 'show_sent_received', 'address_page.show_sent_received');
    json_settings = fix_deprecated_setting(json_settings, 'supply', 'sync.supply');
    json_settings = fix_deprecated_setting(json_settings, 'nethash', 'shared_pages.page_header.panels.network_panel.nethash');
    json_settings = fix_deprecated_setting(json_settings, 'nethash_units', 'shared_pages.page_header.panels.network_panel.nethash_units');
    json_settings = fix_deprecated_setting(json_settings, 'usecors', 'webserver.cors.enabled');
    json_settings = fix_deprecated_setting(json_settings, 'corsorigin', 'webserver.cors.corsorigin');
    json_settings = fix_deprecated_setting(json_settings, 'public_api.rpc.getdifficulty', 'api_page.public_apis.rpc.getdifficulty.enabled');
    json_settings = fix_deprecated_setting(json_settings, 'public_api.rpc.getconnectioncount', 'api_page.public_apis.rpc.getconnectioncount.enabled');
    json_settings = fix_deprecated_setting(json_settings, 'public_api.rpc.getblockcount', 'api_page.public_apis.rpc.getblockcount.enabled');
    json_settings = fix_deprecated_setting(json_settings, 'public_api.rpc.getblockhash', 'api_page.public_apis.rpc.getblockhash.enabled');
    json_settings = fix_deprecated_setting(json_settings, 'public_api.rpc.getblock', 'api_page.public_apis.rpc.getblock.enabled');
    json_settings = fix_deprecated_setting(json_settings, 'public_api.rpc.getrawtransaction', 'api_page.public_apis.rpc.getrawtransaction.enabled');
    json_settings = fix_deprecated_setting(json_settings, 'public_api.rpc.getnetworkhashps', 'api_page.public_apis.rpc.getnetworkhashps.enabled');
    json_settings = fix_deprecated_setting(json_settings, 'public_api.rpc.getvotelist', 'api_page.public_apis.rpc.getvotelist.enabled');
    json_settings = fix_deprecated_setting(json_settings, 'public_api.rpc.getmasternodecount', 'api_page.public_apis.rpc.getmasternodecount.enabled');
    json_settings = fix_deprecated_setting(json_settings, 'public_api.rpc.getmaxmoney', 'blockchain_specific.heavycoin.public_apis.getmaxmoney.enabled');
    json_settings = fix_deprecated_setting(json_settings, 'public_api.rpc.getmaxvote', 'blockchain_specific.heavycoin.public_apis.getmaxvote.enabled');
    json_settings = fix_deprecated_setting(json_settings, 'public_api.rpc.getvote', 'blockchain_specific.heavycoin.public_apis.getvote.enabled');
    json_settings = fix_deprecated_setting(json_settings, 'public_api.rpc.getphase', 'blockchain_specific.heavycoin.public_apis.getphase.enabled');
    json_settings = fix_deprecated_setting(json_settings, 'public_api.rpc.getreward', 'blockchain_specific.heavycoin.public_apis.getreward.enabled');
    json_settings = fix_deprecated_setting(json_settings, 'public_api.rpc.getsupply', 'blockchain_specific.heavycoin.public_apis.getsupply.enabled');
    json_settings = fix_deprecated_setting(json_settings, 'public_api.rpc.getnextrewardestimate', 'blockchain_specific.heavycoin.public_apis.getnextrewardestimate.enabled');
    json_settings = fix_deprecated_setting(json_settings, 'public_api.rpc.getnextrewardwhenstr', 'blockchain_specific.heavycoin.public_apis.getnextrewardwhenstr.enabled');
    json_settings = fix_deprecated_setting(json_settings, 'public_api.ext.getmoneysupply', 'api_page.public_apis.ext.getmoneysupply.enabled');
    json_settings = fix_deprecated_setting(json_settings, 'public_api.ext.getdistribution', 'api_page.public_apis.ext.getdistribution.enabled');
    json_settings = fix_deprecated_setting(json_settings, 'public_api.ext.getaddress', 'api_page.public_apis.ext.getaddress.enabled');
    json_settings = fix_deprecated_setting(json_settings, 'public_api.ext.getaddresstxs', 'api_page.public_apis.ext.getaddresstxs.enabled');
    json_settings = fix_deprecated_setting(json_settings, 'public_api.ext.gettx', 'api_page.public_apis.ext.gettx.enabled');
    json_settings = fix_deprecated_setting(json_settings, 'public_api.ext.getbalance', 'api_page.public_apis.ext.getbalance.enabled');
    json_settings = fix_deprecated_setting(json_settings, 'public_api.ext.getlasttxs', 'api_page.public_apis.ext.getlasttxs.enabled');
    json_settings = fix_deprecated_setting(json_settings, 'public_api.ext.getcurrentprice', 'api_page.public_apis.ext.getcurrentprice.enabled');
    json_settings = fix_deprecated_setting(json_settings, 'public_api.ext.getbasicstats', 'api_page.public_apis.ext.getbasicstats.enabled');
    json_settings = fix_deprecated_setting(json_settings, 'public_api.ext.getsummary', 'api_page.public_apis.ext.getsummary.enabled');
    json_settings = fix_deprecated_setting(json_settings, 'public_api.ext.getnetworkpeers', 'api_page.public_apis.ext.getnetworkpeers.enabled');
    json_settings = fix_deprecated_setting(json_settings, 'public_api.ext.getmasternodelist', 'api_page.public_apis.ext.getmasternodelist.enabled');
    json_settings = fix_deprecated_setting(json_settings, 'public_api.ext.getmasternoderewards', 'api_page.public_apis.ext.getmasternoderewards.enabled');
    json_settings = fix_deprecated_setting(json_settings, 'public_api.ext.getmasternoderewardstotal', 'api_page.public_apis.ext.getmasternoderewardstotal.enabled');
    json_settings = fix_deprecated_setting(json_settings, 'api_cmds.heavies.getmaxmoney', 'blockchain_specific.heavycoin.api_cmds.getmaxmoney');
    json_settings = fix_deprecated_setting(json_settings, 'api_cmds.heavies.getmaxvote', 'blockchain_specific.heavycoin.api_cmds.getmaxvote');
    json_settings = fix_deprecated_setting(json_settings, 'api_cmds.heavies.getvote', 'blockchain_specific.heavycoin.api_cmds.getvote');
    json_settings = fix_deprecated_setting(json_settings, 'api_cmds.heavies.getphase', 'blockchain_specific.heavycoin.api_cmds.getphase');
    json_settings = fix_deprecated_setting(json_settings, 'api_cmds.heavies.getreward', 'blockchain_specific.heavycoin.api_cmds.getreward');
    json_settings = fix_deprecated_setting(json_settings, 'api_cmds.heavies.getnextrewardestimate', 'blockchain_specific.heavycoin.api_cmds.getnextrewardestimate');
    json_settings = fix_deprecated_setting(json_settings, 'api_cmds.heavies.getnextrewardwhenstr', 'blockchain_specific.heavycoin.api_cmds.getnextrewardwhenstr');
    json_settings = fix_deprecated_setting(json_settings, 'api_cmds.heavies.getsupply', 'blockchain_specific.heavycoin.api_cmds.getsupply');
    json_settings = fix_deprecated_setting(json_settings, 'api_cmds.masternode_count', 'api_cmds.getmasternodecount');
    json_settings = fix_deprecated_setting(json_settings, 'wallet.user', 'wallet.username');
    json_settings = fix_deprecated_setting(json_settings, 'wallet.pass', 'wallet.password');
    json_settings = fix_deprecated_setting(json_settings, 'social_links', 'shared_pages.page_footer.social_links');
    // fix old deprecated settings from v1.99
    json_settings = fix_deprecated_setting(json_settings, 'shared_pages.page_header.show_search', 'shared_pages.page_header.search.enabled');
    json_settings = fix_deprecated_setting(json_settings, 'index_page.show_last_updated', 'index_page.page_header.show_last_updated');
    json_settings = fix_deprecated_setting(json_settings, 'masternodes_page.show_last_updated', 'masternodes_page.page_header.show_last_updated');
    json_settings = fix_deprecated_setting(json_settings, 'movement_page.show_last_updated', 'movement_page.page_header.show_last_updated');
    json_settings = fix_deprecated_setting(json_settings, 'network_page.show_last_updated', 'network_page.page_header.show_last_updated');
    json_settings = fix_deprecated_setting(json_settings, 'richlist_page.show_last_updated', 'richlist_page.page_header.show_last_updated');
    json_settings = fix_deprecated_setting(json_settings, 'markets_page.show_last_updated', 'markets_page.page_header.show_last_updated');
    json_settings = fix_deprecated_setting(json_settings, 'blockchain_specific.heavycoin.reward_page.show_last_updated', 'blockchain_specific.heavycoin.reward_page.page_header.show_last_updated');
    // check if social_links setting exists
    if (json_settings.shared_pages.page_footer.social_links != null) {
      // loop through the social links to look for and change image_url to image_path
      json_settings.shared_pages.page_footer.social_links.forEach(function(social_link) {
        // check if image_url exists 
        if (social_link.image_url != null) {
          // copy image_url to image_path 
          social_link.image_path = social_link.image_url;
          // delete the old setting
          delete social_link.image_url;
        }
      });
    }
    // fix old logo path
    if (json_settings.logo != null) {
      json_settings.logo = json_settings.logo.replace('/images/', '/img/');
    }
    json_settings = fix_deprecated_setting(json_settings, 'logo', 'shared_pages.logo');
    // check if old index.txs_per_page setting exists
    if (json_settings.index != null && json_settings.index.txs_per_page != null) {
      // fix parent elements to be sure there are no missing parents
      json_settings = ensure_parent_elements_exist(json_settings, 'index_page.transaction_table.items_per_page');
      json_settings = ensure_parent_elements_exist(json_settings, 'movement_page.movement_table.items_per_page');
      // copy old setting to new index setting
      json_settings.index_page.transaction_table.items_per_page = json_settings.index.txs_per_page;
      // copy old setting to new movement setting
      json_settings.movement_page.movement_table.items_per_page = json_settings.index.txs_per_page;
      // delete old setting
      delete json_settings.index.txs_per_page;
    }
    // fix parent elements to be sure there are no missing parents
    json_settings = ensure_parent_elements_exist(json_settings, 'richlist_page.burned_coins.addresses');
    // check if new burned_coins.addresses setting exists
    if (json_settings.richlist_page.burned_coins.addresses == null) {
      // initialize burned_coins.addresses as an empty array
      json_settings.richlist_page.burned_coins.addresses = [];
    }
    // check if old burned_coins setting exists
    if (json_settings.burned_coins != null) {
      // loop through old burned_coins
      json_settings.burned_coins.forEach(function(address) {
        // add new address string to burned_coins
        json_settings.richlist_page.burned_coins.addresses.push(address.address);
      });
      // delete old setting
      delete json_settings.burned_coins;
    }
    // fix parent elements to be sure there are no missing parents
    json_settings = ensure_parent_elements_exist(json_settings, 'shared_pages.page_footer.social_links');
    // check if new social_links setting exists
    if (json_settings.shared_pages.page_footer.social_links == null) {
      // initialize social_links as an empty array
      json_settings.shared_pages.page_footer.social_links = [];
    }
    // check if old github setting exists
    if (json_settings.github != null) {
      // add new object to social_links
      json_settings.shared_pages.page_footer.social_links.push({
        "enabled": (json_settings.display == null || json_settings.display.github == null ? false : json_settings.display.github),
        "tooltip_text": "Github",
        "url": "https://github.com/" + json_settings.github,
        "fontawesome_class": "fa-brands fa-github",
        "image_path": ""
      });
      // delete old settings
      delete json_settings.github;
      delete json_settings.display.github;
    }
    // check if old discord setting exists
    if (json_settings.discord != null) {
      // add new object to social_links
      json_settings.shared_pages.page_footer.social_links.push({
        "enabled": (json_settings.display == null || json_settings.display.discord == null ? false : json_settings.display.discord),
        "tooltip_text": "Discord",
        "url": json_settings.discord,
        "fontawesome_class": "fa-brands fa-discord",
        "image_path": ""
      });
      // delete old settings
      delete json_settings.discord;
      delete json_settings.display.discord;
    }
    // check if old telegram setting exists
    if (json_settings.telegram != null) {
      // add new object to social_links
      json_settings.shared_pages.page_footer.social_links.push({
        "enabled": (json_settings.display == null || json_settings.display.telegram == null ? false : json_settings.display.telegram),
        "tooltip_text": "Telegram",
        "url": "https://t.me/" + json_settings.telegram,
        "fontawesome_class": "fa-brands fa-telegram",
        "image_path": ""
      });
      // delete old settings
      delete json_settings.telegram;
      delete json_settings.display.telegram;
    }
    // check if old reddit setting exists
    if (json_settings.reddit != null) {
      // add new object to social_links
      json_settings.shared_pages.page_footer.social_links.push({
        "enabled": (json_settings.display == null || json_settings.display.reddit == null ? false : json_settings.display.reddit),
        "tooltip_text": "Reddit",
        "url": "https://reddit.com/r/" + json_settings.reddit,
        "fontawesome_class": "fa-brands fa-reddit",
        "image_path": ""
      });
      // delete old settings
      delete json_settings.reddit;
      delete json_settings.display.reddit;
    }
    // check if old youtube setting exists
    if (json_settings.youtube != null) {
      // add new object to social_links
      json_settings.shared_pages.page_footer.social_links.push({
        "enabled": (json_settings.display == null || json_settings.display.youtube == null ? false : json_settings.display.youtube),
        "tooltip_text": "YouTube",
        "url": json_settings.youtube,
        "fontawesome_class": "fa-brands fa-youtube",
        "image_path": ""
      });
      // delete old settings
      delete json_settings.youtube;
      delete json_settings.display.youtube;
    }
    // check if old slack setting exists
    if (json_settings.slack != null) {
      // add new object to social_links
      json_settings.shared_pages.page_footer.social_links.push({
        "enabled": (json_settings.display == null || json_settings.display.slack == null ? false : json_settings.display.slack),
        "tooltip_text": "Slack",
        "url": json_settings.slack,
        "fontawesome_class": "fa-brands fa-slack",
        "image_path": ""
      });
      // delete old settings
      delete json_settings.slack;
      delete json_settings.display.slack;
    }
    // check if old twitter setting exists
    if (json_settings.twitter != null) {
      // add new object to social_links
      json_settings.shared_pages.page_footer.social_links.push({
        "enabled": (json_settings.display == null || json_settings.display.twitter == null ? false : json_settings.display.twitter),
        "tooltip_text": "Twitter",
        "url": "https://twitter.com/" + json_settings.twitter,
        "fontawesome_class": "fa-brands fa-twitter",
        "image_path": ""
      });
      // delete old settings
      delete json_settings.twitter;
      delete json_settings.display.twitter;
    }
    // check if old facebook setting exists
    if (json_settings.facebook != null) {
      // add new object to social_links
      json_settings.shared_pages.page_footer.social_links.push({
        "enabled": (json_settings.display == null || json_settings.display.facebook == null ? false : json_settings.display.facebook),
        "tooltip_text": "Facebook",
        "url": "https://www.facebook.com/" + json_settings.facebook,
        "fontawesome_class": "fa-brands fa-facebook",
        "image_path": ""
      });
      // delete old settings
      delete json_settings.facebook;
      delete json_settings.display.facebook;
    }
    // check if old google+ setting exists
    if (json_settings.googleplus != null) {
      // add new object to social_links
      json_settings.shared_pages.page_footer.social_links.push({
        "enabled": (json_settings.display == null || json_settings.display.googleplus == null ? false : json_settings.display.googleplus),
        "tooltip_text": "Google+",
        "url": "https://plus.google.com/" + json_settings.googleplus,
        "fontawesome_class": "fa-brands fa-google-plus",
        "image_path": ""
      });
      // delete old settings
      delete json_settings.googleplus;
      delete json_settings.display.googleplus;
    }
    // check if old bitcointalk setting exists
    if (json_settings.bitcointalk != null) {
      // add new object to social_links
      json_settings.shared_pages.page_footer.social_links.push({
        "enabled": (json_settings.display == null || json_settings.display.bitcointalk == null ? false : json_settings.display.bitcointalk),
        "tooltip_text": "Bitcointalk",
        "url": "https://bitcointalk.org/index.php?topic=" + json_settings.bitcointalk,
        "fontawesome_class": "fa-brands fa-btc",
        "image_path": ""
      });
      // delete old settings
      delete json_settings.bitcointalk;
      delete json_settings.display.bitcointalk;
    }
    // check if old website setting exists
    if (json_settings.website != null) {
      // add new object to social_links
      json_settings.shared_pages.page_footer.social_links.push({
        "enabled": (json_settings.display == null || json_settings.display.website == null ? false : json_settings.display.website),
        "tooltip_text": "Website",
        "url": json_settings.website,
        "fontawesome_class": "fa-solid fa-link",
        "image_path": ""
      });
      // delete old settings
      delete json_settings.website;
      delete json_settings.display.website;
    }
    // check if the old markets.enabled setting exists
    if (json_settings.markets != null && json_settings.markets.enabled != null) {
      // loop through enabled markets
      json_settings.markets.enabled.forEach(function(market) {
        // fix parent elements to be sure there are no missing parents
        json_settings = ensure_parent_elements_exist(json_settings, 'markets_page.exchanges.' + market + '.enabled');
        // enable the market via new setting
        json_settings.markets_page.exchanges[market].enabled = true;
        // check if the old markets.coin and markets.exchange settings exist
        if (json_settings.markets.coin != null && json_settings.markets.exchange != null) {
          // set the new setting trading_pairs
          json_settings.markets_page.exchanges[market].trading_pairs = [json_settings.markets.coin + '/' + json_settings.markets.exchange];
          // check if the default exchange trading pair is set
          if (json_settings.markets_page.default_exchange.trading_pair == null) {
            // fix parent elements to be sure there are no missing parents
            json_settings = ensure_parent_elements_exist(json_settings, 'markets_page.default_exchange.trading_pair');
            // set the default exchange trading pair
            json_settings.markets_page.default_exchange.trading_pair = json_settings.markets.coin + '/' + json_settings.markets.exchange;
          }
        }
      });
      // delete the old settings
      delete json_settings.markets.enabled;
      delete json_settings.markets.coin;
      delete json_settings.markets.exchange;
    }
    // delete old unused settings
    if (Object.byString(json_settings, 'address') != null) delete json_settings.address;
    if (Object.byString(json_settings, 'display') != null) delete json_settings.display;
    if (Object.byString(json_settings, 'index') != null) delete json_settings.index;
    if (Object.byString(json_settings, 'api') != null) delete json_settings.api;
    if (Object.byString(json_settings, 'markets') != null) delete json_settings.markets;
    if (Object.byString(json_settings, 'richlist') != null) delete json_settings.richlist;
    if (Object.byString(json_settings, 'movement') != null) delete json_settings.movement;

    // fix old deprecated settings from v1.100
    if (json_settings.shared_pages.favicons == null && json_settings.shared_pages.favicon != null && fs.existsSync(json_settings.shared_pages.favicon)) {
      // create a new empty favicons object
      json_settings.shared_pages.favicons = {};

      // map the old favicon to the first entry in the new location
      json_settings = fix_deprecated_setting(json_settings, 'shared_pages.favicon', 'shared_pages.favicons.favicon32');

      // delete old setting
      delete json_settings.shared_pages.favicon;
    }
    json_settings = fix_deprecated_setting(json_settings, 'shared_pages.page_header.network_charts.difficulty_chart.line_color', 'shared_pages.page_header.network_charts.difficulty_chart.pow_line_color');
    json_settings = fix_deprecated_setting(json_settings, 'shared_pages.page_header.network_charts.difficulty_chart.fill_color', 'shared_pages.page_header.network_charts.difficulty_chart.pow_fill_color');

    // define an exception list of setting json paths (period separated) that do not have defaults and should not throw 'unknown setting' errors 
    let exceptions = ['labels'];

    // loop through all settings from the settings.json file
    for (var current_setting in json_settings) {
      // merge settings from settings.json with the defaults from settings.js
      merge_settings(json_settings, exceptions, json_settings[current_setting], current_setting);
    }

    // re-initialize the exceptions list
    exceptions = ['loadSettings', 'reloadLocale', 'localization'];

    // loop through the loaded/default settings (settings.js) to look for missing settings
    for (var current_setting in exports) {
      // look for missing settings from settings.json based on the defaults from settings.js
      check_missing_settings(json_settings, exceptions, exports[current_setting], current_setting);
    }
  }
};

// define a function to fix deprecated settings
fix_deprecated_setting = function(json_settings, old_path, new_path) {
  // check if the old setting exists
  if (Object.byString(json_settings, old_path) != null) {
    // old setting exists
    // check if the new setting exists
    if (Object.byString(json_settings, new_path) == null) {
      // new setting does not exist
      // get the old value
      var setting_value = Object.byString(json_settings, old_path);
      // remove the old setting
      eval('delete json_settings.' + old_path);
      // fix parent elements to be sure there are no missing parents
      json_settings = ensure_parent_elements_exist(json_settings, new_path);
      // set the new setting to the value of the old setting
      eval('json_settings' + fix_object_path(new_path) + ' = ' + JSON.stringify(setting_value));
      // show warning msg
      console.warn(exports.localization.deprecated_setting.replace('{1}', old_path).replace('{2}', new_path));
    }
  }

  return json_settings;
}

// define a function to ensure json parent elements are not null
ensure_parent_elements_exist = function(json_settings, path) {
  var split = path.split('.');
  // check if the setting has parent elements
  if (split.length > 1) {
    var running_path = '';
    // loop through the parent elements and create dummy containers for each non-existant parent setting
    for (i = 0; i < split.length - 1; i++) {
      // add to the running path
      running_path += (running_path == '' ? '' : '.') + split[i];
      // get the current setting value
      var current_value = Object.byString(json_settings, running_path)
      // check if this setting exists
      if (current_value == null || typeof current_value !== 'object') {
        // the setting does not exist or it is not an object, so overwrite the value with a dummy container for now
        eval('json_settings' + fix_object_path(running_path) + ' = {}');
      }
    } 
  }

  return json_settings;
}

// define a recursive function used to merge settings from different json objects
merge_settings = function(json_settings, exceptions, current_setting, path) {
  // check if this is an object with more properties
  if (typeof current_setting === 'object' && current_setting !== null) {
    // this is an object
    // check if this object already exists in the default settings (settings.js)
    if (Object.byString(exports, path) == null) {
      // this setting object does not exist in settings.js
      // show warning msg
      console.warn(exports.localization.unknown_setting.replace('{1}', path));
    } else {
      // the object exists in the loaded settings
      // check if the object is an array or is one of the exceptions
      if (Array.isArray(current_setting) || exceptions.indexOf(path) > -1) {
        // the object is an array or is an exception
        // merge the object into settings.js without checking object keys
        eval('exports' + fix_object_path(path) + ' = ' + JSON.stringify(Object.byString(json_settings, path)));
      } else {
        // the object is not an array or an exception
        // loop through the object keys to continue checking for missing properties
        for (var setting_name in current_setting) {
          // recursively step through all properties of this object and merge setting values
          merge_settings(json_settings, exceptions, current_setting[setting_name], path + '.' + setting_name);
        }
      }
    }
  } else {
    // this is a property
    // check if this property already exists in the default settings (settings.js)
    if (Object.byString(exports, path) == null) {
      // this setting property does not exist in settings.js
      // show warning msg
      console.warn(exports.localization.unknown_setting.replace('{1}', path));
    } else {
      // the property exists in the loaded settings
      // get the settings.json value
      var setting_value = Object.byString(json_settings, path);
      // overwrite the property value with the value from settings.json
      eval('exports' + fix_object_path(path) + ' = ' + JSON.stringify(setting_value));
    }
  }
}

// define a recursive function used to check settings for missing entries between json objects
check_missing_settings = function(json_settings, exceptions, current_setting, path) {
  // check if this is an object with more properties
  if (typeof current_setting === 'object' && current_setting !== null) {
    // this is an object
    // check if this object exists in the json settings (settings.json)
    if (Object.byString(json_settings, path) == null) {
      // this setting object does not exist in settings.json
      // check if it is an exception
      if (exceptions.indexOf(path) == -1) {
        // this is not one of the exceptions
        // show warning msg
        console.warn(exports.localization.missing_setting.replace('{1}', path));
      }
    } else {
      // the object exists in the json settings
      // loop through the object keys to continue checking for missing properties
      for (var setting_name in current_setting) {
        // recursively step through all properties of this object
        check_missing_settings(json_settings, exceptions, current_setting[setting_name], path + '.' + setting_name);
      }
    }
  } else {
    // this is a property
    // check if this property exists in the json settings (settings.json)
    if (Object.byString(json_settings, path) == null) {
      // this setting property does not exist in settings.json
      // check if it is an exception
      if (exceptions.indexOf(path) == -1) {
        // this is not one of the exceptions
        // show warning msg
        console.warn(exports.localization.missing_setting.replace('{1}', path));
      }
    }
  }
}

// define a function used to fix object paths
fix_object_path = function(path) {
  return "['" + path.replace(/\./g, "']['") + "']";
}

/* Special thanks to Alnitak for the Object.byString function: https://stackoverflow.com/a/6491621/3038650 */
Object.byString = function(o, s) {
  s = s.replace(/\[(\w+)\]/g, '.$1'); // convert indexes to properties
  s = s.replace(/^\./, '');           // strip a leading dot
  var a = s.split('.');
  for (var i = 0, n = a.length; i < n; ++i) {
    var k = a[i];
    if (typeof o === 'object' && o !== null && k in o)
      o = o[k];
    else
      return;
  }
  return o;
}

// load the locale file
const locale = require('./locale');

// add the reloadLocale function to the settings exports
exports.reloadLocale = locale.reloadLocale;

// populate locale strings
exports.localization = exports.reloadLocale(exports.locale);

// populate settings
exports.loadSettings();