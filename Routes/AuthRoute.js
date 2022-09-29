const express = require("express");
const router = express.Router();
const createError = require('http-errors');
const  UserModel  = require("../Model/UserModel");
const jwt = require("jsonwebtoken");
const client = require("./../utils/init_redis");


router.post("/register", async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) throw createError.BadRequest();

    const doesExist = await UserModel.findOne({ email: email });
    if (doesExist) throw createError.Conflict("Email is already here");
    const user = new UserModel({email, password});
    const createUser = await user.save();
    const accessToken = createAccessToken(createUser.id);
    const refreshToken = createRefreshToken(createUser.id);
    res.send({ accessToken, refreshToken });
  }
   catch (err) {
    next(err);
   }
});

//  verify a Access token
const verifyAccessToken = (req, res, next) => {
  if (!req.headers["authorization"]) return next(createError.Unauthorized());
  const authHeader = req.headers["authorization"];
  const bearerToken = authHeader.split(" ");
  const token = bearerToken[1];
  jwt.verify(token, process.env.ACCESS_PUBLIC_TOKEN, (err, payload) => {
    if (err) {
      const message = err.name === "JsonWebTokenError" ? "Unauthorized" : err.message;
      return next(createError.Unauthorized(message));
    }
    req.payload = payload;
    next();
  })
};


// login
router.post("/login", verifyAccessToken, async (req, res, next) => {
  try {
    const user = await UserModel.findOne({ email: req.body.email });
    if (!user) throw createError.NotFound("Username/password not valid");
    const isMatch = await user.isValidPassword(req.body.password);
    if (!isMatch) throw createError.Unauthorized("Username/password not valid 2");
    const accessToken = createAccessToken(user.id);
    const refreshToken = createRefreshToken(user.id);
    res.send({ accessToken, refreshToken });
  } catch (err) { 
    next(err);
  }
});



// refresh token
router.post("/refresh-token", async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) throw createError.BadRequest();
    const userId = await verifyRefreshToken(refreshToken);
    client.SET(
      userId,
      createRefreshToken(userId),"EX",30*24*60*60,(err, replay) => {
        if (err) {
          throw createError.InternalServerError();
        }
        console.log("replay", replay);
        res.send({
          accessToken: createAccessToken(userId),
          RefreshToken: createRefreshToken(userId),
        });
      }
    );
  } catch (err) {
    next(err);
  }
});


//  verify a Refresh token
const verifyRefreshToken = (refreshToken) => { 
  return new Promise((resolve, reject) => {
    jwt.verify(refreshToken, process.env.ACCESS_PRIVATE_TOKEN, (err, payload) => {
      if (err) return reject(createError.Unauthorized());
      const userId = payload.userId;
         client.GET(userId, (err, result) => {
           if (err) {
             console.log(err.message);
             reject(createError.InternalServerError());
             return;
           }
           if (refreshToken === result) return resolve(userId);
           reject(createError.Unauthorized());
         });
      resolve(userId);
    });
   });
}



// create access Token
const createAccessToken = (userId) => {
  return jwt.sign({ userId }, process.env.ACCESS_PUBLIC_TOKEN, {
    expiresIn: "1day",
  });
};        

//create refresh Token
const createRefreshToken = (userId) => {
  return jwt.sign({ userId }, process.env.ACCESS_PRIVATE_TOKEN, {
    expiresIn: "1y",
  });
};


router.delete("/logout", async (req, res) => {
  const { refreshToken } = req.body;
  try {
    if (!refreshToken) throw createError.BadRequest();
    const userId = await verifyRefreshToken(refreshToken);
    client.DEL(userId, (err, val) => { 
      if (err) {
        console.log(err.message);
        throw createError.InternalServerError();
      }
      res.sendStatus(204);
    });
  } catch (err) {
    console.log(err);
  }
});


// create token when old token is expired
router.post("/token", async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) throw createError.BadRequest();
    const userId = await verifyRefreshToken(refreshToken);
    client.SET(
      userId,
      createRefreshToken(userId), "EX", 30 * 24 * 60 * 60, (err, replay) => {
        if (err) {
          throw createError.InternalServerError();
        }
        console.log("replay", replay);
        res.send({
          accessToken: createAccessToken(userId),
          RefreshToken: createRefreshToken(userId),
        });
    }
    );
  } catch (err) {
    next(err);
  }
});







//  verify a Refresh token
// const verifyRefreshToken = (refreshToken) => { 
//   return new Promise((resolve, reject) => {
//     jwt.verify(refreshToken, process.env.ACCESS_PRIVATE_TOKEN, (err, payload) => {
//       if (err) return reject(createError.Unauthorized());
//       const userId = payload.userId;
//       client.GET(userId, (err, result) => {
//          console.log("refreshToken", refreshToken);
//          console.log("result", result);
//         if(err){
//           reject(createError.InternalServerError());
//           return;
//         } 
//         if(refreshToken === result) return resolve(userId);
//           reject(createError.Unauthorized());
//       });
//     });
//    });
// }

//create access token and refresh token
// const sendAccessToken = (req, res, accessToken) => {
//   res.send({
//     accessToken,
//     email: req.user.email,
//   });
// };


// const sendRefreshToken = (res, refreshToken) => {
//   res.cookie("refreshToken", refreshToken, {
//     httpOnly: true,
//     path: "/auth/refresh_token",
//   });
// };

// router.post("/refresh_token", (req, res) => {
//   const refreshToken = req.cookies.refreshToken;
//   if (!refreshToken) return res.send({ accessToken: "" });
//   let payload = null;
//   try {
//     payload = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET);
//   } catch (err) {
//     return res.send({ accessToken: "" });
//   }
//   const accessToken = createAccessToken(payload.userId);
//   const email = payload.email;
//   res.send({ accessToken, email });
// });



router.post("/logout", async (req, res) => {
  res.clearCookie("refreshToken", { path: "/auth/refresh_token" });
  return res.sendStatus(200);
});


// create a new refresh token when old token is expired
router.post("/token", async (req, res) => {
  const refreshToken = req.cookies.refreshToken;
  if (!refreshToken) return res.send({ accessToken: "" });
  let payload = null;
  try {
    payload = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET);
  } catch (err) {
    return res.send({ accessToken: "" });
  }
  const accessToken = createAccessToken(payload.userId);
  const email = payload.email;
  res.send({ accessToken, email });
});


// create access token and refresh token
const sendAccessToken = (req, res, accessToken) => {
  res.send({
    accessToken,
    email: req.user.email,
  });
};



  module.exports = router;
