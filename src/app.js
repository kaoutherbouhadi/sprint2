const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bodyParser = require('body-parser');
const Eureka = require('eureka-js-client').Eureka;

const app = express();
const PORT = process.env.PORT || 3003;
app.use(cors());
app.use(bodyParser.json());

mongoose.connect('mongodb://127.0.0.1:27017/Education', {
    useNewUrlParser: true,
    useUnifiedTopology: true,
}).then(() => {
    console.log('Connecté à la base de données MongoDB');
}).catch(err => {
    console.error('Erreur de connexion à la base de données :', err);
    process.exit(1);
});

const eleveSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    email: { type: String, required: true },
    role: { type: String, default: 'eleve' },
    etat: { type: Number, default: 1 },
    numInscrit: { type: String, required: true, unique: true},
    userClass: { type: mongoose.Schema.Types.ObjectId, ref: 'Classe', required: true },
});

const Eleve = mongoose.model('Eleve', eleveSchema);

const enseignantSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    role: { type: String, default: 'enseignant' },
    etat: { type: Number, default: 1 },
    matiere: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Matiere' }]
});

const Enseignant = mongoose.model('Enseignant', enseignantSchema);
const profClassSchema = new mongoose.Schema({
    idprof: { type: mongoose.Schema.Types.ObjectId, ref: 'Enseignant' },
    idclass: { type: mongoose.Schema.Types.ObjectId, ref: 'Education.Classe' }, // Référence à la classe dans la base Education
});

const ProfClass = mongoose.model('ProfClass', profClassSchema);

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
    console.log('Received request to addEleve:', req.body);
    const { username, password, email, numInscrit, userClass } = req.body;

    try {
        const existingEleve = await Eleve.findOne({ username });

        if (existingEleve) {
            return res.status(400).json({ message: 'Cet élève existe déjà.' });
        }

        const newEleve = new Eleve({ username, password, email, numInscrit, userClass });
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

        res.status(200).json({ message: 'Élève supprimé avec succès' });
    } catch (error) {
        console.error('Erreur lors de la suppression de l\'élève :', error);
        res.status(500).json({ message: 'Une erreur est survenue lors de la suppression de l\'élève.' });
    }
});
app.get('/getEleveDetails/:id', async (req, res) => {
    const eleveId = req.params.id;

    try {
        // Utilisez la méthode findById pour rechercher l'élève par ID
        const eleveDetails = await Eleve.findById(eleveId);

        if (!eleveDetails) {
            // Si aucun élève n'est trouvé, retournez une réponse 404
            return res.status(404).json({ message: 'Élève non trouvé.' });
        }

        // Si l'élève est trouvé, renvoyez ses détails en tant que réponse JSON
        res.status(200).json(eleveDetails);
    } catch (error) {
        // En cas d'erreur, renvoyez une réponse 500 avec un message d'erreur
        console.error('Erreur lors de la récupération des détails de l\'élève :', error);
        res.status(500).json({ message: 'Une erreur est survenue lors de la récupération des détails de l\'élève.' });
    }
});

app.put('/updateEleve/:id', async (req, res) => {
    const eleveId = req.params.id;
    const { newUsername, newPassword, email, newUserClass, newNumInscrit, newEtat } = req.body;

    try {
        const eleveToUpdate = await Eleve.findById(eleveId);

        if (!eleveToUpdate) {
            return res.status(404).json({ message: 'Élève non trouvé.' });
        }

        // Update the fields based on the provided data
        if (newUsername) eleveToUpdate.username = newUsername;
        if (newPassword) eleveToUpdate.password = newPassword;
        if (email) eleveToUpdate.email = email;
        if (newNumInscrit) eleveToUpdate.numInscrit = newNumInscrit;
        if (newUserClass) eleveToUpdate.userClass = newUserClass;
        if (newEtat) eleveToUpdate.etat = newEtat; // Utilisez 'newEtat' ici

        await eleveToUpdate.save();

        res.status(200).json({ message: 'Élève mis à jour avec succès' });
    } catch (error) {
        console.error('Erreur lors de la mise à jour de l\'élève :', error);
        res.status(500).json({ message: 'Une erreur est survenue lors de la mise à jour de l\'élève.' });
    }
});


app.post('/addEnseignant', async (req, res) => {
    console.log('Received request to addEnseignant:', req.body);
    const { username, password, email, matiere} = req.body;

    try {
        const existingEnseignant = await Enseignant.findOne({ username });

        if (existingEnseignant) {
            return res.status(400).json({ message: 'Cet Enseignant existe déjà.' });
        }

        const newEnseignant = new Enseignant({ username, password, email, matiere });
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

        res.status(200).json({ message: 'Enseignant supprimé avec succès' });
    } catch (error) {
        console.error('Erreur lors de la suppression de l\'enseignant :', error);
        res.status(500).json({ message: 'Une erreur est survenue lors de la suppression de l\'enseignant.' });
    }
});

