import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Icons } from "@/components/icons";
import { PageHeader } from "@/components/page-header";
import {
	Accordion,
	AccordionContent,
	AccordionItem,
	AccordionTrigger,
} from "@/components/ui/accordion";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
	AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import {
	Carousel,
	CarouselContent,
	CarouselItem,
	CarouselNext,
	CarouselPrevious,
} from "@/components/ui/carousel";
import { Checkbox } from "@/components/ui/checkbox";
import {
	Command,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
	CommandList,
	CommandSeparator,
	CommandShortcut,
} from "@/components/ui/command";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import {
	DropdownMenu,
	DropdownMenuCheckboxItem,
	DropdownMenuContent,
	DropdownMenuGroup,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuRadioGroup,
	DropdownMenuRadioItem,
	DropdownMenuSeparator,
	DropdownMenuShortcut,
	DropdownMenuSub,
	DropdownMenuSubContent,
	DropdownMenuSubTrigger,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
	HoverCard,
	HoverCardContent,
	HoverCardTrigger,
} from "@/components/ui/hover-card";
import { Input } from "@/components/ui/input";
import {
	InputGroup,
	InputGroupAddon,
	InputGroupButton,
	InputGroupInput,
	InputGroupText,
} from "@/components/ui/input-group";
import {
	InputOTP,
	InputOTPGroup,
	InputOTPSeparator,
	InputOTPSlot,
} from "@/components/ui/input-otp";
import { Label } from "@/components/ui/label";
import {
	Pagination,
	PaginationContent,
	PaginationEllipsis,
	PaginationItem,
	PaginationLink,
	PaginationNext,
	PaginationPrevious,
} from "@/components/ui/pagination";
import { Progress } from "@/components/ui/progress";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
	Select,
	SelectContent,
	SelectGroup,
	SelectItem,
	SelectLabel,
	SelectSeparator,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import { MotionItem, MotionList } from "@/framer/motion";

export const Route = createFileRoute("/example/showcase")({
	component: ShowcasePage,
});

