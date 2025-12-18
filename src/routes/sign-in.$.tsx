import { SignIn } from "@clerk/tanstack-react-start";
import { createFileRoute } from "@tanstack/react-router";
import { AuthLayout } from "@/components/auth-layout";

export const Route = createFileRoute("/sign-in/$")({
	component: Page,
});

function Page() {
	return (
		<AuthLayout
			title="Welcome back to the future of chat."
			description="Experience real-time conversations with AI power. Sign in to continue your journey."
		>
			<SignIn
				appearance={{
					elements: {
						rootBox: "w-full",
						card: "shadow-none border-none bg-transparent w-full",
						headerTitle: "text-2xl font-bold tracking-tight text-foreground",
						headerSubtitle: "text-muted-foreground",
						socialButtonsBlockButton:
							"bg-white border-input hover:bg-accent hover:text-accent-foreground text-foreground",
						socialButtonsBlockButtonText: "text-foreground font-medium",
						dividerLine: "bg-border",
						dividerText: "text-muted-foreground",
						formFieldLabel: "text-foreground font-medium",
						formFieldInput:
							"bg-background border-input text-foreground focus:ring-ring focus:border-ring",
						footerActionLink: "text-primary hover:text-primary/90",
						formButtonPrimary:
							"bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm transition-all duration-200",
					},
					layout: {
						logoPlacement: "none",
						socialButtonsVariant: "blockButton",
					},
				}}
			/>
		</AuthLayout>
	);
}
