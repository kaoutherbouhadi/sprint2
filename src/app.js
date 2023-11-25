const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const Eureka = require('eureka-js-client').Eureka;

const app = express();
const PORT = process.env.PORT || 3003;

app.use(bodyParser.json());

// Utiliser la même configuration de base de données que dans le microservice d'authentification
mongoose.connect('mongodb://127.0.0.1:27017/users,eleve,enseignant', {
    useNewUrlParser: true,
    useUnifiedTopology: true,
}).then(() => {
    console.log('Connecté à la base de données MongoDB');
}).catch(err => {
    console.error('Erreur de connexion à la base de données :', err);
    process.exit(1);
});

const userSchema = new mongoose.Schema({
 
  username: { type: String, required: true },
  password: { type: String, required: true },
  email: { type: String, required: true },
  role: { type: String },
 // Remplace 'class' par 'userClass'
});

const User = mongoose.model('User', userSchema);

// Schéma spécifique pour les élèves avec héritage du schéma utilisateur
const eleveSchema = new mongoose.Schema({
    numInscrit: { type: Number, unique: true, required: true },
    userClass: { type: String },
});

// Définir Eleve comme une classe qui hérite de User
const Eleve = User.discriminator('Eleve', eleveSchema);
// Schéma spécifique pour les enseignants avec héritage du schéma utilisateur
const enseignantSchema = new mongoose.Schema({
    userClass: { type: String },  // Ajoutez les champs spécifiques à Enseignant ici
});

// Définir Enseignant comme une classe qui hérite de User
const Enseignant = User.discriminator('Enseignant', enseignantSchema);

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


app.post('/addEleve', async (req, res) => {
  const { numInscrit, username, password, email, userClass } = req.body;

  try {
      const existingEleve = await Eleve.findOne({ $or: [{ username }, { numInscrit }] });

      if (existingEleve) {
          return res.status(400).json({ message: 'Cet élève existe déjà.' });
      }

      const newEleve = new Eleve({ numInscrit, username, password, email, role: 'eleve', userClass });
      await newEleve.save();

      res.status(201).json({ message: 'Élève ajouté avec succès' });
  } catch (error) {
      console.error('Erreur lors de l\'ajout de l\'élève :', error);
      res.status(500).json({ message: 'Une erreur est survenue lors de l\'ajout de l\'élève.' });
  }
});
app.delete('/deleteEleve/:id', async (req, res) => {
    const eleveId = req.params.id;

    try {
        const deletedEleve = await Eleve.findByIdAndDelete(eleveId);

        if (!deletedEleve) {
            return res.status(404).json({ message: 'Élève non trouvé.' });
        }

        // Supprimer également l'utilisateur correspondant dans la table users
        await User.findOneAndDelete({ numInscrit: deletedEleve.numInscrit });

        res.status(200).json({ message: 'Élève supprimé avec succès' });
    } catch (error) {
        console.error('Erreur lors de la suppression de l\'élève :', error);
        res.status(500).json({ message: 'Une erreur est survenue lors de la suppression de l\'élève.' });
    }
});
app.put('/updateEleve/:id', async (req, res) => {
    const eleveId = req.params.id;
    const { numInscrit, username, password, email, userClass } = req.body;

    try {
        const eleveToUpdate = await Eleve.findById(eleveId);

        if (!eleveToUpdate) {
            return res.status(404).json({ message: 'Élève non trouvé.' });
        }

        // Vous pouvez effectuer des vérifications supplémentaires si nécessaire

        if (numInscrit && numInscrit !== eleveToUpdate.numInscrit) {
            const existingEleve = await Eleve.findOne({ numInscrit });
            if (existingEleve) {
                return res.status(400).json({ message: 'Ce numéro d\'inscription est déjà utilisé par un autre élève.' });
            }
        }

        if (numInscrit) eleveToUpdate.numInscrit = numInscrit;
        if (username) eleveToUpdate.username = username;
        if (password) eleveToUpdate.password = password;
        if (email) eleveToUpdate.email = email;
        if (userClass) eleveToUpdate.userClass = userClass;

        await eleveToUpdate.save();

        res.status(200).json({ message: 'Élève mis à jour avec succès' });
    } catch (error) {
        console.error('Erreur lors de la mise à jour de l\'élève :', error);
        res.status(500).json({ message: 'Une erreur est survenue lors de la mise à jour de l\'élève.' });
    }
});
 

app.post('/addEnseignant', async (req, res) => {
  const { username, password, email} = req.body;

  try {
      const existingEnseignant = await Enseignant.findOne({ username });

      if (existingEnseignant) {
          return res.status(400).json({ message: 'Cet enseignant existe déjà.' });
      }

      const newEnseignant = new Enseignant({ username, password, email, role: 'enseignant' });
      await newEnseignant.save();

      res.status(201).json({ message: 'Enseignant ajouté avec succès' });
  } catch (error) {
      console.error('Erreur lors de l\'ajout de l\'enseignant :', error);
      res.status(500).json({ message: 'Une erreur est survenue lors de l\'ajout de l\'enseignant.' });
  }
});
app.delete('/deleteEnseignant/:id', async (req, res) => {
    const enseignantId = req.params.id;

    try {
        const deletedEnseignant = await Enseignant.findByIdAndDelete(enseignantId);

        if (!deletedEnseignant) {
            return res.status(404).json({ message: 'Enseignant non trouvé.' });
        }

        // Supprimer également l'utilisateur correspondant dans la table users
        await User.findOneAndDelete({ username: deletedEnseignant.username });

        res.status(200).json({ message: 'Enseignant supprimé avec succès' });
    } catch (error) {
        console.error('Erreur lors de la suppression de l\'enseignant :', error);
        res.status(500).json({ message: 'Une erreur est survenue lors de la suppression de l\'enseignant.' });
    }
});
app.put('/updateEnseignant/:id', async (req, res) => {
    const enseignantId = req.params.id;
    const { username, password, email, userClass } = req.body;

    try {
        const enseignantToUpdate = await Enseignant.findById(enseignantId);

        if (!enseignantToUpdate) {
            return res.status(404).json({ message: 'Enseignant non trouvé.' });
        }

        // Vous pouvez effectuer des vérifications supplémentaires si nécessaire

        if (username) enseignantToUpdate.username = username;
        if (password) enseignantToUpdate.password = password;
        if (email) enseignantToUpdate.email = email;
       

        await enseignantToUpdate.save();

        res.status(200).json({ message: 'Enseignant mis à jour avec succès' });
    } catch (error) {
        console.error('Erreur lors de la mise à jour de l\'enseignant :', error);
        res.status(500).json({ message: 'Une erreur est survenue lors de la mise à jour de l\'enseignant.' });
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
