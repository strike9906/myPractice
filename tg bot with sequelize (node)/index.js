const express = require('express')
const app = express()
const port = 4000
const jwt       = require('jsonwebtoken')
const jwtSecret = 'ДЖСОНСЕКРЕТОЯЕБУ'

const bcrypt = require('bcrypt');

const { Sequelize, Model, DataTypes } = require('sequelize');
const sequelize = new Sequelize('mysql://test@localhost/test');

const TelegramBot = require('node-telegram-bot-api');

// replace the value below with the Telegram token you receive from @BotFather
const token = "1586558934:AAE7f8sWFeLFjx90CsxKup3VWbLpj4b9JFI";

// Create a bot that uses 'polling' to fetch new updates
const bot = new TelegramBot(token, {polling: true});

bot.on('message', (msg) => {
    const chatId = msg.chat.id;
    console.log(msg)
    const {message_id, from, chat, date, ...dataKeys} = msg
    bot.sendMessage(chatId,`Your additional data: ${Object.keys(dataKeys)}`)
    // send a message to the chat acknowledging receipt of their message
    //bot.sendMessage(chatId, 'Received your message');
  });

bot.onText(/\/posts.*/, msg => {
    let keyboard = {
        reply_markup: JSON.stringify({
          inline_keyboard: [
            [{ text: 'Кнопка 1', callback_data: '1' }],
            [{ text: 'Кнопка 2', callback_data: 'data 2' }],
            [{ text: 'Кнопка 3', callback_data: 'text 3' }]
          ]
        })
      };
    bot.sendMessage(msg.chat.id, 'Выберите любую кнопку:', keyboard);
})

///////////////////////////////////////////////////////////////
const getModels = (roles) => {

    class User extends Model {
        get posts(){
            return this.getPosts()
        }
    }
    User.init({
      username: DataTypes.STRING,
      password: DataTypes.STRING,
    }, { sequelize, modelName: 'user' });

    class Post extends Model {
        get user(){
            return this.getUser()
        }
        get tags(){
            return this.getTags().then(d => d.map(t => t.title))
        }
    }
    Post.init({
      title: DataTypes.STRING,
      text:  DataTypes.TEXT,
      canRead:  DataTypes.ARRAY,
    }, { sequelize, modelName: 'post',
              defaultScope: {
                where: {
                    canRead: {$in: roles}
                }
              },
    });

    User.hasMany(Post )
    Post.belongsTo(User)


    class Tag extends Model {
        get posts(){
            return this.getPosts()
        }
    }
    Tag.init({
      title: DataTypes.STRING,
    }, { sequelize, modelName: 'tag' });

    Post.belongsToMany(Tag, {through: 'PostTag'})
    Tag.belongsToMany(Post, {through: 'PostTag'})

    return {
        User,Post,Tag
    }
}

//console.log(User.prototype)
//console.log(Post.prototype)


;(async () => {
  await sequelize.sync();
})();

const {graphqlHTTP: express_graphql} = require('express-graphql');
const { buildSchema } = require('graphql');

const schema = buildSchema(`
    type Query {
        getUsers: [User]
        getUser(id: ID!): User
        login(username: String!, password: String!):String
    }

    type Mutation {
        addUser(user: UserInput): User
        addPost(post: PostInput): Post
    }

    type User {
        id: ID,
        username: String,
        createdAt: String,
        updatedAt: String
        posts: [Post]
    }

    input UserInput {
        username: String!,
        password: String!,
    }

    type Post {
        id: ID,
        createdAt: String,
        updatedAt: String

        title: String,
        text: String
        user: User
        tags: [String]
    }

    input PostInput {
        userId: ID,
        title: String,
        text: String
        tags: [String]
    }
`);

var root = {//объект соответствия названий в type Query и type Mutation с функциями-резолверами из JS-кода
    async getUsers(skip, {user}){
        if (!user) throw new Error(`can't get userS when your anon`)
        return User.findAll({})
    },
    async getUser({id}, {user}){
        if (!user) throw new Error(`can't get user when your anon`)
        return User.findByPk(id)
    },
    async addUser({user:{username, password}}){
        password = await bcrypt.hash(password, 10);

        return await User.create({username, password})
    },

    async addPost({post:{title,text,tags}}, {user, models: {User, Post, Tag}}){
        if (!user) throw new Error(`can't post anon posts`)
        const tagIds = []
        for (let title of tags){
            let tag = await Tag.findOne({where: {title}})
            if (!tag) {
                tag = await Tag.create({title})
            }
            tagIds.push(tag.id)
        }

        let newPost = await user.createPost({title, text})
        await newPost.setTags(tagIds)
        return newPost
    },

    async changePost({post:{title,text,tags,postId}}, {user}){
        if (!user) throw new Error(`can't post anon posts`)
        let post = Post.findOne({where:{id: postId, userId: userId}})

        if (!post) throw new Error(`post not found`)


        const tagIds = []
        for (let title of tags){
            let tag = await Tag.findOne({where: {title}})
            if (!tag) {
                tag = await Tag.create({title})
            }
            tagIds.push(tag.id)
        }

        let newPost = await user.createPost({title, text})
        await newPost.setTags(tagIds)
        return newPost
    },

    async login({username, password}){
        if (username && password){
            let user = await User.findOne({where: {username}})
            if (user && await bcrypt.compare(password, user.password)){
                const {id} = user
                return jwt.sign({sub:{id, roles: ["user"]}}, jwtSecret)
            }
        }
    }
};
// Create an express server and a GraphQL endpoint
app.use('/graphql', express_graphql(async (req, res) => {
    let auth = req.headers.authorization
    let user, models;
    if (auth && auth.startsWith('Bearer ')){
        let token = auth.slice('Bearer '.length)
        //console.log('TOKEN FROM REQUEST', token)
        try {
            let decoded = jwt.verify(token, jwtSecret);
            if (decoded){
                user = await User.findByPk(decoded.sub.id)
                models = getModels(decoded.sub.roles)
                //console.log('НЕ НАЕБАЛ', user)
            }
        }catch(e){
            console.log('не прокатило', e)
        }
    }
    return {
        schema,
        rootValue: root,
        graphiql: true,
        context: {user, models}
    }
}));


app.listen(port, () => {
  console.log(`Example app listening at http://localhost:${port}`)
})
