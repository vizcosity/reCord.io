{
    "81384788765712384": { //Server ID as property
        "name": "Function & Arg", //Server name
        "id": "66192955777486848" //Server ID
        "owner_id": "66186356581208064", //Owner's ID
        "region": "london", //Voice/Creation region
        "icon": null, //Icon hash
        "joined_at": "2015-08-04T00:56:48.041000+00:00", //Date the client joined
        "large": false, //If server is over 100 members
        "afk_timeout": 300, //Seconds it takes for you to marked as idle
        "afk_channel_id": null //Voice channel you're moved to, should you go idle
        "roles": { //Channel roles
            "66192955777486848": { //Role ID as property
                "position": -1, //Position on the roles menu
                "permissions": 36953089, //Bit-packed permissions
                "name": "@everyone", //Role name
                "managed": false, //Currently unknown
                "id": "66192955777486848", //Role ID
                "hoist": false, //Should users with this role appear above other online members
                "color": 0 //Base16 colors converted to Base10, 0 if no color set.
            },
            ...
        },
        "channels": {
            "66192955777486848": { //Channel ID as reference
                "type": "text", //Channel type, either 'text' or 'voice'
                "topic": "Landing site", //Channel topic
                "position": 0, //Channel position on the list
                "permission_overwrites": [ //Permissions overrides
                    {
                        "type": "role", //The type, either 'role' or 'member'
                        "id": "66192955777486848", //The ID
                        "deny": 0, //Deny values
                        "allow": 0 //Allow values
                    }
                ],
                "name": "general", //Chanel name
                "last_message_id": "108588796747997184", //Last channel message ID
                "id": "66192955777486848" //Channel ID
            },
            ...
        },
        "members": {
            "76137916358729728": { //User ID as reference
                "user": { //Everything else is similar to the bot properties
                    "username": "Sera32",
                    "id": "76137916358729728",
                    "discriminator": "7504",
                    "avatar": "6d80d8f2ee45ff84ef37487bc9981944"
                },
                "roles": [],
                "mute": false,
                "joined_at": "2015-08-28T16:40:10.561000+00:00",
                "deaf": false,
                "status": "online",
                "voice_channel_id": "768257283721893874" //Assuming there was a joined voice channel, or null
                "game": {
                    "name": "Custom Game Name"
                }
            },
            ...
        },
    },
    ...
}
