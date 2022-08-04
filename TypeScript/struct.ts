import {
	commandModule,
	CommandType,
	Context,
	EventPlugin,
	InputCommandModule,
	Override,
	PluginType,
	SlashOptions,
} from "@sern/handler";
import { Awaitable } from "discord.js";

type Converter<T> = (value?: string) => Awaitable<T>;
type Struct = Record<string, any>;
type ConverterList<T extends Struct> = {
	[K in keyof T]: Converter<T[K]>;
};
type Ctx<T> = Context & { args: T };

interface Err {
	key: string;
	error: string;
	given: string;
	index: number;
}

type OnError<T> = (context: Ctx<T>, error: Err) => any;

// @ts-ignore unused "required" generic somehow
type SpecialEvt<T> = Override<
	EventPlugin<CommandType.Both>,
	{
		readonly "@@plugin": symbol;
	}
>;

async function convert<T extends Struct>(
	args: Array<string>,
	struct: ConverterList<T>
) {
	const entries = Object.entries(struct);
	const result = {} as T;
	for (let i = 0; i < entries.length; i++) {
		const value = args[i];
		console.log(`args[${i}]`, value);

		const [key, converter] = entries[i]!;
		try {
			result[key as keyof T] = await converter(value);
		} catch (error) {
			throw { key, error: String(error), given: value, index: i };
		}
	}

	return result;
}

type ParsedInputCommandModule<T> = Override<
	InputCommandModule,
	{
		execute: (context: Ctx<T>, args: Array<string>) => any;
		type: CommandType.Both | CommandType.Text | CommandType.Slash;
		plugins:
			| [SpecialEvt<T>, ...Array<EventPlugin<CommandType.Both>>]
			| []
			| undefined;
	}
>;

export const Structs = {
	string: (value: string) => String(value),
	number: (value: string) => Number(value),
	boolean: (value: string) => value === "true" || value === "1",
	date: (value: string) => new Date(value),
	integer: (value: string) => Number.parseInt(value),
};

export function parsedCommandModule<T extends Struct>(
	a: ParsedInputCommandModule<T>
) {
	return commandModule(a as never);
}

export namespace Checks {
	export function choices<K extends string>(
		choices: K[],
		value?: string
	): asserts value is K {
		if (!choices.includes(value as unknown as K)) {
			throw "value is not in choices";
		}
	}

	export function required(value?: string): asserts value is string {
		if (value === undefined) {
			throw "value is required";
		}
	}

	export function limit(min: number, max: number, value?: string) {
		required(value);
		const val = Structs.number(value);
		if (val < min) {
			throw `value must be higher than ${min}`;
		}

		if (val > max) {
			throw `value must be lower than ${max}`;
		}

		return val;
	}
}

export function args<T extends Struct>(
	struct: ConverterList<T>,
	onError?: OnError<T>
): SpecialEvt<T> {
	return {
		name: "args",
		type: PluginType.Event,
		description: "converts args to an object",
		async execute([context, [type, args]], controller) {
			const input =
				type === "slash"
					? Object.keys(struct).map(
							(v) => (args as SlashOptions).getString(v) || ""
					  )
					: (args as Array<string>);

			let result: T;
			try {
				result = await convert(input, struct);
			} catch (error) {
				if (onError) {
					onError(context as Ctx<T>, error as Err);
				}
				return controller.stop();
			}
			(context as Ctx<T>).args = result;
			return controller.next();
		},
		"@@plugin": Symbol("args"),
	};
}
