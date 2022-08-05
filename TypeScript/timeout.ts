/**
 * @author HighArcs
 * @version 1.0.0
 * @description sets a wall time limit for a command
 * @license null
 *
 * @example
 * ```ts
 * import { timeout } from "../plguins/timeout";
 * import { sernModule, CommandType } from "@sern/handler";
 * export default commandModule({
 *   plugins: [timeout(10000, ([context])=>context.reply('timed out'))],
 *   execute: (ctx) => {}
 * })
 * ```
 */

import { CommandType, EventPlugin, PluginType } from "@sern/handler";

type SetReturnType<T, R> = T extends (...args: infer A) => any
	? (...args: A) => R
	: never;

export function timeout<T extends CommandType>(
	amount: number,
	onTimeout?: SetReturnType<EventPlugin<T>["execute"], any>
): EventPlugin<T> {
	return {
		name: "timeout",
		type: PluginType.Event,
		execute(value, controller) {
			setTimeout(() => {
				if (onTimeout) {
					onTimeout(value, controller);
				}
				controller.stop();
			}, amount);
			return controller.next();
		},
	};
}
