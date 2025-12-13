import { ConvexQueryClient } from "@convex-dev/react-query";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ConvexProvider, ConvexReactClient } from "convex/react";
import { env } from "@/env";

const convex = new ConvexReactClient(env.VITE_CONVEX_URL);
const convexQueryClient = new ConvexQueryClient(convex);

const queryClient = new QueryClient({
	defaultOptions: {
		queries: {
			queryKeyHashFn: convexQueryClient.hashFn(),
			queryFn: convexQueryClient.queryFn(),
		},
	},
});

// Enable live updates
convexQueryClient.connect(queryClient);

export function AppConvexProvider({ children }: { children: React.ReactNode }) {
	return (
		<ConvexProvider client={convex}>
			<QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
		</ConvexProvider>
	);
}

export default AppConvexProvider;
