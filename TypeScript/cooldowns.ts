/**
 * @author HighArcs
 * @version 1.0.0
 * @description allows you to set cooldowns (or "ratelimits") for commands
 * @license null
 *
 **/
/**
 * @example
 * ```ts
 * import { cooldown } from "../plugins/cooldown";
 * import { sernModule, CommandType } from "@sern/handler";
 * export default commandModule({
 *   plugins: [cooldown(['channel', '1/4'])], // limit to 1 action every 4 seconds per channel
 *   execute: (ctx) => {}
 * })
 * ```
 */
let cooldown: typeof applyCooldown & typeof locations = null as never;
import { CommandType, Context, EventPlugin, PluginType } from "@sern/handler";
import { GuildMember } from "discord.js";
/**
 * actions/seconds
 */
export type CooldownString = `${number}/${number}`;
export interface Cooldown {
	location: CooldownLocation;
	seconds: number;
	actions: number;
}
export enum CooldownLocation {
	channel = "channel",
	user = "user",
	guild = "guild",
}

export class ExpiryMap<K, V> extends Map<K, V> {
	public readonly expiry: number;
	constructor(
		expiry: number = Infinity,
		iterable: [K, V][] | ReadonlyMap<K, V> = []
	) {
		super(iterable);
		this.expiry = expiry;
	}

	public set(key: K, value: V, expiry: number = this.expiry): this {
		super.set(key, value);
		if (expiry !== Infinity) setTimeout(() => super.delete(key), expiry);
		return this;
	}
}

export const cooldowns = new ExpiryMap<string, number>();

function parseCooldown(
	location: CooldownLocation,
	cooldown: CooldownString
): Cooldown {
	const [actions, seconds] = cooldown.split("/").map((s) => Number(s));

	if (!Number.isSafeInteger(actions) || !Number.isSafeInteger(seconds)) {
		throw new Error(`Invalid cooldown string: ${cooldown}`);
	}

	return {
		actions,
		seconds,
		location,
	};
}

function getPropertyForLocation(context: Context, location: CooldownLocation) {
	switch (location) {
		case CooldownLocation.channel:
			return context.channel!.id;
		case CooldownLocation.user:
			if (!context.member || !(context.member instanceof GuildMember)) {
				throw new Error("context.member is not a GuildMember");
			}
			return context.member.id;
		case CooldownLocation.guild:
			return context.guildId;
	}
}

export interface RecievedCooldown {
	location: CooldownLocation;
	actions: number;
	maxActions: number;
	seconds: number;
}
type CooldownResponse = (cooldown: RecievedCooldown) => any;

function applyCooldown(
	items: Array<
		[CooldownLocation | keyof CooldownLocation, CooldownString] | Cooldown
	>,
	message?: CooldownResponse
): EventPlugin<CommandType.Both> {
	const raw = items.map((c) =>
		typeof c === "string" ? parseCooldown(CooldownLocation.guild, c) : c
	) as Array<Cooldown>;

	return {
		name: "cooldown",
		description: "limits user/channel/guild actions",
		type: PluginType.Event,
		async execute([context, args], controller) {
			for (const { location, actions, seconds } of raw) {
				const id = getPropertyForLocation(context, location);

				const cooldown = cooldowns.get(id);

				if (!cooldown) {
					cooldowns.set(id, 1);
					continue;
				}

				if (cooldown >= actions) {
					if (message) {
						await message({
							location,
							actions: cooldown,
							maxActions: actions,
							seconds,
						});
					}
					return controller.stop();
				}

				cooldowns.set(id, cooldown + 1);
			}

			return controller.next();
		},
	};
}
type PluginUse = (value: CooldownString) => EventPlugin<CommandType.Both>;
const locations: Record<CooldownLocation, PluginUse> = {
	channel: (value: CooldownString) =>
		applyCooldown([[CooldownLocation.channel, value]]),
	user: (value: CooldownString) =>
		applyCooldown([[CooldownLocation.user, value]]),
	guild: (value: CooldownString) =>
		applyCooldown([[CooldownLocation.guild, value]]),
};

cooldown = Object.assign({}, locations, applyCooldown);
export { cooldown };
