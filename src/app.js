const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const Eureka = require('eureka-js-client').Eureka;

const app = express();
const PORT = process.env.PORT || 3003;

app.use(bodyParser.json());

mongoose.connect('mongodb://127.0.0.1:27017/eleve_enseignant', {
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
    userClass: { type: String },
});

const Eleve = mongoose.model('Eleve', eleveSchema);

const enseignantSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    role: { type: String, default: 'enseignant' },
    matiere: { type: String },
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
    const { username, password, email, userClass } = req.body;

    try {
        const existingEleve = await Eleve.findOne({ username });

        if (existingEleve) {
            return res.status(400).json({ message: 'Cet élève existe déjà.' });
        }

        const newEleve = new Eleve({ username, password, email, userClass });
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

app.put('/updateEleve/:id', async (req, res) => {
    const eleveId = req.params.id;
    const { username, password, email, userClass } = req.body;

    try {
        const eleveToUpdate = await Eleve.findById(eleveId);

        if (!eleveToUpdate) {
            return res.status(404).json({ message: 'Élève non trouvé.' });
        }

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
    const { username, password, email,matiere } = req.body;

    try {
        const existingEnseignant = await Enseignant.findOne({ username });

        if (existingEnseignant) {
            return res.status(400).json({ message: 'Cet enseignant existe déjà.' });
        }

        const newEnseignant = new Enseignant({ username, password, email,matiere });
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
    const { username, password, email,matiere } = req.body;

    try {
        const enseignantToUpdate = await Enseignant.findById(enseignantId);

        if (!enseignantToUpdate) {
            return res.status(404).json({ message: 'Enseignant non trouvé.' });
        }

        if (username) enseignantToUpdate.username = username;
        if (password) enseignantToUpdate.password = password;
        if (email) enseignantToUpdate.email = email;
        if (matiere) enseignantToUpdate.matiere = matiere;
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

app.delete('/removeEnseignantFromClasse/:enseignantId/:classeId', async (req, res) => {
    const { enseignantId, classeId } = req.params;

    try {
        await ProfClass.deleteOne({ idprof: enseignantId, idclass: classeId });

        res.status(200).json({ message: 'Enseignant retiré de la classe avec succès' });
    } catch (error) {
        console.error('Erreur lors du retrait de l\'enseignant de la classe :', error);
        res.status(500).json({ message: 'Une erreur est survenue lors du retrait de l\'enseignant de la classe.' });
    }
});
// Mettre à jour la classe d'un enseignant
app.put('/updateProfClass/:idProfClass', async (req, res) => {
    const idProfClass = req.params.idProfClass;

    try {
        const existingProfClass = await ProfClass.findById(idProfClass);

        if (!existingProfClass) {
            return res.status(404).json({ message: 'Association non trouvée.' });
        }

        existingProfClass.idprof = req.body.idprof;
        existingProfClass.idclass = req.body.idclass;

        await existingProfClass.save();

        res.status(200).json({ message: 'Association mise à jour avec succès' });
    } catch (error) {
        console.error('Erreur lors de la mise à jour de l\'association :', error);
        res.status(500).json({ message: 'Une erreur est survenue lors de la mise à jour de l\'association.' });
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