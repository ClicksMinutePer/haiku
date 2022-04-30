import { Message, CommandInteraction, MessagePayload, InteractionReplyOptions, MessageActionRow, MessageActionRowOptions, Client, MessageEmbed, BaseMessageComponentOptions, Interaction, MessageButton } from "discord.js";
import { APIMessage, ApplicationCommandType, GatewayInteractionCreateDispatchData } from "discord-api-types";
import { UserSkipped, UserDone, TimeoutError, UserCancelled } from "./errors.js";

export interface PastFlowAnswers {
    [key: string]: {name: string, value: string, children: PastFlowAnswers} | {name: string, value: string, children: PastFlowAnswers}[];
}

export interface FlowInteractionData {
    question: string;
    questionName: string;
    past_answers: PastFlowAnswers;
    allows_multiple: boolean;
    allows_skipping: boolean;
}

/*
Embed design:
Title: Question
Description: Please 'x' [action]
Fields:
    - Past Question: [past answer(s), comma separated]
*/

export class FlowInteraction extends CommandInteraction {
    private FlowData: FlowInteractionData;
    private _message: Message | APIMessage;

    private get Message(): Promise<Message | APIMessage> {
        return new Promise(async (resolve, reject) => {
            if (this._message !== undefined) return resolve(this._message);

            this._message = await this.fetchReply();
            resolve(this._message);
        });
    }

    constructor(FlowData: FlowInteractionData, client: Client<boolean>, interactionData: GatewayInteractionCreateDispatchData) {
        super(client, interactionData);
        this.FlowData = FlowData;
    }


    static fromInteractionAndFlowData = (interaction: CommandInteraction, interactionData: FlowInteractionData): FlowInteraction => {
        /*return new this(interactionData, interaction.client, { type: interaction.type, id: interaction.id, data: {
            id: interaction.commandId,
            name: interaction.commandName,
            // @ts-ignore - yes the property *does* exist, stop complaining typescript
            type: interaction.commandType,
        }} as any);*/
        let newInteraction = interaction as FlowInteraction;
        Object.setPrototypeOf(newInteraction, this.prototype)
        newInteraction.FlowData = interactionData;
        /*newInteraction.setComponents = this.prototype.setComponents.bind(interaction);
        newInteraction.waitForMessage = this.prototype.waitForMessage.bind(interaction);
        newInteraction.waitForInteraction = this.prototype.waitForInteraction.bind(interaction);*/
        return newInteraction;
    }

    public async waitForInteraction (
        {filter, time}: {filter?: (i: Interaction) => boolean, time?: number}
    ): Promise<Interaction> {
        return new Promise(async (resolve, reject) => {
            let interactionCollector = this.channel.createMessageComponentCollector();

            let inCorrectChannel = (t: Message | Interaction) => t.channel.id === this.channel.id;
            let onCorrectMessage = async (i: Interaction) => i.isMessageComponent() && i.message.id === (await this.Message)!.id;
            let pressedByCorrectUser = (i: Interaction) => i.isMessageComponent() && i.user.id === this.user.id;

            interactionCollector.on("collect", async (interaction) => {
                if (!inCorrectChannel(interaction) || !await onCorrectMessage(interaction) || !pressedByCorrectUser(interaction) || !(
                    ["skip", "done", "cancel"].includes(interaction.customId) || !filter || filter(interaction)))
                    return;
                interactionCollector.stop();

                await interaction.deferUpdate();

                switch (interaction.customId) {
                    case "skip":
                        reject(new UserSkipped("User skipped"));
                        break;
                    case "done":
                        reject(new UserDone("User done"));
                        break;
                    case "cancel":
                        reject(new UserCancelled("User cancelled"));
                        break;
                    default:
                        resolve(interaction);
                }
            });

            if (time && time > 0) {
                setTimeout(() => {
                    interactionCollector.stop();
                    reject(new TimeoutError("The user took too long to respond"));
                }, time);
            };
        });
    }


