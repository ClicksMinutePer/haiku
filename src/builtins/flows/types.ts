import { APIMessage } from 'discord-api-types';
import { CommandInteraction, GuildChannel, GuildTextBasedChannel, Interaction, Message, MessageActionRow, MessageActionRowOptions, MessageComponentInteraction, MessageSelectMenu, SelectMenuInteraction } from 'discord.js';
import { HaikuClient } from '../..';
import { FlowInteraction } from './flowInteraction';

export abstract class FlowType {
    abstract send(interaction: FlowInteraction, selected: any[]): Promise<[any, CommandInteraction | MessageComponentInteraction | FlowInteraction]>;
}

export class STRING extends FlowType {
    async send(interaction: FlowInteraction, selected: any[]): Promise<[any, FlowInteraction]> {
        console.log("Sending a string question");
        await interaction.setComponents({
            action: "type your response",
            newReply: false,
        });
        let message = await interaction.waitForMessage({
            filter: message => message.author.id === interaction.user.id,
            time: 60_000,
        })
        message.delete().then().catch();
        return [message.content, interaction];
    }
}

export class ENUM extends FlowType {
    options: string[];

    constructor(...options: string[]) {
        super();
        this.options = options;
    }

    async send(interaction: FlowInteraction, selected: any[]): Promise<[any, MessageComponentInteraction]> {
        let message = await interaction.setComponents({
            action: "select an option",
            newReply: false,
            components: [new MessageActionRow().addComponents(
                new MessageSelectMenu().addOptions(this.options.map(option => {
                    return {
                        label: option,
                        value: option,
                        selected: selected.includes(option)
                    }
                })).setCustomId("select-menu")
            )],
            fetchReply: true
        }) as Message | APIMessage;

        let selectInteraction = await interaction.waitForInteraction({ time: 60_000 }) as SelectMenuInteraction;

        console.log("Select menu interaction got", selectInteraction);

        return [selectInteraction.values[0], selectInteraction];
    }
}

/*class NUMBER extends FlowType {
    async send(interaction: CommandInteraction, selected: any[]): Promise<any> {
        
    }
}

class BIGINT extends FlowType {
    async send(interaction: CommandInteraction, selected: any[]): Promise<any> {
        
    }
}*/

export class TEXTCHANNEL extends STRING {
    async send(interaction: FlowInteraction, selected: any[]): Promise<[any, FlowInteraction]> {
        /*
        This method gets a string and returns the channel it corresponds to; if it doesn't
        exist, it asks for another string.

        Valid ways of specifying a channel (in order of priority):
        id
        <#id>
        name
        #name
        */
        let channel, outInteraction;
        do {
            [channel, outInteraction] = await super.send(interaction, selected);

            let asSnowflake = channel.replace(/^<#(.*)>$/g, "$1");
            let resolvedByID = asSnowflake.match(/[0-9]+/) ? await interaction.guild.channels.fetch(asSnowflake) : undefined;
            let resolvedByName = await interaction.guild.channels.cache.find(c => c.name === channel);
            let resolvedByNameExcludingHash = channel.startsWith("#") ? await interaction.guild.channels.cache.find(c => c.name === channel.substring(1)) : undefined;

            channel = resolvedByID || resolvedByName || resolvedByNameExcludingHash;
        } while (!channel)

        return [`<#${(channel as GuildTextBasedChannel).id}>`, outInteraction];
    }
}

export class ROLE extends STRING {
    async send(interaction: FlowInteraction, selected: any[]): Promise<[any, FlowInteraction]> {
        /*
        This method gets a string and returns the role it corresponds to; if it doesn't
        exist, it asks for another string.

        Valid ways of specifying a role (in order of priority):
        id
        <@&id>
        name
        @name
        */
        let role, outInteraction;
        do {
            [role, outInteraction] = await super.send(interaction, selected);

            let asSnowflake = role.replace(/^<@&(.*)>$/g, "$1");
            let resolvedByID = asSnowflake.match(/[0-9]+/) ? await interaction.guild.roles.fetch(asSnowflake) : undefined;
            let resolvedByName = await interaction.guild.roles.cache.find(r => r.name === role);
            let resolvedByNameExcludingHash = role.startsWith("#") ? await interaction.guild.roles.cache.find(r => r.name === role.substring(1)) : undefined;

            role = resolvedByID || resolvedByName || resolvedByNameExcludingHash;
        } while (!role)

        return [`<@&${(role as GuildTextBasedChannel).id}>`, outInteraction];
    }
}

export class BOOLEAN extends ENUM {
    constructor() {
        super("Yes", "No");
    }
}

/*class VOICECHANNEL extends FlowType {

}

class CATEGORY extends FlowType {

}

class USER extends FlowType {

}

class MEMBER extends USER {

}*/