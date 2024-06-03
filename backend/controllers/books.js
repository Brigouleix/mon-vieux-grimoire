const { error } = require('console');
const Book = require('../models/Book');
const fs = require('fs');

// Récupère tous les livres
exports.getAllBooks = async (req, res, next) => {
  try {
    const books = await Book.find()
    res.status(200).json(books)
  } catch (error) {
    res.status(400).json({ error: error })
  }
}

// Récupère les 3 livres les mieux notés
exports.getTopRatedBooks = async (req, res, next) => {
  try {
    const topRatedBooks = await Book.find()
      .sort({ averageRating: -1 })
      .limit(3)
    res.status(200).json(topRatedBooks)
  } catch (error) {
    res.status(500).json({ error: 'Une erreur est survenue' })
  }
}

// Récupère le livre selon l'id passé dans la requête
exports.getOneBook = async (req, res, next) => {
  try {
    const book = await Book.findOne({ _id: req.params.id })
    if (book) {
      res.status(200).json(book)
    } else {
      res.status(404).json({ error: 'Livre non trouvé' })
    }
  } catch (error) {
    res.status(500).json({ error: error })
  }
}

// Crée un livre
exports.createBook = async (req, res, next) => {
  const bookObject = JSON.parse(req.body.book)

  // Vérifie que la requête contient un fichier pour ne pas sauvegarder un fichier orphelin
  if(!req.file){
    return res.status(400).json({ message: 'Fichier manquant' })
  } else {
    // Ne jamais faire confiance aux entrées utilisateur
    delete bookObject._id
    delete bookObject._userId

    // Si l'utilisateur n'a pas noté le livre, vider le tableau (utile pour que l'utilisateur puisse noter son livre plus tard)
    if(bookObject.ratings[0].grade === 0){
      bookObject.ratings = []
    }

    const filename = req.file.filename

    // Crée un nouveau Livre à partir des données de la réponse
    const book = new Book({
      ...bookObject,
      userId: req.auth.userId,
      imageUrl: `${req.protocol}://${req.get('host')}/images/${filename}`
    })

    // Sauvegarde le livre dans MongoDB
    try {
      await book.save()
      res.status(201).json({ message: 'Livre sauvegardé' })
    } catch (error) {      
      fs.unlinkSync(`images/${filename}`)
      res.status(400).json({ error })
    }
  }  
}

// Ajoute une note à un livre


// Modifie un livre
exports.modifyBook = async (req, res, next) => {
  try {
    const bookObject = req.file
      // Si un fichier est inclus dans la requête, convertit le JSON de la requête en Objet
      ? {
          ...JSON.parse(req.body.book),
          imageUrl: `${req.protocol}://${req.get('host')}/images/${req.file.filename}`
        }
      // Sinon, utilise les données de req.body
      : { ...req.body }

    delete bookObject._userId

    // Récupère le livre qui correspond à l'id spécifié dans les paramètres de la requête
    const book = await Book.findOne({ _id: req.params.id })

    // Vérifie si l'utilisateur est autorisé à modifier le livre
    if (book.userId != req.auth.userId) {
      return res.status(403).json({message: 'Requête non autorisée'})
    }

    // Si la requête contient un fichier, supprime l'ancien fichier du back end (dossier images)
    if (req.file) {
      const filename = book.imageUrl.split('/images/')[1]
      fs.unlinkSync(`images/${filename}`)
    }

    // Met à jour le livre
    await Book.updateOne({ _id: req.params.id }, { ...bookObject, _id: req.params.id })
    res.status(200).json({ message: 'Livre modifié!' })
  } catch (error) {
    res.status(400).json({ error })
  }
}

// Supprime un livre
exports.deleteBook = (req, res, next) => {
  // Récupère le livre selon l'id passé dans la requête
  Book.findOne({ _id: req.params.id })
    .then(book => {
      // Vérifie si l'utilisateur est autorisé à supprimer le livre
      if (book.userId != req.auth.userId) {
        res.status(403).json({ message: 'Requête non autorisée' })
      } else {
        // Supprime le fichier du back end (dossier images)
        const filename = book.imageUrl.split('/images/')[1];
        fs.unlink(`images/${filename}`, () => {
          // Supprime le livre de MongoDB
          Book.deleteOne({ _id: req.params.id })
            .then(() => { res.status(200).json({ message: 'Livre supprimé' }) })
            .catch(error => res.status(401).json({ error }))
        })
      }
    })
    .catch(error => {
      res.status(500).json({ error })
    })
}

exports.addRating = async (req, res, next) => {
  const ratingObject = req.body;
  const userId = ratingObject.userId;
  const rating = ratingObject.rating;

  try {
    // Recherche du livre à partir de son ID
    const book = await Book.findOne({ _id: req.params.id });

    if (!book) {
      return res.status(404).json({ message: 'Livre non trouvé' });
    } // on vérifie que le livre existe

    // Vérifier si l'utilisateur a déjà noté le livre
    if (book.ratings.find((r) => r.userId === userId)) {
      return res.status(400).json({ message: 'Vous avez déjà noté ce livre.' });
    }

    // Vérifier si la notation est valide (entre 1 et 5 étoiles)
    if (rating < 1 || rating > 5) {
      return res.status(400).json({ message: 'La notation doit être entre 1 et 5 étoiles.' });
    }

    // Ajouter la nouvelle évaluation à la liste
    book.ratings.push({ userId, grade: rating });

    // Calcul somme totale de toutes les évaluations
    let rates = 0;
    for (let i = 0; i < book.ratings.length; i++) {
      rates += book.ratings[i].grade;
    }

    // Calcul de la moyenne des évaluations + arrondis résultat avec toFixed
    book.averageRating = parseFloat((rates / book.ratings.length).toFixed(1));

    // Enregistrer les modifications en base de données
    await book.save();

    res.status(200).json(book);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}