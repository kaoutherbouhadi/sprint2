const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const Eureka = require('eureka-js-client').Eureka;

const app = express();
const PORT = process.env.PORT || 3003;

app.use(bodyParser.json());

// Utiliser la même configuration de base de données que dans le microservice d'authentification
mongoose.connect('mongodb://127.0.0.1:27017/users', {
    useNewUrlParser: true,
    useUnifiedTopology: true,
}).then(() => {
    console.log('Connecté à la base de données MongoDB');
}).catch(err => {
    console.error('Erreur de connexion à la base de données :', err);
    process.exit(1);
});

const userSchema = new mongoose.Schema({
  numInscrit: { type: Number, unique: true, required: true },
  username: { type: String, required: true },
  password: { type: String, required: true },
  email: { type: String, required: true },
  role: { type: String },
  userClass: { type: String }  // Remplace 'class' par 'userClass'
});

const User = mongoose.model('User', userSchema);
const client = new Eureka({
    instance: {
      app: 'sprint2', // Le nom de votre service
      hostName: 'localhost', // Adresse IP de votre service Node.js
      ipAddr: '127.0.0.1', // Adresse IP de votre service Node.js
      port: {
        '$': PORT,
        '@enabled': 'true',
      },
      vipAddress: 'sprint2', // Le nom de votre service Eureka
      dataCenterInfo: {
        '@class': 'com.netflix.appinfo.InstanceInfo$DefaultDataCenterInfo',
        name: 'MyOwn',
      },
    },
    eureka: {
      host: 'localhost', // L'adresse de votre Eureka Server
      port: 8761, // Le port par défaut d'Eureka Server
      servicePath: '/eureka/apps/',
    },
  });
  
app.get('/', (req, res) => {
  res.send('Bienvenue sur le microservice Node.js.');
});

client.logger.level('debug');
client.start();

client.on('started', () => {
    console.log('Service enregistré avec succès auprès d\'Eureka.');
});

// Création d'un utilisateur par l'admin avec choix du rôle
app.post('/addUser', async (req, res) => {
  const { numInscrit, username, password, email, role, userClass } = req.body;

  try {
      const existingUser = await User.findOne({ $or: [{ username }, { numInscrit }] });

      if (existingUser) {
          return res.status(400).json({ message: 'Cet utilisateur existe déjà.' });
      }

      const validRoles = ['admin', 'utilisateur', 'enseignant'];
      const selectedRole = validRoles.includes(role) ? role : 'utilisateur';

      const newUser = new User({ numInscrit, username, password, email, role: selectedRole, userClass });
      await newUser.save();

      res.status(201).json({ message: 'Utilisateur ajouté avec succès' });
  } catch (error) {
      console.error('Erreur lors de l\'ajout de l\'utilisateur :', error);
      res.status(500).json({ message: 'Une erreur est survenue lors de l\'ajout de l\'utilisateur.' });
  }
});
// Mise à jour d'un utilisateur par l'admin

app.put('/updateUser/:id', async (req, res) => {
  const userId = req.params.id;
  const { numInscrit, username, password, email, role, userClass } = req.body;

  try {
      const userToUpdate = await User.findById(userId);

      if (!userToUpdate) {
          return res.status(404).json({ message: 'Utilisateur non trouvé.' });
      }

      if (numInscrit && numInscrit !== userToUpdate.numInscrit) {
          const existingUser = await User.findOne({ numInscrit });
          if (existingUser) {
              return res.status(400).json({ message: 'Ce numéro d\'inscription est déjà utilisé par un autre utilisateur.' });
          }
      }

      if (numInscrit) userToUpdate.numInscrit = numInscrit;
      if (username) userToUpdate.username = username;
      if (password) userToUpdate.password = password;
      if (email) userToUpdate.email = email;
      if (role) userToUpdate.role = role;
      if (userClass) userToUpdate.userClass = userClass;  // Remplace 'class' par 'userClass'

      await userToUpdate.save();

      res.status(200).json({ message: 'Utilisateur mis à jour avec succès' });
  } catch (error) {
      console.error('Erreur lors de la mise à jour de l\'utilisateur :', error);
      res.status(500).json({ message: 'Une erreur est survenue lors de la mise à jour de l\'utilisateur.' });
  }
});

app.delete('/deleteUser/:id', async (req, res) => {
  const userId = req.params.id;

  try {
      const deletedUser = await User.findByIdAndDelete(userId);

      if (!deletedUser) {
          return res.status(404).json({ message: 'Utilisateur non trouvé.' });
      }

      res.status(200).json({ message: 'Utilisateur supprimé avec succès' });
  } catch (error) {
      console.error('Erreur lors de la suppression de l\'utilisateur :', error);
      res.status(500).json({ message: 'Une erreur est survenue lors de la suppression de l\'utilisateur.' });
  }
});

// Ajoutez une route pour accéder à la table "User"
app.get('/userTEST', async (req, res) => {
    try {
      // Utilisez Mongoose ou un autre ORM pour récupérer les données de la table "User"
      const users = await User.find();
      res.status(200).json(users);
    } catch (error) {
      res.status(500).json({ message: 'Une erreur est survenue lors de la récupération des utilisateurs.' });
    }
  });
  

app.get('/', (req, res) => {
    res.send('Bienvenue sur le microservice Node.js.');
  });
app.listen(PORT, () => {
    console.log(`Serveur de gestion des étudiants en cours d'écoute sur le port ${PORT}`);
});
