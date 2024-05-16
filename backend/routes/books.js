const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const multer = require('../middleware/multer-config');
const sharp = require("../middleware/sharp-config");
const bookCtrl = require('../controllers/books');





router.get('/', bookCtrl.getAllBook);

router.post('/', auth, multer, sharp, bookCtrl.createBook);

router.get('/:id', bookCtrl.getOneBook);

router.put('/:id', multer, sharp, bookCtrl.modifyBook);

router.delete('/:id', auth, bookCtrl.deleteBook);

router.post('/:id/rating', auth, bookCtrl.rateBook);

router.get('/bestrating', bookCtrl.getBestRating);

module.exports = router;
