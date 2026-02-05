const express = require('express');
const path = require('node:path');
const argon2 = require('argon2');
const session = require('express-session');
const app = express();
require('dotenv').config()
app.use(express.urlencoded({ extended: true })); 
app.use(express.json());
const port = 3000;

app.use(session({
    secret: process.env.secret, // Used to sign the session ID cookie
    resave: false, // Prevents re-saving sessions that haven't changed
    saveUninitialized: false, // Prevents saving new sessions that have no data
}));

const requireLogin = (req, res, next) => {
    if (req.session && req.session.userId) {
        // User is logged in, proceed to the next middleware or route handler
        next(); 
    } else {
        // User is not logged in, redirect to the login page
        res.redirect('/blog/login'); 
    }
};

const username = process.env.db_user;
const password = process.env.db_pass;
const host = process.env.db_host;
const dbPort = 5432;

const { Client } = require('pg');
const config = {
    user: username,
    password: password,
    host: host,
    port: dbPort,
    database: 'blog'
};

app.set('view engine', 'pug');

async function createTablesIfNotExists() {
    const client = new Client(config);
    await client.connect();

    const usersQuery = `
        CREATE TABLE IF NOT EXISTS users (
            id SERIAL PRIMARY KEY,
            username TEXT NOT NULL,
            password TEXT NOT NULL
        );
    `;

    const postsQuery = `
        CREATE TABLE IF NOT EXISTS posts (
            id SERIAL PRIMARY KEY,
            title TEXT NOT NULL,
            body TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
    `;

    await client.query(usersQuery);
    await client.query(postsQuery);
    console.log('Tables created.');
    await client.end();
}

createTablesIfNotExists();

// create temporary blog articles
let title = "Blog | Directory";

app.get("/blog/posts", async (req, res) => {
    const client = new Client(config);
    await client.connect();
    const queryText = await client.query(`SELECT * FROM posts`);
    const list = queryText.rows;
    await client.end();
    res.render('index', { list });
});

app.get("/blog/posts/new", requireLogin, (req, res) => {
    res.render('submit', { title: "New Post" });
});

app.post("/blog/new", requireLogin, async (req, res) => {
    const postTitle = req.body.title;
    const postBody = req.body.body;
    const client = new Client(config);
    await client.connect();
    const query = `
        INSERT INTO posts (
            title,
            body
        ) values (
            $1,
            $2
        )
    `;
    const values = [postTitle, postBody];
    await client.query(query, values);
    await client.end();
    res.redirect('/blog/posts');
});

app.get('/blog/posts/:id', async (req, res) => {
    const postID = req.params.id;
    const client = new Client(config);
    await client.connect();
    const query = {
        text: 'SELECT * FROM posts WHERE ID = $1',
        values: [postID],
    };

    const queryText = await client.query(query);
    const rows = queryText.rows;
    const post = rows[0];
    await client.end();
    
    res.render('post', { post });
});

app.get('/blog/login', async (req, res) => {
    res.render('login');
});

app.post('/blog/login', async (req, res) => {
    const client = new Client(config);
    await client.connect();
    const username = req.body.username;
    // const hash = await argon2.hash(req.body.password);
    // const query = {
    //     text: 'INSERT INTO users (username, password) values ($1, $2)',
    //     values: [username, hash],
    // };
    const query = {
        text: 'SELECT * FROM users WHERE username = $1',
        values: [username],
    };
    const password = req.body.password; 

    results =await client.query(query);

    const rows = results.rows;
    const row = rows[0];
    const hashedPW = row.password;
    if (await argon2.verify(hashedPW, password)) {
        req.session.userId = username;
        res.redirect('/blog/posts/new');
    } else {
        res.redirect('/blog/login');
    }

});

// Serve main home page
app.use(express.static(path.join(__dirname, 'public')));

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});