app.put('/updateEnseignant/:id', async (req, res) => {
    const enseignantId = req.params.id;
    const { newUsername, newPassword, email, newEtat, newMatiere } = req.body;

    try {
        const enseignantToUpdate = await Enseignant.findById(enseignantId);

        if (!enseignantToUpdate) {
            return res.status(404).json({ message: 'Enseignant non trouvé.' });
        }

        // Update the fields based on the provided data
        if (newUsername) enseignantToUpdate.username = newUsername;
        if (newPassword) enseignantToUpdate.password = newPassword;
        if (email) enseignantToUpdate.email = email;
        if (newEtat) enseignantToUpdate.etat = newEtat;
        if (newMatiere) enseignantToUpdate.matiere = newMatiere;

        await enseignantToUpdate.save();

        res.status(200).json({ message: 'Enseignant mis à jour avec succès' });
    } catch (error) {
        console.error('Erreur lors de la mise à jour de l\'enseignant :', error);
        res.status(500).json({ message: 'Une erreur est survenue lors de la mise à jour de l\'enseignant.' });
    }
});

app.post('/addEnseignantToClasse/:enseignantId/:classeId', async (req, res) => {
    const { enseignantId, classeId } = req.params;

    try {
        const profClass = new ProfClass({ idprof: enseignantId, idclass: classeId });
        await profClass.save();

        res.status(200).json({ message: 'Enseignant ajouté à la classe avec succès' });
    } catch (error) {
        console.error('Erreur lors de l\'ajout de l\'enseignant à la classe :', error);
        res.status(500).json({ message: 'Une erreur est survenue lors de l\'ajout de l\'enseignant à la classe.' });
    }
});



app.delete('/removeEnseignantFromClasse/:id', async (req, res) => {
    const idProfClass = req.params.id;

    try {
        const deletedProfClass = await ProfClass.findByIdAndDelete(idProfClass);

        if (!deletedProfClass) {
            return res.status(404).json({ message: 'ProfClass non trouvé.' });
        }

        res.status(200).json({ message: 'ProfClass supprimé avec succès' });
    } catch (error) {
        console.error('Erreur lors de la suppression de ProfClass :', error);
        res.status(500).json({ message: 'Une erreur est survenue lors de la suppression de ProfClass.' });
    }
});


  
app.put('/updateProfClass/:id', async (req, res) => {
    const idProfClass = req.params.id;
    const { newIdProf, newIdclaase } = req.body;

    try {
        const profclassToUpdate = await ProfClass.findById(idProfClass);

        if (!profclassToUpdate) {
            return res.status(404).json({ message: 'profClass non trouvé.' });
        }

        // Update the fields based on the provided data
        if (newIdProf) profclassToUpdate.idprof = newIdProf;
        if (newIdclaase) profclassToUpdate.idclass = newIdclaase;

        await profclassToUpdate.save();

        res.status(200).json({ message: 'profclass mis à jour avec succès' });
    } catch (error) {
        console.error('Erreur lors de la mise à jour de profclass :', error);
        res.status(500).json({ message: 'Une erreur est survenue lors de la mise à jour de profclass.' });
    }
});  



  



app.get('/getAllProfClass', async (req, res) => {
    try {
        const allProfClass = await ProfClass.find();
        res.status(200).json(allProfClass);
    } catch (error) {
        console.error('Erreur lors de la récupération de tous les enregistrements de ProfClass :', error);
        res.status(500).json({ message: 'Une erreur est survenue lors de la récupération de tous les enregistrements de ProfClass.' });
    }
});

app.get('/getEnseignantDetails/:id', async (req, res) => {
    const enseignantId = req.params.id;

    try {
        // Utilisez la méthode findById pour rechercher l'enseignant par ID
        const enseignantDetails = await Enseignant.findById(enseignantId);

        if (!enseignantDetails) {
            // Si aucun enseignant n'est trouvé, retournez une réponse 404
            return res.status(404).json({ message: 'Enseignant non trouvé.' });
        }

        // Si l'enseignant est trouvé, renvoyez ses détails en tant que réponse JSON
        res.status(200).json(enseignantDetails);
    } catch (error) {
        // En cas d'erreur, renvoyez une réponse 500 avec un message d'erreur
        console.error('Erreur lors de la récupération des détails de l\'enseignant :', error);
        res.status(500).json({ message: 'Une erreur est survenue lors de la récupération des détails de l\'enseignant.' });
    }
});

app.get('/getProfClassDetails/:id', async (req, res) => {
    const idProfClass = req.params.id;
    console.log('Received request for ProfClass details. ID:', idProfClass);

    try {
        // Utilize the findById method to search for profClass by ID
        const profClassDetails = await ProfClass.findById(idProfClass);

        if (!profClassDetails) {
            // If no profClass is found, return a 404 response
            return res.status(404).json({ message: 'ProfClass not found.' });
        }

        // If profClass is found, return its details as a JSON response
        res.status(200).json(profClassDetails);
    } catch (error) {
        // In case of an error, return a 500 response with an error message
        console.error('Error fetching ProfClass details:', error);
        res.status(500).json({ message: 'An error occurred while fetching ProfClass details.' });
    }
});


app.get('/eleves', async (req, res) => {
    try {
        const eleves = await Eleve.find();
        res.status(200).json(eleves);
    } catch (error) {
        res.status(500).json({ message: 'Une erreur est survenue lors de la récupération des élèves.' });
    }
});

app.get('/enseignants', async (req, res) => {
    try {
        const enseignants = await Enseignant.find();
        res.status(200).json(enseignants);
    } catch (error) {
        res.status(500).json({ message: 'Une erreur est survenue lors de la récupération des enseignants.' });
    }
});

app.listen(PORT, () => {
    console.log(`Serveur en cours d'écoute sur le port ${PORT}`);
});

