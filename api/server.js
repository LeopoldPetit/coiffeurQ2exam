const express = require('express');
const sqlite3 = require('sqlite3');
const path = require('path');
const fs = require('fs');
const bodyParser = require('body-parser');
const usersFilePath = path.resolve(__dirname, 'data/user.json');
const dbPath = path.resolve(__dirname, 'data/coiffeurs.db');
let isLoggedIn = false;
const app = express();
const port = 3000;

// Middleware
app.use(bodyParser.json()); // Utilisation de bodyParser pour traiter les données JSON
app.use(express.static(path.join(__dirname, '..', 'public'))); // Serveur des fichiers statiques
let db = new sqlite3.Database(dbPath, sqlite3.OPEN_READWRITE, (err) => {
    if (err) {
        console.error(err.message);
        return;
    }
    console.log('Connected to the SQLite database.');

    // Créer la table 'favorites' si elle n'existe pas
    const createFavoritesTableQuery = `
        CREATE TABLE IF NOT EXISTS favorites (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            coiffeur_id INTEGER NOT NULL,
            FOREIGN KEY(user_id) REFERENCES users(id),
            FOREIGN KEY(coiffeur_id) REFERENCES coiffeurs(id),
            UNIQUE(user_id, coiffeur_id)
        )
    `;

    db.run(createFavoritesTableQuery, (err) => {
        if (err) {
            console.error('Erreur lors de la création de la table favorites:', err.message);
        } else {
            console.log('Table favorites créée ou déjà existante.');
        }
    });
});
app.post('/api/favorites', (req, res) => {
    const { user_id, coiffeur_nom } = req.body;

    let db = new sqlite3.Database(dbPath, sqlite3.OPEN_READWRITE, (err) => {
        if (err) {
            console.error(err.message);
            res.status(500).json({ error: 'Erreur de connexion à la base de données' });

        }
    });

    // Trouver l'ID du coiffeur basé sur le nom
    db.get('SELECT id FROM coiffeurs WHERE nom = ?', [coiffeur_nom], (err, row) => {
        if (err) {
            console.error(err.message);
            res.status(500).json({ error: 'Erreur lors de la recherche du coiffeur' });
            return;
        }

        if (!row) {
            res.status(404).json({ error: 'Coiffeur non trouvé' });
            return;
        }

        const coiffeur_id = row.id;

        // Ajouter le coiffeur aux favoris
        const query = `INSERT INTO favorites (user_id, coiffeur_id) VALUES (?, ?)`;

        db.run(query, [user_id, coiffeur_id], function(err) {
            if (err) {
                console.error(err.message);
                res.status(500).json({ error: 'Erreur lors de l\'ajout du favori' });
            } else {
                res.json({ success: true, message: 'Coiffeur ajouté aux favoris', id: this.lastID });
            }
        });
    });

    db.close();
});

app.get('/api/isFavorite', (req, res) => {
    const { user_id, coiffeur_nom } = req.query;

    if (!user_id || !coiffeur_nom) {
        return res.status(400).json({ error: 'user_id et coiffeur_nom sont requis' });
    }

    let db = new sqlite3.Database(dbPath, sqlite3.OPEN_READWRITE, (err) => {
        if (err) {
            console.error(err.message);
            res.status(500).json({ error: 'Erreur de connexion à la base de données' });

        }
    });

    // Trouver l'ID du coiffeur basé sur le nom
    db.get('SELECT id FROM coiffeurs WHERE nom = ?', [coiffeur_nom], (err, row) => {
        if (err) {
            console.error(err.message);
            res.status(500).json({ error: 'Erreur lors de la recherche du coiffeur' });
            return;
        }

        if (!row) {
            res.status(404).json({ error: 'Coiffeur non trouvé' });
            return;
        }

        const coiffeur_id = row.id;

        // Vérifier si le coiffeur est déjà dans les favoris de l'utilisateur
        db.get('SELECT 1 FROM favorites WHERE user_id = ? AND coiffeur_id = ?', [user_id, coiffeur_id], (err, row) => {
            if (err) {
                console.error(err.message);
                res.status(500).json({ error: 'Erreur lors de la vérification des favoris' });
                return;
            }

            res.json({ isFavorite: !!row });
        });
    });

    db.close();
});


