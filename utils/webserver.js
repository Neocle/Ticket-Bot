const express = require('express');
const session = require('express-session');
const SQLiteStore = require('connect-sqlite3')(session);
const passport = require('passport');
const DiscordStrategy = require('discord-strategy').Strategy;
const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');
const cors = require('cors');
require('dotenv').config();
const config = require('../config.json');

const app = express();
const PORT = config.app.port || 3000;
const APP_NAME = config.app.name || 'Transcript Viewer';
const APP_COPYRIGHT = config.app.copyright || 'Neocle & Zyztem. All rights reserved.';
const APP_URL = config.app.url || 'http://localhost';
const APP_ICON = config.app.icon || 'https://assets.streamlinehq.com/image/private/w_512,h_512,ar_1/f_auto/v1/icons/1/admission-tickets.png';
const GUILD_ID = config.guildId;
const STAFF_ROLE_ID = config.staffRoleId;

passport.use('discord', new DiscordStrategy({
    authorizationURL: 'https://discord.com/api/oauth2/authorize',
    tokenURL: 'https://discord.com/api/oauth2/token',
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: `${APP_URL}/auth/discord/callback`,
    scope: ['identify', 'guilds', 'guilds.members.read'],
  }, async (accessToken, refreshToken, profile, done) => {
    try {

      const response = await fetch(`https://discord.com/api/v10/users/@me/guilds/${GUILD_ID}/member`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      if (!response.ok) {
        console.error('Failed to fetch guild member data:', response.status, await response.text());
        return done(null, false, { message: 'Failed to fetch guild member data.' });
      }

      const guildMember = await response.json();
      profile.guildMember = guildMember;
      return done(null, profile);
    } catch (error) {
      console.error('Error in authentication:', error);
      return done(error, null);
    }
  }));
passport.serializeUser((user, done) => done(null, user));
passport.deserializeUser((obj, done) => done(null, obj));

const whitelist = [APP_URL, `http://localhost:${PORT}`];
const corsOptions = {
    origin: (origin, callback) => {
        if (whitelist.includes(origin) || !origin) callback(null, true);
        else callback(new Error('Not allowed by CORS'));
    },
    credentials: true, // Allow cookies to be sent with CORS
};

app.use(cors(corsOptions));
app.use(session({
    store: new SQLiteStore({ db: process.env.SESSION_DATABASE, dir: '.' }),
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: true,
    cookie: { maxAge: 3 * 60 * 60 * 1000 }
}));

app.use(passport.initialize());
app.use(passport.session());

const footer = `
<footer class="text-center text-gray-600 dark:text-gray-400 mt-6 mb-4">
    <p class="text-gray-600 dark:text-gray-400">
        Made with ❤️ by 
        <a href="https://github.com/neocle" class="text-gray-700 dark:text-gray-300 hover:underline">
            Neocle
        </a> & 
        <a href="https://github.com/zyztem" class="text-gray-700 dark:text-gray-300 hover:underline">
            Zyztem
        </a>
    </p>
    <p>&copy; ${new Date().getFullYear()} ${APP_COPYRIGHT}</p>
</footer>`;

app.get('/', (req, res) => {
    if (req.isAuthenticated()) return res.redirect('/transcripts');

    res.send(`
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="theme-color" content="#3b82f6">
    <link rel="icon" type="image/png" href="${APP_ICON}">
    <title>Login - ${APP_NAME}</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <script>
      document.addEventListener('DOMContentLoaded', () => {
        const isDarkMode = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
        if (isDarkMode) {
          document.documentElement.classList.add('dark');
        }
      });
    </script>
</head>
<body class="bg-gray-100 dark:bg-gray-900 flex flex-col min-h-screen">
  <div class="flex-grow flex items-center justify-center">
    <div class="bg-white dark:bg-gray-800 p-8 rounded-lg shadow-lg max-w-lg w-full">
      <h1 class="text-3xl font-bold text-gray-800 dark:text-gray-200 mb-4 text-center">${APP_NAME}</h1>
      <p class="text-lg text-gray-700 dark:text-gray-300 mb-6 text-center">
        Please login with Discord to view transcripts.
      </p>
      <a href="/auth/discord" class="flex items-center justify-center w-full px-4 py-2 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 transition duration-200">
        <img src="https://api.iconify.design/fa6-brands:discord.svg?color=%23ffffff" alt="Discord Logo" class="w-6 h-6 mr-2 text-white -mb-1"> Login with Discord
      </a>
    </div>
  </div>
  ${footer}
</body>
    `);
});

app.get('/auth/discord', passport.authenticate('discord'));

app.get('/auth/discord/callback',
    passport.authenticate('discord', { failureRedirect: '/' }),
    (req, res) => {
        const userRoles = req.user.guildMember?.roles || [];
        if (!userRoles.includes(STAFF_ROLE_ID)) {
            req.logout(err => {
                if (err) return next(err);
                return res.redirect('/');
            });
        } else {
            return res.redirect('/transcripts');
        }
    }
);

function isAuthorized(req, res, next) {
    if (req.isAuthenticated()) {
        const userRoles = req.user.guildMember?.roles || [];
        if (userRoles.includes(STAFF_ROLE_ID)) return next();
        else return res.redirect(process.env.APP_URL);
    } else {
        return res.redirect('/');
    }
}

function getTranscripts() {
    const transcriptsDir = path.join(__dirname, '../transcripts');
    return fs.readdirSync(transcriptsDir)
        .filter(file => file.endsWith('.html'))
        .map(file => ({
            name: file.replace('.html', ''),
            time: fs.statSync(path.join(transcriptsDir, file)).mtime
        }))
        .sort((a, b) => b.time - a.time);
}

app.get('/transcripts', isAuthorized, (req, res) => {
    const transcripts = getTranscripts();

    res.send(`
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="theme-color" content="#3b82f6">
    <link rel="icon" type="image/png" href="${APP_ICON}"</link>
    <title>Transcripts - ${APP_NAME}</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <script>
      function filterTranscripts() {
        const input = document.getElementById('searchInput').value.toLowerCase();
        const cards = document.getElementsByClassName('transcript-card');
        for (let card of cards) {
          const text = card.textContent.toLowerCase();
          card.style.display = text.includes(input) ? 'block' : 'none';
        }
      }

      function viewTranscript(name) {
        window.location.href = '/transcripts/' + name;
      }

      // Toggle dark mode based on user preference
      document.addEventListener('DOMContentLoaded', () => {
        const isDarkMode = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
        if (isDarkMode) {
          document.documentElement.classList.add('dark');
        }
      });
    </script>
</head>

<body class="bg-gray-100 dark:bg-gray-900 flex flex-col min-h-screen">
    <div class="flex-grow flex items-center justify-center">
        <div class="bg-white dark:bg-gray-800 p-8 rounded-lg shadow-lg max-w-lg w-full">
            <h1 class="text-3xl font-bold text-gray-800 dark:text-gray-200 mb-4 text-center">${APP_NAME}</h1>
            <p class="text-lg text-gray-700 dark:text-gray-300 mb-6 text-center">
                Hello <span class="font-semibold">${req.user.guildMember.user.global_name}</span>!
            </p>

            <!-- Search Input -->
            <div class="mb-4">
                <input type="text" id="searchInput" onkeyup="filterTranscripts()" placeholder="Search transcripts..." class="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-400 transition">
            </div>

            <!-- Transcripts Card Container -->
            <div class="scrollable mb-6">
                ${transcripts.map(transcript => `
                  <div class="transcript-card border border-gray-300 dark:border-gray-600 rounded-lg p-4 mb-2 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 hover:ring-2 hover:ring-gray-400" onclick="viewTranscript('${transcript.name}')">
                    <p class="font-semibold dark:text-gray-200">${transcript.name}</p>
                    <p class="text-gray-500 dark:text-gray-400 text-sm">${new Date(transcript.time).toLocaleString()}</p>
                  </div>
                `).join('')}
            </div>

            <!-- Logout Button -->
            <div class="flex justify-center">
                <a href="/logout" class="w-full flex items-center justify-center px-4 py-2 bg-red-600 dark:bg-red-700 text-white font-semibold rounded-lg hover:bg-red-700 dark:hover:bg-red-600 transition-colors duration-200">
                    Logout
                </a>
            </div>
        </div>
    </div>
  
    <!-- Footer -->
    ${footer}
</body>
    `);
});

app.get('/transcripts/:name', isAuthorized, (req, res) => {
    const filePath = path.join(__dirname, '../transcripts', req.params.name);
    res.sendFile(filePath, (err) => {
        if (err) {
            console.error('Error sending file:', err);
            res.status(err.status).end();
        }
    });
});

app.get('/logout', (req, res) => {
    req.logout(err => {
        if (err) return next(err);
        res.redirect('/');
    });
});

app.listen(PORT, () => {
    console.log(`${APP_NAME} running on port ${PORT}`);
});
