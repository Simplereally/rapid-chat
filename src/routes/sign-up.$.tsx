import { AuthLayout } from "@/components/auth-layout";
import { SignUp } from "@clerk/tanstack-react-start";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/sign-up/$")({
	component: Page,
});

function Page() {
	return (
		<AuthLayout
			title="Join the revolution."
			description="Create an account to unlock the full potential of Rapid Chat. It only takes a minute."
		>
			<SignUp
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