// Route pour retirer un coiffeur des favoris
app.delete('/api/favorites', (req, res) => {
    const { user_id, coiffeur_nom } = req.body;

    if (!user_id || !coiffeur_nom) {
        return res.status(400).json({ error: 'user_id et coiffeur_nom sont requis' });
    }

    let db = new sqlite3.Database(dbPath, sqlite3.OPEN_READWRITE, (err) => {
        if (err) {
            console.error(err.message);
            res.status(500).json({ error: 'Erreur de connexion à la base de données' });

        }
    });

    // Trouver l'ID du coiffeur basé sur le nom
    db.get('SELECT id FROM coiffeurs WHERE nom = ?', [coiffeur_nom], (err, row) => {
        if (err) {
            console.error(err.message);
            res.status(500).json({ error: 'Erreur lors de la recherche du coiffeur' });
            return;
        }

        if (!row) {
            res.status(404).json({ error: 'Coiffeur non trouvé' });
            return;
        }

        const coiffeur_id = row.id;

        // Retirer le coiffeur des favoris
        const query = `DELETE FROM favorites WHERE user_id = ? AND coiffeur_id = ?`;

        db.run(query, [user_id, coiffeur_id], function(err) {
            if (err) {
                console.error(err.message);
                res.status(500).json({ error: 'Erreur lors de la suppression du favori' });
            } else if (this.changes === 0) {
                res.status(404).json({ error: 'Favori non trouvé' });
            } else {
                res.json({ success: true, message: 'Coiffeur retiré des favoris' });
            }
        });
    });

    db.close();
});

app.get('/api/favorites/count', (req, res) => {
    const user_id = 1;

    let db = new sqlite3.Database(dbPath, sqlite3.OPEN_READONLY, (err) => {
        if (err) {
            console.error(err.message);
            res.status(500).json({ error: 'Erreur de connexion à la base de données' });

        }
    });

    db.get('SELECT COUNT(*) AS count FROM favorites WHERE user_id = ?', [user_id], (err, row) => {
        if (err) {
            console.error(err.message);
            res.status(500).json({ error: 'Erreur lors de la récupération du nombre de favoris' });
            return;
        }

        res.json({ count: row.count });
    });

    db.close();
});



app.get('/api/favorites', (req, res) => {
    let db = new sqlite3.Database(dbPath, sqlite3.OPEN_READWRITE, (err) => {
        if (err) {
            console.error(err.message);
            res.status(500).json({ error: 'Erreur de connexion à la base de données' });

        }
    });

    const query = `
        SELECT u.username, c.nom, c.numero, c.voie, c.code_postal, c.ville, c.latitude, c.longitude 
        FROM coiffeurs c
        INNER JOIN favorites f ON c.id = f.coiffeur_id
        INNER JOIN users u ON f.user_id = u.id
    `;

    db.all(query, [], (err, rows) => {
        if (err) {
            console.error(err.message);
            res.status(500).json({ error: 'Erreur lors de la récupération des favoris' });
        } else {
            res.json({ favorites: rows });
        }
    });

    db.close((err) => {
        if (err) {
            console.error(err.message);
        } else {
            console.log('Disconnected from the SQLite database.');
        }
    });
});

app.get('/api/allCoiffeurs', (req, res) => {
    const searchTerm = req.query.searchTerm ? req.query.searchTerm.toLowerCase() : null;
    const searchNom = req.query.nom ? req.query.nom.toLowerCase() : null;
    const searchNumero = req.query.numero ? req.query.numero.toLowerCase() : null;
    const searchVoie = req.query.voie ? req.query.voie.toLowerCase() : null;
    const searchCodePostal = req.query.code_postal ? req.query.code_postal.toLowerCase() : null;
    const searchVille = req.query.ville ? req.query.ville.toLowerCase() : null;
    const sortBy = req.query.sortBy || 'nom'; // Critère de tri, par défaut 'nom'

    let db = new sqlite3.Database(dbPath, sqlite3.OPEN_READWRITE, (err) => {
        if (err) {
            console.error(err.message);
            res.status(500).json({ error: 'Erreur de connexion à la base de données' });
            return;
        }
        console.log('Connected to the SQLite database.');
    });

    let query = 'SELECT nom, numero, voie, code_postal, ville, latitude, longitude FROM coiffeurs WHERE 1=1';
    let params = [];

    if (searchTerm) {
        query += ' AND (LOWER(nom) LIKE ? OR LOWER(numero) LIKE ? OR LOWER(voie) LIKE ? OR LOWER(code_postal) LIKE ? OR LOWER(ville) LIKE ?)';
        params.push(`%${searchTerm}%`, `%${searchTerm}%`, `%${searchTerm}%`, `%${searchTerm}%`, `%${searchTerm}%`);
    } else {
        if (searchNom) {
            query += ' AND LOWER(nom) LIKE ?';
            params.push(`%${searchNom}%`);
        }
        if (searchNumero) {
            query += ' AND LOWER(numero) LIKE ?';
            params.push(`%${searchNumero}%`);
        }
        if (searchVoie) {
            query += ' AND LOWER(voie) LIKE ?';
            params.push(`%${searchVoie}%`);
        }
        if (searchCodePostal) {
            query += ' AND LOWER(code_postal) LIKE ?';
            params.push(`%${searchCodePostal}%`);
        }
        if (searchVille) {
            query += ' AND LOWER(ville) LIKE ?';
            params.push(`%${searchVille}%`);
        }
    }

    // Ajouter le tri en fonction du critère choisi
    query += ` ORDER BY ${sortBy}`;

    db.all(query, params, (err, rows) => {
        if (err) {
            console.error(err.message);
            res.status(500).json({ error: 'Erreur de base de données' });
        } else {
            res.json({ coiffeurs: rows });
        }
    });

    db.close((err) => {
        if (err) {
            console.error(err.message);
        } else {
            console.log('Disconnected from the SQLite database.');
        }
    });
});


