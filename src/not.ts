/**
 * @author HighArcs
 * @version 1.0.0
 * @description inverts the criteria of another plugin
 * @license null
 *
 * @note not meant for plugins that have side effects (sent messages, etc)
 *
 * @example
 * ```ts
 * import { dmOnly } from "../plugins/dmOnly";
 * import { not } from "../plguins/not";
 * import { sernModule, CommandType } from "@sern/handler";
 * export default commandModule({
 *   plugins: [not(dmOnly())],
 *   execute: (ctx) => {}
 * })
 * ```
 */

import { CommandType, EventPlugin } from "@sern/handler";
export function not<T extends CommandType>(
	plugin: EventPlugin<T>
): EventPlugin<T> {
	return {
		...plugin,
		name: `not(${plugin.name})`,
		execute(event, controller) {
			const { execute } = plugin;
			const value = execute(event, controller);
			if (value) return controller.stop();
			return controller.next();
		},
	};
}
