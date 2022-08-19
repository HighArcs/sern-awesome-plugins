import { CommandType, EventPlugin, PluginType } from "@sern/handler";
import {
	BitFieldResolvable,
	GatewayIntentsString,
	IntentsBitField,
} from "discord.js";
export function intents<T extends CommandType>(
	intents: BitFieldResolvable<GatewayIntentsString, number>
): EventPlugin<T> {
	return {
		name: "intents",
		type: PluginType.Event,
		execute(event, controller) {
			const bf = new IntentsBitField(event[0].client.options.intents);

			const missing = bf.missing(intents);

			if (missing.length > 0) {
				console.error(
					`Event ${event[0].id} expects intents ${missing.join(
						", "
					)} but bot has ${bf.toArray().join(", ")}`
				);
				return controller.stop();
			}

			return controller.next();
		},
	};
}
