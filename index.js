const express = require('express');
const path= require('node:path');
const app = express();
const port = 3000;

app.set('view engine', 'pug');

// Serve blog content
let title = "Blog | Directory"
let list = ["Post 1", "Post 2", "Post 3"]
app.get("/blog", (req, res) => {
    res.render('index', { title, list });
});

// Serve main home page
app.use(express.static(path.join(__dirname, 'public')));

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});