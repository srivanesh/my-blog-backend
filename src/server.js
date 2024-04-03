import fs from 'fs';
import admin from 'firebase-admin';
import express from "express";
import { db,connectToDB } from "./db.js";
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const credentials = JSON.parse(
    fs.readFileSync('./credentials.json')
);
admin.initializeApp({
    credential:  admin.credential.cert(credentials),
});


// localhost:3000/articles/lear-node
const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, '../build')));

app.get(/^(?!\/api).+/, (req, res) => {
    res.sendFile(path.join(__dirname, '../build/index.html'));
})

app.use(async (req, res, next) => {
    const { authtoken } =  req.headers;
    if (authtoken) {
        try {
            req.user = await admin.auth().verifyIdToken(authtoken);
        } catch (e) {
            return res.sendStatus(400);
        }
    }

    req.user = req.user || {};

    next();
})


//app.post('/hello', (req, res) => {
 //   console.log(req.body);
//    res.send(`Hello ${req.body.name}! `);
//});

//app.get('/hello/:name' , (req, res) => {
 //   const name = req.params.name;
 //   res.send(`Hello ${name} !!`);
// });

app.get('/api/articles/:name', async(req,res) => {
    const {name} = req.params;
    const { uid } = req.user;

    const article = await db.collection('articles').findOne({ name });
    if(article){
        const upvoteIds = article.upvoteIds || [];
        article.canUpvote = uid && !upvoteIds.includes(uid);
        res.json(article);
    }else{
        res.sendStatus(404);
    }
    

});

app.use((req, res, next) => {
    if (req.user) {
        next();
    } else {
        res.sendStatus(401);
    }
});

app.put('/api/articles/:name/upvote', async(req, res) => {
    const {name} = req.params;

    await db.collection('articles').updateOne( {name}, {
        $inc: {upvotes : 1},
    });

    const article = await db.collection('articles').findOne({ name });


    if(article){
        const upvoteIds = article.upvoteIds || [];
        const canUpvote = uid && !upvoteIds.includes(uid);
   
        if (canUpvote) {
            await db.collection('articles').updateOne({ name }, {
                $inc: { upvotes: 1 },
                $push: { upvoteIds: uid },
            });
        }

        const updatedArticle = await db.collection('articles').findOne({ name });
        res.json(updatedArticle);
    }else{
        res.send('Article doesn\'t exist');
    }
   
});

app.post('/api/articles/:name/comments', async (req, res) => {
    const {name} = req.params;
    const {postedBy, text} = req.body;
    const { email } = req.user;

    await db.collection('articles').updateOne({ name },{
          $push: { comments: { postedBy: email, text } },
        //$push: { comments: {postedBy, text} },
    });

    const article = await db.collection('articles').findOne({ name });
   
    if(article){
        res.json(article);
    }else{
        res.send('That article doesn\'t exist');
    }
    
});

const PORT = process.env.PORT || 8000;

connectToDB(() => {
    console.log("MongoDB Successfully Connected !");
    app.listen(PORT, () => {
        console.log('Server is listening on port '+PORT);
    })
});
