import { CommandInteraction, Interaction, MessageComponentInteraction, MessageEmbed } from 'discord.js';
import Answers, { Answer } from './answers.js';
import { UIShownError, UserCancelled } from './errors.js';
import { FlowInteraction } from './flowInteraction.js';
import { FlowQuestion } from './question.js';

export default class Flow {
    interaction: any;
    questions: any[];
    shown: boolean = false;
    _results: Answers = undefined;

    constructor(interaction: CommandInteraction) {
        this.interaction = interaction;
        this.questions = [] as FlowQuestion[];
    }

    addQuestion(options: FlowQuestion) {
        if (this.shown) throw new UIShownError('Cannot add questions to a flow that has already been shown');
        this.questions.push(options);
        return this;
    }

    /**
     * Show the flow populating the 'responses' field with responses from the user
     *
     * @returns The flow object (for chaining)
     */
    async show(): Promise<Flow> {
        if (this.shown) throw new UIShownError('Cannot show a flow twice')
        this.shown = true;
        /*
        export interface FlowQuestion {
            question: string
            id: string
            name: string
            type: FlowTypes.FlowType
            required: boolean
            multiple: boolean
            subQuestions: FlowQuestion[]
            dependsOn: (answers: FlowAnswer[]) => boolean
        }
        */
        this._results = await this._show(this.questions);


        let embed = new MessageEmbed()
        .setTitle("All done!")
        .setDescription(`Thank you for answering the questions.`)
        .addFields(
            Object.values(this._results).map(answer => (Array.isArray(answer) ? {
                name: answer[0].name,
                value: answer.map(a => a.value).join(', ')
            } : {
                name: answer.name,
                value: (typeof answer.value === "string" ? answer.value : JSON.stringify(answer.value)) ?? "*Empty*",
            }))
        )

        if (this.interaction.deferred || this.interaction.replied) {
            await this.interaction.editReply({
                embeds: [embed],
                components: []
            });
        } else {
            await this.interaction.reply({
                embeds: [embed],
                components: []
            });
        }

        return this;
    }

    private async _show(questions: FlowQuestion[], answers: Answers = null, thisSectionAnswers: Answers = null, parentAnswer: any = undefined): Promise<Answers> {
        if (answers === null) answers = thisSectionAnswers = {};
        for (const question of questions) {

            console.log(parentAnswer);
            console.log(question.dependsOn);
            console.log(question.question);
            console.log(question.dependsOn !== undefined);
            console.log(question.dependsOn !== undefined && !question.dependsOn(answers, parentAnswer));

            if (question.dependsOn !== undefined && !question.dependsOn(answers, parentAnswer)) continue;

            let finishedAnswering = false;

            do {
                let answerAndMeta;
                this.interaction = FlowInteraction.fromInteractionAndFlowData(
                    this.interaction,
                    {
                        question: question.question,
                        questionName: question.name,
                        past_answers: thisSectionAnswers,
                        allows_multiple: question.multiple,
                        allows_skipping: !question.required,
                    }
                )
                try {
                    const [answer, interaction] = await question.type.send(this.interaction, []);
                    answerAndMeta = { name: question.name, value: answer, children: {} };
                    this.interaction = interaction;

                    if (question.multiple) {
                        thisSectionAnswers[question.id] = thisSectionAnswers[question.id] || [];
                        (thisSectionAnswers[question.id] as Answer[]).push(answerAndMeta);
                    } else {
                        thisSectionAnswers[question.id] = answerAndMeta;
                    }

                    if (question.subQuestions) {
                        console.log(questions)
                        console.log(question.subQuestions)
                        await this._show(question.subQuestions, answers, answerAndMeta.children, answerAndMeta.value);
                    }
                } catch (e) {
                    switch (e.name) {
                        case 'UserCancelled':
                            throw e;
                        case 'UserSkipped':
                            if (question.required) throw new UserCancelled(`You must answer the question "${question.question}"`);
                            answerAndMeta = { name: question.name, value: undefined, children: {} }

                            if (question.multiple) {
                                thisSectionAnswers[question.id] = thisSectionAnswers[question.id] || [];
                                (thisSectionAnswers[question.id] as Answer[]).push(answerAndMeta);
                            } else {
                                thisSectionAnswers[question.id] = answerAndMeta;
                            }

                            break;
                        case 'UserDone':
                            finishedAnswering = true;
                            break;
                        default:
                            throw e;
                    }
                }
            } while (question.multiple && !finishedAnswering);
        }

        return thisSectionAnswers;
    }

    get results() {
        return this._results;
    }
}