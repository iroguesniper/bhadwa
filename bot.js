const Redis = require('ioredis')
const Discord = require('discord.js')
const humanizeDuration = require('humanize-duration')
const config = require('./config')

let client
let redis
const RANDOM_COLORS = ['1211996', '3447003', '13089792', '16711858', '1088163', '16098851', '6150962']
const RANDOMCOLOR = () => RANDOM_COLORS[Math.floor(Math.random() * (RANDOM_COLORS.length - 0 + 1)) + 0]

const commandContainer = ({
    lact: async (message) => {
        const user = message.mentions.users.first() || message.author
        const record = await redis.get(`${user.id}:activity`)
        if (!record) message.channel.send('No record found!')
        const [timestamp, guild, activity] = record.split(':')
        const duration = Date.now() - timestamp
        const embed = {
            color: parseInt(RANDOMCOLOR(), 10),
            description: `\`${activity}\``,
            footer: {
                text: `Server: ${guild} \nLast activity: ${humanizeDuration(duration)} ago`,
            },
        }
        await message.channel.send({ embed })
    },
    lmsg: async (message) => {
        const user = message.mentions.users.first() || message.author
        const record = await redis.get(`${user.id}:message`)
        if (!record) message.channel.send('No record found!')
        const [timestamp, guild, ...msg] = record.split(':')
        const duration = Date.now() - timestamp
        const embed = {
            color: parseInt(RANDOMCOLOR(), 10),
            description: `"${msg.join(':')}"`,
            footer: {
                text: `Server: ${guild} \nSent: ${humanizeDuration(duration)} ago`,
            },
        }
        await message.channel.send({ embed })
    },
    linvite: async (message) => {
        const embed = {
            description: `[[Invite bhau to your server!]](${config.bot.inviteLink})`,
        }
        await message.channel.send({ embed })
    },
})

const start = async () => {
    client = new Discord.Client()
    redis = new Redis()
    client.on('ready', () => {
        client.user.setPresence({ activity: { name: config.bot.activity }, status: config.bot.status })
        console.log('Client is ready')
    })
    client.on('typingStart', async (channel, user) => {
        if (!user.bot && channel.guild) await redis.set(`${user.id}:activity`, `${Date.now()}:${channel.guild.name}:typing`)
    })
    client.on('messageReactionAdd', async (reaction, user) => {
        if (!user.bot && reaction.message.guild) await redis.set(`${user.id}:activity`, `${Date.now()}:${reaction.message.guild.name}:reaction add`)
    })
    client.on('messageReactionRemove', async (reaction, user) => {
        if (!user.bot && reaction.message.guild) await redis.set(`${user.id}:activity`, `${Date.now()}:${reaction.message.guild.name}:reaction remove`)
    })
    client.on('messageUpdate', async (oldMessage, newMessage) => {
        if (!newMessage.author.bot && newMessage.guild) await redis.set(`${newMessage.author.id}:activity`, `${Date.now()}:${newMessage.guild.name}:message edit`)
    })
    client.on('message', async (message) => {
        if (message.author.bot) return
        if (!message.guild) return
        const args = message.content.split(/\s+/g)
        if (commandContainer[args[0].toLowerCase()]) await commandContainer[args[0].toLowerCase()](message)
        else {
            await redis.set(`${message.author.id}:activity`, `${Date.now()}:${message.guild.name}:send message`)
            await redis.set(`${message.author.id}:message`, `${Date.now()}:${message.guild}:${message.content}`)
        }
    })
    await client.login(config.bot.token)
}

const stop = async () => {
    if (client) await client.destroy()
    if (redis) await redis.quit()
}

start().then()
// I'm dumb

process.on('SIGTERM', stop)
process.on('SIGINT', stop)
