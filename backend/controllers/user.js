const User = require('../models/User');

const bcrypt = require('bcrypt');


const jwt = require('jsonwebtoken');


require("dotenv").config({ path: ".env.local" });



const emailFormat = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const passwordFormat = /^(?=.*\d).{8,}$/;




exports.signup = (req, res ,next) => {
    const errorMessages = [];

    // Vérifie le format de l'email
    if (!emailFormat.test(req.body.email)) {
        errorMessages.push("Format de l'email invalide.");
    }
    // Vérifie le format du mot de passe
    if (!passwordFormat.test(req.body.password)) {
        errorMessages.push(
            "Format du mot de passe invalide. Le mot de passe doit contenir au moins 8 caractères et au moins 1 chiffre."
        );
    }
    // Renvoie l'erreur
    if (errorMessages.length > 0) {
        return res.status(400).json({ messages: errorMessages });
    }
    bcrypt.hash(req.body.password, 10)
    .then(hash => {
        const user = new User ({
            email: req.body.email,
            password : hash
        });
        user.save()
            .then(() => res.status(201).json({ message: 'Utilisateur crée!'}))
            .catch(error => res.status(400).json({ error}));
    })
    .catch(error => res.status(500).json({ error}));



};

exports.login = (req, res, next) => {
    User.findOne({ email: req.body.email})
    .then(user => {
        if (user === null)  {
            res.status(401).json({message: 'Paire identifiant/mot de passe incorrecte'})
        } else {
            bcrypt.compare(req.body.password, user.password)
            .then(valid => {
                if (!valid) {
                    res.status(401).json({message: 'Paire identifiant/mot de passe incorrecte'})
                } else {
                    res.status(200).json({
                        userId: user._id,
                        token: jwt.sign(
                            {userId: user._id},
                            process.env.SECRET_KEY,
                            { expiresIn: '24h' }
                        )
                    });
                }
            })
            .catch(error => {
                res.status(500).json( { error});
            })
        }
    }) 
    
    .catch(error => {
        res.status(500).json( { error});
    })
};


