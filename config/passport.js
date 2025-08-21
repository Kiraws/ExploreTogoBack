const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const JWTStrategy = require('passport-jwt').Strategy;
const ExtractJWT = require('passport-jwt').ExtractJwt;
const bcrypt = require('bcrypt');
const prisma = require('../Libraries/prisma');

passport.use(new LocalStrategy(
  {
    usernameField: 'email',
    passwordField: 'password',
  },
  async (email, password, done) => {
    try {
      const user = await prisma.user.findUnique({ where: { email } });
      if (!user) {
        return done(null, false, { message: 'Utilisateur non trouvé' });
      }
      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        return done(null, false, { message: 'Mot de passe incorrect' });
      }
      return done(null, user);
    } catch (err) {
      return done(err);
    }
  }
));

const opts = {
  jwtFromRequest: ExtractJWT.fromAuthHeaderAsBearerToken(),
  secretOrKey: process.env.JWT_SECRET || '1a2b3cece',
};

passport.use(new JWTStrategy(opts, async (jwt_payload, done) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: jwt_payload.id } });
    if (user) {
      return done(null, user);
    } else {
      return done(null, false);
    }
  } catch (err) {
    return done(err, false);
  }
}));

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const user = await prisma.user.findUnique({ where: { id } });
    done(null, user);
  } catch (err) {
    done(err);
  }
});

module.exports = passport;