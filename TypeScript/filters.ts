/**
 * @author HighArcs
 * @version 1.0.0
 * @description checks if a command can be ran based off of criteria
 * @license null
 *
 * @example
 * ```ts
 * import { filter } from "../plugins/filter";
 * import { sernModule, CommandType } from "@sern/handler";
 * export default commandModule({
 *   plugins: [filter(filter.or(filter.isAdministrator(), filter.canManageGuild()), filter.isNsfw())],
 *   execute: (ctx) => {}
 * })
 * ```
 */

import { CommandType, EventPlugin, PluginType } from "@sern/handler";
import {
	Message,
	PermissionResolvable,
	PermissionsBitField,
	Team,
} from "discord.js";

export type Test = (message: Message) => boolean;
export interface Criteria {
	name: string;
	execute: Test;
	children: Array<Criteria>;
}
export class filter {
	public readonly criteria: Criteria;
	public readonly test: Test;
	public message?: string;
	constructor(criteria: Criteria, message?: string) {
		this.criteria = criteria;
		this.test = this.criteria.execute;
		this.message = message;
	}

	// logic ops
	static or(...filters: Array<filter>) {
		function execute(message: Message) {
			for (const filter of filters) {
				if (filter.test(message)) {
					return true;
				}
			}
			return false;
		}

		const criteria = filters.map((x) => x.criteria);

		return new this(
			{ children: criteria, name: "or", execute },
			`or(${filters.map((x) => x.message).join(", ")})`
		);
	}

	static and(...filters: Array<filter>) {
		function execute(message: Message) {
			for (const filter of filters) {
				if (!filter.test(message)) {
					return false;
				}
			}
			return true;
		}

		const criteria = filters.map((x) => x.criteria);

		return new this(
			{ children: criteria, name: "and", execute },
			`and(${filters.map((x) => x.message).join(", ")})`
		);
	}

	static not(filter: filter) {
		function execute(message: Message) {
			return !filter.test(message);
		}

		return new this(
			{
				name: "not",
				execute,
				children: [filter.criteria],
			},
			`not(${filter.message})`
		);
	}

	static custom(execute: Test, message?: string) {
		return new this(
			{
				name: "custom",
				execute,
				children: [],
			},
			message
		);
	}

	static withCustomMessage(filter: filter, message?: string) {
		filter.message = message;
		return filter;
	}

	static silent(filter: filter) {
		return this.withCustomMessage(filter, undefined);
	}

	// permission based

	static hasGuildPermission(permission: PermissionResolvable) {
		const bigint = PermissionsBitField.resolve(permission);
		const field = Object.entries(PermissionsBitField.Flags).find(
			([, v]) => v === bigint
		)!;
		if (!field) {
			throw new Error(`Unknown permission: ${permission}`);
		}

		const [name] = field;

		return new this(
			{
				name: "hasGuildPermission",
				execute: (message) => {
					return (
						message.member! &&
						message.member.permissions.has(bigint)
					);
				},
				children: [],
			},
			`has permission: ${name}`
		);
	}

	static hasChannelPermission(
		permission: PermissionResolvable,
		channelId?: string
	) {
		const bigint = PermissionsBitField.resolve(permission);
		const field = Object.entries(PermissionsBitField.Flags).find(
			([, v]) => v === bigint
		)!;
		if (!field) {
			throw new Error(`Unknown permission: ${permission}`);
		}

		const [name] = field;

		return new this(
			{
				name: "has channel permission",
				execute: (message) => {
					const channel = channelId
						? message.guild!.channels.cache.get(channelId)
						: message.channel;

					if (!channel || !("guild" in channel)) {
						return true;
					}
					return (
						channel! &&
						channel.permissionsFor(message.member!).has(bigint)
					);
				},
				children: [],
			},
			channelId
				? `has channel permission: ${name} in ${channelId}`
				: `has permission: ${name}`
		);
	}

	static canAddReactions(channelId?: string) {
		return this.hasChannelPermission("AddReactions", channelId);
	}

	static canAttachFiles(channelId?: string) {
		return this.hasChannelPermission("AttachFiles", channelId);
	}

