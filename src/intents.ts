import { CommandType, EventPlugin, PluginType } from "@sern/handler";
import {
	BitFieldResolvable,
	Client,
	GatewayIntentsString,
	IntentsBitField,
} from "discord.js";
export function intents<T extends CommandType>(
	intents: BitFieldResolvable<GatewayIntentsString, number>,
	onIntentError: (err: IntentsError) => any = (err) => {
		throw err;
	}
): EventPlugin<T> {
	return {
		name: "intents",
		type: PluginType.Event,
		execute(event, controller) {
			const bf = new IntentsBitField(event[0].client.options.intents);

			const missing = bf.missing(intents);

			if (missing.length > 0) {
				onIntentError(
					new IntentsError(event[0].id, event[0].client, intents)
				);
				return controller.stop();
			}

			return controller.next();
		},
	};
}

export class IntentsError extends Error {
	public client: Client;
	public expect: IntentsBitField;
	public actual: IntentsBitField;
	constructor(
		id: string,
		client: Client,
		expect: BitFieldResolvable<GatewayIntentsString, number>
	) {
		const bf = new IntentsBitField(client.options.intents);
		const x = new IntentsBitField(expect);
		super(
			`Event 0x${BigInt(id).toString(16)} expects intents [ ${x
				.toArray()
				.join(", ")} ] but bot has [ ${bf.toArray().join(", ")} ]`
		);
		this.client = client;
		this.actual = bf;
		this.expect = x;
		this.name = "IntentsError";
	}
}
