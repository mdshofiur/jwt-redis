const mongoose =  require("mongoose");

const uri = "mongodb+srv://testingDatabase:LmlkuPM6zWk6hdW5@cluster0.e7yhr.mongodb.net/jwtRedis?retryWrites=true&w=majority";
mongoose.connect(uri).then(() => {
  console.log("datebase is Connected");
});




