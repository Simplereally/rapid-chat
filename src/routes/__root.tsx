import { TanStackDevtools } from "@tanstack/react-devtools";
import { createRootRoute, HeadContent, Scripts } from "@tanstack/react-router";
import { TanStackRouterDevtoolsPanel } from "@tanstack/react-router-devtools";
import { env } from "@/env";
import appCss from "../../app.css?url";
import themeCss from "../../index.css?url";
import AppConvexProvider from "../integrations/convex/provider";
import baseCss from "../styles.css?url";

export const Route = createRootRoute({
	head: () => ({
		meta: [
			{
				charSet: "utf-8",
			},
			{
				name: "viewport",
				content: "width=device-width, initial-scale=1",
			},
			{
				title: env.VITE_APP_TITLE,
			},
		],
		links: [
			{
				rel: "stylesheet",
				href: baseCss,
			},
			{
				rel: "stylesheet",
				href: themeCss,
			},
			{
				rel: "stylesheet",
				href: appCss,
			},
		],
	}),

	shellComponent: RootDocument,
});

function RootDocument({ children }: { children: React.ReactNode }) {
	const showDevtools = process.env.NODE_ENV !== "production";

	return (
		<html lang="en">
			<head>
				<HeadContent />
			</head>
			<body>
				<AppConvexProvider>
					{children}
					{showDevtools && (
						<TanStackDevtools
							config={{
								position: "bottom-right",
							}}
							plugins={[
								{
									name: "Tanstack Router",
									render: <TanStackRouterDevtoolsPanel />,
								},
							]}
						/>
					)}
				</AppConvexProvider>
				<Scripts />
			</body>
		</html>
	);
}