app.put('/api/coiffeurs/:name', (req, res) => {
    let db = new sqlite3.Database(dbPath, sqlite3.OPEN_READWRITE, (err) => {
        if (err) {
            console.error(err.message);
            res.status(500).json({ error: 'Erreur de connexion à la base de données' });
        }
        console.log('Connected to the SQLite database.');
    });

    const query = 'UPDATE coiffeurs SET nom = ?, numero = ?, voie = ?, code_postal = ?, ville = ? WHERE nom = ?';
    const params = [req.body.nom, req.body.numero, req.body.voie, req.body.code_postal, req.body.ville, req.params.name];

    db.run(query, params, (err) => {
        if (err) {
            console.error(err.message);
            res.status(500).json({ error: 'Erreur lors de la mise à jour des données' });
        } else {
            res.json({ success: true });
            console.log('changes saved')
        }
    });

    db.close((err) => {
        if (err) {
            console.error(err.message);
        } else {
            console.log('Disconnected from the SQLite database.');
        }
    });
});

// Route pour récupérer les coiffeurs paginés et triés par nom
app.get('/api/coiffeurs/:page', (req, res) => {
    const page = req.params.page || 1;
    const limit = 10;
    const offset = (page - 1) * limit;

    let db = new sqlite3.Database(dbPath, sqlite3.OPEN_READWRITE, (err) => {
        if (err) {
            console.error(err.message);
            res.status(500).json({ error: 'Erreur de connexion à la base de données' });
        } else {
            console.log('Connected to the SQLite database.');
        }
    });

    db.all(
        'SELECT nom, numero, voie, code_postal, ville, latitude, longitude FROM coiffeurs ORDER BY nom ASC LIMIT ? OFFSET ?',
        [limit, offset],
        (err, rows) => {
            if (err) {
                console.error(err.message);
                res.status(500).json({ error: 'Erreur de base de données' });
            } else {
                res.json({ coiffeurs: rows });
            }
        }
    );

    db.close((err) => {
        if (err) {
            console.error(err.message);
        } else {
            console.log('Disconnected from the SQLite database.');
        }
    });
});

// Route pour récupérer la page de connexion
app.get('/login.html', (req, res) => {
    fs.readFile(path.join(__dirname, '..', 'public', 'login.html'), 'utf8', (err, data) => {
        if (err) {
            console.error(err);
            res.status(500).send('Erreur lors de la lecture de la page de connexion');
        } else {
            res.send(data);
        }
    });
});

// Route racine pour la page principale
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'public', 'main.html'));
    console.log(isLoggedIn);
});


// Route pour la connexion
app.post('/api/login', (req, res) => {
    const { username, password } = req.body;

    fs.readFile(usersFilePath, 'utf8', (err, data) => {
        if (err) {
            console.error(err);
            res.status(500).json({ error: 'Erreur de lecture du fichier des utilisateurs' });
            return;
        }

        try {
            const users = JSON.parse(data).users;

            const user = users.find(user => user.username === username && user.password === password);

            if (user) {
                isLoggedIn = true;
                res.status(200).json({ message: 'Connexion réussie' });
            } else {
                res.status(401).json({ error: 'Nom d\'utilisateur ou mot de passe incorrect' });
            }
        } catch (parseError) {
            console.error(parseError);
            res.status(500).json({ error: 'Erreur de parsing du fichier des utilisateurs' });
        }
    });
});

// Route pour vérifier l'état de connexion
app.get('/api/isLoggedIn', (req, res) => {
    res.json({ isLoggedIn });
});

// Route pour la déconnexion
app.get('/api/logout', (req, res) => {
    isLoggedIn = false;
    console.log('L\'utilisateur a été déconnecté.');
    console.log(isLoggedIn);
    res.json({ success: true });
});

app.post('/api/addCoiffeur', (req, res) => {
    const { nom, numero, voie, code_postal, ville, latitude, longitude } = req.body;

    let db = new sqlite3.Database(dbPath, sqlite3.OPEN_READWRITE, (err) => {
        if (err) {
            console.error(err.message);
            res.status(500).send('Erreur de connexion à la base de données');
            return;
        }
        console.log('Connected to the SQLite database for adding a new coiffeur.');
    });

    const query = `INSERT INTO coiffeurs (nom, numero, voie, code_postal, ville, latitude, longitude) 
                   VALUES (?, ?, ?, ?, ?, ?, ?)`;
    const params = [nom, numero, voie, code_postal, ville, latitude, longitude];

    db.run(query, params, function(err) {
        if (err) {
            console.error(err.message);
            res.status(500).send('Erreur lors de l\'ajout du coiffeur');
        } else {
            res.json({ success: true, message: 'Nouveau coiffeur ajouté', id: this.lastID });
        }
    });

    db.close();
});

// Démarrage du serveur
app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}/`);
});