	static canBanMembers() {
		return this.hasGuildPermission("BanMembers");
	}

	static canChangeNickname() {
		return this.hasGuildPermission("ChangeNickname");
	}

	static canConnect(channelId?: string) {
		return this.hasChannelPermission("Connect", channelId);
	}

	static canCreateInstantInvite(channelId?: string) {
		return this.hasChannelPermission("CreateInstantInvite", channelId);
	}

	static canDeafenMembers(channelId?: string) {
		return this.hasChannelPermission("DeafenMembers", channelId);
	}

	static canEmbedLinks(channelId?: string) {
		return this.hasChannelPermission("EmbedLinks", channelId);
	}

	static canKickMembers() {
		return this.hasGuildPermission("KickMembers");
	}

	static canManageChannelWebhooks(channelId?: string) {
		return this.hasChannelPermission("ManageWebhooks", channelId);
	}

	static canManageChannels(channelId?: string) {
		return this.hasChannelPermission("ManageChannels", channelId);
	}

	static canManageEmojisAndStickers() {
		return this.hasGuildPermission("ManageEmojisAndStickers");
	}

	static canManageGuild() {
		return this.hasGuildPermission("ManageGuild");
	}

	static canManageGuildWebhooks() {
		return this.hasGuildPermission("ManageWebhooks");
	}

	static canManageMessages(channelId?: string) {
		return this.hasChannelPermission("ManageMessages", channelId);
	}

	static canManageNicknames() {
		return this.hasGuildPermission("ManageNicknames");
	}

	static canManageRoles() {
		return this.hasGuildPermission("ManageRoles");
	}

	static canMentionEveryone(channelId?: string) {
		return this.hasChannelPermission("MentionEveryone", channelId);
	}

	static canMoveMembers(channelId?: string) {
		return this.hasChannelPermission("MoveMembers", channelId);
	}

	static canMuteMembers(channelId?: string) {
		return this.hasChannelPermission("MuteMembers", channelId);
	}

	static canPrioritySpeaker(channelId?: string) {
		return this.hasChannelPermission("PrioritySpeaker", channelId);
	}

	static canReadMessageHistory(channelId?: string) {
		return this.hasChannelPermission("ReadMessageHistory", channelId);
	}

	static canViewChannel(channelId: string) {
		return this.hasChannelPermission("ViewChannel", channelId);
	}

	static canSendMessages(channelId: string) {
		return this.hasChannelPermission("SendMessages", channelId);
	}

	static canSendTtsMessages(channelId?: string) {
		return this.hasChannelPermission("SendTTSMessages", channelId);
	}

	static canSpeak(channelId?: string) {
		return this.hasChannelPermission("Speak", channelId);
	}

	static canStream(channelId?: string) {
		return this.hasChannelPermission("Stream", channelId);
	}

	static canUseExternalEmojis(channelId?: string) {
		return this.hasChannelPermission("UseExternalEmojis", channelId);
	}

	static canUseVoiceActivity(channelId?: string) {
		return this.hasChannelPermission("UseVAD", channelId);
	}

	static canViewAuditLog() {
		return this.hasGuildPermission("ViewAuditLog");
	}

	static canViewGuildInsights() {
		return this.hasGuildPermission("ViewGuildInsights");
	}

	static channelIdIn(channelIds: Array<string>) {
		return new this(
			{
				name: "channelIdIn",
				execute: (message) => {
					return channelIds.includes(message.channel.id);
				},
				children: [],
			},
			`channel is one of: ${channelIds.map((v) => `<#${v}>`).join(", ")}`
		);
	}

	static hasEveryRole(roles: Array<string>) {
		return this.withCustomMessage(
			this.and(...roles.map((v) => this.hasRole(v))),
			`has all of: ${roles.map((v) => `<@&${v}>`).join(", ")}`
		);
	}

	static hasMentionableRole() {
		return new this(
			{
				name: "hasMentionableRole",
				execute: (message) => {
					return message.member!.roles.cache.some(
						(role) => role.mentionable
					);
				},
				children: [],
			},
			"has a mentionable role"
		);
	}

