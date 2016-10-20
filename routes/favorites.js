'use strict';

const ev = require('express-validation');
const validations = require('../validations/favorites');
const boom = require('boom');
const express = require('express');
const jwt = require('jsonwebtoken');
const knex = require('../knex');
const { camelizeKeys, decamelizeKeys } = require('humps');

// eslint-disable-next-line new-cap
const router = express.Router();

const authorize = function(req, res, next) {
  jwt.verify(req.cookies.token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) {
      return next(boom.create(401, 'Unauthorized'));
    }

    req.token = decoded;
    next();
  });
};

router.get('/favorites', (req, res, next) => {
  const { userId } = req.token;


  knex('favorites')
    .innerJoin('tracks', 'tracks.id', 'favorites.track_id')
    .where('favorites.user_id', userId)
    .orderBy('tracks.title', 'ASC')
    .then((rows) => {
      const favorites = camelizeKeys(rows);

      res.send(favorites);
    })
    .catch((err) => {
      next(err);
    });
});

router.get('/favorites/check', authorize, (req, res, next) => {
  const { userId } = req.token;
  const trackId = Number.parseInt(req.query.trackId);

  knex('favorites')
    .innerJoin('tracks', 'tracks.id', 'favorites.track_id')
    .where('favorites.track_id', trackId)
    .first()
    .then((row) => {

    if (!row) {
      return res.send(false)
    }

      res.send(true);
    })
    .catch((err) => {
      next(err);
    });
});

router.post('/favorites', authorize, ev(validations.post), (req, res, next) => {
  const { userId } = req.token;
  const trackId  = req.body.trackId;


  const insertFavorite = {
    trackId,
    userId
  };

  knex('tracks')
  .where('id', trackId)
  .first()
  .then((track) => {
    if (!track) {
        return next(boom.create(404, 'track not found'));
    }

    return knex('favorites')
      .insert(decamelizeKeys(insertFavorite), '*')
  })
  .then((rows) => {
    const favorite = camelizeKeys(rows[0])

    res.send(favorite);
  })
  .catch((err) => {
    next(err);
  });

});

router.delete('/favorites', authorize, (req, res, next) => {
  const { userId } = req.token;
  let favorite ={};

  const trackId  = req.body.trackId;

  if (!trackId) {
    return next(boom.create(400, 'track Id must not be blank'));
  }

  if ((isNaN(trackId))) {
    return next(boom.create(400, 'track ID must be an integer'));
  }


  knex('favorites')
    .where('track_id', trackId)
    .andWhere('user_id', userId)
    .first()
    .then((row) => {

      if (!row) {
        throw boom.create(404, 'Favorite not found');
      }

      favorite.trackId = trackId;
      favorite.userId = userId;

      return knex('favorites')
        .del()
        .where('track_id', trackId)
        .andWhere('user_id', userId)

    })
    .then(() => {

      res.send(camelizeKeys(favorite));
    })
    .catch((err) => {
      next(err);
    });
    });


module.exports = router;