function ShowcasePage() {
	const [date, setDate] = useState<Date | undefined>(new Date());
	const [progress, setProgress] = useState(13);
	const [otpValue, setOtpValue] = useState("394120");

	const teamMembers = [
		{ name: "Aria Chen", role: "Product", status: "online" },
		{ name: "Jordan Fox", role: "Engineering", status: "reviewing" },
		{ name: "Priya Patel", role: "Design", status: "offline" },
	];

	const roadmap = [
		{ label: "Q1", copy: "Workspace roles & audit log", state: "Complete" },
		{ label: "Q2", copy: "AI assist in editor", state: "In progress" },
		{ label: "Q3", copy: "Mobile-ready dashboard", state: "Planned" },
	];

	const featureSlides = [
		{
			title: "Creator dashboard",
			subtitle: "Launch a bespoke portal in days",
			metric: "+38% activation",
			cta: "See mock dashboards",
			tag: "UI kit ready",
		},
		{
			title: "Payments & billing",
			subtitle: "Usage-based pricing with smart dunning",
			metric: "$120k ARR simulated",
			cta: "Review invoices",
			tag: "Stripe sandbox",
		},
		{
			title: "Customer success",
			subtitle: "Playbooks, CSAT, and automations",
			metric: "94% satisfaction",
			cta: "View handoffs",
			tag: "Ops friendly",
		},
	];

	return (
		<div className="min-h-screen bg-background p-8 font-sans text-foreground">
			<div className="max-w-screen-2xl space-y-6">
				{/* Header */}
				<PageHeader
					title="Design Showcase"
					description="A jam-packed unauthenticated page demonstrating our design language, components, and typography."
				/>

				{/* Dashboard Grid Example */}
				<MotionList gridClassName="stat-grid">
					<MotionItem>
						<Card className="stat-card-accent card-premium">
							<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
								<CardTitle className="text-sm font-medium">
									Total Revenue
								</CardTitle>
								<Icons.dollarSign className="h-4 w-4 text-muted-foreground" />
							</CardHeader>
							<CardContent>
								<div className="text-2xl font-bold">$45,231.89</div>
								<p className="text-xs text-muted-foreground">
									+20.1% from last month
								</p>
							</CardContent>
						</Card>
					</MotionItem>
					<MotionItem>
						<Card className="stat-card-accent card-premium">
							<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
								<CardTitle className="text-sm font-medium">
									Subscriptions
								</CardTitle>
								<Icons.users className="h-4 w-4 text-muted-foreground" />
							</CardHeader>
							<CardContent>
								<div className="text-2xl font-bold">+2350</div>
								<p className="text-xs text-muted-foreground">
									+180.1% from last month
								</p>
							</CardContent>
						</Card>
					</MotionItem>
					<MotionItem>
						<Card className="stat-card-accent card-premium">
							<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
								<CardTitle className="text-sm font-medium">Sales</CardTitle>
								<Icons.creditCard className="h-4 w-4 text-muted-foreground" />
							</CardHeader>
							<CardContent>
								<div className="text-2xl font-bold">+12,234</div>
								<p className="text-xs text-muted-foreground">
									+19% from last month
								</p>
							</CardContent>
						</Card>
					</MotionItem>
					<MotionItem>
						<Card className="stat-card-accent card-premium">
							<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
								<CardTitle className="text-sm font-medium">
									Active Now
								</CardTitle>
								<Icons.activity className="h-4 w-4 text-muted-foreground" />
							</CardHeader>
							<CardContent>
								<div className="text-2xl font-bold">+573</div>
								<p className="text-xs text-muted-foreground">
									+201 since last hour
								</p>
							</CardContent>
						</Card>
					</MotionItem>
				</MotionList>

				{/* Main Content Area */}
				<div className="content-grid">
					{/* Left Column */}
					<div className="col-span-4 space-y-6">
						{/* Charts/Graphs Placeholder */}
						<Card className="h-[400px] card-premium">
							<CardHeader>
								<CardTitle>Overview</CardTitle>
								<CardDescription>Monthly revenue breakdown.</CardDescription>
							</CardHeader>
							<CardContent className="pl-2">
								<div className="flex h-[300px] items-center justify-center rounded-md border border-dashed bg-muted/50">
									<span className="text-muted-foreground">
										Chart Visualization Placeholder
									</span>
								</div>
							</CardContent>
						</Card>

						{/* Table Example */}
						<Card className="card-premium">
							<CardHeader>
								<CardTitle>Recent Transactions</CardTitle>
								<CardDescription>
									You made 265 sales this month.
								</CardDescription>
							</CardHeader>
							<CardContent>
								<Table>
									<TableHeader>
										<TableRow>
											<TableHead className="w-[100px]">Invoice</TableHead>
											<TableHead>Status</TableHead>
											<TableHead>Method</TableHead>
											<TableHead className="text-right">Amount</TableHead>
										</TableRow>
									</TableHeader>
									<TableBody>
										{[
											{
												invoice: "INV001",
												status: "Paid",
												method: "Credit Card",
												amount: "$250.00",
											},
											{
												invoice: "INV002",
												status: "Pending",
												method: "PayPal",
												amount: "$150.00",
											},
											{
												invoice: "INV003",
												status: "Unpaid",
												method: "Bank Transfer",
												amount: "$350.00",
											},
											{
												invoice: "INV004",
												status: "Paid",
												method: "Credit Card",
												amount: "$450.00",
											},
											{
												invoice: "INV005",
												status: "Paid",
												method: "PayPal",
												amount: "$550.00",
											},
										].map((item) => (
											<TableRow key={item.invoice} className="table-row-hover">
												<TableCell className="font-medium">
													{item.invoice}
												</TableCell>
												<TableCell>
													<Badge
														className={
															item.status === "Paid"
																? "badge-glow bg-success text-success-foreground hover:bg-success/90"
																: item.status === "Pending"
																	? "bg-warning text-warning-foreground hover:bg-warning/90"
																	: "bg-destructive text-destructive-foreground hover:bg-destructive/90"
														}
														variant="outline"
													>
														{item.status}
													</Badge>
												</TableCell>
												<TableCell>{item.method}</TableCell>
												<TableCell className="text-right">
													{item.amount}
												</TableCell>
											</TableRow>
										))}
									</TableBody>
								</Table>
							</CardContent>
						</Card>

						{/* Typography & Alerts */}
						<Card>
							<CardHeader>
								<CardTitle>Typography & Alerts</CardTitle>
							</CardHeader>
							<CardContent className="space-y-4">
								<h2 className="scroll-m-20 border-b pb-2 text-3xl font-semibold tracking-tight first:mt-0">
									The Joke Tax Chronicles
								</h2>
								<p className="leading-7 [&:not(:first-child)]:mt-6">
									Once upon a time, in a far-off land, there was a very lazy
									king who spent all day lounging on his throne. One day, his
									advisors came to him with a problem: the kingdom was running
									out of money.
								</p>
								<Alert>
									<Icons.terminal className="h-4 w-4" />
									<AlertTitle>Heads up!</AlertTitle>
									<AlertDescription>
										You can add components to your app using the cli.
									</AlertDescription>
								</Alert>
								<Alert variant="destructive">
									<Icons.alertCircle className="h-4 w-4" />
									<AlertTitle>Error</AlertTitle>
									<AlertDescription>
										Your session has expired. Please log in again.
									</AlertDescription>
								</Alert>
							</CardContent>
						</Card>
					</div>

					{/* Right Column */}
					<div className="col-span-3 space-y-6">
						{/* User Profile / Interactive Card */}
						<Card className="glass">
							<CardHeader>
								<CardTitle className="text-gradient">User Settings</CardTitle>
								<CardDescription>Manage your preferences.</CardDescription>
							</CardHeader>
							<CardContent className="space-y-4">
								<div className="flex items-center space-x-4">
									<Avatar className="h-12 w-12 ring-2 ring-primary ring-offset-2">
										<AvatarImage
											src="https://github.com/shadcn.png"
											alt="@shadcn"
										/>
										<AvatarFallback>CN</AvatarFallback>
									</Avatar>
									<div className="space-y-1">
										<h4 className="text-sm font-semibold">Sofia Davis</h4>
										<p className="text-xs text-muted-foreground">
											sofia.davis@email.com
										</p>
									</div>
								</div>
								<Separator className="divider-gradient" />
								<div className="space-y-4">
									<div className="flex items-center justify-between list-item-interactive">
										<div className="space-y-0.5">
											<Label htmlFor="notifications">Notifications</Label>
											<p className="text-xs text-muted-foreground">
												Receive daily digest emails.
											</p>
										</div>
										<Switch id="notifications" />
									</div>
									<div className="flex items-center justify-between list-item-interactive">
										<div className="space-y-0.5">
											<Label htmlFor="marketing">Marketing Emails</Label>
											<p className="text-xs text-muted-foreground">
												Receive emails about new products.
											</p>
										</div>
										<Switch id="marketing" defaultChecked />
									</div>
								</div>
								<Button className="w-full btn-glow">Save Changes</Button>
							</CardContent>
						</Card>

						{/* Interactive Components Playground */}
						<Card>
							<CardHeader>
								<CardTitle>Interactive Components</CardTitle>
							</CardHeader>
							<CardContent className="space-y-6">
								<div className="space-y-2">
									<Label>Date Picker</Label>
									<Calendar
										mode="single"
										selected={date}
										onSelect={setDate}
										className="rounded-md border shadow bg-background"
									/>
								</div>
								<div className="space-y-2">
									<Label>Progress</Label>
									<Progress
										value={progress}
										className="w-full h-2 bg-muted/50 [&>div]:bg-gradient-primary"
									/>
								</div>
								<div className="space-y-2">
									<Label>Slider</Label>
									<Slider
										defaultValue={[progress]}
										max={100}
										step={1}
										onValueChange={(v) => setProgress(v[0] ?? 0)}
										className="[&_.bg-primary]:bg-gradient-primary"
									/>
								</div>
								<div className="flex gap-2">
									<Button className="btn-glow">Primary Action</Button>
									<Button
										variant="secondary"
										className="hover:shadow-lg transition-all"
									>
										Secondary
									</Button>
									<Button variant="outline" className="hover:bg-accent/50">
										Outline
									</Button>
									<Button
										variant="ghost"
										size="icon"
										className="rounded-full hover:rotate-90 transition-transform"
									>
										<Icons.settings className="h-4 w-4" />
									</Button>
								</div>
							</CardContent>
						</Card>

						{/* Accordion */}
						<Card>
							<CardHeader>
								<CardTitle>FAQ</CardTitle>
							</CardHeader>
							<CardContent>
								<Accordion type="single" collapsible className="w-full">
									<AccordionItem value="item-1">
										<AccordionTrigger>Is it accessible?</AccordionTrigger>
										<AccordionContent>
											Yes. It adheres to the WAI-ARIA design pattern.
										</AccordionContent>
									</AccordionItem>
									<AccordionItem value="item-2">
										<AccordionTrigger>Is it styled?</AccordionTrigger>
										<AccordionContent>
											Yes. It comes with default styles that matches the other
											components' aesthetic.
										</AccordionContent>
									</AccordionItem>
								</Accordion>
							</CardContent>
						</Card>
					</div>
				</div>

				{/* Component buffet */}
				<div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
					<Card className="card-premium">
						<CardHeader>
							<CardTitle>Form Controls</CardTitle>
							<CardDescription>Inputs, selects, OTP, toggles.</CardDescription>
						</CardHeader>
						<CardContent className="space-y-4">
							<InputGroup className="shadow-sm">
								<InputGroupAddon className="text-xs text-muted-foreground">
									<InputGroupText>Project</InputGroupText>
								</InputGroupAddon>
								<InputGroupInput placeholder="Search mock tickets..." />
								<InputGroupButton size="sm" className="whitespace-nowrap">
									Filter
								</InputGroupButton>
							</InputGroup>
							<div className="grid gap-3 md:grid-cols-2">
								<div className="space-y-2">
									<Label htmlFor="full-name">Full name</Label>
									<Input id="full-name" placeholder="Ava Prototype" />
								</div>
								<div className="space-y-2">
									<Label htmlFor="work-email">Work email</Label>
									<Input
										id="work-email"
										type="email"
										placeholder="design@acme.co"
									/>
								</div>
							</div>
							<div className="space-y-2">
								<Label htmlFor="brief">Project brief</Label>
								<Textarea
									id="brief"
									rows={3}
									placeholder="Explain what you're shipping next..."
								/>
							</div>
							<div className="grid gap-3 md:grid-cols-2">
								<div className="space-y-2">
									<Label>Status</Label>
									<Select defaultValue="in-review">
										<SelectTrigger className="w-full">
											<SelectValue placeholder="Pick a status" />
										</SelectTrigger>
										<SelectContent>
											<SelectGroup>
												<SelectLabel>Pipeline</SelectLabel>
												<SelectItem value="in-review">In review</SelectItem>
												<SelectItem value="blocked">Blocked</SelectItem>
												<SelectItem value="ready">Ready to ship</SelectItem>
											</SelectGroup>
											<SelectSeparator />
											<SelectItem value="done">Done</SelectItem>
										</SelectContent>
									</Select>
								</div>
								<div className="space-y-2">
									<Label>Billing cycle</Label>
									<RadioGroup
										defaultValue="annual"
										className="grid grid-cols-2 gap-2"
									>
										<div className="flex items-center gap-2 rounded-md border p-2">
											<RadioGroupItem value="monthly" id="monthly" />
											<Label htmlFor="monthly" className="text-sm">
												Monthly
											</Label>
										</div>
										<div className="flex items-center gap-2 rounded-md border p-2">
											<RadioGroupItem value="annual" id="annual" />
											<Label htmlFor="annual" className="text-sm">
												Annual (save 20%)
											</Label>
										</div>
									</RadioGroup>
								</div>
							</div>
							<div className="space-y-2">
								<Label>2FA preview</Label>
								<InputOTP value={otpValue} onChange={setOtpValue} maxLength={6}>
									<InputOTPGroup>
										<InputOTPSlot index={0} />
										<InputOTPSlot index={1} />
										<InputOTPSlot index={2} />
										<InputOTPSeparator />
										<InputOTPSlot index={3} />
										<InputOTPSlot index={4} />
										<InputOTPSlot index={5} />
									</InputOTPGroup>
								</InputOTP>
							</div>
							<div className="flex items-center gap-2 rounded-md border p-3">
								<Checkbox id="updates" defaultChecked />
								<div className="space-y-0.5">
									<Label htmlFor="updates">Send me weekly updates</Label>
									<p className="text-xs text-muted-foreground">
										Mock emails only - no spam, promise.
									</p>
								</div>
							</div>
							<Button className="w-full">Mock submit</Button>
						</CardContent>
					</Card>

					<Card className="card-premium">
						<CardHeader>
							<CardTitle>Tabs & Toggles</CardTitle>
							<CardDescription>Switch contexts in one card.</CardDescription>
						</CardHeader>
						<CardContent className="space-y-4">
							<Tabs defaultValue="team">
								<TabsList className="grid w-full grid-cols-3">
									<TabsTrigger value="team">Team</TabsTrigger>
									<TabsTrigger value="roadmap">Roadmap</TabsTrigger>
									<TabsTrigger value="files">Files</TabsTrigger>
								</TabsList>
								<TabsContent value="team" className="space-y-3">
									{teamMembers.map((member) => (
										<div
											key={member.name}
											className="flex items-center justify-between rounded-md border p-3"
										>
											<div className="flex items-center gap-3">
												<Avatar className="h-10 w-10">
													<AvatarFallback>
														{member.name
															.split(" ")
															.map((n) => n[0])
															.join("")
															.slice(0, 2)}
													</AvatarFallback>
												</Avatar>
												<div className="space-y-0.5">
													<p className="text-sm font-medium">{member.name}</p>
													<p className="text-xs text-muted-foreground">
														{member.role}
													</p>
												</div>
											</div>
											<Badge variant="outline" className="capitalize">
												{member.status}
											</Badge>
										</div>
									))}
								</TabsContent>
								<TabsContent value="roadmap" className="space-y-3">
									{roadmap.map((item) => (
										<div
											key={item.label}
											className="flex items-center justify-between rounded-md border p-3"
										>
											<div className="space-y-1">
												<p className="text-sm font-semibold">{item.label}</p>
												<p className="text-xs text-muted-foreground">
													{item.copy}
												</p>
											</div>
											<Badge
												variant="secondary"
												className="capitalize border border-dashed"
											>
												{item.state}
											</Badge>
										</div>
									))}
								</TabsContent>
								<TabsContent value="files" className="flex flex-wrap gap-2">
									{[
										"Wireframe.fig",
										"Product spec.md",
										"Launch checklist",
										"Brand assets",
									].map((file) => (
										<Badge
											key={file}
											variant="secondary"
											className="flex items-center gap-2"
										>
											<Icons.circle className="h-2 w-2" />
											{file}
										</Badge>
									))}
								</TabsContent>
							</Tabs>
							<div className="space-y-2">
								<Label>Toggle feature flags</Label>
								<ToggleGroup
									type="multiple"
									defaultValue={["design", "product"]}
									className="flex flex-wrap gap-2"
								>
									<ToggleGroupItem value="design">Design</ToggleGroupItem>
									<ToggleGroupItem value="product">Product</ToggleGroupItem>
									<ToggleGroupItem value="ops">Ops</ToggleGroupItem>
									<ToggleGroupItem value="security">Security</ToggleGroupItem>
								</ToggleGroup>
							</div>
						</CardContent>
					</Card>

					<Card className="card-premium">
						<CardHeader>
							<CardTitle>Menus & Overlays</CardTitle>
							<CardDescription>Dropdown, hover, and tooltips.</CardDescription>
						</CardHeader>
						<CardContent className="space-y-4">
							<DropdownMenu>
								<DropdownMenuTrigger asChild>
									<Button variant="outline" className="w-full justify-between">
										Quick actions
										<Icons.chevronRight className="h-4 w-4" />
									</Button>
								</DropdownMenuTrigger>
								<DropdownMenuContent className="w-60">
									<DropdownMenuLabel>Workspace</DropdownMenuLabel>
									<DropdownMenuSeparator />
									<DropdownMenuGroup>
										<DropdownMenuItem>
											<Icons.home className="h-4 w-4" />
											Go to dashboard
											<DropdownMenuShortcut>G+D</DropdownMenuShortcut>
										</DropdownMenuItem>
										<DropdownMenuItem>
											<Icons.users className="h-4 w-4" />
											Invite teammates
											<DropdownMenuShortcut>S+I</DropdownMenuShortcut>
										</DropdownMenuItem>
										<DropdownMenuSub>
											<DropdownMenuSubTrigger>
												<Icons.settings className="h-4 w-4" />
												Preferences
											</DropdownMenuSubTrigger>
											<DropdownMenuSubContent>
												<DropdownMenuItem>Theme</DropdownMenuItem>
												<DropdownMenuItem>Keyboard</DropdownMenuItem>
											</DropdownMenuSubContent>
										</DropdownMenuSub>
									</DropdownMenuGroup>
									<DropdownMenuSeparator />
									<DropdownMenuCheckboxItem checked>
										Email summaries
									</DropdownMenuCheckboxItem>
									<DropdownMenuRadioGroup value="pro">
										<DropdownMenuRadioItem value="free">
											Free
										</DropdownMenuRadioItem>
										<DropdownMenuRadioItem value="pro">
											Pro
										</DropdownMenuRadioItem>
										<DropdownMenuRadioItem value="enterprise">
											Enterprise
										</DropdownMenuRadioItem>
									</DropdownMenuRadioGroup>
								</DropdownMenuContent>
							</DropdownMenu>
							<HoverCard>
								<HoverCardTrigger asChild>
									<Badge className="w-fit cursor-pointer">Pro workspace</Badge>
								</HoverCardTrigger>
								<HoverCardContent className="w-80 space-y-2">
									<div className="flex items-center justify-between">
										<p className="font-semibold">Acme Design</p>
										<Badge variant="outline">Live</Badge>
									</div>
									<p className="text-sm text-muted-foreground">
										Live preview with serverless staging toggled on.
									</p>
									<div className="flex items-center gap-3 text-xs text-muted-foreground">
										<span className="flex items-center gap-1">
											<Icons.users className="h-3.5 w-3.5" /> 18 seats used
										</span>
										<span className="flex items-center gap-1">
											<Icons.check className="h-3.5 w-3.5" />
											Uptime 99.9%
										</span>
									</div>
								</HoverCardContent>
							</HoverCard>
							<div className="flex items-center gap-3">
								<Tooltip>
									<TooltipTrigger asChild>
										<Button size="icon" variant="ghost">
											<Icons.home className="h-4 w-4" />
										</Button>
									</TooltipTrigger>
									<TooltipContent>Home</TooltipContent>
								</Tooltip>
								<Tooltip>
									<TooltipTrigger asChild>
										<Button size="icon" variant="ghost">
											<Icons.settings className="h-4 w-4" />
										</Button>
									</TooltipTrigger>
									<TooltipContent>Settings</TooltipContent>
								</Tooltip>
								<Tooltip>
									<TooltipTrigger asChild>
										<Button size="icon" variant="ghost">
											<Icons.more className="h-4 w-4" />
										</Button>
									</TooltipTrigger>
									<TooltipContent>More actions</TooltipContent>
								</Tooltip>
							</div>
						</CardContent>
					</Card>

					<Card className="card-premium">
						<CardHeader>
							<CardTitle>Carousel & Cards</CardTitle>
							<CardDescription>Slide through feature blurbs.</CardDescription>
						</CardHeader>
						<CardContent className="space-y-4">
							<Carousel className="w-full">
								<CarouselContent>
									{featureSlides.map((feature) => (
										<CarouselItem key={feature.title} className="md:basis-1/2">
											<Card className="h-full border-dashed">
												<CardHeader className="space-y-1">
													<CardTitle className="flex items-center justify-between">
														<span>{feature.title}</span>
														<Badge variant="outline">{feature.tag}</Badge>
													</CardTitle>
													<CardDescription>{feature.subtitle}</CardDescription>
												</CardHeader>
												<CardContent className="space-y-3">
													<p className="text-sm text-muted-foreground">
														{feature.metric}
													</p>
													<div className="flex items-center justify-between text-sm">
														<span className="text-foreground">
															{feature.cta}
														</span>
														<Icons.chevronRight className="h-4 w-4 text-muted-foreground" />
													</div>
												</CardContent>
											</Card>
										</CarouselItem>
									))}
								</CarouselContent>
								<CarouselPrevious className="hidden sm:flex" />
								<CarouselNext className="hidden sm:flex" />
							</Carousel>
						</CardContent>
					</Card>

					<Card className="card-premium">
						<CardHeader>
							<CardTitle>Command Palette</CardTitle>
							<CardDescription>Search actions with cmdk.</CardDescription>
						</CardHeader>
						<CardContent>
							<Command className="rounded-lg border shadow-sm">
								<CommandInput placeholder="Jump to anything in the UI..." />
								<CommandList>
									<CommandEmpty>No matches found.</CommandEmpty>
									<CommandGroup heading="Navigation">
										<CommandItem>
											<Icons.home className="h-4 w-4" />
											Dashboard
											<CommandShortcut>G+D</CommandShortcut>
										</CommandItem>
										<CommandItem>
											<Icons.users className="h-4 w-4" />
											Team
											<CommandShortcut>G+T</CommandShortcut>
										</CommandItem>
										<CommandItem>
											<Icons.calendar className="h-4 w-4" />
											Calendar
											<CommandShortcut>G+C</CommandShortcut>
										</CommandItem>
									</CommandGroup>
									<CommandSeparator />
									<CommandGroup heading="Actions">
										<CommandItem>
											<Icons.add className="h-4 w-4" />
											New project
											<CommandShortcut>Cmd+N</CommandShortcut>
										</CommandItem>
										<CommandItem>
											<Icons.edit className="h-4 w-4" />
											Rename workspace
											<CommandShortcut>R</CommandShortcut>
										</CommandItem>
										<CommandItem>
											<Icons.delete className="h-4 w-4" />
											Archive dataset
											<CommandShortcut>Cmd+Shift+A</CommandShortcut>
										</CommandItem>
									</CommandGroup>
								</CommandList>
							</Command>
						</CardContent>
					</Card>

					<Card className="card-premium">
						<CardHeader>
							<CardTitle>Dialogs & Confirmation</CardTitle>
							<CardDescription>Dialog, alert, and pagination.</CardDescription>
						</CardHeader>
						<CardContent className="space-y-4">
							<Dialog>
								<DialogTrigger asChild>
									<Button className="w-full">Open dialog</Button>
								</DialogTrigger>
								<DialogContent>
									<DialogHeader>
										<DialogTitle>Share preview</DialogTitle>
										<DialogDescription>
											Send teammates a staged preview link.
										</DialogDescription>
									</DialogHeader>
									<div className="space-y-2">
										<Label htmlFor="share-link">Preview link</Label>
										<Input
											id="share-link"
											value="https://app.acme.com/preview/123"
											readOnly
										/>
									</div>
									<DialogFooter>
										<Button variant="ghost">Cancel</Button>
										<Button className="btn-glow">Copy link</Button>
									</DialogFooter>
								</DialogContent>
							</Dialog>

							<AlertDialog>
								<AlertDialogTrigger asChild>
									<Button
										variant="outline"
										className="w-full border-destructive text-destructive hover:bg-destructive/10"
									>
										Delete mock data
									</Button>
								</AlertDialogTrigger>
								<AlertDialogContent>
									<AlertDialogHeader>
										<AlertDialogTitle>Delete mock dataset?</AlertDialogTitle>
										<AlertDialogDescription>
											This is just a preview but it will wipe the seeded
											examples.
										</AlertDialogDescription>
									</AlertDialogHeader>
									<AlertDialogFooter>
										<AlertDialogCancel>Cancel</AlertDialogCancel>
										<AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
											Delete
										</AlertDialogAction>
									</AlertDialogFooter>
								</AlertDialogContent>
							</AlertDialog>

							<div className="space-y-2">
								<Label>Pagination</Label>
								<Pagination>
									<PaginationContent>
										<PaginationItem>
											<PaginationPrevious href="#" />
										</PaginationItem>
										<PaginationItem>
											<PaginationLink href="#">1</PaginationLink>
										</PaginationItem>
										<PaginationItem>
											<PaginationLink href="#" isActive>
												2
											</PaginationLink>
										</PaginationItem>
										<PaginationItem>
											<PaginationLink href="#">3</PaginationLink>
										</PaginationItem>
										<PaginationItem>
											<PaginationEllipsis />
										</PaginationItem>
										<PaginationItem>
											<PaginationNext href="#" />
										</PaginationItem>
									</PaginationContent>
								</Pagination>
							</div>
						</CardContent>
					</Card>
				</div>
			</div>
		</div>
	);
}