	static hasNickname(nickname?: string) {
		return new this(
			{
				name: "hasNickname",
				execute: (message) => {
					if (nickname) {
						return message.member!.nickname === nickname;
					}

					return message.member!.nickname !== null;
				},
				children: [],
			},
			"has a nickname"
		);
	}

	static hasParentId(parentId: string) {
		return new this(
			{
				name: "hasParentId",
				execute: (message) => {
					return (
						"guild" in message.channel &&
						message.channel.parentId === parentId
					);
				},
				children: [],
			},
			`has parent id: ${parentId}`
		);
	}

	static hasRole(roleId: string) {
		return new this(
			{
				name: "hasRole",
				execute: (message) => {
					return message.member!.roles.cache.has(roleId);
				},
				children: [],
			},
			`has role: <@&${roleId}>`
		);
	}

	static hasSomeRole(roles: Array<string>) {
		return this.withCustomMessage(
			this.or(...roles.map((role) => this.hasRole(role))),
			`has any of: ${roles.map((v) => `<@&${v}>`).join(", ")}`
		);
	}

	static isAdministator() {
		return this.hasGuildPermission("Administrator");
	}

	static isChannelId(channelId: string) {
		return new this(
			{
				name: "isChannelId",
				execute: (message) => {
					return message.channel.id === channelId;
				},
				children: [],
			},
			`is channel: <#${channelId}>`
		);
	}

	static isChannelNsfw() {
		return new this(
			{
				name: "isChannelNsfw",
				execute: (message) => {
					return "nsfw" in message.channel && message.channel.nsfw;
				},
				children: [],
			},
			"channel marked as nsfw"
		);
	}

	static isGuildOwner() {
		return new this(
			{
				name: "isGuildOwner",
				execute: (message) => {
					return message.member!.roles.cache.has(
						message.guild!.ownerId
					);
				},
				children: [],
			},
			"is guild owner"
		);
	}

	static isBotOwner() {
		return new this(
			{
				name: "isBotOwner",
				execute: (message) => {
					const application = message.client.application;
					if (!application) {
						return false;
					}

					if (!application.owner) {
						return false;
					}

					if (application.owner instanceof Team) {
						return application.owner.members.has(message.author.id);
					}

					return application.owner.id === message.author.id;
				},
				children: [],
			},
			"is bot owner"
		);
	}

	static isUserId(userId: string) {
		return new this(
			{
				name: "isUserId",
				execute: (message) => {
					return message.author.id === userId;
				},
				children: [],
			},
			`is user: <@${userId}>`
		);
	}

	static parentIdIn(parentIds: Array<string>) {
		return this.withCustomMessage(
			this.or(...parentIds.map((v) => this.hasParentId(v))),
			`parent is one of: ${parentIds.map((v) => `<#${v}>`).join(", ")}`
		);
	}

	static userIdIn(userIds: Array<string>) {
		return this.withCustomMessage(
			this.or(...userIds.map((v) => this.isUserId(v))),
			`user is one of: ${userIds.map((v) => `<@${v}>`).join(", ")}`
		);
	}

	static isInGuild() {
		return new this(
			{
				name: "isInDm",
				execute: (message) => {
					return "guild" in message.channel;
				},
				children: [],
			},
			"is in guild"
		);
	}

	static isInDm() {
		return this.withCustomMessage(this.not(this.isInGuild()), "is in dm");
	}

	static make(...filters: Array<filter>): EventPlugin<CommandType.Both> {
		const self = this;
		return {
			name: "filter",
			type: PluginType.Event,
			description: "filters a message based on criteria",
			async execute(event, controller) {
				const [ctx] = event;

				const value = self.and(...filters).test(ctx.message);

				if (value) {
					return controller.next();
				}

				await ctx.reply({
					ephemeral: true,
					content: `you do not match the criteria for this command:\n${filters
						.map((x) => x.message)
						.filter(Boolean)
						.join("\n")}`,

					allowedMentions: { repliedUser: false, parse: [] },
				});

				return controller.stop();
			},
		};
	}
}
