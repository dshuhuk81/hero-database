import express from 'express';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

// Env-Variablen laden
dotenv.config({ path: '.env.local' });

const app = express();
const PORT = process.env.API_PORT || 3001;

// Middleware
app.use(express.json());

// Supabase Clients
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('ERROR: Missing Supabase credentials');
  process.exit(1);
}

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

// CORS Middleware
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  res.header('Access-Control-Max-Age', '86400');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

// Health Check
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Debug endpoint to verify API is reachable
app.post('/api/debug/ping', (req, res) => {
  res.json({ message: 'pong', timestamp: new Date().toISOString() });
});

// Register Endpoint
app.post('/api/auth/register', async (req, res) => {
  try {
    const { email, password, confirmPassword } = req.body;

    console.log('Register attempt:', email);

    // Validierung
    if (!email || !password || !confirmPassword) {
      return res.status(400).json({ error: 'Email und Passwort sind erforderlich' });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({ error: 'Passwörter stimmen nicht überein' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Passwort muss mindestens 6 Zeichen lang sein' });
    }

    // Benutzer registrieren mit Email-Bestätigung
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,  // Email ist sofort bestätigt
    });

    if (authError) {
      console.error('Auth error:', authError);
      return res.status(400).json({ error: authError.message });
    }

    // User-Profil erstellen
    const { error: profileError } = await supabaseAdmin
      .from('user_profiles')
      .insert({
        id: authData.user.id,
        email: authData.user.email,
      });

    if (profileError) {
      console.error('Profile error:', profileError);
      // Cleanup
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
      return res.status(400).json({ error: 'Fehler beim Erstellen des Profils' });
    }

    console.log('User registered successfully:', authData.user.id);
    return res.status(201).json({
      message: 'Registrierung erfolgreich',
      user: {
        id: authData.user.id,
        email: authData.user.email,
      },
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ error: 'Interner Fehler: ' + error.message });
  }
});

// Login Endpoint
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    console.log('Login attempt:', email);

    if (!email || !password) {
      return res.status(400).json({ error: 'Email und Passwort sind erforderlich' });
    }

    // Mit Service Role client kann man nicht login...
    // Wir müssen das anders machen mit der Anon-Key
    const supabaseClient = createClient(supabaseUrl, process.env.SUPABASE_ANON_KEY);

    const { data, error } = await supabaseClient.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      console.error('Login error:', error);
      return res.status(401).json({ error: error.message });
    }

    res.json({
      message: 'Login erfolgreich',
      user: {
        id: data.user.id,
        email: data.user.email,
      },
      session: data.session,
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Interner Fehler: ' + error.message });
  }
});

// Logout Endpoint
app.post('/api/auth/logout', (req, res) => {
  res.json({ message: 'Logout erfolgreich' });
});

// ========== USER HEROES API ==========

// Middleware zur Authentifizierung
const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ error: 'Kein Token gefunden' });
  }

  try {
    // Token verifizieren mit Supabase
    const { data: userData, error } = await supabaseAdmin.auth.getUser(token);
    
    if (error || !userData.user) {
      return res.status(401).json({ error: 'Ungültiger Token' });
    }

    req.userId = userData.user.id;
    next();
  } catch (error) {
    console.error('Token verification error:', error);
    res.status(401).json({ error: 'Token-Verifizierung fehlgeschlagen' });
  }
};

// GET /api/user/heroes - Alle Heroes des Users abrufen
app.get('/api/user/heroes', authenticateToken, async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('user_heroes')
      .select('*')
      .eq('user_id', req.userId)
      .order('added_at', { ascending: false });

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.json(data);
  } catch (error) {
    console.error('Get heroes error:', error);
    res.status(500).json({ error: 'Fehler beim Abrufen der Heroes' });
  }
});

// POST /api/user/heroes - Hero zur Sammlung hinzufügen
app.post('/api/user/heroes', authenticateToken, async (req, res) => {
  try {
    const { heroId, notes, level, evolution } = req.body;

    if (!heroId) {
      return res.status(400).json({ error: 'heroId ist erforderlich' });
    }

    const { data, error } = await supabaseAdmin
      .from('user_heroes')
      .insert({
        user_id: req.userId,
        hero_id: heroId,
        notes: notes || null,
        level: level || 1,
        evolution: evolution || 1,
      })
      .select();

    if (error) {
      if (error.code === '23505') {
        return res.status(400).json({ error: 'Dieser Hero ist bereits in deiner Sammlung' });
      }
      return res.status(400).json({ error: error.message });
    }

    res.status(201).json({
      message: 'Hero hinzugefügt',
      hero: data[0],
    });
  } catch (error) {
    console.error('Add hero error:', error);
    res.status(500).json({ error: 'Fehler beim Hinzufügen des Heroes' });
  }
});

// DELETE /api/user/heroes/:heroId - Hero aus Sammlung entfernen
app.delete('/api/user/heroes/:heroId', authenticateToken, async (req, res) => {
  try {
    const { heroId } = req.params;

    const { error } = await supabaseAdmin
      .from('user_heroes')
      .delete()
      .eq('user_id', req.userId)
      .eq('hero_id', heroId);

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.json({ message: 'Hero entfernt' });
  } catch (error) {
    console.error('Delete hero error:', error);
    res.status(500).json({ error: 'Fehler beim Entfernen des Heroes' });
  }
});

