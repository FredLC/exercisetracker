const express = require("express");
const app = express();
const bodyParser = require("body-parser");

const cors = require("cors");

const mongoose = require("mongoose");
const { Schema } = mongoose;
mongoose.connect(process.env.MLAB_URI || "mongodb://localhost/exercise-track", {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

app.use(cors());

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

app.use(express.static("public"));

const userSchema = new Schema({
  username: { type: String, required: true },
  count: { type: Number, default: 0 },
  log: [],
});

const User = mongoose.model("User", userSchema);

app.get("/api/exercise/users", (req, res) => {
  let query = User.find({}).select("_id username __v");
  query.exec((err, result) => {
    if (err) {
      console.log(err);
    } else {
      res.send(result);
    }
  });
});

app.post("/api/exercise/add", (req, res, next) => {
  if (req.body.date === "") {
    req.body.date = new Date().toDateString();
  }

  const exercise = {
    description: req.body.description,
    duration: Number(req.body.duration),
    date: new Date(req.body.date).toDateString(),
  };

  User.findById({ _id: req.body.userId }, function (err, user) {
    if (err) return console.log(err);
    user.log.push(exercise);
    user.count += 1;
    res.json(
      Object.assign({ username: user.username, _id: user._id }, exercise)
    );
    user.save((err, result) => {
      if (err) {
        return next(err);
      }
    });
  });
});

app.post("/api/exercise/new-user", (req, res, next) => {
  const user = new User({
    username: req.body.username,
  });
  res.json({ username: user.username, _id: user._id });
  user.save((err, data) => {
    if (err) {
      return next(err);
    }
  });
});

app.get("/api/exercise/log", (req, res) => {
  User.findById(req.query.userId, (err, user) => {
    if (err) {
      return console.log(err);
    }

    res.json({
      _id: user._id,
      username: user.username,
      count: user.count,
      log: user.log,
    });
  });
});

app.get("/", (req, res) => {
  res.sendFile(__dirname + "/views/index.html");
});

// Not found middleware
app.use((req, res, next) => {
  return next({ status: 404, message: "not found" });
});

// Error Handling middleware
app.use((err, req, res, next) => {
  let errCode, errMessage;

  if (err.errors) {
    // mongoose validation error
    errCode = 400; // bad request
    const keys = Object.keys(err.errors);
    // report the first validation error
    errMessage = err.errors[keys[0]].message;
  } else {
    // generic or custom error
    errCode = err.status || 500;
    errMessage = err.message || "Internal Server Error";
  }
  res.status(errCode).type("txt").send(errMessage);
});

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log("Your app is listening on port " + listener.address().port);
});
