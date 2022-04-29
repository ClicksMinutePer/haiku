import {SlashCommandBuilder, SlashCommandSubcommandBuilder} from "@discordjs/builders";
import {ApplicationCommandOptionChoice, AutocompleteInteraction, Base, CommandInteraction} from "discord.js";

export interface BaseCommandPart {
	check: WrappedCheck;
	aliases: string[];
    comment?: string;
}

export interface BaseCommand extends BaseCommandPart {
	command: SlashCommandBuilder | SubcommandBuilderMethod | SlashCommandSubcommandBuilder;
	callback: (interaction: CommandInteraction) => any | Promise<any>;
	autocompletion: (interaction: AutocompleteInteraction) => ApplicationCommandOptionChoice[] | Promise<ApplicationCommandOptionChoice[]> | any;
}

export interface Command extends BaseCommand {
	command: SlashCommandBuilder
}

export interface SubcommandBuilderMethod {
	(builder: SlashCommandSubcommandBuilder): SlashCommandSubcommandBuilder;
}

export interface Subcommand extends BaseCommand {
	command: SubcommandBuilderMethod;
}

export interface ResolvedSubcommand extends BaseCommand {
	command: SlashCommandSubcommandBuilder;
}

export interface CommandLevel extends BaseCommandPart {
	commands: Command[] | Subcommand[];
	groups: CommandLevel[];
	level: number;

	name?: string;
	description?: string;
}

export interface TopLevelCommands extends CommandLevel {
	level: 0;
}

export interface Check {
	(interaction: CommandInteraction, defaultCheck: WrappedCheck): boolean | Promise<boolean>
}

export interface WrappedCheck extends Check {
	(interaction: CommandInteraction): Promise<boolean>
}

export function wrapDefaultCheck (check: Check, defaultCheck: WrappedCheck) : WrappedCheck {
	return async (interaction: CommandInteraction) => {
		return await check(interaction, defaultCheck);
	}
}