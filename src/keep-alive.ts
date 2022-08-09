import { EventPlugin, PluginType } from "@sern/handler";

enum ErrorSource {
	Exception = "exception",
	Promise = "promise",
}

type Fallback<T extends ErrorSource> = (
	type: T,
	...args: Array<unknown>
) => void;

let isKeptAlive = false;
export function keepAlive(
	ms: number = Infinity,
	fallback: Fallback<ErrorSource> = () => {}
): EventPlugin<any> {
	return {
		name: "keep-alive",
		type: PluginType.Event,
		execute(event, controller) {
			if (isKeptAlive) return controller.next();
			isKeptAlive = true;
			setTimeout(() => {
				isKeptAlive = false;
			}, ms);

			// listen for crashes
			process.on("uncaughtException", (err, origin) => {
				fallback(ErrorSource.Exception, err, origin);
			});

			process.on("unhandledRejection", (reason, promise) => {
				fallback(ErrorSource.Promise, reason, promise);
			});

			return controller.next();
		},
	};
}