    public waitForMessage (
        {filter, time}: {filter?: (i: Message) => boolean, time?: number}
    ): Promise<Message> {
        return new Promise(async (resolve, reject) => {
            let messageCollector = this.channel.createMessageCollector();
            let interactionCollector = this.channel.createMessageComponentCollector();

            let inCorrectChannel = (t: Message | Interaction) => t.channel.id === this.channel.id;
            let onCorrectMessage = async (i: Interaction) => i.isMessageComponent() && i.message.id === (await this.Message)!.id;
            let hasCorrectAuthor = (m: Message) => m.author.id === this.user.id;
            let pressedByCorrectUser = (i: Interaction) => i.isMessageComponent() && i.user.id === this.user.id;


            messageCollector.on("collect", async (message) => {
                console.log(inCorrectChannel(message))
                console.log(hasCorrectAuthor(message))
                if (!inCorrectChannel(message) || !hasCorrectAuthor(message) || (filter && !filter(message))) return;
                if (message.author.id === this.user.id) {
                    messageCollector.stop();
                    interactionCollector.stop();

                    resolve(message);
                }
            });

            interactionCollector.on("collect", async (interaction) => {
                if (!inCorrectChannel(interaction) || !await onCorrectMessage(interaction) || !pressedByCorrectUser(interaction) || !["skip", "done", "cancel"].includes(interaction.customId)) return;
                interactionCollector.stop();
                messageCollector.stop();

                await interaction.deferUpdate();

                switch (interaction.customId) {
                    case "skip":
                        reject(new UserSkipped("User skipped"));
                        break;
                    case "done":
                        reject(new UserDone("User done"));
                        break;
                    case "cancel":
                        reject(new UserCancelled("User cancelled"));
                        break;
                }
            });

            if (time && time > 0) {
                setTimeout(() => {
                    interactionCollector.stop();
                    messageCollector.stop();
                    reject(new TimeoutError("The user took too long to respond"));
                }, time);
            };
        });
    }

    public async setComponents({
        action = "give an answer",
        newReply = true,
        components = [],
        fetchReply = true,
    }: {
        action: string,
        newReply?: boolean;
        components?: (MessageActionRow | (Required<BaseMessageComponentOptions> & MessageActionRowOptions))[];
        fetchReply?: boolean;
    }): Promise<Message | APIMessage | void> {

        let answerAlreadyIncluded = false;

        let embed = new MessageEmbed()
        .setTitle(this.FlowData.question)
        .setDescription(`Please ${action}`)
        .addFields(
            Object.values(this.FlowData.past_answers).map(answer => {
                if (Array.isArray(answer)) {
                        let isCurrentQuestion = answer[0].name === this.FlowData.questionName
                        if (isCurrentQuestion) answerAlreadyIncluded = true;
                        return {
                            name: answer[0].name,
                            value: answer.map(a => a.value).join(', ') + (isCurrentQuestion ? ", >" : "")
                        }
                    } else {
                        return {
                            name: answer.name,
                            value: (typeof answer.value === "string" ? answer.value : JSON.stringify(answer.value)) ?? "*Empty*",
                        };
                    }
                })
            )

        components.push(new MessageActionRow().addComponents(
            ...[
                new MessageButton().setCustomId("cancel").setLabel("Cancel").setStyle("DANGER"),
                this.FlowData.allows_skipping && ! this.FlowData.allows_multiple ? new MessageButton().setCustomId("skip").setLabel("Skip").setStyle("SECONDARY") : null,
                this.FlowData.allows_multiple ? new MessageButton().setCustomId("done").setLabel("Done").setStyle("SUCCESS").setDisabled(!(this.FlowData.allows_skipping || answerAlreadyIncluded)) : null,
            ].filter(c => c !== null)
        ))

        if (!answerAlreadyIncluded) embed.addField(this.FlowData.questionName, ">");

        if (!newReply) {
            if (this.deferred || this.replied) {
                return await this.editReply({
                    embeds: [embed],
                    components: components
                });
            } else {
                let message = await this.reply({
                    embeds: [embed],
                    components: components,
                    fetchReply: fetchReply
                }) as unknown as Message;
                if (fetchReply) {
                    this._message = message;
                }
                return message;
            }
        } else {
            let message: Message | APIMessage;
            if (this.deferred || this.replied) {
                message = await this.followUp({
                    embeds: [embed],
                    components: components,
                    fetchReply: fetchReply
                });
            } else {
                await this.deferReply();
                message = await this.followUp({
                    embeds: [embed],
                    components: components,
                    fetchReply: fetchReply
                });
            }
            if (fetchReply) {
                this._message = message;
            }
            return message;
        }
    }
}