const express = require('express')
const app = express()
const port = process.env.PORT || 3000;
const cors = require('cors');
const { MongoClient } = require('mongodb');
const path = require('path');
require('dotenv').config();

const client = new MongoClient(process.env.MONGODB_URI);

app.use(cors());

app.set('views', path.join(__dirname, '../views'));
app.set('view engine', 'pug');
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, '../css')));

client.connect().then(() => {
  console.log('Connected to DB');
  app.listen(port, () => {
    console.log(`Example app listening on port ${port}`)
  })
}).catch(err => console.log(err));

function groupIconsByCategory(rawData) {
  const sortedData = [...rawData].sort((a, b) =>
    new Date(b.createdAt) - new Date(a.createdAt)
  );

  const grouped = sortedData.reduce((acc, item) => {
    if (acc[item.category]) {
      acc[item.category].assets.push(item.asset);
      if (new Date(item.createdAt) > new Date(acc[item.category].latestTimestamp)) {
        acc[item.category].latestTimestamp = item.createdAt;
      }
    } else {
      acc[item.category] = {
        assets: [item.asset],
        latestTimestamp: item.createdAt
      };
    }
    return acc;
  }, {});

  const result = Object.entries(grouped)
    .map(([category, {assets, latestTimestamp}]) => ({
      category,
      assets,
      latestTimestamp
    }))
    .sort((a, b) => new Date(b.latestTimestamp) - new Date(a.latestTimestamp));

  return result.map(({category, assets}) => ({category, assets}));
}

app.get("/getIcons", async (req, res) => {
  try {
    const icons = await client.db("Iconation").collection("icons").find().toArray();
    if (!icons || icons.length === 0) {
      return res.status(404).json({ message: "No icons found in the database" });
    }
    res.json(groupIconsByCategory(icons));
  } catch (err) {
    console.error("Error fetching icons:", err);
    res.status(500).json({ message: "Internal server error" });
  }
});

app.post("/updateDB", async (req, res) => {
  const data = await req.body;
  try {
    await client.db("Iconation").collection("icons").insertMany(data.icons);
    console.log("Written to DB");
    res.status(200).json({message: 'Successfully updated icons'});
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: "Internal server error" });
  }
})

app.post("/deleteFromDB", async (req, res) => {
  const data = await req.body;
  try {
    data?.icons.map(async (icon) => {
      await client.db("Iconation").collection("icons").deleteOne(icon);
      console.log("Deleted icons from DB");
    })
    res.status(200).json({message: 'Successfully deleted icons'});
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: "Internal server error" });
  }
})

app.get('/form', function (req, res) {
  res.render('form');
});
