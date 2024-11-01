const express = require('express');
const session = require('express-session');
const passport = require('passport');
const DiscordStrategy = require('passport-discord').Strategy;
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// List of authorized users (Discord IDs)
const authorizedUsers = process.env.AUTHORIZED_USERS.split(',');

passport.use(new DiscordStrategy({
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: `${process.env.BASE_URL}/auth/discord/callback`,
  }, (accessToken, refreshToken, profile, done) => {
    return done(null, profile);
  }));

passport.serializeUser((user, done) => {
  done(null, user);
});

passport.deserializeUser((obj, done) => {
  done(null, obj);
});

app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: true,
  maxAge: 3 * 60 * 60 * 1000, // Cookie expiration set to 3 hours
}));

app.use(passport.initialize());
app.use(passport.session());

// Routes
app.get('/', (req, res) => {
  res.send(`
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Login - AloraMC Ticket Viewer</title>
    <link rel="icon" type="image/png" href="https://cdn.discordapp.com/avatars/1234978265513463961/8e268911b45e01a547a681b66c117aa6.png"</link>
    <script src="https://cdn.tailwindcss.com"></script>
    <script src="https://code.iconify.design/2/2.2.1/iconify.min.js"></script>
</head>
<body class="bg-gray-100 dark:bg-gray-900 flex flex-col min-h-screen">
  <div class="flex-grow flex items-center justify-center">
    <div class="bg-white dark:bg-gray-800 p-8 rounded-lg shadow-lg max-w-md w-full">
      <h1 class="text-3xl font-bold text-gray-800 dark:text-gray-200 mb-6 text-center">AloraMC Transcript Viewer</h1>
      <p class="text-center text-gray-600 dark:text-gray-400 mb-6">Sign in to access the transcripts</p>
      <a href="/auth/discord" class="flex items-center justify-center w-full px-4 py-2 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 transition duration-200">
        <!-- Discord Icon using Iconify -->
        <span class="iconify mr-2" data-icon="simple-icons:discord" style="font-size: 1.25rem;"></span>
        Login with Discord
      </a>
    </div>
  </div>

  <footer class="text-center text-gray-600 dark:text-gray-400 mb-4">
        <p class="text-gray-600 dark:text-gray-400 items-center justify-center mt-4 text-center">
        Made with ❤️ by 
        <a href="https://github.com/neocle" class="text-emerald-500 dark:text-emerald-400 hover:underline">
          Neocle
        </a> &
        <a href="https://github.com/zyztem" class="text-emerald-500 dark:text-emerald-400 hover:underline">
          Zyztem
        </a>
      </p>
    <p>&copy; ${new Date().getFullYear()} AloraMC. All rights reserved.</p>
  </footer>
</body>
  `);
});

app.get('/auth/discord', (req, res, next) => {
  passport.authenticate('discord', {
      scope: ['identify'], // Request the required scopes
      prompt: 'none' // Skip the prompt if already authenticated
  })(req, res, next);
});

app.get('/auth/discord/callback',
  passport.authenticate('discord', { failureRedirect: '/' }),
  (req, res) => {
    res.redirect('/transcripts');
  });

// Middleware to check if user is authorized
function isAuthorized(req, res, next) {
  if (req.isAuthenticated() && authorizedUsers.includes(req.user.id)) {
    return next();
  }
  res.redirect('/');
}

// Get list of transcripts from the transcripts directory
function getTranscripts() {
  const transcriptsDir = path.join(__dirname, '../transcripts');
  return fs.readdirSync(transcriptsDir)
    .filter(file => file.endsWith('.html')) // Adjust the file extension if needed
    .map(file => ({
      name: file,
      path: path.join(transcriptsDir, file),
      time: fs.statSync(path.join(transcriptsDir, file)).mtime // Get the modification time
    }))
    .sort((a, b) => b.time - a.time); // Sort by newest first
}

// Route to display transcripts
app.get('/transcripts', isAuthorized, (req, res) => {
  const transcripts = getTranscripts();

  res.send(`
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="theme-color" content="#3b82f6"> <!-- Default theme color -->
    <link rel="icon" type="image/png" href="https://cdn.discordapp.com/avatars/1234978265513463961/8e268911b45e01a547a681b66c117aa6.png"</link>
    <title>Transcripts - AloraMC Transcript Viewer</title>
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
        <div class="bg-white dark:bg-gray-800 p-8 rounded-lg shadow-lg max-w-md w-full">
            <h1 class="text-3xl font-bold text-gray-800 dark:text-gray-200 mb-4 text-center">AloraMC Transcript Viewer</h1>
            <p class="text-lg text-gray-700 dark:text-gray-300 mb-6 text-center">
                Hello, <span class="font-semibold">${req.user.username}</span>!
            </p>

            <!-- Search Input -->
            <div class="mb-4">
                <input type="text" id="searchInput" onkeyup="filterTranscripts()" placeholder="Search transcripts..." class="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-400 transition">
            </div>

            <!-- Transcripts Card Container -->
            <div class="scrollable mb-6">
                ${transcripts.map(transcript => `
                  <div class="transcript-card border border-gray-300 dark:border-gray-600 rounded-lg p-4 mb-2 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 hover:ring-2 hover:ring-emerald-400" onclick="viewTranscript('${transcript.name}')">
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
    <footer class="text-center text-gray-600 dark:text-gray-400 mt-6 mb-4">
        <p class="text-gray-600 dark:text-gray-400">
            Made with ❤️ by 
            <a href="https://github.com/neocle" class="text-emerald-400 hover:underline">
              Neocle
            </a> &
            <a href="https://github.com/zyztem" class="text-emerald-400 hover:underline">
              Zyztem
            </a>
        </p>
        <p>&copy; ${new Date().getFullYear()} AloraMC. All rights reserved.</p>
    </footer>
</body>
`);
});

// Static route to serve transcripts
app.get('/transcripts/:name', isAuthorized, (req, res) => {
  const transcriptName = req.params.name;
  const transcriptPath = path.join(__dirname, '../transcripts', transcriptName);
  res.sendFile(transcriptPath);
});

// Logout route
app.get('/logout', (req, res) => {
  req.logout(err => {
    if (err) {
      return next(err);
    }
    res.redirect('/');
  });
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
