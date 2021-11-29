const express = require("express");
const { MongoClient } = require("mongodb");
const jwt = require("jsonwebtoken");

const connectionString =
  "mongodb+srv://pavel:september12@cluster0.usfsr.mongodb.net/test?retryWrites=true&w=majority";

const app = express();
app.use(express.json());

MongoClient.connect(connectionString, { useUnifiedTopology: true }).then(
  (client) => {
    const db = client.db("athor_app");
    const userCollection = db.collection("users");

    app.post("/sing_up", (req, res) => {
      userCollection.insertOne(req.body).catch((err) => console.error(err));

      res.send("Created");
    });

    app.post("/login", async (req, res) => {
      const paramObj = { email: req.query.email, password: req.query.password };

      const user = await userCollection.findOne(paramObj);
      if (user) {
        const newToken = createToken(user);

        userCollection.findOneAndReplace(
          { email: user.email },
          Object.assign(user, newToken)
        );
        res.send("You are logged in!");
      } else {
        res.send("No user found!");
      }
    });

    app.post("/refresh", async (req, res) => {
      const user = await userCollection.findOne({
        email: req.body.email,
      });

      const token = req.headers["authorization"].split(" ")[1];
      if (token === user.token) {
        const newToken = createToken(user);

        userCollection.findOneAndReplace(
          { email: user.email },
          Object.assign(user, newToken)
        );
        res.send("Token is refreshed");
      } else {
        res.send("Invalid Authorization");
      }
    });

    app.get("/:id", (req, res) => {
      const token = req.headers["authorization"].split(" ")[1];

      jwt.verify(token, "secret", (err, decoded) => {
        if (err) {
          res.status(401).send("Unauthorised");
        } else {
          const resObject = {
            request_num: req.params.id.slice(-1),
            data: {
              username: decoded.user_id,
            },
          };
          res.send(resObject);
        }
      });
    });
  }
);

function createToken(user) {
  return {
    token: jwt.sign({ user_id: user._id }, "secret", {
      expiresIn: getExpireTime(30, 60),
    }),
  };

  function getExpireTime(min, max) {
    return Math.floor(Math.random() * (max - min)) + min;
  }
}

app.listen(3000, () => {
  console.log("Server is running!");
});
