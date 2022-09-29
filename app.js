const express = require("express");
const morgan = require("morgan");
const createError = require("http-errors");
const  AuthRoute  = require("./Routes/AuthRoute");
const client = require("./utils/init_redis");
require("./utils/connect");
require("dotenv").config();
require("./utils/init_redis");

// clients.SET("foo", "bar");

// clients.GET("foo", (err,value) => {
//  console.log(value)
// });

const app = express();
const port = 3000;
// app.use(dotenv());


app.use(morgan("dev"));
app.use(express.json())
// app.use(express.urlencoded({extended: true}))

app.get("/", (req, res) => {
  res.send("Hello World!");
});

app.use("/api/auth", AuthRoute);


app.use(async (req,res,next) => {
    // const error = new Error("Not Found");
    // error.status = 404;
    // next(error);
    next(createError.NotFound());
})


app.use(async (err,req, res, next) => {
    res.status(err.status || 500);
    res.send({
      error: {
        status: err.status || 500,
        message: err.message,
      },
    });
});


app.listen(port, () => {
  console.log(`listening on port ${port}`);
});