// PATCH /api/user/heroes/:heroId - Favoriten-Status oder Evolution aktualisieren
app.patch('/api/user/heroes/:heroId', authenticateToken, async (req, res) => {
  try {
    const { heroId } = req.params;
    const { is_favorited, evolution } = req.body;

    const updateData = {};
    
    if (typeof is_favorited !== 'undefined') {
      if (typeof is_favorited !== 'boolean') {
        return res.status(400).json({ error: 'is_favorited muss true oder false sein' });
      }
      updateData.is_favorited = is_favorited;
    }
    
    if (typeof evolution !== 'undefined') {
      const evoNum = parseInt(evolution);
      if (isNaN(evoNum) || evoNum < 1 || evoNum > 15) {
        return res.status(400).json({ error: 'evolution muss zwischen 1 und 15 sein' });
      }
      updateData.evolution = evoNum;
    }

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({ error: 'Keine gültigen Update-Daten' });
    }

    const { data, error } = await supabaseAdmin
      .from('user_heroes')
      .update(updateData)
      .eq('user_id', req.userId)
      .eq('hero_id', heroId)
      .select();

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    if (!data || data.length === 0) {
      return res.status(404).json({ error: 'Hero nicht gefunden' });
    }

    res.json({
      message: 'Hero aktualisiert',
      hero: data[0],
    });
  } catch (error) {
    console.error('Update hero error:', error);
    res.status(500).json({ error: 'Fehler beim Aktualisieren des Heroes' });
  }
});

// Helper: Generate short random ID
function generateShareId() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let id = '';
  for (let i = 0; i < 8; i++) {
    id += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return id;
}

// POST /api/user/heroes/share - Create shareable hero setup
app.post('/api/user/heroes/share', authenticateToken, async (req, res) => {
  try {
    console.log('Share request from user:', req.userId);
    
    // Get user's heroes
    const { data: heroes, error: heroesError } = await supabaseAdmin
      .from('user_heroes')
      .select('hero_id, evolution')
      .eq('user_id', req.userId);

    if (heroesError) {
      console.error('Heroes fetch error:', heroesError);
      return res.status(400).json({ error: heroesError.message });
    }

    if (!heroes || heroes.length === 0) {
      return res.status(400).json({ error: 'Du hast keine Heroes um zu teilen' });
    }

    console.log('Found heroes:', heroes.length);

    // Generate unique share ID
    let shareId = generateShareId();
    let attempts = 0;
    while (attempts < 5) {
      const { data: existing, error: checkError } = await supabaseAdmin
        .from('shared_hero_configs')
        .select('id')
        .eq('share_id', shareId)
        .limit(1);

      if (checkError) {
        console.error('Share ID check error:', checkError);
      }
      
      if (!existing || existing.length === 0) break;
      shareId = generateShareId();
      attempts++;
    }

    console.log('Generated share ID:', shareId);

    // Create shared config
    const { data, error } = await supabaseAdmin
      .from('shared_hero_configs')
      .insert({
        share_id: shareId,
        user_id: req.userId,
        heroes_data: JSON.stringify(heroes),
      })
      .select();

    if (error) {
      console.error('Insert error:', error);
      return res.status(400).json({ error: error.message });
    }

    console.log('Share created successfully');

    res.status(201).json({
      message: 'Setup geteilt',
      shareId: shareId,
      shareUrl: `${process.env.FRONTEND_URL || 'http://localhost:4322'}/shared-heroes/${shareId}`,
    });
  } catch (error) {
    console.error('Share error:', error);
    res.status(500).json({ error: 'Error: ' + error.message });
  }
});

// GET /api/shared-heroes/:shareId - Get public shared hero setup (no auth required)
app.get('/api/shared-heroes/:shareId', async (req, res) => {
  try {
    const { shareId } = req.params;

    const { data, error } = await supabaseAdmin
      .from('shared_hero_configs')
      .select('share_id, heroes_data, created_at, user_id')
      .eq('share_id', shareId)
      .limit(1);

    if (error) {
      console.error('Get shared config error:', error);
      return res.status(400).json({ error: error.message });
    }

    if (!data || data.length === 0) {
      return res.status(404).json({ error: 'Setup nicht gefunden' });
    }

    const config = data[0];
    const heroesData = typeof config.heroes_data === 'string' 
      ? JSON.parse(config.heroes_data) 
      : config.heroes_data;

    res.json({
      shareId: config.share_id,
      heroesData: heroesData,
      createdAt: config.created_at,
      creator: {
        email: 'Anonymous',
      },
    });
  } catch (error) {
    console.error('Get shared config error:', error);
    res.status(500).json({ error: 'Error: ' + error.message });
  }
});

// Error Handler
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ error: 'Interner Fehler' });
});

app.listen(PORT, () => {
  console.log(`API Server läuft auf http://localhost:${PORT}`);
  console.log('Health Check: http://localhost:${PORT}/health');
});
